# Permission Model — Multi-Layered Safety

> How Claude Code decides what tools can do. Pattern for Forge OS agent capabilities.

## Permission Modes

```typescript
type PermissionMode =
  | 'default'            // Ask on destructive/dangerous operations
  | 'plan'               // Show plan, ask for approval before execution
  | 'acceptEdits'        // Auto-accept file edits (trust file operations)
  | 'bypassPermissions'  // Allow everything (dangerous — killswitch available)
  | 'dontAsk'            // Deny everything not explicitly allowed
  | 'auto'               // Classifier decides (ML-based)
```

## Permission Rules

```typescript
type PermissionRule = {
  source: 'userSettings' | 'projectSettings' | 'localSettings' | 'policySettings' | 'cliArg' | 'session'
  ruleBehavior: 'allow' | 'deny' | 'ask'
  ruleValue: { toolName: string; ruleContent?: string }
}

// Example: Allow all git commands
{ source: 'userSettings', ruleBehavior: 'allow', ruleValue: { toolName: 'Bash', ruleContent: 'git *' } }
```

## Decision Flow

```
Tool invocation →
  1. Tool.checkPermissions(input, context)     // Tool-specific logic
  2. permissions.checkToolPermissions()         // Rule matching
  3. Mode evaluation                            // Default behavior
  4. Classifier (if auto mode)                  // ML safety check
  5. → PermissionResult: allow | deny | ask
```

## Permission Result Types

```typescript
| { behavior: 'allow'; updatedInput?; userModified? }  // Proceed
| { behavior: 'ask'; message; suggestions? }            // Prompt user
| { behavior: 'deny'; message; decisionReason }         // Block with explanation
```

## Audit Trail

Every decision records WHY:
```typescript
type PermissionDecisionReason =
  | { type: 'rule'; rule: PermissionRule }
  | { type: 'mode'; mode: PermissionMode }
  | { type: 'hook'; hookName: string }
  | { type: 'classifier'; reason: string }
  | { type: 'safetyCheck'; reason: string }
```

## Denial Tracking

Counts denials per tool. When threshold reached, fallback to prompting instead of auto-denial. Prevents agents from silently failing on repeated operations.

## Forge OS Application

Our agent capability tiers map directly:

| Claude Code | Forge OS |
|-------------|----------|
| Permission modes | Agent capability tiers (read-only, build, admin) |
| Rule sources | Project config + user settings + agent frontmatter |
| `allow/deny/ask` trichotomy | Agent tool scoping (declared in agent .md) |
| Denial tracking | Finding escalation (agents flag blocked operations) |
| Dangerous pattern detection | Wraith-detected attack patterns |

What to adopt:
1. **Trichotomy everywhere** — Every tool check returns allow/deny/ask, never just boolean
2. **Audit trail** — Record WHY a permission was granted/denied (debugging agent behavior)
3. **Source hierarchy** — Policy > project > user > session (prevents override attacks)
4. **Hook-based auto-approve** — Our hooks already do this (settings.json PostToolUse hooks)
