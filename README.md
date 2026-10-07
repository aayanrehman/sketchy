# Sketchy

A drawing imposter party game for 4–8 people: draw a secret prompt, discuss the sketches, vote for the odd one out, and let a caught imposter attempt one steal. AI can turn raw sketches into sticker art and independently rate the original drawing. Two-round solo onboarding teaches both roles using explicitly labeled bot examples.

**Release status:** local gameplay and automated checks are available; public deployment, broader AI validation and first-time human group testing remain gates. See [release evidence](docs/RELEASE_EVIDENCE.md). There is no verified public URL yet.

## Run locally

Requires Node 22 and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Host a game, then join its code on four to eight devices. The creator controls the game and can explicitly assign a player host. Merely knowing a room code only grants player/watch access, not host control. If the creator joins as a player from the same browser, their saved creator credential delegates host to that seat. Reopening the creator page from that browser restores its authority.

For a production-style local preview:

```sh
npm run build
npm start
```

Open http://localhost:3000. Both the frontend and Socket.IO use the same origin. `/demo` works solo, with prepared bot art and example ratings. No live AI is implied by demo completion.

## Configure AI privately

```sh
npm run setup:local
```

Open http://127.0.0.1:3001. Paste the fal.ai key into the masked field, choose a daily request cap, and save. This loopback-only one-time form validates Host, Origin and a CSRF token; it does not log the key or use browser storage. It writes the git-ignored `.env` with owner-only permissions. Close the setup process after use. Never commit `.env` or expose setup on a public origin.

Restart the game after changing configuration. The chosen image model is `gpt-image-1-mini`, low quality, 1024×1024, WebP output. Judge defaults to `gpt-4.1-mini`. Explicit environment settings are documented in [.env.example](.env.example). The fal integration uses `fal-ai/gpt-image-1-mini/edit` and `openrouter/router/vision` with `openai/gpt-4.1-mini`. Both passed one live smoke test; this does not establish broader fidelity or rating consistency. Set `SETUP_PROVIDER=openai` only to configure the optional direct OpenAI provider.

`LIVE_AI_ENABLED=true` is required for live calls. `AI_MODE=mock` uses illustrative results and `AI_MODE=off` leaves original art available with unscored ratings. A model-list response is not proof of working image edits.

In `AI_MODE=fal`, both jobs use only `FAL_KEY`; the old OpenAI key is never used as a fallback. Direct OpenAI mode separately supports `JUDGE_BASE_URL` / `JUDGE_API_KEY`. fal image requests allow 75 seconds, direct OpenAI 25 seconds, and ratings 15 seconds; no phase waits indefinitely.

## Fairness and pacing

- HOW_TO waits for connected players to acknowledge instructions. VERDICT lets each player navigate all results and continue when ready.
- Raw sketches are the source of truth and visible by default. Optional AI edits may change clues. Everyone receives the same frozen image evidence from discussion through voting; late edits appear only afterwards.
- Before a steal resolves, public payloads contain four possible choices but no real answer, decoy, identifying pair ID, or judgment. Only each participant receives their own prompt. Real answers vary within the candidate set in human games.
- The imposter's known decoy is excluded from steal choices. A missing steal choice fails; late votes/choices are rejected.
- Correct artist votes earn +100, or +150 on a catch streak. Escape earns +200; successful steal +150. Ties/no votes allow escape; abstention breaks a streak.
- Only nonblank valid ratings participate in quality awards. Tied highest artist ratings share +50 each. A valid imposter rating at least the valid artists' median earns +100. Missing or failed ratings are visibly unscored and excluded.
- Text clues are optional, participant-only, bounded and rendered as text. They survive reconnect within the round and reset on the next round.

## Limits, persistence and operations

Per-game image allowance is 24 and resets on a rematch. Independent daily request reservations and concurrency controls apply across all rooms; the budget ledger persists beside the media directory. The form defaults to 48 reservations per job type per UTC day. These are request limits, not exact dollar billing limits. Provider billing controls remain separate.

Room creation/join/event rates, connection counts, image bytes/dimensions and stroke/point counts are bounded. Studio/proof routes require STUDIO_KEY in every environment. Debug routes additionally require non-production and ENABLE_DEBUG=true; keep them disabled outside local testing. No keys, raw sketches, private prompts or upstream response bodies are logged. Operational metadata includes status, latency and image byte counts.

Rooms are intentionally in memory: a server restart ends a game. Graceful shutdown and missing-room reconnects explain the loss and allow a new room. No session durability is claimed. Media and the request ledger persist only when MEDIA_DIR and AI_BUDGET_FILE use an attached disk. Generated images expire after 30 days and total storage is capped at 500 MB; local saved galleries explain this. Download a result PNG to keep it permanently.

## Validate

```sh
npm run typecheck
npm test
npm run build
npm run verify:browser
node --import tsx scripts/demo-verify.ts
npm run eval:prepare
npm run ai:smoke
npm run eval:run
```

Browser scripts require Google Chrome. They start their own ephemeral local server. Browser verification covers 13 phases/entry states at four viewport sizes, drawing/undo, eight-player voting, all results, sharing, replay and reconnect. The solo script exercises both roles and replay. Automated browser/device emulation is not physical-device or human-playtest evidence.

Evaluation preparation makes 36 synthetic sketches across six pairs and empty human-label fields. Live evaluation refuses to invent labels. A representative subset is judged twice with cache bypass. Results include failures and side-by-side output for human fidelity review. See [PLAYTEST.md](docs/PLAYTEST.md).

## Deploy and submit

[Render blueprint](render.yaml) and [deployment plan](docs/DEPLOYMENT.md) retain one long-lived Node/WebSocket service and a persistent disk. Paid service creation needs the owner's explicit budget approval. Docker is also supported. Do not horizontally scale this in-memory design.

[Submission materials](docs/SUBMISSION.md) contain the title, cover, draft description and official links. No contest entry is submitted by this repository or its scripts.
