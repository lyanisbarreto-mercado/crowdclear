# CrowdClear skill kit

Agent skills for Codex (VS Code extension, CLI, or app). Codex loads every skill in `.agents/skills/` automatically, so there is nothing to install. After pulling, start a new chat so Codex picks them up.

## How to use them

- **Automatically:** Codex picks a skill when your request matches its `description`.
- **By name:** type `$` and the skill name, for example `$hackathon-zero-to-ship`, or run `/skills` to browse.

Good starting points:

| When | Use |
|---|---|
| "What should I work on next?" / anything about the event, Devpost, or judging | `$hackathon-zero-to-ship` |
| Before building a feature | `$brainstorming`, then `$writing-plans` |
| A bug with an unknown cause | `$systematic-debugging` |
| Before saying something is done or fixed | `$verification-before-completion` |
| Demo video, Devpost images, screenshots, poster | `$hackathon-demo-assets` |
| Code that saves data, deletes data, or handles tokens | `$hackathon-adversarial-review` |

## By stage

| Stage | Skills |
|---|---|
| Hackathon | `hackathon-zero-to-ship`, `hackathon-demo-assets`, `hackathon-adversarial-review` |
| Plan | `brainstorming`, `writing-plans`, `planning-with-files` |
| Write | `ponytail`, `test-driven-development`, `executing-plans`, `frontend-design`, `subagent-driven-development`, `dispatching-parallel-agents`, `using-git-worktrees` |
| Debug | `systematic-debugging` |
| Test | `check-compiler-errors`, `run-smoke-tests` |
| Validate | `verification-before-completion`, `verify-this`, `ponytail-review`, `deslop`, `thermo-nuclear-code-quality-review`, `requesting-code-review`, `receiving-code-review` |
| Merge | `review-and-ship`, `finishing-a-development-branch`, `new-branch-and-pr`, `make-pr-easy-to-review`, `get-pr-comments`, `loop-on-ci`, `fix-ci`, `fix-merge-conflicts`, `git-guardrails` |
| Repo health | `ponytail-audit`, `ponytail-debt` |
| Design | `design-taste-frontend` (anti-generic design rules, pre-flight check), `redesign-existing-projects` (audit-first upgrade of an existing UI) |
| VR | `vr` (comfort, interaction, performance defaults). Not redistributed here: `aframe-webxr` (`npx skillfish add tumeloramaphosa/studex-valley-os aframe-webxr`, no license) and `using-smartspectra` (`npx skills add Presage-Security/SmartSpectra --skill using-smartspectra`, proprietary) |
| Database | `neon` (Neon overview, CLI, `neon.ts`), `neon-postgres` (the `DATABASE_URL`, SQL, schema) |
| About skills | `using-superpowers`, `writing-skills`, `diagnosing-superpowers` |

## Notes for this repo

- The plan lives in `docs/plan/` and status in `CHECKLIST.md`. `hackathon-zero-to-ship` expects a `PLAN.md` and `docs/FACTS.json`; point it at the existing plan instead of starting a new one. Its `init_project.py` adds template files and edits `.gitignore`, so run it with `--dry-run` first.
- There are no tests or CI yet, so `run-smoke-tests`, `loop-on-ci`, and `fix-ci` have nothing to run until those exist.
- Superpowers skills that spawn subagents (`subagent-driven-development`, `dispatching-parallel-agents`) need this in `~/.codex/config.toml`:

  ```toml
  [features]
  multi_agent = true
  ```

## Optional: plugins (CLI or desktop app only)

The Codex IDE extension doesn't support plugins, which is why everything above is checked in as plain skills. If you also use the Codex CLI or desktop app, two extras only come as plugins: pstack (deeper design and review workflows) and ponytail's always-on mode. Add their marketplaces, then install from `/plugins`:

```sh
codex plugin marketplace add michael-denyer/pstack-claude
codex plugin marketplace add DietrichGebert/ponytail
```

## Sources

| Skills | Source | Version |
|---|---|---|
| `hackathon-*` | Colin's own skills | 2026-10-04 |
| 15 Superpowers skills (`brainstorming` … `writing-skills`) | [obra/superpowers](https://github.com/obra/superpowers), MIT | 6.4.1 (`5bf4e78`) |
| `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt` | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail), MIT | `b088b2d` |
| `check-compiler-errors`, `deslop`, `fix-ci`, `fix-merge-conflicts`, `get-pr-comments`, `loop-on-ci`, `make-pr-easy-to-review`, `new-branch-and-pr`, `review-and-ship`, `run-smoke-tests`, `thermo-nuclear-code-quality-review`, `verify-this` | [cursor/plugins `cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit), MIT | `ccb5507` |
| `planning-with-files`, `git-guardrails`, `frontend-design` | Colin's workspace template | - |
| `design-taste-frontend`, `redesign-existing-projects` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), MIT. Installed with `npx skills add Leonxlnx/taste-skill --skill <name>`; 11 more skills in that repo were not installed | `main` on 2026-10-10, hashes in `/skills-lock.json` |
| `vr` | [plurigrid/asi](https://github.com/plurigrid/asi), MIT. Installed with `npx skillfish add plurigrid/asi vr` | `main` on 2026-10-10 |
| `neon`, `neon-postgres` | [neondatabase/agent-skills](https://github.com/neondatabase/agent-skills), Apache-2.0. Installed with `neon skills`; update with `neon skills update` instead of re-copying | `main` on 2026-10-10 (`bfd013c`), hashes in `/skills-lock.json` |

Licenses are in `THIRD_PARTY_NOTICES.md`. Update a skill by re-copying it from its source, not by editing it here.
