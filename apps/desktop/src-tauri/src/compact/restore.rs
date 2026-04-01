use serde::{Deserialize, Serialize};

use super::{MAX_FILES_TO_RESTORE, MAX_TOKENS_PER_FILE};
use super::counter::TokenCounter;

/// A file selected for post-compaction context restoration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoredFile {
    /// Relative path from project root.
    pub path: String,
    /// File content (may be truncated to MAX_TOKENS_PER_FILE).
    pub content: String,
    /// Approximate token count of the restored content.
    pub token_count: usize,
    /// Whether the content was truncated.
    pub truncated: bool,
}

/// Determines which files should be restored after compaction.
/// Files are ranked by recency of access (most recently read/written first).
///
/// The post-compact context includes:
/// 1. The compaction summary (~POST_COMPACT_TOKEN_BUDGET)
/// 2. Top N most-recently-accessed files (each capped at MAX_TOKENS_PER_FILE)
///
/// This ensures the LLM can continue working without re-reading files
/// that were central to the conversation.
pub struct FileRestorer {
    counter: TokenCounter,
    max_files: usize,
    max_tokens_per_file: usize,
}

impl FileRestorer {
    pub fn new() -> Self {
        Self {
            counter: TokenCounter::new(),
            max_files: MAX_FILES_TO_RESTORE,
            max_tokens_per_file: MAX_TOKENS_PER_FILE,
        }
    }

    /// Select and prepare files for restoration.
    /// `accessed_files` should be ordered by most-recently-accessed first.
    /// Each entry is (path, content).
    pub fn select_files(&self, accessed_files: &[(String, String)]) -> Vec<RestoredFile> {
        accessed_files
            .iter()
            .take(self.max_files)
            .map(|(path, content)| {
                let token_count = self.counter.count(content);
                if token_count > self.max_tokens_per_file {
                    // Truncate to approximate token budget
                    let char_budget = self.max_tokens_per_file * 4; // ~4 chars per token
                    let truncated_content = if content.len() > char_budget {
                        let mut end = char_budget;
                        // Don't break in the middle of a multi-byte character
                        while !content.is_char_boundary(end) && end > 0 {
                            end -= 1;
                        }
                        format!(
                            "{}\n\n[... truncated at ~{} tokens — full file is ~{} tokens]",
                            &content[..end],
                            self.max_tokens_per_file,
                            token_count
                        )
                    } else {
                        content.clone()
                    };
                    let final_count = self.counter.count(&truncated_content);
                    RestoredFile {
                        path: path.clone(),
                        content: truncated_content,
                        token_count: final_count,
                        truncated: true,
                    }
                } else {
                    RestoredFile {
                        path: path.clone(),
                        content: content.clone(),
                        token_count,
                        truncated: false,
                    }
                }
            })
            .collect()
    }

    /// Format restored files as a context block for injection into the post-compact prompt.
    pub fn format_context_block(files: &[RestoredFile]) -> String {
        if files.is_empty() {
            return String::new();
        }

        let mut block = String::from("## Restored File Context\n\nThe following files were active in the conversation before compaction:\n\n");

        for file in files {
            block.push_str(&format!("### {}\n", file.path));
            if file.truncated {
                block.push_str("*(truncated to fit token budget)*\n");
            }
            block.push_str("```\n");
            block.push_str(&file.content);
            block.push_str("\n```\n\n");
        }

        block
    }

    /// Calculate total token budget consumed by restored files.
    pub fn total_tokens(files: &[RestoredFile]) -> usize {
        files.iter().map(|f| f.token_count).sum()
    }
}

impl Default for FileRestorer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_select_files_respects_limit() {
        let restorer = FileRestorer::new();
        let files: Vec<(String, String)> = (0..10)
            .map(|i| (format!("file_{}.rs", i), format!("content {}", i)))
            .collect();

        let selected = restorer.select_files(&files);
        assert_eq!(selected.len(), MAX_FILES_TO_RESTORE);
    }

    #[test]
    fn test_small_files_not_truncated() {
        let restorer = FileRestorer::new();
        let files = vec![("main.rs".to_string(), "fn main() {}".to_string())];

        let selected = restorer.select_files(&files);
        assert_eq!(selected.len(), 1);
        assert!(!selected[0].truncated);
        assert_eq!(selected[0].content, "fn main() {}");
    }

    #[test]
    fn test_large_files_truncated() {
        let restorer = FileRestorer::new();
        // Create a file that exceeds MAX_TOKENS_PER_FILE (~5000 tokens ≈ 18750 chars)
        let large_content = "x".repeat(25_000);
        let files = vec![("big.rs".to_string(), large_content)];

        let selected = restorer.select_files(&files);
        assert_eq!(selected.len(), 1);
        assert!(selected[0].truncated);
        assert!(selected[0].content.contains("truncated"));
    }

    #[test]
    fn test_format_context_block() {
        let files = vec![RestoredFile {
            path: "src/main.rs".to_string(),
            content: "fn main() {}".to_string(),
            token_count: 4,
            truncated: false,
        }];

        let block = FileRestorer::format_context_block(&files);
        assert!(block.contains("src/main.rs"));
        assert!(block.contains("fn main() {}"));
        assert!(!block.contains("truncated"));
    }
}
