# PLAN: living status dashboard

> Single source of truth for who is working on what. Row numbers match the zero-to-ship phases (0 Ideate ... 5 Submit).
> Update affected rows with each verified slice; one usable slice may complete several rows.
> Optional coordination-only status commit: `status: <row> <emoji> <note>` (for example `status: 2.3 🟡 claimed by A 14:05`).

Rows below are editable web defaults, not a mandatory execution order. Adapt owners, paths and dependencies to actual slices and event requirements. Mark inapplicable rows N/A with a reason; do not claim unperformed work complete. Local/CLI/mobile projects use equivalent judge-accessible evidence.

**Project:** <!-- one sentence: the signature moment, e.g. "the money does not move until the camera has seen the item" -->

**Team:**
- **A (product / frontend / AI / demo / submission):**
- **B (backend / sponsor rails / data / deploy / CI):** <!-- delete if solo; solo still keeps an owner per row -->

**Event:** <!-- name, venue, dates -->
**Coding may start:** <!-- from the rules -->
**Deadline:** <!-- hard time + timezone. Every portal: Devpost + expo/judging portal -->
**Target submit:** <!-- protect upload/submit buffer; usually T-90 min, scaled for a short event -->
**Repo:** <!-- url, public? -->

**Legend:** ✅ done · 🟡 in progress · ⬜ not started · ⛔ blocked · ✂️ cut
**Ownership:** record lane and timestamp. A stale timestamp prompts a check; confirm a lane is inactive before taking it over.

---

## Execution contract

- **Mode:** guided <!-- default; gated | autopilot to deploy | full run -->
- **Outcome and fixed choices:** <!-- user goal, essential behavior, explicit stack/design constraints -->
- **Agent may decide:** <!-- routine implementation, researched tools within constraints, optional depth cuts -->
- **Deploy/publication authorization:** <!-- known host/account/repo/visibility and allowed actions; unknown is pending -->
- **Spend limit:** <!-- only if paid services are used; do not infer a budget -->
- **Next feedback checkpoint:** <!-- first usable slice, integrated demo, freeze or submit readiness; guided reports continue -->
- **Next action / blocker:** <!-- only a required answer blocks its dependent work -->

Templates and unchecked fields are not evidence. Resume from substantive content and current code/deployment checks, carrying forward saved decisions.

## Context

- **The problem:** <!-- 2-4 bullets; at least one sourced fact with citation -->
- **The gap:** <!-- why existing tools miss the critical moment -->
- **Our mechanic:** <!-- distinctive behavior; sponsor API only if it has a real role -->
- **Beat A (blocked / fails safe):** <!-- -->
- **Beat B (allowed / succeeds):** <!-- -->
- **Who pays:** <!-- persona; no invented unit economics -->

**Tracks we enter:**
- General:
- Sponsors (max N per rules):
- MLH / tool prizes (only if really wired):

**Rules that bite:** <!-- AI disclosure, video length, expo attendance, repo public, frameworks credited -->

---

## Judged criteria and the surfaces that answer them

| Criterion (quote the rules) | Surface that answers it | Owner |
|---|---|---|
| <!-- sponsor criterion --> | <!-- page, demo beat, or endpoint --> | |
| Execution: can a judge verify it | `/judge` + public `/api/health` + `/api/stats` | |

**Headline number:** <!-- "X of N ..." stays a placeholder until measured into docs/FACTS.json. Never type a number from memory. -->

---

## Status dashboard

### Phase 0: Ideate (before or at kickoff)

| # | Row | File(s) | Owner | Status | Notes |
|---|---|---|---|---|---|
| 0.1 | Rules, deadlines, portals, criteria read | `PLAN.md` header | A | ⬜ | |
| 0.2 | Brief recorded (signature moment, Beat A/B, tracks; approval if gated) | `PLAN.md` Context | A | ⬜ | |
| 0.3 | Brand direction | `docs/design/BRAND.md` | A | ⬜ | |
| 0.4 | H-rows listed and assigned | below | A | ⬜ | |

### Phase 1: Scaffold

| # | Row | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 1.1 | Repo, `.gitignore`, `.env.example`, README stub | root | A | ⬜ | 0.2 | |
| 1.2 | Framework scaffold | `src/**`, `package.json` | A | ⬜ | 1.1 | |
| 1.3 | Env contract, `/api/health`, `/api/stats`, `/judge` stub | `src/server/env.ts`, `src/app/**` | A | ⬜ | 1.2 | |
| 1.4 | Required local checks pass (lint, typecheck, test, build, hygiene, secrets) | Project check scripts, `.github/workflows/ci.yml` | B | ⬜ | 1.2 | Exact integrated commit; track remote Actions asynchronously |
| 1.5 | Accounts + keys (each person signs up; keys never in chat/git) | `.env.local` | split | ⬜ | | See H-rows |
| 1.6 | **Evidence:** first real sponsor operation (if the mechanic uses one) | `tests/*.live.test.ts` | B | ⬜ | 1.3, 1.5 | Prove critical risk early; labelled fixture UI may progress independently |

### Phase 2: Build

| # | Row | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 2.1 | Demo slice: domain rules / state machine (pure) | `src/core/**` | B | ⬜ | 1.3 | |
| 2.2 | Persistence only when a slice needs it | `src/server/db/**` | B | ⬜ | 1.5 | |
| 2.3 | Mutating API routes (explicit failure shapes) | `src/app/api/**` | B | ⬜ | 2.1 | Review round before merge |
| 2.4 | Usable UI demo slice with least required access | `src/app/**` | A | ⬜ | Stable contract | Label fixtures; add only the needed API/rules |
| 2.5 | **Checkpoint:** both beats twice on localhost | n/a | both | ⬜ | 2.4 | Repair the failed dependency; independent work can continue |
| 2.6 | Early deploy + env on host + probe | `.github/workflows/probe.yml` | B | ⬜ | Runnable slice + host auth | Recheck the full journey after integration |
| 2.7 | `/judge` itinerary against production | `src/app/judge/**` | A | ⬜ | 2.6 | |
| 2.8 | FACTS measured with provenance | `docs/FACTS.json` | A | ⬜ | 2.5 | |
| 2.9 | Depth feature (answers criterion: ...) | | | ⬜ | 2.6 | ✂️ if behind |
| 2.10 | Depth feature (answers criterion: ...) | | | ⬜ | 2.6 | ✂️ if behind |

### Phase 3: Freeze and harden

| # | Row | File(s) | Owner | Status | Notes |
|---|---|---|---|---|---|
| 3.1 | Feature freeze declared; unfinished depth ✂️ and removed | `PLAN.md` | A | ⬜ | |
| 3.2 | Final adversarial sweep, independent reviewer | `.review/` | B | ⬜ | Clean independent round; isolated reviewer fallback documented |
| 3.3 | Applicable controlled failure checks + judged-environment smoke | n/a | B | ⬜ | Match risk; no live cost/contact abuse |
| 3.4 | Truth sweep: PLAN = code = live site | `PLAN.md` | A | ⬜ | |
| 3.5 | Claims dry run (`check_claims.py`) | n/a | A | ⬜ | |

### Phase 4: Assets

| # | Row | File(s) | Owner | Status | Notes |
|---|---|---|---|---|---|
| 4.1 | Stills of every judge page (phone + desktop) | `docs/stills/raw/` | A | ⬜ | |
| 4.2 | Brand kit: thumbnail, B-roll, poster | `docs/stills/generated/`, `docs/presentation/` | A | ⬜ | |
| 4.3 | Video footage captured (real UI) | `docs/video/raw/` | A | ⬜ | |
| 4.4 | Video edited and uploaded | `docs/video/EDIT.md` | A | ⬜ | Link in FACTS `demo.videoUrl` |
| 4.5 | Gallery (3-6 images) with captions | `docs/stills/GALLERY.md` | A | ⬜ | |

### Phase 5: Submit

| # | Row | File(s) | Owner | Status | Notes |
|---|---|---|---|---|---|
| 5.1 | FACTS locked (rerun provenance commands) | `docs/FACTS.json` | A | ⬜ | |
| 5.2 | Writeup from verified behavior, with required human input/disclosure | `docs/submission-draft.md` | A | ⬜ | |
| 5.3 | Claims audit clean (`check_claims.py --strict` + review in claims mode) | n/a | B | ⬜ | |
| 5.4 | **H/authorized:** every portal submitted and reload-verified | n/a | A | ⬜ | |
| 5.5 | Pitch rehearsed; expo pack ready | `docs/pitch.md` | both | ⬜ | |

---

## Human actions or pending authorization (skip already satisfied rows)

| # | Step | Who | Unlocks |
|---|---|---|---|
| H1 | Sponsor developer / sandbox account + keys | | 1.6 |
| H2 | Database account | | 2.2 |
| H3 | Host access / project authorization (domain optional) | | 2.6 |
| H4 | AI / voice / other vendor keys | | depth rows |
| H5 | Props or hardware for the expo table | | 5.5 |
| H6 | Final submit on every portal (human or explicitly authorized agent) | | being judged |

---

## Open pull requests

| PR | Row | Side-effect path? | Review rounds | State |
|---|---|---|---|---|
| | | yes/no | `.review/round-N.md` | |

Merge rule: required local CI-equivalent checks pass on the exact integrated revision, plus clean independent review for side-effect paths. Remote checks gate merge/release when required by the repository or event; keep that action pending without blocking independent work. After deploy: health plus the actual demo operation and `/judge`. Different model preferred; isolated fresh reviewer is the fallback. Unreviewed effects stay disabled.

---

## Shared contracts

| Contract | Owner | Consumers | Definition |
|---|---|---|---|
| `GET /api/health` | B | judges, probe | `{ ok, at, integrations: Record<string, boolean> }` |
| `GET /api/stats` | A | `/judge`, Devpost | contents of `docs/FACTS.json` |
| Status vocabulary | B | UI, voice, copy | <!-- e.g. HELD, CAPTURED, REVERSED, REFUSED, UNKNOWN. Never "safe" or "guaranteed". --> |

Contract changes: tell the other lane before committing; mark the commit `⚠️ CONTRACT`.

---

## Verification and checkpoints

Record milestone evidence here; routine slice proof can stay in row Notes. Required local checks are the immediate development gate; Actions are asynchronous evidence. Query once after push or at a useful checkpoint, record the exact commit and status, and continue unblocked work. Do not watch, sleep or poll for runs. Confirmed failures need actual logs and triage. A past green run is stale when relevant code, deployment or config changes. A skipped live check is not a pass.

| Checkpoint / rows | Usable behavior | Local check commands and observed results | Exact commit / deployment + time | Remote Actions (pending/pass/fail/not connected + run link) | Next action / gap |
|---|---|---|---|---|---|
| <!-- first usable slice --> | | | | | |

Visible trial: <!-- open X, do Y, expect Z -->

## Decisions

| Decision / changed assumption | Evidence or primary source + date | Reason / affected rows |
|---|---|---|
| | | |

- **D1 Sandbox honesty:** say sandbox when it is sandbox. Never imply real money, real users or private APIs you do not have.
- **D2 Vocabulary:** only the status words above, everywhere.
- **D3 No unlabelled mock data on judge-reachable paths:** demo data says demo, or is real public data.
- **D4 Wired-or-cut:** claim an integration only with production health true and a real operation verified on that deployment. Remove unsupported claims; label fixtures and sandbox use.

_Last updated: <!-- ISO datetime + who -->_
