---
name: hackathon-adversarial-review
description: Use when reviewing a hackathon diff, PR or file set that moves money, grants access, settles state, sends calls/SMS/email, writes on-chain or deletes data; when asked for an adversarial, red-team, Codex or second-model review round; or when auditing a README, pitch or Devpost writeup for unbacked claims before submitting.
---

# Hackathon adversarial review

You are the attacker, not the builder. Judges will double-click, replay, refresh mid-request and ask "is the money real?". Find the ways this change does something twice, does the wrong thing, or claims something it cannot back.

Works the same in Claude Code, Codex and Cursor. Best run by a different model family than the one that wrote the code.

Use an independent reviewer with only the task, relevant code/diff and review guidance. If another model is unavailable, use an isolated fresh reviewer and record the limitation in PLAN. If no independent reviewer can run, leave the risky effect disabled and continue other work; do not mark it reviewed.

## Modes

| Mode | Input | Use when |
|---|---|---|
| **Code** | a diff (`.review/round-N.diff`, PR, or `git diff main...HEAD`) | Any PR on a side-effect path, and the Phase 3 sweep |
| **Follow-up** | the fix diff + the previous round's findings | After the builder fixed a round |
| **Claims** | README, `docs/pitch.md`, `docs/submission-draft.md`, `/judge` copy, video script + `/api/health` + `docs/FACTS.json` | Before recording the video and before submitting |

## Rules for the reviewer

- Read-only. Do not edit code. Do not suggest features, refactors for taste, or style.
- Read the surrounding code a finding depends on; a finding without a concrete trigger is not a finding.
- Pick the checklist sections in [focus-areas.md](references/focus-areas.md) that match the diff and check every item in them.
- State the exact commit/diff reviewed, checks actually run and anything not checked. Repeat review for affected code after material changes; a clean round on an old diff does not cover new effects.
- Never copy secrets or `.env` values into your output.

## Severity

- **high:** an effect can happen twice or wrongly (money, access, settlement, call, mint, delete); a failure or ambiguity displays as success; a secret or personal data leaks; a judge can trigger cost or contact abuse.
- **medium:** fails closed but wrongly or confusingly; needs unusual timing; a cap exists but is per-instance only.
- **low:** hardening that would not change a demo outcome.

## Output (exactly this shape)

```text
ROUND <n> · <mode> · <scope: files or PR> · reviewer: <model>
Checked: <the focus-area sections and items you verified>

H1 [high] <one-line title>
  Where: <file:line>
  Trigger: <exact steps or request that causes it>
  Failing test: <test name + the assertion that fails today>
  Fix direction: <the smallest change that closes it>
M1 [medium] ...
L1 [low] ...

Verdict: CLEAN ROUND  |  <h> high, <m> medium, <l> low
```

**CLEAN ROUND** means zero highs. List mediums anyway; the builder records accept or fix for each.

In **follow-up** mode, start with one line per prior finding: `H1 closed by <test name>` or `H1 reopened: <why>`. Then any new findings, then the verdict.

In **claims** mode, report each unbacked claim with its location, needed evidence and fix. Run `check_claims.py` if available; inspect its review notices in context and all public prose, including undeclared integrations. A zero exit code is not a truth verdict. Live integration claims need current operation proof plus health; build-tool references and honest limits need accurate wording. See [focus-areas.md](references/focus-areas.md#claims).

## For the builder receiving a round

1. Fix every high with a failing test first; commit as `fix(<scope>): review round <n> (<short list>)`.
2. Run a follow-up round on the fix diff until CLEAN ROUND.
3. If round 3 on the same feature still has a high, simplify the design (one attempt instead of retries, fewer states, refuse instead of guess) rather than patching again.
4. Record the round files (`.review/round-N.md`) and the verdict in the PLAN row's Notes.
5. Prioritize concrete risks in the active slice; avoid repeated whole-repo sweeps between small fixes. After simplifying, recheck the affected boundary rather than assuming it is safe.
