# Sketchy: current handoff

Last updated October 8, 2026 (Claude session: Draft→Refine clarity, engine edge cases, icons/manifest, docs). Previous: October 7 (Convex + Vercel move, Prompt mode). Older handoffs (`CODEX_FINISH_HANDOFF.md`, earlier versions of this file in git history) describe the previous Socket.IO/drawing-only build and are superseded.

## 1. Where things live

| What | Where |
|---|---|
| Live game | https://sketchy-blue.vercel.app (Vercel project `sketchy`, account `aayanrehmann-6534`) |
| Code | `~/Documents/ChatGPT/sketchy`, GitHub `aayanrehman/sketchy` (public). **`main` and `codex/finish-sketchy-submission` are the same commit as of Oct 8**; keep pushing to both or just `main`. Vercel is NOT linked to git: deploy with `npm run deploy`. |
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

## 4b. Shipped October 8 (Claude session, NOT yet deployed: run `npm run deploy`)

- Prompt mode Draft→Final hand-off: persistent two-step strip on the writer, draft recap + pre-fill in Refine, "+N since your draft" counter, step-named buttons, title cards for Draft and Refine, "Step 1 of 2 / 2 of 2" coach lines, how-to copy.
- Engine: missing the draft no longer forfeits the final prompt; results wait for a late final-image score (25 s `verdictSettle` timer) before "See scores" can end the phase; character limit 320. `convex/engine.test.ts` (4 tests) now runs under `npm test` (35 total).
- Icons: favicon.ico / favicon-64.png (head-and-beret crop), apple-touch-icon, icon-192/512 + maskable, `manifest.webmanifest` (installable), `og.png` + Open Graph / Twitter tags for link previews. "Add to home screen" nudge on the landing page after the first game (`shell/useInstall.ts`).
- README and docs/SUBMISSION.md rewritten for Prompt mode + Convex/Vercel.

## 4c. Shipped October 8, second pass (NOT yet deployed: run `npm run deploy`)

- **Pace + difficulty** (lobby, host-only): Quick = 2 rounds, Study 8 s / Draft 25 / Refine 30 / Discuss 15 / Vote 15 / Scores 7 (default for new rooms and solo); Classic = PRD timings, 3 rounds. Difficulty: Easy 10+40 words, no rules; Normal 8+30, rules rotate; Hard 6+18, a rule every round. `shared/types.ts` (`QUICK_MS`, `WORD_LIMITS`), `Engine.setSettings/ms()`, action `setSettings`, `SettingsPicker` in `Lobby.tsx`. All word-limit copy is dynamic.
- **Placeholder bots on every target** (`placeholderBots` in `convex/targets.ts`): artists "produce" the target, the bot imposter produces the masked image, with preset breakdowns. Solo play now picks random targets from the whole library (recorded content preferred for round 1). Record real content to replace them over time.
- **Daily target** (`/daily`): one UTC-day target for everyone (`dailyTarget` in targets.ts), one quick round as an artist vs bots, first score of the day counts; streak, best streak and "new personal best" in `progression/store.ts`; landing card with blurred preview and 🔥 streak; share text "I scored N/100 on today's Sketchy target. Beat me: /daily". Cost ≈ 1 image + 1 judge (human only; bots are free).
- **Imposter view**: the masked target now wears a pulsing ERASED stamp and a dashed red frame; copy says "erased", not "blurred".
- Engine tests: 38 total.

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
2. Cover image still shows Sketch-mode art: regenerate `docs/sketchy-cover.png` and `client/public/og.png` from Prompt-mode screens (SUBMISSION.md and README are updated).
3. Domain (planned playsketchy.com or trysketchy.com): buy, add to the Vercel project, update the share-card site text (it uses `location.host`, so it updates automatically).
4. Phone pass of Prompt-mode screens (study, writer, refine, results) on a real small phone.
5. More solo-demo content (pre-made bot rounds for more targets) so replays vary.
6. Judge consistency check (same image scored repeatedly; tune `COMPARE_SYSTEM` in `convex/ai.ts` if it swings).
7. Decide whether to keep Sketch mode visible or hide it to keep the pitch focused.
8. ~~Launch/demo video~~ done (see §10).
9. Clean-ups: delete or archive `server/` + `/studio` once no longer needed.
10. Not built yet: AI-generated targets (a `generate` call per new target plus a masked variant; needs a mask strategy since masks are hand-made files today), friends/leaderboards (needs identity: at minimum a per-device id and a `dailyScores` table), real recorded bot content for more targets.

## 9. Working notes for the next session

- The user (Aayan) tests on desktop Chrome at 100% zoom and on phones; layouts must fit without scrolling on laptops.
- Every change so far was deployed with `npm run deploy`, then committed and pushed to `codex/finish-sketchy-submission`.
- The Convex guidelines are in `convex/_generated/ai/guidelines.md`; read them before editing `convex/`.
- Don't print `.env` / `.env.local` values. Load keys with `set -a; source .env; set +a` inside a command when needed.

## 10. Launch video + cover (October 7, 2026)

All in `video/`:
- `sketchy-launch-1920x1080.mp4`: 85 s master. `sketchy-launch-1080x1920.mp4`: vertical cut. `sketchy-cover-1200x630.png`: Handshake cover image.
- Footage is real, captured from the live site by `video/capture.ts` (`node --import tsx video/capture.ts demo desktop|phone`, `join`, `home`, `music`). The music bed is the game's own procedural lofi, recorded from the site. `video/raw/` (gitignored) holds the captures.
- HyperFrames projects: `video/sketchy-launch/` (landscape; `node gen.mjs` writes index.html, `./build-assets.sh` re-cuts clips from `video/raw`) and `video/sketchy-vertical/` (written by `sketchy-launch/gen-vertical.mjs`, shares `assets/` via symlink). Render: `npx hyperframes render --quality high --output renders/video.mp4` in each folder. If a render stalls or crashes partway (happened on the vertical), use `HF_SEGMENTED_CAPTURE=true npx hyperframes render --quality high --low-memory-mode --resume --output renders/video.mp4` (about 4 min). If frame extraction times out, clear the leftover `.partial` folders in `$TMPDIR/hyperframes-extract-cache-501`. Cover: `video/sketchy-launch/cover.html`.
- Plan: `video/sketchy-launch/STORYBOARD.md`. To swap in a custom domain, change `URL` in both gen scripts and the cover, then re-render.
- Known: the live footage shows a blue focus box around the phase area (fixed locally in `client/src/design/tokens.css`, not deployed yet). After deploying, re-capture and re-render to get clean footage.

