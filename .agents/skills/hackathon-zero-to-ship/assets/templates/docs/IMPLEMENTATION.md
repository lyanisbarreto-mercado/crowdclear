# Implementation notes: slice contracts

> Optional companion to `../PLAN.md` for risky slices or parallel lanes. PLAN owns progress, owners and dependencies; do not duplicate its status checklist here. Keep only the interfaces and checks needed to build/integrate efficiently.

**Goal:** <!-- the useful signature moment -->
**Architecture:** <!-- UI/API, provider adapter, durable state only if needed, host -->
**Status vocabulary:** <!-- e.g. ALLOWED | REFUSED | UNKNOWN; provider ambiguity never means success -->

## Interface map

| Boundary | Owner / consumers | Input -> output | Failure / constraints |
|---|---|---|---|
| <!-- e.g. decision API --> | <!-- lane -> UI --> | <!-- validated input -> explicit outcome --> | <!-- timeout, malformed input, duplicate action --> |
| Env contract | <!-- owner -> adapters, health --> | Key names and feature requirements | Health reports configured booleans, not live proof |
| FACTS | <!-- owner -> stats, copy --> | Measured values plus provenance | No unmeasured claims |

Record a contract change in PLAN and notify consumers before integration. Keep core decisions separate from provider I/O; request only feature-specific env keys.

## Slice contract

<!-- Repeat this short section only for slices that need detail. -->

**PLAN row / visible result:** <!-- row + what the judge/user can verify -->
**Owned paths / dependencies:** <!-- exact paths, shared contract and prerequisites -->
**Smallest implementation:** <!-- one end-to-end behavior, no speculative framework -->
**Acceptance evidence:** <!-- command/manual action, expected outcome, environment; failing test first for important rules or irreversible transitions -->
**Failure behavior:** <!-- validation, provider failure/unknown, disabled integration, labelled fixture if needed -->
**Effect / review:** <!-- none, or effect boundary + independent review required before enabling/merging -->

## Focused checks

Select applicable cases rather than copying a full suite into every slice:

- Domain decisions: normal input and the meaningful refused/boundary case.
- Mutations: validation before effect, access checks, duplicate/replay protection where applicable.
- Provider boundary: error/timeout remains failure or UNKNOWN; a skipped live test is not passing evidence.
- Deployed slice: health plus the real domain/sandbox smoke on the current deployment; record commit/URL and result in PLAN.
- Low-risk UI/copy: focused visual or manual smoke. Run required local equivalents before integration; track Actions asynchronously and retain enforced remote merge/release requirements.

### AI behavior, when applicable

Keep a small evaluation set beside the implementation and define the expected behavior before prompt/model changes. Start with these five cases; mark a case inapplicable when justified:

| Case | Expected behavior |
|---|---|
| Normal | Useful result in the declared schema; permitted action only |
| Malformed | Validate/refuse without effect |
| Ambiguous | Clarify or return a bounded uncertain result; no invented certainty |
| Provider failure | Honest error/UNKNOWN with bounded call behavior |
| Injection / untrusted content | Treat input as data; cannot override system rules or authorize actions |

Record observed results, not a claim of general model accuracy. Measure latency/cost only when a demo claim needs them; put measured values and commands in FACTS. After two genuinely failed integration attempts, timebox diagnosis and simplify/switch/cut; labelled fixtures never become live evidence.
