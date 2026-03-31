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

    // Future migrations go here:
    // if current_version < 2 { ... PRAGMA user_version = 2; }

    Ok(())
}
