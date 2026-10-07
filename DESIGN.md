# Sketchy design system: "Neon Stage"

## Visual direction

A dark TV-studio stage lit by neon. Every phase is a segment of one continuous game show: a title card slams in, the set rises up, the cast strip stays on screen, and the big moments get stamps, spotlights and confetti.

Why it fits a drawing imposter game:

1. The stage is dark so the only bright things are the drawings. Cream paper tiles pop like lit canvases, which makes the gallery the star of every round.
2. A game show has a host voice and a verdict. Neon stamps, a spotlight sweep and the judge's typed-out roast give the AI a persona rather than a loading spinner.
3. Suspense needs contrast. One red stamp (IMPOSTER) against cyan and magenta reads instantly from across a room or in a tiny video-call tile.
4. Neon reads at thumbnail size. The cover image, the result card and the phone header all survive being small.
5. Rare pulls need a rare color. Gold is reserved for Golden frames, the podium and awards, so a Golden glow-up feels like an event.

## Tokens (`client/src/design/tokens.css`, mirrored in `tokens.ts`)

- **Color:** ink `#0B0A1F`, surface `#1E1B4B`, text `#FFFFFF` / dim `#C9C5F0` / mute `#9A95D6` (all ≥ 5.6:1 on ink). Neon: magenta `#FF3D8A`, cyan `#22E4FF`, lime `#C6FF3D`, violet `#8B5CF6`, gold `#FFC83D`. Semantic: red `#FF4D4D` (imposter), green `#3DFF9C` (innocent), paper `#FFF9EF`. Buttons put ink text on neon fills for AA contrast.
- **Gradients:** stage (spotlight radial), neon (magenta → violet → cyan), gold, shine sweep, spot.
- **Type:** Bungee for display (`--t-display-xl/lg/md/sm`, fluid clamps), Nunito for body (18/16/14/12).
- **Spacing:** 4, 8, 12, 16, 24, 32, 48, 64. **Radii:** 8, 14, 22, 32, pill. **Shadows:** card, pop, and neon glows (magenta, cyan, gold, red, green).
- **Z-layers:** base 0, tile 10, rail 20, overlay 50, modal 100, stamp 150, toast 200, fx 300.
- **Tap targets:** `--tap: 44px`; buttons are 52px tall by default.

## Motion tokens (`client/src/design/motion.ts`)

- **Durations:** fast 160 ms, base 320 ms, dramatic 900 ms. Reduced motion: 80 / 160 / 300 ms.
- **Easings:** snap `cubic-bezier(0.2, 0, 0, 1)`, bounce `cubic-bezier(0.34, 1.56, 0.64, 1)`, smooth `cubic-bezier(0.4, 0, 0.2, 1)`. Reduced motion swaps bounce for snap.
- **Stagger:** 40 / 80 / 140 ms (0 under reduced motion).
- Only `transform` and `opacity` are animated. Timer bars and meters scale on X; the countdown ring is two rotated half-discs; points fly with translate; confetti is one canvas.

## Components (`client/src/design/components/`)

Button, Card, Avatar (shared element), Timer (pill, compact, ring), DrawingTile (shared element, glow-up choreography, golden and fallback states), MatchMeter (spin-up, type-out, fog state), Toast (+provider), Modal, Stamp, ScoreBurst (flying points layer), Confetti, SketchCanvas (vector replay).

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
