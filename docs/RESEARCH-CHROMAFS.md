# Research: ChromaFs — Virtual Filesystem for AI Assistants

## Session Date: 2026-04-03
## Participants: Nyx (research session)
## Source: [Mintlify Blog — How We Built a Virtual Filesystem for Our Assistant](https://www.mintlify.com/blog/how-we-built-a-virtual-filesystem-for-our-assistant)

---

## Source Material

- **Author:** Mintlify engineering team
- **Stack:** just-bash (TypeScript bash interpreter) + Chroma vector DB + Redis cache
- **Core thesis:** Replace Docker sandboxes with a virtual filesystem overlay that translates UNIX commands (ls, cat, grep, find) to database queries. Eliminates compute costs at 850K conversations/month.
- **Scale:** 30,000+ conversations/day across hundreds of thousands of users.

---

## Problem Statement

Traditional sandbox approach for documentation AI assistants:
- P90 session creation: ~46 seconds (GitHub clone + setup)
- Annual compute: ~$70K+ for 850K conversations/month (1 vCPU, 2GB RAM, 5-min sessions)
- Latency incompatible with real-time interactions

ChromaFs reduces boot to ~100ms P90, marginal cost to ~$0/conversation (existing DB infrastructure).

---

## Pattern 1: Virtual FS over Indexed Content

**What ChromaFs Does:**
Instead of cloning repos into sandboxes, ChromaFs stores a gzipped JSON path tree in Chroma:
```json
{
  "auth/oauth": { "isPublic": true, "groups": [] },
  "internal/billing": { "isPublic": false, "groups": ["admin", "billing"] }
}
```

Two in-memory structures built from this tree:
- `Set<string>` — all accessible file paths
- `Map<string, string[]>` — directory-to-children mappings

`ls`, `cd`, `find` resolve in **local memory with zero network calls**. Tree cached across sessions.

The `IFileSystem` interface from just-bash is implemented to intercept all filesystem operations and translate them to Chroma queries.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.3 (LightRAG / vault architecture)
- **What we adopt:** The vault as virtual filesystem. Agents navigate vault content with familiar patterns (list, read, search), but it's backed by SQLite/FTS5 + sigil indexes, not disk. The path tree (gzipped JSON) maps to our sigil files — compact indexes that enable zero-cost navigation without loading full content.
- **Key insight:** The agents don't need real files. They need an interface that looks like files. Our vault already stores content in SQLite; exposing it as a filesystem abstraction gives agents the familiar ls/cat/grep mental model while we control access, caching, and mana costs at the interface boundary.

---

## Pattern 2: Two-Stage Grep (DB + In-Memory)

**What ChromaFs Does:**
1. **Coarse filter (Chroma):** Parse grep flags with yargs-parser. Translate fixed strings to `$contains` queries and patterns to `$regex` queries. Returns candidate files.
2. **Bulk prefetch:** Matching chunks cached in Redis.
3. **Fine filter (in-memory):** Rewrite grep command targeting only cached files. Hand back to just-bash for full regex execution.

Large recursive greps complete in milliseconds.

**Forge OS Integration:**
- **Landing zone:** Validates Phase 4, Session 4.0 (FTS5 full-text search)
- **What this validates:** Our FTS5 architecture already does coarse→fine filtering. FTS5 tokenized query narrows candidates, then precise matching runs in-memory on the result set. ChromaFs proves this two-stage pattern works at 30K+ conversations/day scale.
- **Enhancement:** Add Redis-style caching for frequently-accessed vault chunks. When an agent greps the same surface repeatedly during a gate review, cache the chunks after first fetch.

---

## Pattern 3: Page Reconstruction from Chunks

**What ChromaFs Does:**
On `cat /auth/oauth.mdx`:
1. Fetch all chunks matching the `page` slug
2. Sort by `chunk_index`
3. Join into full page
4. Results cached to prevent repeated DB hits during grep workflows

Lazy resolution: large OpenAPI specs stored as file pointers in customer S3 buckets. Content only fetches on explicit `cat` access.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.1/8.2 (Echo ledger + trace assembly)
- **What we adopt:** The chunk-indexed reconstruction pattern for echoes and traces. Echoes stored as indexed JSONL chunks. When a persona requests a full trace replay, chunks are fetched by trace ID, sorted by index, and joined. Cached after first assembly.
- **Enhancement:** Lazy resolution for large artifacts (generated PDFs, gate reports). Store as pointers in the vault. Content materializes only on explicit read. Prevents context bloat.

---

## Pattern 4: Per-User RBAC at Filesystem Level

**What ChromaFs Does:**
Before building the file tree, ChromaFs prunes paths using user session tokens:
1. Prune slugs using authentication tokens
2. Apply matching filters to all Chroma queries
3. Exclude inaccessible files entirely from the tree

Result: per-user RBAC without managing Linux permissions, chmod, or isolated container images per tier. Inaccessible files don't just return "permission denied" — they don't exist in the tree.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.3 (vault access scoping)
- **What we adopt:** Per-persona vault tree pruning. Each persona sees a different vault tree based on their domain and granted capabilities:
  - Tanaka: security findings + auth specs + RLS policies (visible), financial flows (pruned)
  - Vane: financial specs + payment flows (visible), security internals (pruned)
  - Mara: UX specs + design system + accessibility findings (visible)
  - Pierce: everything (full tree — conformance requires full visibility)
- The pruning happens at tree construction time, not at access time. Pruned content doesn't exist in the persona's filesystem view.

---

## Pattern 5: Immutable Sessions (Read-Only FS)

**What ChromaFs Does:**
Write operations return `EROFS` (Read-Only File System). Sessions are stateless with no persistence — instant cleanup, zero session management overhead, no cross-agent corruption risk.

**Forge OS Integration:**
- **Landing zone:** Validates existing capability family architecture
- **What this validates:** Our `ReadOnly` capability family enforces the same constraint. Gate review dispatches get `ReadOnly` — personas can find but not fix. The vault is read-only for gate dispatches. Nyx gets `WriteCode` for the fix cycle. The capability family determines the filesystem's write mode.

---

## Performance Context

| Metric | Docker Sandbox | ChromaFs |
|--------|---------------|----------|
| P90 Boot | ~46 sec | ~100 ms |
| Marginal Cost | ~$0.0137/conversation | ~$0 (existing DB) |
| Search | Linear disk scan | DB metadata query |
| Scale | Limited by containers | 850K conversations/month |

---

*5 patterns mined. 2 Tier 1 (direct adoption), 3 Tier 2 (adapt). All fit existing sessions.*
