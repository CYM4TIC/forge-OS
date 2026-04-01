use std::collections::HashMap;
use tokio::sync::oneshot;

use super::types::{AgentRequest, AgentResult, AgentStatus, AGENT_BACKGROUND_TIMEOUT_MS};
use super::context::AgentContext;

/// Tracks the lifecycle of all dispatched agents.
pub struct AgentLifecycle {
    /// Active agent states, keyed by dispatch_id.
    agents: HashMap<String, LiveAgent>,
}

/// A live agent being tracked through its lifecycle.
struct LiveAgent {
    pub request: AgentRequest,
    pub context: AgentContext,
    pub status: AgentStatus,
    pub started_at_ms: u64,
    /// Cancel sender — dropping this signals the agent to stop.
    pub cancel_tx: Option<oneshot::Sender<()>>,
    /// Result, populated when agent completes.
    pub result: Option<AgentResult>,
}

impl AgentLifecycle {
    pub fn new() -> Self {
        Self {
            agents: HashMap::new(),
        }
    }

    /// Register a new agent dispatch. Returns the cancel receiver for the spawned task.
    pub fn register(
        &mut self,
        request: AgentRequest,
        context: AgentContext,
    ) -> oneshot::Receiver<()> {
        let (cancel_tx, cancel_rx) = oneshot::channel();
        let agent = LiveAgent {
            request: request.clone(),
            context,
            status: AgentStatus::Queued,
            started_at_ms: now_ms(),
            cancel_tx: Some(cancel_tx),
            result: None,
        };
        self.agents.insert(request.dispatch_id.clone(), agent);
        cancel_rx
    }

    /// Mark an agent as running.
    pub fn mark_running(&mut self, dispatch_id: &str) {
        if let Some(agent) = self.agents.get_mut(dispatch_id) {
            agent.status = AgentStatus::Running;
            agent.started_at_ms = now_ms();
        }
    }

    /// Record an agent's completion.
    pub fn complete(&mut self, result: AgentResult) {
        if let Some(agent) = self.agents.get_mut(&result.dispatch_id) {
            agent.status = result.status;
            agent.result = Some(result);
        }
    }

    /// Cancel an agent by dispatch_id. Returns true if the agent was found and signaled.
    pub fn cancel(&mut self, dispatch_id: &str) -> bool {
        if let Some(agent) = self.agents.get_mut(dispatch_id) {
            if matches!(agent.status, AgentStatus::Queued | AgentStatus::Running) {
                agent.status = AgentStatus::Cancelled;
                // Drop the cancel sender to signal the task
                agent.cancel_tx.take();
                return true;
            }
        }
        false
    }

    /// Get the current status of an agent.
    pub fn get_status(&self, dispatch_id: &str) -> Option<AgentStatus> {
        self.agents.get(dispatch_id).map(|a| a.status)
    }

    /// Get the result of a completed agent.
    pub fn get_result(&self, dispatch_id: &str) -> Option<&AgentResult> {
        self.agents.get(dispatch_id).and_then(|a| a.result.as_ref())
    }

    /// List all active (queued or running) agents.
    pub fn list_active(&self) -> Vec<AgentSummary> {
        self.agents
            .values()
            .filter(|a| matches!(a.status, AgentStatus::Queued | AgentStatus::Running))
            .map(|a| AgentSummary {
                dispatch_id: a.request.dispatch_id.clone(),
                agent_slug: a.request.agent_slug.clone(),
                status: a.status,
                elapsed_ms: now_ms().saturating_sub(a.started_at_ms),
            })
            .collect()
    }

    /// List all agents (active and completed) for status display.
    pub fn list_all(&self) -> Vec<AgentSummary> {
        self.agents
            .values()
            .map(|a| AgentSummary {
                dispatch_id: a.request.dispatch_id.clone(),
                agent_slug: a.request.agent_slug.clone(),
                status: a.status,
                elapsed_ms: now_ms().saturating_sub(a.started_at_ms),
            })
            .collect()
    }

    /// Check for agents that have exceeded their timeout and mark them.
    pub fn check_timeouts(&mut self) {
        let now = now_ms();
        let timed_out: Vec<String> = self.agents
            .iter()
            .filter(|(_, a)| {
                matches!(a.status, AgentStatus::Running)
                    && now.saturating_sub(a.started_at_ms) > a.request.timeout_ms.unwrap_or(AGENT_BACKGROUND_TIMEOUT_MS)
            })
            .map(|(id, _)| id.clone())
            .collect();

        for id in timed_out {
            if let Some(agent) = self.agents.get_mut(&id) {
                agent.status = AgentStatus::Timeout;
                agent.cancel_tx.take(); // Signal cancellation
            }
        }
    }

    /// Number of currently active agents.
    pub fn active_count(&self) -> usize {
        self.agents
            .values()
            .filter(|a| matches!(a.status, AgentStatus::Queued | AgentStatus::Running))
            .count()
    }

    /// Clean up completed/cancelled agents older than max_age_ms.
    pub fn cleanup(&mut self, max_age_ms: u64) {
        let cutoff = now_ms().saturating_sub(max_age_ms);
        self.agents.retain(|_, a| {
            matches!(a.status, AgentStatus::Queued | AgentStatus::Running)
                || a.started_at_ms >= cutoff
        });
    }
}

/// Summary of an agent for UI display.
#[derive(Debug, Clone, serde::Serialize)]
pub struct AgentSummary {
    pub dispatch_id: String,
    pub agent_slug: String,
    pub status: AgentStatus,
    pub elapsed_ms: u64,
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
