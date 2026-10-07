# Sketchy: handoff for the creative pass

> **Creative pass implemented:** illustrated avatars and awards, refined Blotto, phone HUD and scenery composition, local fonts, landing and cover key art, prepared cat/frog demo artwork, compressed URL-based media, protected studio, and persistent Render media storage. Gameplay rules and prompt wording remain unchanged. A second polish pass corrected crowded score/verdict layouts, countdown layering, dialogs, drawing submission at the buzzer, consistent status icons, and reconnect handling.
>
> Verification: typecheck/build and 16 tests pass; two complete browser demos at 390×844 and 1366×820 (the latter with reduced motion) reached Final and downloaded result cards with zero page errors. The entries below describe the original handoff; see `docs/SUBMISSION.md` for current launch checks. **A live API key was unavailable: real OpenAI latency/cost and pipeline-recorded bot art remain to be verified.**

**Repo:** https://github.com/aayanrehman/sketchy (branch `main`)
**Your scope:** visual craft (composition, spacing, illustration, the mascot, the cover), motion refinement, and the AI image-generation pipeline (glow-up quality, demo art, cost and latency).
**Not your scope:** gameplay rules, phases, timers, scoring, prompt pairs. Those come from the PRD and are implemented exactly; see `docs/PRD-NOTES.md` for the places the PRD is ambiguous and what the build chose.

Read in this order: this file, `README.md` (run and deploy), `DESIGN.md` (the design system you must build within), `docs/PRD-NOTES.md` (rules, interpretations, feasibility issues).

## 1. State of the build

A complete, working game. Node + Socket.IO server owns rooms, roles, prompts and timers; Vite + React + framer-motion client renders a main-screen view and a phone view from the same state. Every phase, every edge case in the PRD table, every AI fallback, Demo Mode with bots, a hidden `/studio` for recording demo art, XP and gallery on device, a result card, a `/cover` route for the submission image.

Verified: `npm run typecheck`, `npm test` (8 unit tests on vote resolution and scoring), a socket harness that plays full games through every edge case, and headless Playwright runs of Demo Mode on phone and wide viewports with zero page errors.

Run it:

```bash
npm install && cp .env.example .env && npm run dev     # client :5173, server :3000
npm run build && npm start                              # production, one process on :3000
```

Without `OPENAI_API_KEY` the server runs in **mock mode**: the "glow-up" is the sketch itself with a CSS sticker filter and an "AI PREVIEW" tag, and the judge returns deterministic pseudo-scores. **The real OpenAI calls have never been exercised in this build.** That is the first thing to do with a key.

## 2. Where things live

```
shared/types.ts            phases, timers, caps, Drawing/Round/Player shapes
shared/prompts.ts          the 24 prompt pairs (PRD content; do not edit wording)
server/src/room.ts         state machine, privacy stripping, early phase ends
server/src/ai.ts           glow-up + judge: endpoints, timeouts, fallbacks, cache   <- image generation lives here
server/src/demo.ts         bots, demo pair selection, procedural placeholder art
server/src/doodle.ts       procedural stick-figure doodles used until /studio content exists
server/data/demo/*.json    studio-recorded bot content (gitignored; create via /studio)
client/src/design/tokens.css        every color, type size, radius, shadow, z-layer, motion token
client/src/design/tokens.ts         JS mirror for canvas work (share card, confetti)
client/src/design/motion.ts         3 durations, 3 easings, staggers, variant presets
client/src/design/components/       Button, Card, Avatar, Timer, DrawingTile, MatchMeter, Toast,
                                    Modal, Stamp, ScoreBurst, Confetti, Scenery, Mascot, SketchCanvas
client/src/shell/                   MainShell (TV), PhoneShell, PhaseStage (the one transition system), HowTo
client/src/moments/                 one file per phase: Lobby, HowToPhase, Prompt, Draw, Gallery (also Discuss/Vote),
                                    Unmask, Steal, Verdict, Scores, Final
client/src/screens/                 Landing, host/HostScreen, play/PlayScreen, Demo, Studio, Cover
client/src/share/card.ts            result card PNG (canvas)
client/src/sound/sfx.ts             WebAudio cues, mute
```

## 3. Flaws you are inheriting

### Visual and spacing (your main job)

1. **Clouds collide with titles.** `Scenery` places 2 to 4 clouds in the upper band at 55% opacity. On phones they still sit behind phase titles ("Round 1 scores", "The judge's verdict") and peek around card corners. Needs a real composition rule: clouds only in zones that never hold text, or a soft sky band behind headers.
2. **The phone header is crowded.** Chip (avatar, name, score) + round label + compact timer + help + mute. At 390 px the round label hides and names clip at ~130 px. Consider moving the timer into the phase body during Draw and Vote, or a two-row HUD like the reference (left pill, right pill).
3. **Emoji avatars and award icons.** Player avatars are emoji (🦊 🐸 🦄 🐙 🐼 🦁 🐧 🐲) and the three final awards use 🎭 🏆 😅. They render differently on every OS and clash with the ink-outline style. Replace with drawn SVG avatars in the mascot's style, 8 of them, plus 3 award badges.
4. **The mascot is a first draft.** One SVG with mood switches (happy, judge, sus, imposter, think, wow). Proportions, the pencil, the beret and glasses all deserve a proper illustration pass. It is cropped by the 72 px how-to boxes.
5. **Procedural bot doodles are stick figures.** `server/src/doodle.ts` draws the same body with random props. They read as placeholders in the gallery. Demo Mode is the judges' first impression, so real recorded sketches with real glow-ups matter most (see section 4).
6. **Spacing is token-correct but not tuned.** Phase screens use `gap: 16px` everywhere; large screens leave empty stage space (lobby, prompt reveal, scores). The 4-column main-screen gallery with 8 players is tight; the verdict list on the TV is a plain stack. The podium avatars overlap the block tops on wide screens.
7. **The cover is assembled from UI components.** `/cover` works but is a layout, not key art. It uses placeholder sketches and the mock sticker look.
8. **Type contrast on pastel buttons** is fine (ink on pastel), but white text on the ink primary button has no outline treatment, so it looks like a different family from the pastel buttons.
9. **Stamp rotation clips** inside small phone tiles (`.stamp--sm`); the stamp was shrunk to fit rather than redesigned.
10. **Share card (`share/card.ts`)** was re-coloured for the new palette but not redrawn; it draws with canvas primitives and does not include the mascot or scenery.
11. **Reduced-motion variants exist for every animation but have not been reviewed visually.** Toggle `prefers-reduced-motion` and check nothing looks broken (static clouds, no bounce, no shake).

### Image generation (your other job)

12. **Never run against OpenAI.** `server/src/ai.ts` posts to `/v1/images/edits` with `OPENAI_IMAGE_MODEL` (default `gpt-image-1-mini`, unverified), `size 1024x1024`, `quality low`, and reads `b64_json`. Verify the model name, the edit endpoint's parameters, and whether a cheaper size or `output_format: webp` with `output_compression` is available. `/api/proof` lists reachable models.
13. **The style instruction is fixed by the PRD** ("Turn this sketch into a vibrant, playful sticker-style illustration. Keep the exact subject, pose and composition. Add no text and no new objects."). You can tune wording for quality, but it must stay identical for every player and must never include the player's prompt. Test that the output preserves the sketch's subject; the imposter must stay unexposed by the art.
14. **Images are stored as base64 data URLs in server memory** and pushed inside every state message to every socket. 24 images at 1 to 2 MB each per room is heavy on phones. Store generated images on disk or object storage, serve by URL, and send URLs in state. Compress (webp or jpeg) before serving.
15. **Sketch PNGs are 512×512 with a cream background.** Consider whether a white background or a transparent one gives better edit results, and whether 512 is enough for the edit model.
16. **Timeouts:** glow-up 25 s, judge 15 s. A sketch submitted at the buzzer may still be pending when the gallery's 20 s ends; the tile keeps shimmering and morphs later. Measure real latency and decide whether the gallery minimum (`GALLERY_MIN_MS` in `room.ts`, 7 s) and the reveal stagger (`revealDelay` in `Gallery.tsx`) feel right with real art.
17. **Golden frames** are random at 1 in 15 (`GOLDEN_ODDS`). The gold shine treatment was designed on mock art; check it against real output.
18. **Demo art must be recorded.** Use `/studio`: pick a pair, draw 3 sketches of the real prompt and 1 of the decoy, run the AI, save. Demo Mode prefers pairs with complete content. Record at least 2 pairs; 6 is the PRD target. The files land in `server/data/demo/` which is gitignored, so decide where they live for deploys (commit them, or bake them into the image).
19. **Cost controls are in place but unmeasured:** per-room cap of 24 glow-ups (`GLOWUP_ROOM_CAP`), judge cache by sketch hash, demo bots never call the API. Set the OpenAI monthly cap before any playtest.
20. **Safety refusals fall back silently** (any non-2xx is a fallback). Log the reason in dev so you can see refusal rates on real sketches.

## 4. Guardrails that still apply

- Only `transform` and `opacity` animate. No layout-thrashing animations. Target a low-end Android phone.
- Every animation has a calm version under `prefers-reduced-motion` (see `tokens(reduced)` in `motion.ts`).
- No animation blocks input or delays a server timer; the server sets `phaseEndsAt` and the client only counts down.
- Phone-first, portrait, 44 px tap targets, WCAG AA contrast.
- New colors, durations, easings and spacing go in `tokens.css` / `motion.ts`, never inline. New visuals are components in `design/components/`.
- Every AI fallback keeps its own designed state ("The AI was speechless." gold frame; "??" fog meter; blank = "Bold choice.").
- The imposter's identity and the judge's scores are stripped server-side until Unmask and Verdict. Do not add client code that could leak them (for example, do not request judge data earlier for a "preview").

## 5. How to check your work

```bash
npm run typecheck && npm test && npm run build
AI_FORCE_FAIL=glow,judge npm start        # every fallback state at once
http://localhost:3000/api/debug/bots?code=ABCD     # fill a dev room with 3 bots after joining from one phone
http://localhost:3000/api/debug/force?code=ABCD&kinds=glow   # per-room fallback forcing (dev only)
```

Playwright harnesses from the original build are not in the repo; a quick way to see every phase is `/demo` with the browser at 390×844 and again at 1366×820 (the split stage-plus-phone view).

Done means: real art appears in the gallery within 20 s on a normal connection, Demo Mode shows recorded art, every phase looks composed on a 5-inch phone and on a TV, and the cover is key art rather than a layout.
