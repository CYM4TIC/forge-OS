# LightRAG — Knowledge Graph RAG Engine

> Hybrid vector + graph search. 22 MCP tools. For vault knowledge management.

## Repo: github.com/desimpkins/daniel-lightrag-mcp (22 tools, production-ready)

## Architecture

```
Claude/AI Agent (MCP client)
  → LightRAG MCP Server
    → LightRAG Python Backend (localhost:9621)
      ├── Document Ingestion (PDFs, text, files)
      ├── Knowledge Graph Construction (entity/relation extraction)
      ├── Hybrid RAG (vector + graph search)
      └── Query Engine (naive, local, global, hybrid)
```

## 22 Tools by Category

| Category | Tools | Purpose |
|----------|-------|---------|
| Document Management (6) | insert_text, upload_document, scan_documents, get/delete_documents | Index into knowledge base |
| Query Operations (2) | query_text, query_text_stream | Retrieve answers |
| Knowledge Graph (6) | get_graph, get_labels, check/update/delete entity, update_relation | Inspect + modify entities |
| System (4) | health, pipeline_status, track_status, clear_cache | Monitor |

## Query Modes

- **naive**: Vector-only, fastest
- **local**: Graph neighbors + vectors (local context)
- **global**: Entity-level graph + vectors
- **hybrid**: All signals combined (recommended)

## Critical Implementation Notes

- Always include `file_source` on inserts (prevents null database corruption)
- `get_knowledge_graph(label="*")` for full graph (not "all")
- HTTP DELETE needs `client.request("DELETE", url, json=data)` not `client.delete()`

## How to Use in Forge OS

**Phase 7+ (Knowledge Layer):** Index project documentation, specs, and architectural decisions into LightRAG. Agents query for contextual facts during reasoning. Knowledge graph updates as agents learn domain patterns.

**Immediate value:** Index vault NOTES.md files → agents can query "what security patterns apply to auth?" and get hybrid vector+graph results across all reference sources.
