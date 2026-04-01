/// Token counter using character-based approximation.
///
/// Claude's tokenizer averages ~4 characters per token for English text.
/// Code tends to be slightly denser (~3.5 chars/token due to short identifiers).
/// We use 3.75 as a balanced estimate.
///
/// This is intentionally conservative (slightly over-counts) to trigger
/// compaction early rather than late. Better to compact at 83% than miss 85%.
///
/// For production accuracy, this could be replaced with tiktoken-rs or
/// a Rust port of Claude's tokenizer. The character approximation is
/// good enough for threshold detection.

const CHARS_PER_TOKEN: f64 = 3.75;

/// Token counter with character-based approximation.
pub struct TokenCounter {
    chars_per_token: f64,
}

impl TokenCounter {
    pub fn new() -> Self {
        Self {
            chars_per_token: CHARS_PER_TOKEN,
        }
    }

    /// Count approximate tokens in a string.
    pub fn count(&self, text: &str) -> usize {
        if text.is_empty() {
            return 0;
        }
        // Ceiling division to be conservative
        let chars = text.len() as f64;
        (chars / self.chars_per_token).ceil() as usize
    }

    /// Count tokens across multiple strings (e.g., all messages in a session).
    pub fn count_many(&self, texts: &[&str]) -> usize {
        texts.iter().map(|t| self.count(t)).sum()
    }

    /// Count tokens for a structured conversation (role + content pairs).
    /// Adds overhead for message framing (~4 tokens per message for role tags).
    pub fn count_conversation(&self, messages: &[(String, String)]) -> usize {
        let message_overhead = 4; // ~4 tokens per message for role/delimiter framing
        messages
            .iter()
            .map(|(role, content)| {
                self.count(role) + self.count(content) + message_overhead
            })
            .sum()
    }
}

impl Default for TokenCounter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_string() {
        let counter = TokenCounter::new();
        assert_eq!(counter.count(""), 0);
    }

    #[test]
    fn test_basic_counting() {
        let counter = TokenCounter::new();
        // "Hello world" = 11 chars / 3.75 = 2.93 → ceil = 3
        assert_eq!(counter.count("Hello world"), 3);
    }

    #[test]
    fn test_conservative_estimate() {
        let counter = TokenCounter::new();
        // 100 chars should give ~27 tokens (100/3.75 = 26.67 → 27)
        let text = "a".repeat(100);
        assert_eq!(counter.count(&text), 27);
    }

    #[test]
    fn test_count_many() {
        let counter = TokenCounter::new();
        let texts = vec!["Hello", "World"];
        let total = counter.count_many(&texts);
        assert_eq!(total, counter.count("Hello") + counter.count("World"));
    }
}
