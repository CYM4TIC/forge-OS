# n8n-MCP — Workflow Automation Bridge

> 1,396 nodes, 2,709 templates, 20 MCP tools. External automation layer.

## Repo: github.com/czlonkowski/n8n-mcp

## Architecture

```
Claude/AI Agent (MCP client)
  → n8n-MCP Server (comprehends n8n nodes)
    ├── 265+ AI-capable nodes (LangChain, OpenAI)
    ├── 2,709 workflow templates
    ├── Property schemas (99% coverage)
    └── Node operations (63.6% coverage)
  → n8n Instance (localhost:5678 or cloud)
```

## 20 Tools

**Documentation (7):** tools_documentation, search_nodes, get_node, validate_node, validate_workflow, search_templates, get_template

**Management (13):** create/update/delete/list workflows, test_workflow (auto-detects trigger type), executions (list/get/delete), health_check, autofix_workflow, workflow_versions, deploy_template

## Key Stats

- 1,396 n8n nodes (812 core + 584 community)
- 2,709 workflow templates with 100% metadata coverage
- Before n8n-MCP: 45 min, 6+ config errors. With: 3 min, 100% accuracy.

## AI Workflow Validation

Validates: missing language models, AI tool connectivity, streaming mode constraints, memory + output parser presence.

## How to Use in Forge OS

**External automation:** When users need workflows that connect external services (Slack, email, CRM, databases), agents search n8n templates, validate workflow structure, and deploy via API.

**Build pipeline extension:** n8n workflows can trigger on GitHub webhooks, run automated tests, notify on Slack — all orchestrated by Forge agents.
