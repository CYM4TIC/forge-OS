use std::sync::Mutex;
use std::path::Path;

use crate::database::Database;
use crate::hud::boot_parser::{self, BuildStateSnapshot, PipelineStage};
use crate::hud::events::{self, HudEvent, HudFinding};
use crate::hud::findings::{self, FindingsFilter, HudSeverityCounts};

/// Validate that a boot_path is safe to read — must end with BOOT.md
/// and must not contain path traversal sequences.
/// TANAKA-CRIT-1: Prevents arbitrary file read via compromised webview.
fn validate_boot_path(boot_path: &str) -> Result<(), String> {
    let path = Path::new(boot_path);

    // Must end with BOOT.md
    let file_name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    if file_name != "BOOT.md" {
        return Err("Invalid boot path: must point to a BOOT.md file".to_string());
    }

    // Reject path traversal patterns
    let normalized = boot_path.replace('\\', "/");
    if normalized.contains("/../") || normalized.contains("/./") || normalized.starts_with("../") {
        return Err("Invalid boot path: path traversal detected".to_string());
    }

    // Must be an absolute path
    if !path.is_absolute() {
        return Err("Invalid boot path: must be absolute".to_string());
    }

    Ok(())
}

/// In-memory pipeline stage state. Initialized with default_pipeline(),
/// mutated by update_pipeline_stage, read by get_pipeline_stages.
/// Survives page reloads within the same Tauri process.
static PIPELINE_STATE: std::sync::LazyLock<Mutex<Vec<PipelineStage>>> =
    std::sync::LazyLock::new(|| Mutex::new(boot_parser::default_pipeline()));

/// Get the current build state snapshot by parsing BOOT.md.
/// The boot_path is the absolute path to BOOT.md on disk.
/// Path is validated to prevent arbitrary file read (TANAKA-CRIT-1).
#[tauri::command]
pub fn get_build_state_snapshot(boot_path: String) -> Result<BuildStateSnapshot, String> {
    validate_boot_path(&boot_path)?;
    let content = std::fs::read_to_string(&boot_path)
        .map_err(|e| format!("Failed to read BOOT.md at {}: {}", boot_path, e))?;
    boot_parser::parse_boot_md(&content)
        .ok_or_else(|| "Failed to parse BOOT.md YAML frontmatter".to_string())
}

/// Get current pipeline stages from in-memory state.
#[tauri::command]
pub fn get_pipeline_stages() -> Vec<PipelineStage> {
    PIPELINE_STATE.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

/// Re-read BOOT.md and emit a BuildStateChanged event to the frontend.
/// Call this after any build operation that changes state.
/// Path is validated to prevent arbitrary file read (TANAKA-CRIT-1).
#[tauri::command]
pub fn refresh_build_state(
    app: tauri::AppHandle,
    boot_path: String,
) -> Result<BuildStateSnapshot, String> {
    validate_boot_path(&boot_path)?;
    let content = std::fs::read_to_string(&boot_path)
        .map_err(|e| format!("Failed to read BOOT.md at {}: {}", boot_path, e))?;
    let snapshot = boot_parser::parse_boot_md(&content)
        .ok_or_else(|| "Failed to parse BOOT.md YAML frontmatter".to_string())?;

    events::emit_hud_event(&app, &HudEvent::BuildStateChanged(snapshot.clone()));

    Ok(snapshot)
}

/// Update a pipeline stage in memory and emit the change event.
#[tauri::command]
pub fn update_pipeline_stage(
    app: tauri::AppHandle,
    stage: PipelineStage,
) -> Result<(), String> {
    {
        let mut stages = PIPELINE_STATE.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(existing) = stages.iter_mut().find(|s| s.id == stage.id) {
            *existing = stage.clone();
        }
    }
    events::emit_hud_event(&app, &HudEvent::PipelineStageChanged(stage));
    Ok(())
}

// ── HUD Findings Commands ──────────────────────────────────────────────────

/// List findings with optional filters.
#[tauri::command]
pub fn list_hud_findings(
    db: tauri::State<'_, Database>,
    filter: FindingsFilter,
) -> Result<Vec<HudFinding>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock: {e}"))?;
    findings::list_findings(&conn, &filter)
}

/// Add a new finding to the HUD findings store.
#[tauri::command]
pub fn add_hud_finding(
    app: tauri::AppHandle,
    db: tauri::State<'_, Database>,
    finding: HudFinding,
) -> Result<HudFinding, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock: {e}"))?;
    findings::insert_finding(&conn, &app, &finding)
}

/// Resolve a finding by ID.
#[tauri::command]
pub fn resolve_hud_finding(
    app: tauri::AppHandle,
    db: tauri::State<'_, Database>,
    finding_id: String,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock: {e}"))?;
    findings::resolve_finding(&conn, &app, &finding_id)
}

/// Get finding counts by severity for badge display.
#[tauri::command]
pub fn get_finding_counts(
    db: tauri::State<'_, Database>,
    session_id: Option<String>,
) -> Result<HudSeverityCounts, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock: {e}"))?;
    findings::get_finding_counts(&conn, session_id.as_deref())
}
