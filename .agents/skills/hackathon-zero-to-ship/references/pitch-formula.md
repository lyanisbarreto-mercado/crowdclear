# Pitch and video formula

The live pitch and the video are different shapes. The live pitch starts with the hook because the judge is already looking at you. The video opens cold on the payoff because a judge scrubbing a gallery decides in 5 seconds.

## Live pitch: 90 seconds (one person talks, one drives)

1. **Hook (10 s):** one sourced, visceral fact + why you personally care.
2. **Gap (10 s):** why existing tools miss the critical moment.
3. **One-liner (10 s):** the mechanic in plain words ("the money does not move until the camera has seen the item").
4. **Beat A (20 s):** start on the live site or phone.
5. **Beat B (20 s):** the signature moment (block or allow), visible on screen.
6. **Proof (10 s):** one measured FACTS number + "recomputed from code, check `/api/stats`".
7. **Close (10 s):** who benefits, who pays, point at the QR.

**30-second version:** one breath: problem, mechanic, "scan this and try it, no login".

## Video: 90 to 180 seconds (or the event's rule)

| Time (150 s cut) | Beat | Footage |
|---|---|---|
| 0:00-0:08 | **Cold open:** the payoff moment itself (the verdict spoken, the hold reversing, the device reacting) | Real capture with real audio |
| 0:08-0:35 | Hook + gap in the founder's voice | Face cam or generated B-roll under VO |
| 0:35-0:45 | Name + one-liner | Wordmark sting |
| 0:45-1:50 | Beat A then Beat B, narrated | Real screen and phone recordings only |
| 1:50-2:15 | Proof: measured numbers, what is live (vendor names that match `/api/health`) | `/api/stats`, `/judge`, curl, quick depth cuts |
| 2:15-2:30 | Who benefits + URL spoken and on screen | Endcard with URL for at least 3 s |

Rules:

- Product UI is real capture. Generated media only for B-roll, stings, transitions, thumbnail.
- Every number spoken or shown matches `docs/FACTS.json` exactly.
- Claimed live integrations have current health and real operation proof. Build-tool references, sandbox use and honest limits describe what actually happened.
- Captions on (judges watch muted). Loudness fine on laptop speakers.

## Q&A stubs (write blunt answers in `docs/pitch.md`)

- Is the money / data / user real? (Say "sandbox" when it is.)
- What does the AI actually decide? (Usually: it extracts; rules or people decide anything irreversible.)
- What if the model is wrong? (Fail closed: what happens on a wrong guess.)
- How good is the model, measured how? (Held-out split, baseline, confidence interval if you have it.)
- Who pays for this? (Persona; no invented unit economics.)
- What is not finished? (Two honest limits.)
- Can I check it myself? (`/judge`, a curl, the public repo.)
