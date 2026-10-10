# Efficient delivery loop

## Plan the smallest proof

Translate the user's outcome and judging criteria into a few usable behaviors. A slice crosses the UI, domain logic and adapter layers needed for one observable result. Fold basic scaffolding into the first slice; do not spend hours finishing every technical layer before anything runs.

A technical probe may come first when it proves a critical unknown and leaves runnable evidence: an unfamiliar sponsor's request/response, camera input or data access. Prove the distinctive mechanic early. If it fails, resolve or change the plan before investing in its surrounding polish.

Each slice needs only: what becomes usable; why now; owner/files and dependencies; acceptance check; user trial steps if visible. Put this in PLAN notes. Use `docs/IMPLEMENTATION.md` for contract detail only when multiple lanes or risky behavior justify it. No separate scope/PRD/spec/checklist approval chain.

## Research with a decision and stopping point

Inspect local code, bundled docs and existing tools first. Browse official event rules and current primary documentation for chosen dependencies. Delegate independent research when it reduces the critical path.

Use relevant installed specialist skills and Context7 for dependency questions; Firecrawl can extract selected web sources when callable ([quality-tools.md](quality-tools.md)). Reuse fetched content, resolved library IDs and prior findings; fallback to official/bundled docs or native browsing rather than waiting on setup.

Frame a question, such as "Can this sandbox produce the demo response with our account?" Default to a 10-20 minute spike, shorter near the deadline. Verify exact versions, auth, payload/response, supported host/runtime, limits and likely failure behavior. Check current pricing only if it affects a spend decision. Use the smallest runnable call to confirm assumptions; do not treat example snippets as live proof.

Record a consequential choice in PLAN as: decision, evidence/source and date, why it fits, unresolved risk. Stop when enough evidence selects a workable option. Compare more candidates only if the current one fails an essential requirement. Favor familiar working tools over a new service with the same job.

After two genuinely failed attempts on one integration, diagnose the shared cause and apply the remaining timebox; do not repeat the same request indefinitely. Simplify, use an allowed alternative, or cut optional depth. If the core mechanic must change, ask with a concrete recommendation and keep independent work moving. Fixtures can unblock local UI/contracts when visibly labelled; they never establish live sponsor claims. For a timed-out effect, reconcile its status before retrying.

## Keep modules small and contracts explicit

- Separate domain decisions from I/O and UI. Wrap external vendors behind narrow adapters that normalize success, refusal, timeout and unknown outcomes.
- Define only contracts needed by active slices: input validation, output shape, errors, status vocabulary, auth and ownership. Freeze shared shapes before parallel implementation and tell affected lanes when they change.
- Add persistence, queues, services or frameworks only when the current behavior requires them. Handle duplicates atomically when they could repeat an effect. Bound network waits; secrets stay server-side.
- Parallelize disjoint slices, research, review and asset planning after dependencies are clear. Give each lane an owner, files, contract and proof of done. Avoid duplicate research and concurrent edits to shared contracts or PLAN; one coordinator integrates evidence.

## Build, verify, record, continue

1. Implement the thin usable behavior. For domain rules, high-risk transitions and regressions, write a meaningful failing test first.
2. Run its acceptance check and inspect the actual result. Use focused checks during iteration, required full local equivalents at merge/release, and current production smoke after deploy. GitHub Actions is asynchronous; pending runs do not block independent work. Respect enforced remote merge/release checks. Low-risk visual changes can use browser/phone inspection.
3. Repair a broken dependency before building on it. Other independent lanes can continue. Risky effects require the independent review described by `hackathon-adversarial-review`; no reviewer means disable the effect, not waive the review.
4. Commit owned named files and update the affected PLAN rows/evidence. Report at a meaningful checkpoint, then continue according to mode. A commit or checkbox is not evidence by itself.

## AI behavior, when it is part of the kernel

Create a small reusable evaluation set from the actual acceptance criteria: normal input, malformed/empty input, ambiguity, provider failure, and hostile instructions in retrieved/user data where relevant. Record expected behavior and run the same cases after a prompt, model, tool or retrieval change. Keep deterministic validation and effect authorization outside model prose; treat retrieved instructions as data.

Measure quality, latency and cost only where they support a claim or decision; record environment, sample size and method in FACTS provenance. Label small samples and limitations. Do not claim broad accuracy from a hand-picked demo. Use refusal or an honest fallback for unsupported answers rather than inventing evidence.

## Finish against the event, not the template

Keep the verified core journey, required assets and submission buffer ahead of optional depth. Begin shot lists, pitch structure and form inspection early; capture stable behavior and verify current claims at freeze. An upload, public repo or video is required only when the event says so. Distinguish prepared, uploaded, deployed and submitted statuses.

Leave a compact run-and-change map in the README or implementation notes with actual paths, commands and key contracts when useful. It is a handoff aid, not another learning gate.
