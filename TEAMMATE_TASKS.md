# CrowdClear team checklist

Working deadline: **October 11, 10 a.m. Eastern local time**. Feature freeze 8:30 a.m.; submission-ready package by 9 a.m.

Lyanis owns UX/UI (called Carol in older notes). Colin owns feature integration. Either can help the other, but name one owner for each task before starting. This file assigns work; [PLAN.md](PLAN.md) tracks decisions and evidence; [CHECKLIST.md](CHECKLIST.md) keeps the original technical target.

## Where we are (October 10, 7:45 p.m., `main` at the Lyanis merge)

Works on a laptop, verified in a browser and by 28 automated tests (CI green on Node 24):

- Guided practice (two Exit B tasks with yellow checkmarks), then a 90-second drill where a random exit starts blocked by a hazard. Every exit has Clear hazard, Open, and Redirect controls.
- At the end: Lyanis's results card (score, tip) replaces the scene, and the side panel shows the decision review (outcome and timestamped actions).
- Re-time one action and replay: your original run as wireframe figures beside the alternative as solid figures, with the measured difference.
- Saving: a finished drill saves and its link reopens it, once `DATABASE_URL` is set on Render. Tested against an in-process Postgres, not yet against Neon.
- Headset view: a raised platform with a panel of buttons. Never tried on a headset.

Honest gaps. It plays like a basic simulator, not a VR training game:

- **VR is not proven.** The live site does not deploy (Render loops on its startup page), so no headset has run it. In VR the player presses flat menu buttons on a panel; nothing in the world is interactive. No audio, primitive shapes.
- **Decisions barely matter.** With the hazard at Exit B (one drill in three), doing nothing clears in 45.9 s, the same as acting. Clearing is instant, so the emergency is two clicks at 0 s. Redirects can be spammed between exits. People walk in straight lines through each other, and each exit lets one person out every 1.8 s however crowded it is.
- **The score rewards open doors, not decisions.** Opening everything multiplies the score by 3 regardless of timing.

## Tonight, in order

**P0. Unblock the demo (Colin, by 9 p.m.)**

- [ ] Fix the Render deploy loop. The app starts cleanly from a fresh clone on Render's port, so the cause is a Render setting; read the service's Events and Logs (checks listed in PLAN.md, "Render").
- [ ] Copy `DATABASE_URL` into Render's Environment; the value is in Colin's local `.env.local` (written by `neon link`). Then finish one drill on the live URL and reload its link. *Neon side done: repo linked to project CrowdClear (`quiet-mouse-43259915`, branch `production`), `runs` table created, and save, retry, reopen, and replay verified against the real database.*
- [ ] Open the live HTTPS URL on the headset: Enter headset view, press Clear/Open/Redirect with a controller, note where the platform and panel should move.

**P1. Make it feel like VR (Colin, about 3 h)**

- [ ] Point at the exit doors themselves. Trigger on a door does its next sensible action (clear hazard, then open, then send the crowd there). Same handler on a laptop when clicking the door. Keep the panel for instructions.
- [ ] Give the post presence: a balcony with a railing at the lobby edge, doors that visibly slide open, the hazard as smoke or flicker instead of a yellow box.
- [ ] Audio: alarm at drill start, a short PA line on each redirect, positional sound at the hazard. Captions on the panel (Lyanis writes the lines).

**P1. Make decisions matter (Colin builds; Lyanis decides the tuning, about 3 h)**

- [ ] The hazard strikes mid-drill (10 to 20 s) at the exit most people are heading to, so every drill needs a reaction under time pressure (CHECKLIST "Emergency round").
- [ ] Congestion: exits slow down when their queue is long, and the review shows peak queue per exit (CHECKLIST "max queue").
- [ ] A redirect cooldown (or a limited number of staff orders) so spamming stops being the best play.
- [ ] Raise the crowd to about 60 and retune so a slow or wrong call can still fail at 90 s.

**P2. Lyanis**

- [ ] Lay out the end of the drill now that the results card and the decision review both appear. Decide which leads and where "Compare another decision" sits.
- [ ] Door, hazard, and signage art direction for the P1 VR pass; PA and caption copy.
- [ ] Devpost story, thumbnail, screenshots, and narration from the working build. Label headset support "experimental" unless the P0 headset check passes.

## Decisions only the team can make

- [ ] Keep instant hazard clearing (Lyanis's call) or make clearing take a few seconds so early action pays off?
- [ ] Keep the score formula `(evacuated + seconds left) × open exits`, or score timing and peak congestion instead?
- [ ] Which judging tracks? Neon needs P0 saving on the live URL; a VR or game track needs the headset check and the P1 VR pass.
- [ ] If tonight runs short, cut VR depth or mechanics depth first? (Recommendation: keep the door interaction and the mid-drill hazard; cut balcony art and extra audio.)

## Lyanis · UX/UI

- [x] Per-exit controls, practice checkmarks, hazard drills, and the results card (merged in `212243f`).
- [ ] **Try the merged build.** Run `git checkout main`, `git pull`, `npm install` (new packages; `npm start` fails without them), `npm test` (28 pass), `npm start`. Then play practice, a drill per hazard exit, results, review, and one comparison. Record the three most important fixes. Locally the review says "Not saved"; that is expected without a database. `Lyanis'-tasks` is fully merged, so start new work from `main`.
- [ ] End-of-drill layout (results card plus decision review) and comparison controls. Distinguish the two crowds without relying on color alone.
- [ ] Check keyboard focus, readable contrast, small-screen wrapping, instructions, and captions.
- [ ] Devpost story, thumbnail/screenshots, and demo narration. Use actual results and clearly label the simulation.

Primary files: `public/styles.css`, `docs/design/BRAND.md`, `docs/submission-draft.md`. Own visual markup in `public/index.html` during an agreed editing window.

## Colin · feature integration

- [x] Expose a completed run (initial state, version, tick-stamped actions, results); practice stays out of scored runs.
- [x] Decision review data and text in `public/review.js`, including no actions, time expiry (now reachable: a hazard at A or C left alone), and early completion.
- [x] Alternative replay from the same start and scenario, changing one action's time; the original reproduces exactly.
- [x] Save/load with server-side replay validation and honest failure messages (`b60aafa`, scenario added in the merge). Verified against the real Neon database; the Render variable is P0.
- [x] Headset controls that press the page's own buttons (`e3cd908`, per-exit grid in the merge). Headset check is P0.
- [x] Merge Lyanis's hazard/results branch with review, replay, saving, and headset work (`212243f`).
- [ ] P0, P1 items above.
- [ ] Keep tests and CI green; check the deployed build after each push.

Primary files: `public/game.js`, `public/simulation.js`, `public/review.js`, `server.js`, `schema.sql`, `test/`, `tests/`. Own wiring changes to `public/index.html` during an agreed editing window.

## Handoffs and checkpoints · both

| Checkpoint | Lyanis brings | Colin brings | Complete when |
| --- | --- | --- | --- |
| Merged build | Three most important fixes | Merge, tests, live URL | Both run the same build from `main` |
| VR pass | Door/hazard art direction, caption copy | Door interaction, audio, headset tuning | A first-time player acts from the headset without the page |
| Mechanics pass | Tuning calls (clearing time, score) | Mid-drill hazard, congestion, cooldown | Each drill has a decision whose timing visibly changes the result |
| Submission ready | Story, visual assets, video | Verified links and technical claims | Both review the package before submitting |

- [ ] At each checkpoint, run the journey together; Lyanis gives feedback before moving to the next visible milestone.
- [ ] Keep element IDs used by game code (listed in PLAN.md); style with classes. Colin updates code and tests for any renamed hook.
- [ ] Take turns editing `public/index.html`. Announce the handoff; avoid simultaneous edits to shared files.
- [ ] Push focused commits often. A task branch is fine; tell the other person so it gets merged promptly instead of drifting (the last branch started before three feature commits).

## Final hour · both

- [ ] Freeze new features by 8:30 a.m.; fix only blockers and capture the stable demo.
- [ ] Run start → practice → drill → review → comparison → restart on the actual demo device.
- [ ] Lyanis checks copy/assets; Colin checks tests, live URL, repository visibility, and any claimed integrations.
- [ ] Attach the demo video, include all teammates, select eligible prizes, and review every required submission field.
- [ ] Named submitter submits by the 9:30 a.m. target and saves confirmation before the 10 a.m. deadline.

## If time gets tight

Protect the laptop loop, review, comparison, demo recording, and submission buffer. Then the P0 live URL. Then whichever P1 track the judging needs. Defer sensing, additional venues, elaborate models, and extra audio. Do not describe an unfinished feature as working.
