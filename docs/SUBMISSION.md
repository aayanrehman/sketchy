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
| Creativity | Drawing-based social deduction, prompt-preserving sticker transformations, a caught-player steal, and a separate raw-sketch judge. Judge evaluation is subjective. |
| Usefulness / Value | A reusable party game with QR/code joining, built-in guidance, solo onboarding and downloadable results. Real group playtesting remains useful. |
| Polish & Thoughtfulness | Illustrated characters, coordinated scenery, small-phone layouts, accessible dialogs, reduced motion, and designed pending/blank/refusal states. |

These checks support the submission; they are not a prediction or guarantee of a judging score.

## What ships

- Phone drawing controller and synchronized main screen; 4–8 players, unchanged PRD rules and scoring.
- Two-round solo demo: artist first, imposter second. Prepared cat/frog artwork ships with the code. Bot scores are examples and labeled accordingly.
- Eight SVG avatar faces, three illustrated award badges, refined Blotto mascot, phone HUD, two-column TV verdict, composed landing page and 1200×630 key-art cover.
- Local Fredoka/Nunito fonts. No Google Fonts network dependency.
- Compressed WebP generation served through file URLs, bounded judge cache, designed fallbacks, and protected production studio.
- Render blueprint with persistent media storage; Docker alternative.

## Verification completed in the creative pass

`npm run typecheck`, `npm test` (16 passing tests), and `npm run build` passed. An eight-player Socket.IO run completed all three rounds, preserved a reconnected seat, rejected a ninth player, and reset all scores for replay. Browser runs at 390×844 and 1366×820 completed both demo rounds through every phase and downloaded valid PNG result cards. The wide run used reduced motion. No page errors, broken route images, or horizontal overflow were observed on the main app routes. `/cover` intentionally uses a fixed 1200×630 canvas.

The component audit exercised 11 phases with eight players and long names at 320×568, 390×844, 768×1024 and 1366×820. It included pending art, an image fallback, a judge fallback, blank drawings, Golden frames, and reduced motion. Phone scoreboard and verdict-column overflows were corrected. Dialogs close with Escape and restore focus; the modal layer covers notifications. Held-pointer submission includes the unfinished stroke. Status checks/stars are SVGs rather than OS-dependent glyphs. CI runs typecheck, tests and production build for pushes and pull requests.

## Before submitting the public link

1. Deploy one long-lived Node instance from the finished branch with `OPENAI_API_KEY`, `STUDIO_KEY`, and persistent `MEDIA_DIR`. Render's blueprint defines the disk.
2. Confirm `/api/health` returns `aiMode: "openai"`. Preview mode is functional, but does not demonstrate live AI.
3. Open `/studio`, provide the studio key, and generate one nonblank sketch. Confirm the image edit returns a working `/media/…webp` URL and the judge returns a score. A successful image response includes `elapsedMs`; the server logs image latency and bytes. `/api/proof` reports whether both configured models are available, but model listing alone does not verify generation.
4. Play one real round with four devices. Measure several buzzer-time submissions. The 25 s image timeout is intentionally unchanged; a 20 s gallery cannot guarantee every late drawing is ready before Discuss. Only real testing can establish the practical latency and cost.
5. For a showcase with bot scores genuinely recorded by this app's judge, replace the bundled prepared fixtures through `/studio`: three real sketches and one decoy for each of pairs 2 and 9. Check art subject preservation. Do not give the player prompt to the glow-up model.
6. Verify saved art URLs survive a server redeploy on the chosen volume. Rooms themselves are intentionally in memory and do not survive server restart.
7. Record the demo and capture `/cover` at 1200×630. A phone recording can show the entire game; a wide recording shows the synchronized stage next to the drawing controller.

## Suggested short demo

Open Sketchy → Try it solo → enter a name → draw → submit → see raw sketches become stickers → vote for the odd one out → watch the reveal and Match % verdict → show the imposter round and the result-card download. For multiplayer, host on a laptop, scan the QR on phones, and show synchronized submissions and votes.

## API references checked

- [OpenAI image edits](https://developers.openai.com/api/reference/resources/images/methods/edit): GPT image edit endpoint supports WebP output and `output_compression`. The configured model remains an environment variable.
- [Render persistent disks](https://render.com/docs/disks) and [Blueprint syntax](https://render.com/docs/blueprint-spec): only files under the mounted disk survive redeploys.

No live OpenAI latency, cost, or generated score is claimed by the unkeyed verification run.
