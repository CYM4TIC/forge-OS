# Research: Lighthouse + awesome-cryptography — Quality Scoring & Security Tooling

## Session Date: 2026-04-03
## Participants: Nyx (research session)
## Sources:
- [GoogleChrome/lighthouse](https://github.com/GoogleChrome/lighthouse) — Web performance auditing framework
- [sobolevn/awesome-cryptography](https://github.com/sobolevn/awesome-cryptography) — Curated cryptography resources

---

## Context

These two sources are **reference-grade** rather than architectural. Lighthouse contributes a scoring methodology for the predictive intelligence layer. awesome-cryptography provides a vetted library shortlist for the carried risk R-DS-01 (keyring migration from plaintext SQLite to encrypted credential storage).

---

## Lighthouse Patterns

### Pattern 1: Log-Normal Scoring with Percentile Control Points

**What Lighthouse Does:**
Performance metrics are scored on a log-normal distribution curve, not linear thresholds. Two control points define the curve:
- **p10 (median)** — the score maps to 0.5 at this metric value
- **p25 (poor)** — the score approaches 0 at this metric value

The log-normal model means small improvements at the slow end of the distribution produce larger score gains than the same improvement at the fast end. This matches human perception — going from 8s to 6s load time feels more impactful than 2s to 1.5s.

```javascript
// Simplified scoring model
function getLogNormalScore(value, p10, p25) {
  const mu = Math.log(p10);
  const sigma = Math.log(p25 / p10) / INVERSE_NORMAL_25;
  return 1 - normalCDF((Math.log(value) - mu) / sigma);
}
```

Each audit defines its own control points derived from real-world data (HTTP Archive percentiles). No arbitrary "good/bad" thresholds — the curve is empirically grounded.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.3b (Pareto quality scoring in predictive intelligence)
- **What we adopt:** The log-normal scoring model for quality metrics in the reasoning engine. When TimesFM produces forecasts and the reasoning engine evaluates quality signals (finding_density, batch_duration, gate_pass_rate), score them on log-normal curves with empirically derived control points from the project's own history:
  - `finding_density`: p10 from project's median density, p25 from worst 25th percentile
  - `batch_duration_ms`: p10 from project's median, p25 from slowest quartile
  - Control points recalculated by dreamtime ritual as history accumulates
- **Why log-normal over linear:** Linear thresholds create cliff edges ("0.49 = bad, 0.51 = good"). Log-normal creates a smooth gradient that weights improvements at the poor end more heavily — exactly where improvements matter most. A project going from 8 findings/batch to 4 gets more score improvement than one going from 2 to 1.

### Pattern 2: Audit Base Class (Meta + Required Artifacts + Audit Method)

**What Lighthouse Does:**
Every audit follows a standardized base class pattern:
```javascript
class Audit {
  static get meta() {
    return {
      id: 'audit-id',
      title: 'Human-readable title',
      description: 'What this checks',
      requiredArtifacts: ['NetworkRecords', 'MainResource', ...],
    };
  }

  static audit(artifacts) {
    // Audit logic — receives only the declared artifacts
    return { score, details };
  }
}
```

Key properties:
- **Declarative dependency:** `requiredArtifacts` declares what data the audit needs. The runner only passes declared artifacts — no ambient access.
- **Standardized output:** Every audit returns `{ score, details }`. Scores are 0-1 numeric. Details are structured (table, opportunity, diagnostic).
- **Static meta:** Audit metadata is introspectable without running the audit. Enables filtering, grouping, and dependency resolution before execution.

**Forge OS Integration:**
- **Landing zone:** Phase 8, Session 8.2 (gate audit structure)
- **What we adopt:** The audit base class pattern for gate persona dispatches. Each persona's gate check should declare:
  - `meta`: check ID, description, severity tier, required artifacts (which files, which SQL tables, which registry data)
  - `required_artifacts`: explicit list — the dispatch pipeline only injects declared context, not everything
  - `audit(artifacts) -> GateResult`: standardized output with findings array, pass/fail, confidence
- **Enhancement:** Our personas already produce findings with severity. The audit base class formalizes the contract: declare what you need, receive only that, return structured results. This constrains persona context assembly (don't inject everything, inject what's declared) and enables pre-flight validation (are the required artifacts available before dispatching?).

---

## awesome-cryptography Patterns

### Pattern 3: Rust Cryptography Library Landscape (Tanaka Knowledge Bank)

**What awesome-cryptography Provides:**
A curated, categorized index of cryptography libraries across languages. For Rust specifically, the standout libraries for our use case (desktop app credential storage):

| Library | Purpose | Maturity | Notes |
|---------|---------|----------|-------|
| **ring** | Core crypto primitives (AES-GCM, SHA-256, ECDSA, X25519) | Very high — used by rustls, webpki | No system OpenSSL dependency. Pure Rust. |
| **sodiumoxide** | Rust bindings for libsodium (NaCl) | High — stable, well-audited | Symmetric encryption (secretbox), key derivation (argon2id), sealed boxes |
| **BLAKE3** | Fast cryptographic hash | High — official Rust impl | 4x faster than SHA-256. Good for content-addressed storage, sigil hashing |
| **age/rage** | File encryption (rage = Rust impl of age) | Moderate — actively developed | Simple API for encrypting files/streams. Good for vault artifact encryption |
| **argon2** | Password/key derivation | High | Memory-hard KDF for deriving encryption keys from operator passphrase |
| **chacha20poly1305** | AEAD cipher | High — RustCrypto project | Alternative to AES-GCM, constant-time, no AES-NI dependency |

**Forge OS Integration:**
- **Landing zone:** Phase 9 (pre-release security hardening) / Carried risk R-DS-01
- **What this provides:** The carried risk R-DS-01 (plaintext credentials in SQLite, tracked since Phase 6) needs a concrete implementation plan. This research provides the library shortlist:
  - **Credential encryption at rest:** `sodiumoxide::crypto::secretbox` or `chacha20poly1305` for encrypting API keys, tokens, and secrets before SQLite storage
  - **Key derivation:** `argon2` to derive the encryption key from an operator-provided passphrase (set during `/init`)
  - **Content hashing:** `BLAKE3` for content-addressed vault storage, sigil integrity checks, echo deduplication
  - **File encryption:** `rage` for encrypting exported gate reports, vault backups, any artifact that leaves the app
- **Architecture decision (for Phase 9 ADL):** Use `sodiumoxide` or `chacha20poly1305` (not ring directly) for application-level encryption. Ring is lower-level — appropriate for protocol implementation but verbose for "encrypt this blob" use cases. Sodiumoxide/chacha20poly1305 provide the right abstraction level for a desktop app.
- **Tanaka knowledge bank:** This becomes reference material for Tanaka's security audits. When reviewing credential handling, Tanaka can reference specific library capabilities rather than generic "should be encrypted" findings.

---

## Patterns Not Adopted

| Pattern | Why Not |
|---------|---------|
| Lighthouse's Lantern simulation model | We don't simulate network conditions — our metrics are build process metrics |
| Lighthouse's trace processing pipeline | We have our own echo ledger + trace store |
| Post-quantum cryptography libs (pqcrypto) | Premature for a desktop app — revisit when industry standards stabilize |

---

## Integration Summary

| # | Pattern | Source | Landing Zone |
|---|---------|--------|-------------|
| 1 | Log-normal scoring with percentile control points | Lighthouse | Phase 8 Session 8.3b (Pareto/quality scoring) |
| 2 | Audit base class (meta + requiredArtifacts + audit) | Lighthouse | Phase 8 Session 8.2 (gate audit structure) |
| 3 | Rust crypto library landscape | awesome-cryptography | Phase 9 / R-DS-01 (Tanaka knowledge bank) |

**3 patterns. 1 Phase 8.2, 1 Phase 8.3b, 1 Phase 9 reference. 0 new sessions.**

---

*Reference-grade sources. Primary value: empirical scoring methodology for predictive intelligence + concrete library selection for security hardening.*
