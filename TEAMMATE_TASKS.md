# CrowdClear team checklist

Working deadline: **October 11, 10 a.m. Eastern local time**. Aim for a submission-ready package by 9 a.m.

Carol owns UX/UI. Teammate owns feature integration. Either can help the other, but name one owner for each task before starting. This file assigns work; [PLAN.md](PLAN.md) tracks milestone decisions and evidence; [CHECKLIST.md](CHECKLIST.md) retains the original technical requirements.

## Start here together

- [ ] Get the reconciled changes onto a shared commit so both computers run the same version; preserve current uncommitted work before pulling.
- [ ] Run `npm test` and the local app on both computers. Latest recorded combined result: 9 passing tests.
- [ ] Confirm the event portal, live app URL, and which teammate will submit on Devpost.
- [ ] Capture URLs / test notes for the platform items marked complete in CHECKLIST: Render, headset input/audio, Neon, and Presage. These are reported complete there; their evidence is not yet recorded in PLAN.
- [ ] Agree the next handoff: Carol supplies a review-screen layout and copy; teammate supplies the run data that fills it.

## Carol · UX/UI

- [ ] **First priority: try the current practice.** Can a new player identify Exit B, perform both tasks, understand the crowd response, and start a fresh drill without help? Record the three most important fixes.
- [ ] Refine briefing and tutorial wording: one instruction at a time, clear action feedback, no Next button to bypass interactive tasks.
- [ ] Polish laptop layout: scene prominence, spacing, type, button hierarchy, and exit signage. Keep text/status alongside color.
- [ ] Design the decision-review screen: evacuation result, action timeline, and a clear “Compare another decision” action. Annotate what each element means.
- [ ] Design comparison controls: which action changes, timing input, original/alternative labels, and replay/reset behavior. Ensure crowds can be distinguished without relying on color alone.
- [ ] Check keyboard focus, readable contrast, small-screen wrapping, instructions, and any captions once integrated.
- [ ] Prepare Devpost story, thumbnail/screenshots, and demo narration from the working build. Use actual results and clearly label the simulation.

Primary files: `public/styles.css`, `docs/design/BRAND.md`, `docs/submission-draft.md`. Own visual markup in `public/index.html` during an agreed editing window.

## Teammate · feature integration

- [ ] **First priority: expose a completed run.** Connect drill completion to review with initial state, simulation version, tick-stamped actions, and computed results. Keep tutorial activity out of scored runs.
- [ ] Implement review in `public/review.js`: populate Carol's layout from actual run data; handle no actions, time expiry, and early completion.
- [ ] Implement alternative replay using the same simulation and starting state. Change one action's timing while retaining every other input. Verify the original reproduces its recorded result.
- [ ] Wire Carol's comparison controls to replay; connect original/alternative visuals and reset behavior.
- [ ] Connect Neon save/load if required for the agreed demo or track. Prove save → reopen → replay; validate writes, keep secrets server-side, and show failed saves honestly.
- [ ] Integrate shared laptop/headset action handlers after the laptop loop works. Test actual headset input and ensure practice instructions/actions remain usable in VR.
- [ ] Maintain passing smoke, tutorial, and simulation tests. Verify CI on Node 24 and check the deployed build after authorized deployment.

Primary files: `public/game.js`, `public/simulation.js`, `public/review.js`, `server.js`, `schema.sql`, `test/`, `tests/`. Own wiring changes to `public/index.html` during an agreed editing window.

## Handoffs and checkpoints · both

| Checkpoint | Carol brings | Teammate brings | Complete when |
| --- | --- | --- | --- |
| First playable drill | Prioritized UX fixes | Working interactions and reset | Carol tries it and accepts the experience |
| Decision review | Layout and explanatory copy | Actual results and command timeline | A completed drill fills the screen correctly |
| Comparison replay | Clear labels and timing controls | Reproducible original and one edited alternative | Both can explain the visible difference |
| Full demo | Readability, instructions, narration | Save/load if included, live URL, device checks | Full journey works on the demo device |
| Submission ready | Final story and visual assets | Verified repository/app links and technical claims | Both review the package before submission |

- [ ] At each checkpoint, run the journey together; Carol gives feedback before moving to the next visible milestone.
- [ ] Before wiring review, agree the result fields and element IDs. Preserve current IDs used by game code; add classes for styling. Teammate confirms any renamed hooks and updates the code/tests with them.
- [ ] Take turns editing `public/index.html`. Announce the file handoff before starting; avoid simultaneous edits to shared files.
- [ ] Share focused commits frequently. Prefer separate task branches for concurrent work, integrating onto `main`; never overwrite another person's unfinished edits.
- [ ] If helping across roles, temporarily transfer a specific task/file and its acceptance condition. Return it explicitly when done.

## Final hour · both

- [ ] Freeze new features by 8:30 a.m.; fix only blockers and capture the stable demo.
- [ ] Run start → practice → drill → review → comparison → restart on the actual demo device.
- [ ] Carol checks copy/assets; teammate checks tests, live URL, repository visibility, and any claimed integrations.
- [ ] Attach the demo video, include all teammates, select eligible prizes, and review every required submission field.
- [ ] Named submitter submits by the 9:30 a.m. target and saves confirmation before the 10 a.m. deadline.

## If time gets tight

Protect the laptop drill, decision review, comparison, demo recording, and submission buffer. Defer sensing, additional venues, elaborate models, and optional audio first. Decide whether persistence/headset depth is essential to the confirmed judging track before cutting either. Do not describe an unfinished feature as working.
