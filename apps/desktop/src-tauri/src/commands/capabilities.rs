use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Capability families — dispatch-scoped permission grants
// ---------------------------------------------------------------------------

/// Capability families granted to an agent at dispatch time.
/// The dispatch pipeline checks these before executing tool calls.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CapabilityFamily {
    /// Read files, query data, inspect state. No side effects.
    ReadOnly,
    /// Write/edit source code files.
    WriteCode,
    /// Write to vault files (team-logs, findings, learnings).
    WriteVault,
    /// Execute database queries and migrations.
    Database,
    /// Call external APIs (GitHub, Supabase, etc.).
    External,
    /// Destructive operations (delete files, force push, drop tables).
    /// Requires operator approval before dispatch.
    Destructive,
}

/// Returns the default capability set for a given dispatch context.
///
/// Contexts:
/// - `gate_review` → ReadOnly only (reviewers never write)
/// - `build` → ReadOnly + WriteCode (standard build)
/// - `dreamtime` → ReadOnly + WriteVault (nightly consolidation)
/// - `red_team` → ReadOnly + Destructive (requires operator approval)
/// - `full_access` → All capabilities (operator-escalated)
/// - anything else → ReadOnly (safe default)
pub fn default_capabilities(context: &str) -> Vec<CapabilityFamily> {
    match context {
        "gate_review" => vec![CapabilityFamily::ReadOnly],
        "build" => vec![CapabilityFamily::ReadOnly, CapabilityFamily::WriteCode],
        "dreamtime" => vec![CapabilityFamily::ReadOnly, CapabilityFamily::WriteVault],
        "red_team" => vec![CapabilityFamily::ReadOnly, CapabilityFamily::Destructive],
        "full_access" => vec![
            CapabilityFamily::ReadOnly,
            CapabilityFamily::WriteCode,
            CapabilityFamily::WriteVault,
            CapabilityFamily::Database,
            CapabilityFamily::External,
            CapabilityFamily::Destructive,
        ],
        _ => vec![CapabilityFamily::ReadOnly],
    }
}

/// Check whether a set of granted capabilities includes the required one.
pub fn has_capability(granted: &[CapabilityFamily], required: CapabilityFamily) -> bool {
    granted.contains(&required)
}
