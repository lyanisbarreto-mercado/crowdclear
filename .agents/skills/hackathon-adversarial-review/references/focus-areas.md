# Focus areas

Check every item in each section that matches the diff. Items marked (seen) are bugs real hackathon review rounds caught after tests passed.

## Every side-effect path

1. Replay or double submit applies the effect twice (two tabs, two devices, retry on timeout).
2. Read-then-write race (TOCTOU) between checking a status and changing it; the write lacks a status precondition.
3. Sponsor timeout, 5xx, or an ambiguous reply is treated as success. Ambiguous must be UNKNOWN, and UNKNOWN must never render as success. (seen)
4. Client-supplied amount, identity, price or verdict is trusted instead of recomputed or bound server-side (signed token binding entity + amount).
5. Secrets or personal data in logs, error messages, API responses or client bundles.
6. Body validated after a side effect instead of before; empty or malformed body triggers anything.
7. Caps or rate limits held in memory: they reset per serverless instance. Needs a shared store or an atomic counter.
8. Background work (queued writes, `waitUntil`) can delay, change or contradict the response the user already saw. (seen)

## Payments and holds

1. Capture can exceed the authorized amount; second capture or reverse-after-capture is not refused.
2. A partial authorization or a reply carrying a held amount but no authorization id is treated as "no hold" (money is stuck) or as a full hold. (seen)
3. Promotions or issuer adjustments change the authorized amount; the app holds or shows a different number than the sponsor authorized. (seen)
4. A UI "pending" marker is cleared before an explicit no-hold answer, letting the user create a second hold. (seen)
5. Every page that can create a hold checks for an existing hold, not just one page. (seen)
6. Abandoned holds are released by a sweeper with a bounded window; an UNKNOWN settlement never silently ages out. (seen)
7. Seller payout runs only on the stored final status, with an explicit sponsor response-code mapping. (seen)

## Signed requests and agent identity

1. Signature verified before the nonce is consumed; nonce store bounded.
2. Time window and clock skew handled; missing `iat` does not bypass the window.
3. Body digest covered by the signature; a tampered amount never reaches the sponsor API.
4. Copy says what verification proves (identity and integrity), not more (user consent).

## Model, OCR or matcher gates a decision

1. Model output alone never moves money or access; low confidence keeps the hold or asks a person.
2. Short or shared identifiers (a model number several brands use; a brand that is a common word) match too broadly. (seen)
3. OCR confusions (O/0, I/1) and check digits (UPC/GTIN) handled; an invalid check digit keeps the hold. (seen)
4. One valid code can be a substring of another; partial or paused scanner input must send the whole buffer or nothing. (seen)
5. Precedence between signals is explicit (a banned type beats an uncertain match; human review outranks the model). (seen)
6. User input, retrieved text or tool results can inject instructions that change allowed tools, recipients, amounts or access. Treat them as data; enforce scope and permissions outside the model.
7. Malformed structured output, unavailable provider, empty retrieval or uncertain evidence bypasses validation or invents success. Check these cases in the project's small evaluation set.

## Outbound contact (calls, SMS, email, push)

1. Consent is proven before the first real message (code read back), not assumed from a form field. (seen)
2. Caps: per entity (one call per deal), per recipient, per day, global; enforced atomically.
3. Numbers and addresses sealed at rest, masked on every public page.
4. Region and format validated; queued sends expire.
5. Fallback path when the voice or template vendor fails still says the same honest thing.

## On-chain receipts

1. Network labelled (devnet/testnet); no personal data on chain, hashes only.
2. Reads verify signer, transaction success and the hash; RPC failure is distinct from "not found". (seen)
3. One admitted mint per entity, durable claim, daily cap; no retry engine that can double-mint. (seen)
4. "Key not configured" and "damaged record" are distinct, visible states. (seen)

## Persistence and concurrency

1. Settlement uses an atomic claim with a status precondition; failure to take the claim fails closed, no takeover. (seen)
2. A writer that loses a race defers to the final record instead of overwriting it. (seen)
3. Final fields (reason, receipt) are frozen once set.

## Public endpoints

1. Unsigned mutating routes are rate-limited before any sponsor call. (seen)
2. Public boards expose only intentionally public fields. Private/personal data stays masked or absent; escape user content, reject unsafe markup and enforce access boundaries.
3. CORS open only on read-only endpoints. `/api/health` returns booleans only.

## Claims

Compare README, `docs/pitch.md`, `docs/submission-draft.md`, `/judge` copy and the video script against production `/api/health` and `docs/FACTS.json`:

1. Every claimed live integration is `true` in production health and has a successful real operation on the current deployment. Configured keys are insufficient; labelled sandbox or fixture data must match what was actually tested.
2. Every number appears in FACTS at the precision written; nothing typed from memory.
3. Forbidden unless literally true: "safe", "guaranteed", "production", "real money", "mainnet", "the AI decides".
4. Sandbox is stated where it applies; "verified" says what was verified.
5. Screens and video show the real UI; generated images are labelled or obviously illustrative.
6. "Built with" lists only tools that are live or genuinely used.
7. AI-usage disclosure present if the event rules require it.
