# Sketchy: current handoff

Last updated October 7, 2026 (end of the Claude Code session that moved Sketchy to Convex + Vercel and built Prompt mode). Older handoffs (`CODEX_FINISH_HANDOFF.md`, earlier versions of this file in git history) describe the previous Socket.IO/drawing-only build and are superseded.

## 1. Where things live

| What | Where |
|---|---|
| Live game | https://sketchy-blue.vercel.app (Vercel project `sketchy`, account `aayanrehmann-6534`) |
| Code | `~/Documents/ChatGPT/sketchy`, GitHub `aayanrehman/sketchy` (public), **branch `codex/finish-sketchy-submission`**. `main` is stale (old Socket.IO build). Vercel is NOT linked to git: deploy with `npm run deploy`. |
| Backend | Convex team `aayan-ur-rehman`, project `sketchy`. **Prod:** `curious-chickadee-740` (https://curious-chickadee-740.convex.cloud). **Dev:** `admired-perch-128`. |
| AI provider | fal.ai (key `FAL_KEY` in local `.env` and in Convex env vars; never in the browser). Models: `fal-ai/gpt-image-1-mini` (text-to-image), `fal-ai/gpt-image-1-mini/edit` (sketch redraw, content generation), `openrouter/router/vision` + `openai/gpt-4.1-mini` (judge), `openrouter/router` (hint). fal allows ~10 concurrent requests; code retries 429s with backoff. |
| Convex env (prod) | `FAL_KEY`, `AI_MODE=fal`, `LIVE_AI_ENABLED=true`, `AI_DAILY_JOB_LIMIT=200` (images and judge calls each). `SITE_URL` defaults to the Vercel URL (the judge fetches target images from it). Dev additionally has `SITE_URL` = raw GitHub URL of `client/public`. |
| Safety snapshot | `git stash list` → `stash@{0}` "pre-claude snapshot (Codex work)". No longer needed but harmless. |

Commands (run from the project folder; Convex CLI needs `.env.local`, which `npx convex dev` created):

```bash
npm run dev          # Convex dev backend (watches convex/) + Vite client on :5173
npm run typecheck    # client + convex
npm test             # old server/ unit tests (still pass; server/ is no longer deployed)
npm run deploy       # npx convex deploy (prod) + vercel deploy --prod
npm run smoke:mp     # 4 scripted players play a full game vs VITE_CONVEX_URL (MODE=prompt default, ~24 paid images; MODE=sketch is free)
node --import tsx scripts/demo-to-final.ts   # plays a solo demo to the final screen, prints {code, token} to resume in a browser
npx convex env list --prod / npx convex env set --prod KEY value
```

## 2. The game today

Party game, 4–8 players, room code + QR, no login, phone or laptop. One host screen (`/host`, TV/laptop, shows code/QR, never shows secrets) + players on `/play`. Solo practice vs 3 bots on `/demo` (2 rounds: player first, imposter second).

**Prompt mode (default, the headline):** everyone sees a target image and recreates it by writing prompts; one imposter sees the same image with the key detail blurred (masked image) and must bluff.
Round flow: Study (12 s) → Draft, max 8 words (35 s) → Refine, max 30 words (40 s; everyone's draft images are visible, you get your draft's score + "missed" + tip) → Reveal (final images paint in, draft inset in the corner) → Discuss (30 s; chat + one AI hint from "Sketchy" about the drafts) → Vote (20 s; tie involving the imposter → one 12 s revote between tied players) → Unmask → Steal (caught imposter guesses what was hidden from 4 options) → Results (target + the original prompt behind it, each player's draft/final prompt, 5-area breakdown) → Scores.
Round rules cycle: Warm-up, Taboo (obvious words banned, also scrubbed from judge feedback), Style (style + color count double).
Scoring: correct vote +100 (+150 streak); imposter escapes +200; steal +150; everyone +½ final match; improvement bonus +½ of draft→final gain (max +25); best artist match +50; imposter "disguise" +100 if their match ≥ artists' median.
Word limits are enforced while typing; at the buzzer whatever is typed auto-locks (taboo words stripped), so nobody loses a turn.

**Sketch mode (original game, host can pick in lobby):** draw a secret prompt; imposter has a slightly different prompt; each sketch is redrawn as a sticker by AI; judge scores the original sketch.

Content: 12 Prompt-mode targets + masked versions in `client/public/targets/` and `convex/targets.json` (prompt, key detail, steal options, taboo words). Solo-demo bots have pre-made prompts/images/scores for `frog-band` (round 1, bot imposter) and `cat-dj` (round 2, human imposter) only, so the solo demo always uses those two.

## 3. Architecture (key files)

- `convex/engine.ts`: the whole game engine, pure TS (ported from the old `server/src/room.ts`). State lives in one `rooms` doc; methods return effects (timers, AI jobs, sketch writes). Timers = Convex scheduler with token-based cancellation.
- `convex/game.ts`: public API (`createDemo`, `createScreen`, `join`, `act`, `heartbeat`, `state`, `sketches`, `now`, `health`) + internal mutations for AI results + cleanup. `commit()` carries out engine effects and enforces the daily AI budget.
- `convex/ai.ts`: actions `glow` (sketch redraw), `judge` (sketch score), `generate` (prompt → image), `compare` (image vs target, 5 areas), `hint`.
- `convex/targets.ts` + `targets.json`: target library, `matchOf`, `promptProblem` (shared word-limit/taboo rules, also used by the client).
- `convex/scoring.ts`, `convex/schema.ts` (rooms, sketches, presence, aiBudget), `convex/crons.ts` (hourly idle-room cleanup).
- Client (`client/src`): `net/socket.ts` (Convex client + `send().emit(...)` shim), `state/useRoom.ts` (state query, sketches query, heartbeat, clock offset, toasts), `screens/` (Landing + `LiveDemo`, Demo, PlayScreen, HostScreen), `shell/` (PhoneShell with players+chat side panel, MainShell for TV, Coach bar, HowTo, HomeButton with leave confirmation, EntryLayout for join/solo pages, Loading), `moments/` (one file per phase; `PromptMode.tsx` = study/write screens; `FinalExtras.tsx` = highlight-reel carousel + share dialog), `share/card.ts` (1080×1350 result card), `sound/` (`sfx.ts` effects on a compressed bus + volume prefs, `music.ts` procedural lofi bed, one tab plays at a time), `design/useFitGrid.ts` (tiles sized to fit the viewport).
- `server/` is the old Socket.IO server: **unused in production** (only the `/studio` content tool and `npm test` still reference it).

## 4. Polish done this session (so it isn't redone)

Fit-to-viewport layouts at 100% zoom; player screen with right-hand players + chat panel; coach bar (round step tracker + one instruction per phase, mode-aware); staggered "redrawing" reveal for every tile; mascot "Sketchy" (detective artist, 7 poses in `client/public/mascot/`); procedural lofi music on every page with Music/Effects sliders; instant HTML splash + shared loading screen + route fade; in-app navigation (no reloads); Home button + leave confirmation in every game header; home page with live prompt-mode explainer, lively sky (soft clouds, sun, sparkles, outline-free parallax hills); join/solo/host pages share that look; results screens; coverflow highlight reel; share dialog (native share on phones, copy image, download PNG, copy invite link; Convex images load with crossOrigin so the canvas exports); modals portaled to `<body>`; confetti sized to the window (it used to widen the page).

## 5. Verified vs not verified

Verified: typecheck; 31 old unit tests; `smoke:mp` full 4-player games in Sketch mode (with a forced revote) and Prompt mode (3 rounds, exactly one masked target, no leaks before reveal); live prod draft scored 75/100; solo flows driven in the browser.
**Not verified:** a real group of humans playing Prompt mode on phones; the phone share sheet; audio by ear (music balance, no crackle); every screen on a real small phone; judge score consistency at scale.

## 6. Costs

~1¢ per image request (fal rounds up) + ~0.1–0.3¢ per judge call. Solo demo ≈ 5¢. 4-player 3-round Prompt game ≈ 30¢. Daily cap 200 images + 200 judges → worst case ≈ $2.50/day. Raise for judging week: `npx convex env set --prod AI_DAILY_JOB_LIMIT 400`. Set a spending alert in the fal dashboard.

## 7. Contest status (Handshake × OpenAI "AI Skills Studio": create a multiplayer game)

Requirements (mission + official rules): live reusable multiplayer game at its own public URL; room codes; no logins or installs; works on phone and laptop; replayable. Submit inside the Handshake mission: **title, cover image, description, project URL**. Deadline: **October 30, 2026, 11:59 PM Pacific** (rules PDF; the landing page says Oct 31; use the earlier date). Judging: Execution, Creativity, Usefulness/Value, Polish & Thoughtfulness, 25% each, scored 1–5; top 20 go to a judge panel; top 3 win $1,000.

My estimate (not a prediction): Execution 4, Creativity 4–5, Usefulness 4, Polish 4.

## 8. What's left (highest impact first)

1. Real playtest: 4+ people, phones, Prompt mode. Note confusion and bugs.
2. Submission assets: `docs/SUBMISSION.md` (title/description) and `docs/sketchy-cover.png` still pitch the drawing game; README still describes Socket.IO/Render. Update to Prompt mode + Convex/Vercel.
3. Domain (planned playsketchy.com or trysketchy.com): buy, add to the Vercel project, update the share-card site text (it uses `location.host`, so it updates automatically).
4. Phone pass of Prompt-mode screens (study, writer, refine, results) on a real small phone.
5. More solo-demo content (pre-made bot rounds for more targets) so replays vary.
6. Judge consistency check (same image scored repeatedly; tune `COMPARE_SYSTEM` in `convex/ai.ts` if it swings).
7. Decide whether to keep Sketch mode visible or hide it to keep the pitch focused.
8. Optional launch/demo video (not listed in the official requirements I read; check the mission page).
9. Clean-ups: delete or archive `server/` + `/studio` once no longer needed; merge the branch to `main`.

## 9. Working notes for the next session

- The user (Aayan) tests on desktop Chrome at 100% zoom and on phones; layouts must fit without scrolling on laptops.
- Every change so far was deployed with `npm run deploy`, then committed and pushed to `codex/finish-sketchy-submission`.
- The Convex guidelines are in `convex/_generated/ai/guidelines.md`; read them before editing `convex/`.
- Don't print `.env` / `.env.local` values. Load keys with `set -a; source .env; set +a` inside a command when needed.
