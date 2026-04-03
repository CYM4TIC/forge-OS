use std::collections::HashSet;
use crate::commands::capabilities::CapabilityFamily;

/// Isolated context for a forked agent.
/// Each dispatched agent gets its own context so mutations
/// don't leak between concurrent agents or back to the parent.
///
/// **Permission enforcement** is structural: `track_write()` returns an error
/// for read-only contexts, and callers must check before performing mutations.
/// `granted_capabilities` are carried from dispatch and checked by `has_capability()`.
pub struct AgentContext {
    /// Files this agent has read (tracked for audit).
    pub files_read: HashSet<String>,
    /// Files this agent has written/edited.
    pub files_written: HashSet<String>,
    /// Whether this agent is allowed to mutate files (derived from capabilities).
    pub is_writable: bool,
    /// Capability families granted for this dispatch.
    pub granted_capabilities: Vec<CapabilityFamily>,
    /// Dispatch depth (0 = direct dispatch, 1+ = agent dispatched by agent).
    pub depth: u32,
    /// Max allowed depth to prevent infinite dispatch chains.
    pub max_depth: u32,
    /// Parent dispatch ID, if this agent was dispatched by another agent.
    pub parent_dispatch_id: Option<String>,
}

impl AgentContext {
    /// Create a new context. `is_writable` is derived from capabilities:
    /// true if WriteCode OR WriteVault is granted.
    pub fn from_capabilities(
        capabilities: Vec<CapabilityFamily>,
        parent_dispatch_id: Option<String>,
        depth: u32,
    ) -> Self {
        let is_writable = capabilities.contains(&CapabilityFamily::WriteCode)
            || capabilities.contains(&CapabilityFamily::WriteVault);
        Self {
            files_read: HashSet::new(),
            files_written: HashSet::new(),
            is_writable,
            granted_capabilities: capabilities,
            depth,
            max_depth: 3,
            parent_dispatch_id,
        }
    }

    pub fn new(is_writable: bool, parent_dispatch_id: Option<String>, depth: u32) -> Self {
        Self {
            files_read: HashSet::new(),
            files_written: HashSet::new(),
            is_writable,
            granted_capabilities: if is_writable {
                vec![CapabilityFamily::ReadOnly, CapabilityFamily::WriteCode]
            } else {
                vec![CapabilityFamily::ReadOnly]
            },
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

    /// Check if a specific capability is granted.
    pub fn has_capability(&self, cap: CapabilityFamily) -> bool {
        self.granted_capabilities.contains(&cap)
    }

    /// Create a child context for a sub-agent dispatch.
    /// Child capabilities are intersected with parent's grants — a child
    /// can never exceed the parent's privilege level.
    pub fn child_context(&self, dispatch_id: &str, capabilities: Vec<CapabilityFamily>) -> Self {
        let bounded: Vec<CapabilityFamily> = capabilities
            .into_iter()
            .filter(|c| self.granted_capabilities.contains(c))
            .collect();
        Self::from_capabilities(
            bounded,
            Some(dispatch_id.to_string()),
            self.depth + 1,
        )
    }
}
