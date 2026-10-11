# CrowdClear

Laptop-first evacuation training prototype for venue staff. Complete action-based practice, then run a timed stadium drill: open Exit B and redirect the crowd. Built with A-Frame and Express.

A finished drill opens a decision review, can be replayed against one re-timed decision, and is saved to Postgres (Neon) so its link reopens it. Saving is verified against the team's Neon database; the live site needs `DATABASE_URL` set on Render. Headset support is not yet verified. Crowd behavior is simplified, not a validated real-world evacuation model.

## Run locally

Use the Node version in `.node-version` (24).

```sh
npm install
npm start
```

Open http://localhost:3000. Set `PORT` to change the port. Set `DATABASE_URL` to a Postgres connection string to save drills; without it the game still runs and each finished drill says it was not saved. The server creates its table from `schema.sql` at startup. VR needs HTTPS, so test headsets against the deployed Render URL.

## Simulation scene assets

The lobby uses local Higgsfield-generated floor, wall, and exterior textures with lightweight A-Frame doors, EXIT signs, equipment cases, a trolley, and peripheral fixtures. Doors swing open when their route opens. A blocked route shows striped equipment and smoke; clearing removes both, and opening the door remains a separate action. Mouse and headset controls share the existing handlers.

Asset provenance and runtime limits are documented in [public/textures/concourse/README.md](public/textures/concourse/README.md). These visual changes preserve the simulation rules and saved-run format. The bench, bin, and concession shutter sit outside the walking routes and are decorative.

The crowd now has 60 people, scattered starting positions, varied walking speeds, and brief hesitation from some people when the incident occurs. Three queue columns keep the crowd inside the lobby. Clearing takes four seconds with a visible countdown; the route stays blocked until work finishes, and reopening remains separate. These game cues are simplified, not a validated model of panic.

These behavior changes use simulation version 6. Older saved drills remain in the database, but the current player reports that it cannot replay their older rules.

## Audio (ElevenLabs)

The spoken lines (drill start, each hazard, each redirect) live in `public/announcements.js`. `public/audio/` holds ElevenLabs clips for every line, plus a recorded alarm and a looping crowd ambience from the sound-effects API, all listed in `public/audio/clips.js`. The game plays them and falls back to the browser's speech and synth for anything missing.

To regenerate, put `ELEVENLABS_API_KEY` (or `ELEVEN_API_KEY`) in `.env` or `.env.local` (both gitignored) and run `npm run audio`. Existing files are kept to save credits; add `-- --force` to regenerate them. The key is only used by the script, never by the browser. `ELEVENLABS_VOICE_ID` and `ELEVENLABS_MODEL_ID` override the voice and speech model.

## Breathing (Presage SmartSpectra, laptop only)

A local helper in `sensor/` reads breathing rate from the laptop webcam with Presage's SmartSpectra SDK and posts it to the game server on the same machine. The page then shows a Breathing reading in the HUD and the headset panel, and the review compares practice with the drill. Readings below 50% confidence only show progress. Breathing data stays in memory on that machine; it is never saved, and the server only accepts readings from localhost (so never on Render). It cannot work inside a headset, which hides the face.

1. Put `PRESAGE_API_KEY` in `.env.local` (from physiology.presagetech.com).
2. `cd sensor && npm install` once (about 400 MB; Presage ships native builds for macOS Apple Silicon, Linux x64/arm64, and Windows x64).
3. With `npm start` running, run `npm run sensor` in a second terminal, sit facing the camera with your chest in view, and allow about 30 seconds for the first reading.

On Windows on ARM (Snapdragon), Presage has no native build: install and run the helper with an x64 Node from nodejs.org, which Windows runs under emulation (for example `C:
ode-x64
ode.exe C:
ode-x64
ode_modules
pmin
pm-cli.js install`, then `C:
ode-x64
ode.exe --env-file-if-exists=../.env.local presage.mjs` inside `sensor/`). It works but warns the camera is under 25 frames per second, so readings take longer to become confident.

## Test

```sh
npm test
```

Smoke tests start the server on a free port and check health, all local page assets (including A-Frame), and browser-script syntax. Simulation and tutorial tests check action gating, fresh resets, routing effects, and deterministic replay. `npm test` runs both suites; GitHub Actions uses that same command on every push to `main` and every pull request.

## Deploy

Render web service linked to this repo:

- Build command: `npm ci`
- Start command: `npm start`
- Auto-Deploy: **After CI Checks Pass**, so `main` only deploys when CI is green
- Environment: `DATABASE_URL` = the Neon connection string (keep it in Render, never in the repo)

The Node version comes from `.node-version`, for both Render and CI.

## Plan

See [PLAN.md](PLAN.md) for current checkpoints and evidence, [design direction](docs/design/BRAND.md) for the accepted experience, and [docs/plan/](docs/plan/README.md) / [CHECKLIST.md](CHECKLIST.md) for the original teammate roadmap.

## Try the current checkpoint

Begin guided practice → open Exit B → redirect the crowd → watch blue figures head to the middle exit → start a fresh timed drill. Practice waits for successful tasks and has no time pressure. Restart returns to task 1.

## Agent skills

Codex skills for planning, building, reviewing, and submitting live in [.agents/skills/](.agents/skills/README.md).
