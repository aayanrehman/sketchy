# Sketchy: current handoff

Last updated October 10, 2026 (Claude session: tiers, challenge duels, crews, 28 targets; see §4d and §5). October 8: deployed and browser-verified the Draft→Refine, settings and daily work. Earlier that day: Draft→Refine clarity, engine edge cases, icons/manifest, docs. Previous: October 7 (Convex + Vercel move, Prompt mode). Older handoffs (`CODEX_FINISH_HANDOFF.md`, earlier versions of this file in git history) describe the previous Socket.IO/drawing-only build and are superseded.

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

## 4b. Shipped October 8 (deployed and browser-verified Oct 8, see §5)

- Prompt mode Draft→Final hand-off: persistent two-step strip on the writer, draft recap + pre-fill in Refine, "+N since your draft" counter, step-named buttons, title cards for Draft and Refine, "Step 1 of 2 / 2 of 2" coach lines, how-to copy.
- Engine: missing the draft no longer forfeits the final prompt; results wait for a late final-image score (25 s `verdictSettle` timer) before "See scores" can end the phase; character limit 320. `convex/engine.test.ts` (4 tests) now runs under `npm test` (35 total).
- Icons: favicon.ico / favicon-64.png (head-and-beret crop), apple-touch-icon, icon-192/512 + maskable, `manifest.webmanifest` (installable), `og.png` + Open Graph / Twitter tags for link previews. "Add to home screen" nudge on the landing page after the first game (`shell/useInstall.ts`).
- README and docs/SUBMISSION.md rewritten for Prompt mode + Convex/Vercel.

## 4c. Shipped October 8, second pass (deployed and browser-verified Oct 8, see §5)

- **Pace + difficulty** (lobby, host-only): Quick = 2 rounds, Study 8 s / Draft 25 / Refine 30 / Discuss 15 / Vote 15 / Scores 7 (default for new rooms and solo); Classic = PRD timings, 3 rounds. Difficulty: Easy 10+40 words, no rules; Normal 8+30, rules rotate; Hard 6+18, a rule every round. `shared/types.ts` (`QUICK_MS`, `WORD_LIMITS`), `Engine.setSettings/ms()`, action `setSettings`, `SettingsPicker` in `Lobby.tsx`. All word-limit copy is dynamic.
- **Placeholder bots on every target** (`placeholderBots` in `convex/targets.ts`): artists "produce" the target, the bot imposter produces the masked image, with preset breakdowns. Solo play now picks random targets from the whole library (recorded content preferred for round 1). Record real content to replace them over time.
- **Daily target** (`/daily`): one UTC-day target for everyone (`dailyTarget` in targets.ts), one quick round as an artist vs bots, first score of the day counts; streak, best streak and "new personal best" in `progression/store.ts`; landing card with blurred preview and 🔥 streak; share text "I scored N/100 on today's Sketchy target. Beat me: /daily". Cost ≈ 1 image + 1 judge (human only; bots are free).
- **Imposter view**: the masked target now wears a pulsing ERASED stamp and a dashed red frame; copy says "erased", not "blurred".
- Engine tests: 38 total.

## 4d. Shipped October 10 (deployed and browser-verified Oct 10): the come-back loop

- **Tiers** (`TIERS`/`tierOf` in `shared/types.ts`): Gold 85, Silver 75, Bronze 60. Badges on results tiles, final ranks, the landing daily card and crew boards; a tier toast on every prompt-mode final (Gold adds a confetti burst). The daily streak only survives at Bronze or better (`STREAK_MIN`, `recordDaily` returns `kept`).
- **Identity without login**: `deviceId()` (`client/src/social/identity.ts`, localStorage `sketchy.device`) is sent on `join` and `createDemo` and stored on the seat (`Seat.deviceId`).
- **Attempts table** (`convex/schema.ts`): the engine emits an `attempt` effect when a human's final score lands (`applyCompare`); `commit()` inserts it with kind daily/challenge/party/solo and `counts` (first daily attempt of the device's day). Scripted http seats without a device id record nothing.
- **Challenges** (`convex/social.ts`): "Copy challenge" in the share dialog copies `I scored N/100 (Tier) on this Sketchy picture. Beat me: <site>/daily?c=<attemptId>`. The link opens the daily entry as "You've been challenged" (`ChallengeCard`), `createDemo` takes `challengeId` and forces that target, and FINAL shows the **duel** (`Duel`: both images, prompts, tiers, winner highlighted). A challenge on today's target also counts as the daily; another target is kind `challenge` and leaves the streak alone.
- **Crews** (friends): `crews` table (code + members by device id). Landing `CrewCard`: start a crew (copies `/?crew=CODE`), join from the link, board with today's score + tier, streak and the week's total (`crewBoard`, client passes the last 7 UTC day keys). Party games: the host's "Keep this group as a crew" on FINAL (`crewFromRoom`) puts every seated device in a crew; the room carries `crewCode` so every phone saves it.
- **Target generation**: `scripts/make-targets.ts` (LLM spec → gpt-image-1-mini paints → the edit model erases the key prop under a grey "?" cloud). 16 new targets reviewed and kept (koala-gamer dropped: the console stayed visible in the mask). Library is now 28. Cost ≈ 2 medium images + 1 text call per target (≈ 4–5¢). Adding targets changes that day's daily pick for everyone (`dailyTarget` indexes by library length), so add them late in the day. Never run it while people are playing: on Oct 10 it starved fal and a whole live round fell back ("The image model couldn't draw that prompt", judge fallback, settle timer), which at least proved every fallback path live.
- Verification flow `social` in `scripts/live-verify.ts`; the `mp` flow now ends with the crew step.

## 5. Verified vs not verified

**Verified October 8, 2026 on prod (commit deployed = `git rev-parse HEAD`, typecheck clean, 38 tests)** with `scripts/live-verify.ts` (Playwright on the live site, extra seats scripted through the Convex client; screenshots in `artifacts/live/`, gitignored). Run: `VITE_CONVEX_URL=https://curious-chickadee-740.convex.cloud node --import tsx scripts/live-verify.ts [landing|daily|demo|mp|all]` (each run costs real AI jobs: daily ≈ 4, demo ≈ 8, mp ≈ 31).
- Landing (390×844 and 1366×820): favicon.ico linked and served; "Today's target" card blurred with no streak before playing.
- `/daily`: full quick round vs 3 bots to the result on phone and laptop; first play records the streak toast ("Day 1 of your streak…"), landing card unblurs and shows "You scored N/100" with 🔥 1; a second play the same day says "You scored N today. Play again for practice.", shows no streak toast and leaves the stored score and streak unchanged; "Copy challenge" copies `I scored N/100 on today's Sketchy target. Beat me: https://sketchy-blue.vercel.app/daily`.
- `/demo`: two rounds; round 2 the human is the imposter and sees the pulsing ERASED stamp, dashed red frame and "erased" copy; a placeholder-bot target (robot-dog) resolved to scores with the target/masked images as bot art.
- Lobby (host TV + 2 phones + 2 scripted seats): TV switches Classic (3 rounds) ↔ Quick (2 rounds) and Easy; the phone host (first player to join) switches Hard; the other phone sees the choice with disabled radios. In game: Quick Draft = 25 s, Refine = 30 s; Hard = 6/18 words with taboo then style rules.
- Prompt mode on the phone: two-step strip, draft recap + pre-fill in Refine, "+3 since your draft", imposter ERASED copy. Missing the draft on purpose (timer ran out) still allowed a final prompt, which was generated and scored.
- Results: every final image was judged; the game total equalled the sum of all awards (no score dropped). The "Waiting for the judge's last score…" state could NOT be reached live: even with finals locked 9 s before the buzzer, every score had landed before anyone could tap "See scores". It is covered by `convex/engine.test.ts` only.

Verified October 10 on prod (live-verify `social` + `mp`): tier toast and badges ("🥈 Silver! Best match 82/100"); challenge copied with the attempt link; a second browser profile opened it, saw "Tester scored 82/100 Silver", played the same picture and got the duel ("A dead heat!" with both images); crew started on device A, joined from the invite on device B, board listed both with today's scores and weekly totals; party game → "Keep this group as a crew" put both phones in the same crew and the home page showed the board. Also reached live for the first time: "Waiting for the judge's last score…" with 4 scores pending, then the settle timer (while fal was saturated by the target generator).

**Not verified:** a real group of humans on phones; "Add to home screen" on a real iPhone/Android (this Mac has no full Xcode, so no simulator; manifest is `display: standalone` with 192/512/maskable icons); the phone share sheet; audio by ear; judge score consistency at scale; the fal dashboard spend (Claude in Chrome wasn't connected; see §6 for the job-count-based estimate).

**Fixed this session:** the Prompt-mode study phase showed the Sketch-mode "Secret prompt" title card; it now says "Study the target" (`STUDY_BANNER` in `shell/PhaseStage.tsx`, used by Play, Host and Demo screens). Also deployed the focus-outline fix from §10.

## 6. Costs

Measured Oct 8 from the `aiBudget` counters: one daily play = 2 images + 2 judge calls (draft + final each; bots are free). One 4-player Quick game (2 rounds) = 16 images + 16 judge calls (15 + 15 when someone misses a draft). Classic (3 rounds) = 24 + 24. The Discuss-phase hint (openrouter text call, one per round) is NOT counted against the budget.
At ~1¢ per image + ~0.1–0.3¢ per judge call: daily play ≈ 2.5¢, solo demo ≈ 5¢, 4-player Quick game ≈ 20¢, Classic ≈ 30¢. Daily cap 200 images + 200 judges → worst case ≈ $2.50/day; raise for judging week with `npx convex env set --prod AI_DAILY_JOB_LIMIT 400`. Check actual spend in the fal dashboard and set a spending alert there.

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
10. Done Oct 10: generated targets (`scripts/make-targets.ts`), friends (crews) and challenges on the `attempts` table. Still not built: real recorded bot content for more targets; a global or per-target leaderboard UI (`social.leaders` exists, unused); a "Challenge a friend" button on the party FINAL for non-prompt rounds; crew member removal; a way to recover a crew code on a new device.

## 9. Working notes for the next session

- The user (Aayan) tests on desktop Chrome at 100% zoom and on phones; layouts must fit without scrolling on laptops.
- Every change so far was deployed with `npm run deploy`, then committed and pushed to `codex/finish-sketchy-submission`.
- The Convex guidelines are in `convex/_generated/ai/guidelines.md`; read them before editing `convex/`.
- Don't print `.env` / `.env.local` values. Load keys with `set -a; source .env; set +a` inside a command when needed.
- The live-verify flows: `landing` (free), `daily` (≈4 AI jobs), `demo` (≈8), `social` (≈4), `mp` (≈31). Run one at a time; fal throughput is shared with real players.
- `VITE_CONVEX_URL` in `.env.local` points at the DEV deployment. Scripts that should hit prod (`smoke:mp`, `live-verify`) need `VITE_CONVEX_URL=https://curious-chickadee-740.convex.cloud` on the command line.

## 10. Launch video + cover (October 7, 2026)

All in `video/`:
- `sketchy-launch-1920x1080.mp4`: 85 s master. `sketchy-launch-1080x1920.mp4`: vertical cut. `sketchy-cover-1200x630.png`: Handshake cover image.
- Footage is real, captured from the live site by `video/capture.ts` (`node --import tsx video/capture.ts demo desktop|phone`, `join`, `home`, `music`). The music bed is the game's own procedural lofi, recorded from the site. `video/raw/` (gitignored) holds the captures.
- HyperFrames projects: `video/sketchy-launch/` (landscape; `node gen.mjs` writes index.html, `./build-assets.sh` re-cuts clips from `video/raw`) and `video/sketchy-vertical/` (written by `sketchy-launch/gen-vertical.mjs`, shares `assets/` via symlink). Render: `npx hyperframes render --quality high --output renders/video.mp4` in each folder. If a render stalls or crashes partway (happened on the vertical), use `HF_SEGMENTED_CAPTURE=true npx hyperframes render --quality high --low-memory-mode --resume --output renders/video.mp4` (about 4 min). If frame extraction times out, clear the leftover `.partial` folders in `$TMPDIR/hyperframes-extract-cache-501`. Cover: `video/sketchy-launch/cover.html`.
- Plan: `video/sketchy-launch/STORYBOARD.md`. To swap in a custom domain, change `URL` in both gen scripts and the cover, then re-render.
- Known: the footage in the current renders shows a blue focus box around the phase area. The fix (`client/src/design/tokens.css`) is deployed as of Oct 8; re-capture and re-render to get clean footage.

