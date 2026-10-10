# Phase 5: Submit and expo package

Goal: complete every submission portal honestly and verify it saved before the deadline. Complete the local preparation first; follow [autonomy.md](autonomy.md) for checkpoints and existing authorization.

Adapt the web/Devpost defaults to the event: use the allowed local/CLI/mobile judge path, skip unrequired video/gallery/expo work, and audit equivalent evidence when no health endpoint exists.

## Steps

1. **Lock FACTS:** rerun the commands for changed headline metrics, update `asOf`, and run the relevant facts checks. Keep unmeasured latency/cost out of claims.
2. **Draft** `docs/submission-draft.md` from the product and FACTS. Drafting is allowed unless the event specifically requires human-authored text. Ask for missing personal facts; do not invent a team story.
   - Lead: intended user and useful outcome in two sentences.
   - Inspiration: supplied experience and sourced context; flag only missing personal details for the team.
   - What it does: numbered actions following the demo path.
   - How we built it: what each vendor does, what was verified and what is sandbox/fixture.
   - Challenges: concrete integration, review or measurement findings.
   - What's next: genuinely deferred work.
   - Try it: judged URL, `/judge`, a useful check and repo.
   - AI disclosure where required: tools/models used and the work they contributed.
3. **Audit claims:** for web apps run `python <skill-dir>/scripts/check_claims.py --project . --health-url <judged-url>/api/health --strict`, then claims review over README, pitch and draft. Inspect review notices in context and undeclared claims too; a zero exit code is not a truth verdict. For other formats review equivalent evidence. Health configuration alone is not integration proof.
4. **Built with:** include only tools actually used. Confirm URLs, video visibility, gallery, required fields and each portal's requirements.
5. **Prepare each portal:** save local field values and upload files. Fill/save portal drafts when already authorized. Prepare teammate details, but do not send invitations or contact teammates without explicit authorization; flag required accepts as human/external rows.
6. **Submit:** use existing explicit authorization when it covers final submission and event rules allow it. Otherwise present the completed package and the specific remaining action for the human. Do not re-ask for authorization already granted. Reload the submitted page or inspect the portal's confirmation; a saved draft is not submitted.
7. **Expo pack:** prepare the 90 s and 30 s pitches, honest Q&A, poster with verified QR codes, props for both beats, phone/laptop demo path and chargers. Record any required physical attendance as a human row.
8. Rehearse the pitch with a timer when practical. Record actual submission confirmations and unresolved portal/team requirements in PLAN.

## Final verification

- Judged URL and `/judge` work on a phone; use cellular if available.
- Video meets visibility/length rules; thumbnail and gallery are ready.
- Writeup matches FACTS and verified product behavior; strict claims check passes.
- Every required portal has a verified submission, or its specific pending action is explicit.
- Required teammate invitations/accepts and attendance are confirmed or assigned.
- Pitch and expo materials are ready; limitations have clear answers.

Report submitted portals with confirmation evidence, the judged URL and any remaining human action. A full workflow run may finish submission preparation while external authorization is pending; describe that state accurately, never as "submitted."
