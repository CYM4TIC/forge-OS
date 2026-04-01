use serde::{Deserialize, Serialize};
use tauri::State;

use crate::compact::CompactionEngine;
use crate::compact::summary::{CompactionSummary, CompactionVariant};
use crate::compact::threshold::ThresholdStatus;
use crate::database::Database;
use crate::dispatch::types::AgentMessage;

// ── Get context usage ──

#[derive(Debug, Deserialize)]
pub struct ContextUsageRequest {
    /// Current conversation content to count tokens for.
    pub content: String,
    /// Optional context window size override (defaults to 200K).
    pub context_window_size: Option<usize>,
}

#[tauri::command]
pub fn get_context_usage(request: ContextUsageRequest) -> Result<ThresholdStatus, String> {
    let engine = CompactionEngine::new(request.context_window_size);
    let token_count = engine.count_tokens(&request.content);
    Ok(engine.get_status(token_count))
}

// ── Trigger compact ──

#[derive(Debug, Deserialize)]
pub struct TriggerCompactRequest {
    /// Session to compact.
    pub session_id: String,
    /// Messages in the conversation.
    pub messages: Vec<AgentMessage>,
    /// Compaction variant.
    pub variant: Option<String>,
    /// Optional context window size override.
    pub context_window_size: Option<usize>,
}

#[derive(Debug, Serialize)]
pub struct TriggerCompactResponse {
    /// The summary ID (can be used to retrieve later).
    pub summary_id: String,
    /// The prompt to send to the LLM for summarization.
    pub summary_prompt: String,
    /// Token count of the conversation being compacted.
    pub conversation_tokens: usize,
}

#[tauri::command]
pub fn trigger_compact(
    _db: State<'_, Database>,
    request: TriggerCompactRequest,
) -> Result<TriggerCompactResponse, String> {
    // Guard: compact() generates a summary prompt but cannot execute it — LLM dispatch
    // is not yet wired into the compaction engine. Use store_compact_result() with an
    // externally-generated summary instead. LLM wiring is Phase 4+ work.
    let engine = CompactionEngine::new(request.context_window_size);

    let variant = match request.variant.as_deref() {
        Some("partial") => CompactionVariant::Partial,
        Some("partial_up_to") => CompactionVariant::PartialUpTo,
        _ => CompactionVariant::Base,
    };

    // Count conversation tokens
    let conversation_text: String = request
        .messages
        .iter()
        .map(|m| format!("{}: {}", m.role, m.content))
        .collect::<Vec<_>>()
        .join("\n");
    let conversation_tokens = engine.count_tokens(&conversation_text);

    // Generate compaction summary structure with prompt
    let summary = engine.compact(&request.session_id, &request.messages, variant)?;

    Ok(TriggerCompactResponse {
        summary_id: summary.id,
        summary_prompt: summary.prompt,
        conversation_tokens,
    })
}

// ── Store compact result ──

#[derive(Debug, Deserialize)]
pub struct StoreCompactRequest {
    /// Summary ID from trigger_compact.
    pub summary_id: String,
    /// Session ID.
    pub session_id: String,
    /// The LLM-generated summary content.
    pub content: String,
    /// Compaction variant used.
    pub variant: Option<String>,
}

#[tauri::command]
pub fn store_compact_result(
    db: State<'_, Database>,
    request: StoreCompactRequest,
) -> Result<(), String> {
    let engine = CompactionEngine::new(None);

    let variant = match request.variant.as_deref() {
        Some("partial") => CompactionVariant::Partial,
        Some("partial_up_to") => CompactionVariant::PartialUpTo,
        _ => CompactionVariant::Base,
    };

    let token_count = engine.count_tokens(&request.content) as i64;

    let summary = CompactionSummary {
        id: request.summary_id,
        session_id: request.session_id,
        variant,
        prompt: String::new(),
        content: request.content,
        token_count: Some(token_count),
    };

    engine.store_summary(&summary, &db)
}

// ── Get last summary ──

#[tauri::command]
pub fn get_last_summary(
    db: State<'_, Database>,
    session_id: String,
) -> Result<Option<CompactionSummary>, String> {
    let engine = CompactionEngine::new(None);
    engine.get_last_summary(&session_id, &db)
}
