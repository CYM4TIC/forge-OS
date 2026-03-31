/// All CREATE TABLE statements for the Forge OS local database.
/// These are executed in order by the migration system.
pub const SCHEMA_V1: &str = r#"
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
"#;
