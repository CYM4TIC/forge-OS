use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, OnceLock};
use tokio::sync::Mutex;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentCategory {
    Persona,
    Intelligence,
    Orchestrator,
    Utility,
    SubAgent,
    Command,
}

/// Agent reasoning effort — feeds thinking token allocation in grimoire.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReasoningEffort {
    Low,
    Medium,
    High,
}

impl Default for ReasoningEffort {
    fn default() -> Self {
        Self::Medium
    }
}

/// Model class — feeds provider routing decisions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ModelClass {
    Frontier,
    Standard,
    Fast,
}

impl Default for ModelClass {
    fn default() -> Self {
        Self::Standard
    }
}

/// Routing role — feeds dispatch pipeline priority.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RoutingRole {
    Leader,
    Specialist,
    Executor,
}

impl Default for RoutingRole {
    fn default() -> Self {
        Self::Specialist
    }
}

/// Per-agent turn-level lifecycle state (from Factory-AI DroidWorkingState).
/// Drives UI: spinners during Streaming, confirmation modal during
/// WaitingForConfirmation, compaction indicator during Compacting.
/// SEPARATED from MissionState (P7-I) — turn-level vs mission-level.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentWorkingState {
    /// Agent is idle — no active turn.
    Idle,
    /// Agent is generating a response (tokens flowing).
    Streaming,
    /// Agent needs operator confirmation before proceeding.
    WaitingForConfirmation,
    /// Agent is executing a tool call.
    ExecutingTool,
    /// Agent is compacting context (auto-compress).
    Compacting,
}

impl Default for AgentWorkingState {
    fn default() -> Self {
        Self::Idle
    }
}

/// Interaction mode — orthogonal to CapabilityFamily.
/// Mode controls structural access; family controls per-action capability.
/// Combined gate: mode × family determines effective permissions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InteractionMode {
    /// Read-only. Only ReadOnly capability valid regardless of grants.
    Spec,
    /// Standard execution. Capabilities as granted by dispatch context.
    Auto,
    /// Mission decomposition with workers. Enables mission features
    /// (worker spawn, feature decomposition, MissionState transitions).
    Orchestrator,
}

impl Default for InteractionMode {
    fn default() -> Self {
        Self::Auto
    }
}

/// Apply the 2-axis gate: InteractionMode × CapabilityFamily.
/// Returns the effective capabilities after mode filtering.
pub fn apply_mode_gate(
    mode: InteractionMode,
    granted: &[crate::commands::capabilities::CapabilityFamily],
) -> Vec<crate::commands::capabilities::CapabilityFamily> {
    use crate::commands::capabilities::CapabilityFamily;
    match mode {
        InteractionMode::Spec => {
            // Spec mode: only ReadOnly, regardless of grants
            vec![CapabilityFamily::ReadOnly]
        }
        InteractionMode::Auto => {
            // Auto mode: capabilities as granted
            granted.to_vec()
        }
        InteractionMode::Orchestrator => {
            // Orchestrator mode: full grants (mission features enabled at dispatch layer)
            granted.to_vec()
        }
    }
}

/// Payload for `agent:working-state-changed` Tauri event.
#[derive(Debug, Clone, Serialize)]
pub struct AgentWorkingStateEvent {
    pub agent_slug: String,
    pub state: AgentWorkingState,
    pub dispatch_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RegistryEntry {
    pub slug: String,
    pub name: String,
    pub description: String,
    pub category: AgentCategory,
    pub tools: Vec<String>,
    pub parent_agent: Option<String>,
    pub file_path: String,
    pub user_invocable: bool,
    pub model: Option<String>,
    pub reasoning_effort: ReasoningEffort,
    pub model_class: ModelClass,
    pub routing_role: RoutingRole,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CommandCategory {
    Build,
    Persona,
    Quality,
    Analysis,
    Reporting,
    Operations,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AvailabilityCheck {
    GitChanges,
    McpConnected(String),
    EnvVarSet(String),
    ServerRunning,
    Always,
}

#[derive(Debug, Clone, Serialize)]
pub struct CommandDef {
    pub slug: String,
    pub name: String,
    pub description: String,
    pub category: CommandCategory,
    pub aliases: Vec<String>,
    pub dispatch_target: String,
    pub available_when: Option<AvailabilityCheck>,
    pub keyboard_shortcut: Option<String>,
}

/// Action type for palette entries.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PaletteActionType {
    Command,
    SubAgent,
    Orchestrator,
}

/// A single action available in the Action Palette.
#[derive(Debug, Clone, Serialize)]
pub struct PaletteAction {
    pub slug: String,
    pub name: String,
    pub description: String,
    pub action_type: PaletteActionType,
    pub dispatch_target_slug: String,
}

/// Response from get_palette_actions — resolved actions for the current selection.
#[derive(Debug, Clone, Serialize)]
pub struct PaletteResponse {
    /// Individual persona/intelligence actions.
    pub individual_actions: Vec<PaletteAction>,
    /// Matched orchestrator actions (e.g., Build Triad when all 3 members selected).
    pub orchestrator_actions: Vec<PaletteAction>,
}

#[derive(Debug, Default)]
pub struct CommandRegistry {
    pub commands: Vec<CommandDef>,
}

// ---------------------------------------------------------------------------
// Lazy handler loading — OnceLock-based deferred initialization
// ---------------------------------------------------------------------------

/// Lazy handler: metadata registered at scan time, content loaded on first dispatch.
/// Uses OnceLock to cache the file content (not a closure) — read once, serve many.
pub struct LazyHandler {
    /// Path to the source file (used to load content on first call).
    source_path: String,
    /// Cached markdown body — initialized on first dispatch, immutable after.
    content: OnceLock<Result<String, String>>,
}

impl LazyHandler {
    pub fn new(source_path: String) -> Self {
        Self {
            source_path,
            content: OnceLock::new(),
        }
    }

    /// Get the cached content or load it from disk on first call.
    /// The content is read once and cached for all subsequent dispatches.
    pub fn get_or_init(&self) -> Result<String, String> {
        let result = self.content.get_or_init(|| {
            match fs::read_to_string(&self.source_path) {
                Ok(raw) => Ok(extract_body(&raw)),
                Err(e) => Err(format!("Failed to read handler source '{}': {}", self.source_path, e)),
            }
        });
        result.clone()
    }
}

impl std::fmt::Debug for LazyHandler {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("LazyHandler")
            .field("source_path", &self.source_path)
            .field("initialized", &self.content.get().is_some())
            .finish()
    }
}

// ---------------------------------------------------------------------------
// Dual adapter registration — YAML declarative + Rust fn implementations
// ---------------------------------------------------------------------------

/// Source type for a command definition: either YAML declarative (simple
/// read-only operations) or a Rust function (complex dispatch logic).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CommandSource {
    /// Command defined declaratively in a YAML/markdown file.
    Yaml { file_path: String },
    /// Command defined as a Rust handler function.
    RustFn { handler_name: String },
    /// Built-in command (hardcoded, no external source).
    Builtin,
}

/// Trait for registering commands from either YAML or Rust sources.
/// Both register into the same CommandRegistry via a unified interface.
pub trait RegisterCommand {
    /// Create a CommandDef from a YAML declarative source file.
    fn from_yaml(slug: &str, entry: &RegistryEntry) -> CommandDef;
    /// Create a CommandDef from a Rust function handler.
    fn from_fn(
        slug: &str,
        name: &str,
        description: &str,
        category: CommandCategory,
        handler_name: &str,
    ) -> CommandDef;
}

impl RegisterCommand for CommandDef {
    fn from_yaml(slug: &str, entry: &RegistryEntry) -> CommandDef {
        let (category, dispatch_target) = classify_command(slug);
        CommandDef {
            slug: slug.to_string(),
            name: entry.name.clone(),
            description: entry.description.clone(),
            category,
            aliases: aliases_for_command(slug),
            dispatch_target,
            available_when: availability_for_command(slug),
            keyboard_shortcut: None,
        }
    }

    fn from_fn(
        slug: &str,
        name: &str,
        description: &str,
        category: CommandCategory,
        handler_name: &str,
    ) -> CommandDef {
        CommandDef {
            slug: slug.to_string(),
            name: name.to_string(),
            description: description.to_string(),
            category,
            aliases: aliases_for_command(slug),
            dispatch_target: handler_name.to_string(),
            available_when: availability_for_command(slug),
            keyboard_shortcut: None,
        }
    }
}

/// Register a built-in command that skips IPC — for low-latency in-process
/// operations like vault reads, sigil scans, and registry queries.
///
/// Usage: `register_builtin!(commands, "help", "Show available commands", Operations)`
#[macro_export]
macro_rules! register_builtin {
    ($commands:expr, $slug:literal, $desc:literal, $category:ident) => {
        $commands.push(CommandDef {
            slug: $slug.into(),
            name: $slug.into(),
            description: $desc.into(),
            category: CommandCategory::$category,
            aliases: aliases_for_command($slug),
            dispatch_target: $slug.into(),
            available_when: Some(AvailabilityCheck::Always),
            keyboard_shortcut: None,
        });
    };
    ($commands:expr, $slug:literal, $name:literal, $desc:literal, $category:ident) => {
        $commands.push(CommandDef {
            slug: $slug.into(),
            name: $name.into(),
            description: $desc.into(),
            category: CommandCategory::$category,
            aliases: aliases_for_command($slug),
            dispatch_target: $slug.into(),
            available_when: Some(AvailabilityCheck::Always),
            keyboard_shortcut: None,
        });
    };
}

// ---------------------------------------------------------------------------
// Lazy handler store — maps command slugs to lazy handlers
// ---------------------------------------------------------------------------

#[derive(Debug, Default)]
pub struct HandlerStore {
    handlers: HashMap<String, Arc<LazyHandler>>,
}

impl HandlerStore {
    pub fn register(&mut self, slug: String, source_path: String) {
        self.handlers.insert(slug, Arc::new(LazyHandler::new(source_path)));
    }

    /// Get a cloned Arc to the handler for the given slug.
    /// Used to clone the handler out of the mutex before invoking it.
    pub fn get_handler(&self, slug: &str) -> Option<Arc<LazyHandler>> {
        self.handlers.get(slug).cloned()
    }

    pub fn dispatch(&self, slug: &str) -> Result<String, String> {
        let handler = self.handlers.get(slug)
            .ok_or_else(|| format!("No handler registered for command '{}'", slug))?;
        handler.get_or_init()
    }
}

#[derive(Debug, Default)]
pub struct AgentRegistry {
    pub entries: HashMap<String, RegistryEntry>,
    pub orchestrator_members: HashMap<String, Vec<String>>,
    pub command_registry: CommandRegistry,
    pub handler_store: HandlerStore,
    initialized: bool,
}

// ---------------------------------------------------------------------------
// Category classification — hardcoded slug sets from entity inventory
// ---------------------------------------------------------------------------

const PERSONA_SLUGS: &[&str] = &[
    "nyx", "pierce", "mara", "riven", "kehinde",
    "tanaka", "vane", "voss", "calloway", "sable",
];

const INTELLIGENCE_SLUGS: &[&str] = &[
    "scout", "sentinel", "wraith", "meridian", "chronicle",
    "arbiter", "compass", "scribe", "kiln", "beacon",
];

const ORCHESTRATOR_SLUGS: &[&str] = &[
    "triad", "systems-triad", "strategy-triad", "gate-runner",
    "council", "decision-council", "debate", "full-audit",
    "launch-sequence", "postmortem",
];

fn classify_agent(slug: &str) -> AgentCategory {
    if PERSONA_SLUGS.contains(&slug) {
        AgentCategory::Persona
    } else if INTELLIGENCE_SLUGS.contains(&slug) {
        AgentCategory::Intelligence
    } else if ORCHESTRATOR_SLUGS.contains(&slug) {
        AgentCategory::Orchestrator
    } else {
        AgentCategory::Utility
    }
}

// ---------------------------------------------------------------------------
// Orchestrator member mapping — which agents compose each orchestrator
// ---------------------------------------------------------------------------

fn build_orchestrator_members() -> HashMap<String, Vec<String>> {
    let mut map = HashMap::new();
    map.insert("triad".into(), vec!["pierce".into(), "mara".into(), "kehinde".into()]);
    map.insert("systems-triad".into(), vec!["kehinde".into(), "tanaka".into(), "kiln".into()]);
    map.insert("strategy-triad".into(), vec!["calloway".into(), "vane".into(), "voss".into()]);
    map.insert("council".into(), PERSONA_SLUGS.iter().map(|s| s.to_string()).collect());
    map.insert("decision-council".into(), vec![
        "pierce".into(), "kehinde".into(), "tanaka".into(),
        "mara".into(), "arbiter".into(),
    ]);
    map.insert("full-audit".into(), vec![
        "pierce".into(), "tanaka".into(), "mara".into(),
        "riven".into(), "kehinde".into(),
    ]);
    map
}

// ---------------------------------------------------------------------------
// Command classification + registry builder
// ---------------------------------------------------------------------------

/// Map command slug → (CommandCategory, dispatch_target agent slug)
fn classify_command(slug: &str) -> (CommandCategory, String) {
    match slug {
        // Build
        "next-batch" | "parallel-build" | "scaffold" | "seed" | "batch-status" =>
            (CommandCategory::Build, slug.to_string()),
        // Persona
        "wake" | "council" | "decide" | "customer-lens" =>
            (CommandCategory::Persona, slug.to_string()),
        // Quality
        "gate" => (CommandCategory::Quality, "gate-runner".into()),
        "adversarial" => (CommandCategory::Quality, "nyx".into()),
        "audit" => (CommandCategory::Quality, "full-audit".into()),
        "consistency" => (CommandCategory::Quality, "meridian".into()),
        "regression" => (CommandCategory::Quality, "sentinel".into()),
        "verify" | "findings" => (CommandCategory::Quality, slug.to_string()),
        // Analysis
        "impact" => (CommandCategory::Analysis, "compass".into()),
        "perf" => (CommandCategory::Analysis, "kiln".into()),
        "tech-debt" | "deps" | "env-check" =>
            (CommandCategory::Analysis, slug.to_string()),
        // Reporting
        "changelog" | "demo" | "postmortem" | "retro" |
        "onboard" | "api-docs" | "launch-check" =>
            (CommandCategory::Reporting, slug.to_string()),
        // Operations
        "launch" => (CommandCategory::Operations, "launch-sequence".into()),
        "red-team" => (CommandCategory::Operations, "wraith".into()),
        // Fallback
        _ => (CommandCategory::Build, slug.to_string()),
    }
}

/// Resolve availability check for a command based on its requirements.
fn availability_for_command(slug: &str) -> Option<AvailabilityCheck> {
    match slug {
        // Commands requiring git repo state
        "adversarial" | "verify" | "changelog" => Some(AvailabilityCheck::GitChanges),
        // Commands requiring MCP/external connectivity
        "gate" | "audit" | "regression" | "consistency" =>
            Some(AvailabilityCheck::McpConnected("provider".into())),
        "red-team" => Some(AvailabilityCheck::McpConnected("provider".into())),
        // Commands requiring a running dev server
        "perf" => Some(AvailabilityCheck::ServerRunning),
        // Commands that work without preconditions
        _ => Some(AvailabilityCheck::Always),
    }
}

/// Resolve aliases for known commands.
fn aliases_for_command(slug: &str) -> Vec<String> {
    match slug {
        "next-batch" => vec!["nb".into()],
        "batch-status" => vec!["bs".into()],
        "gate" => vec!["g".into()],
        "red-team" => vec!["rt".into()],
        "council" => vec!["c".into()],
        "decide" => vec!["d".into()],
        "findings" => vec!["f".into()],
        "adversarial" => vec!["adv".into()],
        "launch-check" => vec!["lc".into()],
        "help" => vec!["h".into(), "?".into()],
        "status" => vec!["s".into()],
        _ => Vec::new(),
    }
}

/// Build CommandDefs from already-scanned command entries in the AgentRegistry,
/// plus hardcoded built-in commands. Also populates the HandlerStore with
/// lazy handlers for each command.
fn build_command_registry(
    entries: &HashMap<String, RegistryEntry>,
    handler_store: &mut HandlerStore,
) -> CommandRegistry {
    let mut commands = Vec::new();

    // Populate from scanned command files via dual adapter (YAML source)
    for (slug, entry) in entries {
        if entry.category != AgentCategory::Command {
            continue;
        }

        commands.push(CommandDef::from_yaml(slug, entry));

        // Register lazy handler — file content loaded on first dispatch
        handler_store.register(slug.clone(), entry.file_path.clone());
    }

    // Built-in commands via register_builtin! macro (skip IPC, in-process)
    register_builtin!(commands, "help", "Show available commands and usage", Operations);
    register_builtin!(commands, "status", "Show current build state, context usage, and active agents", Build);
    register_builtin!(commands, "cancel", "Cancel a running agent by dispatch ID", Operations);

    commands.sort_by(|a, b| a.slug.cmp(&b.slug));
    CommandRegistry { commands }
}

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------

struct ParsedFrontmatter {
    name: String,
    description: String,
    model: Option<String>,
    tools: Vec<String>,
    user_invocable: bool,
    reasoning_effort: Option<ReasoningEffort>,
    model_class: Option<ModelClass>,
    routing_role: Option<RoutingRole>,
}

fn parse_frontmatter(content: &str) -> Option<ParsedFrontmatter> {
    let content = content.trim();
    if !content.starts_with("---") {
        return None;
    }
    let rest = &content[3..];
    let end = rest.find("---")?;
    let fm_block = &rest[..end];

    let mut name = None;
    let mut description = None;
    let mut model = None;
    let mut tools = Vec::new();
    let mut user_invocable = false;
    let mut reasoning_effort = None;
    let mut model_class = None;
    let mut routing_role = None;

    for line in fm_block.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("name:") {
            name = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
        } else if let Some(val) = line.strip_prefix("description:") {
            description = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
        } else if let Some(val) = line.strip_prefix("model:") {
            let v = val.trim().trim_matches('"').trim_matches('\'').to_string();
            if !v.is_empty() {
                model = Some(v);
            }
        } else if let Some(val) = line.strip_prefix("tools:") {
            tools = val
                .trim()
                .split(',')
                .map(|t| t.trim().trim_matches('"').trim_matches('\'').to_string())
                .filter(|t| !t.is_empty())
                .collect();
        } else if let Some(val) = line.strip_prefix("user_invocable:") {
            user_invocable = val.trim() == "true";
        } else if let Some(val) = line.strip_prefix("reasoning_effort:") {
            reasoning_effort = match val.trim().to_lowercase().as_str() {
                "low" => Some(ReasoningEffort::Low),
                "high" => Some(ReasoningEffort::High),
                _ => Some(ReasoningEffort::Medium),
            };
        } else if let Some(val) = line.strip_prefix("model_class:") {
            model_class = match val.trim().to_lowercase().as_str() {
                "frontier" => Some(ModelClass::Frontier),
                "fast" => Some(ModelClass::Fast),
                _ => Some(ModelClass::Standard),
            };
        } else if let Some(val) = line.strip_prefix("routing_role:") {
            routing_role = match val.trim().to_lowercase().as_str() {
                "leader" => Some(RoutingRole::Leader),
                "executor" => Some(RoutingRole::Executor),
                _ => Some(RoutingRole::Specialist),
            };
        }
    }

    Some(ParsedFrontmatter {
        name: name.unwrap_or_default(),
        description: description.unwrap_or_default(),
        model,
        tools,
        user_invocable,
        reasoning_effort,
        model_class,
        routing_role,
    })
}

/// Extract the markdown body (everything after frontmatter).
fn extract_body(content: &str) -> String {
    let content = content.trim();
    if !content.starts_with("---") {
        return content.to_string();
    }
    let rest = &content[3..];
    if let Some(end) = rest.find("---") {
        rest[end + 3..].trim().to_string()
    } else {
        content.to_string()
    }
}

// ---------------------------------------------------------------------------
// Directory scanning
// ---------------------------------------------------------------------------

/// Derive sub-agent parent from filename prefix convention.
/// `mara-mobile.md` → parent `mara`, `beacon-error-watch.md` → parent `beacon`.
fn derive_parent(slug: &str) -> Option<String> {
    // Try longest known parent first (e.g., "decision-council" before "decision")
    // Check persona slugs, then intelligence slugs
    let all_parents: Vec<&str> = PERSONA_SLUGS
        .iter()
        .chain(INTELLIGENCE_SLUGS.iter())
        .chain(ORCHESTRATOR_SLUGS.iter())
        .copied()
        .collect();

    // Sort by length descending to match longest prefix first
    let mut sorted = all_parents;
    sorted.sort_by(|a, b| b.len().cmp(&a.len()));

    for parent in sorted {
        if slug.starts_with(parent) && slug.len() > parent.len() {
            let remainder = &slug[parent.len()..];
            if remainder.starts_with('-') {
                return Some(parent.to_string());
            }
        }
    }
    None
}

fn scan_directory(
    dir: &Path,
    category: AgentCategory,
    cwd: &Path,
) -> Vec<RegistryEntry> {
    let mut entries = Vec::new();

    let read_dir = match fs::read_dir(dir) {
        Ok(rd) => rd,
        Err(_) => return entries,
    };

    for entry in read_dir.flatten() {
        let path = entry.path();

        // Skip directories
        if path.is_dir() {
            continue;
        }

        // Only .md files
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }

        // Path traversal guard
        let canonical = match path.canonicalize() {
            Ok(c) => c,
            Err(_) => continue,
        };
        let canonical_cwd = match cwd.canonicalize() {
            Ok(c) => c,
            Err(_) => continue,
        };
        if !canonical.starts_with(&canonical_cwd) {
            continue;
        }

        let slug = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        let content = match fs::read_to_string(&canonical) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let fm = parse_frontmatter(&content);

        // Determine actual category for agents/ entries
        let resolved_category = match &category {
            AgentCategory::SubAgent => AgentCategory::SubAgent,
            AgentCategory::Command => AgentCategory::Command,
            _ => classify_agent(&slug),
        };

        // Parent derivation for sub-agents
        let parent_agent = if resolved_category == AgentCategory::SubAgent {
            derive_parent(&slug)
        } else {
            None
        };

        let entry = RegistryEntry {
            name: fm.as_ref()
                .map(|f| f.name.clone())
                .filter(|n| !n.is_empty())
                .unwrap_or_else(|| slug.clone()),
            description: fm.as_ref()
                .map(|f| f.description.clone())
                .unwrap_or_default(),
            model: fm.as_ref().and_then(|f| f.model.clone()),
            tools: fm.as_ref()
                .map(|f| f.tools.clone())
                .unwrap_or_default(),
            user_invocable: fm.as_ref()
                .map(|f| f.user_invocable)
                .unwrap_or(false),
            reasoning_effort: fm.as_ref()
                .and_then(|f| f.reasoning_effort)
                .unwrap_or_default(),
            model_class: fm.as_ref()
                .and_then(|f| f.model_class)
                .unwrap_or_default(),
            routing_role: fm.as_ref()
                .and_then(|f| f.routing_role)
                .unwrap_or_default(),
            category: resolved_category,
            parent_agent,
            file_path: canonical.to_string_lossy().to_string(),
            slug,
        };

        entries.push(entry);
    }

    entries
}

/// Full scan of all agent directories. Returns populated AgentRegistry.
pub fn scan_agents(base_path: &Path) -> AgentRegistry {
    let agents_dir = base_path.join("agents");
    let sub_agents_dir = agents_dir.join("sub-agents");
    let commands_dir = base_path.join("commands");

    let mut all_entries = Vec::new();

    // Scan agents/ (Persona/Intelligence/Orchestrator/Utility — classified per slug)
    all_entries.extend(scan_directory(&agents_dir, AgentCategory::Utility, base_path));

    // Scan agents/sub-agents/
    all_entries.extend(scan_directory(&sub_agents_dir, AgentCategory::SubAgent, base_path));

    // Scan commands/
    all_entries.extend(scan_directory(&commands_dir, AgentCategory::Command, base_path));

    let mut entries = HashMap::new();
    for entry in all_entries {
        if let Some(existing) = entries.get(&entry.slug) {
            let existing: &RegistryEntry = existing;
            eprintln!(
                "[registry] WARNING: slug collision '{}' — '{}' ({:?}) overwrites '{}' ({:?})",
                entry.slug, entry.file_path, entry.category,
                existing.file_path, existing.category
            );
        }
        entries.insert(entry.slug.clone(), entry);
    }

    let mut handler_store = HandlerStore::default();
    let command_registry = build_command_registry(&entries, &mut handler_store);

    AgentRegistry {
        entries,
        orchestrator_members: build_orchestrator_members(),
        command_registry,
        handler_store,
        initialized: true,
    }
}

// ---------------------------------------------------------------------------
// Managed state wrapper
// ---------------------------------------------------------------------------

pub type RegistryState = Arc<Mutex<AgentRegistry>>;

/// Resolve the repo base path from CWD.
fn repo_base_path() -> PathBuf {
    std::env::current_dir().unwrap_or_default()
}

/// Lazy-init: if registry is empty, run a full scan.
async fn ensure_initialized(registry: &Mutex<AgentRegistry>) {
    let mut reg = registry.lock().await;
    if !reg.initialized {
        let base = repo_base_path();
        *reg = scan_agents(&base);
    }
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// Returns the full agent registry. Lazy-initializes on first call.
#[tauri::command]
pub async fn get_agent_registry(
    registry: tauri::State<'_, RegistryState>,
) -> Result<Vec<RegistryEntry>, String> {
    ensure_initialized(&registry).await;
    let reg = registry.lock().await;
    let mut entries: Vec<RegistryEntry> = reg.entries.values().cloned().collect();
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(entries)
}

/// Returns the full markdown body (after frontmatter) for a given agent slug.
/// Used for system prompt construction. Clones file_path out of lock before I/O.
#[tauri::command]
pub async fn get_agent_content(
    slug: String,
    registry: tauri::State<'_, RegistryState>,
) -> Result<String, String> {
    ensure_initialized(&registry).await;

    // Clone path out of lock — never hold mutex during file I/O
    let file_path = {
        let reg = registry.lock().await;
        let entry = reg.entries.get(&slug)
            .ok_or_else(|| format!("Agent '{}' not found in registry", slug))?;
        entry.file_path.clone()
    }; // lock released here

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read agent file: {}", e))?;

    Ok(extract_body(&content))
}

/// Force a full rescan of the registry. Called when agent files change
/// or connectivity status changes.
#[tauri::command]
pub async fn refresh_registry(
    registry: tauri::State<'_, RegistryState>,
) -> Result<usize, String> {
    let base = repo_base_path();
    let new_reg = scan_agents(&base);
    let count = new_reg.entries.len();
    let mut reg = registry.lock().await;
    *reg = new_reg;
    Ok(count)
}

/// Returns all slash commands with their current availability state.
#[tauri::command]
pub async fn get_command_registry(
    registry: tauri::State<'_, RegistryState>,
) -> Result<Vec<CommandDef>, String> {
    ensure_initialized(&registry).await;
    let reg = registry.lock().await;
    Ok(reg.command_registry.commands.clone())
}

/// Built-in command slugs handled in-process (not via handler store).
const BUILTIN_SLUGS: &[&str] = &["help", "status", "cancel"];

/// Dispatch a command by slug via lazy handler. Handler is loaded from
/// the source file on first invocation and cached for subsequent calls.
/// Built-in commands are routed in-process without handler store lookup.
#[tauri::command]
pub async fn dispatch_command(
    slug: String,
    registry: tauri::State<'_, RegistryState>,
) -> Result<String, String> {
    ensure_initialized(&registry).await;

    // Built-in commands are handled in-process — no handler store lookup
    if BUILTIN_SLUGS.contains(&slug.as_str()) {
        return Ok(format!("__builtin:{}", slug));
    }

    // Clone handler Arc out of lock — OnceLock inside is thread-safe
    let handler = {
        let reg = registry.lock().await;
        reg.handler_store.get_handler(&slug)
            .ok_or_else(|| format!("No handler registered for command '{}'", slug))?
    }; // lock released here

    handler.get_or_init()
}

// ---------------------------------------------------------------------------
// Availability checking
// ---------------------------------------------------------------------------

/// Check whether an availability condition is currently met.
/// Queries HealthCheckManager for MCP connectivity, checks env vars, checks git.
pub async fn check_availability(
    check: &AvailabilityCheck,
    health_cache: &tokio::sync::Mutex<HashMap<String, crate::commands::connectivity::ServiceHealth>>,
) -> bool {
    match check {
        AvailabilityCheck::Always => true,
        AvailabilityCheck::GitChanges => {
            // Check if git repo has uncommitted changes
            std::process::Command::new("git")
                .args(["status", "--porcelain"])
                .output()
                .map(|out| !out.stdout.is_empty())
                .unwrap_or(false)
        }
        AvailabilityCheck::McpConnected(service) => {
            let cache = health_cache.lock().await;
            cache.get(service.as_str())
                .map(|h| h.status == crate::commands::connectivity::ServiceStatus::Healthy
                    || h.status == crate::commands::connectivity::ServiceStatus::Degraded)
                .unwrap_or(false)
        }
        AvailabilityCheck::EnvVarSet(var) => {
            std::env::var(var).is_ok()
        }
        AvailabilityCheck::ServerRunning => {
            // Check if any dev server is running (by checking devserver state)
            // Lightweight check — just sees if the port detection env hint exists
            std::env::var("FORGE_DEV_SERVER_PORT").is_ok()
        }
    }
}

// ---------------------------------------------------------------------------
// Palette action resolution
// ---------------------------------------------------------------------------

/// Map AgentCategory to PaletteActionType for correct frontend rendering.
fn action_type_for_category(cat: &AgentCategory) -> PaletteActionType {
    match cat {
        AgentCategory::Orchestrator => PaletteActionType::Orchestrator,
        AgentCategory::Command => PaletteActionType::Command,
        _ => PaletteActionType::SubAgent,
    }
}

/// Resolve available actions for a set of selected persona slugs.
/// Returns individual actions per persona + matched orchestrators.
/// Clones data out of registry lock before doing async availability checks.
#[tauri::command]
pub async fn get_palette_actions(
    selected_slugs: Vec<String>,
    registry: tauri::State<'_, RegistryState>,
    health_manager: tauri::State<'_, crate::commands::connectivity::HealthCheckManager>,
) -> Result<PaletteResponse, String> {
    ensure_initialized(&registry).await;

    // Phase 1: Clone all needed data out of the registry lock
    let (persona_data, orchestrator_data, command_data) = {
        let reg = registry.lock().await;

        // Collect persona + sub-agent data for selected slugs
        let mut persona_data: Vec<(String, String, String, AgentCategory)> = Vec::new();
        for slug in &selected_slugs {
            if let Some(entry) = reg.entries.get(slug.as_str()) {
                persona_data.push((
                    slug.clone(), entry.name.clone(),
                    entry.description.clone(), entry.category.clone(),
                ));
                // Sub-agents
                for e in reg.entries.values() {
                    if e.parent_agent.as_deref() == Some(slug.as_str()) {
                        persona_data.push((
                            e.slug.clone(), e.name.clone(),
                            e.description.clone(), e.category.clone(),
                        ));
                    }
                }
            }
        }

        // Collect orchestrator matches
        let selected_set: std::collections::HashSet<&str> =
            selected_slugs.iter().map(|s| s.as_str()).collect();
        let mut orchestrator_data: Vec<(String, String, String)> = Vec::new();
        for (orch_slug, members) in &reg.orchestrator_members {
            let all_present = members.iter().all(|m| selected_set.contains(m.as_str()));
            if all_present {
                if let Some(entry) = reg.entries.get(orch_slug.as_str()) {
                    orchestrator_data.push((
                        orch_slug.clone(), entry.name.clone(), entry.description.clone(),
                    ));
                }
            }
        }

        // Clone command data for availability checking outside the lock
        let command_data: Vec<(String, String, String, String, Option<AvailabilityCheck>)> =
            reg.command_registry.commands.iter().map(|cmd| (
                cmd.slug.clone(), cmd.name.clone(),
                cmd.description.clone(), cmd.dispatch_target.clone(),
                cmd.available_when.clone(),
            )).collect();

        (persona_data, orchestrator_data, command_data)
    }; // registry lock released here

    // Phase 2: Build response without holding any locks
    let mut individual_actions: Vec<PaletteAction> = persona_data.into_iter()
        .map(|(slug, name, desc, cat)| PaletteAction {
            dispatch_target_slug: slug.clone(),
            action_type: action_type_for_category(&cat),
            slug, name, description: desc,
        })
        .collect();

    let orchestrator_actions: Vec<PaletteAction> = orchestrator_data.into_iter()
        .map(|(slug, name, desc)| PaletteAction {
            dispatch_target_slug: slug.clone(),
            action_type: PaletteActionType::Orchestrator,
            slug, name, description: desc,
        })
        .collect();

    // Phase 3: Availability checks (async, no locks held)
    for (slug, name, desc, target, check) in command_data {
        if let Some(ref check) = check {
            let available = check_availability(check, &health_manager.cache).await;
            if !available {
                continue;
            }
        }
        individual_actions.push(PaletteAction {
            slug, name, description: desc,
            action_type: PaletteActionType::Command,
            dispatch_target_slug: target,
        });
    }

    Ok(PaletteResponse {
        individual_actions,
        orchestrator_actions,
    })
}

// ---------------------------------------------------------------------------
// Smart Review routing
// ---------------------------------------------------------------------------

/// Static routing table: file patterns → persona slugs.
struct RouteRule {
    /// Glob-like patterns (checked via simple contains/extension match).
    patterns: &'static [&'static str],
    /// Persona slugs to assign when matched.
    personas: &'static [&'static str],
    /// If true, match against full path. If false, match against filename only.
    match_path: bool,
}

const SMART_REVIEW_ROUTES: &[RouteRule] = &[
    RouteRule { patterns: &[".rs"], personas: &["kehinde"], match_path: false },
    RouteRule { patterns: &["src-tauri/"], personas: &["kehinde"], match_path: true },
    RouteRule { patterns: &[".tsx", ".css", ".html"], personas: &["mara", "riven"], match_path: false },
    RouteRule { patterns: &[".sql"], personas: &["tanaka", "kehinde"], match_path: false },
    RouteRule { patterns: &["migrations/"], personas: &["tanaka", "kehinde"], match_path: true },
    RouteRule { patterns: &["auth", "permission", "rls"], personas: &["tanaka"], match_path: true },
    RouteRule { patterns: &["price", "rate", "payment"], personas: &["vane"], match_path: true },
    RouteRule { patterns: &["tos", "privacy", "consent"], personas: &["voss"], match_path: true },
    // Specs, ADL, and markdown docs → Pierce
    RouteRule { patterns: &["specs/", "adl/", "ADL"], personas: &["pierce"], match_path: true },
    RouteRule { patterns: &[".md"], personas: &["pierce"], match_path: false },
];

/// Parse file paths from a diff summary and map to persona slugs via routing table.
#[tauri::command]
pub async fn smart_review_routing(
    diff_summary: String,
) -> Result<Vec<String>, String> {
    let mut matched: std::collections::HashSet<String> = std::collections::HashSet::new();

    // Parse file paths from diff summary (one per line, or from git diff --stat format)
    for line in diff_summary.lines() {
        let path = line.trim();
        // Handle git diff --stat format: "file.rs | 5 ++-"
        let path = path.split('|').next().unwrap_or(path).trim();
        if path.is_empty() {
            continue;
        }

        for rule in SMART_REVIEW_ROUTES {
            // match_path: true → match against full path (contains)
            // match_path: false → match against filename only (ends_with)
            let target = if rule.match_path {
                path
            } else {
                path.rsplit('/').next().unwrap_or(path)
            };
            for pattern in rule.patterns {
                let matches = if rule.match_path {
                    target.contains(pattern)
                } else {
                    target.ends_with(pattern)
                };
                if matches {
                    for persona in rule.personas {
                        matched.insert(persona.to_string());
                    }
                }
            }
        }
    }

    let mut result: Vec<String> = matched.into_iter().collect();
    result.sort();
    Ok(result)
}
