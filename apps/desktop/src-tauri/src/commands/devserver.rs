use std::collections::{HashMap, VecDeque};
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, Utc};
use serde::Serialize;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command as TokioCommand};
use tokio::sync::Mutex;
use uuid::Uuid;

use super::devserver_patterns;

/// Maximum log lines retained per server (ring buffer).
const MAX_LOG_LINES: usize = 1000;

/// Maximum concurrent running dev servers (TANAKA-HIGH-1).
const MAX_CONCURRENT_SERVERS: usize = 10;

/// Health poll interval.
const HEALTH_POLL_INTERVAL: Duration = Duration::from_secs(5);

/// HTTP request timeout for health checks.
const HEALTH_CHECK_TIMEOUT: Duration = Duration::from_secs(3);

/// Port scan range for TCP fallback when stdout parsing fails.
const PORT_SCAN_START: u16 = 3000;
const PORT_SCAN_END: u16 = 9000;

/// Allowed command base names for dev server spawning (TANAKA-CRIT-1).
/// Only common dev toolchain binaries. No shells, no system utilities.
const ALLOWED_COMMANDS: &[&str] = &[
    "node", "npm", "npx", "pnpm", "yarn", "bun",
    "deno", "cargo", "python", "python3", "pip",
    "ruby", "rails", "go", "java", "mvn", "gradle",
    "dotnet", "php", "composer",
];

// ── Types ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DevServerStatus {
    Starting,
    Running,
    Healthy,
    Degraded,
    Stopped,
    Error,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DevServerInfo {
    pub id: String,
    pub command: String,
    pub args: Vec<String>,
    pub cwd: String,
    pub pid: Option<u32>,
    pub port: Option<u16>,
    pub status: DevServerStatus,
    pub started_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LogLine {
    pub timestamp: DateTime<Utc>,
    pub stream: String,
    pub content: String,
}

/// Payload emitted on `devserver:status-changed` Tauri event.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusChangedEvent {
    pub server_id: String,
    pub status: DevServerStatus,
    pub port: Option<u16>,
}

// ── Internal State ─────────────────────────────────────────────────

struct ServerEntry {
    info: DevServerInfo,
    logs: VecDeque<LogLine>,
    child: Option<Child>,
    /// Guards against duplicate health pollers (PIERCE-HIGH-1).
    health_poller_active: bool,
}

pub struct DevServerManager {
    servers: Arc<Mutex<HashMap<String, ServerEntry>>>,
}

impl DevServerManager {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

// ── Validation (TANAKA-CRIT-1, TANAKA-HIGH-2) ─────────────────────

fn validate_command(command: &str) -> Result<(), String> {
    let base = std::path::Path::new(command)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(command);
    if !ALLOWED_COMMANDS.contains(&base) {
        return Err(format!(
            "Command '{}' is not allowed. Permitted: {}",
            command,
            ALLOWED_COMMANDS.join(", ")
        ));
    }
    Ok(())
}

fn validate_cwd(cwd: &str) -> Result<(), String> {
    let path = std::path::Path::new(cwd);
    if !path.is_dir() {
        return Err(format!(
            "Working directory '{}' does not exist or is not a directory",
            cwd
        ));
    }
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("Failed to resolve path '{}': {}", cwd, e))?;
    let canonical_lower = canonical.to_string_lossy().to_lowercase();

    #[cfg(windows)]
    if canonical_lower.starts_with("c:\\windows")
        || canonical_lower.starts_with("c:\\program files")
    {
        return Err("Cannot start dev server in system directories".to_string());
    }

    #[cfg(unix)]
    if canonical_lower == "/"
        || canonical_lower.starts_with("/usr")
        || canonical_lower.starts_with("/bin")
        || canonical_lower.starts_with("/sbin")
        || canonical_lower.starts_with("/etc")
    {
        return Err("Cannot start dev server in system directories".to_string());
    }

    Ok(())
}

// ── Helper ─────────────────────────────────────────────────────────

fn append_log(logs: &mut VecDeque<LogLine>, stream: &str, content: String) {
    logs.push_back(LogLine {
        timestamp: Utc::now(),
        stream: stream.to_string(),
        content,
    });
    if logs.len() > MAX_LOG_LINES {
        logs.pop_front();
    }
}

// ── Health Poller ──────────────────────────────────────────────────

/// Spawn a background health poller for a server with a known port.
/// HTTP GETs `http://localhost:{port}/` every 5s.
/// Transitions: running → healthy, timeout → degraded, refused → error.
/// Emits `devserver:status-changed` on every transition.
fn spawn_health_poller(
    app: tauri::AppHandle,
    servers: Arc<Mutex<HashMap<String, ServerEntry>>>,
    server_id: String,
    port: u16,
) {
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::builder()
            .timeout(HEALTH_CHECK_TIMEOUT)
            .no_proxy()
            .build()
            .unwrap_or_default();

        let url = format!("http://localhost:{port}/");
        let mut last_status: Option<DevServerStatus> = None;

        loop {
            tokio::time::sleep(HEALTH_POLL_INTERVAL).await;

            // Check if server still exists and has a running process
            let should_stop = {
                let map = servers.lock().await;
                match map.get(&server_id) {
                    Some(entry) => {
                        entry.info.status == DevServerStatus::Stopped
                            || entry.info.status == DevServerStatus::Error
                            || entry.child.is_none()
                    }
                    None => true,
                }
            };
            if should_stop {
                break;
            }

            let new_status = match client.get(&url).send().await {
                Ok(resp) if resp.status().is_success() || resp.status().is_redirection() => {
                    DevServerStatus::Healthy
                }
                Ok(_) => DevServerStatus::Running, // non-success HTTP but server responds
                Err(e) if e.is_timeout() => DevServerStatus::Degraded,
                Err(_) => DevServerStatus::Running, // connection error — server may be booting
            };

            // Update status and emit event on transitions
            let changed = last_status.as_ref() != Some(&new_status);
            if changed {
                let mut map = servers.lock().await;
                if let Some(entry) = map.get_mut(&server_id) {
                    // Only upgrade status — don't overwrite Stopped/Error from exit monitor
                    if entry.info.status != DevServerStatus::Stopped
                        && entry.info.status != DevServerStatus::Error
                    {
                        entry.info.status = new_status.clone();
                        let _ = app.emit(
                            "devserver:status-changed",
                            StatusChangedEvent {
                                server_id: server_id.clone(),
                                status: new_status.clone(),
                                port: Some(port),
                            },
                        );
                    }
                }
                last_status = Some(new_status);
            }
        }
    });
}

/// TCP port scan fallback — probe localhost ports looking for a listener.
async fn tcp_scan_port(start: u16, end: u16) -> Option<u16> {
    for port in start..=end {
        let addr = format!("127.0.0.1:{port}");
        if let Ok(Ok(_)) = tokio::time::timeout(
            Duration::from_millis(50),
            tokio::net::TcpStream::connect(&addr),
        )
        .await
        {
            return Some(port);
        }
    }
    None
}

// ── Tauri Commands ─────────────────────────────────────────────────

#[tauri::command]
pub async fn start_dev_server(
    app: tauri::AppHandle,
    manager: tauri::State<'_, DevServerManager>,
    command: String,
    args: Vec<String>,
    cwd: String,
) -> Result<DevServerInfo, String> {
    // Validate command and cwd (TANAKA-CRIT-1, TANAKA-HIGH-2)
    validate_command(&command)?;
    validate_cwd(&cwd)?;

    // Enforce concurrency limit (TANAKA-HIGH-1)
    {
        let servers = manager.servers.lock().await;
        let active = servers.values().filter(|e| e.child.is_some()).count();
        if active >= MAX_CONCURRENT_SERVERS {
            return Err(format!(
                "Maximum concurrent servers ({MAX_CONCURRENT_SERVERS}) reached"
            ));
        }
    }

    let mut child = TokioCommand::new(&command)
        .args(&args)
        .current_dir(&cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to spawn process: {e}"))?;

    let pid = child.id();
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let id = Uuid::new_v4().to_string();
    let info = DevServerInfo {
        id: id.clone(),
        command,
        args,
        cwd,
        pid,
        port: None,
        status: DevServerStatus::Starting,
        started_at: Utc::now(),
    };

    {
        let mut servers = manager.servers.lock().await;
        servers.insert(
            id.clone(),
            ServerEntry {
                info: info.clone(),
                logs: VecDeque::new(),
                child: Some(child),
                health_poller_active: false,
            },
        );
    }

    // Background stdout reader — includes port detection
    if let Some(out) = stdout {
        let servers = manager.servers.clone();
        let sid = id.clone();
        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            let reader = BufReader::new(out);
            let mut lines = reader.lines();
            let mut port_detected = false;
            while let Ok(Some(line)) = lines.next_line().await {
                let mut map = servers.lock().await;
                if let Some(entry) = map.get_mut(&sid) {
                    if entry.info.status == DevServerStatus::Starting {
                        entry.info.status = DevServerStatus::Running;
                    }

                    // Port detection from stdout
                    if !port_detected && !entry.health_poller_active {
                        if let Some(port) = devserver_patterns::extract_port(&line) {
                            entry.info.port = Some(port);
                            entry.health_poller_active = true;
                            port_detected = true;

                            spawn_health_poller(
                                app_handle.clone(),
                                servers.clone(),
                                sid.clone(),
                                port,
                            );
                        }
                    }

                    append_log(&mut entry.logs, "stdout", line);
                }
            }
        });
    }

    // Background stderr reader — also checks for port patterns
    if let Some(err) = stderr {
        let servers = manager.servers.clone();
        let sid = id.clone();
        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            let reader = BufReader::new(err);
            let mut lines = reader.lines();
            let mut port_detected = false;
            while let Ok(Some(line)) = lines.next_line().await {
                let mut map = servers.lock().await;
                if let Some(entry) = map.get_mut(&sid) {
                    if entry.info.status == DevServerStatus::Starting {
                        entry.info.status = DevServerStatus::Running;
                    }

                    // Some frameworks (e.g. Next.js) print port info to stderr
                    if !port_detected && !entry.health_poller_active && entry.info.port.is_none() {
                        if let Some(port) = devserver_patterns::extract_port(&line) {
                            entry.info.port = Some(port);
                            entry.health_poller_active = true;
                            port_detected = true;

                            spawn_health_poller(
                                app_handle.clone(),
                                servers.clone(),
                                sid.clone(),
                                port,
                            );
                        }
                    }

                    append_log(&mut entry.logs, "stderr", line);
                }
            }
        });
    }

    // Background exit monitor — polls child status every 500ms, emits events
    {
        let servers = manager.servers.clone();
        let sid = id.clone();
        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                let mut map = servers.lock().await;
                let should_break = match map.get_mut(&sid) {
                    Some(entry) => match entry.child.as_mut() {
                        Some(child) => match child.try_wait() {
                            Ok(Some(status)) => {
                                let new_status = if status.success() {
                                    DevServerStatus::Stopped
                                } else {
                                    DevServerStatus::Error
                                };
                                entry.info.status = new_status.clone();
                                entry.info.pid = None;
                                entry.child = None;
                                let _ = app_handle.emit(
                                    "devserver:status-changed",
                                    StatusChangedEvent {
                                        server_id: sid.clone(),
                                        status: new_status,
                                        port: entry.info.port,
                                    },
                                );
                                true
                            }
                            Ok(None) => false,
                            Err(_) => {
                                entry.info.status = DevServerStatus::Error;
                                entry.info.pid = None;
                                entry.child = None;
                                let _ = app_handle.emit(
                                    "devserver:status-changed",
                                    StatusChangedEvent {
                                        server_id: sid.clone(),
                                        status: DevServerStatus::Error,
                                        port: entry.info.port,
                                    },
                                );
                                true
                            }
                        },
                        None => true,
                    },
                    None => true,
                };
                if should_break {
                    break;
                }
            }
        });
    }

    Ok(info)
}

#[tauri::command]
pub async fn stop_dev_server(
    manager: tauri::State<'_, DevServerManager>,
    server_id: String,
) -> Result<(), String> {
    let mut servers = manager.servers.lock().await;
    let entry = servers
        .get_mut(&server_id)
        .ok_or_else(|| format!("Server {server_id} not found"))?;

    if let Some(ref mut child) = entry.child {
        child
            .kill()
            .await
            .map_err(|e| format!("Failed to kill process: {e}"))?;
        entry.info.status = DevServerStatus::Stopped;
        entry.info.pid = None;
        entry.child = None;
    }

    Ok(())
}

#[tauri::command]
pub async fn restart_dev_server(
    app: tauri::AppHandle,
    manager: tauri::State<'_, DevServerManager>,
    server_id: String,
) -> Result<DevServerInfo, String> {
    // Capture params and kill existing process
    let (command, args, cwd) = {
        let mut servers = manager.servers.lock().await;
        let entry = servers
            .get_mut(&server_id)
            .ok_or_else(|| format!("Server {server_id} not found"))?;

        if let Some(ref mut child) = entry.child {
            let _ = child.kill().await;
        }

        let params = (
            entry.info.command.clone(),
            entry.info.args.clone(),
            entry.info.cwd.clone(),
        );
        servers.remove(&server_id);
        params
    };

    start_dev_server(app, manager, command, args, cwd).await
}

#[tauri::command]
pub async fn remove_dev_server(
    manager: tauri::State<'_, DevServerManager>,
    server_id: String,
) -> Result<(), String> {
    let mut servers = manager.servers.lock().await;
    let entry = servers
        .get_mut(&server_id)
        .ok_or_else(|| format!("Server {server_id} not found"))?;

    // Kill if still running
    if let Some(ref mut child) = entry.child {
        let _ = child.kill().await;
    }

    servers.remove(&server_id);
    Ok(())
}

#[tauri::command]
pub async fn list_dev_servers(
    manager: tauri::State<'_, DevServerManager>,
) -> Result<Vec<DevServerInfo>, String> {
    let servers = manager.servers.lock().await;
    Ok(servers.values().map(|e| e.info.clone()).collect())
}

#[tauri::command]
pub async fn get_server_logs(
    manager: tauri::State<'_, DevServerManager>,
    server_id: String,
    tail: usize,
) -> Result<Vec<LogLine>, String> {
    let servers = manager.servers.lock().await;
    let entry = servers
        .get(&server_id)
        .ok_or_else(|| format!("Server {server_id} not found"))?;

    let logs: Vec<LogLine> = entry
        .logs
        .iter()
        .rev()
        .take(tail)
        .rev()
        .cloned()
        .collect();

    Ok(logs)
}

#[tauri::command]
pub async fn detect_server_port(
    app: tauri::AppHandle,
    manager: tauri::State<'_, DevServerManager>,
    server_id: String,
) -> Result<Option<u16>, String> {
    // Check cached port or scan logs (read-only pass)
    let port_from_logs = {
        let servers = manager.servers.lock().await;
        let entry = servers
            .get(&server_id)
            .ok_or_else(|| format!("Server {server_id} not found"))?;

        if entry.info.port.is_some() {
            return Ok(entry.info.port);
        }

        // Re-scan existing logs for port patterns
        entry
            .logs
            .iter()
            .find_map(|log| devserver_patterns::extract_port(&log.content))
    };

    // If found in logs, update state and spawn health poller (guarded)
    if let Some(port) = port_from_logs {
        let mut servers = manager.servers.lock().await;
        if let Some(entry) = servers.get_mut(&server_id) {
            entry.info.port = Some(port);
            if !entry.health_poller_active {
                entry.health_poller_active = true;
                spawn_health_poller(
                    app.clone(),
                    manager.servers.clone(),
                    server_id.clone(),
                    port,
                );
            }
        }
        return Ok(Some(port));
    }

    // TCP port scan fallback (10s total timeout — KEHINDE-MED-1)
    let scan_result = tokio::time::timeout(
        Duration::from_secs(10),
        tcp_scan_port(PORT_SCAN_START, PORT_SCAN_END),
    )
    .await
    .unwrap_or(None);

    if let Some(port) = scan_result {
        let mut servers = manager.servers.lock().await;
        if let Some(entry) = servers.get_mut(&server_id) {
            entry.info.port = Some(port);
            if !entry.health_poller_active {
                entry.health_poller_active = true;
                spawn_health_poller(
                    app.clone(),
                    manager.servers.clone(),
                    server_id.clone(),
                    port,
                );
            }
        }
        return Ok(Some(port));
    }

    Ok(None)
}
