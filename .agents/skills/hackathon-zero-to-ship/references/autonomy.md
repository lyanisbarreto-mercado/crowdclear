# Guided autonomy and useful checkpoints

## Execution contract

Record these in the project's `PLAN.md`, using existing answers: user outcome and fixed constraints; mode; deadline with timezone and portals; authorized deployment/publication destinations and budget if relevant; team ownership. Do not invent authorization or reopen it after each phase.

| Mode | Agent behavior | User pauses |
|---|---|---|
| guided (default) | Research, choose tools, implement, verify and adapt internals within scope | Consequential unknowns, changes to fixed user choices, missing authorization or human actions |
| gated | Same work and verification | Phase boundaries plus the above |
| autopilot to deploy | Guided through Phase 2 | Before Phase 3 plus the above |
| full run | Guided through final submission preparation | The above; final submit requires explicit authorization or human confirmation |

"Choose what you think is best" delegates implementation choices. An explicit stack, budget, product outcome or mode remains a constraint until changed. A mode change applies immediately; record it once. Guidance does not override platform permissions or event rules.

## Questions that earn their interruption

- Ask for a missing outcome, deadline/timezone, consequential rule, fixed preference, permission or user-only action when the answer affects the next work. Research public event details first. Batch related essentials; usually one to three questions suffice.
- Give a recommendation and the tradeoff. Optional preferences can stay pending while independent work continues; use a stated reasonable default when appropriate.
- Required answers block dependent actions only. Silence is not approval. If asynchronous questions are supported, keep building independent slices while waiting; otherwise ask at the next natural handoff.
- Routine file layout, SDK choice within constraints, internal refactors, focused checks and documented fixes are agent decisions. Save a short decision only when it affects later work.
- A new product direction or replacement of the distinctive mechanic needs clarification. Cutting optional depth to protect the deadline is autonomous unless the user made that feature essential; record the cut and tell them.

## Checkpoint contract

Schedule feedback where it can alter the build: first usable behavior, integrated live demo, freeze, and submission readiness. Combine overlapping checkpoints for a small project. Extra checkpoints should resolve a real uncertainty, not create a question quota.

Each checkpoint reports: usable behavior; command or URL with observed result; source commit/deployment and timestamp when relevant; material decision or unresolved issue; next step. For visible behavior, add "open X, do Y, expect Z" so the user can try it. Guided/full run reports continue without a sign-off. Gated pauses for the phase it actually presented; approval is not requested twice.

## Resume from evidence

1. Read substantive project content, not skill templates. If a plan is missing but an app exists, infer a minimal plan from the app and user intent; clarify only consequential ambiguity.
2. Compare row status with code, commits and latest verification. Evidence is stale when relevant code, deployment, credentials/config or a material dependency changed. Rerun affected checks; unchanged checks need not be repeated ceremonially.
3. Checked implementation alone does not prove assets, review, live verification or submission are finished. Resume the first unfinished dependency. Preserve mode, decisions and completed feedback.
4. Record scope corrections and their downstream impact in PLAN; update only affected slices, contracts, claims and assets. A session handoff needs current state, evidence, blockers and next action, not a new planning stack.
