use std::sync::Mutex;

use crate::database::Database;
use crate::hud::boot_parser::{self, BuildStateSnapshot, PipelineStage};
use crate::hud::events::{self, HudEvent, HudFinding};
use crate::hud::findings::{self, FindingsFilter, HudSeverityCounts};

/// In-memory pipeline stage state. Initialized with default_pipeline(),
/// mutated by update_pipeline_stage, read by get_pipeline_stages.
/// Survives page reloads within the same Tauri process.
static PIPELINE_STATE: std::sync::LazyLock<Mutex<Vec<PipelineStage>>> =
    std::sync::LazyLock::new(|| Mutex::new(boot_parser::default_pipeline()));

/// Get the current build state snapshot by parsing BOOT.md.
/// The boot_path is the absolute path to BOOT.md on disk.
#[tauri::command]
pub fn get_build_state_snapshot(boot_path: String) -> Result<BuildStateSnapshot, String> {
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
#[tauri::command]
pub fn refresh_build_state(
    app: tauri::AppHandle,
    boot_path: String,
) -> Result<BuildStateSnapshot, String> {
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
