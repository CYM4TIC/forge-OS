use serde::{Deserialize, Serialize};

/// The 4-type KAIROS memory taxonomy.
/// Matches CHECK constraint on memory_logs.memory_type and memory_topics.memory_type.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MemoryType {
    User,
    Feedback,
    Project,
    Reference,
}

impl MemoryType {
    pub fn as_str(&self) -> &'static str {
        match self {
            MemoryType::User => "user",
            MemoryType::Feedback => "feedback",
            MemoryType::Project => "project",
            MemoryType::Reference => "reference",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "user" => Some(MemoryType::User),
            "feedback" => Some(MemoryType::Feedback),
            "project" => Some(MemoryType::Project),
            "reference" => Some(MemoryType::Reference),
            _ => None,
        }
    }
}

/// A single append-only daily log entry.
/// Stored in SQLite `memory_logs` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryLogEntry {
    pub id: String,
    pub persona_id: String,
    pub memory_type: String,
    pub content: String,
    pub log_date: String,
    pub created_at: String,
}

/// A consolidated topic file entry.
/// Stored in SQLite `memory_topics` table.
/// Created/updated during dream consolidation cycles.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryTopicEntry {
    pub id: String,
    pub memory_type: String,
    pub name: String,
    pub description: String,
    pub content: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Constants for memory system limits.
pub const MEMORY_MAX_LINES: usize = 200;
pub const MEMORY_MAX_SIZE_KB: usize = 25;
pub const MEMORY_TYPES: [&str; 4] = ["user", "feedback", "project", "reference"];
