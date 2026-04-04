// ── Permission Rule Sources ──────────────────────────────────────────────────
// P7-N: Layered permission system with 4-tier precedence.
// Source: Claude Code permission-model pattern.
//
// Permissions are user-configured overrides. Policy (policy.rs) is structural
// rules. Both are evaluated — policy first (DENY blocks), then permissions
// refine the decision for Allow/Ask routing.
//
// Precedence (highest wins):
//   session_override > persona_config > project_settings > defaults

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::commands::policy::matches_tool_pattern;

// ---------------------------------------------------------------------------
// Permission types
// ---------------------------------------------------------------------------

/// Source tier for a permission rule. Higher tiers override lower.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PermissionSource {
    /// System defaults (lowest priority).
    Default = 0,
    /// Project-level settings (vault/settings).
    ProjectSettings = 1,
    /// Per-persona configuration.
    PersonaConfig = 2,
    /// Session-scoped override (highest priority, ephemeral).
    SessionOverride = 3,
}

/// What a permission rule prescribes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PermissionAction {
    /// Allow the tool call without confirmation.
    Allow,
    /// Deny the tool call.
    Deny,
    /// Ask the operator for confirmation.
    Ask,
}

impl PermissionAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            PermissionAction::Allow => "allow",
            PermissionAction::Deny => "deny",
            PermissionAction::Ask => "ask",
        }
    }
}

impl PermissionSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            PermissionSource::Default => "default",
            PermissionSource::ProjectSettings => "project_settings",
            PermissionSource::PersonaConfig => "persona_config",
            PermissionSource::SessionOverride => "session_override",
        }
    }
}

/// A single permission rule with glob pattern matching on tool names.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionRule {
    /// Unique ID (ULID or UUID).
    pub id: String,
    /// Glob pattern for tool names (e.g., "git*", "execute_sql", "write_*").
    /// Uses same matching as policy.rs: `matches_tool_pattern()`.
    pub tool_pattern: String,
    /// What to do when the pattern matches.
    pub action: PermissionAction,
    /// Which tier this rule comes from.
    pub source: PermissionSource,
    /// Optional persona scope (None = applies to all personas).
    pub persona: Option<String>,
}

/// Result of permission resolution.
#[derive(Debug, Clone, Serialize)]
pub struct PermissionDecision {
    /// The resolved action.
    pub action: PermissionAction,
    /// The rule that determined the decision (None = system default).
    pub matched_rule: Option<PermissionRule>,
    /// The source tier of the matching rule.
    pub source: PermissionSource,
}

// ---------------------------------------------------------------------------
// Permission Resolver
// ---------------------------------------------------------------------------

/// Resolve permissions across the 4-tier precedence chain.
///
/// Rules are collected from all tiers, filtered by persona scope, matched
/// against the tool name, then the highest-source-tier match wins.
pub fn resolve_permission(
    rules: &[PermissionRule],
    tool_name: &str,
    persona: Option<&str>,
) -> PermissionDecision {
    let mut best_match: Option<&PermissionRule> = None;

    for rule in rules {
        // Check persona scope: None matches all, Some matches the specific persona
        let persona_matches = match (&rule.persona, persona) {
            (None, _) => true,
            (Some(rp), Some(p)) => rp == p,
            (Some(_), None) => false,
        };
        if !persona_matches {
            continue;
        }

        // Check tool pattern match
        if !matches_tool_pattern(&rule.tool_pattern, tool_name) {
            continue;
        }

        // Highest source tier wins
        match best_match {
            None => best_match = Some(rule),
            Some(current) => {
                if rule.source > current.source {
                    best_match = Some(rule);
                }
            }
        }
    }

    match best_match {
        Some(rule) => PermissionDecision {
            action: rule.action,
            matched_rule: Some(rule.clone()),
            source: rule.source,
        },
        None => PermissionDecision {
            action: PermissionAction::Ask,
            matched_rule: None,
            source: PermissionSource::Default,
        },
    }
}

// ---------------------------------------------------------------------------
// SQLite persistence (persistent rules — not session overrides)
// ---------------------------------------------------------------------------

/// Save a permission rule to SQLite.
pub fn save_permission_rule(conn: &Connection, rule: &PermissionRule) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT OR REPLACE INTO permission_rules (id, tool_pattern, action, source, persona)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            rule.id,
            rule.tool_pattern,
            rule.action.as_str(),
            rule.source.as_str(),
            rule.persona,
        ],
    )?;
    Ok(())
}

/// Load all permission rules from SQLite (persistent tiers only).
pub fn load_permission_rules(conn: &Connection) -> Result<Vec<PermissionRule>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, tool_pattern, action, source, persona FROM permission_rules ORDER BY source DESC, created_at DESC",
    )?;

    let rows = stmt.query_map([], |row| {
        let action_str: String = row.get(2)?;
        let source_str: String = row.get(3)?;

        Ok(PermissionRule {
            id: row.get(0)?,
            tool_pattern: row.get(1)?,
            action: parse_permission_action(&action_str),
            source: parse_permission_source(&source_str),
            persona: row.get(4)?,
        })
    })?;

    rows.collect()
}

/// Delete a permission rule by ID.
pub fn delete_permission_rule(conn: &Connection, id: &str) -> Result<bool, rusqlite::Error> {
    let affected = conn.execute("DELETE FROM permission_rules WHERE id = ?1", params![id])?;
    Ok(affected > 0)
}

fn parse_permission_action(s: &str) -> PermissionAction {
    match s {
        "allow" => PermissionAction::Allow,
        "deny" => PermissionAction::Deny,
        _ => PermissionAction::Ask,
    }
}

fn parse_permission_source(s: &str) -> PermissionSource {
    match s {
        "session_override" => PermissionSource::SessionOverride,
        "persona_config" => PermissionSource::PersonaConfig,
        "project_settings" => PermissionSource::ProjectSettings,
        _ => PermissionSource::Default,
    }
}

// ---------------------------------------------------------------------------
// Tauri Commands
// ---------------------------------------------------------------------------

use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

/// In-memory permission state: persistent rules + session overrides.
pub struct PermissionManager {
    /// Persistent rules loaded from SQLite.
    persistent_rules: Vec<PermissionRule>,
    /// Session-scoped overrides (ephemeral, cleared on restart).
    session_overrides: Vec<PermissionRule>,
}

impl PermissionManager {
    pub fn new(persistent_rules: Vec<PermissionRule>) -> Self {
        Self {
            persistent_rules,
            session_overrides: Vec::new(),
        }
    }

    /// Get all rules (session overrides + persistent), ordered for resolution.
    pub fn all_rules(&self) -> Vec<PermissionRule> {
        let mut all = self.session_overrides.clone();
        all.extend(self.persistent_rules.clone());
        all
    }

    /// Add a session-scoped override.
    pub fn add_session_override(&mut self, rule: PermissionRule) {
        self.session_overrides.push(rule);
    }

    /// Clear all session overrides.
    pub fn clear_session_overrides(&mut self) {
        self.session_overrides.clear();
    }

    /// Reload persistent rules from SQLite.
    pub fn reload_persistent(&mut self, rules: Vec<PermissionRule>) {
        self.persistent_rules = rules;
    }
}

/// Managed Tauri state for the permission manager.
pub type PermissionManagerState = Arc<Mutex<PermissionManager>>;

/// Resolve a permission for a tool call.
#[tauri::command]
pub async fn resolve_permission_cmd(
    manager: State<'_, PermissionManagerState>,
    tool_name: String,
    persona: Option<String>,
) -> Result<PermissionDecision, String> {
    let m = manager.lock().await;
    let all_rules = m.all_rules();
    Ok(resolve_permission(&all_rules, &tool_name, persona.as_deref()))
}

/// Add a session-scoped permission override.
#[tauri::command]
pub async fn add_session_permission_override(
    manager: State<'_, PermissionManagerState>,
    tool_pattern: String,
    action: PermissionAction,
    persona: Option<String>,
) -> Result<(), String> {
    let mut m = manager.lock().await;
    m.add_session_override(PermissionRule {
        id: uuid::Uuid::new_v4().to_string(),
        tool_pattern,
        action,
        source: PermissionSource::SessionOverride,
        persona,
    });
    Ok(())
}

/// Get all current permission rules (session + persistent).
#[tauri::command]
pub async fn get_permission_rules(
    manager: State<'_, PermissionManagerState>,
) -> Result<Vec<PermissionRule>, String> {
    let m = manager.lock().await;
    Ok(m.all_rules())
}
