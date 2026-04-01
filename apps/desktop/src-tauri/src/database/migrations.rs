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

    Ok(())
}
