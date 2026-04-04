use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::time::Instant;

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
        "action_palette" => vec![CapabilityFamily::ReadOnly, CapabilityFamily::WriteCode],
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

// ---------------------------------------------------------------------------
// Three-tier capability model
// ---------------------------------------------------------------------------

/// Tool definition for the dispatch pipeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub capability: CapabilityFamily,
}

/// Resolved capabilities across three tiers:
/// 1. Base — available to all personas (read, grep, snapshot)
/// 2. Persona-specific — derived from persona's CapabilityFamily grants
/// 3. External MCP — dynamically discovered from connected MCPs
#[derive(Debug, Clone, Serialize)]
pub struct ResolvedCapabilities {
    /// Tier 1: base tools available to every persona.
    pub base: Vec<String>,
    /// Tier 2: tools unlocked by this persona's capability grants.
    pub persona_specific: Vec<String>,
    /// Tier 3: tools from connected external MCPs (discovered at runtime).
    pub external_mcp: Vec<String>,
    /// The full merged set (all three tiers, deduplicated).
    pub all_tools: Vec<String>,
}

/// Base tools available to every persona regardless of grants.
const BASE_TOOLS: &[&str] = &[
    "read_file", "glob_files", "grep_content", "list_directory",
    "get_build_state", "get_session_info",
];

/// Tool → capability mapping. Tools not listed here are base (ReadOnly).
fn tool_capability(tool: &str) -> CapabilityFamily {
    match tool {
        // WriteCode tools
        "write_file" | "edit_file" | "create_file" => CapabilityFamily::WriteCode,
        // WriteVault tools
        "write_vault" | "edit_vault" | "update_findings" | "update_learnings" =>
            CapabilityFamily::WriteVault,
        // Database tools
        "execute_sql" | "apply_migration" | "query_schema" => CapabilityFamily::Database,
        // External tools
        "github_push" | "github_pr" | "supabase_query" | "cloudflare_deploy" =>
            CapabilityFamily::External,
        // Destructive tools
        "delete_file" | "force_push" | "drop_table" | "reset_branch" =>
            CapabilityFamily::Destructive,
        // Everything else is ReadOnly
        _ => CapabilityFamily::ReadOnly,
    }
}

/// All known tools in the system, organized by capability tier.
fn all_known_tools() -> Vec<(&'static str, CapabilityFamily)> {
    vec![
        // ReadOnly
        ("read_file", CapabilityFamily::ReadOnly),
        ("glob_files", CapabilityFamily::ReadOnly),
        ("grep_content", CapabilityFamily::ReadOnly),
        ("list_directory", CapabilityFamily::ReadOnly),
        ("get_build_state", CapabilityFamily::ReadOnly),
        ("get_session_info", CapabilityFamily::ReadOnly),
        ("snapshot_page", CapabilityFamily::ReadOnly),
        ("screenshot_page", CapabilityFamily::ReadOnly),
        ("inspect_element", CapabilityFamily::ReadOnly),
        // WriteCode
        ("write_file", CapabilityFamily::WriteCode),
        ("edit_file", CapabilityFamily::WriteCode),
        ("create_file", CapabilityFamily::WriteCode),
        // WriteVault
        ("write_vault", CapabilityFamily::WriteVault),
        ("edit_vault", CapabilityFamily::WriteVault),
        ("update_findings", CapabilityFamily::WriteVault),
        ("update_learnings", CapabilityFamily::WriteVault),
        // Database
        ("execute_sql", CapabilityFamily::Database),
        ("apply_migration", CapabilityFamily::Database),
        ("query_schema", CapabilityFamily::Database),
        // External
        ("github_push", CapabilityFamily::External),
        ("github_pr", CapabilityFamily::External),
        ("supabase_query", CapabilityFamily::External),
        ("cloudflare_deploy", CapabilityFamily::External),
        // Destructive
        ("delete_file", CapabilityFamily::Destructive),
        ("force_push", CapabilityFamily::Destructive),
        ("drop_table", CapabilityFamily::Destructive),
        ("reset_branch", CapabilityFamily::Destructive),
    ]
}

/// Resolve the full three-tier capability set for a persona in a given context.
///
/// - `persona`: persona slug (e.g., "pierce", "nyx")
/// - `context`: dispatch context (e.g., "build", "gate_review")
/// - `connected_mcps`: list of currently connected MCP tool names
pub fn resolve_capabilities(
    persona: &str,
    context: &str,
    connected_mcps: &[String],
) -> ResolvedCapabilities {
    let grants = default_capabilities(context);

    // Tier 1: base tools (always available)
    let base: Vec<String> = BASE_TOOLS.iter().map(|t| t.to_string()).collect();

    // Tier 2: persona-specific tools from capability grants
    let persona_specific: Vec<String> = all_known_tools()
        .iter()
        .filter(|(name, cap)| {
            // Include if this tool's capability is granted AND it's not a base tool
            grants.contains(cap) && !BASE_TOOLS.contains(name)
        })
        .map(|(name, _)| name.to_string())
        .collect();

    // Tier 3: external MCP tools (discovered at runtime)
    let allowed = get_allowed_tools(persona, &grants);
    let allowed_set: HashSet<&str> = allowed.iter().map(|s| s.as_str()).collect();
    let external_mcp: Vec<String> = connected_mcps
        .iter()
        .filter(|t| allowed_set.contains(t.as_str()) || grants.contains(&CapabilityFamily::External))
        .cloned()
        .collect();

    // Merge all tiers (deduplicated, sorted)
    let mut all_set: HashSet<String> = HashSet::new();
    all_set.extend(base.iter().cloned());
    all_set.extend(persona_specific.iter().cloned());
    all_set.extend(external_mcp.iter().cloned());
    let mut all_tools: Vec<String> = all_set.into_iter().collect();
    all_tools.sort();

    ResolvedCapabilities {
        base,
        persona_specific,
        external_mcp,
        all_tools,
    }
}

// ---------------------------------------------------------------------------
// Per-persona tool allow-lists
// ---------------------------------------------------------------------------

/// Derive tool allow-lists from capability grants at dispatch time.
/// Pierce (ReadOnly) gets read + grep + snapshot.
/// Nyx (WriteCode) gets the full set.
/// Dynamic, not static config.
///
/// P7-N: Prefix-matching — `"git"` matches `"git_status"`, `"git_diff"`, etc.
/// Uses `matches_tool_pattern()` from policy.rs for consistent glob/prefix behavior.
pub fn get_allowed_tools(persona: &str, grants: &[CapabilityFamily]) -> Vec<String> {
    let mut tools: Vec<String> = Vec::new();

    // Base tools always included
    tools.extend(BASE_TOOLS.iter().map(|t| t.to_string()));

    // Add tools matching granted capabilities
    for (name, cap) in all_known_tools() {
        if grants.contains(&cap) && !tools.contains(&name.to_string()) {
            tools.push(name.to_string());
        }
    }

    // Persona-specific additions (beyond capability grants)
    match persona {
        // Mara gets browser inspection tools even in ReadOnly context
        "mara" => {
            for tool in &["snapshot_page", "screenshot_page", "inspect_element"] {
                if !tools.contains(&tool.to_string()) {
                    tools.push(tool.to_string());
                }
            }
        }
        // Tanaka gets schema query even without full Database grant
        "tanaka" => {
            if !tools.contains(&"query_schema".to_string()) {
                tools.push("query_schema".to_string());
            }
        }
        _ => {}
    }

    tools.sort();
    tools
}

/// Check if a tool name is allowed by the allow-list, with prefix-matching.
/// `"git"` in the allow-list matches `"git_status"`, `"git_diff"`, etc.
/// This is the runtime check used by the dispatch pipeline.
pub fn is_tool_allowed(tool_name: &str, allowed_tools: &[String]) -> bool {
    use crate::commands::policy::matches_tool_pattern;
    allowed_tools.iter().any(|pattern| matches_tool_pattern(pattern, tool_name))
}

// ---------------------------------------------------------------------------
// Factory-based tool set construction
// ---------------------------------------------------------------------------

/// Construct per-persona tool sets at dispatch time.
/// Persona's granted capabilities determine which tools are included.
/// Returns Tool structs with name, description, and capability tier.
pub fn create_tool_set(persona: &str, grants: &[CapabilityFamily]) -> Vec<Tool> {
    let allowed = get_allowed_tools(persona, grants);

    allowed
        .into_iter()
        .map(|name| {
            let cap = tool_capability(&name);
            let description = tool_description(&name);
            Tool {
                name,
                description,
                capability: cap,
            }
        })
        .collect()
}

/// Human-readable tool descriptions.
fn tool_description(tool: &str) -> String {
    match tool {
        "read_file" => "Read file contents",
        "glob_files" => "Find files by glob pattern",
        "grep_content" => "Search file contents by regex",
        "list_directory" => "List directory entries",
        "get_build_state" => "Get current build state from BOOT.md",
        "get_session_info" => "Get current session metadata",
        "snapshot_page" => "Accessibility tree snapshot of preview page",
        "screenshot_page" => "Screenshot of preview page",
        "inspect_element" => "Inspect CSS/DOM properties of an element",
        "write_file" => "Write a new file",
        "edit_file" => "Edit an existing file",
        "create_file" => "Create a new file",
        "write_vault" => "Write to vault files",
        "edit_vault" => "Edit vault files",
        "update_findings" => "Update findings log",
        "update_learnings" => "Update build learnings",
        "execute_sql" => "Execute SQL query",
        "apply_migration" => "Apply database migration",
        "query_schema" => "Query database schema",
        "github_push" => "Push to GitHub",
        "github_pr" => "Create/update GitHub PR",
        "supabase_query" => "Query Supabase",
        "cloudflare_deploy" => "Deploy to Cloudflare",
        "delete_file" => "Delete a file (destructive)",
        "force_push" => "Force push to remote (destructive)",
        "drop_table" => "Drop database table (destructive)",
        "reset_branch" => "Reset git branch (destructive)",
        _ => "Unknown tool",
    }
    .to_string()
}

// ---------------------------------------------------------------------------
// P7-N: Capability widening / narrowing (dynamic open-close)
// Source: Excalibur Spellbook pattern.
// ---------------------------------------------------------------------------

/// Scope for a capability grant — when does it expire?
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GrantScope {
    /// Grant lasts for a single dispatch.
    Dispatch,
    /// Grant lasts for the entire session.
    Session,
    /// Grant expires at a specific instant (TTL).
    Expiring {
        #[serde(skip)]
        expires_at: Option<Instant>,
        /// TTL in seconds (serializable proxy for expires_at).
        ttl_secs: u64,
    },
}

/// A capability grant with scope and metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityGrant {
    pub family: CapabilityFamily,
    pub scope: GrantScope,
    /// Who granted this capability (operator, policy, orchestrator).
    pub granted_by: String,
}

impl CapabilityGrant {
    /// K-MED-5: Hydrate `expires_at` from `ttl_secs` after deserialization.
    /// Must be called after any deserialization to activate TTL enforcement.
    pub fn hydrate_expiry(&mut self) {
        if let GrantScope::Expiring { expires_at, ttl_secs } = &mut self.scope {
            if expires_at.is_none() && *ttl_secs > 0 {
                *expires_at = Some(Instant::now() + std::time::Duration::from_secs(*ttl_secs));
            }
        }
    }
}

/// Per-persona active capability state.
/// Tracks the current grants and provides widening/narrowing.
pub struct PersonaCapabilityState {
    /// Active grants beyond the base context default.
    grants: Vec<CapabilityGrant>,
}

impl Default for PersonaCapabilityState {
    fn default() -> Self {
        Self::new()
    }
}

impl PersonaCapabilityState {
    pub fn new() -> Self {
        Self {
            grants: Vec::new(),
        }
    }

    /// Widen: add capability grants to this persona.
    /// Hydrates expiry on each grant and prunes any stale grants.
    pub fn widen(&mut self, new_grants: Vec<CapabilityGrant>) {
        for mut grant in new_grants {
            grant.hydrate_expiry();
            self.grants.push(grant);
        }
        self.prune_expired();
    }

    /// Narrow: remove all grants for the specified families.
    pub fn narrow(&mut self, families: &[CapabilityFamily]) {
        self.grants.retain(|g| !families.contains(&g.family));
    }

    /// Prune expired TTL grants.
    pub fn prune_expired(&mut self) {
        let now = Instant::now();
        self.grants.retain(|g| {
            match &g.scope {
                GrantScope::Expiring { expires_at, .. } => {
                    expires_at.map_or(true, |exp| now < exp)
                }
                _ => true,
            }
        });
    }

    /// Snapshot: get effective capability families (deduplicated).
    /// K-MED-6: Prunes expired grants before resolving.
    pub fn effective_capabilities(&mut self, base_context: &str) -> Vec<CapabilityFamily> {
        self.prune_expired();
        let mut caps: Vec<CapabilityFamily> = default_capabilities(base_context);

        for grant in &self.grants {
            if !caps.contains(&grant.family) {
                caps.push(grant.family);
            }
        }

        caps
    }

    /// Get all active grants.
    pub fn active_grants(&self) -> &[CapabilityGrant] {
        &self.grants
    }

    /// Clear all dispatch-scoped grants (called at dispatch end).
    pub fn clear_dispatch_grants(&mut self) {
        self.grants.retain(|g| !matches!(g.scope, GrantScope::Dispatch));
    }
}
