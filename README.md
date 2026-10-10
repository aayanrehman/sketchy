# Sketchy

**One of you can’t see the whole picture.**

A party game for 4–8 people on phones or laptops, no login, no install. Everyone sees a target image and recreates it by writing AI prompts: a quick 8-word draft, then a final prompt of up to 30 words. One imposter sees the same image with the key detail blurred and has to bluff. Compare the images, chat, vote, then an AI judge scores every final image against the target.

**Play:** https://sketchy-blue.vercel.app · **Solo practice:** `/demo` · **Host screen (TV):** `/host`

Also included: **Sketch mode**, the original drawing game (draw a secret prompt, one imposter has a slightly different one, AI redraws every sketch as a sticker and scores the original).

## How a round works (Prompt mode)

| Step | What happens | Time |
| --- | --- | --- |
| Study | Everyone studies the target. The imposter’s copy has a detail blurred out. | 12 s |
| Draft | Write a quick prompt, max 8 words. Every draft is generated as an image. | 35 s |
| Refine | See your draft’s score, what it missed and a tip, plus everyone’s draft images. Expand to a final prompt of up to 30 words. Only the final is scored. | 40 s |
| Reveal | Final images paint in; the draft sits in the corner. | ~20 s |
| Discuss | Chat. Sketchy, the judge, drops one hint about the drafts. | 30 s |
| Vote | Tap the image you think the imposter made. A tie with the imposter triggers a 12 s revote. | 20 s |
| Unmask, Steal | Spotlight, stamp. A caught imposter picks what was hidden from 4 options. | |
| Results | Target, the original prompt behind it, every player’s prompts, a 5-area breakdown. | |

Three rounds, each with a rule: Warm-up, Taboo (obvious words banned), Style (style and color count double).

Scoring: correct vote +100 (+150 on a streak) · imposter escapes +200 · steal +150 · everyone +½ of their final match · improvement bonus up to +25 · closest artist +50 · imposter who matches the artists’ median +100.

## Come back tomorrow (daily, tiers, challenges, crews)

- `/daily`: one shared target per UTC day, one quick round vs bots. Scores earn tiers (Bronze 60, Silver 75, Gold 85); Bronze or better keeps the streak.
- Every scored prompt-mode final is recorded in the `attempts` table under a per-device id (no login). "Copy challenge" on any result makes a link (`/daily?c=<attempt>`) that opens the same picture and ends in a side-by-side duel.
- Crews: "Start a crew" on the home page or "Keep this group as a crew" at the end of a party game; the invite link (`/?crew=CODE`) joins; the board shows today's score, tier, streak and the week's total per member.
- New targets: `node --import tsx scripts/make-targets.ts --count 5` (needs `FAL_KEY`; writes images + `convex/targets.json`; review the masked versions before committing; never run it while people are playing, it starves the live image model).

## Run it

```bash
npm install
npm run dev          # Convex dev backend (needs a Convex login, `npx convex dev` the first time) + Vite client on :5173
npm run typecheck    # client + convex
npm test             # engine, scoring, protocol and AI unit tests (no network)
npm run deploy       # convex deploy (prod) + vercel deploy --prod
```

The backend is [Convex](https://convex.dev) (`convex/`). The engine (`convex/engine.ts`) is pure TypeScript: one mutation loads room state, calls one method, saves it and carries out the returned effects (timers, AI jobs). Timers are the Convex scheduler with token-based cancellation.

AI runs through fal.ai: `fal-ai/gpt-image-1-mini` for images, GPT-4.1 mini via fal’s vision router for the judge and the hint. Keys live only in Convex environment variables. Without a key the game runs in mock mode with placeholder images and deterministic scores.

Convex env (prod): `FAL_KEY`, `AI_MODE=fal`, `LIVE_AI_ENABLED=true`, `AI_DAILY_JOB_LIMIT` (images and judge calls each, default 200), `SITE_URL`.

## Cost controls

About 1¢ per image and 0.1–0.3¢ per judge call. A solo demo is about 5¢; a 4-player, 3-round game about 30¢. The daily cap bounds spend at roughly $2.50 a day at 200; raise it for busy days with `npx convex env set --prod AI_DAILY_JOB_LIMIT 400`. When the cap is hit, rounds continue with designed fallbacks instead of stalling. Set a spending alert in the fal dashboard too.

## Layout

```
shared/        types, phase lengths, scoring constants, prompt pairs (Sketch mode)
convex/        engine.ts (game engine), game.ts (public API), ai.ts (generate / compare / judge / hint),
               targets.ts + targets.json (Prompt-mode targets), scoring.ts, schema.ts, crons.ts
client/src/    design/ (tokens, motion, components), shell/ (TV + phone layouts, coach bar, phase transitions),
               moments/ (one file per phase), screens/, sound/, progression/, share/
client/public/ mascot art, targets and masked targets, icons, manifest
server/        the original Socket.IO server; not deployed, kept for the /studio content tool and its tests
docs/          SUBMISSION.md, PRD-NOTES.md, PLAYTEST.md, DEPLOYMENT.md
```

Design system and motion rules: [DESIGN.md](DESIGN.md). Current state and what’s left: [HANDOFF.md](HANDOFF.md).
