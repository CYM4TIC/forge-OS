---
name: parallel-build
description: Spin up worktrees for simultaneous sub-batch building
user_invocable: true
---

# /parallel-build [batches]

Build multiple independent sub-batches in parallel using worktrees.

## Protocol
1. Parse `$ARGUMENTS` for batch IDs (comma-separated)
2. Verify batches are independent (no shared tables, no dependency chain)
3. For each batch:
   - Create a worktree via EnterWorktree
   - Run the build loop for that batch
   - Push from the worktree branch
4. After all complete:
   - Merge branches
   - Run regression scan
   - Report results

## Constraints
- Maximum 3 parallel worktrees
- Batches MUST be independent (no shared schema, no shared routes)
- Each worktree runs its own Scout recon
- Sentinel runs after merge to catch integration issues
