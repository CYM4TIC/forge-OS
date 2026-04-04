// ── Policy Engine ────────────────────────────────────────────────────────────
// P7-N: Rule-based ALLOW/DENY access for tool calls.
// Source: ByteRover CLI policy engine pattern.
//
// Rules are evaluated first-match-wins: global rules first, then persona-
// specific overlays. The engine sits BEFORE the ConfirmationRouter —
// DENY short-circuits without ever showing the confirmation modal.

use serde::{Deserialize, Serialize};

use crate::commands::capabilities::CapabilityFamily;

// ---------------------------------------------------------------------------
// Policy rule types
// ---------------------------------------------------------------------------

/// Action a policy rule prescribes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PolicyAction {
    /// Allow the tool call unconditionally.
    Allow,
    /// Deny the tool call unconditionally.
    Deny,
    /// Route to ConfirmationRouter for operator decision.
    Confirm,
}

/// Scope of a policy rule.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PolicyScope {
    /// Applies to all personas.
    Global,
    /// Applies only to the named persona.
    Persona(String),
}

/// A single policy rule.
/// Rules are ordered by priority (lower number = higher priority).
/// First matching rule wins.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRule {
    /// Glob pattern matched against tool names (e.g., "git*", "delete_*", "execute_sql").
    pub pattern: String,
    /// What to do when the pattern matches.
    pub action: PolicyAction,
    /// Who this rule applies to.
    pub scope: PolicyScope,
    /// Lower number = higher priority. Evaluated in ascending order.
    pub priority: u32,
}

/// Result of policy evaluation.
#[derive(Debug, Clone, Serialize)]
pub struct PolicyDecision {
    /// The action prescribed by the matching rule.
    pub action: PolicyAction,
    /// The rule that matched (for audit trail).
    pub matched_rule: Option<PolicyRule>,
    /// The capability family the tool requires.
    pub capability_required: CapabilityFamily,
}

// ---------------------------------------------------------------------------
// Policy Engine
// ---------------------------------------------------------------------------

/// The policy engine. Holds an ordered list of rules and evaluates tool calls.
pub struct PolicyEngine {
    /// Rules sorted by priority (ascending — lowest priority number first).
    rules: Vec<PolicyRule>,
}

impl Default for PolicyEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl PolicyEngine {
    pub fn new() -> Self {
        Self { rules: Vec::new() }
    }

    /// Load rules and sort by priority (ascending).
    pub fn load_rules(&mut self, mut rules: Vec<PolicyRule>) {
        rules.sort_by_key(|r| r.priority);
        self.rules = rules;
    }

    /// Add a single rule. Re-sorts by priority.
    pub fn add_rule(&mut self, rule: PolicyRule) {
        self.rules.push(rule);
        self.rules.sort_by_key(|r| r.priority);
    }

    /// Remove all rules matching a pattern and scope.
    pub fn remove_rules(&mut self, pattern: &str, scope: &PolicyScope) {
        self.rules.retain(|r| !(r.pattern == pattern && r.scope == *scope));
    }

    /// Get current rule count.
    pub fn rule_count(&self) -> usize {
        self.rules.len()
    }

    /// Evaluate a tool call against the policy rules.
    /// First-match-wins: global rules and persona-specific rules are both
    /// checked, with priority determining order.
    ///
    /// Returns `PolicyDecision` with the matched rule. If no rule matches,
    /// defaults to `Confirm` (safe default — ask the operator).
    pub fn evaluate(
        &self,
        tool_name: &str,
        persona: Option<&str>,
        capability_required: CapabilityFamily,
    ) -> PolicyDecision {
        for rule in &self.rules {
            // Check scope: Global matches all, Persona matches only the named persona
            let scope_matches = match &rule.scope {
                PolicyScope::Global => true,
                PolicyScope::Persona(p) => persona.map_or(false, |name| name == p),
            };
            if !scope_matches {
                continue;
            }

            // Check pattern: glob-style matching
            if matches_tool_pattern(&rule.pattern, tool_name) {
                return PolicyDecision {
                    action: rule.action,
                    matched_rule: Some(rule.clone()),
                    capability_required,
                };
            }
        }

        // No rule matched — default to Confirm (safe fallback)
        PolicyDecision {
            action: PolicyAction::Confirm,
            matched_rule: None,
            capability_required,
        }
    }

    /// Get all rules (for display/serialization).
    pub fn rules(&self) -> &[PolicyRule] {
        &self.rules
    }
}

// ---------------------------------------------------------------------------
// Glob-style pattern matching for tool names
// ---------------------------------------------------------------------------

/// Match a glob-style pattern against a tool name.
///
/// Supports:
/// - `*` matches zero or more characters
/// - `?` matches exactly one character
/// - Exact string match (no wildcards)
/// - Prefix match: `"git"` matches `"git_status"`, `"git_diff"`, etc.
///   (only when pattern contains no wildcards — this is the prefix-matching
///    behavior shared with `get_allowed_tools`)
pub fn matches_tool_pattern(pattern: &str, tool_name: &str) -> bool {
    // If pattern contains glob characters, do glob matching
    if pattern.contains('*') || pattern.contains('?') {
        return glob_match(pattern, tool_name);
    }
    // Otherwise: exact match OR delimiter-bounded prefix match.
    // "git" matches "git_status" (underscore boundary) but NOT "github_pr".
    if tool_name == pattern {
        return true;
    }
    // Prefix match requires the next character to be '_' or ':' (delimiter boundary)
    if tool_name.len() > pattern.len() && tool_name.starts_with(pattern) {
        let next_char = tool_name.as_bytes()[pattern.len()];
        return next_char == b'_' || next_char == b':';
    }
    false
}

/// Iterative glob matching with `*` (any chars) and `?` (single char).
/// O(n*m) worst case — no exponential blowup on adversarial patterns.
/// Uses the standard two-pointer backtracking algorithm.
fn glob_match(pattern: &str, text: &str) -> bool {
    let pat: Vec<char> = pattern.chars().collect();
    let txt: Vec<char> = text.chars().collect();
    let (plen, tlen) = (pat.len(), txt.len());

    let mut pi: usize = 0;
    let mut ti: usize = 0;
    let mut star_pi: Option<usize> = None;
    let mut star_ti: usize = 0;

    while ti < tlen {
        if pi < plen && (pat[pi] == '?' || pat[pi] == txt[ti]) {
            pi += 1;
            ti += 1;
        } else if pi < plen && pat[pi] == '*' {
            star_pi = Some(pi);
            star_ti = ti;
            pi += 1;
        } else if let Some(sp) = star_pi {
            star_ti += 1;
            ti = star_ti;
            pi = sp + 1;
        } else {
            return false;
        }
    }

    // Consume trailing '*' in pattern
    while pi < plen && pat[pi] == '*' {
        pi += 1;
    }

    pi == plen
}

// ---------------------------------------------------------------------------
// Tauri Commands
// ---------------------------------------------------------------------------

use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

/// Managed Tauri state for the policy engine.
pub type PolicyEngineState = Arc<Mutex<PolicyEngine>>;

/// Evaluate a tool call against the policy engine.
#[tauri::command]
pub async fn evaluate_policy(
    engine: State<'_, PolicyEngineState>,
    tool_name: String,
    persona: Option<String>,
    capability_required: CapabilityFamily,
) -> Result<PolicyDecision, String> {
    let e = engine.lock().await;
    Ok(e.evaluate(&tool_name, persona.as_deref(), capability_required))
}

/// Get all current policy rules.
#[tauri::command]
pub async fn get_policy_rules(
    engine: State<'_, PolicyEngineState>,
) -> Result<Vec<PolicyRule>, String> {
    let e = engine.lock().await;
    Ok(e.rules().to_vec())
}

/// Load a set of policy rules (replaces existing rules).
#[tauri::command]
pub async fn load_policy_rules(
    engine: State<'_, PolicyEngineState>,
    rules: Vec<PolicyRule>,
) -> Result<usize, String> {
    let mut e = engine.lock().await;
    e.load_rules(rules);
    Ok(e.rule_count())
}

// ---------------------------------------------------------------------------
// Default policy rules (ship with the system)
// ---------------------------------------------------------------------------

/// Default policy rules that ship with Forge OS.
/// Destructive operations always require confirmation.
/// Read operations always allowed. Everything else: confirm.
pub fn default_policy_rules() -> Vec<PolicyRule> {
    vec![
        // Global: all read operations are allowed
        PolicyRule {
            pattern: "read_*".to_string(),
            action: PolicyAction::Allow,
            scope: PolicyScope::Global,
            priority: 10,
        },
        PolicyRule {
            pattern: "glob_*".to_string(),
            action: PolicyAction::Allow,
            scope: PolicyScope::Global,
            priority: 10,
        },
        PolicyRule {
            pattern: "grep_*".to_string(),
            action: PolicyAction::Allow,
            scope: PolicyScope::Global,
            priority: 10,
        },
        PolicyRule {
            pattern: "list_*".to_string(),
            action: PolicyAction::Allow,
            scope: PolicyScope::Global,
            priority: 10,
        },
        PolicyRule {
            pattern: "get_*".to_string(),
            action: PolicyAction::Allow,
            scope: PolicyScope::Global,
            priority: 10,
        },
        PolicyRule {
            pattern: "snapshot_*".to_string(),
            action: PolicyAction::Allow,
            scope: PolicyScope::Global,
            priority: 10,
        },
        PolicyRule {
            pattern: "screenshot_*".to_string(),
            action: PolicyAction::Allow,
            scope: PolicyScope::Global,
            priority: 10,
        },
        // Global: destructive operations always require confirmation
        PolicyRule {
            pattern: "delete_*".to_string(),
            action: PolicyAction::Confirm,
            scope: PolicyScope::Global,
            priority: 5,
        },
        PolicyRule {
            pattern: "force_push".to_string(),
            action: PolicyAction::Confirm,
            scope: PolicyScope::Global,
            priority: 5,
        },
        PolicyRule {
            pattern: "drop_*".to_string(),
            action: PolicyAction::Confirm,
            scope: PolicyScope::Global,
            priority: 5,
        },
        PolicyRule {
            pattern: "reset_*".to_string(),
            action: PolicyAction::Confirm,
            scope: PolicyScope::Global,
            priority: 5,
        },
    ]
}
