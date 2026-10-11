# CrowdClear team checklist

Working deadline: **October 11, 10 a.m. Eastern local time**. Feature freeze 8:30 a.m.; submission-ready package by 9 a.m.

Lyanis owns UX/UI (called Carol in older notes). Colin owns feature integration. Either can help the other, but name one owner for each task before starting. This file assigns work; [PLAN.md](PLAN.md) tracks decisions and evidence; [CHECKLIST.md](CHECKLIST.md) keeps the original technical target.

## Latest integration checkpoint

The current build has 60 people with scattered starts, varied speeds, and brief hesitation, plus four seconds of hazard clearing and a separate reopening action. Approved concourse textures, animated push-bar doors, EXIT signs, striped equipment, and smoke are integrated. Teammate updates for separate VR instruction and expandable score panels are preserved. All 57 automated tests pass locally. On-screen instructions now use plain words and green, blue, and amber action cues. Small smoke and fire effects appear at the front corners during the incident.

The current [Devpost description](docs/devpost-about.md) replaces the older 30-person figures below. Mic calm is implemented (VERSION 8): select panickers, speak (mic volume) or Hold Reassure; no speech-to-text. Physical-headset comfort for the raised panels and door/person select still need checking (IWER / Quest). Older checkpoints below are historical evidence.

## Where we are (October 10, 9 p.m., `main` after Lyanis's `6ba692a`)

Works on a laptop, verified by 32 automated tests (CI green on Node 24):

- Guided practice (two Exit B tasks with yellow checkmarks), then a 60-second drill. All exits start open; between 10 and 20 s a hazard blocks the exit most people are heading to. Every exit has Clear hazard, Open, and Redirect controls.
- At the end the score card leads (people evacuated plus a time bonus when everyone gets out), with the decision review (outcome and timestamped actions) and comparison below it.
- Re-time one action and replay: your original run as wireframe figures beside the alternative as solid figures, with the measured difference.
- Saving: a finished drill saves and its link reopens it. Verified against the real Neon database; the live site still needs `DATABASE_URL` set on Render.
- Headset view: a raised platform with a panel of buttons. Never tried on a headset.

Honest gaps. It plays like a basic simulator, not a VR training game:

- **VR is not proven.** The live site does not deploy (Render loops on its startup page), so no headset has run it. In VR the player presses flat menu buttons on a panel; nothing in the world is interactive. No audio, primitive shapes.
- **Decisions now matter (fixed in `6ba692a`).** Measured: no reaction leaves 15 to 20 people inside at 60 s; clearing and reopening at once clears everyone in 45.9 s (score 44); reacting 15 s late costs 14 to 15 points or fails.
- **Deeper since `0eaf90f`.** The hazard now hits A, B, or C depending on the drill; redirects have a 5 s cooldown; a long line slows its exit, and the review names the longest line. Measured over all 101 hazard times: no reaction never clears; fixing at once clears in 52.8 s; fixing plus one good redirect in 37.5 s; spreading people early, then fixing, in 32.1 s with a 14-person longest line instead of 24.
- **Still simple.** People keep a body width apart now, but they walk straight at the doors and the scene is primitive shapes.

## Tonight, in order

**P0. Unblock the demo (Colin, by 9 p.m.)**

- [ ] Fix the Render deploy loop. The app starts cleanly from a fresh clone on Render's port, so the cause is a Render setting; read the service's Events and Logs (checks listed in PLAN.md, "Render").
- [ ] Copy `DATABASE_URL` into Render's Environment; the value is in Colin's local `.env.local` (written by `neon link`). Then finish one drill on the live URL and reload its link. *Neon side done: repo linked to project CrowdClear (`quiet-mouse-43259915`, branch `production`), `runs` table created, and save, retry, reopen, and replay verified against the real database.*
- [ ] Headset check (emulated Quest 3 passed: entry, panel, trigger on a door, exit; see PLAN.md): on the live HTTPS URL, or locally through `adb reverse tcp:3000 tcp:3000` (Quest) or a `cloudflared` tunnel. Enter headset view, press Clear/Open/Redirect with a controller, note where the platform and panel should move. Without a headset, the IWER emulator (Immersive Web Emulator extension plus the `iwer` MCP server on Colin's machine) can drive the page.

**P1. Make it feel like VR (Colin, about 3 h)**

- [x] Point at the exit doors themselves: a click or trigger on a door clears its hazard, opens it, or sends people there, through the page buttons (`ab6ddb9`). Laptop verified with real mouse raycasts.
- [x] Give the post presence: raised post with a railing, animated double doors, striped equipment blockage, and drifting smoke. Physical-headset tuning remains open.
- [x] Audio: two-tone alarm when the hazard hits, spoken announcements for the hazard and each redirect, Sound on/off button; the feedback line and headset panel carry the same words (`5b91a4f`). Not positional. Lyanis can rewrite the lines in `game.js` (`announce(...)`).

**P1. Make decisions matter (Colin builds; Lyanis decides the tuning, about 3 h)**

- [x] The hazard strikes mid-drill (10 to 20 s) at the exit most people are heading to (Lyanis, `6ba692a`).
- [x] Vary which exit gets hit (`0eaf90f`).
- [x] Congestion: a long line slows its exit, and the review names the longest line (`0eaf90f`).
- [x] A 5 s redirect cooldown; spamming now scores below one well-chosen redirect (`0eaf90f`).
- [x] Wrong or slow calls now fail within the 60 s drill without raising the crowd size (no reaction, redirect only, and a 15 s late fix all fail).

**P2. Lyanis**

- [x] End-of-drill layout: the score leads, then the action timeline and comparison (`6ba692a`).
- [ ] Door, hazard, and signage art direction for the P1 VR pass; PA and caption copy.
- [ ] Devpost story, thumbnail, screenshots, and narration from the working build. Label headset support "experimental" unless the P0 headset check passes.

## Decisions only the team can make

- [x] The user updated clearing to four simulated seconds; reopening remains a separate action. The earlier immediate-clearing decision is superseded.
- [x] Score is people evacuated plus whole seconds left when everyone is out; open doors no longer multiply it (Lyanis, `6ba692a`).
- [ ] Which judging tracks? Neon needs P0 saving on the live URL; a VR or game track needs the headset check and the P1 VR pass.
- [x] Presage breathing sensing: built for the laptop (`bb45350`); see README "Breathing". Was: build it or cut it? It is possible on the laptop only (Node SDK `@smartspectra/node-sdk`, Windows x64 supported, needs a Presage API key from physiology.presagetech.com, a few hundred MB of native packages, 30 s before the first reading, cannot see a face inside a headset). Worth about 2 to 3 hours only if the event has a Presage or Encompass prize and a key arrives soon. Recommendation: cut unless both are true.
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
- [x] ElevenLabs audio: seven spoken lines, a recorded alarm, and a looping crowd ambience generated with `npm run audio` and played in the game (browser voice and synth remain as fallbacks). Someone should listen once on the demo device.
- [x] Hazard smoke and a railing on the VR post (`e4f64da`).
- [x] Laptop redesign with the frontend-design skill: gate plates, Overpass/Atkinson type, calmer panels (`91a5766`). Lyanis: please review; it is one commit to adjust or revert.
- [x] Realistic stadium: Kenney CC0 animated people with exit-colour rings, EXIT signs, floor guidance strips, lighting, closer camera (`5366bd8`); controller haptics (`c83490b`).
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
