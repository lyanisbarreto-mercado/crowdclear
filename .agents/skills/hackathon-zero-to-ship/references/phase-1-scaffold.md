# Phase 1: Scaffold the first slice

Goal: a runnable product, a clear integration contract, and the smallest real provider call needed for the signature moment. Start only when event rules permit coding. Apply [delivery-loop.md](delivery-loop.md); build only the scaffolding this product needs.

## Steps

1. Use the agreed project folder, separate from this kit. Initialize git if needed. Create a remote or host project when already authorized; record pending external actions without blocking local work.
2. Choose the stack from current official docs and [stack.md](stack.md). Use available documentation tools such as Context7 when version/API details need checking; follow [quality-tools.md](quality-tools.md) for focused helper selection. Reuse suitable starter code allowed by the rules. If a generator requires an empty folder, generate into a temporary subfolder, inspect the result, and move its application files into the project. Preserve project instructions, planning docs and existing changes; merge ignore/instruction content deliberately.
3. Run `python <skill-dir>/scripts/init_project.py <project-dir>` to add missing templates. It preserves plain existing files and refreshes the kit block in instructions. Keep framework-supplied instruction blocks and read bundled framework docs when available.
4. Add the minimal honesty plumbing, adapting [scaffold-patterns.md](scaffold-patterns.md) to the stack:
   - An env contract that asks only for each feature's own keys; `.env.example` lists names and purposes, never values.
   - `/api/health` with booleans only and `/api/stats` backed by `docs/FACTS.json`, or equivalent routes for the stack.
   - A `/judge` itinerary and one runnable UI shell styled from `docs/design/BRAND.md`.
   - Relevant lint, type, test and build checks plus local equivalents of CI hygiene and secret checks. The supplied web CI expects `lint`, `typecheck`, `test`, `build`; adapt CI and commands together for another stack. Add live tests and end-to-end tooling when the slice needs them, rather than empty frameworks.
5. Run the stack's required local CI-equivalent checks on the exact integrated revision and exercise the running health route. A configured integration boolean is not proof of a successful provider call.
6. Commit named owned paths with the related evidence and PLAN status, unless the team explicitly uses status-only commits. Push when authorized and connected. Track GitHub Actions asynchronously: query once after push or at a useful checkpoint, record the exact commit and remote pending/pass/fail/not connected status, then continue unblocked work. Do not use `gh run watch`, sleep or polling loops.

## Provider spike and keys

Bundle genuinely human-only account/key steps into one concise request. Use available authorized accounts and integrations first. Each teammate owns their account; secrets go through a secure store, never chat or git. Domain purchases and account settings need existing authorization.

Run the smallest real sandbox call for the mechanic: sign/verify, analyze one real input, authorize/capture, or the relevant equivalent. Record the environment, command and response evidence in PLAN. A live test skips when credentials are absent; skipping is not passing integration evidence.

UI and pure-rule work can proceed against an explicit contract while keys are pending. A fixture must be visibly labelled and cannot satisfy a live sponsor requirement. After two genuinely failed integration attempts, timebox diagnosis and simplify, choose another supported route or cut the feature. Keep the user informed of the impact.

## Checkpoint

- Product runs locally and health/stats report honestly.
- Required local checks pass on the integrated revision; exact commit and remote Actions status are recorded. Pending Actions do not block the next independent slice. Repository/event-required remote checks still gate their merge or release.
- The critical provider mechanic has sandbox evidence, or the blocker and labelled fixture/cut are explicit.
- Next slice and parallel owners are clear.

Follow [autonomy.md](autonomy.md): guided mode reports and proceeds with unblocked work; gated mode waits. Production readiness still requires verification on the actual deployment.
