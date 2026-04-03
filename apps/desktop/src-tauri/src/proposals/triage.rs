use crate::proposals::store::Proposal;

/// Domain-to-evaluator mapping table.
/// Maps proposal scope keywords to the persona slugs responsible for evaluation.
/// Security → tanaka, UX → mara, Architecture → kehinde, Design → riven,
/// Financial → vane, Legal → voss, Cross-cutting → council orchestrator.
const SCOPE_EVALUATOR_MAP: &[(&[&str], &[&str])] = &[
    (&["security", "auth", "rls", "credential", "encryption", "pii", "vulnerability", "xss", "injection"], &["tanaka"]),
    (&["ux", "usability", "accessibility", "a11y", "responsive", "mobile", "touch", "screen-reader"], &["mara"]),
    (&["architecture", "schema", "migration", "state", "dispatch", "runtime", "systems", "infra"], &["kehinde"]),
    (&["design", "token", "component", "ui", "layout", "css", "theme", "dark-mode", "visual"], &["riven"]),
    (&["financial", "payment", "stripe", "billing", "rate", "pricing", "invoice", "revenue"], &["vane"]),
    (&["legal", "compliance", "tcpa", "tos", "consent", "gdpr", "privacy", "regulation"], &["voss"]),
    (&["performance", "latency", "memory", "cpu", "profiling", "optimization", "bundle"], &["kehinde"]),
    (&["copy", "brand", "voice", "tone", "messaging", "string", "label", "i18n"], &["sable"]),
    (&["growth", "pricing", "tier", "competitive", "onboarding", "activation", "retention"], &["calloway"]),
];

/// Auto-assign evaluators based on proposal scope and target.
///
/// Scans the proposal's `scope` and `target` fields against a domain keyword table.
/// Returns deduplicated persona slugs. Falls back to `["council"]` for cross-cutting
/// proposals that match no specific domain or match 3+ domains.
pub fn auto_assign_evaluators(proposal: &Proposal) -> Vec<String> {
    let scope_lower = proposal.scope.to_lowercase();
    let target_lower = proposal.target.to_lowercase();
    let combined = format!("{} {}", scope_lower, target_lower);
    // Split into words for exact token matching (no substring false positives)
    let words: Vec<&str> = combined.split_whitespace().collect();

    let mut matched: Vec<&str> = Vec::new();

    for (keywords, evaluators) in SCOPE_EVALUATOR_MAP {
        let hit = keywords.iter().any(|kw| words.iter().any(|w| w == kw));
        if hit {
            for ev in *evaluators {
                if !matched.contains(ev) {
                    matched.push(ev);
                }
            }
        }
    }

    // Cross-cutting: 0 matches or 3+ distinct evaluators → escalate to council
    if matched.is_empty() || matched.len() >= 3 {
        return vec!["council".to_string()];
    }

    matched.into_iter().map(|s| s.to_string()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::proposals::store::{Proposal, ProposalSource, ProposalStatus, ProposalType};

    fn test_proposal(scope: &str, target: &str) -> Proposal {
        Proposal {
            id: "test".to_string(),
            author: "nyx".to_string(),
            source: ProposalSource::Persona,
            proposal_type: ProposalType::Optimization,
            scope: scope.to_string(),
            target: target.to_string(),
            severity: "medium".to_string(),
            title: "Test".to_string(),
            body: "Test body".to_string(),
            evidence: vec![],
            status: ProposalStatus::Open,
            evaluators: vec![],
            preconditions: vec![],
            verification_steps: vec![],
            fulfills: None,
            created_at: String::new(),
            resolved_at: None,
            decision_trace_id: None,
        }
    }

    #[test]
    fn security_scope_assigns_tanaka() {
        let p = test_proposal("security", "auth module");
        assert_eq!(auto_assign_evaluators(&p), vec!["tanaka"]);
    }

    #[test]
    fn ux_scope_assigns_mara() {
        let p = test_proposal("ux", "accessibility audit");
        assert_eq!(auto_assign_evaluators(&p), vec!["mara"]);
    }

    #[test]
    fn cross_cutting_assigns_council() {
        let p = test_proposal("general", "everything");
        assert_eq!(auto_assign_evaluators(&p), vec!["council"]);
    }

    #[test]
    fn many_domains_assigns_council() {
        let p = test_proposal("security ux design", "auth component token");
        assert_eq!(auto_assign_evaluators(&p), vec!["council"]);
    }
}
