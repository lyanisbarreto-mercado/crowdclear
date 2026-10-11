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

## Voice announcements (ElevenLabs)

The hazard and redirect announcements live in `public/announcements.js`. To replace the browser's built-in voice with ElevenLabs clips, put `ELEVENLABS_API_KEY=...` in `.env` (gitignored) and run `npm run voice`. It writes one MP3 per line to `public/audio/` plus `public/audio/clips.js`; commit those. The key is only used by the script, never by the browser. `ELEVENLABS_VOICE_ID` and `ELEVENLABS_MODEL_ID` override the defaults. Lines without a clip fall back to the browser voice.

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
