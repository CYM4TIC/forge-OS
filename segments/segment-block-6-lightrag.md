# Block 6: LightRAG Integration

> **Sessions:** 1-2 | **Batches:** OS-B6.A, OS-B6.B | **Source:** BUILD-PLAN.md Block 6

---

## OS-B6.A: Server + MCP Bridge
- Install LightRAG (`pip install lightrag-hku`)
- Install MCP bridge (`pip install daniel-lightrag-mcp` or clone)
- Configure with Claude API backend
- Add tools to `.claude/settings.json`
- Write `tools/index-vault.py` for batch indexing

## OS-B6.B: Index + Verify
- Index OS's own docs as test
- Verify queries work (hybrid, local, global)
- Update Scout with LightRAG query step
- Build `runtime/src/integrations/lightrag/` — HTTP client for dashboard queries

### Exit Gate
- LightRAG server running (localhost:9621)
- MCP bridge configured in settings
- OS docs indexed and queryable
- Scout agent references LightRAG queries
- HTTP client operational for dashboard
- Pushed to GitHub: "LightRAG operational"

---
