# Teammate tasks: <!-- name -->

Personal view for one teammate. `PLAN.md` is the source of truth; this file is the short version. Copy it per teammate.

Legend: [ ] not started · [-] in progress · [x] done · [!] blocked on a person

## Read this first

- Live URL: <!-- https://... --> (judges start at `/judge`)
- `git pull` before anything.
- Your judging role: <!-- e.g. you own "how does it work" questions; A owns the story and the demo -->
- Handoff note (newest first, 5 lines max): <!-- what changed while you slept, what is yours next -->

## A. Unlocks only you can do (do these first)

- [ ] <!-- H-row: create account X, put keys in .env.local, send by AirDrop or password manager (never chat or git) -->

## B. Verify the product on the deployed URL (not localhost)

- [ ] Walk `/judge` on your phone, on cellular. Report anything slow or broken with the step number.
- [ ] Run Beat A and Beat B twice each.
- [ ] Break it on purpose (sandbox / read-only safe):
  - replay a used token or double submit: must refuse
  - empty POST to each mutating route: refusal, no side effect
  - `curl -s <prod>/api/health`: every claimed integration is `true`

## C. Review

- [ ] Review side-effect PRs: one effect per entity, fail closed when a dependency is down, no secrets in client responses.
- [ ] Merge only per the merge rule in `PLAN.md`.

## D. Be ready for judges

- [ ] Read `docs/pitch.md` Q&A. Know three commands a technical judge might ask you to run.
- [ ] Accept the Devpost team invite.

## Run locally (optional)

```bash
git pull && npm ci
npm run dev
npm test && npm run lint && npm run typecheck
```
