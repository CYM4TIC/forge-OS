pub mod counter;
pub mod threshold;
pub mod summary;
pub mod restore;

use crate::database::Database;
use self::counter::TokenCounter;
use self::summary::{CompactionSummary, CompactionVariant};
use self::threshold::ThresholdStatus;

/// Constants for context management.
pub const POST_COMPACT_TOKEN_BUDGET: usize = 50_000;
pub const MAX_FILES_TO_RESTORE: usize = 5;
pub const MAX_TOKENS_PER_FILE: usize = 5_000;
pub const POST_COMPACT_SKILLS_TOKEN_BUDGET: usize = 25_000;
pub const MAX_COMPACTION_RETRIES: u32 = 2;

/// Default context window size (200K tokens — Claude Opus/Sonnet).
pub const DEFAULT_CONTEXT_WINDOW: usize = 200_000;

/// Threshold percentage (0.0 - 1.0) at which auto-compact triggers.
pub const AUTO_COMPACT_THRESHOLD: f64 = 0.85;

/// The auto-compact engine.
/// Monitors context usage and triggers compaction when threshold is reached.
pub struct CompactionEngine {
    counter: TokenCounter,
    context_window_size: usize,
}

impl CompactionEngine {
    pub fn new(context_window_size: Option<usize>) -> Self {
        Self {
            counter: TokenCounter::new(),
            context_window_size: context_window_size.unwrap_or(DEFAULT_CONTEXT_WINDOW),
        }
    }

    /// Get current context usage as a fraction (0.0 - 1.0).
    pub fn usage_fraction(&self, current_tokens: usize) -> f64 {
        current_tokens as f64 / self.context_window_size as f64
    }

    /// Check if we've crossed the auto-compact threshold.
    pub fn should_compact(&self, current_tokens: usize) -> bool {
        self.usage_fraction(current_tokens) >= AUTO_COMPACT_THRESHOLD
    }

    /// Get full threshold status for UI display.
    pub fn get_status(&self, current_tokens: usize) -> ThresholdStatus {
        let fraction = self.usage_fraction(current_tokens);
        ThresholdStatus {
            current_tokens,
            context_window_size: self.context_window_size,
            usage_fraction: fraction,
            should_compact: fraction >= AUTO_COMPACT_THRESHOLD,
            threshold: AUTO_COMPACT_THRESHOLD,
            zone: threshold::usage_zone(fraction),
        }
    }

    /// Count tokens in a text string.
    pub fn count_tokens(&self, text: &str) -> usize {
        self.counter.count(text)
    }

    /// Trigger compaction: generate a summary of the conversation,
    /// store it in SQLite, and return the summary for context restoration.
    pub fn compact(
        &self,
        session_id: &str,
        messages: &[crate::dispatch::types::AgentMessage],
        variant: CompactionVariant,
    ) -> Result<CompactionSummary, String> {
        // Build the conversation text for summarization
        let conversation = messages
            .iter()
            .map(|m| format!("[{}]: {}", m.role, m.content))
            .collect::<Vec<_>>()
            .join("\n\n");

        // Generate the 9-section summary prompt
        let summary_prompt = summary::build_summary_prompt(&conversation, &variant);

        // For now, we generate a structured summary locally.
        // In production, this dispatches to an LLM agent via AgentDispatcher.
        // The summary structure is prepared here; the actual LLM call
        // is handled by the Tauri command layer which has access to providers.
        let summary = CompactionSummary {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            variant: variant.clone(),
            prompt: summary_prompt,
            content: String::new(), // Filled by LLM response
            token_count: None,
        };

        Ok(summary)
    }

    /// Store a completed compaction summary in SQLite.
    pub fn store_summary(
        &self,
        summary: &CompactionSummary,
        db: &Database,
    ) -> Result<(), String> {
        let conn = db.conn.lock().map_err(|e| format!("DB lock: {}", e))?;
        let variant_str = match summary.variant {
            CompactionVariant::Base => "base",
            CompactionVariant::Partial => "partial",
            CompactionVariant::PartialUpTo => "partial_up_to",
        };

        conn.execute(
            "INSERT INTO session_summaries (id, session_id, summary_type, content, token_count) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                summary.id,
                summary.session_id,
                variant_str,
                summary.content,
                summary.token_count,
            ],
        ).map_err(|e| format!("Failed to store summary: {}", e))?;

        Ok(())
    }

    /// Get the most recent compaction summary for a session.
    pub fn get_last_summary(
        &self,
        session_id: &str,
        db: &Database,
    ) -> Result<Option<CompactionSummary>, String> {
        let conn = db.conn.lock().map_err(|e| format!("DB lock: {}", e))?;
        let mut stmt = conn
            .prepare(
                "SELECT id, session_id, summary_type, content, token_count
                 FROM session_summaries
                 WHERE session_id = ?1
                 ORDER BY created_at DESC
                 LIMIT 1",
            )
            .map_err(|e| format!("Prepare: {}", e))?;

        let rows = stmt
            .query_map(rusqlite::params![session_id], |row| {
                let variant_str: String = row.get(2)?;
                let variant = match variant_str.as_str() {
                    "partial" => CompactionVariant::Partial,
                    "partial_up_to" => CompactionVariant::PartialUpTo,
                    _ => CompactionVariant::Base,
                };
                Ok(CompactionSummary {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    variant,
                    prompt: String::new(),
                    content: row.get(3)?,
                    token_count: row.get(4)?,
                })
            })
            .map_err(|e| format!("Query: {}", e))?;

        let mut result = None;
        for row in rows {
            result = Some(row.map_err(|e| format!("Row: {}", e))?);
            break; // LIMIT 1
        }

        Ok(result)
    }
}
