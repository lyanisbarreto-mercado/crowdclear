# Phase 0: Brief and choose the wedge

Goal: a small, useful product brief, one signature moment, and a plan that can ship. Use the user's idea as the starting point. Resolve routine choices yourself; follow [autonomy.md](autonomy.md) for questions and checkpoints.

## 1. Read the event rules

Fetch the event, rules and prize pages. Record sources and these constraints in the `PLAN.md` header:

- Coding start time. If pre-event coding is forbidden, do research and planning only until kickoff; scaffolds and template scripts do not bypass that rule.
- Hard deadline with timezone and every submission or judging portal.
- Team limits, track limits and any attendance requirement.
- Video length/platform, public repository/license requirements, AI disclosure and any human-authored sections.
- Judging criteria per track. Quote short public criteria accurately or label paraphrases.

Bound research by the remaining time ([timeline.md](timeline.md)). Verify the few rules and integration assumptions that could invalidate the demo; avoid a broad market survey.

## 2. Shape the brief

In `PLAN.md` Context, capture the user, problem, current workaround, useful outcome and the smallest scope that proves it. Include explicit cuts. When the user already supplied these, refine the gaps instead of interviewing them again.

1. Map eligible tracks to the product. Favor a usable sandbox and a sponsor mechanic that has a real role in the demo.
2. Choose a **signature moment**: an action gated by evidence, an agent action, a perception result or a measured before/after. Describe it as plain mechanics: "When X, the product does Y" or "X happens only after Y is verified."
3. Keep two complementary demo beats by default: **Beat A** shows the boundary, failure or before state; **Beat B** shows the successful outcome. Both need a judge-visible result.
4. Record a sourced hook when useful, why the existing workaround misses this moment, and who benefits or pays. Do not invent metrics or economics.
5. Connect each intended feature to a judged criterion. Use tool-prize products for real and preserve evidence of their use.

Choose the simplest supported stack and integration route ([stack.md](stack.md), [delivery-loop.md](delivery-loop.md)). Ask only when missing information materially changes the product direction or the rules require a human action. Otherwise record the assumption and continue.

## 3. Fill the working documents

`PLAN.md` is the progress source of truth. Fill its header, Context, tracks, criterion-to-surface table, phase rows, dependencies and human/external-action rows. Do not create a second scope/PRD/checklist stack.

- `docs/pitch.md`: beat placeholders.
- `docs/FACTS.json`: product name and tagline; leave metrics empty until measured.
- `docs/design/BRAND.md`: a compact direction, colors, type and one reference site. Available Taste/frontend-design guidance can shape the landing composition without adding a separate design pipeline ([quality-tools.md](quality-tools.md)).
- `docs/IMPLEMENTATION.md`: optional interface/slice notes for risky work or parallel lanes.

Once coding is permitted, run `scripts/init_project.py` if templates are missing. Before then create only the planning documents the rules allow.

## Checkpoint

Report the brief, chosen mechanic, Beat A/B, tracks, key assumptions, cuts, and the first blocked human/external actions. Include the evidence behind the choice and the next slice.

In guided mode, record this in PLAN and proceed to permitted scaffolding. In gated mode, wait for the user's decision. Missing authorization, an actual human-only requirement or an unresolved material product choice remains a blocker; silence never supplies approval.
