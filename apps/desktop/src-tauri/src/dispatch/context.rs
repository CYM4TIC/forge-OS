use std::collections::HashSet;

/// Isolated context for a forked agent.
/// Each dispatched agent gets its own context so mutations
/// don't leak between concurrent agents or back to the parent.
pub struct AgentContext {
    /// Files this agent has read (tracked for audit).
    pub files_read: HashSet<String>,
    /// Files this agent has written/edited.
    pub files_written: HashSet<String>,
    /// Whether this agent is allowed to mutate files.
    pub is_writable: bool,
    /// Dispatch depth (0 = direct dispatch, 1+ = agent dispatched by agent).
    pub depth: u32,
    /// Max allowed depth to prevent infinite dispatch chains.
    pub max_depth: u32,
    /// Parent dispatch ID, if this agent was dispatched by another agent.
    pub parent_dispatch_id: Option<String>,
}

impl AgentContext {
    pub fn new(is_writable: bool, parent_dispatch_id: Option<String>, depth: u32) -> Self {
        Self {
            files_read: HashSet::new(),
            files_written: HashSet::new(),
            is_writable,
            depth,
            max_depth: 3,
            parent_dispatch_id,
        }
    }

    /// Record a file read.
    pub fn track_read(&mut self, path: &str) {
        self.files_read.insert(path.to_string());
    }

    /// Record a file write. Returns Err if agent is read-only.
    pub fn track_write(&mut self, path: &str) -> Result<(), String> {
        if !self.is_writable {
            return Err(format!("Agent context is read-only — cannot write {}", path));
        }
        self.files_written.insert(path.to_string());
        Ok(())
    }

    /// Check if this context can dispatch a sub-agent.
    pub fn can_dispatch(&self) -> bool {
        self.depth < self.max_depth
    }

    /// Create a child context for a sub-agent dispatch.
    pub fn child_context(&self, dispatch_id: &str, is_writable: bool) -> Self {
        Self {
            files_read: HashSet::new(),
            files_written: HashSet::new(),
            is_writable,
            depth: self.depth + 1,
            max_depth: self.max_depth,
            parent_dispatch_id: Some(dispatch_id.to_string()),
        }
    }
}
