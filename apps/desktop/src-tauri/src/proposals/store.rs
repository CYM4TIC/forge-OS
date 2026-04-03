use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

// ── Enums ──

/// Proposal lifecycle status.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProposalStatus {
    Open,
    Evaluating,
    Accepted,
    Rejected,
}

impl ProposalStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Evaluating => "evaluating",
            Self::Accepted => "accepted",
            Self::Rejected => "rejected",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "open" => Ok(Self::Open),
            "evaluating" => Ok(Self::Evaluating),
            "accepted" => Ok(Self::Accepted),
            "rejected" => Ok(Self::Rejected),
            _ => Err(format!("Invalid proposal status: {}", s)),
        }
    }
}

/// Who filed the proposal.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProposalSource {
    Persona,
    Automated,
    Consortium,
}

impl ProposalSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Persona => "persona",
            Self::Automated => "automated",
            Self::Consortium => "consortium",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "persona" => Ok(Self::Persona),
            "automated" => Ok(Self::Automated),
            "consortium" => Ok(Self::Consortium),
            _ => Err(format!("Invalid proposal source: {}", s)),
        }
    }
}

/// What kind of change the proposal recommends.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProposalType {
    Optimization,
    Pattern,
    Rule,
    Architecture,
    Skill,
    Policy,
}

impl ProposalType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Optimization => "optimization",
            Self::Pattern => "pattern",
            Self::Rule => "rule",
            Self::Architecture => "architecture",
            Self::Skill => "skill",
            Self::Policy => "policy",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "optimization" => Ok(Self::Optimization),
            "pattern" => Ok(Self::Pattern),
            "rule" => Ok(Self::Rule),
            "architecture" => Ok(Self::Architecture),
            "skill" => Ok(Self::Skill),
            "policy" => Ok(Self::Policy),
            _ => Err(format!("Invalid proposal type: {}", s)),
        }
    }
}

/// Implementation outcome (from Factory-AI FeatureSuccessState).
/// Tracks quality of implementation after acceptance.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProposalOutcome {
    /// Fully implemented, all verification_steps pass.
    Success,
    /// Accepted and partially implemented (verification incomplete).
    Partial,
    /// Implementation failed or reverted.
    Failure,
}

impl ProposalOutcome {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::Partial => "partial",
            Self::Failure => "failure",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "success" => Ok(Self::Success),
            "partial" => Ok(Self::Partial),
            "failure" => Ok(Self::Failure),
            _ => Err(format!("Invalid proposal outcome: {}", s)),
        }
    }
}

/// Why a proposal was dismissed rather than resolved (from Factory-AI DismissalRecord pattern).
/// Distinct from rejection: rejection = "evaluated and declined."
/// Dismissal = "acknowledged but deprioritized with documented reasoning."
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DismissalType {
    /// A new issue was discovered that supersedes this proposal.
    DiscoveredIssue,
    /// Critical context emerged that invalidates the proposal premise.
    CriticalContext,
    /// Work was started but cannot be completed in current scope.
    IncompleteWork,
}

impl DismissalType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::DiscoveredIssue => "discovered_issue",
            Self::CriticalContext => "critical_context",
            Self::IncompleteWork => "incomplete_work",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "discovered_issue" => Ok(Self::DiscoveredIssue),
            "critical_context" => Ok(Self::CriticalContext),
            "incomplete_work" => Ok(Self::IncompleteWork),
            _ => Err(format!("Invalid dismissal type: {}", s)),
        }
    }
}

/// A dismissal record — paper trail for deprioritized proposals.
/// Every dismissed item has explicit justification. No silent drops.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DismissalRecord {
    pub id: String,
    pub proposal_id: String,
    pub dismissal_type: DismissalType,
    pub summary: String,
    pub justification: String,
    pub created_at: String,
}

/// Mission-level state machine (from Factory-AI 6-state orchestrator lifecycle).
/// Separated from AgentWorkingState (P7-D) — mission state drives orchestration
/// (worker dispatch, milestone gates), agent state drives UI (spinners, permission dialogs).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MissionState {
    /// Waiting for operator input or proposal filing.
    AwaitingInput,
    /// Setting up dispatch context, loading agent kernels.
    Initializing,
    /// Active execution — agents dispatched, work in progress.
    Running,
    /// Execution paused — awaiting confirmation, blocked on dependency, or operator hold.
    Paused,
    /// Orchestrator processing results — evaluating gate output, synthesizing decisions.
    OrchestratorTurn,
    /// All work complete — gate passed, findings resolved, BOOT.md written.
    Completed,
}

impl Default for MissionState {
    fn default() -> Self {
        Self::AwaitingInput
    }
}

impl MissionState {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::AwaitingInput => "awaiting_input",
            Self::Initializing => "initializing",
            Self::Running => "running",
            Self::Paused => "paused",
            Self::OrchestratorTurn => "orchestrator_turn",
            Self::Completed => "completed",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "awaiting_input" => Ok(Self::AwaitingInput),
            "initializing" => Ok(Self::Initializing),
            "running" => Ok(Self::Running),
            "paused" => Ok(Self::Paused),
            "orchestrator_turn" => Ok(Self::OrchestratorTurn),
            "completed" => Ok(Self::Completed),
            _ => Err(format!("Invalid mission state: {}", s)),
        }
    }

    /// Valid mission state transitions (P-MED-2 fix).
    /// Directed graph: AwaitingInput→Initializing, Initializing→Running,
    /// Running→{Paused,OrchestratorTurn,Completed}, Paused→Running,
    /// OrchestratorTurn→{Running,Completed}.
    pub fn valid_transition(&self, to: &MissionState) -> bool {
        matches!(
            (self, to),
            (Self::AwaitingInput, Self::Initializing)
                | (Self::Initializing, Self::Running)
                | (Self::Running, Self::Paused)
                | (Self::Running, Self::OrchestratorTurn)
                | (Self::Running, Self::Completed)
                | (Self::Paused, Self::Running)
                | (Self::OrchestratorTurn, Self::Running)
                | (Self::OrchestratorTurn, Self::Completed)
        )
    }
}

// ── Row structs ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    pub id: String,
    pub author: String,
    pub source: ProposalSource,
    pub proposal_type: ProposalType,
    pub scope: String,
    pub target: String,
    pub severity: String,
    pub title: String,
    pub body: String,
    pub evidence: Vec<String>,
    pub status: ProposalStatus,
    pub evaluators: Vec<String>,
    pub preconditions: Vec<String>,
    pub verification_steps: Vec<String>,
    pub fulfills: Option<Vec<String>>,
    pub created_at: String,
    pub resolved_at: Option<String>,
    pub decision_trace_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalResponse {
    pub id: String,
    pub proposal_id: String,
    pub author: String,
    pub body: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Decision {
    pub id: String,
    pub proposal_id: String,
    pub resolution: String,
    pub rationale: String,
    pub implementing_batch: Option<String>,
    pub outcome_tracking: Option<String>,
    pub outcome: Option<ProposalOutcome>,
    pub created_at: String,
}

/// Paginated feed entry — union of proposal events.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "entry_type", rename_all = "snake_case")]
pub enum FeedEntry {
    ProposalFiled { proposal: Proposal },
    ResponseAdded { response: ProposalResponse },
    DecisionMade { decision: Decision },
    ProposalDismissed { dismissal: DismissalRecord },
}

// ── Filter ──

#[derive(Debug, Clone, Default, Deserialize)]
pub struct ProposalFilter {
    pub author: Option<String>,
    pub proposal_type: Option<String>,
    pub status: Option<String>,
    pub source: Option<String>,
}

// ── Query functions ──

pub fn create_proposal(conn: &Connection, proposal: &Proposal) -> Result<(), rusqlite::Error> {
    let evidence_json = serde_json::to_string(&proposal.evidence).unwrap_or_else(|_| "[]".to_string());
    let evaluators_json = serde_json::to_string(&proposal.evaluators).unwrap_or_else(|_| "[]".to_string());
    let preconditions_json = serde_json::to_string(&proposal.preconditions).unwrap_or_else(|_| "[]".to_string());
    let verification_json = serde_json::to_string(&proposal.verification_steps).unwrap_or_else(|_| "[]".to_string());
    let fulfills_json = proposal.fulfills.as_ref()
        .map(|f| serde_json::to_string(f).unwrap_or_else(|_| "[]".to_string()));

    conn.execute(
        "INSERT INTO proposals (id, author, source, proposal_type, scope, target, severity, title, body, evidence, status, evaluators, preconditions, verification_steps, fulfills)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![
            proposal.id,
            proposal.author,
            proposal.source.as_str(),
            proposal.proposal_type.as_str(),
            proposal.scope,
            proposal.target,
            proposal.severity,
            proposal.title,
            proposal.body,
            evidence_json,
            proposal.status.as_str(),
            evaluators_json,
            preconditions_json,
            verification_json,
            fulfills_json,
        ],
    )?;
    Ok(())
}

pub fn get_proposal(conn: &Connection, id: &str) -> Result<Option<Proposal>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, author, source, proposal_type, scope, target, severity, title, body, evidence, status, evaluators, preconditions, verification_steps, fulfills, created_at, resolved_at, decision_trace_id
         FROM proposals WHERE id = ?1"
    )?;
    let mut rows = stmt.query_map(params![id], row_to_proposal)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn list_proposals(conn: &Connection, filter: &ProposalFilter) -> Result<Vec<Proposal>, rusqlite::Error> {
    let mut sql = String::from(
        "SELECT id, author, source, proposal_type, scope, target, severity, title, body, evidence, status, evaluators, preconditions, verification_steps, fulfills, created_at, resolved_at, decision_trace_id
         FROM proposals WHERE 1=1"
    );
    let mut param_values: Vec<String> = Vec::new();

    if let Some(ref author) = filter.author {
        param_values.push(author.clone());
        sql.push_str(&format!(" AND author = ?{}", param_values.len()));
    }
    if let Some(ref pt) = filter.proposal_type {
        param_values.push(pt.clone());
        sql.push_str(&format!(" AND proposal_type = ?{}", param_values.len()));
    }
    if let Some(ref status) = filter.status {
        param_values.push(status.clone());
        sql.push_str(&format!(" AND status = ?{}", param_values.len()));
    }
    if let Some(ref source) = filter.source {
        param_values.push(source.clone());
        sql.push_str(&format!(" AND source = ?{}", param_values.len()));
    }

    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();
    let rows = stmt.query_map(param_refs.as_slice(), row_to_proposal)?;
    rows.collect()
}

/// Valid proposal status transitions (P-HIGH-4 fix).
/// Open -> Evaluating, Evaluating -> Accepted|Rejected. No backwards transitions.
pub fn valid_status_transition(from: &ProposalStatus, to: &ProposalStatus) -> bool {
    matches!(
        (from, to),
        (ProposalStatus::Open, ProposalStatus::Evaluating)
            | (ProposalStatus::Evaluating, ProposalStatus::Accepted)
            | (ProposalStatus::Evaluating, ProposalStatus::Rejected)
    )
}

pub fn update_proposal_status(
    conn: &Connection,
    id: &str,
    new_status: &ProposalStatus,
    resolved_at: Option<&str>,
    decision_trace_id: Option<&str>,
) -> Result<(), String> {
    // Read current status to validate transition
    let current = get_proposal(conn, id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Proposal not found: {}", id))?;

    if !valid_status_transition(&current.status, new_status) {
        return Err(format!(
            "Invalid status transition: {} -> {}",
            current.status.as_str(),
            new_status.as_str()
        ));
    }

    conn.execute(
        "UPDATE proposals SET status = ?1, resolved_at = ?2, decision_trace_id = ?3 WHERE id = ?4",
        params![new_status.as_str(), resolved_at, decision_trace_id, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn add_response(conn: &Connection, response: &ProposalResponse) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO proposal_responses (id, proposal_id, author, body) VALUES (?1, ?2, ?3, ?4)",
        params![response.id, response.proposal_id, response.author, response.body],
    )?;
    Ok(())
}

/// Rate limit: max 3 proposals per persona per session (automated exempt).
/// When session_id is provided, counts since session start.
/// When session_id is None, counts proposals in the last hour as fallback.
pub fn count_proposals_by_author(
    conn: &Connection,
    author: &str,
    session_id: Option<&str>,
) -> Result<i64, rusqlite::Error> {
    match session_id {
        Some(sid) => conn.query_row(
            "SELECT COUNT(*) FROM proposals WHERE author = ?1 AND source != 'automated'
             AND created_at >= (SELECT created_at FROM sessions WHERE id = ?2)",
            params![author, sid],
            |row| row.get(0),
        ),
        None => conn.query_row(
            "SELECT COUNT(*) FROM proposals WHERE author = ?1 AND source != 'automated'
             AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour')",
            params![author],
            |row| row.get(0),
        ),
    }
}

pub fn get_proposal_feed(
    conn: &Connection,
    page: i64,
    per_page: i64,
    filter: &ProposalFilter,
) -> Result<Vec<FeedEntry>, rusqlite::Error> {
    // Three separate queries returning full rows — no N+1 re-fetch.
    // Over-fetch per_page from each type, merge, sort, take page slice.
    let fetch_limit = (page + 1) * per_page;

    // 1. Proposals (full rows, filtered)
    let proposals = list_proposals(conn, filter)?;

    // 2. Responses (joined to filtered proposals)
    let mut response_sql = String::from(
        "SELECT r.id, r.proposal_id, r.author, r.body, r.created_at
         FROM proposal_responses r
         INNER JOIN proposals p ON r.proposal_id = p.id WHERE 1=1"
    );
    let mut r_params: Vec<String> = Vec::new();
    if let Some(ref author) = filter.author {
        r_params.push(author.clone());
        response_sql.push_str(&format!(" AND p.author = ?{}", r_params.len()));
    }
    if let Some(ref pt) = filter.proposal_type {
        r_params.push(pt.clone());
        response_sql.push_str(&format!(" AND p.proposal_type = ?{}", r_params.len()));
    }
    if let Some(ref status) = filter.status {
        r_params.push(status.clone());
        response_sql.push_str(&format!(" AND p.status = ?{}", r_params.len()));
    }
    if let Some(ref source) = filter.source {
        r_params.push(source.clone());
        response_sql.push_str(&format!(" AND p.source = ?{}", r_params.len()));
    }
    response_sql.push_str(" ORDER BY r.created_at DESC");

    let mut r_stmt = conn.prepare(&response_sql)?;
    let r_refs: Vec<&dyn rusqlite::types::ToSql> = r_params
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();
    let responses: Vec<ProposalResponse> = r_stmt
        .query_map(r_refs.as_slice(), |row| {
            Ok(ProposalResponse {
                id: row.get(0)?,
                proposal_id: row.get(1)?,
                author: row.get(2)?,
                body: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    // 3. Decisions (joined to filtered proposals)
    let mut decision_sql = String::from(
        "SELECT d.id, d.proposal_id, d.resolution, d.rationale, d.implementing_batch, d.outcome_tracking, d.outcome, d.created_at
         FROM decisions d
         INNER JOIN proposals p ON d.proposal_id = p.id WHERE 1=1"
    );
    let mut d_params: Vec<String> = Vec::new();
    if let Some(ref author) = filter.author {
        d_params.push(author.clone());
        decision_sql.push_str(&format!(" AND p.author = ?{}", d_params.len()));
    }
    if let Some(ref pt) = filter.proposal_type {
        d_params.push(pt.clone());
        decision_sql.push_str(&format!(" AND p.proposal_type = ?{}", d_params.len()));
    }
    if let Some(ref status) = filter.status {
        d_params.push(status.clone());
        decision_sql.push_str(&format!(" AND p.status = ?{}", d_params.len()));
    }
    if let Some(ref source) = filter.source {
        d_params.push(source.clone());
        decision_sql.push_str(&format!(" AND p.source = ?{}", d_params.len()));
    }
    decision_sql.push_str(" ORDER BY d.created_at DESC");

    let mut d_stmt = conn.prepare(&decision_sql)?;
    let d_refs: Vec<&dyn rusqlite::types::ToSql> = d_params
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();
    let decisions: Vec<Decision> = d_stmt
        .query_map(d_refs.as_slice(), row_to_decision)?
        .collect::<Result<Vec<_>, _>>()?;

    // 4. Dismissals (joined to filtered proposals)
    let mut dismiss_sql = String::from(
        "SELECT dm.id, dm.proposal_id, dm.dismissal_type, dm.summary, dm.justification, dm.created_at
         FROM dismissals dm
         INNER JOIN proposals p ON dm.proposal_id = p.id WHERE 1=1"
    );
    let mut dm_params: Vec<String> = Vec::new();
    if let Some(ref author) = filter.author {
        dm_params.push(author.clone());
        dismiss_sql.push_str(&format!(" AND p.author = ?{}", dm_params.len()));
    }
    if let Some(ref pt) = filter.proposal_type {
        dm_params.push(pt.clone());
        dismiss_sql.push_str(&format!(" AND p.proposal_type = ?{}", dm_params.len()));
    }
    if let Some(ref status) = filter.status {
        dm_params.push(status.clone());
        dismiss_sql.push_str(&format!(" AND p.status = ?{}", dm_params.len()));
    }
    if let Some(ref source) = filter.source {
        dm_params.push(source.clone());
        dismiss_sql.push_str(&format!(" AND p.source = ?{}", dm_params.len()));
    }
    dismiss_sql.push_str(" ORDER BY dm.created_at DESC");

    let mut dm_stmt = conn.prepare(&dismiss_sql)?;
    let dm_refs: Vec<&dyn rusqlite::types::ToSql> = dm_params
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();
    let dismissals: Vec<DismissalRecord> = dm_stmt
        .query_map(dm_refs.as_slice(), row_to_dismissal)?
        .collect::<Result<Vec<_>, _>>()?;

    // Merge all entries with timestamps, sort chronologically, paginate
    let mut entries: Vec<(String, FeedEntry)> = Vec::new();
    for p in proposals {
        let ts = p.created_at.clone();
        entries.push((ts, FeedEntry::ProposalFiled { proposal: p }));
    }
    for r in responses {
        let ts = r.created_at.clone();
        entries.push((ts, FeedEntry::ResponseAdded { response: r }));
    }
    for d in decisions {
        let ts = d.created_at.clone();
        entries.push((ts, FeedEntry::DecisionMade { decision: d }));
    }
    for dm in dismissals {
        let ts = dm.created_at.clone();
        entries.push((ts, FeedEntry::ProposalDismissed { dismissal: dm }));
    }

    // Sort descending by timestamp (ISO 8601 is lexicographically sortable)
    entries.sort_by(|a, b| b.0.cmp(&a.0));

    // Paginate
    let offset = (page * per_page) as usize;
    let limit = per_page as usize;
    let page_entries: Vec<FeedEntry> = entries
        .into_iter()
        .skip(offset)
        .take(limit)
        .map(|(_, entry)| entry)
        .collect();

    Ok(page_entries)
}

/// Full-text search on proposal title and body.
/// Uses SQLite LIKE for broad matching (FTS5 index not on proposals table).
pub fn search_proposals(
    conn: &Connection,
    query: &str,
) -> Result<Vec<Proposal>, rusqlite::Error> {
    let pattern = format!("%{}%", query);
    let mut stmt = conn.prepare(
        "SELECT id, author, source, proposal_type, scope, target, severity, title, body, evidence, status, evaluators, preconditions, verification_steps, fulfills, created_at, resolved_at, decision_trace_id
         FROM proposals WHERE title LIKE ?1 OR body LIKE ?1 ORDER BY created_at DESC LIMIT 50",
    )?;
    let rows = stmt.query_map(params![pattern], row_to_proposal)?;
    rows.collect()
}

pub fn get_response(conn: &Connection, id: &str) -> Result<Option<ProposalResponse>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, proposal_id, author, body, created_at FROM proposal_responses WHERE id = ?1"
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(ProposalResponse {
            id: row.get(0)?,
            proposal_id: row.get(1)?,
            author: row.get(2)?,
            body: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn get_decision_by_proposal(conn: &Connection, proposal_id: &str) -> Result<Option<Decision>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, proposal_id, resolution, rationale, implementing_batch, outcome_tracking, outcome, created_at
         FROM decisions WHERE proposal_id = ?1 ORDER BY created_at DESC LIMIT 1"
    )?;
    let mut rows = stmt.query_map(params![proposal_id], row_to_decision)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

// ── Row mappers ──

/// Parse a JSON string column into a typed value, propagating errors instead of
/// silently returning defaults. Corrupted JSON surfaces as a query error.
fn parse_json_column<T: serde::de::DeserializeOwned>(
    raw: &str,
    column_name: &str,
) -> Result<T, rusqlite::Error> {
    serde_json::from_str(raw).map_err(|e| {
        rusqlite::Error::InvalidParameterName(format!(
            "Corrupted JSON in column '{}': {}",
            column_name, e
        ))
    })
}

fn row_to_proposal(row: &rusqlite::Row) -> Result<Proposal, rusqlite::Error> {
    let evidence_str: String = row.get(9)?;
    let evaluators_str: String = row.get(11)?;
    let preconditions_str: String = row.get(12)?;
    let verification_str: String = row.get(13)?;
    let fulfills_str: Option<String> = row.get(14)?;
    let source_str: String = row.get(2)?;
    let type_str: String = row.get(3)?;
    let status_str: String = row.get(10)?;

    Ok(Proposal {
        id: row.get(0)?,
        author: row.get(1)?,
        source: ProposalSource::from_str(&source_str)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
        proposal_type: ProposalType::from_str(&type_str)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
        scope: row.get(4)?,
        target: row.get(5)?,
        severity: row.get(6)?,
        title: row.get(7)?,
        body: row.get(8)?,
        evidence: parse_json_column(&evidence_str, "evidence")?,
        status: ProposalStatus::from_str(&status_str)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
        evaluators: parse_json_column(&evaluators_str, "evaluators")?,
        preconditions: parse_json_column(&preconditions_str, "preconditions")?,
        verification_steps: parse_json_column(&verification_str, "verification_steps")?,
        fulfills: match fulfills_str {
            Some(ref s) => Some(parse_json_column(s, "fulfills")?),
            None => None,
        },
        created_at: row.get(15)?,
        resolved_at: row.get(16)?,
        decision_trace_id: row.get(17)?,
    })
}

pub fn row_to_decision(row: &rusqlite::Row) -> Result<Decision, rusqlite::Error> {
    let outcome_str: Option<String> = row.get(6)?;
    Ok(Decision {
        id: row.get(0)?,
        proposal_id: row.get(1)?,
        resolution: row.get(2)?,
        rationale: row.get(3)?,
        implementing_batch: row.get(4)?,
        outcome_tracking: row.get(5)?,
        outcome: match outcome_str {
            Some(ref s) => Some(
                ProposalOutcome::from_str(s)
                    .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
            ),
            None => None,
        },
        created_at: row.get(7)?,
    })
}

fn row_to_dismissal(row: &rusqlite::Row) -> Result<DismissalRecord, rusqlite::Error> {
    let type_str: String = row.get(2)?;
    Ok(DismissalRecord {
        id: row.get(0)?,
        proposal_id: row.get(1)?,
        dismissal_type: DismissalType::from_str(&type_str)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
        summary: row.get(3)?,
        justification: row.get(4)?,
        created_at: row.get(5)?,
    })
}
