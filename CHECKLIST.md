# CrowdClear checklist

For task ownership and parallel work, use the new [team checklist](TEAMMATE_TASKS.md).

Current progress and revised designer-led checkpoints are tracked in [PLAN.md](PLAN.md). The items below preserve the broader original target; do not mark a compound requirement complete from a partial implementation.

Phases and gates come from [docs/plan/09-roadmap.md](docs/plan/09-roadmap.md). If a gate isn't met on time, cut scope from the next phase rather than pushing the gate back.

## Hours 0–2 · Prove the platform

- [x] Bare Express + A-Frame scene deployed to Render
- [x] Render Auto-Deploy set to "After CI Checks Pass" (build `npm ci`, start `npm start`)
- [x] Published HTTPS URL: enter VR on the headset, select an object, play audio
- [x] Mouse selection works on the laptop
- [x] Neon connected; one test row written
- [x] Presage sample tried on the demo laptop with real lighting
- [ ] **Gate · Go / no-go:** VR works from the live URL; Presage reads, or it is cut

## Hours 2–12 · Core simulation

- [ ] Lobby: floor, walls, three marked exits, ~30 crowd figures, fixed command position (started: floor, walls, 3 exits, fixed camera)
- [ ] `simulation.js`: grid, one flow field per open exit, exit release rate, fixed ticks, `step(state, commands)` with no rendering code
- [x] Laptop action: open Exit B (automated action checks pass; visual QA pending)
- [ ] Action: redirect a marked crowd group via directional markers (per-exit redirect buttons implemented; it moves half of everyone, not a chosen group; in-scene selection/markers pending)
- [ ] Desktop clicks and VR controller selection share the same handlers; controls and instructions live inside the 3D scene (shared handlers done; in-scene panel shows in VR only, since the laptop keeps the side panel per BRAND.md; headset untested)
- [ ] `schema.sql`: `runs`, `commands`, `measurements` (`runs` done, with commands as jsonb; `measurements` only if sensing ships)
- [ ] Save/load API: validated input, per-session write token, stable event IDs, non-blocking batched uploads (done except the write token, which an insert-only API doesn't need: the server replays each save and rejects mismatches; client run IDs make retries safe; one non-blocking upload per run)
- [x] **Gate · Crowd reroutes:** opening an exit changes paths; a run saves to Neon (saved through the app's API on 2026-10-10)

## Hours 12–22 · Full loop

- [x] Emergency round: incident blocks the familiar exit at a fixed tick (Lyanis, `6ba692a`: at a tick chosen once per run between 10 and 20 s, the busiest exit is blocked; replays face the same event)
- [ ] Review screen: evacuated before deadline, max queue, time to redirect, command timeline (outcome, clearance time, timestamped command timeline, and Lyanis's score card done; max queue not computed)
- [x] Ghost replay: edit one command, re-run both from the same initial state, faded original vs solid alternative (laptop browser verified; headset pending)
- [x] Determinism check: re-simulated original matches its saved result (server replays every save; a reopened run replayed exactly in the browser against PGlite)
- [ ] **Gate · Loop works live:** start to replay runs on the published URL

## Hours 22–28 · Clarity and stretch

- [ ] Prepared announcements, positional environment sounds, radio speech
- [ ] Captions, accessible pause, signage with symbols and text as well as color
- [x] Failure handling (failed saves never show as successful)
- [ ] Breathing feedback (only if the first gate passed)
- [ ] **Gate · Feature freeze** at hour 28

## Hours 28–36 · Ship

- [ ] Bug fixes
- [ ] Backup screen recording of a full round
- [ ] Demo rehearsed at least three times
- [ ] **Gate · Judging:** open the URL first to wake the server

## Completion checks

- [ ] The published HTTPS URL enters VR on the actual headset and works with a mouse on the laptop.
- [x] A blocked exit cannot be traversed; agents with no route wait.
- [ ] Opening an alternative exit visibly changes crowd movement within a few seconds.
- [x] Re-simulating a saved run reproduces its saved final result exactly.
- [x] Changing one command keeps every other input and the hazard schedule identical.
- [ ] Ghost and alternative crowds run together without the frame rate dropping noticeably on the headset.
- [x] Failed saves never display as successful; retried uploads don't duplicate events.
- [ ] If sensing shipped: stale or invalid readings display as unavailable.
- [ ] A full round runs start to reset on the demo hardware, three times in a row.

## Repo hygiene

- [x] `.gitignore`; `node_modules` and `.DS_Store` untracked
- [x] Plan converted to `docs/plan/`
- [x] A-Frame pinned to 1.8.0 and served by Express
- [x] Codex skill kit in `.agents/skills/`
- [x] CI smoke tests on every push to `main` and every PR (`.github/workflows/ci.yml`)
- [ ] `docs/stack.md` and `docs/adr/0001-stack.md` (deferred until after the event)
