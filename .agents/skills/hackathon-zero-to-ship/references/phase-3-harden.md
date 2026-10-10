# Phase 3: Freeze and harden

Goal: verify the actual demo and remove unsupported claims. Independent side-effect review happens during Phase 2; this phase checks the integrated product at feature freeze.

## Feature freeze

Freeze by the checkpoint in [timeline.md](timeline.md). After freeze, prioritize defect fixes, review findings, honesty, copy and assets. Cut unfinished depth rows in PLAN and remove their judge-facing surfaces. Keep both signature beats unless time forces an explicit, disclosed cut.

## Risk-based sweep

1. Review the integrated side-effect surface with `hackathon-adversarial-review`, using a different model family when available. A fresh isolated same-family reviewer is a fallback with reduced confidence recorded in PLAN. If no independent reviewer exists, disable/isolate the effect and verify the read-only path; never call the effect reviewed.
2. Run only the checks relevant to this product. Use deterministic local tests or provider sandboxes for abuse/failure cases. Production checks must be safe, read-only domain smokes or explicitly authorized sandbox operations; do not trigger live cost/contact abuse.

| If the product has... | Check... |
|---|---|
| One-time tokens, settlement or writes | Replay and simultaneous/double submit cannot apply the effect twice |
| Mutating routes | Empty/malformed input is refused before an effect; access checks cannot be bypassed |
| External providers | Timeouts and ambiguous results appear as refused/unknown, never success; bounded calls |
| Cost, contact or resource consumption | Applicable quotas/caps under controlled tests, without charging or contacting real people |
| AI-generated decisions or actions | Representative normal, malformed, ambiguous, provider-failure and injection cases where applicable; outputs validated before action |
| Read-only UI/data | Signature path, empty/error/loading states, phone usability and accurate data |

3. Fix high findings with focused regression evidence. Rerun affected checks and required local CI-equivalent checks on the exact integrated revision; do not repeat unrelated suites without a reason. Record remote Actions status asynchronously; pending runs do not block independent hardening or assets. Confirmed failures need actual logs and triage. Keep an enforced remote merge/release requirement pending until it passes.
4. Perform a truth sweep: PLAN statuses match code and the current deployment. A configured health boolean alone does not prove an integration works; verify its demo mechanic on the deployment. Record commit/deployment identity and evidence.
5. For a web app, run `python <skill-dir>/scripts/check_claims.py --project . --health-url <judged-url>/api/health`. For other formats, use equivalent recorded evidence. Resolve unsupported claims and review vendor-mention notices in context; the script does not replace domain smoke or contextual review.
6. Configure `probe.yml` with exactly the claimed integrations (`PROBE_REQUIRE`), product name and one safe domain assertion. Run its equivalent domain smoke directly against the current deployment for immediate evidence; inspect the latest scheduled run once when useful and record its identity/status. A pending, skipped or stale Actions run is not passing evidence; do not wait on the scheduler or poll for it.

## Checkpoint

Report the signature-path result, exact commit/local check results, remote pending/pass/fail/not connected status, independent review evidence, deployment identity and remaining cuts. Guided mode proceeds with assets and submission preparation; gated mode waits ([autonomy.md](autonomy.md)). Pending human/external actions stay visible in PLAN and do not make incomplete rows done.
