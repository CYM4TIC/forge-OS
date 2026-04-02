use std::collections::{HashMap, VecDeque};
use std::process::Stdio;
use std::sync::Arc;

use chrono::{DateTime, Utc};
use serde::Serialize;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command as TokioCommand};
use tokio::sync::Mutex;
use uuid::Uuid;

/// Maximum log lines retained per server (ring buffer).
const MAX_LOG_LINES: usize = 1000;

/// Maximum concurrent running dev servers (TANAKA-HIGH-1).
const MAX_CONCURRENT_SERVERS: usize = 10;

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

// ── Internal State ─────────────────────────────────────────────────

struct ServerEntry {
    info: DevServerInfo,
    logs: VecDeque<LogLine>,
    child: Option<Child>,
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

// ── Tauri Commands ─────────────────────────────────────────────────

#[tauri::command]
pub async fn start_dev_server(
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
            },
        );
    }

    // Background stdout reader
    if let Some(out) = stdout {
        let servers = manager.servers.clone();
        let sid = id.clone();
        tauri::async_runtime::spawn(async move {
            let reader = BufReader::new(out);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let mut map = servers.lock().await;
                if let Some(entry) = map.get_mut(&sid) {
                    if entry.info.status == DevServerStatus::Starting {
                        entry.info.status = DevServerStatus::Running;
                    }
                    append_log(&mut entry.logs, "stdout", line);
                }
            }
        });
    }

    // Background stderr reader
    if let Some(err) = stderr {
        let servers = manager.servers.clone();
        let sid = id.clone();
        tauri::async_runtime::spawn(async move {
            let reader = BufReader::new(err);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let mut map = servers.lock().await;
                if let Some(entry) = map.get_mut(&sid) {
                    if entry.info.status == DevServerStatus::Starting {
                        entry.info.status = DevServerStatus::Running;
                    }
                    append_log(&mut entry.logs, "stderr", line);
                }
            }
        });
    }

    // Background exit monitor — polls child status every 500ms
    {
        let servers = manager.servers.clone();
        let sid = id.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                let mut map = servers.lock().await;
                let should_break = match map.get_mut(&sid) {
                    Some(entry) => match entry.child.as_mut() {
                        Some(child) => match child.try_wait() {
                            Ok(Some(status)) => {
                                entry.info.status = if status.success() {
                                    DevServerStatus::Stopped
                                } else {
                                    DevServerStatus::Error
                                };
                                entry.info.pid = None;
                                entry.child = None;
                                true
                            }
                            Ok(None) => false,
                            Err(_) => {
                                entry.info.status = DevServerStatus::Error;
                                entry.info.pid = None;
                                entry.child = None;
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

    start_dev_server(manager, command, args, cwd).await
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
