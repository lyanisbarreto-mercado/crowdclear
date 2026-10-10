# Running the workflow in Claude Code, Codex or Cursor

The skills are plain `SKILL.md` folders in the Agent Skills format. The workflow stays agent-neutral; use the host's current documented installation and invocation mechanisms.

## Where things live

| | Claude Code | Codex (CLI / IDE) | Cursor |
|---|---|---|---|
| Project skills folder | `.claude/skills/` | `.agents/skills/` | `.agents/skills/` or `.cursor/skills/` |
| User skills folder | `~/.claude/skills/` | `~/.agents/skills/` | `~/.agents/skills/` or `~/.cursor/skills/` |
| Project instructions | `CLAUDE.md` imports `@AGENTS.md` | `AGENTS.md` | `AGENTS.md` |
| Invoke | `/hackathon-zero-to-ship` | `$hackathon-zero-to-ship` or skills menu | `/hackathon-zero-to-ship` |

Install/update with the kit's `python scripts/install.py`; see the README for targets. If the host differs, inspect its supported skill paths before changing project layout.

## Questions and checkpoints

Follow [autonomy.md](autonomy.md). Guided mode reports evidence and proceeds with in-scope work; gated mode pauses at checkpoints. Use a structured question tool when available, otherwise a concise plain-text question. Ask only for material missing information or a required human/authorization action. Continue independent work while an optional answer is pending; silence does not grant authorization.

## Independent reviewers

The builder cannot supply its own independent side-effect review. Prefer another model family through an available subagent, a fresh review session or an installed CLI. Give the reviewer the diff, applicable contracts, risk boundaries and `hackathon-adversarial-review`, without build-chat history. Run it read-only using the host's documented controls.

Save review evidence under `.review/` and summarize/link the result in PLAN; `.review/` is gitignored. Check the diff for secrets before sharing it, including `.env*` changes and embedded key values. Verify CLI availability and current flags rather than assuming another agent is installed.

If no different-family reviewer is available, use a fresh isolated same-family reviewer and record "reduced confidence: same-family review." If no independent reviewer is available at all, isolate/disable the effect and continue the read-only path and assets; never label the effect reviewed.

## Parallel lanes

Use independent agents or teammates when it saves time, with bounded tasks and disjoint owned paths/contracts ([phase-2-build.md](phase-2-build.md)). Worktrees help when tooling shares a checkout. Native background agents and cloud tasks are allowed within the user's scope; no separate permission is needed for routine in-scope delegation. Check ownership before taking over a lane, and keep one integrator for shared changes.

## Focused quality tools

Inspect available skills/connectors before choosing a helper. Superpowers skills can supply focused testing, systematic debugging, independent review or worktree guidance; Context7 can retrieve version-specific library documentation. Relevant frontend, framework, auth, provider and deployment skills help within their actual scope. Use the host's documented tool/invocation mechanism; these optional helpers are not prerequisites and need no default installation. Fall back to current primary docs and project-native checks when unavailable. Keep the same brief, PLAN and evidence instead of starting a second planning workflow; see [quality-tools.md](quality-tools.md).

Run required local checks against the integrated revision for immediate feedback. GitHub Actions are asynchronous evidence: inspect once after a push or when useful at a checkpoint, record commit and pending/pass/fail/not connected, and continue unblocked work. Do not invoke `gh run watch` or sleep/poll loops. Inspect actual failure logs when a run fails. Repository/event-required remote checks still gate their merge/release; independent review and deployment smoke remain required where applicable.

## Browser capture and generation

- Use a connected browser tool to exercise the judged deployment and capture its steps.
- For repeatable stills, use `node <demo-assets-skill-dir>/scripts/stills.mjs <prodUrl> docs/stills/raw / /judge ...` when `@playwright/test` is available.
- Connected generation tools can produce brand/B-roll assets from the demo-assets prompts; preserve actual UI captures as product evidence. Otherwise prepare filled prompts and local asset instructions for the user.
- External publishing/upload and teammate contact use existing explicit authorization. Finish local preparation before presenting a missing external action.

Never include secrets in prompts, chat or review artifacts. Keep platform metadata outside application build/lint paths.
