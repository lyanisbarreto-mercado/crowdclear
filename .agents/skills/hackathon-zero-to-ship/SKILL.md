---
name: hackathon-zero-to-ship
description: Use when starting or continuing a hackathon project (24-48 hour build, Devpost or expo submission, sponsor or MLH prize tracks), when the user says zero-to-ship or weekend build, or when asked what to do next in a repo that has PLAN.md and docs/FACTS.json.
---

# Hackathon zero-to-ship

Take a hackathon from idea to verified product, demo assets and event submission. Generate the app for the user's idea in a separate project folder. Follow actual event requirements; this kit's web/Devpost defaults are adaptable.

**Core principle:** ship one convincing working journey, prove its distinctive mechanic early, and spend remaining time on what judges can verify.

## Start of every session

1. Inspect project `PLAN.md`, relevant code, recent commits and verification evidence. Templates and placeholders are not progress. Reconcile contradictions; resume the earliest unfinished dependency without restarting completed work.
2. Carry forward user intent, answers and authorization. Default to **guided**. Ask only consequential missing information; record assumptions for routine choices. Read [autonomy.md](references/autonomy.md) on first use or when modes, questions or resume are unclear.
3. Read the current phase reference below. Load [delivery-loop.md](references/delivery-loop.md) for planning slices, research, integration failures or AI evaluation; [agent-platforms.md](references/agent-platforms.md) only for agent-specific mechanics.
4. Maintain one concise `PLAN.md`: outcome, cuts, deadline/timezone, all portals, mode, owners, decisions and evidence. Build the smallest usable slice or runnable risk probe next. One slice may close several rows.

## Phase map

| Phase | You observe | Read | Evidence to advance |
|---|---|---|---|
| 0 Ideate | No substantive brief | [phase-0-ideate](references/phase-0-ideate.md) | Rules, outcome, distinctive mechanic, beats and cuts recorded |
| 1 Scaffold | No runnable foundation | [phase-1-scaffold](references/phase-1-scaffold.md) | Required checks and critical risk probe pass |
| 2 Build | Core journey unfinished | [phase-2-build](references/phase-2-build.md) | Demo beats work on the judged environment |
| 3 Harden | Freeze reached or core complete | [phase-3-harden](references/phase-3-harden.md) | Applicable review/checks and truth sweep pass |
| 4 Assets | Required assets unfinished | [phase-4-assets](references/phase-4-assets.md) then `hackathon-demo-assets` | Event-required assets ready and publication verified |
| 5 Submit | Required portals unfinished | [phase-5-submit](references/phase-5-submit.md) | Every required submission confirmed |

Load [stack.md](references/stack.md) for tech choices, [scaffold-patterns.md](references/scaffold-patterns.md) for health/stats/judge/FACTS, [pitch-formula.md](references/pitch-formula.md) for pitch, and [timeline.md](references/timeline.md) for timing or late starts.

Use available task-specific skills, Taste, Context7 and Firecrawl through [quality-tools.md](references/quality-tools.md). Local verification drives development; GitHub Actions runs asynchronously. Do not wait/poll for queued runs; enforced remote requirements block only their merge/release.

Evidence checks are mandatory; user pauses depend on mode and actual authorization. Review side-effect paths during implementation, then sweep at freeze. Use `hackathon-adversarial-review` for money, access, settlement, outbound contact, chain writes or deletion. Prefer a different model; an isolated reviewer with fresh context is the documented fallback. No independent reviewer: disable the effect and continue other work, recording the gap.

## Hard rules

1. Establish the brief before code; obey the event's permitted coding start.
2. Claim an integration only with deployed health `true` **and** a real operation verified there; use equivalent evidence for other formats. Configured keys alone prove nothing. Label sandbox and fixtures.
3. Every public number lives in `docs/FACTS.json`, written by a measuring command recorded in `provenance`. Never type a number from memory.
4. Uncertain outcomes on irreversible paths fail closed and display as REFUSED or UNKNOWN, never as success.
5. When behind, cut optional depth before the core demo, required assets or submission buffer.
6. Commit coherent verified slices with their PLAN evidence. Stage named owned paths and inspect the diff. Use separate status commits when team coordination needs them.
7. Execute within recorded authorization. Human actions or missing permission block only dependent work; prepare everything reviewable first. Final submit needs explicit authorization or human confirmation.
8. Secrets live in `.env.local` and the host's env settings only. Never echo a key into chat, logs, commits or client bundles.

## Templates

Project templates live in this skill's `assets/templates/`. Copy them into the project root with:

```text
python <this-skill-dir>/scripts/init_project.py <project-dir>
```

It creates missing files and refreshes the marked AGENTS block, CLAUDE import and missing gitignore rules; other project content stays intact. `--dry-run` previews. Before permitted coding starts, write planning documents only.

## Autonomy modes

- **Guided (default):** choose implementation and research autonomously; report meaningful checkpoints and continue in scope. Ask when an answer changes the outcome, a fixed constraint or authorization.
- **Gated:** wait for user approval at phase boundaries.
- **Autopilot to deploy:** guided through Phase 2, then pause.
- **Full run:** guided through final submission preparation. Human requirements and external authorization still apply.

## Output cadence

At the first usable slice, integrated live journey, freeze and submission readiness: report what works, the exact check/URL and result, material decisions or blockers, and the next step. Include simple trial instructions for visible behavior. Keep it under 10 lines; combine checkpoints for tiny projects. Routine passing steps need no permission question.

