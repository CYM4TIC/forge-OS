use rusqlite::Connection;
use super::schema;

/// Simple version-tracked migration system.
/// Each migration bumps the user_version pragma.
pub fn run(conn: &Connection) -> Result<(), rusqlite::Error> {
    let current_version: i32 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if current_version < 1 {
        conn.execute_batch(schema::SCHEMA_V1)?;
        conn.execute_batch("PRAGMA user_version = 1;")?;
    }

    // Phase 3: KAIROS memory, Swarm mailbox, build state, compaction
    if current_version < 2 {
        conn.execute_batch(schema::SCHEMA_V2)?;
        conn.execute_batch("PRAGMA user_version = 2;")?;
    }

    // Phase 3: Dream consolidation run tracking
    if current_version < 3 {
        conn.execute_batch(schema::SCHEMA_V3)?;
        conn.execute_batch("PRAGMA user_version = 3;")?;
    }

    // Phase 3: Session checkpoints for crash recovery
    if current_version < 4 {
        conn.execute_batch(schema::SCHEMA_V4)?;
        conn.execute_batch("PRAGMA user_version = 4;")?;
    }

    // Phase 3: Agent dispatch audit trail
    if current_version < 5 {
        conn.execute_batch(schema::SCHEMA_V5)?;
        conn.execute_batch("PRAGMA user_version = 5;")?;
    }

    // Phase 4: Tool result TTL tracking
    if current_version < 6 {
        conn.execute_batch(schema::SCHEMA_V6)?;
        conn.execute_batch("PRAGMA user_version = 6;")?;
    }

    // Phase 4: FTS5 full-text search on messages
    if current_version < 7 {
        // Populate FTS5 index from existing messages
        conn.execute_batch(schema::SCHEMA_V7)?;
        conn.execute_batch(
            "INSERT INTO messages_fts(rowid, content, role, session_id) SELECT rowid, content, role, session_id FROM messages;"
        )?;
        conn.execute_batch("PRAGMA user_version = 7;")?;
    }

    // Phase 4: Atomic task checkout on findings
    if current_version < 8 {
        conn.execute_batch(schema::SCHEMA_V8)?;
        conn.execute_batch("PRAGMA user_version = 8;")?;
    }

    // Phase 4: Window manager layout persistence
    if current_version < 9 {
        conn.execute_batch(schema::SCHEMA_V9)?;
        conn.execute_batch("PRAGMA user_version = 9;")?;
    }

    // Phase 5: HUD findings — persistent findings store
    if current_version < 10 {
        conn.execute_batch(schema::SCHEMA_V10)?;
        conn.execute_batch("PRAGMA user_version = 10;")?;
    }

    // Cleanup: drop orphaned V1 tables (panel_layout, agent_state)
    if current_version < 11 {
        conn.execute_batch(schema::SCHEMA_V11)?;
        conn.execute_batch("PRAGMA user_version = 11;")?;
    }

    // Phase 6: Service health check configuration
    if current_version < 12 {
        conn.execute_batch(schema::SCHEMA_V12)?;
        conn.execute_batch("PRAGMA user_version = 12;")?;
    }

    // Phase 7: Proposal store + decisions
    if current_version < 13 {
        conn.execute_batch(schema::SCHEMA_V13)?;
        conn.execute_batch("PRAGMA user_version = 13;")?;
    }

    // Phase 7: Dismissals table for proposal deprioritization
    if current_version < 14 {
        conn.execute_batch(schema::SCHEMA_V14)?;
        conn.execute_batch("PRAGMA user_version = 14;")?;
    }

    // P7-N: Permission rules for layered access control
    if current_version < 15 {
        conn.execute_batch(schema::SCHEMA_V15)?;
        conn.execute_batch("PRAGMA user_version = 15;")?;
    }

    Ok(())
}
