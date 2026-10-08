# Sketchy submission checklist

## Challenge entry

**Title:** Sketchy — One of you can’t see the whole picture.

**Cover:** [sketchy-cover.png](sketchy-cover.png), 1200×630. (Regenerate from the live game before submitting: the current cover shows Sketch mode art.)

**Public game URL:** https://sketchy-blue.vercel.app (custom domain planned; the share card and invite link follow `location.host` automatically).

**Description (edit before submitting):**

Sketchy is a party game for 4 to 8 people where you recreate a picture by writing AI prompts. Everyone studies the same target, writes a quick 8-word draft, sees what their draft got wrong, then expands it into a final prompt of up to 30 words. One imposter saw the picture with the key detail blurred and has to bluff their way through. Compare the images, argue in the chat, vote, and let a caught imposter try to steal the round by guessing what was hidden. An AI judge scores every final image against the target in five areas and gives everyone one tip, so each round makes you a slightly better prompter.

**Judges: tap “Play solo vs. bots” to play two rounds in about three minutes, including the live AI judge.**

No logins, no installs, any phone or laptop, join by room code or QR. Rejoin on refresh, host hand-off, revotes on ties, and fallbacks when the AI is slow keep every round moving. Three round rules (Warm-up, Taboo, Style), XP and personal bests, and a shareable result card bring people back.

## Official requirements

Sources: the mission page and the official rules PDF. The mission requires a live, reusable game with room codes, no player login or app installation, and phone/laptop play. The rules require a title, cover, description and project URL submitted inside the Handshake mission. **Deadline: October 30, 2026, 11:59 PM Pacific** (the rules PDF; the landing page says October 31, use the earlier date). Judging: Execution, Creativity, Usefulness/Value, Polish & Thoughtfulness, 25% each; top 20 go to a judge panel; top 3 win $1,000.

| Rubric | What backs it |
| --- | --- |
| Execution | Live Convex rooms with server-owned timers, early phase ends, rejoin by token, host hand-off, imposter-fled, spectators, revotes, daily AI budget with graceful fallbacks. 35 engine/scoring/protocol tests; scripted 4-player smoke games in both modes. |
| Creativity | Prompt-recreation social deduction: the imposter’s blurred detail turns prompting skill into the tell. Draft-then-refine teaches iteration. The judge is a character that hints during discussion. |
| Usefulness / Value | A replayable party game for friend groups and classrooms that makes people better at prompting; solo mode for anyone alone; XP, bests and result cards. |
| Polish & Thoughtfulness | One design system, coach bar with one instruction per phase, mascot in seven poses, lofi music and effects with controls, reduced-motion variants, installable (manifest + icons), link previews, fit-to-viewport layouts on laptops and small phones. |

## Before you submit

1. Run two first-time group playtests on phones (see PLAYTEST.md). Fix what confused people.
2. Regenerate the cover from Prompt-mode screens (target, drafts, IMPOSTER stamp, a match score).
3. Point the custom domain at Vercel and confirm HTTPS.
4. Raise `AI_DAILY_JOB_LIMIT` to 400 for judging week and set a fal spending alert.
5. Record real bot content for at least four more targets so repeat solo plays differ.
6. Merge to `main` and confirm the deployed commit matches.
