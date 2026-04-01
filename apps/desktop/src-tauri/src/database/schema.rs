/// All CREATE TABLE statements for the Forge OS local database.
/// These are executed in order by the migration system.
pub const SCHEMA_V1: &str = r#"
BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Session',
    agent_id TEXT,
    provider_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    provider TEXT,
    tokens_in INTEGER,
    tokens_out INTEGER,
    status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('pending', 'streaming', 'complete', 'error')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS panel_layout (
    id TEXT PRIMARY KEY NOT NULL,
    config_json TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS agent_state (
    id TEXT PRIMARY KEY NOT NULL,
    agent_slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'dispatched', 'error')),
    last_active TEXT,
    model_tier TEXT NOT NULL DEFAULT 'medium' CHECK (model_tier IN ('high', 'medium', 'fast')),
    metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    agent_slug TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'deferred', 'wont_fix')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_findings_session_id ON findings(session_id);
CREATE INDEX IF NOT EXISTS idx_findings_agent_slug ON findings(agent_slug);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
CREATE INDEX IF NOT EXISTS idx_agent_state_slug ON agent_state(agent_slug);
COMMIT;
"#;

/// Phase 3 schema additions: KAIROS memory, Swarm mailbox, build state, compaction.
/// Applied as v2 migration on top of existing v1 tables.
pub const SCHEMA_V2: &str = r#"
BEGIN IMMEDIATE;
-- KAIROS daily-log memory: append-only persona observations
CREATE TABLE IF NOT EXISTS memory_logs (
    id TEXT PRIMARY KEY NOT NULL,
    persona_id TEXT NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('user', 'feedback', 'project', 'reference')),
    content TEXT NOT NULL,
    log_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Consolidated knowledge from dream cycles
CREATE TABLE IF NOT EXISTS memory_topics (
    id TEXT PRIMARY KEY NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('user', 'feedback', 'project', 'reference')),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Swarm inter-agent message bus
CREATE TABLE IF NOT EXISTS mailbox (
    id TEXT PRIMARY KEY NOT NULL,
    from_agent TEXT NOT NULL,
    to_agent TEXT NOT NULL,
    msg_type TEXT NOT NULL CHECK (msg_type IN ('permission_request', 'permission_response', 'idle_notification', 'shutdown_signal', 'direct_message')),
    payload TEXT NOT NULL DEFAULT '{}',
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Build state: batch lifecycle (replaces BOOT.md as source of truth)
CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    batch_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete', 'blocked')),
    started_at TEXT,
    completed_at TEXT,
    findings_count INTEGER NOT NULL DEFAULT 0,
    files_modified TEXT NOT NULL DEFAULT '[]',
    handoff TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Open risks with lifecycle tracking
CREATE TABLE IF NOT EXISTS risks (
    id TEXT PRIMARY KEY NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    batch_id TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Compaction summaries for context restoration
CREATE TABLE IF NOT EXISTS session_summaries (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    summary_type TEXT NOT NULL DEFAULT 'base' CHECK (summary_type IN ('base', 'partial', 'partial_up_to')),
    content TEXT NOT NULL,
    token_count INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- v2 indexes
CREATE INDEX IF NOT EXISTS idx_memory_logs_persona ON memory_logs(persona_id);
CREATE INDEX IF NOT EXISTS idx_memory_logs_date ON memory_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_memory_logs_type ON memory_logs(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_topics_type ON memory_topics(memory_type);
CREATE INDEX IF NOT EXISTS idx_mailbox_to_agent ON mailbox(to_agent);
CREATE INDEX IF NOT EXISTS idx_mailbox_unread ON mailbox(to_agent, is_read) WHERE is_read = 0;
CREATE INDEX IF NOT EXISTS idx_batches_batch_id ON batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity);
CREATE INDEX IF NOT EXISTS idx_session_summaries_session ON session_summaries(session_id);

-- Extend findings with batch reference (nullable for v1 compatibility)
ALTER TABLE findings ADD COLUMN batch_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_findings_batch_ref ON findings(batch_ref);
COMMIT;
"#;

/// Phase 3 schema v3: Dream consolidation run tracking.
pub const SCHEMA_V3: &str = r#"
BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS dream_runs (
    id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'complete', 'failed')),
    topics_created INTEGER NOT NULL DEFAULT 0,
    topics_updated INTEGER NOT NULL DEFAULT 0,
    topics_pruned INTEGER NOT NULL DEFAULT 0,
    logs_processed INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_dream_runs_status ON dream_runs(status);
CREATE INDEX IF NOT EXISTS idx_dream_runs_started ON dream_runs(started_at);
COMMIT;
"#;

/// Phase 3 schema v4: Session checkpoints for crash recovery.
pub const SCHEMA_V4: &str = r#"
BEGIN IMMEDIATE;
-- Session checkpoints: snapshot after each message for crash recovery
CREATE TABLE IF NOT EXISTS session_checkpoints (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    message_count INTEGER NOT NULL,
    last_message_id TEXT,
    context_tokens INTEGER,
    checkpoint_data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_session_checkpoints_session ON session_checkpoints(session_id);

-- Only keep the most recent checkpoint per session (old ones cleaned up by application)
COMMIT;
"#;

/// Phase 3 schema v5: Agent dispatch audit trail.
/// Persists lifecycle events so dispatch history survives process crashes.
pub const SCHEMA_V5: &str = r#"
BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS dispatch_events (
    id TEXT PRIMARY KEY NOT NULL,
    dispatch_id TEXT NOT NULL,
    agent_slug TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('registered', 'running', 'complete', 'error', 'timeout', 'cancelled')),
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_dispatch_events_dispatch_id ON dispatch_events(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_agent_slug ON dispatch_events(agent_slug);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_type ON dispatch_events(event_type);
COMMIT;
"#;
