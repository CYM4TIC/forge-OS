use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

// ── Pop-out Panel Window Management ──
// Create/close native OS windows for popped-out panels.
// Each pop-out window loads the same React app with a panel ID query param.
// The React app detects the param and renders only that panel.

#[derive(Debug, Deserialize)]
pub struct CreatePanelWindowRequest {
    pub panel_id: String,
    pub panel_type: String,
    pub title: String,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize)]
pub struct PanelWindowInfo {
    pub panel_id: String,
    pub label: String,
}

#[tauri::command]
pub fn create_panel_window(
    app: AppHandle,
    request: CreatePanelWindowRequest,
) -> Result<PanelWindowInfo, String> {
    let label = format!("panel_{}", request.panel_id.replace(|c: char| !c.is_alphanumeric() && c != '_', "_"));

    // Check if window already exists
    if app.get_webview_window(&label).is_some() {
        return Ok(PanelWindowInfo {
            panel_id: request.panel_id,
            label,
        });
    }

    // Sanitize panel_id and panel_type to prevent URL parameter injection (TANAKA-MED-5).
    // Only allow alphanumeric, underscore, and hyphen in query params.
    let safe_panel_id: String = request.panel_id.chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
        .collect();
    let safe_panel_type: String = request.panel_type.chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
        .collect();
    let url = WebviewUrl::App(format!("index.html?panel={}&type={}", safe_panel_id, safe_panel_type).into());

    let mut builder = WebviewWindowBuilder::new(&app, &label, url)
        .title(&request.title)
        .inner_size(request.width as f64, request.height as f64)
        .decorations(true)
        .resizable(true)
        .focused(true);

    if let (Some(x), Some(y)) = (request.x, request.y) {
        builder = builder.position(x as f64, y as f64);
    }

    builder.build().map_err(|e| e.to_string())?;

    Ok(PanelWindowInfo {
        panel_id: request.panel_id,
        label,
    })
}

#[tauri::command]
pub fn close_panel_window(
    app: AppHandle,
    panel_id: String,
) -> Result<bool, String> {
    let label = format!("panel_{}", panel_id.replace(|c: char| !c.is_alphanumeric() && c != '_', "_"));

    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn list_panel_windows(
    app: AppHandle,
) -> Result<Vec<String>, String> {
    let windows = app.webview_windows();
    let panel_labels: Vec<String> = windows
        .keys()
        .filter(|label| label.starts_with("panel_"))
        .cloned()
        .collect();
    Ok(panel_labels)
}
