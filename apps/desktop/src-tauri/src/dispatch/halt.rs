// ── Composable Halt Conditions ──────────────────────────────────────────────
// P7.5-A: HaltCondition trait with BitAnd/BitOr combinators.
// Source: AutoGen TerminationCondition pattern.
//
// Built-in conditions: TurnLimit, TimeoutHalt, ExternalHalt.
// Phase 8 adds: ManaBudgetExhausted, ConflictDetected, TextTrigger.
//
// Composition:
//   condition_a | condition_b  → fires when EITHER triggers (OR)
//   condition_a & condition_b  → fires when BOTH trigger (AND)

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Core trait
// ---------------------------------------------------------------------------

/// Reason a halt condition fired.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HaltReason {
    /// Which condition fired (e.g., "turn_limit", "timeout", "external").
    pub condition: String,
    /// Human-readable description.
    pub message: String,
}

/// Context passed to halt conditions on each evaluation.
pub struct DispatchHaltContext {
    /// Number of dequeue cycles (turns) since the queue started or last reset.
    pub turns: u64,
    /// When the queue (or dispatch run) started.
    pub started_at: Instant,
}

/// A composable halt condition evaluated on each dequeue cycle.
pub trait HaltCondition: Send + Sync {
    /// Check whether this condition has been met.
    /// Returns `Some(reason)` if the dispatch should halt.
    fn check(&self, ctx: &DispatchHaltContext) -> Option<HaltReason>;

    /// Reset internal state (e.g., turn counters). Called when a new dispatch
    /// run begins.
    fn reset(&mut self);

    /// Machine-readable name for serialization and diagnostics.
    fn name(&self) -> &str;
}

// ---------------------------------------------------------------------------
// Built-in: TurnLimit
// ---------------------------------------------------------------------------

/// Halt after N dequeue cycles.
pub struct TurnLimit {
    pub max_turns: u64,
}

impl TurnLimit {
    pub fn new(max_turns: u64) -> Self {
        Self { max_turns }
    }
}

impl HaltCondition for TurnLimit {
    fn check(&self, ctx: &DispatchHaltContext) -> Option<HaltReason> {
        if ctx.turns >= self.max_turns {
            Some(HaltReason {
                condition: "turn_limit".to_string(),
                message: format!(
                    "Turn limit reached: {} >= {}",
                    ctx.turns, self.max_turns
                ),
            })
        } else {
            None
        }
    }

    fn reset(&mut self) {
        // Stateless — limit is fixed, turns come from context.
    }

    fn name(&self) -> &str {
        "turn_limit"
    }
}

// ---------------------------------------------------------------------------
// Built-in: TimeoutHalt
// ---------------------------------------------------------------------------

/// Halt after N seconds have elapsed since started_at.
pub struct TimeoutHalt {
    pub timeout_secs: u64,
}

impl TimeoutHalt {
    pub fn new(timeout_secs: u64) -> Self {
        Self { timeout_secs }
    }
}

impl HaltCondition for TimeoutHalt {
    fn check(&self, ctx: &DispatchHaltContext) -> Option<HaltReason> {
        let elapsed = ctx.started_at.elapsed().as_secs();
        if elapsed >= self.timeout_secs {
            Some(HaltReason {
                condition: "timeout".to_string(),
                message: format!(
                    "Timeout: {}s elapsed >= {}s limit",
                    elapsed, self.timeout_secs
                ),
            })
        } else {
            None
        }
    }

    fn reset(&mut self) {
        // Stateless — started_at comes from context.
    }

    fn name(&self) -> &str {
        "timeout"
    }
}

// ---------------------------------------------------------------------------
// Built-in: ExternalHalt
// ---------------------------------------------------------------------------

/// Halt when an external signal (Arc<AtomicBool>) is set to true.
/// Used for operator-initiated shutdown or cancellation.
pub struct ExternalHalt {
    pub signal: Arc<AtomicBool>,
}

impl ExternalHalt {
    pub fn new(signal: Arc<AtomicBool>) -> Self {
        Self { signal }
    }
}

impl HaltCondition for ExternalHalt {
    fn check(&self, _ctx: &DispatchHaltContext) -> Option<HaltReason> {
        // T-LOW-1: Relaxed is correct here — this is a single boolean flag with no
        // dependent memory accesses. The halt check runs on a polling loop (each
        // dequeue cycle), so a few stale reads are harmless. No Acquire/Release
        // needed because we don't synchronize other state through this flag.
        if self.signal.load(Ordering::Relaxed) {
            Some(HaltReason {
                condition: "external".to_string(),
                message: "External halt signal received".to_string(),
            })
        } else {
            None
        }
    }

    fn reset(&mut self) {
        // T-LOW-1: Relaxed is correct — reset() is called before a new dispatch run,
        // which does not begin until reset returns. No ordering fence needed.
        self.signal.store(false, Ordering::Relaxed);
    }

    fn name(&self) -> &str {
        "external"
    }
}

// ---------------------------------------------------------------------------
// Combinators: OR and AND
// ---------------------------------------------------------------------------

/// OR combinator — fires when ANY inner condition fires.
pub struct OrHalt {
    conditions: Vec<Box<dyn HaltCondition>>,
}

impl HaltCondition for OrHalt {
    fn check(&self, ctx: &DispatchHaltContext) -> Option<HaltReason> {
        for cond in &self.conditions {
            if let Some(reason) = cond.check(ctx) {
                return Some(reason);
            }
        }
        None
    }

    fn reset(&mut self) {
        for cond in &mut self.conditions {
            cond.reset();
        }
    }

    fn name(&self) -> &str {
        "or"
    }
}

/// AND combinator — fires only when ALL inner conditions fire.
pub struct AndHalt {
    conditions: Vec<Box<dyn HaltCondition>>,
}

impl HaltCondition for AndHalt {
    fn check(&self, ctx: &DispatchHaltContext) -> Option<HaltReason> {
        let mut reasons = Vec::new();
        for cond in &self.conditions {
            match cond.check(ctx) {
                Some(reason) => reasons.push(reason),
                None => return None, // Not all conditions met
            }
        }
        // All fired — combine reasons
        let names: Vec<&str> = reasons.iter().map(|r| r.condition.as_str()).collect();
        Some(HaltReason {
            condition: format!("and({})", names.join(", ")),
            message: format!(
                "All conditions met: {}",
                reasons
                    .iter()
                    .map(|r| r.message.as_str())
                    .collect::<Vec<_>>()
                    .join("; ")
            ),
        })
    }

    fn reset(&mut self) {
        for cond in &mut self.conditions {
            cond.reset();
        }
    }

    fn name(&self) -> &str {
        "and"
    }
}

// ---------------------------------------------------------------------------
// BitOr and BitAnd operator overloads for Box<dyn HaltCondition>
// ---------------------------------------------------------------------------

impl std::ops::BitOr for Box<dyn HaltCondition> {
    type Output = Box<dyn HaltCondition>;

    fn bitor(self, rhs: Self) -> Self::Output {
        Box::new(OrHalt {
            conditions: vec![self, rhs],
        })
    }
}

impl std::ops::BitAnd for Box<dyn HaltCondition> {
    type Output = Box<dyn HaltCondition>;

    fn bitand(self, rhs: Self) -> Self::Output {
        Box::new(AndHalt {
            conditions: vec![self, rhs],
        })
    }
}

// ---------------------------------------------------------------------------
// Convenience constructors (return Box<dyn HaltCondition>)
// ---------------------------------------------------------------------------

/// Create a boxed TurnLimit halt condition.
pub fn turn_limit(max_turns: u64) -> Box<dyn HaltCondition> {
    Box::new(TurnLimit::new(max_turns))
}

/// Create a boxed TimeoutHalt condition.
pub fn timeout_halt(timeout_secs: u64) -> Box<dyn HaltCondition> {
    Box::new(TimeoutHalt::new(timeout_secs))
}

/// Create a boxed ExternalHalt condition.
pub fn external_halt(signal: Arc<AtomicBool>) -> Box<dyn HaltCondition> {
    Box::new(ExternalHalt::new(signal))
}
