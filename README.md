# CrowdClear

Evacuation training game for venue staff. Spot congestion in a stadium lobby, open an alternative exit, redirect the crowd, then review your decisions and replay an alternative as a ghost. Runs in the browser and in VR (WebXR) with A-Frame; Express stores sessions in Neon Postgres.

## Run locally

Requires Node.js 18+.

```sh
npm install
npm start
```

Open http://localhost:3000. Set `PORT` to change the port. VR needs HTTPS, so test headsets against the deployed Render URL.

## Test

```sh
npm test
```

Smoke tests start the server on a free port and check the health route, every local script and stylesheet `index.html` loads, and that the browser scripts parse. GitHub Actions runs them on every push to `main` and every pull request.

## Deploy

Render web service linked to this repo:

- Build command: `npm ci`
- Start command: `npm start`
- Auto-Deploy: **After CI Checks Pass**, so `main` only deploys when CI is green

The Node version comes from `.node-version`, for both Render and CI.

## Plan

See [docs/plan/](docs/plan/README.md) and [CHECKLIST.md](CHECKLIST.md).

## Agent skills

Codex skills for planning, building, reviewing, and submitting live in [.agents/skills/](.agents/skills/README.md).
