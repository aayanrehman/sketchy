# Sketchy submission checklist

## Challenge entry

**Title:** Sketchy — Draw. Disguise. Get caught.

**Cover:** [sketchy-cover.png](sketchy-cover.png), 1200×630.

**Description:** Sketchy is a drawing party game for 4–8 friends. Everyone draws a secret prompt, but one imposter receives a slightly different one and has to blend in. Watch sketches become sticker art, argue over the gallery, vote, and give the caught imposter one chance to steal the round. The AI judge scores how well the original drawings match the real prompt. Join by room code from a phone or laptop, play three rounds, and save a result card. A two-round solo demo teaches both roles without organizing a group.

**Public game URL:** Pending deployment. A GitHub repository link does not replace the playable URL.

## Official requirements checked October 7, 2026

Sources: [mission](https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/) and [official rules](https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0).

The mission requires a live, reusable game with room codes, no player login or app installation, and phone/laptop play. The rules require a title, cover, description and project URL submitted inside the Handshake mission. **Use October 30, 2026, 11:59 PM Pacific as the deadline:** the rules PDF gives that earlier date, although the landing page says October 31.

| Rubric (25% each) | Evidence and remaining checks |
| --- | --- |
| Execution | Authoritative synchronized rooms, private prompts, full gameplay, reconnects, replay, tested scoring. Public deployment and live AI still need verification. |
| Creativity | Drawing-based social deduction, sketch-conditioned sticker transformations, a caught-player steal, and a separate raw-sketch judge. Judge evaluation is subjective. |
| Usefulness / Value | A reusable party game with QR/code joining, built-in guidance, solo onboarding and downloadable results. Real group playtesting remains useful. |
| Polish & Thoughtfulness | Illustrated characters, coordinated scenery, small-phone layouts, accessible dialogs, reduced motion, and designed pending/blank/refusal states. |

These checks support the submission; they are not a prediction or guarantee of a judging score.

## What ships

- Phone drawing controller and synchronized main screen; 4–8 players, documented rules and validated scoring.
- Two-round solo demo: artist first, imposter second. Prepared cat/frog artwork ships with the code. Bot scores are examples and labeled accordingly.
- Eight SVG avatar faces, three illustrated award badges, refined Blotto mascot, phone HUD, two-column TV verdict, composed landing page and 1200×630 key-art cover.
- Local Fredoka/Nunito fonts. No Google Fonts network dependency.
- Compressed WebP generation served through file URLs, bounded judge cache, designed fallbacks, and studio protected in every environment.
- Render blueprint with persistent media storage; Docker alternative.

## Current verification — October 7, 2026

Typecheck, production build, and 31 tests passed. The Socket.IO test completes two eight-player, three-round games and checks creator authority, read-only spectators, reconnect, malformed input and replay. Browser automation checks 13 states at 320×568, 390×844, 768×1024 and 1440×1000, drawing/undo, discussion, all eight verdicts, PNG download, rematch and refresh. The two-round solo demo and replay passed. These are automated checks, not human playtests.

One live fal.ai smoke test succeeded with `gpt-image-1-mini` editing (11.7 s) and a GPT-4.1 mini rating of the original (2.9 s). Image fidelity, rating stability and real group latency need broader evaluation. See [the evidence ledger](RELEASE_EVIDENCE.md).

## Remaining release gates

1. Approve and deploy the prepared Render Starter service plus 1 GB disk in workspace aayanreh. Configure FAL_KEY in Render’s secret manager, then enable live calls within an approved request/billing budget.
2. Verify the public URL, HTTPS/WebSocket joins, full group game/rematch, reconnect and controlled restart. Rooms intentionally end on restart; media and the daily request ledger must survive on the disk.
3. Complete the human-labeled sketch evaluation and at least two first-time group playtests, including remote discussion and eight-player play where practical. Do not substitute bots for participants.
4. Capture a short real gameplay recording; update this page with the verified URL and deployed commit. The restored 1200×630 cover is available.
5. The owner reviews and submits the title, cover, description and working URL through Handshake. No entry has been submitted.

## Suggested recording

Host on a laptop → join phones by QR/code → show private prompts and drawing → compare originals and AI interpretations → discuss and vote → show caught-player steal → navigate the evidence recap → download the result card → rematch. Avoid displaying host credentials, API keys or studio secrets.

Public hosting, human playtest outcomes and contest readiness are not yet claimed.
