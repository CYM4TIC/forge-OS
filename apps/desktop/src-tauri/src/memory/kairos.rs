//! KairosEngine — the first ContextEngine implementation.
//!
//! Wraps existing KAIROS memory subsystems (logs, topics, dream, index)
//! behind the ContextEngine trait. No behavioral changes — this is a
//! structural extraction to make memory management pluggable.
//!
//! Future engines (per-persona context, LightRAG-backed, project-scoped)
//! implement the same trait without touching KAIROS internals.

use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

use super::engine::{
    AssembledContext, BootstrapParams, CompactParams, CompactResult, ContextEngine, IngestResult,
    MaintenanceParams, MaintenanceResult, MemoryEntry, SpawnParams, SpawnPreparation,
    SubagentEndParams, TokenBudget, TurnParams,
};
use super::types::MemoryType;
use super::{dream, index, logs, topics};

/// KairosEngine — wraps the KAIROS memory system behind ContextEngine.
///
/// Holds a shared reference to the SQLite connection (same one used by
/// Tauri commands). All operations go through existing KAIROS functions.
pub struct KairosEngine {
    /// Shared database connection
    conn: Arc<Mutex<Connection>>,
    /// Active persona for this session
    persona_id: Option<String>,
    /// Active project scope (None = all projects)
    project_id: Option<String>,
    /// Session ID
    session_id: Option<String>,
    /// Whether bootstrap has been called
    is_bootstrapped: bool,
}

impl KairosEngine {
    /// Create a new KairosEngine with a shared database connection.
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self {
            conn,
            persona_id: None,
            project_id: None,
            session_id: None,
            is_bootstrapped: false,
        }
    }

    /// Get current persona ID or error if not bootstrapped.
    fn persona(&self) -> Result<&str, String> {
        self.persona_id
            .as_deref()
            .ok_or_else(|| "KairosEngine not bootstrapped — call bootstrap() first".to_string())
    }
}

// Safety: KairosEngine is Send + Sync because:
// - Arc<Mutex<Connection>> is Send + Sync
// - All other fields are simple owned types
unsafe impl Send for KairosEngine {}
unsafe impl Sync for KairosEngine {}

impl ContextEngine for KairosEngine {
    fn bootstrap(&mut self, params: BootstrapParams) -> Result<(), String> {
        self.persona_id = Some(params.persona_id);
        self.project_id = params.project_id;
        self.session_id = Some(params.session_id);
        self.is_bootstrapped = true;
        Ok(())
    }

    fn maintain(&mut self, params: MaintenanceParams) -> Result<MaintenanceResult, String> {
        if !self.is_bootstrapped {
            return Ok(MaintenanceResult {
                entries_pruned: 0,
                index_regenerated: false,
                summary: Some("Engine not bootstrapped".to_string()),
            });
        }

        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        // Check if dream consolidation should run
        if params.force {
            match dream::check_and_run(&conn) {
                Ok(Some(result)) => {
                    return Ok(MaintenanceResult {
                        entries_pruned: result.topics_pruned,
                        index_regenerated: true,
                        summary: Some(format!(
                            "Dream consolidation: {} created, {} updated, {} pruned, {} logs processed",
                            result.topics_created,
                            result.topics_updated,
                            result.topics_pruned,
                            result.logs_processed
                        )),
                    });
                }
                Ok(None) => {}
                Err(e) => {
                    return Ok(MaintenanceResult {
                        entries_pruned: 0,
                        index_regenerated: false,
                        summary: Some(format!("Dream check failed: {}", e)),
                    });
                }
            }
        }

        Ok(MaintenanceResult {
            entries_pruned: 0,
            index_regenerated: false,
            summary: None,
        })
    }

    fn ingest(&mut self, entry: MemoryEntry) -> Result<IngestResult, String> {
        let memory_type = MemoryType::from_str(&entry.memory_type).ok_or_else(|| {
            format!(
                "Invalid memory_type: '{}'. Must be one of: user, feedback, project, reference",
                entry.memory_type
            )
        })?;

        let log_date = entry
            .log_date
            .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());

        let id = Uuid::new_v4().to_string();
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        logs::append_log(
            &conn,
            &id,
            &entry.persona_id,
            &memory_type,
            &entry.content,
            &log_date,
        )
        .map_err(|e| e.to_string())?;

        Ok(IngestResult {
            entry_id: id,
            was_merged: false,
        })
    }

    fn after_turn(&mut self, _params: TurnParams) -> Result<(), String> {
        // KAIROS doesn't need per-turn processing currently.
        // Future: could trigger incremental index updates or TTL checks.
        Ok(())
    }

    fn assemble(&self, budget: TokenBudget) -> Result<AssembledContext, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        // Generate the full memory index
        let full_index = index::generate_memory_index(&conn).map_err(|e| e.to_string())?;

        // Estimate token count (rough: 4 chars per token)
        let estimated_tokens = full_index.len() / 4;

        if estimated_tokens <= budget.max_tokens {
            // Fits within budget — return the full index
            return Ok(AssembledContext {
                content: full_index,
                token_count: estimated_tokens,
                included_types: vec![
                    "user".to_string(),
                    "feedback".to_string(),
                    "project".to_string(),
                    "reference".to_string(),
                ],
                truncated_types: vec![],
            });
        }

        // Over budget — assemble by priority, truncating as needed
        let mut content_parts: Vec<String> = Vec::new();
        let mut total_tokens = 0usize;
        let mut included: Vec<String> = Vec::new();
        let mut truncated: Vec<String> = Vec::new();

        let priorities = if budget.priorities.is_empty() {
            vec![
                "feedback".to_string(),
                "project".to_string(),
                "user".to_string(),
                "reference".to_string(),
            ]
        } else {
            budget.priorities.clone()
        };

        for memory_type_str in &priorities {
            let memory_type = match MemoryType::from_str(memory_type_str) {
                Some(mt) => mt,
                None => continue,
            };

            let type_topics =
                topics::list_topics(&conn, Some(&memory_type), false).map_err(|e| e.to_string())?;

            if type_topics.is_empty() {
                continue;
            }

            let mut type_block = format!("## {}\n", capitalize(memory_type_str));
            for topic in &type_topics {
                let line = format!("- **{}** — {}\n", topic.name, topic.description);
                let line_tokens = line.len() / 4;

                if total_tokens + line_tokens > budget.max_tokens {
                    truncated.push(memory_type_str.clone());
                    break;
                }

                type_block.push_str(&line);
                total_tokens += line_tokens;
            }

            content_parts.push(type_block);
            included.push(memory_type_str.clone());
        }

        Ok(AssembledContext {
            content: content_parts.join("\n"),
            token_count: total_tokens,
            included_types: included,
            truncated_types: truncated,
        })
    }

    fn compact(&mut self, _params: CompactParams) -> Result<CompactResult, String> {
        // Compaction is handled by the compact module, not KAIROS directly.
        // This method exists for engines that manage their own compaction.
        // KAIROS delegates to compact::CompactionEngine externally.
        Ok(CompactResult {
            summary: String::new(),
            token_count: 0,
            entries_compacted: 0,
        })
    }

    fn prepare_subagent_spawn(&self, params: SpawnParams) -> Result<SpawnPreparation, String> {
        // Assemble a focused context block for the spawning agent
        let budget = TokenBudget {
            max_tokens: params.token_budget,
            priorities: vec![
                "feedback".to_string(),
                "project".to_string(),
            ],
        };

        let assembled = self.assemble(budget)?;

        let context_block = if let Some(task) = &params.task_description {
            format!(
                "## Memory Context for {}\nTask: {}\n\n{}",
                params.agent_slug, task, assembled.content
            )
        } else {
            format!(
                "## Memory Context for {}\n\n{}",
                params.agent_slug, assembled.content
            )
        };

        let token_count = context_block.len() / 4;

        Ok(SpawnPreparation {
            context_block,
            token_count,
            included_types: assembled.included_types,
        })
    }

    fn on_subagent_ended(&mut self, params: SubagentEndParams) -> Result<(), String> {
        // Ingest any findings as memory entries
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let log_date = chrono::Utc::now().format("%Y-%m-%d").to_string();

        for finding in &params.findings {
            let id = Uuid::new_v4().to_string();
            let content = format!(
                "[{}] {}: {}",
                params.dispatch_id, params.agent_slug, finding
            );

            logs::append_log(
                &conn,
                &id,
                &params.agent_slug,
                &MemoryType::Project,
                &content,
                &log_date,
            )
            .map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    fn dispose(&mut self) -> Result<(), String> {
        self.is_bootstrapped = false;
        self.persona_id = None;
        self.project_id = None;
        self.session_id = None;
        Ok(())
    }

    fn name(&self) -> &str {
        "kairos"
    }

    fn generate_index(&self) -> Result<String, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        index::generate_memory_index(&conn).map_err(|e| e.to_string())
    }
}

fn capitalize(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
    }
}
