# CrowdClear working plan

Updated: October 10, 2026 (America/New_York). Working branch: main.

## Outcome and scope

Help venue staff understand how their decisions affect congestion in a simulated stadium evacuation. The signature moment: finish a drill, change the timing of one decision, and compare the original crowd with the alternative replay.

Core journey: understand the scenario → action-based guided practice → start timed drill → spot congestion → open an exit / redirect people → review decisions → compare an alternative.

Confirmed tutorial decision: each interactive step waits for a successfully performed task. Verify the resulting game state and show the visible effect; clicks or a Next button alone do not advance it. Practice is untimed and separate from scored runs.

Keep one venue and two actions. Crowd size and round duration are design targets to confirm, not measured claims. Webcam sensing, additional venues, accounts, and elaborate models are deferred. This is a training prototype, not a validated evacuation predictor.

## Working agreement

- Carol owns visual direction, comprehension, and experience feedback. Agent owns implementation and verification. Teammate responsibilities remain to be confirmed.
- Use the existing Express, plain JavaScript, and A-Frame foundation. Laptop first, then headset. Headset support needs a real device check.
- Work on main as requested. Preserve existing CSS and unrelated local changes. Do not merge the teammate's entire branch as part of planning.
- Mode: gated at visible milestones, as Carol requested. Pause for her feedback before advancing to the next visible milestone. Explain what is visible, how to try it, what feedback matters, and what happens next.
- Deadline: October 11, 2026 at 10:00 a.m. America/New_York (EDT, UTC−4); Carol said “EST,” interpreted as local Eastern time. Supplied VIII URL is the ended 2025 event. Likely current portal: https://knight-hacks-ix.devpost.com/; confirm this is the team’s event. Its written requirements also say 10 a.m. submission and 11 a.m. GitHub commit cutoff, although its header displays 11 a.m. EDT. Use the earlier 10 a.m. deadline. Required: attached demo video, public GitHub link, team invitations, and prize selections. Track eligibility and detailed event rules remain to be checked against the team’s confirmed event.
- Deployment destination, accounts, and budget: unconfirmed. No public deployment or submission has been performed.

## Observed baseline

Baseline source inspection on October 10, 2026, before checkpoint 2 implementation:

- Express serves public files and defines `/api/health`; runtime verification still pending.
- Start reveals the scene. Open Exit changes Exit B's color and shows an alert. Reset reloads the page.
- `simulation.js` and `review.js` are empty. There are no crowd agents, running countdown, scoring, command recording, or replay.
- Redirect has no handler. The HTML closes body before main and needs repair.
- Existing CSS edits the scene to 90% width; preserve this design work.
- The current test command is a placeholder that fails; it provides no quality evidence.
- Teammate overview and roadmap are retained in `docs/plan/` as source references. Their proposed integrations, tracks, schedule, and compatibility claims have not been verified here.

## Checkpoints and acceptance evidence

| Checkpoint | What Carol sees and tries | Design feedback | Proof required | Status |
| --- | --- | --- | --- | --- |
| 1. Experience direction | Read the journey and proposed screen layout in `docs/design/BRAND.md` | Is the staff role clear? Which information should command attention? | Agree core journey, target device, deadline, and feedback mode | Accepted; action-based tutorial confirmed |
| 2. First playable drill | Complete guided exit-opening and redirect tasks; start the independent drill and see routing change | Does performing each task teach the interaction? Can you tell why the action helped? | Tutorial advances only on successful state changes; practice is untimed; crowd routes change; timer and reset work; keyboard controls have labels; simulation checks pass | Implemented; six automated checks pass; browser/device review pending |
| 3. Decision review | Finish a round; see actions in time order and results | Does feedback explain cause and effect without implying real-world safety? | Displayed results derive from the run; empty and interrupted runs handled | Not built |
| 4. Signature replay | Change one action's timing; play original and alternative together | Can you distinguish both crowds and understand the difference? | Same seed and commands reproduce results; both comparisons use the same simulation | Not built |
| 5. Complete demo | Try start → drill → review → replay on the intended demo device | Check readability, signposting, sound/captions, and comfort | Actual device/browser checks; save/reopen if persistence is included; live URL verification after authorized deploy | Not built |
| 6. Devpost readiness | Review truthful submission copy, screenshots, and demo sequence | Does the story match the product you can demonstrate? | Event requirements checked; each claim supported; assets ready; submission confirmation recorded only after authorized submit | Draft only |

## Build slices

1. Confirm event constraints and checkpoint 1. Fix document structure and establish clear start, active, and finished states. Use existing scene rather than redesigning the entire app upfront.
2. Implement deterministic crowd state and stepping in `public/simulation.js`, independent of rendering. Connect it in `public/game.js` to visible crowd agents, exit state, queue indicators, timer, and reset. Add an untimed tutorial that waits for successful exit-opening and redirect actions, then starts a fresh independent drill. Record tick-stamped drill actions separately from practice. Check intervention behavior before visual polish.
3. Implement review in `public/review.js` from recorded commands and actual outcomes. Confirm usefulness with Carol before adding extra charts.
4. Reuse the same simulation for original and alternative replay. Distinguish crowds with labels and appearance, not color alone. Verify reproducibility and show only computed differences.
5. Integrate persistence if a saved/reopened run is essential to the confirmed judging track. Neon and Render are teammate proposals; account access and a real operation must be proven before claiming integration.
6. Harden the complete journey and prepare assets from verified behavior. Reserve deadline-relative time for recording, rehearsal, and submission; fill the schedule after the deadline is confirmed.

## Next action

Checkpoint 2 is implemented locally. Pause for Carol to try the practice and drill and provide feedback. Browser QA is pending because the escalated local server launch was declined. Carol can run `npm start` and visit `http://localhost:3000`. Event portal confirmation remains outstanding for event-specific submission work. Keep this file as the single status source; original roadmap hours are reference estimates, not elapsed progress.

## Delivery targets (Eastern local time)

Targets, not promises; feedback time affects the schedule. Keep a working core ahead of optional integrations.

| By | Checkpoint / work |
| --- | --- |
| Oct 10, 5 p.m. | Settle experience direction and event portal |
| Oct 10, 8 p.m. | First playable laptop drill; pause for feedback |
| Oct 10, 10 p.m. | Decision review; pause for feedback |
| Oct 11, midnight | Original/alternative replay; pause for feedback |
| Oct 11, 7 a.m. | Complete demo checks, polish and headset probe; pause for feedback |
| Oct 11, 8:30 a.m. | Feature freeze; record stable demo and finish submission copy |
| Oct 11, 9 a.m. | Submission package ready for Carol/team review |
| Oct 11, 9:30 a.m. | Target authorized submission, leaving buffer before 10 a.m. |

Sources checked October 10: [supplied VIII page](https://knighthacksviii.devpost.com/) and [likely current IX requirements](https://knight-hacks-ix.devpost.com/). No event-specific sponsor claim is established yet.

## Checkpoint 2 implementation evidence

- Implemented action-gated, untimed practice; repeated/unavailable actions cannot advance tasks. Start timed drill clears all practice state. Restart restores task 1.
- Added simplified crowd movement, queues, exit labels/status, opening Exit B, redirection, countdown, actual evacuated counts, and drill completion. Fixed body/main structure.
- Retained the user's 90% scene width and appended laptop/mobile styling. Final visual direction remains for Carol's feedback.
- `npm test`: 6 checks passed, covering tutorial gates/reset, action validation, improved throughput, and deterministic command replay. JavaScript syntax checks and `git diff --check` passed.
- The A-Frame script is served from the installed dependency rather than the remote script CDN. No new dependency installation.
- Local server launch inside sandbox did not remain available; localhost request failed. Escalated `npm start` was declined by user. Browser rendering, actual interaction, and headset compatibility are unverified.
- Decision review and ghost comparison are not implemented in this checkpoint; the completion screen says so. No deployment, commit, push, or submission was performed.

Trial: run `npm start`; open localhost; begin practice; try redirect before opening (disabled); open Exit B; redirect and watch blue figures; start timed drill; confirm Exit B resets closed and timer starts; restart practice.
