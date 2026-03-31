---
name: security-auditor
description: "Use when auditing code for security vulnerabilities, reviewing auth flows, checking for insecure defaults, or assessing supply chain risk. Enhances Tanaka (Security) and Wraith (Red Team)."
risk: safe
source: adapted from Antigravity security-auditor + Trail of Bits skills
date_added: 2026-03-31
persona: tanaka
---

# Security Auditor

> Full DevSecOps security methodology. 12 domains. OWASP Top 10 + ASVS + STRIDE.
> Activated automatically when Tanaka boots. Wraith inherits attack patterns.

---

## 1. Authentication & Authorization

### Auth Checks
- Verify every endpoint checks authentication (no unauthenticated access to protected resources)
- Confirm authorization checks match business rules (role-based, tenant-scoped, resource-level)
- Check for privilege escalation paths: can a user modify their own role? Access another tenant's data?
- Verify session management: expiration, revocation, concurrent session limits

### Common Vulnerabilities
- **Broken access control** (OWASP A01): Missing auth checks on API endpoints, IDOR via predictable IDs
- **Auth bypass via parameter manipulation**: Changing `user_id` in request body to access another user's data
- **JWT vulnerabilities**: Algorithm confusion (none/HS256), missing expiration, secret in code
- **Session fixation**: Not rotating session tokens after authentication

### Verification Pattern
```
1. List all endpoints/RPCs
2. For each: what auth check exists? (None = CRITICAL)
3. For each: what authorization logic? (Missing tenant scope = HIGH)
4. Test: can Role A access Role B's resources? (IDOR check)
5. Test: can authenticated user escalate privileges? (Privilege escalation check)
```

---

## 2. Input Validation & Injection

### SQL Injection
- **Never** concatenate user input into SQL strings
- Always use parameterized queries (`$1`, `$2`) or prepared statements
- For dynamic column/table names (can't parameterize): use allowlist validation
- Check for second-order injection: stored input used in later queries without sanitization

### XSS Prevention
- Sanitize all user-generated content before rendering in HTML
- Use framework escaping (React auto-escapes JSX, but `dangerouslySetInnerHTML` bypasses it)
- Set `Content-Security-Policy` headers to restrict script sources
- Validate and sanitize URLs before rendering as `href` or `src`

### Other Injection Vectors
- Command injection: Never pass user input to shell commands. Use libraries with safe APIs.
- Path traversal: Validate file paths. Never use user input directly in `fs.readFile()`.
- Template injection: Server-side template engines can execute arbitrary code if user input is templated.
- Header injection: Validate that user input in HTTP headers doesn't contain CRLF sequences.

---

## 3. Insecure Defaults Detection

> Adapted from Trail of Bits insecure-defaults skill.

### Fail-Open Patterns (CRITICAL)
```
# BAD — fail-open: app runs insecurely when SECRET is missing
secret = os.environ.get('SECRET', 'default-secret-123')

# GOOD — fail-secure: app refuses to start without SECRET
secret = os.environ['SECRET']  # KeyError if missing
```

### What to Scan For
- **Fallback secrets**: `env.get('KEY') or 'default'` — FAIL-OPEN
- **Hardcoded credentials**: API keys, passwords, tokens in source code
- **Weak defaults**: `DEBUG=true`, `AUTH_REQUIRED=false`, `CORS_ORIGIN=*`, `VERIFY_SSL=false`
- **Missing HTTPS enforcement**: No redirect from HTTP, no HSTS header
- **Permissive CORS**: `Access-Control-Allow-Origin: *` on authenticated endpoints
- **Default admin accounts**: Seeded users with known passwords

### Skip List
- Test fixtures and example configs (these are expected to have defaults)
- Development-only tools and scripts
- Documentation examples

---

## 4. Supply Chain Risk

> Adapted from Trail of Bits supply-chain-risk-auditor.

### High-Risk Dependency Criteria
- Single maintainer (bus factor = 1)
- Unmaintained (no commits in 12+ months)
- Low download counts relative to alternatives
- FFI bindings or deserialization without sandboxing
- Past CVEs (check `npm audit`, `cargo audit`, or equivalent)
- No SECURITY.md or security policy

### Audit Process
```
1. List all direct dependencies
2. For each: check maintainer count, last commit, download stats
3. Flag: single maintainer OR unmaintained OR past CVEs
4. For flagged deps: suggest drop-in replacements
5. Check: are there unused dependencies? (dead weight = attack surface)
```

---

## 5. Data Protection & Privacy

### PII Handling
- Identify all PII fields: names, emails, phones, addresses, SSNs, financial data
- Verify PII is encrypted at rest (database-level or column-level encryption)
- Verify PII is encrypted in transit (TLS everywhere)
- Check that PII is not logged (search logs for email patterns, phone patterns)
- Verify PII is not exposed in URLs (query parameters are logged by proxies)

### Data Retention
- Every table with PII should have a retention policy
- Implement soft delete with scheduled hard delete for compliance
- Verify backup encryption and access controls

### GDPR/Privacy Compliance
- Right to erasure: can you delete all of a user's data?
- Right to portability: can you export all of a user's data?
- Consent tracking: do you record when and how consent was given?
- Data processing agreements: are third-party processors documented?

---

## 6. Communication Compliance (TCPA/CAN-SPAM)

### SMS/Phone
- **Double opt-in** required: explicit consent + confirmation message
- **Quiet hours**: No messages before 8 AM or after 9 PM recipient's local time
- **STOP keyword**: Must immediately cease all messaging on receipt
- **Message frequency caps**: Disclose frequency at opt-in, enforce in code
- **10DLC registration**: Required for business SMS in US

### Email
- **Unsubscribe link**: Required in every marketing email (CAN-SPAM)
- **Physical address**: Required in email footer
- **Honor opt-outs**: Within 10 business days (CAN-SPAM) or immediately (best practice)
- **Transactional vs marketing**: Different consent requirements. Don't send marketing in transactional emails.

---

## 7. API Security

### Rate Limiting
- Implement rate limiting on all public endpoints
- Stricter limits on auth endpoints (login, password reset)
- Use sliding window, not fixed window (prevents burst attacks at window boundaries)
- Return `429 Too Many Requests` with `Retry-After` header

### Webhook Security
- **Always** verify webhook signatures (HMAC-SHA256 with shared secret)
- Use idempotency keys to prevent replay attacks
- Process webhooks asynchronously (don't block on external calls)
- Log all webhook receipts for audit trail

### Error Handling
- **Never** expose stack traces or internal error details to clients
- Use generic error messages for auth failures ("Invalid credentials" — not "User not found" vs "Wrong password")
- Log detailed errors server-side, return sanitized errors client-side
- Implement global error handler that catches unhandled exceptions

---

## 8. Cryptography

### Key Management
- **Never** hardcode encryption keys, API secrets, or salts in source code
- Use environment variables or secret management (Vault, AWS KMS, etc.)
- Rotate keys periodically. Design for key rotation from the start.
- Use separate keys for separate purposes (encryption vs signing vs API auth)

### Password Handling
- Use bcrypt, scrypt, or Argon2id for password hashing (never MD5, SHA-1, or plain SHA-256)
- Minimum work factor: bcrypt cost 12, Argon2id with recommended params
- **Never** store passwords in plaintext, reversible encryption, or weak hashes
- Implement password complexity requirements and breach detection (HaveIBeenPwned API)

### TLS
- Enforce TLS 1.2+ (disable TLS 1.0, 1.1)
- Use HSTS headers: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Pin certificates only if you have a robust rotation process

---

## 9. Infrastructure Security

### Environment Separation
- Production, staging, and development must be isolated
- Production secrets must never exist in development environments
- Database access: principle of least privilege per environment

### Logging & Monitoring
- Log all authentication events (success and failure)
- Log all authorization failures
- Log all data modification events for audit trail
- **Never** log secrets, passwords, tokens, or full credit card numbers
- Set up alerts for anomalous patterns (brute force, unusual access times, mass data export)

---

## 10. Differential Security Review

> For PR/commit-level review. Adapted from Trail of Bits.

### Risk Classification
- **HIGH**: Auth flows, crypto, value transfer, permission changes, data deletion
- **MEDIUM**: Business logic, data validation, API contracts, session management
- **LOW**: Comments, formatting, UI-only changes, test files

### Review Strategy by Codebase Size
- **Small (<20 files)**: Deep review — read every line
- **Medium (20-200 files)**: Focused — prioritize HIGH-risk files, sample MEDIUM
- **Large (200+ files)**: Surgical — HIGH-risk files only, architectural review of MEDIUM

### 6-Phase Review
1. **Scope**: What changed? What's the blast radius?
2. **Architecture**: Does the change introduce new trust boundaries?
3. **Data flow**: Where does untrusted data enter? Where does it exit?
4. **Auth**: Are auth/authz checks preserved or weakened?
5. **State**: Are there race conditions, TOCTOU, or consistency issues?
6. **Adversarial**: If I were an attacker, how would I abuse this change?

---

## 11. Container & Deployment Security

### Container Hardening
- Use minimal base images (Alpine, distroless)
- Run as non-root user
- Don't install unnecessary packages
- Scan images for known CVEs (Trivy, Snyk)

### Deployment
- Use immutable deployments (don't patch running containers)
- Implement health checks and readiness probes
- Use network policies to restrict inter-service communication
- Rotate deployment credentials regularly

---

## 12. Security Testing

### Static Analysis
- Run Semgrep with auto language detection
- Use `--metrics=off` (no telemetry leakage)
- Configure for project-specific rules (custom Semgrep rules for org patterns)
- Integrate into CI pipeline (fail on HIGH findings)

### Dynamic Testing
- Fuzz all input fields with boundary values, special characters, Unicode
- Test auth bypass: remove tokens, use expired tokens, use other user's tokens
- Test rate limiting: automated burst requests
- Test CORS: cross-origin requests from unauthorized domains

---

## When This Skill Activates

- Tanaka boots on any project (security is always relevant)
- Wraith dispatches for red-team testing (inherits attack patterns from sections 1-4, 7, 10)
- `/deps` command runs (supply chain audit from section 4)
- PR review gate (differential security review from section 10)
- Any agent writes auth-related code (sections 1, 3, 8)
