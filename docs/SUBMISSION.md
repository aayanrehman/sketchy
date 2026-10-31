# Sketchy submission checklist

## Challenge entry (paste these into the Handshake mission)

**Title:** Sketchy — One of you can’t see the whole picture

**Project URL:** https://sketchy-blue.vercel.app

**Cover image:** [sketchy-cover.png](sketchy-cover.png) (1200×630). Rendered from the `/cover` route by `scripts/make-cover.ts`; it is also the link-preview image `client/public/og.png`.

**Description:**

Sketchy is a party game for 2 to 8 players where you recreate a picture by writing AI image prompts, and one of you can't see the whole picture.

Everyone studies the same target image. You write a quick 8-word draft, see what it got wrong, then refine it into a final prompt of up to 30 words. One player is the imposter: they saw the picture with its key detail erased and have to bluff. Compare the AI images, argue in the chat and vote. A caught imposter can still steal the round by guessing what was hidden. An AI judge scores every final image against the target in five areas and gives each player one tip, so every round makes you a slightly better prompter.

You're also up against Inspector Luna, an AI detective who sits at every table. She studies everyone's prompts and images, quietly picks a suspect, and reveals her odds at the unmask. Imposters who fool the table and Luna earn a bonus.

Pick one of eight characters, join with a room code or QR on any phone or laptop, with no login or install. Bots fill empty seats. Three round rules (Warm-up, Taboo, Style), a daily target with streaks and Bronze/Silver/Gold tiers, challenge links that end in a side-by-side duel, and crew leaderboards keep people coming back.

Judges: tap "Play solo vs. bots" to play two rounds in about three minutes.

**Short version (if a field is limited to about 300 characters):**

Recreate a picture by writing AI prompts while one imposter sees it with the key detail erased. Vote them out, then see if Inspector Luna, the AI detective, agrees. 2–8 players, bots fill seats, no login. Try "Play solo vs. bots".

## Official requirements

Sources: the mission page and the official rules PDF. The mission requires a live, reusable game with room codes, no player login or app installation, and phone/laptop play. The rules require a title, cover, description and project URL submitted inside the Handshake mission. **Deadline: October 30, 2026, 11:59 PM Pacific** (the rules PDF; the landing page says October 31, use the earlier date). Judging: Execution, Creativity, Usefulness/Value, Polish & Thoughtfulness, 25% each; top 20 go to a judge panel; top 3 win $1,000.

| Rubric | What backs it |
| --- | --- |
| Execution | Live Convex rooms with server-owned timers, early phase ends, rejoin by token, host hand-off, imposter-fled, spectators, revotes, bots that fill empty seats, daily AI budget with graceful fallbacks. 41 engine/scoring/protocol tests; browser-verified flows on the live site (4-player game, 2-player duel, daily, challenge, crew, viewport audit at 320–430px). |
| Creativity | Prompt-recreation social deduction: the imposter’s erased detail turns prompting skill into the tell. Draft-then-refine teaches iteration. The judge is a character that hints during discussion, and Inspector Luna, an AI detective, competes with the table to find the imposter. |
| Usefulness / Value | A replayable party game for friend groups and classrooms that makes people better at prompting; solo mode and a daily target for anyone alone; tiers, streaks, challenge duels and crew boards keep groups coming back; XP, bests and result cards. |
| Polish & Thoughtfulness | Eight-character cast with character select, one design system, coach bar with one instruction per phase, mascot in seven poses, lofi music and effects with controls, reduced-motion variants, installable (manifest + icons), link previews, fit-to-viewport layouts on laptops and small phones. |

## Before you submit (October 30)

1. Deploy the current build: `npm run deploy` (Z-Image images, Luna on the fal judge model, new cover).
2. Open https://sketchy-blue.vercel.app on your phone, tap "Play solo vs. bots" and play one round: images should appear in a couple of seconds and get scores.
3. Paste the title, URL and description above into the Handshake mission and upload `docs/sketchy-cover.png`.
4. Set a spending alert in the fal dashboard. At the current daily cap (200 images + 200 judge calls) a full day costs about $0.90, so $13 lasts at least two weeks even if the cap is hit every day.
