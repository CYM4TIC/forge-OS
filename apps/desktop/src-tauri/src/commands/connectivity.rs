use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tokio::sync::Mutex;

use crate::database::Database;

// ── Types ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ServiceType {
    Github,
    Supabase,
    Cloudflare,
    Stripe,
    Typesense,
    Custom,
}

impl ServiceType {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Github => "github",
            Self::Supabase => "supabase",
            Self::Cloudflare => "cloudflare",
            Self::Stripe => "stripe",
            Self::Typesense => "typesense",
            Self::Custom => "custom",
        }
    }

    fn from_str(s: &str) -> Option<Self> {
        match s {
            "github" => Some(Self::Github),
            "supabase" => Some(Self::Supabase),
            "cloudflare" => Some(Self::Cloudflare),
            "stripe" => Some(Self::Stripe),
            "typesense" => Some(Self::Typesense),
            "custom" => Some(Self::Custom),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ServiceStatus {
    Healthy,
    Degraded,
    Unreachable,
    Unconfigured,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceHealth {
    pub service_name: String,
    pub service_type: String,
    pub status: ServiceStatus,
    pub last_checked: Option<DateTime<Utc>>,
    pub latency_ms: Option<u64>,
    pub details: HashMap<String, String>,
}

/// Payload emitted on `connectivity:status-changed`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectivityChangedEvent {
    pub service_type: String,
    pub status: ServiceStatus,
}

/// Service configuration stored in SQLite.
/// TODO (TANAKA-HIGH-1): Migrate tokens/keys to OS keyring before production use.
/// Currently stored as plaintext JSON — acceptable for development, not for shipping.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceConfig {
    /// For github: { "owner": "...", "repo": "...", "token": "..." }
    /// For supabase: { "url": "...", "anon_key": "..." }
    /// For cloudflare: { "account_id": "...", "api_token": "..." }
    /// For stripe: { "api_key": "sk_test_..." }
    /// For typesense: { "url": "http://localhost:8108", "api_key": "..." }
    /// For custom: { "url": "...", "expected_status": "200" }
    #[serde(flatten)]
    pub values: HashMap<String, String>,
}

// ── Constants ──────────────────────────────────────────────────────

const DEFAULT_CHECK_INTERVAL: Duration = Duration::from_secs(60);
const CHECK_TIMEOUT: Duration = Duration::from_secs(10);

// ── Health Check Manager ──────────────────────────────────────────

pub struct HealthCheckManager {
    /// Cached health results, keyed by service_type string.
    /// Arc-wrapped so the background poller can share it.
    pub cache: Arc<Mutex<HashMap<String, ServiceHealth>>>,
    /// Polling interval (mutable at runtime).
    pub check_interval: Arc<Mutex<Duration>>,
}

impl HealthCheckManager {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(Mutex::new(HashMap::new())),
            check_interval: Arc::new(Mutex::new(DEFAULT_CHECK_INTERVAL)),
        }
    }
}

// ── Health Check Implementations ──────────────────────────────────

async fn check_github(config: &HashMap<String, String>) -> ServiceHealth {
    let start = Instant::now();
    let owner = config.get("owner").cloned().unwrap_or_default();
    let repo = config.get("repo").cloned().unwrap_or_default();
    let token = config.get("token").cloned().unwrap_or_default();

    if owner.is_empty() || repo.is_empty() || token.is_empty() {
        return ServiceHealth {
            service_name: "GitHub".to_string(),
            service_type: "github".to_string(),
            status: ServiceStatus::Unconfigured,
            last_checked: Some(Utc::now()),
            latency_ms: None,
            details: HashMap::new(),
        };
    }

    let client = reqwest::Client::builder()
        .timeout(CHECK_TIMEOUT)
        .build()
        .unwrap_or_default();

    let url = format!("https://api.github.com/repos/{owner}/{repo}");
    let result = client
        .get(&url)
        .header("Authorization", format!("Bearer {token}"))
        .header("User-Agent", "Forge-OS/1.0")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await;

    let latency = start.elapsed().as_millis() as u64;
    let mut details = HashMap::new();

    match result {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(body) = resp.json::<serde_json::Value>().await {
                if let Some(name) = body.get("full_name").and_then(|v| v.as_str()) {
                    details.insert("repo".to_string(), name.to_string());
                }
                if let Some(pushed) = body.get("pushed_at").and_then(|v| v.as_str()) {
                    details.insert("last_push".to_string(), pushed.to_string());
                }
                if let Some(issues) = body.get("open_issues_count").and_then(|v| v.as_u64()) {
                    details.insert("open_issues".to_string(), issues.to_string());
                }
            }
            ServiceHealth {
                service_name: "GitHub".to_string(),
                service_type: "github".to_string(),
                status: ServiceStatus::Healthy,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Ok(resp) => {
            details.insert("http_status".to_string(), resp.status().to_string());
            ServiceHealth {
                service_name: "GitHub".to_string(),
                service_type: "github".to_string(),
                status: ServiceStatus::Degraded,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Err(e) => {
            details.insert("error".to_string(), e.to_string());
            ServiceHealth {
                service_name: "GitHub".to_string(),
                service_type: "github".to_string(),
                status: ServiceStatus::Unreachable,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
    }
}

async fn check_supabase(config: &HashMap<String, String>) -> ServiceHealth {
    let start = Instant::now();
    let url = config.get("url").cloned().unwrap_or_default();
    let anon_key = config.get("anon_key").cloned().unwrap_or_default();

    if url.is_empty() || anon_key.is_empty() {
        return ServiceHealth {
            service_name: "Supabase".to_string(),
            service_type: "supabase".to_string(),
            status: ServiceStatus::Unconfigured,
            last_checked: Some(Utc::now()),
            latency_ms: None,
            details: HashMap::new(),
        };
    }

    let client = reqwest::Client::builder()
        .timeout(CHECK_TIMEOUT)
        .build()
        .unwrap_or_default();

    let endpoint = format!("{}/rest/v1/", url.trim_end_matches('/'));
    let result = client
        .get(&endpoint)
        .header("apikey", &anon_key)
        .header("Authorization", format!("Bearer {anon_key}"))
        .send()
        .await;

    let latency = start.elapsed().as_millis() as u64;
    let mut details = HashMap::new();

    match result {
        Ok(resp) if resp.status().is_success() || resp.status().as_u16() == 200 => {
            details.insert("endpoint".to_string(), endpoint);
            ServiceHealth {
                service_name: "Supabase".to_string(),
                service_type: "supabase".to_string(),
                status: ServiceStatus::Healthy,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Ok(resp) => {
            details.insert("http_status".to_string(), resp.status().to_string());
            ServiceHealth {
                service_name: "Supabase".to_string(),
                service_type: "supabase".to_string(),
                status: ServiceStatus::Degraded,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Err(e) => {
            details.insert("error".to_string(), e.to_string());
            ServiceHealth {
                service_name: "Supabase".to_string(),
                service_type: "supabase".to_string(),
                status: ServiceStatus::Unreachable,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
    }
}

async fn check_cloudflare(config: &HashMap<String, String>) -> ServiceHealth {
    let start = Instant::now();
    let api_token = config.get("api_token").cloned().unwrap_or_default();

    if api_token.is_empty() {
        return ServiceHealth {
            service_name: "Cloudflare".to_string(),
            service_type: "cloudflare".to_string(),
            status: ServiceStatus::Unconfigured,
            last_checked: Some(Utc::now()),
            latency_ms: None,
            details: HashMap::new(),
        };
    }

    let client = reqwest::Client::builder()
        .timeout(CHECK_TIMEOUT)
        .build()
        .unwrap_or_default();

    // Verify token endpoint — lightweight auth check
    let result = client
        .get("https://api.cloudflare.com/client/v4/user/tokens/verify")
        .header("Authorization", format!("Bearer {api_token}"))
        .send()
        .await;

    let latency = start.elapsed().as_millis() as u64;
    let mut details = HashMap::new();

    match result {
        Ok(resp) if resp.status().is_success() => {
            details.insert("verified".to_string(), "true".to_string());
            ServiceHealth {
                service_name: "Cloudflare".to_string(),
                service_type: "cloudflare".to_string(),
                status: ServiceStatus::Healthy,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Ok(resp) => {
            details.insert("http_status".to_string(), resp.status().to_string());
            ServiceHealth {
                service_name: "Cloudflare".to_string(),
                service_type: "cloudflare".to_string(),
                status: ServiceStatus::Degraded,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Err(e) => {
            details.insert("error".to_string(), e.to_string());
            ServiceHealth {
                service_name: "Cloudflare".to_string(),
                service_type: "cloudflare".to_string(),
                status: ServiceStatus::Unreachable,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
    }
}

async fn check_stripe(config: &HashMap<String, String>) -> ServiceHealth {
    let start = Instant::now();
    let api_key = config.get("api_key").cloned().unwrap_or_default();

    if api_key.is_empty() {
        return ServiceHealth {
            service_name: "Stripe".to_string(),
            service_type: "stripe".to_string(),
            status: ServiceStatus::Unconfigured,
            last_checked: Some(Utc::now()),
            latency_ms: None,
            details: HashMap::new(),
        };
    }

    // Validate key format
    let mode = if api_key.starts_with("sk_test_") {
        "test"
    } else if api_key.starts_with("sk_live_") {
        "live"
    } else {
        return ServiceHealth {
            service_name: "Stripe".to_string(),
            service_type: "stripe".to_string(),
            status: ServiceStatus::Degraded,
            last_checked: Some(Utc::now()),
            latency_ms: None,
            details: HashMap::from([("error".to_string(), "Invalid API key format".to_string())]),
        };
    };

    let client = reqwest::Client::builder()
        .timeout(CHECK_TIMEOUT)
        .build()
        .unwrap_or_default();

    let result = client
        .get("https://api.stripe.com/v1/balance")
        .header("Authorization", format!("Bearer {api_key}"))
        .send()
        .await;

    let latency = start.elapsed().as_millis() as u64;
    let mut details = HashMap::new();
    details.insert("mode".to_string(), mode.to_string());

    match result {
        Ok(resp) if resp.status().is_success() => {
            ServiceHealth {
                service_name: "Stripe".to_string(),
                service_type: "stripe".to_string(),
                status: ServiceStatus::Healthy,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Ok(resp) => {
            details.insert("http_status".to_string(), resp.status().to_string());
            ServiceHealth {
                service_name: "Stripe".to_string(),
                service_type: "stripe".to_string(),
                status: ServiceStatus::Degraded,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Err(e) => {
            details.insert("error".to_string(), e.to_string());
            ServiceHealth {
                service_name: "Stripe".to_string(),
                service_type: "stripe".to_string(),
                status: ServiceStatus::Unreachable,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
    }
}

async fn check_typesense(config: &HashMap<String, String>) -> ServiceHealth {
    let start = Instant::now();
    let url = config.get("url").cloned().unwrap_or_default();

    if url.is_empty() {
        return ServiceHealth {
            service_name: "Typesense".to_string(),
            service_type: "typesense".to_string(),
            status: ServiceStatus::Unconfigured,
            last_checked: Some(Utc::now()),
            latency_ms: None,
            details: HashMap::new(),
        };
    }

    let client = reqwest::Client::builder()
        .timeout(CHECK_TIMEOUT)
        .build()
        .unwrap_or_default();

    let endpoint = format!("{}/health", url.trim_end_matches('/'));
    let mut req = client.get(&endpoint);
    if let Some(api_key) = config.get("api_key") {
        req = req.header("X-TYPESENSE-API-KEY", api_key);
    }
    let result = req.send().await;

    let latency = start.elapsed().as_millis() as u64;
    let mut details = HashMap::new();

    match result {
        Ok(resp) if resp.status().is_success() => {
            details.insert("endpoint".to_string(), endpoint);
            ServiceHealth {
                service_name: "Typesense".to_string(),
                service_type: "typesense".to_string(),
                status: ServiceStatus::Healthy,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Ok(resp) => {
            details.insert("http_status".to_string(), resp.status().to_string());
            ServiceHealth {
                service_name: "Typesense".to_string(),
                service_type: "typesense".to_string(),
                status: ServiceStatus::Degraded,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Err(e) => {
            details.insert("error".to_string(), e.to_string());
            ServiceHealth {
                service_name: "Typesense".to_string(),
                service_type: "typesense".to_string(),
                status: ServiceStatus::Unreachable,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
    }
}

/// Validate that a URL is safe for health checking (TANAKA-MED-1: SSRF prevention).
/// Rejects non-http(s) schemes and cloud metadata endpoints.
fn validate_health_check_url(url: &str) -> Result<(), String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("Only http:// and https:// URLs are allowed".to_string());
    }
    // Block cloud metadata endpoints
    let lower = url.to_lowercase();
    if lower.contains("169.254.169.254") || lower.contains("metadata.google") {
        return Err("Cloud metadata endpoints are not allowed".to_string());
    }
    Ok(())
}

async fn check_custom(config: &HashMap<String, String>) -> ServiceHealth {
    let start = Instant::now();
    let url = config.get("url").cloned().unwrap_or_default();
    let expected_status: u16 = config
        .get("expected_status")
        .and_then(|s| s.parse().ok())
        .unwrap_or(200);
    let name = config.get("name").cloned().unwrap_or_else(|| "Custom".to_string());

    if url.is_empty() {
        return ServiceHealth {
            service_name: name,
            service_type: "custom".to_string(),
            status: ServiceStatus::Unconfigured,
            last_checked: Some(Utc::now()),
            latency_ms: None,
            details: HashMap::new(),
        };
    }

    // TANAKA-MED-1: Validate URL to prevent SSRF
    if let Err(e) = validate_health_check_url(&url) {
        return ServiceHealth {
            service_name: name,
            service_type: "custom".to_string(),
            status: ServiceStatus::Degraded,
            last_checked: Some(Utc::now()),
            latency_ms: None,
            details: HashMap::from([("error".to_string(), e)]),
        };
    }

    let client = reqwest::Client::builder()
        .timeout(CHECK_TIMEOUT)
        .build()
        .unwrap_or_default();

    let result = client.get(&url).send().await;
    let latency = start.elapsed().as_millis() as u64;
    let mut details = HashMap::new();
    details.insert("url".to_string(), url);

    match result {
        Ok(resp) if resp.status().as_u16() == expected_status => {
            ServiceHealth {
                service_name: name,
                service_type: "custom".to_string(),
                status: ServiceStatus::Healthy,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Ok(resp) => {
            details.insert("http_status".to_string(), resp.status().to_string());
            details.insert("expected".to_string(), expected_status.to_string());
            ServiceHealth {
                service_name: name,
                service_type: "custom".to_string(),
                status: ServiceStatus::Degraded,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
        Err(e) => {
            details.insert("error".to_string(), e.to_string());
            ServiceHealth {
                service_name: name,
                service_type: "custom".to_string(),
                status: ServiceStatus::Unreachable,
                last_checked: Some(Utc::now()),
                latency_ms: Some(latency),
                details,
            }
        }
    }
}

/// Dispatch a health check to the appropriate service implementation.
async fn check_service_impl(service_type: &str, config: &HashMap<String, String>) -> ServiceHealth {
    match service_type {
        "github" => check_github(config).await,
        "supabase" => check_supabase(config).await,
        "cloudflare" => check_cloudflare(config).await,
        "stripe" => check_stripe(config).await,
        "typesense" => check_typesense(config).await,
        "custom" => check_custom(config).await,
        _ => ServiceHealth {
            service_name: service_type.to_string(),
            service_type: service_type.to_string(),
            status: ServiceStatus::Unconfigured,
            last_checked: Some(Utc::now()),
            latency_ms: None,
            details: HashMap::new(),
        },
    }
}

/// Load service configs from SQLite.
fn load_service_configs(db: &Database) -> Result<Vec<(String, HashMap<String, String>)>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT service_type, config_json FROM service_configs WHERE enabled = 1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let stype: String = row.get(0)?;
            let json: String = row.get(1)?;
            Ok((stype, json))
        })
        .map_err(|e| e.to_string())?;

    let mut configs = Vec::new();
    for row in rows {
        let (stype, json) = row.map_err(|e| e.to_string())?;
        let map: HashMap<String, String> =
            serde_json::from_str(&json).unwrap_or_default();
        configs.push((stype, map));
    }
    Ok(configs)
}

// ── Background Poller ─────────────────────────────────────────────

/// Spawn the background health check poller.
/// Polls all enabled services at the configured interval.
/// Emits `connectivity:status-changed` on status transitions.
/// Takes Arc clones of the cache and interval from the managed HealthCheckManager.
pub fn spawn_health_poller(
    app: tauri::AppHandle,
    cache: Arc<Mutex<HashMap<String, ServiceHealth>>>,
    check_interval: Arc<Mutex<Duration>>,
    db_path: std::path::PathBuf,
) {
    tauri::async_runtime::spawn(async move {
        loop {
            let interval = {
                let i = check_interval.lock().await;
                *i
            };
            tokio::time::sleep(interval).await;

            // Load configs from a fresh read-only connection (background task)
            let configs = {
                let conn = match rusqlite::Connection::open(&db_path) {
                    Ok(c) => c,
                    Err(_) => continue,
                };
                let _ = conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
                let mut stmt = match conn.prepare(
                    "SELECT service_type, config_json FROM service_configs WHERE enabled = 1",
                ) {
                    Ok(s) => s,
                    Err(_) => continue,
                };
                let rows = match stmt.query_map([], |row| {
                    let stype: String = row.get(0)?;
                    let json: String = row.get(1)?;
                    Ok((stype, json))
                }) {
                    Ok(r) => r,
                    Err(_) => continue,
                };
                let mut configs = Vec::new();
                for row in rows.flatten() {
                    let map: HashMap<String, String> =
                        serde_json::from_str(&row.1).unwrap_or_default();
                    configs.push((row.0, map));
                }
                configs
            };

            for (stype, config) in &configs {
                let health = check_service_impl(stype, config).await;

                // Check if status changed
                let changed = {
                    let mut c = cache.lock().await;
                    let prev = c.get(stype);
                    let changed = prev.map(|p| p.status != health.status).unwrap_or(true);
                    c.insert(stype.clone(), health.clone());
                    changed
                };

                if changed {
                    let _ = app.emit(
                        "connectivity:status-changed",
                        ConnectivityChangedEvent {
                            service_type: stype.clone(),
                            status: health.status,
                        },
                    );
                }
            }
        }
    });
}

// ── Tauri Commands ────────────────────────────────────────────────

/// Minimum seconds between manual checks for the same service (TANAKA-MED-2).
const MANUAL_CHECK_COOLDOWN: Duration = Duration::from_secs(5);

/// Check a single service's health (live network call).
/// Enforces a per-service cooldown to prevent API hammering.
#[tauri::command]
pub async fn check_service(
    db: tauri::State<'_, Database>,
    manager: tauri::State<'_, HealthCheckManager>,
    service_type: String,
) -> Result<ServiceHealth, String> {
    // TANAKA-MED-2: Rate limit — return cached if checked within cooldown
    {
        let cache = manager.cache.lock().await;
        if let Some(cached) = cache.get(&service_type) {
            if let Some(last) = cached.last_checked {
                let elapsed = Utc::now().signed_duration_since(last);
                if elapsed.num_seconds() < MANUAL_CHECK_COOLDOWN.as_secs() as i64 {
                    return Ok(cached.clone());
                }
            }
        }
    }

    let configs = load_service_configs(&db)?;
    let config = configs
        .iter()
        .find(|(st, _)| st == &service_type)
        .map(|(_, c)| c.clone())
        .unwrap_or_default();

    let health = check_service_impl(&service_type, &config).await;

    // Update cache
    {
        let mut cache = manager.cache.lock().await;
        cache.insert(service_type, health.clone());
    }

    Ok(health)
}

/// Check all enabled services (live network calls).
#[tauri::command]
pub async fn check_all_services(
    db: tauri::State<'_, Database>,
    manager: tauri::State<'_, HealthCheckManager>,
) -> Result<Vec<ServiceHealth>, String> {
    let configs = load_service_configs(&db)?;
    let mut results = Vec::new();

    for (stype, config) in &configs {
        let health = check_service_impl(stype, config).await;
        results.push(health.clone());

        let mut cache = manager.cache.lock().await;
        cache.insert(stype.clone(), health);
    }

    Ok(results)
}

/// Get cached service status (no network calls).
#[tauri::command]
pub async fn get_service_status(
    manager: tauri::State<'_, HealthCheckManager>,
) -> Result<Vec<ServiceHealth>, String> {
    let cache = manager.cache.lock().await;
    Ok(cache.values().cloned().collect())
}

/// Update the background polling interval.
#[tauri::command]
pub async fn set_check_interval(
    manager: tauri::State<'_, HealthCheckManager>,
    seconds: u32,
) -> Result<(), String> {
    if seconds < 10 || seconds > 3600 {
        return Err("Interval must be between 10 and 3600 seconds".to_string());
    }
    let mut interval = manager.check_interval.lock().await;
    *interval = Duration::from_secs(seconds as u64);
    Ok(())
}
