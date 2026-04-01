use serde::{Deserialize, Serialize};

/// Compaction summary variants.
/// Determines how much of the conversation is summarized.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CompactionVariant {
    /// Summarize the entire conversation.
    Base,
    /// Summarize only recent messages (earlier messages retained verbatim).
    Partial,
    /// Summarize a prefix of the conversation (for continuing sessions).
    PartialUpTo,
}

impl std::fmt::Display for CompactionVariant {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Base => write!(f, "base"),
            Self::Partial => write!(f, "partial"),
            Self::PartialUpTo => write!(f, "partial_up_to"),
        }
    }
}

/// A stored compaction summary.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompactionSummary {
    pub id: String,
    pub session_id: String,
    pub variant: CompactionVariant,
    /// The prompt sent to the LLM for summarization.
    pub prompt: String,
    /// The resulting summary content (9-section format).
    pub content: String,
    /// Approximate token count of the summary.
    pub token_count: Option<i64>,
}

/// The 9-section summary template.
/// Each section captures a specific aspect of the conversation state.
/// This format is derived from Claude Code's compaction engine.
const SUMMARY_SECTIONS: &[(&str, &str)] = &[
    (
        "Primary Request and Intent",
        "What is the user trying to accomplish? State the core goal clearly.",
    ),
    (
        "Key Technical Concepts",
        "What technical decisions, patterns, or concepts were discussed? Include architectural choices, library selections, data models.",
    ),
    (
        "Files and Code Sections",
        "List every file that was read, created, or modified. Include the most important code snippets verbatim — not descriptions of code, but actual code that would be needed to continue.",
    ),
    (
        "Errors and Fixes",
        "What errors occurred and how were they resolved? Include error messages, root causes, and solutions.",
    ),
    (
        "Problem Solving",
        "What approaches were tried? What decisions were made and why? Include reasoning that led to the current approach.",
    ),
    (
        "All User Messages",
        "Reproduce ALL user messages VERBATIM. This is critical for preventing context drift. Every instruction, correction, and preference must be preserved exactly.",
    ),
    (
        "Pending Tasks",
        "What remains to be done? List incomplete items, known issues, and deferred work.",
    ),
    (
        "Current Work",
        "What is the precise current state? Include file names, function names, line numbers — everything needed to resume without re-reading the full conversation.",
    ),
    (
        "Optional Next Step",
        "If the conversation had a clear next action, state it with direct quotes from the user's instructions.",
    ),
];

/// Build the prompt that will be sent to an LLM to generate a compaction summary.
pub fn build_summary_prompt(conversation: &str, variant: &CompactionVariant) -> String {
    let variant_instruction = match variant {
        CompactionVariant::Base => {
            "Summarize the ENTIRE conversation below into the 9-section format."
        }
        CompactionVariant::Partial => {
            "Summarize only the RECENT portion of the conversation (after the marker). Earlier messages are retained verbatim and should not be re-summarized."
        }
        CompactionVariant::PartialUpTo => {
            "Summarize the PREFIX of the conversation (up to the marker). The suffix will continue as-is."
        }
    };

    let sections_template: String = SUMMARY_SECTIONS
        .iter()
        .enumerate()
        .map(|(i, (title, instruction))| {
            format!("## {}. {}\n{}\n", i + 1, title, instruction)
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"You are a context compaction engine. Your job is to compress a conversation into a structured summary that preserves ALL information needed to continue the work without the original conversation.

CRITICAL RULES:
1. Section 6 (All User Messages) must be VERBATIM — no paraphrasing, no summarizing.
2. Section 3 (Files and Code) must include actual code snippets, not descriptions.
3. Section 8 (Current Work) must be precise enough that someone can resume immediately.
4. Do NOT add commentary, opinions, or suggestions. Just compress.
5. Do NOT omit anything because it seems unimportant. Err on the side of inclusion.

VARIANT: {variant_instruction}

OUTPUT FORMAT:
{sections_template}

---

CONVERSATION TO SUMMARIZE:

{conversation}"#
    )
}

/// Parse a summary response into individual sections.
/// Returns a vec of (section_title, section_content) tuples.
pub fn parse_summary_sections(content: &str) -> Vec<(String, String)> {
    let mut sections = Vec::new();
    let mut current_title = String::new();
    let mut current_content = Vec::new();

    for line in content.lines() {
        if line.starts_with("## ") {
            // Save previous section
            if !current_title.is_empty() {
                sections.push((
                    current_title.clone(),
                    current_content.join("\n").trim().to_string(),
                ));
            }
            // Start new section — strip the "## N. " prefix
            current_title = line
                .trim_start_matches("## ")
                .trim_start_matches(|c: char| c.is_ascii_digit() || c == '.')
                .trim()
                .to_string();
            current_content.clear();
        } else {
            current_content.push(line.to_string());
        }
    }

    // Save last section
    if !current_title.is_empty() {
        sections.push((
            current_title,
            current_content.join("\n").trim().to_string(),
        ));
    }

    sections
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_summary_prompt_contains_sections() {
        let prompt = build_summary_prompt("test conversation", &CompactionVariant::Base);
        assert!(prompt.contains("Primary Request and Intent"));
        assert!(prompt.contains("All User Messages"));
        assert!(prompt.contains("VERBATIM"));
        assert!(prompt.contains("test conversation"));
    }

    #[test]
    fn test_parse_sections() {
        let content = "## 1. Primary Request\nBuild a Tauri app\n\n## 2. Key Concepts\nRust backend + React frontend";
        let sections = parse_summary_sections(content);
        assert_eq!(sections.len(), 2);
        assert_eq!(sections[0].0, "Primary Request");
        assert!(sections[0].1.contains("Build a Tauri app"));
        assert_eq!(sections[1].0, "Key Concepts");
    }

    #[test]
    fn test_variant_display() {
        assert_eq!(CompactionVariant::Base.to_string(), "base");
        assert_eq!(CompactionVariant::Partial.to_string(), "partial");
        assert_eq!(CompactionVariant::PartialUpTo.to_string(), "partial_up_to");
    }
}
