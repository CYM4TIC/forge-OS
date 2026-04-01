use rusqlite::Connection;

use super::batches;
use super::findings;
use super::risks;

/// Generate BOOT.md content from SQLite build state.
/// BOOT.md becomes a generated view — SQLite is the source of truth.
pub fn generate_boot_md(conn: &Connection) -> Result<String, rusqlite::Error> {
    let all_batches = batches::list_batches(conn)?;
    let open_findings = findings::list_open_findings(conn)?;
    let open_risks = risks::list_risks(conn, false)?;
    let severity_counts = findings::count_by_severity(conn, None)?;

    let completed = all_batches.iter().filter(|b| b.status == "complete").count();
    let in_progress = all_batches.iter().filter(|b| b.status == "in_progress").count();
    let blocked = all_batches.iter().filter(|b| b.status == "blocked").count();
    let total = all_batches.len();

    let last_completed = all_batches
        .iter()
        .filter(|b| b.status == "complete")
        .max_by_key(|b| &b.completed_at);

    let current_batch = all_batches
        .iter()
        .find(|b| b.status == "in_progress");

    let mut md = String::new();

    // Header
    md.push_str("# Build State (Generated)\n\n");
    md.push_str("> Auto-generated from SQLite build state. Do not edit directly.\n\n");

    // Summary
    md.push_str("## Current Position\n\n");
    if let Some(batch) = current_batch {
        md.push_str(&format!("- **Current batch:** {} (in progress)\n", batch.batch_id));
    }
    if let Some(batch) = last_completed {
        md.push_str(&format!("- **Last completed:** {} ({})\n",
            batch.batch_id,
            batch.completed_at.as_deref().unwrap_or("unknown"),
        ));
    }
    md.push_str(&format!("- **Progress:** {}/{} batches complete", completed, total));
    if in_progress > 0 {
        md.push_str(&format!(", {} in progress", in_progress));
    }
    if blocked > 0 {
        md.push_str(&format!(", {} blocked", blocked));
    }
    md.push('\n');

    // Findings summary
    md.push_str("\n## Findings Summary\n\n");
    md.push_str(&format!(
        "| Severity | Count |\n|---|---|\n| Critical | {} |\n| High | {} |\n| Medium | {} |\n| Low | {} |\n| Info | {} |\n",
        severity_counts.critical, severity_counts.high, severity_counts.medium, severity_counts.low, severity_counts.info,
    ));

    // Open findings
    if !open_findings.is_empty() {
        md.push_str(&format!("\n## Open Findings ({})\n\n", open_findings.len()));
        for f in &open_findings {
            md.push_str(&format!(
                "- **[{}] {}** — {} ({})\n",
                f.severity.to_uppercase(),
                f.agent_slug,
                f.description,
                f.batch_ref.as_deref().unwrap_or("no batch"),
            ));
        }
    }

    // Open risks
    if !open_risks.is_empty() {
        md.push_str(&format!("\n## Open Risks ({})\n\n", open_risks.len()));
        for r in &open_risks {
            md.push_str(&format!(
                "- **[{}]** {} (from {})\n",
                r.severity.to_uppercase(),
                r.description,
                r.batch_id.as_deref().unwrap_or("unknown"),
            ));
        }
    }

    // Recent batches
    md.push_str("\n## Recent Batches\n\n");
    md.push_str("| Batch | Status | Findings | Completed |\n|---|---|---|---|\n");
    for batch in all_batches.iter().take(20) {
        md.push_str(&format!(
            "| {} | {} | {} | {} |\n",
            batch.batch_id,
            batch.status,
            batch.findings_count,
            batch.completed_at.as_deref().unwrap_or("-"),
        ));
    }

    // Last handoff
    if let Some(batch) = last_completed {
        if let Some(ref handoff) = batch.handoff {
            md.push_str("\n## Last Handoff\n\n");
            md.push_str(handoff);
            md.push('\n');
        }
    }

    Ok(md)
}
