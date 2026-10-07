# Sketchy: finish and validate the public game

Prepared October 7, 2026 for Aayan Ur Rehman. This is an execution brief, not a promise of a contest score. The official rubric uses four equally weighted 1–5 categories; the goal is evidence supporting the highest descriptors, not a fabricated 10/10 rating.

## Start here

Finish this app. Implement the work, verify it, and deliver the public playable game and source. Do not stop at a plan, a CSS pass, or a mock demo. Preserve the existing Sketchy identity and drawing-imposter concept. This document supersedes the original HANDOFF.md restriction against gameplay changes where correctness, fairness, onboarding or replay fixes require them. Read applicable AGENTS.md first.

- Repository: https://github.com/aayanrehman/sketchy
- Current local branch: `codex/finish-sketchy-submission`
- Reviewed implementation: `5141523bd65eedabd59d945a47b6b46dfb1e7434`
- Prior creative pass: `8b98ca5`; original remote baseline: `51c314f`.
- The latest implementation has not been pushed. Do not assume cloning remote main retrieves it.
- In the originating workspace the project is `/workspace/scratch/d5a0b6a9700a/sketchy`.
- Transfer options in the project root: `sketchy-ready.bundle` (git history), `sketchy-ready.zip` (source snapshot), `sketchy-challenge.patch` (binary diff from original baseline). Transfers are regenerated after committing the handoff. Confirm the archive includes this document and the reviewed implementation; regenerate them after later changes.
- With a bundle: `git clone /path/to/sketchy-ready.bundle sketchy`, inspect branches, then check out the finished branch. Confirm the reviewed commit is present before editing.

Use Astra with high reasoning as the lead when final quality is the priority; consider xhigh for the architecture, fairness and release review. GPT-6.1 Sol with high reasoning is a strong lower-cost implementation option. If using both, have Sol implement and Astra independently review the code and evidence. These are recommendations, not measured performance results for this repository. Neither choice replaces human testing or deployment credentials. Do not automatically use the coding model as the game's runtime judge.

## Current product and evidence

React/Vite/Framer Motion client; TypeScript Express/Socket.IO authoritative server. Four to eight humans, three rounds. Phone drawing, desktop stage, code/QR joining, imposter decoy, gallery, discussion, vote, steal, AI verdict and results. Two-round solo onboarding uses prepared bot art and example bot scores. Local fonts, SVG characters, share PNG, local progression and gallery already exist.

Previous local verification: 16 tests; typecheck and build; eight Socket.IO clients through three rounds with reconnect/capacity/replay-score checks; complete demos at phone and desktop sizes; 44 phase/viewport fixtures with long names and failure states. These are historical evidence, not acceptance of future changes. They do not validate live AI, real devices, deployment resilience, group enjoyment or full accessibility.

No live public URL or live OpenAI key was available. The current unkeyed mode is mock. GitHub CLI lacked push authentication and the connected integration returned 403. No deployment account access was available. Do all independent work before reporting these dependencies; never expose secrets or claim publication without checking the public URL.

## Priority 1: restore game integrity

1. **Keep the steal answer secret.** In `server/src/room.ts`, `revealImposter()` currently exposes `realPrompt`, `decoyPrompt` and `promptPairId` during UNMASK/STEAL. Separate role revelation from answer revelation. An unresolved steal must expose options, never the answer or metadata that identifies it. Use explicit viewer-specific serialization rather than spreading a private Round and hoping every sensitive property is overwritten. Audit all nested data, past rounds, reconnect and spectator payloads. Accept: protocol tests prove the imposter and spectators cannot derive the answer from supplied state before resolution. Artists may retain their own prompt through a private field when needed.

2. **Separate host from spectator.** `screen:watch` sets `data.screen = true`; `isHost` trusts it. Introduce a high-entropy creator capability/host credential, validate server-side, and keep watcher access read-only. Preserve authorized host reconnects. Room code alone must never permit start, skip, replay or configuration changes. Accept: a watcher cannot mutate phases; the creator and explicitly authorized host can; invalid credentials fail without corrupting the room.

3. **Repair generation budgets on replay.** The counter currently survives `playAgain()`/`start()`. Use an explicit per-game budget plus independent deployment-wide spending/concurrency controls. Reset per-game state at the correct boundary. Associate asynchronous AI completions with a game/round/job identity so late old-game callbacks cannot alter a rematch. Do not solve this by removing all cost limits. Accept: two consecutive eight-player games retain normal generation eligibility, global protection remains effective, and old callbacks cannot contaminate a new game.

4. **Do not reward blanks or unavailable ratings.** All-zero drawings currently award an imposter +100 perfect disguise and each artist +50 judge's favorite. Define valid nonblank scored submissions separately from missing, refused and failed judgments. Empty art must not earn drawing-quality bonuses. Do not rank a fallback against successful AI ratings as though it were comparable. Define ties, abstentions, disconnected participants, late votes, missing steal choice and empty valid-score sets. Accept: regression tests cover these cases without changing established valid-round scoring unintentionally.

5. **Make steal options fair.** The known decoy is currently one of four options. Replace that free elimination with three plausible alternatives if retaining four choices. Prevent duplicate or conspicuously impossible options. Test the actual serialized state, not only what the component displays.

6. **Prevent cheap abuse.** Validate event schemas and authorization centrally. Bound names, chat, image bytes, strokes, rooms, joins, generation concurrency and event frequency. Use deployment-appropriate room creation/join limits with errors that normal players can recover from. Keep studio/proof endpoints protected and keys server-only. Avoid logging player sketches, authorization headers or secret prompts.

Primary files: `server/src/index.ts`, `room.ts`, `scoring.ts`, `types.ts`, `ai.ts`, and their tests; client host/join state as needed.

## Priority 2: make the central AI feature demonstrably work

Keep the model configuration explicit. Defaults currently use `gpt-image-1-mini` and `gpt-4.1-mini`; verify current endpoint support and account access before changing them. Select the runtime models by fidelity, latency, stability and cost measurements. Astra is not automatically appropriate for an interactive party-game judge.

- Image edit receives only the original sketch and the same style instruction for every player. Never supply the secret prompt, role or desired correct subject to the image model.
- Judge receives the raw sketch and target prompt, not the transformed artwork. Use validated structured output, constrained score ranges and neutral interpretation before any playful roast.
- Treat ratings as subjective AI assessments. Rename or explain Match % so it does not imply a calibrated probability. Missing evaluations need an explicit unscored state and fair scoring policy.
- Build a small evaluation set of at least 24 sketches across at least six prompt pairs: obvious real/decoy examples, ambiguous sketches, rough drawings, critical props, blanks and adversarial text inside a drawing. Have humans label expected distinctions before evaluating outputs. Do not invent human labels.
- Measure whether transformations preserve the critical clues; publish side-by-side examples including failures. Proposed release target: at least 90% of evaluated transformations preserve the human-labeled distinguishing clue, with no systematic advantage to one role. If it fails, tune and repeat affected evaluations, or make raw art the clearly available source of truth and prevent edits from governing outcomes unfairly.
- Repeat ratings on a representative subset and measure instability. A proposed target is a median absolute difference no greater than 10 points; document disagreements and revise the rubric rather than hiding them with cache hits.
- Record per-job p50/p95 latency, image bytes, timeout/refusal rates and estimated cost per four/eight-player game. Label estimates versus measured billing. Instrument generation without logging private content.
- Align phase timing with measured latency. No indefinite wait, mid-vote surprise clue changes, or blank unexplained tiles. Freeze the voting evidence consistently once voting begins; late art can be shown afterwards.
- Keep mock/prepared demo results explicitly labeled. Either retain illustrative bots or replace fixtures with genuinely recorded pipeline outputs and provenance. A successful model-list request is not proof an image edit worked.

These are proposed engineering targets, not contest requirements or existing measurements. If access/budget blocks evaluation, mark it blocked and leave a runnable evaluation command. Never describe mock mode as fully validated live AI.

## Priority 3: improve the experience rather than adding feature volume

Preserve the Fredoka/Nunito typography, blue/green scenery, yellow identity, dark outlines, Blotto and illustrated avatars. Refine composition; do not substitute generic gradients, emoji or inconsistent stock icons.

| Area | Required improvement | Acceptance evidence |
| --- | --- | --- |
| Landing | Remove hillside/metadata intersection. Clearly explain the human goal, group size and solo option. | Phone and desktop screenshots; first-time users can explain the goal. |
| Join/lobby | Obvious code, QR and reconnect states; explain four-player minimum. | Invalid/full room, duplicate name, host departure and reconnect exercised. |
| Instructions | Ready-paced initial onboarding; explain voting, steal and meaningful scoring. Keep help accessible without losing essential phase information. | New players can proceed without creator coaching. |
| Prompt/draw | Secret information remains recoverable by its owner; remove the opening banner's canvas obstruction. Preserve pointer capture, undo and buzzer submission correctness. | Touch/pointer interaction and submission at the deadline. |
| Gallery/vote | Comfortable eight-player inspection; clearly distinguish raw/transformed/pending/fallback art. Preserve the same evidence during voting. | Small-phone full-gallery vote test with eight players. |
| Discussion | Add lightweight optional text discussion for separated groups; keep out-loud play fast. Do not require built-in voice/video. | Two remote users can exchange clues; bounded safe text rendering and reconnect behavior. |
| Steal | Clear choice lock, resolution and timeout; fair options and protected answer. | All roles and observer states tested. |
| Verdict | Every player can actually see their result. Replace inaccessible timed vertical reveals with deliberate pacing or an accessible navigable sequence. | Eight-player phone run; slow reader reaches their own verdict. |
| Scores/final | Explain awards, avoid dense lower-place paragraph, show ties and unscored states honestly. | Long names, tied scores, missing ratings and eight-player screenshots. |
| Demo | Fast route to a meaningful action, both roles, truthful sample labeling. No dead waiting for simulated discussion. | Solo first-run and replay complete successfully. |
| Sharing | Readable PNG, valid public URL, mode identification and no broken media. | Download/open PNG on a phone and desktop. |
| Motion/sound | Respect reduced motion throughout, including confetti. Provide clear mute state. | Reduced-motion screenshots and keyboard-controlled sound toggle. |
| Accessibility | Visible focus, labeled actions/status, logical focus after phase changes, contrast and comfortable tap targets. Be honest about pointer-based drawing limits. | Keyboard walkthrough, contrast checks, screen-reader inspection of non-drawing flow. |

For all shared components inspect Button, Card, Avatar, Mascot, Scenery, Timer, DrawingTile, MatchMeter, Modal, Toast, Stamp, ScoreBurst, Confetti and canvas controls in their real contexts. Check at 320×568, 390×844, tablet and desktop, plus browser zoom. Verify no overlap, clipping, hidden essential controls, unnecessary horizontal scroll or unreadable result timing. Do not infer usability from bounding boxes alone.

## Priority 4: earn creativity and experiential value

The basic drawing-imposter-vote-steal structure resembles established games. Do not claim it is unprecedented. Strengthen what is distinctive: raw-to-sticker transformation, human accusation and the judge comparing the original sketch with the prompt.

Make a coherent evidence recap after voting: original sketch, transformation, revealed prompt, human accusation outcome and AI interpretation. Keep ratings hidden until voting resolves so the AI does not spoil deduction. This should help people argue about what they actually drew, not turn the game into passive AI scoring.

Before adding a new mechanic, run a short human playtest of the corrected core. Only add a focused mechanic if it solves an observed problem or makes a clear creative improvement; document the hypothesis and result. Avoid accounts, monetization, leaderboards, extra modes and full voice infrastructure unless needed for the validated experience. Preserve the four-to-eight-player main mode and solo entry point unless evidence justifies a change.

Recruit at least two first-time groups, including an eight-player group and a remotely separated group if practical. The agent can prepare instructions and collect consented feedback, but cannot manufacture human participation. Record time to first action, rules questions, missed phase actions, moments of confusion, bugs and whether players voluntarily replay. Ask what was funny, unfair, slow or unclear. Address recurring findings and distinguish observed results from design opinion. Bot runs are not a substitute.

## Priority 5: deploy and deliver

Use the existing long-lived Node/WebSocket deployment architecture unless a specific failure justifies replacement. Inspect `render.yaml` and Docker support. Existing Render configuration uses a paid service/disk; do not incur a new charge without the user's budget authorization. Prepare everything independent of credentials first.

- Use secure environment-secret entry for API/deployment credentials. No keys in source, browser bundles, screenshots or handoff output.
- Choose a durable room/session strategy compatible with the single-server design. Prefer restart recovery if feasible; otherwise implement explicit restart detection and a safe explained return to lobby. Never leave clients apparently playing a lost room. Do not claim restart durability if only media persists.
- Ensure generated art needed by saved results survives redeploys; define expiry and cleanup without silently breaking promised saved galleries. Avoid unbounded disk growth.
- Include health/readiness diagnostics, capped concurrency, graceful shutdown and useful sanitized operational errors.
- Verify HTTPS/WebSockets and actual phone/laptop entry on the public origin. Run a full public game plus rematch; exercise reconnect, host departure and a controlled restart.
- Push final source using authorized GitHub access. Do not overwrite unrelated changes or force-push. If main has advanced, reconcile carefully. Report branch/commit and real push outcome; a local commit is not publication.
- Update `docs/SUBMISSION.md`, README, environment example and handoff to reflect actual behavior and verified facts, replacing earlier private-prompt/replay claims that the judge audit disproved.
- Prepare title, cover, concise description, URL and a short real gameplay recording. Make their claims match the deployed build. Do not submit the contest entry through the user's account unless explicitly authorized.

Official sources, recheck before delivery:
- Mission: https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/
- Rules: https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0
- Four categories: Execution, Creativity, Usefulness/Value, Polish/Thoughtfulness; each 25%.
- The official PDF gives October 30, 2026, 11:59 p.m. Pacific. The mission landing page says October 31; use the earlier deadline unless Handshake issues an authoritative clarification.

## Verification and definition of done

Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. Add regression tests for the actual integrity defects and protocol authorization. Test four and eight clients through a full game and rematch, late async completion, reconnect, host loss, ties, blanks, failed image/judge jobs and phase deadlines. Reuse historical browser scripts where useful, but inspect current screenshots and meaningful interactions. Do not add tests that merely mirror trivial styling implementation.

Keep a release evidence ledger with each gate marked PASS, FAIL or BLOCKED; include command, date/build, observed outcome and proof. Separate automated, live-provider and human evidence. Never record a proposed threshold as a measured result.

Completion gates:
1. No unresolved answer exposure or unauthorized host actions.
2. Valid scoring and repeat games with independent cost protection.
3. Live AI measured and reliable enough for the actual voting workflow, with honest fallback semantics.
4. Entire game readable and actionable on phone and desktop, including eight-player results.
5. New-player and remote discussion experience exercised; human findings addressed or clearly outstanding.
6. Working public URL; actual deployment/reconnect/restart behavior verified.
7. Final source pushed and submission materials match that deployed commit.

If a dependency prevents a gate, finish the remaining authorized work, provide the exact access/input needed and a runnable continuation. Do not mark the app fully finished or contest-ready while gates are blocked. Do not claim a prize score or leaderboard position from this checklist.

Final delivery: playable URL, repository branch/commit, implemented behavior, meaningful validation, release evidence ledger, live AI latency/cost/fidelity findings, real playtest findings and remaining limitations. A beautiful screenshot alone is not completion.
