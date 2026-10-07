# Sketchy release evidence

Date: October 7, 2026 (America/New_York). Source restored from the ZIP whose Git archive comment is `5141523bd65eedabd59d945a47b6b46dfb1e7434`. The ZIP has no Git history and predates the finish handoff; its source was imported as local commit `833dfd5` on top of remote baseline `51c314f`. The finish handoff was preserved separately. Do not claim the reviewed commit itself exists in this checkout.

This ledger supersedes historical verification claims in HANDOFF.md. PASS means the listed evidence passed, not that all human/device/provider cases passed.

| Gate | Status | Evidence / remaining work |
|---|---|---|
| Answer secrecy and host authorization | PASS (automated) | Explicit round serializer; unresolved answer fields withheld; four answer candidates exclude known decoy; randomized human-game answer. Socket test rejects watcher and unassigned-player host actions, invalid creator credentials, malformed payloads. Creator reconnect and explicit host assignment verified. |
| Scoring, rematches and cost controls | PASS (automated) | Regression tests cover blanks, unavailable/invalid scores, ties, abstention, steal timeout, late votes, stale callbacks, two eight-player games with 48 total generation opportunities. Deployment-wide persistent daily request reservations and concurrency caps tested separately. |
| Live AI reliability | PARTIAL (live smoke passed) | User switched to fal after OpenAI credit_balance_exhausted. One actual gpt-image-1-mini edit succeeded in 11,727 ms; original-sketch GPT-4.1 mini rating in 2,896 ms. Human labels, repeated ratings, fidelity and group-level latency evaluation remain outstanding. |
| Phone and desktop readability | IN PROGRESS | Browser script captures 13 stages at 320×568, 390×844, 768×1024, 1440×1000 and exercises drawing, undo, discussion, voting, all eight verdicts, PNG export, rematch and refresh. A transition hang was discovered and repaired; 52 captures and interactions passed. Phase scrolling subsequently corrected after visual review; final rerun recorded below. Physical touch devices and screen-reader testing outstanding. |
| New-player / remote-group experience | BLOCKED (human input) | Bounded text discussion added and exercised with protocol/browser clients. No real first-time groups have participated; no fabricated feedback. See PLAYTEST.md. |
| Public deployment / restart / HTTPS | BLOCKED | No service created, no paid hosting authorized, no public URL verified. Long-lived single-process architecture retained. Rooms end on restart with explicit recovery messaging; media and budget ledger need persistent volume. |
| Final source and submission | IN PROGRESS | Local branch codex/finish-sketchy-submission. Final source not yet pushed. CLI authentication check failed; connector write access still to be checked after source is ready. Title/cover/description prepared; no contest submission authorized. |

## Commands and observed results

- `npm ci` — PASS; locked dependencies installed; initial audit reported zero vulnerabilities.
- `npm test` — PASS, 31 tests, including actual Socket.IO clients completing two eight-player three-round games. Local port permission was needed; the first sandboxed network run failed to bind, not from an application assertion.
- `npm run typecheck` / `npm run build` — passed during implementation; rerun after final edits.
- `npm run verify:browser` — meaningful browser interactions reached final and downloaded PNG after transition correction. Further regression verifies only the active phase remains mounted. Captures are local under `artifacts/browser/`; inspect images, not just bounds.
- `npm run eval:prepare` — PASS, 36 author-created synthetic sketches across six prompt pairs. `artifacts/ai-eval/labels.json` intentionally contains empty human labels. Preparation uses no external AI calls.
- `npm run ai:smoke` — PASS via fal, October 7 at 17:25 UTC. Tests one real image edit and one raw-sketch rating; does not establish fidelity or group usability.
- `npm run eval:run` — blocks until live AI and human labels are present. Repeated subset ratings bypass cache; outputs include raw/edit comparisons, failures, p50/p95 timings and instability.

## Scoring and participant policy

Artists earn +100 for correct votes, +150 for consecutive catches. Imposter escape +200; successful caught-player steal +150. Vote ties/no votes mean escape. Imposter votes can frame others but cannot earn correct-vote points. Blank/unavailable/invalid ratings never earn quality bonuses. Valid artists tied at the top all earn +50; valid imposter rating at least the median of valid artist ratings earns +100. No valid artist ratings means neither quality bonus is available. Abstention breaks a catch streak. Disconnected players' already accepted actions remain; missing actions abstain. Late votes and steals are rejected against the deadline. No steal choice means failed steal. Imposter departure before reveal awards artists +50 once.

## Operational limits and honest fallbacks

- Up to 8 players, 100 rooms and 512 simultaneous sockets; room device cap 32. Per-address create/join limits and per-socket event limits return recoverable errors. Production ingress should also enforce connection/IP limits using trusted proxy configuration; the application never trusts arbitrary forwarded headers.
- At most 500 strokes / 20,000 points per submission and bounded PNG bytes/dimensions. Raw PNGs are not retained in room snapshots. Runtime media is capped at 500 MB and expires after 30 days; the gallery explains expiry and permanent PNG downloads.
- Per-game image cap 24, reset at game boundary. Daily request caps persist beside MEDIA_DIR, independent of rooms/rematches. These are hard request caps, not exact monetary billing caps. Configure provider-side billing controls too.
- Image requests receive only raw art and the universal style instruction. Judge receives original art and target prompt. Ratings stay hidden through voting and unresolved steals. Discussion/voting use a frozen art snapshot; late art appears in the recap.
- HOW_TO and VERDICT are ready-paced. Other phases retain deadlines. Solo bots are illustrative and do not substitute for people.
- Sessions are in memory. Restart durability is NOT claimed. Graceful shutdown explains room loss; reconnect to a missing room returns to an actionable join screen. Generated media and budget survive only with the configured disk.

## fal live smoke, October 7, 2026

Original fixture: `artifacts/ai-eval/pair-2-real.png`; edit `smoke-edit.webp`; sanitized metadata `smoke-result.json`. The judge rated the raw cat/DJ fixture 70/100, describing a stick figure with cat ears and turntables. Provider-reported judge usage cost was $0.0002792; invoice billing and exact image charge were not measured. The inspected edit preserved the ear outline and two turntables in this one sample; no human fidelity benchmark is claimed.

fal lists low 1024×1024 output at $0.005 plus input charges, rounded up to the nearest cent per request. Vision is token-billed. Sources checked October 7: [image pricing](https://fal.ai/models/fal-ai/gpt-image-1-mini/edit), [vision API](https://fal.ai/models/openrouter/router/vision/api). Request caps are not a dollar cap. No retries automatically call another provider or consume the old OpenAI key.

Four fal adapter tests cover private sketch-only image input, bounded low-quality output, raw-sketch vision input, validation of output and score, and no cross-provider fallback. All 31 tests passed; typecheck and production build passed.
