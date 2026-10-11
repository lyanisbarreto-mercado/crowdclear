# CrowdClear working plan

Updated: October 10, 2026 (America/New_York). Working branch: main.

## Outcome and scope

Help venue staff understand how their decisions affect congestion in a simulated stadium evacuation. The signature moment: finish a drill, change the timing of one decision, and compare the original crowd with the alternative replay.

Core journey: understand the scenario → action-based guided practice → start timed drill → spot congestion → open an exit / redirect people → review decisions → compare an alternative.

Confirmed tutorial decision: each interactive step waits for a successfully performed task. Verify the resulting game state and show the visible effect; clicks or a Next button alone do not advance it. Practice is untimed and separate from scored runs.

Keep one venue and two actions. Crowd size and round duration are design targets to confirm, not measured claims. Webcam sensing, additional venues, accounts, and elaborate models are deferred. This is a training prototype, not a validated evacuation predictor.

## Working agreement

- Carol owns UX/UI, comprehension, and experience feedback. Her teammate owns feature integration, simulation/review/replay wiring, persistence, and deployment checks. Either may help across roles through an explicit task/file handoff. See [TEAMMATE_TASKS.md](TEAMMATE_TASKS.md) for assignments; agent work follows the active owner's lane.
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
| 2. First playable drill | Complete guided exit-opening and redirect tasks; start the independent drill and see routing change | Does performing each task teach the interaction? Can you tell why the action helped? | Tutorial advances only on successful state changes; practice is untimed; crowd routes change; timer and reset work; keyboard controls have labels; simulation checks pass | Implemented; nine combined automated checks pass; browser/device review pending |
| 3. Decision review | Finish a round; see actions in time order and results | Does feedback explain cause and effect without implying real-world safety? | Displayed results derive from the run; empty and interrupted runs handled | Implemented on a baseline layout; laptop browser verified; awaiting Carol's layout and feedback |
| 4. Signature replay | Change one action's timing; play original and alternative together | Can you distinguish both crowds and understand the difference? | Same seed and commands reproduce results; both comparisons use the same simulation | Implemented; original replay reproduced exactly in tests and browser; awaiting Carol's feedback |
| 5. Complete demo | Try start → drill → review → replay on the intended demo device | Check readability, signposting, sound/captions, and comfort | Actual device/browser checks; save/reopen if persistence is included; live URL verification after authorized deploy | Save/reopen and headset controls built and checked locally; real Neon, live URL, and headset checks pending |
| 6. Devpost readiness | Review truthful submission copy, screenshots, and demo sequence | Does the story match the product you can demonstrate? | Event requirements checked; each claim supported; assets ready; submission confirmation recorded only after authorized submit | Draft only |

## Build slices

1. Confirm event constraints and checkpoint 1. Fix document structure and establish clear start, active, and finished states. Use existing scene rather than redesigning the entire app upfront.
2. Implement deterministic crowd state and stepping in `public/simulation.js`, independent of rendering. Connect it in `public/game.js` to visible crowd agents, exit state, queue indicators, timer, and reset. Add an untimed tutorial that waits for successful exit-opening and redirect actions, then starts a fresh independent drill. Record tick-stamped drill actions separately from practice. Check intervention behavior before visual polish.
3. Implement review in `public/review.js` from recorded commands and actual outcomes. Confirm usefulness with Carol before adding extra charts.
4. Reuse the same simulation for original and alternative replay. Distinguish crowds with labels and appearance, not color alone. Verify reproducibility and show only computed differences.
5. Integrate persistence if a saved/reopened run is essential to the confirmed judging track. Neon and Render are teammate proposals; account access and a real operation must be proven before claiming integration.
6. Harden the complete journey and prepare assets from verified behavior. Reserve deadline-relative time for recording, rehearsal, and submission; fill the schedule after the deadline is confirmed.

## Next action

Work from [TEAMMATE_TASKS.md](TEAMMATE_TASKS.md), "Tonight, in order": P0 live URL, saving, and headset check; then the P1 VR and mechanics passes. "Carol" in older entries below is Lyanis.

### Render (deploy loops on its startup page)

A fresh clone of `main` runs `npm ci` and `npm start` cleanly with `PORT=10000`: the server logs `CrowdClear running at http://localhost:10000`, `/api/health` answers 200, A-Frame is served, and `/api/runs` answers 503 without a database. So the loop is a Render setting. In the Render dashboard, open the CrowdClear service:

1. **Events**: is the newest deploy "Deploy live" or "Deploy failed", and for which commit? Auto-Deploy waits for CI, and CI is green for every recent commit.
2. **Logs**: find `CrowdClear running at http://localhost:10000`.
   - Line present but the deploy never goes live: Settings → Health Check Path must be `/api/health` (or empty). Any other path returns 404 and Render keeps retrying.
   - `Cannot find module …/index.js`: Settings → Start Command must be `npm start`.
   - `No open ports detected`: the start command is not running `server.js`; same fix.
   - Build errors: Build Command must be `npm ci`; Root Directory empty; branch `main`.
3. **Settings**: the service must be a Web Service (not a Static Site or Background Worker) on the Node runtime. Node comes from `.node-version` (24).
4. A free instance asleep for 15 minutes shows the waking-up page once for up to about a minute; it should not repeat.

### Neon saving (`DATABASE_URL`)

1. Copy the pooled `DATABASE_URL` from `.env.local` on Colin's machine (`neon link` wrote it), or from console.neon.tech → CrowdClear → **Connect** with connection pooling on.
2. Render → the CrowdClear service → **Environment** → add `DATABASE_URL` with that string → save and deploy.
3. On the live URL, finish a drill. The review should say "Saved." and the address should end in `?run=…`; reload it and the same review opens. In Neon's SQL Editor, `SELECT id, blocked_exit, result, created_at FROM runs ORDER BY created_at DESC LIMIT 5;` shows the row. The server creates the table at startup.
4. Keep the string only in Render (and a local `.env` if needed); never in the repo or chat.

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

## Reconciliation with teammate main

- Fast-forwarded local main to `566c36f`, preserving all five incoming commits. Kept the teammate’s skill kit, CI, Node 24 configuration, pinned A-Frame 1.8.0, lockfile, repository hygiene, and original roadmap.
- Kept the exported Express app so smoke tests can bind a free port; retained `/aframe` local serving and aligned the new page to that route.
- Combined A-Frame-specific CSS sizing with Carol’s 90% width and the new practice layout. Retained the canvas resize on scene reveal and non-modal action feedback.
- `npm test` now uses the teammate’s `node --test` discovery and runs both `test/` and `tests/`. All 9 tests pass, including HTTP assets/health and simulation/tutorial checks. The sandbox blocked listening; rerunning with approved escalation passed and closed the temporary test server.
- Execution host uses Node 25.9.0; CI remains configured for Node 24. A fresh Node 24 CI run and visual/device checks remain pending.
- Preserved original local work in Git stash `crowdclear-before-reconciliation` and `/tmp/crowdclear-reconcile-backup`. Finder metadata is restored locally and remains ignored. Installed dependencies were preserved locally while the teammate’s commit removed them from tracking.
- Integrated application edits remain uncommitted for review; no push or deployment performed.

## Checkpoints 3 and 4 implementation evidence (Colin, October 10)

- Run record (`lastRun` in `public/game.js`): `{ version, initial, commands: [{ tick, action }], result: { evacuated, remaining, ticks } }`. One tick is 0.1 s. Only a finished timed drill creates one; practice never does.
- Hooks for Carol's layout. Keep these IDs and style with classes. `#review` wraps the review. `#review-timeline` is an `<ol>` with one `<li>` per action, or "No actions taken". `#compare-form`, `#compare-action` (select), and `#compare-time` (seconds) drive the comparison. `#compare-result` holds the result, one sentence per line. The outcome sentence goes in `#task-copy` under the `#task-title` "Decision review".
- In the current simulation every run clears before 90 s, so clearance time is the meaningful result. Measured: no action clears in 45.9 s; opening and redirecting at 0 s clears in 25.2 s; acting at 40 and 45 s clears in 48.3 s, worse than doing nothing, because redirected people walk back across the lobby. The time-expiry path is unit-tested but cannot happen in play yet.
- The comparison re-times one action and keeps every other action's tick. The original replays as low-poly wireframe ghost figures and the alternative as solid figures; the HUD shows both counts. Moving a redirect before Exit B opens makes it fail, and the result text says so.
- `npm test`: 16 pass. Browser check (Playwright Chromium, 1366×850): practice, then a drill with Exit B opened at 0 s and redirect at 4.5 s, reviewed as "All 30 people evacuated in 27.6 s". Re-timing the redirect to 20 s gave "Your original run replayed exactly" and "The alternative cleared the venue 8.3 s later." No console errors besides the missing favicon.
- Known gaps. From the default overhead camera the wireframe/solid difference is hard to see at figure size, so the crowds mostly separate by position, color, HUD, and caption; Carol to judge. Max queue is not computed. Headset not checked. Pushed to `main`; CI passed on Node 24.21.0 (16/16). The Render deploy was not checked.

## Save/load and headset controls evidence (Colin, October 10, session 3)

- Save/load (`b60aafa`). A finished drill posts `{ id, version, commands, result }` to `POST /api/runs`. The server replays the commands with the shared simulation, refuses a record unless every command was accepted at its tick and the result matches, and stores its own result in `runs` (`schema.sql`, created at startup). The client picks the id, so a retried save is a no-op. The address becomes `?run=<id>`, which reopens the run into the review. Without `DATABASE_URL` the server answers 503 and the review says "Not saved".
- New hooks for Carol: `#save-status` (in `#review`), `#load-status` (in `#intro`), `#vr-btn` (in `.drill-heading`, hidden unless the browser supports immersive VR).
- Headset controls (`e3cd908`). In a WebXR session the rig moves to a raised post (`0 6 13`) and `#vr-panel` mirrors the task, feedback, review timeline, and counts. Its buttons forward to the page buttons, so both inputs share handlers. Leaving VR restores the laptop camera. Laptop layout unchanged.
- `npm test`: 23 pass. Persistence tests run the real SQL on PGlite (in-process Postgres); mutating the replay check or removing `ON CONFLICT` each fails a test.
- Browser (Playwright Chromium, server backed by PGlite): drill with Exit B at 0 s and redirect at 4.5 s saved as "All 30 people evacuated in 27.6 s"; a fresh load of its `?run=` link reopened the review; re-timing the redirect to 20 s gave "Your original run replayed exactly" and "8.3 s later". A bad link showed "No saved drill matches this link." With a simulated XR session and mouse raycasts through the same `cursor` component the lasers use, the panel completed practice, ran a drill, showed the review, ignored a hidden button, and exiting restored the camera to `0 22 18`, -42°.
- Not verified: the real Neon database (no connection string on this machine), the live Render URL (not recorded), and an actual headset. `@electric-sql/pglite` is a dev dependency for tests only; `pg` 8.23.1 is the runtime driver.

## Immediate hazard and score checkpoint

Carol approved immediate hazard clearing. Implemented on the current `Lyanis'-tasks` checkout, preserving the existing per-exit HTML edits and leaving draft duplicate files untouched.

- Drill start randomly selects one blocked exit; the run stores `blockedExit` and targeted commands. Clearing removes the hazard immediately; opening remains separate. All three exits have clear/open/redirect controls and visible status.
- Tutorial completion shows persistent yellow checks; reset clears them. Practice remains untimed with the original two action gates.
- Results show actual counts, remaining time, usable open exits, a transparent score formula, and supportive feedback. Ghost comparison and full command-timeline review remain future work.
- `npm test`: 14 tests pass, covering HTTP assets, hazards at all exits, blocked-route protection, targeted command reproducibility, results scoring, tutorial gates/checks/reset, and existing simulation behavior.
- Test discovery explicitly includes `test/*.test.js` and `tests/*.test.js`, leaving draft duplicate `test 2.js` files untouched and outside the runnable suite.
- Local preview HTTP request returned 200. Chrome visual inspection was blocked because Computer Use was not approved for Chrome; browser layout and headset behavior remain unverified. No commit or push performed.

Next: Carol reviews tutorial checkmarks, per-exit controls, and the results composition at localhost; pause for feedback before the next visible milestone.

## Merge of Lyanis's hazard and results branch (Colin, October 10, evening)

- `212243f` merges `Lyanis'-tasks` (`7c5586d`), which had branched before checkpoints 3-4. Kept from Lyanis: random hazard exit per drill, Clear hazard, per-exit controls, practice checkmarks, results card and score. Kept from `main`: review, comparison replay, save/load, headset controls.
- Integration fixes: the replay schedule now passes each command's target (without it, a replayed redirect to C became a redirect to B); `VERSION` is 2; saved runs carry `blockedExit` (column `blocked_exit`) and the server rebuilds that scenario before replaying; `review.js` gained `score()` and stays DOM-free; the results card hides the scene on a laptop only and comparison brings it back; the headset panel has a per-exit grid.
- Left out four macOS duplicates (`PLAN 2.md`, `docs/submission-draft 2.md`, `tests/simulation.test 2.js`, `tests/tutorial.test 2.js`); each is an older or identical copy and remains on the branch.
- `npm test`: 28 pass, including a new check that a hazard at Exit A left alone runs out of time ("6 of 30 people evacuated"). Browser (PGlite-backed server): practice checkmarks; drill with Exit A blocked; clear and open A; results card (score 219) and review; comparison with opening moved to 20 s replayed exactly and cleared 19.8 s later; the saved link reopened the Exit A scenario; simulated headset grid ignored Open A while blocked and opened it after Clear A.
- Measured mechanics (no action / clear and open at 0 s / clear and open at 30 s): hazard A 6 of 30 out at 90 s / 45.9 s / 75.9 s; hazard B 45.9 s / 45.9 s / 45.9 s; hazard C 24 of 30 out at 90 s / 45.9 s / 48.1 s. Nine alternating redirects are all accepted.
- One browser run recorded 11 redirects that the test script did not issue; a rerun with a click logger saw only scripted clicks. Probably manual clicks in the visible test window; not reproduced.

## Neon setup (Colin, October 10, night)

- Neon CLI 8.3.5 signed in as Colin. Repo linked to project CrowdClear (`quiet-mouse-43259915`), branch `production`; `.neon` (gitignored) holds the IDs, `.env.local` (gitignored) holds `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`.
- `neon.ts` declares nothing (`defineConfig({})`); `neon config plan` and `neon deploy` both reported "No changes", so Neon was not modified. `@neon/config` and `@neon/env` were added by `neon config init`.
- Skills `neon` and `neon-postgres` are in `.agents/skills/` (Codex, committed) and linked into `.claude/skills/` (Claude Code, gitignored because the links use absolute paths). `skills-lock.json` pins their hashes. The Neon MCP server is in Colin's user-level Claude Code config only.
- Evidence: the real `server.js` routes against Neon created the `runs` table, saved a hazard-A run (201), treated the retry as already saved (200, one row), returned it on reopen with identical commands and result, and rejected a tampered result (422). In a browser, `?run=c7743bbf-…` reopened from Neon showed the three-action timeline and replayed exactly. That row stays in the table as the test record.
- This network blocks outbound port 5432 (also outside the agent sandbox; a public port tester is refused too), so the test used Neon's serverless driver over port 443 with the same `query()` interface. Locally on this network, `npm start` with `DATABASE_URL` will report "Not saved"; Render connects normally over 5432.

## Mid-drill reaction checkpoint

Implemented timed hazard at the live busiest exit, with all exits initially open. Live alert, clear/open controls, original/alternative event locking, and database save/load retain the same scenario. Added nullable `hazard_tick` with an additive schema migration; no remote database operation performed here. Bumped simulation version to 3 to prevent inaccurate replay of older rules.

Verification: `npm test` passed all 32 tests including timed incidents and PostgreSQL-compatible save/load. `git diff --check` passed. Browser/device verification and deployed migration remain pending. Current 60-second duration is preserved.

## Pull of `6ba692a` (Colin, October 10, 9 p.m.)

- Pulled Lyanis's mid-drill hazard, timing score, 60-second drill, and score-first end screen; `npm test` 32 pass locally and CI is green on that commit.
- Measured (hazard at 10 s / 20 s): no reaction leaves 20 / 15 people inside; clearing and reopening 0.1 s after the incident clears everyone in 45.9 s (score 44); reacting 15 s later clears in 59.3 s / leaves 1 inside; redirecting to C alone leaves 10 / 7 inside. The busiest exit was A in every case, because 24 of 30 people start toward it.
- Fixed: the comparison time box still allowed up to 90 s after the drill became 60 s, so 60 to 90 submitted and did nothing. Its maximum now comes from `sim.DURATION`.
