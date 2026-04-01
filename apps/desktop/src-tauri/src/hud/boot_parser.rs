use serde::{Deserialize, Serialize};

/// Structured snapshot of BOOT.md YAML frontmatter.
/// The HUD reads this to display build state in the pipeline canvas.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildStateSnapshot {
    pub project: String,
    pub architecture: String,
    pub phase: String,
    pub current_session: String,
    pub current_batch: String,
    pub batches_done: u32,
    pub phases_total: u32,
    pub sessions_total: u32,
    pub last_commit: String,
    pub last_updated: String,
    pub phase_complete: bool,
}

/// A pipeline stage with status tracking.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStage {
    pub id: String,
    pub label: String,
    pub status: StageStatus,
    pub agent: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum StageStatus {
    Idle,
    Active,
    Complete,
    Error,
}

/// Parse BOOT.md content and extract the YAML frontmatter block.
///
/// Expects a fenced YAML block between ```yaml and ``` markers.
/// Returns None if the block is missing or unparseable.
pub fn parse_boot_md(content: &str) -> Option<BuildStateSnapshot> {
    let yaml_start = content.find("```yaml")?;
    let yaml_body_start = content[yaml_start..].find('\n')? + yaml_start + 1;
    let yaml_end = content[yaml_body_start..].find("```")? + yaml_body_start;
    let yaml_block = &content[yaml_body_start..yaml_end];

    // Parse YAML key: value pairs manually — avoids serde_yaml dependency.
    // BOOT.md YAML is simple flat key-value, no nesting.
    let mut map = std::collections::HashMap::new();
    for line in yaml_block.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = line.split_once(':') {
            map.insert(
                key.trim().to_string(),
                value.trim().to_string(),
            );
        }
    }

    let phase_str = map.get("phase").cloned().unwrap_or_default();
    let phase_complete = phase_str.ends_with("COMPLETE")
        || map.get("phase_4_complete").map(|v| v == "true").unwrap_or(false);

    Some(BuildStateSnapshot {
        project: map.get("project").cloned().unwrap_or_default(),
        architecture: map.get("architecture").cloned().unwrap_or_default(),
        phase: phase_str,
        current_session: map.get("current_session").cloned().unwrap_or_default(),
        current_batch: map.get("current_batch").cloned().unwrap_or_default(),
        batches_done: map.get("batches_done").and_then(|v| v.parse().ok()).unwrap_or(0),
        phases_total: map.get("phases_total").and_then(|v| v.parse().ok()).unwrap_or(0),
        sessions_total: map.get("sessions_total").and_then(|v| v.parse().ok()).unwrap_or(0),
        last_commit: map.get("last_commit").cloned().unwrap_or_default(),
        last_updated: map.get("last_updated").cloned().unwrap_or_default(),
        phase_complete,
    })
}

/// Build the default 4-stage pipeline: Scout → Build → Triad → Sentinel.
/// All stages start idle. The HUD updates them via events.
pub fn default_pipeline() -> Vec<PipelineStage> {
    vec![
        PipelineStage {
            id: "scout".to_string(),
            label: "Scout".to_string(),
            status: StageStatus::Idle,
            agent: None,
            started_at: None,
            completed_at: None,
        },
        PipelineStage {
            id: "build".to_string(),
            label: "Build".to_string(),
            status: StageStatus::Idle,
            agent: Some("nyx".to_string()),
            started_at: None,
            completed_at: None,
        },
        PipelineStage {
            id: "triad".to_string(),
            label: "Triad".to_string(),
            status: StageStatus::Idle,
            agent: None,
            started_at: None,
            completed_at: None,
        },
        PipelineStage {
            id: "sentinel".to_string(),
            label: "Sentinel".to_string(),
            status: StageStatus::Idle,
            agent: None,
            started_at: None,
            completed_at: None,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_boot_md() {
        let content = r#"# Forge OS — Boot File

```yaml
project: forge_os
architecture: tauri_v2
phase: 5_IN_PROGRESS
current_session: 5.1_BUILD_STATE_TOPOLOGY
current_batch: P5-A
batches_done: 65
last_commit: 39d07b4
phases_total: 9
sessions_total: 29
last_updated: 2026-04-01
```

Some other content here.
"#;
        let snapshot = parse_boot_md(content).unwrap();
        assert_eq!(snapshot.project, "forge_os");
        assert_eq!(snapshot.architecture, "tauri_v2");
        assert_eq!(snapshot.phase, "5_IN_PROGRESS");
        assert_eq!(snapshot.current_batch, "P5-A");
        assert_eq!(snapshot.batches_done, 65);
        assert_eq!(snapshot.phases_total, 9);
        assert!(!snapshot.phase_complete);
    }

    #[test]
    fn test_parse_complete_phase() {
        let content = r#"
```yaml
project: forge_os
architecture: tauri_v2
phase: 4_COMPLETE
current_session: 4.4_DONE
current_batch: P4-T_DONE
batches_done: 65
phases_total: 9
sessions_total: 29
last_commit: abc1234
last_updated: 2026-04-01
phase_4_complete: true
```
"#;
        let snapshot = parse_boot_md(content).unwrap();
        assert!(snapshot.phase_complete);
    }

    #[test]
    fn test_default_pipeline() {
        let stages = default_pipeline();
        assert_eq!(stages.len(), 4);
        assert_eq!(stages[0].id, "scout");
        assert_eq!(stages[0].status, StageStatus::Idle);
        assert_eq!(stages[3].id, "sentinel");
    }
}
