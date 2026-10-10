# Phase 2: Build verified slices and deploy

Goal: Beat A and Beat B work end to end on the judged deployment. Deliver thin vertical slices using [delivery-loop.md](delivery-loop.md); depth features follow a working signature moment.

## Dependencies, not a rigid sequence

Adapt PLAN rows to the product. A slice can cross these surfaces; implement only the parts it needs.

| Surface | Depends on | Evidence |
|---|---|---|
| Domain rules / state transitions | Brief and input/output contract | Focused examples for the decision rule and meaningful failure cases; pure rules separate from I/O |
| Persistence | Durable state actually needed | Atomic writes or idempotency wherever repeat actions could duplicate an effect |
| Provider adapter / API | Contract, validation, relevant rules | Explicit success/refusal/unknown shape; provider failures cannot become success |
| UI demo path | Stable contract; fixture allowed during build | One clear judge path, both beats reachable, loading/error states visible |
| Early deployment | Runnable slice and existing host authorization | Current deployment health plus a domain/sandbox smoke, not env presence alone |
| Full demo checkpoint | Integrated UI/API/provider path | Both beats twice; recheck on the judged URL and a phone |
| FACTS / depth | Measured outputs / working signature moment | Reproducible provenance / a judged criterion and verified demo surface |

Deploy the first runnable slice early when authorized, rather than waiting for every local feature. Set host env, configure the existing probe for claimed integrations, and add one safe domain assertion. After relevant deployments, exercise health and `/judge` on that deployment. Avoid login friction where feasible; use the least access needed by event judges.

## Slice loop

- Claim the PLAN row with owner, paths, dependencies and timestamp. Define the visible result and smallest useful check before coding.
- Use a failing test first for important domain rules or irreversible transitions. Use focused smoke/manual checks for low-risk visual changes; match verification to risk.
- Use available focused helpers when they improve this slice: Superpowers for debugging/testing/review discipline, framework skills for stack-specific guidance and Context7 for current version-specific docs. Keep PLAN as the shared plan; consult [quality-tools.md](quality-tools.md) when selecting helpers.
- Keep provider boundaries modular and feature failures isolated. Persist long-running state only when the demo needs it; avoid building a general retry/orchestration engine.
- Record the check command, result and deployment identity. Commit the owned implementation paths, relevant evidence and status together unless the team opts for status-only commits.
- Run required local CI-equivalent checks on the exact combined revision before accepting integration. Record the commit, commands and results; track remote Actions asynchronously without waiting or repeated polling. Pending Actions leave independent slices/assets unblocked. Confirmed failures require actual logs and a relevant fix; required remote checks enforced by the repository or event still gate merge/release. If the signature path fails, pause dependent depth work and repair the failing slice; unrelated assets or copy can continue.
- After two genuinely failed integration attempts, cap diagnosis and simplify, switch route or cut. A labelled fixture can support development or an explicitly described fallback; never call it live.

## Side-effect review

A change to money, access, settlement, outbound contact, chain writes or deletion requires independent `hackathon-adversarial-review` before enabling/merging that effect. Prefer a different model family. A fresh isolated same-family reviewer with the diff and contracts is an allowed fallback; record reduced confidence. The builder reviewing its own work is not independent.

Resolve high findings with focused regression evidence. If repeated review still finds highs by round 3, simplify the feature. If no independent reviewer is available, isolate or disable the effect and continue the read-only demo path and assets; do not mark it reviewed.

## Parallel lanes

Use teammates or agents when independent work saves time. Agree interfaces before launching lanes; use disjoint owned files or isolated worktrees. Keep one owner for each shared contract and one integrator.

```bash
git worktree add ../<repo>-<lane> -b feat/<lane>
```

- One lane owns a tight slice or task group and its PLAN rows. Share only the brief, contract, paths and acceptance evidence it needs.
- API shapes, env names and status vocabulary change with a PLAN contract note and notification to consumers before integration.
- Rebase/merge the current mainline into the lane and verify the combined result. Keep agent/worktree metadata out of application lint/build scans.
- An old timestamp does not prove abandoned work. Check the owner/agent and repository state before takeover. Use a disjoint task or separate worktree until ownership is resolved.

## Checkpoint

Report the judged URL, Beat A/B evidence, exact commit/local check results, remote pending/pass/fail/not connected status, independent review results and remaining cuts. Health booleans mean configured keys; include current deployment domain/sandbox evidence for live claims. Guided mode proceeds to hardening; gated mode waits. Legacy "autopilot to deploy" ends here.
