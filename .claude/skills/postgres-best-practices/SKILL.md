---
name: postgres-best-practices
description: "Use when writing SQL queries, creating migrations, designing schemas, or reviewing database code. Enhances Kehinde (Systems Architecture) persona."
risk: safe
source: adapted from Antigravity postgres skill
date_added: 2026-03-31
persona: kehinde
---

# Postgres Best Practices

> Comprehensive rules for query performance, connection management, security, and schema design.
> Activated automatically when Kehinde boots on projects with Postgres/Supabase.

---

## 1. Query Performance

### Use Indexes Effectively
- **Always** add indexes on columns used in WHERE, JOIN, and ORDER BY clauses
- Use `EXPLAIN ANALYZE` to verify index usage — if you see `Seq Scan` on a table with >1000 rows, investigate
- Prefer partial indexes when filtering on a subset: `CREATE INDEX idx_active_users ON users(email) WHERE is_active = true`
- Composite indexes: put the most selective column first. Order matters for B-tree.
- **Never** use functions on indexed columns in WHERE: `WHERE LOWER(email) = 'x'` won't use a standard index. Use expression indexes or `citext` instead.

### Avoid N+1 Queries
- Use JOINs or subqueries instead of looping queries from application code
- For RPCs returning nested data, use `json_agg()` with lateral joins rather than multiple round-trips
- Batch operations: `INSERT INTO ... SELECT` or `unnest()` for multi-row inserts

### Pagination
- **Never** use `OFFSET` for deep pagination (scans and discards rows)
- Use keyset/cursor pagination: `WHERE id > $last_seen_id ORDER BY id LIMIT $page_size`
- For total counts, use `COUNT(*) OVER()` in the same query or cache the count

### Query Patterns
- Use `EXISTS` instead of `COUNT(*) > 0` for existence checks
- Use `SELECT 1` in EXISTS subqueries (the column value doesn't matter)
- Avoid `SELECT *` in production queries — list explicit columns
- Use CTEs for readability but know they're optimization fences in PG < 12. In PG 12+, the planner may inline them.

---

## 2. Connection Management

### Connection Pooling
- **Always** use a connection pooler (PgBouncer, Supavisor) in production
- Set pool size = `(2 * CPU cores) + effective_spindle_count` as starting point
- Transaction mode pooling for web apps. Session mode only when using PREPARE or temp tables.
- **Never** hold connections open during long-running application logic (fetch, compute, then write — not fetch-hold-compute-write)

### Timeouts
- Set `statement_timeout` on roles: `ALTER ROLE app_user SET statement_timeout = '30s'`
- Use `lock_timeout` to prevent indefinite lock waits: `SET lock_timeout = '10s'`
- For long migrations, temporarily increase timeouts within the transaction

---

## 3. Security & RLS

### Row Level Security
- **Always** enable RLS on tables with tenant data: `ALTER TABLE t ENABLE ROW LEVEL SECURITY`
- Write policies for ALL operations (SELECT, INSERT, UPDATE, DELETE) — missing policies = implicit deny
- Test RLS by switching roles: `SET ROLE authenticated; SET request.jwt.claims = '...'`
- **Never** use `USING (true)` in production — it grants unrestricted access. Use it only during development scaffolding and track it for replacement.
- `SECURITY DEFINER` functions bypass RLS — audit every one. Document why it's needed.

### Auth Patterns
- Extract tenant ID from JWT: `auth.uid()` or `(current_setting('request.jwt.claims', true)::json->>'sub')::uuid`
- Validate ownership in RPCs: `IF auth.uid() != record.owner_id THEN RAISE EXCEPTION`
- **Never** trust client-supplied IDs for authorization — always verify against JWT claims
- Use `search_path = public, extensions` on all functions to prevent schema injection

### Secrets
- Store API keys in `vault.secrets`, not in regular tables
- Use `app.settings.*` for runtime config that functions need
- **Never** return secrets in RPC responses. Select only the columns you need.

---

## 4. Schema Design

### Naming Conventions
- Tables: `snake_case`, plural (`users`, `invoices`)
- Columns: `snake_case` (`created_at`, `is_active`, `owner_id`)
- Boolean columns: `is_` or `has_` prefix (`is_active`, `has_consent`)
- Timestamp columns: `_at` suffix for events (`created_at`, `paid_at`, `deleted_at`)
- Foreign keys: `{referenced_table_singular}_id` (`user_id`, `team_id`)
- Indexes: `idx_{table}_{columns}` (`idx_users_email`)

### Types
- Use `uuid` for primary keys (not serial/bigserial) — prevents enumeration
- Use `timestamptz` (not `timestamp`) — always store with timezone
- Use `numeric` for money (not `float` or `double precision`) — floating point errors are unacceptable in financial calculations
- Use `text` instead of `varchar(n)` unless you have a specific length constraint
- Use `jsonb` over `json` — it's indexable and faster for most operations

### Constraints
- **Always** add NOT NULL unless the column is genuinely optional
- Use CHECK constraints for enums: `CHECK (status IN ('active', 'inactive', 'suspended'))`
- Add foreign keys with appropriate ON DELETE behavior (RESTRICT is safest default)
- Use composite unique constraints where business rules require them

### Migrations
- One concern per migration file. Don't mix schema changes with data migrations.
- **Always** make migrations reversible (include both up and down)
- Use `CREATE INDEX CONCURRENTLY` for large tables (prevents table lock)
- Test migrations against a copy of production data before applying

---

## 5. Functions & RPCs

### Function Patterns
- Use `RETURNS TABLE(...)` for multi-row results, not `SETOF record`
- Use `LANGUAGE sql` for simple queries (planner can optimize better)
- Use `LANGUAGE plpgsql` when you need variables, conditionals, or loops
- Mark read-only functions as `STABLE` or `IMMUTABLE` where appropriate
- Use `STRICT` to auto-return NULL when any argument is NULL

### Error Handling
- Use `RAISE EXCEPTION` with meaningful messages and error codes
- Use `SQLSTATE` codes: `RAISE EXCEPTION 'Not found' USING ERRCODE = 'P0002'`
- Catch specific exceptions, never bare `EXCEPTION WHEN OTHERS`
- Log errors to a dedicated table if you need audit trails

### Testing
- Write verification SQL BEFORE the function — if you can't express "correct" in SQL, don't build yet
- Test edge cases: NULL inputs, empty results, permission denied, concurrent access
- Verify return shapes match what the application destructures

---

## 6. Performance Monitoring

### Key Queries
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;

-- Find missing indexes
SELECT relname, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 100 AND idx_scan < seq_scan ORDER BY seq_scan DESC;

-- Find bloated tables
SELECT schemaname, relname, n_live_tup, n_dead_tup,
  round(n_dead_tup::numeric / GREATEST(n_live_tup, 1) * 100, 1) AS dead_pct
FROM pg_stat_user_tables WHERE n_dead_tup > 1000 ORDER BY n_dead_tup DESC;

-- Check index usage
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes ORDER BY idx_scan ASC LIMIT 20;
```

### Maintenance
- Run `ANALYZE` after bulk data changes to update statistics
- Monitor `pg_stat_user_tables.last_autoanalyze` to ensure autovacuum is running
- Set appropriate `autovacuum_vacuum_scale_factor` for high-write tables

---

## When This Skill Activates

- Kehinde boots on a project with Postgres/Supabase in the stack
- Any agent writes a migration or SQL query
- Schema drift or race condition sub-agents run
- Migration validator checks proposed DDL
