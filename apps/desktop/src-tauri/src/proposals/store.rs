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

pub fn update_proposal_status(
    conn: &Connection,
    id: &str,
    status: &ProposalStatus,
    resolved_at: Option<&str>,
    decision_trace_id: Option<&str>,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE proposals SET status = ?1, resolved_at = ?2, decision_trace_id = ?3 WHERE id = ?4",
        params![status.as_str(), resolved_at, decision_trace_id, id],
    )?;
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
pub fn count_proposals_by_author_session(
    conn: &Connection,
    author: &str,
    session_id: &str,
) -> Result<i64, rusqlite::Error> {
    conn.query_row(
        "SELECT COUNT(*) FROM proposals WHERE author = ?1 AND source != 'automated'
         AND created_at >= (SELECT created_at FROM sessions WHERE id = ?2)",
        params![author, session_id],
        |row| row.get(0),
    )
}

pub fn get_proposal_feed(
    conn: &Connection,
    page: i64,
    per_page: i64,
    filter: &ProposalFilter,
) -> Result<Vec<FeedEntry>, rusqlite::Error> {
    let offset = page * per_page;

    // Build filter clause for proposals
    let mut where_clause = String::from("1=1");
    let mut param_values: Vec<String> = Vec::new();

    if let Some(ref author) = filter.author {
        param_values.push(author.clone());
        where_clause.push_str(&format!(" AND author = ?{}", param_values.len()));
    }
    if let Some(ref pt) = filter.proposal_type {
        param_values.push(pt.clone());
        where_clause.push_str(&format!(" AND proposal_type = ?{}", param_values.len()));
    }
    if let Some(ref status) = filter.status {
        param_values.push(status.clone());
        where_clause.push_str(&format!(" AND status = ?{}", param_values.len()));
    }
    if let Some(ref source) = filter.source {
        param_values.push(source.clone());
        where_clause.push_str(&format!(" AND source = ?{}", param_values.len()));
    }

    // Union query: proposals + responses + decisions, ordered chronologically
    let next_idx = param_values.len() + 1;
    let sql = format!(
        "SELECT 'proposal' AS entry_type, p.id, p.created_at, p.id AS ref_id
         FROM proposals p WHERE {}
         UNION ALL
         SELECT 'response' AS entry_type, r.id, r.created_at, r.proposal_id AS ref_id
         FROM proposal_responses r
         INNER JOIN proposals p ON r.proposal_id = p.id WHERE {}
         UNION ALL
         SELECT 'decision' AS entry_type, d.id, d.created_at, d.proposal_id AS ref_id
         FROM decisions d
         INNER JOIN proposals p ON d.proposal_id = p.id WHERE {}
         ORDER BY created_at DESC
         LIMIT ?{} OFFSET ?{}",
        where_clause, where_clause, where_clause,
        next_idx, next_idx + 1
    );

    // SQLite ?N params are global across UNION ALL — same ?1 in all branches
    // binds to the same value. Only one copy of filter params needed.
    let mut all_params: Vec<String> = param_values;
    all_params.push(per_page.to_string());
    all_params.push(offset.to_string());

    let mut stmt = conn.prepare(&sql)?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = all_params
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();

    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        let entry_type: String = row.get(0)?;
        let id: String = row.get(1)?;
        let ref_id: String = row.get(3)?;
        Ok((entry_type, id, ref_id))
    })?;

    let mut entries = Vec::new();
    for row in rows {
        let (entry_type, id, ref_id) = row?;
        match entry_type.as_str() {
            "proposal" => {
                if let Some(p) = get_proposal(conn, &id)? {
                    entries.push(FeedEntry::ProposalFiled { proposal: p });
                }
            }
            "response" => {
                if let Some(r) = get_response(conn, &id)? {
                    entries.push(FeedEntry::ResponseAdded { response: r });
                }
            }
            "decision" => {
                if let Some(d) = get_decision_by_proposal(conn, &ref_id)? {
                    entries.push(FeedEntry::DecisionMade { decision: d });
                }
            }
            _ => {}
        }
    }

    Ok(entries)
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
        evidence: serde_json::from_str(&evidence_str).unwrap_or_default(),
        status: ProposalStatus::from_str(&status_str)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
        evaluators: serde_json::from_str(&evaluators_str).unwrap_or_default(),
        preconditions: serde_json::from_str(&preconditions_str).unwrap_or_default(),
        verification_steps: serde_json::from_str(&verification_str).unwrap_or_default(),
        fulfills: fulfills_str.and_then(|s| serde_json::from_str(&s).ok()),
        created_at: row.get(15)?,
        resolved_at: row.get(16)?,
        decision_trace_id: row.get(17)?,
    })
}

fn row_to_decision(row: &rusqlite::Row) -> Result<Decision, rusqlite::Error> {
    let outcome_str: Option<String> = row.get(6)?;
    Ok(Decision {
        id: row.get(0)?,
        proposal_id: row.get(1)?,
        resolution: row.get(2)?,
        rationale: row.get(3)?,
        implementing_batch: row.get(4)?,
        outcome_tracking: row.get(5)?,
        outcome: outcome_str.and_then(|s| ProposalOutcome::from_str(&s).ok()),
        created_at: row.get(7)?,
    })
}
