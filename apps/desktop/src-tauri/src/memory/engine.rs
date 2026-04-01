//! ContextEngine trait — pluggable memory management interface.
//!
//! Inspired by OpenClaw's ContextEngine pattern. KAIROS implements this trait,
//! but future memory strategies (per-persona context assembly, project-specific
//! memory, LightRAG-backed) implement the same interface.
//!
//! The dispatch pipeline calls ContextEngine methods — never KAIROS directly.

use serde::{Deserialize, Serialize};

/// Parameters for bootstrapping a context engine at session start.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BootstrapParams {
    /// Which persona is active (e.g., "nyx", "pierce")
    pub persona_id: String,
    /// Optional project scope (limits memory to this project)
    pub project_id: Option<String>,
    /// Session ID for state tracking
    pub session_id: String,
}

/// Parameters for periodic maintenance (e.g., TTL expiry, index refresh).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceParams {
    /// Current token count in the conversation
    pub current_tokens: usize,
    /// Whether to force maintenance even if not due
    pub force: bool,
}

/// Result of a maintenance pass.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceResult {
    /// Number of entries pruned/expired
    pub entries_pruned: u32,
    /// Whether the memory index was regenerated
    pub index_regenerated: bool,
    /// Optional human-readable summary of what happened
    pub summary: Option<String>,
}

/// A single memory entry to ingest.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEntry {
    /// Which persona produced this entry
    pub persona_id: String,
    /// Memory type: user, feedback, project, reference
    pub memory_type: String,
    /// The content to store
    pub content: String,
    /// Optional date override (defaults to today)
    pub log_date: Option<String>,
}

/// Result of ingesting a memory entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IngestResult {
    /// ID of the stored entry
    pub entry_id: String,
    /// Whether this was a new entry or merged into existing
    pub was_merged: bool,
}

/// Parameters for post-turn processing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TurnParams {
    /// Session ID
    pub session_id: String,
    /// Current message count in session
    pub message_count: u32,
    /// Current token usage
    pub current_tokens: usize,
}

/// Token budget for context assembly.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenBudget {
    /// Maximum tokens to allocate for assembled context
    pub max_tokens: usize,
    /// Priority ordering: which memory types to include first
    pub priorities: Vec<String>,
}

/// Assembled context ready for injection into a prompt.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssembledContext {
    /// The context content (markdown string)
    pub content: String,
    /// Token count of the assembled content
    pub token_count: usize,
    /// Which memory types were included
    pub included_types: Vec<String>,
    /// Which memory types were truncated due to budget
    pub truncated_types: Vec<String>,
}

/// Parameters for compaction.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompactParams {
    /// Session ID
    pub session_id: String,
    /// Previous summary (for iterative compression)
    pub previous_summary: Option<String>,
    /// Maximum tokens for the compacted result
    pub target_tokens: usize,
}

/// Result of compaction.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompactResult {
    /// Compacted summary content
    pub summary: String,
    /// Token count of the summary
    pub token_count: usize,
    /// Number of entries that were compacted
    pub entries_compacted: u32,
}

/// Parameters for preparing subagent context.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnParams {
    /// Agent being spawned
    pub agent_slug: String,
    /// Token budget for the spawned agent's context
    pub token_budget: usize,
    /// What the agent needs context about
    pub task_description: Option<String>,
}

/// Prepared context for a subagent spawn.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnPreparation {
    /// Context block to inject into the subagent's prompt
    pub context_block: String,
    /// Token count of the context block
    pub token_count: usize,
    /// Memory types included in the context
    pub included_types: Vec<String>,
}

/// Parameters for post-subagent processing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubagentEndParams {
    /// Which agent finished
    pub agent_slug: String,
    /// The agent's dispatch ID
    pub dispatch_id: String,
    /// Key findings or learnings to absorb
    pub findings: Vec<String>,
}

/// The ContextEngine trait — pluggable memory management interface.
///
/// Every memory strategy implements this trait. The dispatch pipeline and
/// command layer call these methods instead of KAIROS functions directly.
///
/// Lifecycle:
/// 1. `bootstrap` — called once at session start
/// 2. `ingest` — called when new memory arrives
/// 3. `after_turn` — called after each conversation turn
/// 4. `maintain` — called periodically for cleanup
/// 5. `assemble` — called when building a prompt that needs memory context
/// 6. `compact` — called when context window needs compression
/// 7. `prepare_subagent_spawn` — called before dispatching an agent
/// 8. `on_subagent_ended` — called when a dispatched agent completes
/// 9. `dispose` — called at session end for cleanup
pub trait ContextEngine: Send + Sync {
    /// Initialize the engine for a session. Load relevant memory, set up indices.
    fn bootstrap(&mut self, params: BootstrapParams) -> Result<(), String>;

    /// Periodic maintenance: TTL expiry, index refresh, cleanup.
    fn maintain(&mut self, params: MaintenanceParams) -> Result<MaintenanceResult, String>;

    /// Ingest a new memory entry (from a persona's work during a session).
    fn ingest(&mut self, entry: MemoryEntry) -> Result<IngestResult, String>;

    /// Post-turn hook: update state after each conversation turn.
    fn after_turn(&mut self, params: TurnParams) -> Result<(), String>;

    /// Assemble context for prompt injection, respecting a token budget.
    fn assemble(&self, budget: TokenBudget) -> Result<AssembledContext, String>;

    /// Compact the context when the window is getting full.
    fn compact(&mut self, params: CompactParams) -> Result<CompactResult, String>;

    /// Prepare context for a subagent about to be spawned.
    fn prepare_subagent_spawn(&self, params: SpawnParams) -> Result<SpawnPreparation, String>;

    /// Process results from a completed subagent.
    fn on_subagent_ended(&mut self, params: SubagentEndParams) -> Result<(), String>;

    /// Cleanup at session end. Flush pending writes, close resources.
    fn dispose(&mut self) -> Result<(), String>;

    /// Human-readable name for this engine implementation.
    fn name(&self) -> &str;

    /// Generate the current memory index (MEMORY.md equivalent).
    fn generate_index(&self) -> Result<String, String>;
}
