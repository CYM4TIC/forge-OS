// ── Priority Dispatch Queue ──────────────────────────────────────────────────
// P7-N: BinaryHeap-based priority queue for agent dispatches.
// Source: background-agents SessionMessageQueue pattern.
//
// 4-tier priority: Critical > High > Normal > Low.
// Configurable concurrency limit (default 3).
// FIFO within same priority tier (via sequence counter).
// P7.5-A: Composable halt conditions evaluated on every dequeue.

use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashSet};
use std::time::Instant;

use serde::{Deserialize, Serialize};

use super::halt::{DispatchHaltContext, HaltCondition, HaltReason};
use super::types::AgentRequest;

// ---------------------------------------------------------------------------
// Priority enum
// ---------------------------------------------------------------------------

/// Dispatch priority — higher values execute first.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DispatchPriority {
    Low = 0,
    Normal = 1,
    High = 2,
    Critical = 3,
}

impl Default for DispatchPriority {
    fn default() -> Self {
        Self::Normal
    }
}

impl DispatchPriority {
    /// Derive priority from agent category.
    pub fn from_category(category: &str) -> Self {
        match category {
            "persona" => DispatchPriority::High,
            "intelligence" => DispatchPriority::Normal,
            "orchestrator" => DispatchPriority::High,
            "utility" => DispatchPriority::Low,
            "sub_agent" => DispatchPriority::Normal,
            "command" => DispatchPriority::Normal,
            _ => DispatchPriority::Normal,
        }
    }
}

// ---------------------------------------------------------------------------
// Queue entry
// ---------------------------------------------------------------------------

/// A queued dispatch with priority and ordering metadata.
#[derive(Debug, Clone)]
pub struct QueuedDispatch {
    /// The agent dispatch request.
    pub request: AgentRequest,
    /// Priority tier.
    pub priority: DispatchPriority,
    /// Sequence number for FIFO within same priority (lower = older = first).
    pub sequence: u64,
}

/// BinaryHeap needs Ord. Higher priority first, then lower sequence (older first).
impl Ord for QueuedDispatch {
    fn cmp(&self, other: &Self) -> Ordering {
        // Higher priority first
        (self.priority as u8)
            .cmp(&(other.priority as u8))
            // Within same priority: lower sequence = older = dispatched first
            .then_with(|| other.sequence.cmp(&self.sequence))
    }
}

impl PartialOrd for QueuedDispatch {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Eq for QueuedDispatch {}

impl PartialEq for QueuedDispatch {
    fn eq(&self, other: &Self) -> bool {
        self.priority == other.priority && self.sequence == other.sequence
    }
}

// ---------------------------------------------------------------------------
// Dispatch Queue
// ---------------------------------------------------------------------------

/// Priority-based dispatch queue with concurrency limit and composable halt conditions.
pub struct DispatchQueue {
    /// Priority heap of pending dispatches.
    heap: BinaryHeap<QueuedDispatch>,
    /// Monotonic sequence counter for FIFO within priority tiers.
    next_sequence: u64,
    /// Maximum concurrent dispatches.
    max_concurrent: usize,
    /// Currently running dispatch count.
    active_count: usize,
    /// K-HIGH-3: Cancelled sequences — skipped during dequeue.
    cancelled: HashSet<u64>,
    /// P7.5-A: Composable halt conditions evaluated on every dequeue.
    halt_conditions: Vec<Box<dyn HaltCondition>>,
    /// P7.5-A: When the current dispatch run started (reset on `reset_halt()`).
    started_at: Instant,
    /// P7.5-A: Dequeue cycle counter (reset on `reset_halt()`).
    dequeue_turns: u64,
    /// P7.5-A: Last halt reason if the queue halted.
    last_halt_reason: Option<HaltReason>,
}

impl DispatchQueue {
    pub fn new(max_concurrent: usize) -> Self {
        Self {
            heap: BinaryHeap::new(),
            next_sequence: 0,
            max_concurrent,
            active_count: 0,
            cancelled: HashSet::new(),
            halt_conditions: Vec::new(),
            started_at: Instant::now(),
            dequeue_turns: 0,
            last_halt_reason: None,
        }
    }

    /// Enqueue a dispatch request with a given priority.
    /// Returns the sequence number assigned.
    pub fn enqueue(&mut self, request: AgentRequest, priority: DispatchPriority) -> u64 {
        let seq = self.next_sequence;
        self.next_sequence += 1;

        self.heap.push(QueuedDispatch {
            request,
            priority,
            sequence: seq,
        });

        seq
    }

    /// Try to dequeue the next dispatch (highest priority, oldest within tier).
    /// Returns None if the queue is empty, concurrency limit is reached,
    /// or a halt condition has fired.
    /// K-HIGH-3: Skips cancelled entries automatically.
    /// P7.5-A: Evaluates halt conditions before dequeuing.
    pub fn try_dequeue(&mut self) -> Option<QueuedDispatch> {
        if self.active_count >= self.max_concurrent {
            return None;
        }
        // K-MED-3: Only evaluate halt conditions when there's work to halt
        if !self.heap.is_empty() {
            if let Some(reason) = self.evaluate_halt() {
                self.last_halt_reason = Some(reason);
                return None;
            }
        }
        // Skip cancelled entries
        while let Some(entry) = self.heap.pop() {
            if self.cancelled.remove(&entry.sequence) {
                continue; // Skip and clean up
            }
            self.active_count += 1;
            self.dequeue_turns += 1;
            return Some(entry);
        }
        None
    }

    /// Cancel a pending dispatch by sequence number.
    /// Returns true if the sequence was found and marked for cancellation.
    pub fn cancel_pending(&mut self, sequence: u64) -> bool {
        self.cancelled.insert(sequence)
    }

    /// Mark a dispatch as completed (decrements active count).
    /// Call this when an agent finishes, errors, or is cancelled.
    pub fn mark_completed(&mut self) {
        if self.active_count > 0 {
            self.active_count -= 1;
        }
    }

    /// Get the number of pending (queued, not yet dispatched) entries.
    pub fn pending_count(&self) -> usize {
        self.heap.len()
    }

    /// Get the number of currently active dispatches.
    pub fn active_count(&self) -> usize {
        self.active_count
    }

    /// Get the current concurrency limit.
    pub fn max_concurrent(&self) -> usize {
        self.max_concurrent
    }

    /// Update the concurrency limit.
    pub fn set_max_concurrent(&mut self, limit: usize) {
        self.max_concurrent = limit;
    }

    /// Peek at the next entry without removing it.
    pub fn peek(&self) -> Option<&QueuedDispatch> {
        self.heap.peek()
    }

    /// Drain all pending entries (for shutdown).
    pub fn drain(&mut self) -> Vec<QueuedDispatch> {
        let mut entries = Vec::new();
        while let Some(entry) = self.heap.pop() {
            entries.push(entry);
        }
        entries
    }

    // ── Halt condition management (P7.5-A) ──

    /// Add a halt condition to the queue.
    pub fn add_halt_condition(&mut self, condition: Box<dyn HaltCondition>) {
        self.halt_conditions.push(condition);
    }

    /// Set halt conditions, replacing any existing ones.
    /// Default: `TurnLimit(100) | TimeoutHalt(600)` — no dispatch runs forever.
    pub fn set_halt_conditions(&mut self, conditions: Vec<Box<dyn HaltCondition>>) {
        self.halt_conditions = conditions;
    }

    /// Evaluate all halt conditions against the current context.
    /// Returns the first HaltReason that fires (OR semantics at the top level).
    fn evaluate_halt(&self) -> Option<HaltReason> {
        let ctx = DispatchHaltContext {
            turns: self.dequeue_turns,
            started_at: self.started_at,
        };
        for cond in &self.halt_conditions {
            if let Some(reason) = cond.check(&ctx) {
                return Some(reason);
            }
        }
        None
    }

    /// Reset halt state for a new dispatch run.
    /// Resets the turn counter, started_at, clears last halt reason,
    /// and calls reset() on all conditions.
    pub fn reset_halt(&mut self) {
        self.dequeue_turns = 0;
        self.started_at = Instant::now();
        self.last_halt_reason = None;
        for cond in &mut self.halt_conditions {
            cond.reset();
        }
    }

    /// Check if the queue is currently halted.
    pub fn is_halted(&self) -> bool {
        self.last_halt_reason.is_some()
    }

    /// Get the last halt reason, if any.
    pub fn last_halt_reason(&self) -> Option<&HaltReason> {
        self.last_halt_reason.as_ref()
    }

    /// Get the number of dequeue turns since last reset.
    pub fn dequeue_turns(&self) -> u64 {
        self.dequeue_turns
    }

    /// Get a snapshot of the queue state for the frontend.
    pub fn snapshot(&self) -> QueueSnapshot {
        QueueSnapshot {
            pending_count: self.heap.len(),
            active_count: self.active_count,
            max_concurrent: self.max_concurrent,
            next_priority: self.heap.peek().map(|e| e.priority),
            is_halted: self.last_halt_reason.is_some(),
            halt_reason: self.last_halt_reason.as_ref().map(|r| r.message.clone()),
            dequeue_turns: self.dequeue_turns,
        }
    }
}

/// Serializable queue state for the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct QueueSnapshot {
    pub pending_count: usize,
    pub active_count: usize,
    pub max_concurrent: usize,
    pub next_priority: Option<DispatchPriority>,
    /// P7.5-A: Whether the queue is currently halted.
    pub is_halted: bool,
    /// P7.5-A: Human-readable halt reason, if halted.
    pub halt_reason: Option<String>,
    /// P7.5-A: Number of dequeue cycles since last reset.
    pub dequeue_turns: u64,
}

// ---------------------------------------------------------------------------
// Tauri Commands
// ---------------------------------------------------------------------------

use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

/// Managed Tauri state for the dispatch queue.
pub type DispatchQueueState = Arc<Mutex<DispatchQueue>>;

/// Get the current queue state snapshot.
#[tauri::command]
pub async fn get_dispatch_queue_state(
    queue: State<'_, DispatchQueueState>,
) -> Result<QueueSnapshot, String> {
    let q = queue.lock().await;
    Ok(q.snapshot())
}

/// Update the concurrency limit.
#[tauri::command]
pub async fn set_dispatch_concurrency(
    queue: State<'_, DispatchQueueState>,
    limit: usize,
) -> Result<usize, String> {
    if limit == 0 || limit > 20 {
        return Err("Concurrency limit must be between 1 and 20".to_string());
    }
    let mut q = queue.lock().await;
    q.set_max_concurrent(limit);
    Ok(limit)
}
