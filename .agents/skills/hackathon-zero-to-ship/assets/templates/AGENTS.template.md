<!-- BEGIN:hackathon-kit -->
# Agent rules for this hackathon repo

This repo was started with the `hackathon-zero-to-ship` skill. Any agent (Claude Code, Codex, Cursor) working here follows these rules.

## Where things are

- `PLAN.md`: status dashboard and the only source of truth for who does what. Read it first.
- `docs/FACTS.json`: every public number, with the command that measured it in `provenance`.
- `docs/design/BRAND.md`: colors, fonts, mood for the site, stills, poster and video.
- `docs/pitch.md`, `docs/submission-draft.md`: judge-facing copy.
- Skills: `hackathon-zero-to-ship` (what to do next), `hackathon-adversarial-review` (review side-effect PRs and claims), `hackathon-demo-assets` (video, stills, poster). If they are not installed as skills, ask the user for the kit path and read each `SKILL.md` directly.

## Rules

1. Read substantive PLAN content and current evidence; placeholders and checked rows alone do not prove completion. Carry forward the saved mode and user choices.
2. Default to guided autonomy: choose routine implementation details, research primary docs, verify usable slices and continue in scope. Ask about consequential unknowns or changes to fixed constraints. Update only affected plan sections.
3. Stage named paths only. Never `git add -A` or `git add .`.
4. Claim a live integration only with health `true` and a real operation verified in the judged environment; use equivalent evidence for other formats. Configured keys alone are not proof. Label fixtures and sandboxes.
5. Numbers come only from `docs/FACTS.json`. Never type a number from memory.
6. Irreversible paths fail closed: an uncertain result shows REFUSED or UNKNOWN, never success.
7. PRs touching money, access, settlement, outbound contact, chain writes or deletes need clean independent review. Prefer another model; an isolated fresh reviewer is the fallback. If unavailable, disable the effect and record the gap.
8. No em dashes in judge-facing copy (`python scripts/check-em-dash.py`).
9. Secrets live in `.env.local` and host env settings only. Never print, commit or paste a key.
10. Follow PLAN's existing authorization for deploy, publication and spending. Missing authorization or human actions block only dependent work. Final submit needs explicit authorization or human confirmation.
11. Commit coherent verified slices with their PLAN evidence; use status-only commits when coordination needs them. At checkpoints report behavior, check/result and next step. Guided mode does not require routine sign-offs.
12. After two failed integration attempts, diagnose within a timebox and simplify or cut optional depth. Keep required assets and submission time ahead of polish.
13. Use available focused helpers: Superpowers for testing/debugging/review, Taste for landing-page design, relevant product/stack skills, Context7 for SDK facts and Firecrawl for selected web sources. Keep the same brief and PLAN; no default helper installs. Fall back to primary docs, native browsing and project checks.

## Verify before saying done

Run the project's required local CI-equivalent checks on the exact integrated revision (web default: lint, typecheck, test, build, hygiene and secret scan). During iteration use checks matching the slice's risk; do not reinstall dependencies or generate unrelated artifacts every time. Track GitHub Actions asynchronously: query once after push or at useful checkpoints, record the exact commit and pending/pass/fail/not connected status, then continue unblocked work. Never use `gh run watch`, sleep or polling loops. Confirmed failures need actual logs and relevant fixes; enforced repository/event remote checks still gate merge/release. After deploy, check production health and exercise the actual demo operation and `/judge`. Record commands, outcomes and relevant commit/deployment in PLAN; a skipped live test is not proof.
<!-- END:hackathon-kit -->
