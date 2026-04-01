//! Orphaned tool pair sanitization.
//!
//! After context compression removes middle messages, tool_call/tool_result
//! pairs can become orphaned (a call without its result, or a result without
//! its call). This causes API rejection from mismatched IDs.
//!
//! This module detects and repairs orphaned pairs:
//! - Orphaned tool_results (no matching call) → removed
//! - Orphaned tool_calls (no matching result) → stub result inserted

use serde::{Deserialize, Serialize};

/// A message in the compressed conversation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressedMessage {
    pub role: String,
    pub content: String,
    /// Optional tool_call ID (present on assistant messages with tool calls)
    pub tool_call_id: Option<String>,
    /// Whether this is a tool_result message
    pub is_tool_result: bool,
}

/// Result of sanitization.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SanitizeResult {
    /// Messages after sanitization
    pub messages: Vec<CompressedMessage>,
    /// Number of orphaned results removed
    pub results_removed: u32,
    /// Number of stub results inserted
    pub stubs_inserted: u32,
}

/// Sanitize a compressed message sequence for orphaned tool pairs.
///
/// Scans for:
/// 1. tool_result messages whose tool_call_id doesn't match any preceding tool_call → remove
/// 2. tool_call messages whose tool_call_id doesn't have a following tool_result → insert stub
pub fn sanitize_tool_pairs(messages: &[CompressedMessage]) -> SanitizeResult {
    // Collect all tool_call IDs (from assistant messages)
    let mut call_ids: Vec<String> = Vec::new();
    // Collect all tool_result IDs
    let mut result_ids: Vec<String> = Vec::new();

    for msg in messages {
        if let Some(ref id) = msg.tool_call_id {
            if msg.is_tool_result {
                result_ids.push(id.clone());
            } else {
                call_ids.push(id.clone());
            }
        }
    }

    let mut sanitized: Vec<CompressedMessage> = Vec::new();
    let mut results_removed = 0u32;
    let mut stubs_inserted = 0u32;

    // Pass 1: Remove orphaned results (results without matching calls)
    for msg in messages {
        if msg.is_tool_result {
            if let Some(ref id) = msg.tool_call_id {
                if !call_ids.contains(id) {
                    results_removed += 1;
                    continue; // Skip orphaned result
                }
            }
        }
        sanitized.push(msg.clone());
    }

    // Pass 2: Insert stubs for orphaned calls (calls without matching results)
    let mut final_messages: Vec<CompressedMessage> = Vec::new();
    let sanitized_result_ids: Vec<String> = sanitized
        .iter()
        .filter(|m| m.is_tool_result)
        .filter_map(|m| m.tool_call_id.clone())
        .collect();

    for msg in &sanitized {
        final_messages.push(msg.clone());

        // After a tool_call without a matching result, insert a stub
        if !msg.is_tool_result {
            if let Some(ref id) = msg.tool_call_id {
                if !sanitized_result_ids.contains(id) {
                    final_messages.push(CompressedMessage {
                        role: "tool".to_string(),
                        content: "[Result removed during context compression]".to_string(),
                        tool_call_id: Some(id.clone()),
                        is_tool_result: true,
                    });
                    stubs_inserted += 1;
                }
            }
        }
    }

    SanitizeResult {
        messages: final_messages,
        results_removed,
        stubs_inserted,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn msg(role: &str, content: &str, tool_id: Option<&str>, is_result: bool) -> CompressedMessage {
        CompressedMessage {
            role: role.to_string(),
            content: content.to_string(),
            tool_call_id: tool_id.map(|s| s.to_string()),
            is_tool_result: is_result,
        }
    }

    #[test]
    fn test_no_orphans() {
        let messages = vec![
            msg("user", "hello", None, false),
            msg("assistant", "calling tool", Some("tc-1"), false),
            msg("tool", "result here", Some("tc-1"), true),
            msg("assistant", "done", None, false),
        ];
        let result = sanitize_tool_pairs(&messages);
        assert_eq!(result.results_removed, 0);
        assert_eq!(result.stubs_inserted, 0);
        assert_eq!(result.messages.len(), 4);
    }

    #[test]
    fn test_orphaned_result_removed() {
        let messages = vec![
            msg("user", "hello", None, false),
            // Result without matching call
            msg("tool", "orphaned result", Some("tc-missing"), true),
            msg("assistant", "done", None, false),
        ];
        let result = sanitize_tool_pairs(&messages);
        assert_eq!(result.results_removed, 1);
        assert_eq!(result.messages.len(), 2); // orphaned result removed
    }

    #[test]
    fn test_orphaned_call_gets_stub() {
        let messages = vec![
            msg("user", "hello", None, false),
            msg("assistant", "calling tool", Some("tc-1"), false),
            // No matching result for tc-1
            msg("assistant", "done", None, false),
        ];
        let result = sanitize_tool_pairs(&messages);
        assert_eq!(result.stubs_inserted, 1);
        assert_eq!(result.messages.len(), 4); // stub inserted
        assert!(result.messages[2].is_tool_result);
        assert_eq!(result.messages[2].tool_call_id.as_deref(), Some("tc-1"));
    }
}
