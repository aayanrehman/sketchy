# Sketchy design system: "Sticker Park"

## Visual direction

A bright pastel playground drawn with a thick ink pen: a sky-blue backdrop with drifting clouds and rolling hills, chunky white cards with hard offset shadows, rounded display type, and a round yellow mascot who doubles as the AI judge. It is the look of a cute mobile mini-game, not a website.

Why it fits a drawing imposter game:

1. Everything is already a drawing. Ink outlines on every card, button and cloud make the players' sketches feel native to the world instead of pasted onto a UI.
2. The warmth lowers the stakes. Accusing a friend of faking is funnier on a sunny hill with a smiling mascot than in a dark interrogation room, and the IMPOSTER stamp lands harder against pastel.
3. Thick outlines and flat fills survive any screen: a 5-inch phone, a TV across the room, a video-call tile, a thumbnail on the submission page.
4. The mascot gives the AI a face. It wears glasses as the judge, a mask on the imposter's phone, a sweat drop on the vote screen, so the "AI as a character" idea is visible, not just claimed.
5. Nostalgia is a hook. The sticker-book style recalls the handheld games people grew up with, and a game that feels familiar in the first two seconds is one a judge keeps playing.

## Tokens (`client/src/design/tokens.css`, mirrored in `tokens.ts`)

- **Color:** ink `#2B2540` (outlines, primary buttons, text; 12.4:1 on white), surface `#FFFFFF`, surface-2 `#F3F0FF`, text dim `#5A5478` (6.5:1), text mute `#777194` (4.6:1). Sky `#BDE4FF` → `#E3F5FF`, grass `#A9EC84`, hill `#B9F09A`. Stickers: pink `#FF7AB0`, blue `#6CC1FF`, purple `#B48BFF`, yellow `#FFD84D`, lime `#BDF26E`, orange `#FFB15C`. Semantic: red `#FF5C5C` (imposter), green `#3FD37F` (innocent), gold `#FFC83D` (Golden frames, podium), paper `#FFFDF6`. Every pastel fill carries ink text and an ink outline for AA contrast.
- **Outline and shadow:** `--ol: 3px solid ink`; cards get a hard `0 6px 0` shadow; buttons get `0 5px 0 ink` and press down 4 px on tap.
- **Type:** Fredoka 700 for display (`--t-display-xl/lg/md/sm`, fluid clamps), Nunito 700 to 900 for body (18/16/14/12).
- **Spacing:** 4, 8, 12, 16, 24, 32, 48, 64. **Radii:** 10, 16, 24, 32, pill.
- **Z-layers:** base 0, scene 1, tile 10, rail 20, overlay 50, modal 100, stamp 150, toast 200, fx 300.
- **Tap targets:** `--tap: 44px`; buttons are 56px tall by default.

## Motion tokens (`client/src/design/motion.ts`)

- **Durations:** fast 160 ms, base 320 ms, dramatic 900 ms. Reduced motion: 80 / 160 / 300 ms.
- **Easings:** snap `cubic-bezier(0.2, 0, 0, 1)`, bounce `cubic-bezier(0.34, 1.56, 0.64, 1)`, smooth `cubic-bezier(0.4, 0, 0.2, 1)`. Reduced motion swaps bounce for snap.
- **Stagger:** 40 / 80 / 140 ms (0 under reduced motion).
- Only `transform` and `opacity` are animated. Timer bars and meters scale on X; the countdown ring is two rotated half-discs; points fly with translate; confetti is one canvas.

## Components (`client/src/design/components/`)

Button, Card, Avatar (shared element), Timer (clock pill, compact, ring), DrawingTile (shared element, glow-up choreography, golden and fallback states), MatchMeter (spin-up, type-out, fog state), Toast (+provider), Modal, Stamp, ScoreBurst (flying points layer), Confetti, SketchCanvas (vector replay), Scenery (clouds and hills), Mascot (happy, judge, sus, imposter, think, wow).

## The one transition system (`client/src/shell/PhaseStage.tsx`)

Every phase change: the old screen lifts away (fast, snap) → a title card slams in on its own non-blocking layer (bounce) → the new screen rises (base, smooth) with staggered children. Avatars, drawing tiles and the timer carry `layoutId`s inside one `LayoutGroup`, so they glide between phases instead of disappearing. Nothing here waits on a timer: the server sets `phaseEndsAt` and every device counts down from it.

## Signature moments

- **Glow-up:** tile shows the raw sketch with a shimmer sweep while pending; the art scales in from 1.12 and crossfades over the dramatic duration; a Golden pull adds a gold frame, a shine sweep, a chime and a toast. Fallback: gold frame, "The AI was speechless."
- **Unmask (9 s):** drumroll, tiles dim, a spotlight beam hops tile to tile and slows, lands on the most-voted tile, the IMPOSTER / INNOCENT stamp slams with a shake, vote counts pop, then the outcome line. A tie or no votes slams ESCAPED.
- **Steal (10 s):** four cards flip in sequence with a flip tick, a countdown ring, the imposter taps; right is lime with the slot-machine sound and a STOLEN stamp, wrong is red.
- **AI verdict:** the real prompt pops in, meters spin up one by one on the server schedule, the imposter's last and slowest with a longer whir; the judge's "Sees … + roast" types out. Judge fallback: "??" with a fog shimmer and "My glasses fogged up."
- **Scores:** +points chips fly from each tile into the player's avatar (big gold chip for 150+), rows re-rank, streak flames on avatars, streak toast.
- **Final:** fanfare, podium blocks rise with bounce, confetti, awards slide in, XP card, result card download, Play again.
- **Toasts:** joined, left/lost connection, back, host changed, streak, Golden pull, imposter fled, bot banter in demo.

## Sound (`client/src/sound/sfx.ts`)

WebAudio-synthesized cues, no asset files: tick, whoosh, pop, chime, glow, golden, drumroll, stamp, flip, slot, meter, meterSlow, ding, thud, coin, coinBig, streak, fanfare, submit, reveal. Mute toggle in every header, persisted. Haptics on stamp, submit, vote, steal win.
