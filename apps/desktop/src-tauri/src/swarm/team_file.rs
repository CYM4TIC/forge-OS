use serde::{Deserialize, Serialize};

/// TeamFile — per-persona configuration for the swarm.
/// Defines who's on the team, their capabilities, and communication rules.
/// Stored as JSON in SQLite settings (key: "team.config").

/// A single team member definition.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamMember {
    /// Agent identifier (e.g., "pierce", "mara").
    pub agent_id: String,
    /// Display name (e.g., "Dr. Pierce").
    pub name: String,
    /// Hex color for UI (e.g., "#EF4444").
    pub color: String,
    /// Agent type classification.
    pub agent_type: AgentType,
    /// Model tier: "opus", "sonnet", "haiku".
    pub model: String,
    /// Permission mode for file access.
    pub permission_mode: PermissionMode,
    /// Event subscriptions (e.g., ["gate-results", "findings"]).
    pub subscriptions: Vec<String>,
    /// Backend execution type.
    pub backend_type: BackendType,
    /// Whether this member is currently active.
    pub is_active: bool,
}

/// Agent type classification.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentType {
    Persona,
    Intelligence,
    Orchestrator,
    Utility,
    SubAgent,
}

/// File access permission mode.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum PermissionMode {
    ReadOnly,
    ReadWrite,
    Full,
}

/// Backend execution type.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum BackendType {
    InProcess,
    Subprocess,
    Remote,
}

/// The full TeamFile configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamFile {
    /// The lead agent (orchestrator).
    pub lead_agent_id: String,
    /// Paths the team is allowed to access.
    pub team_allowed_paths: Vec<String>,
    /// All team members.
    pub members: Vec<TeamMember>,
}

impl TeamFile {
    /// Create a default TeamFile with the 10 core personas.
    pub fn default_team() -> Self {
        Self {
            lead_agent_id: "nyx".to_string(),
            team_allowed_paths: vec!["forge/".to_string(), "docs/".to_string()],
            members: vec![
                Self::persona("nyx", "Dr. Nyx", "#6366F1", "opus", PermissionMode::ReadWrite),
                Self::persona("pierce", "Dr. Pierce", "#EF4444", "opus", PermissionMode::ReadOnly),
                Self::persona("kehinde", "Dr. Kehinde", "#3B82F6", "sonnet", PermissionMode::ReadOnly),
                Self::persona("tanaka", "Dr. Tanaka", "#F59E0B", "sonnet", PermissionMode::ReadOnly),
                Self::persona("vane", "Dr. Vane", "#10B981", "sonnet", PermissionMode::ReadOnly),
                Self::persona("mara", "Dr. Mara", "#EC4899", "sonnet", PermissionMode::ReadOnly),
                Self::persona("riven", "Dr. Riven", "#8B5CF6", "sonnet", PermissionMode::ReadOnly),
                Self::persona("voss", "Dr. Voss", "#6B7280", "sonnet", PermissionMode::ReadOnly),
                Self::persona("calloway", "Dr. Calloway", "#F97316", "sonnet", PermissionMode::ReadOnly),
                Self::persona("sable", "Dr. Sable", "#14B8A6", "sonnet", PermissionMode::ReadOnly),
            ],
        }
    }

    fn persona(id: &str, name: &str, color: &str, model: &str, mode: PermissionMode) -> TeamMember {
        TeamMember {
            agent_id: id.to_string(),
            name: name.to_string(),
            color: color.to_string(),
            agent_type: AgentType::Persona,
            model: model.to_string(),
            permission_mode: mode,
            subscriptions: Vec::new(),
            backend_type: BackendType::InProcess,
            is_active: true,
        }
    }

    /// Get a member by agent_id.
    pub fn get_member(&self, agent_id: &str) -> Option<&TeamMember> {
        self.members.iter().find(|m| m.agent_id == agent_id)
    }

    /// Get a mutable member by agent_id.
    pub fn get_member_mut(&mut self, agent_id: &str) -> Option<&mut TeamMember> {
        self.members.iter_mut().find(|m| m.agent_id == agent_id)
    }

    /// List active members.
    pub fn active_members(&self) -> Vec<&TeamMember> {
        self.members.iter().filter(|m| m.is_active).collect()
    }
}

// ── SQLite persistence ──

use crate::database::Database;

const TEAM_CONFIG_KEY: &str = "team.config";

/// Load TeamFile from SQLite settings. Returns default if not found.
pub fn load_team_config(db: &Database) -> Result<TeamFile, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock: {}", e))?;
    let result: Result<Option<String>, _> =
        crate::database::queries::get_setting(&conn, TEAM_CONFIG_KEY);

    match result {
        Ok(Some(json)) => {
            serde_json::from_str(&json).map_err(|e| format!("Parse TeamFile: {}", e))
        }
        Ok(None) => Ok(TeamFile::default_team()),
        Err(e) => Err(format!("Load TeamFile: {}", e)),
    }
}

/// Save TeamFile to SQLite settings.
pub fn save_team_config(db: &Database, team: &TeamFile) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock: {}", e))?;
    let json = serde_json::to_string(team).map_err(|e| format!("Serialize TeamFile: {}", e))?;
    crate::database::queries::set_setting(&conn, TEAM_CONFIG_KEY, &json)
        .map_err(|e| format!("Save TeamFile: {}", e))
}

/// Update a single team member. Returns error if member not found.
pub fn update_team_member(
    db: &Database,
    agent_id: &str,
    updates: TeamMemberUpdate,
) -> Result<TeamFile, String> {
    let mut team = load_team_config(db)?;
    let member = team
        .get_member_mut(agent_id)
        .ok_or_else(|| format!("Member not found: {}", agent_id))?;

    if let Some(model) = updates.model {
        member.model = model;
    }
    if let Some(is_active) = updates.is_active {
        member.is_active = is_active;
    }
    if let Some(color) = updates.color {
        member.color = color;
    }
    if let Some(subscriptions) = updates.subscriptions {
        member.subscriptions = subscriptions;
    }
    if let Some(permission_mode) = updates.permission_mode {
        member.permission_mode = permission_mode;
    }

    save_team_config(db, &team)?;
    Ok(team)
}

/// Partial update for a team member.
#[derive(Debug, Clone, Deserialize)]
pub struct TeamMemberUpdate {
    pub model: Option<String>,
    pub is_active: Option<bool>,
    pub color: Option<String>,
    pub subscriptions: Option<Vec<String>>,
    pub permission_mode: Option<PermissionMode>,
}
