# Stack defaults

Keep an existing working stack or explicit user choice. For a new web app use these defaults unless the demo mechanic needs otherwise. Check current official docs and host compatibility before selecting versions; Context7 can resolve the installed library/version and retrieve focused API guidance when available. Use relevant framework/auth/provider skills rather than loading a broad toolkit. See [quality-tools.md](quality-tools.md) for selection and fallbacks. A package enters only with a real job in an active slice.

## Default web stack

- Next.js (App Router, `src/`) + TypeScript + Tailwind
- Env contract in `src/server/env.ts` (see [scaffold-patterns.md](scaffold-patterns.md))
- Vitest for unit + `*.live.test.ts` for sponsor sandboxes; Playwright for e2e and stills
- Vercel (or the event's host). MongoDB Atlas or Postgres only when durable shared state is needed; signed tokens otherwise

## Web baseline (adapt for CLI, mobile or hardware)

- `GET /api/health` → `{ ok, at, integrations: Record<string, boolean> }` (configured on this deployment; booleans only). Pair it with a real operation smoke test; configuration is not live proof.
- `GET /api/stats` → the contents of `docs/FACTS.json`
- `/judge`: numbered, no-login itinerary; steps gated on `integrationStatus()`
- Required local CI-equivalent checks: lint, typecheck, test, build, em-dash hygiene, secret scan; mirror them in CI. Run the installed tools directly; install dependencies when missing or the lockfile changes, not on every iteration. Track remote Actions asynchronously; enforced repository/event checks still gate merge/release.
- `.env.example` naming every key in `INTEGRATIONS`

## Add only when the wedge needs it

| Need | Add | Honesty note |
|---|---|---|
| Sponsor payments / identity | Official sandbox SDK or signed HTTP as their docs require | Say "sandbox" |
| Vision / LLM | The event's sponsored model if any; keyless auth (host OIDC to cloud identity federation) when time allows | Say what the model decides vs extracts |
| Voice / phone | Only if a demo beat speaks; consent code before any outbound call; caps per number and per day | Never call unverified numbers |
| Mobile | Expo only if camera or scan is the main beat | Ship a build link judges can install |
| On-chain receipt | Devnet + a public verifier page | Never imply mainnet value |
| Trained model | Held-out split by product/entity, a baseline, measured numbers into FACTS | Report the confidence interval |

## Design bar

Read `docs/design/BRAND.md` before writing UI. It is the single source for the site, stills, poster and video.

- One composition in the first viewport; brand name at hero size; the demo CTA above the fold.
- Expressive display font + readable body font, self-hosted (no network fetch during `build`).
- Atmospheric background (color field, grain, pattern), not flat gray.
- Avoid the purple-glow AI cliche and generic cream/terracotta unless BRAND.md chose it deliberately.
- 2-3 intentional motion moments on the landing page; none on the demo path itself.
- Cards only for real interactions. Status words from the PLAN vocabulary, color-coded consistently.
- Run `stills.mjs` (skill `hackathon-demo-assets`) on every judge page at phone and desktop size; fix horizontal overflow and console errors.

## Gotchas from real runs

- Framework generators refuse non-empty folders; generate into `_app_tmp/` and move up.
- `next/font/google` fetches at build time; self-host fonts so CI and deploys never flake on the network.
- `.vercelignore` (or equivalent) can drop prebuild scripts; keep anything `prebuild` runs.
- Secret scanners flag realistic fixture ids; use obviously fake fixtures, allowlist only hand-checked fingerprints.
- Agent worktrees inside the repo (`.claude/`, `.cursor/`) make linters scan foreign copies; ignore them.
- GitHub cron skips `:00` under load; schedule probes at odd minutes (`7,37 * * * *`) and judge freshness by the latest run's age.
- Two public origins (custom domain + host alias): probe both.
