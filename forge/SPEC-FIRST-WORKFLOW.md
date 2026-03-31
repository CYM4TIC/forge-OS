# Spec-First Workflow

> Vision → Architecture Decisions → Specs → Segments → Dependency Order → Batches → Build.

## The Pipeline

### 1. Vision Document
Narrative product description. Who uses it, why, how it's different. Output: `vault/specs/VISION.md`

### 2. Architecture Decision Log (ADL)
10-20 locked decisions constraining implementation. Each: ID, title, decision, rationale, consequences. Once locked, ADL doesn't change without explicit override. Output: `vault/adl/`

### 3. Detailed Spec
Comprehensive specification by domain. Data models, business rules, API surface, UI requirements, edge cases. Output: `vault/specs/SPEC.md`

### 4. Segmentation
Break monolithic spec into buildable segments (10-50 pages). Grouped by domain + dependency. Output: `vault/specs/segments/`

### 5. Dependency Ordering
L0 (schema) → L1 (core data) → L2 (APIs) → L3 (integrations) → L4 (frontend) → L5+ (polish, launch). Output: `vault/cross-refs/DEPENDENCY-BOARD.md`

### 6. Batch Planning
Break layers into executable batches. Each has manifest entry with: batch ID, surface, spec segments, tables, APIs, gate requirements. Output: `vault/cross-refs/BATCH-MANIFESTS.md`

### 7. Gate Mapping
Assign which personas review which batches. Output: `vault/cross-refs/PERSONA-GATES.md`

### 8. Build
The build loop activates. `/next-batch` works.

## Iterative Refinement
Specs evolve. But changes go through: identify gap → propose update → check ADL → update spec → update manifests.

## Starting Without a Full Spec (`/link`)
For existing codebases: Schema → data model spec. API routes → API spec. Components → UI spec. Operator fills in business rules that can't be inferred from code.
