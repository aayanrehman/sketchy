# PRD notes: feasibility, interpretations, and the challenge scorecard

The build follows the PRD's rules, phases, timers, scoring and data as written. This file records the places where the PRD is ambiguous or works against its own goals, what the build does about each, and how the result maps to the four challenge criteria.

## Things in the PRD that make the game less feasible or less fun

1. **Vercel for a timer-driven multiplayer server.** The PRD suggests "a host with server functions, such as Vercel". Serverless functions cannot hold WebSocket connections or run a 50-second phase timer. The build needs one long-lived Node process. `render.yaml` and the `Dockerfile` target Render, Railway, Fly or any VPS. If Vercel is required, the server must move to a separate host and the client can stay on Vercel.

2. **The steal's 4 options include the imposter's own decoy.** The imposter already knows their decoy prompt, so one of the 4 cards is a free elimination and the steal is really a 1-in-3 guess. Kept as written. Recommended PRD change: add a third `stealDecoys` entry and build the 4 options from the real prompt plus 3 decoys the imposter has not seen.

3. **Per-room glow-up cap of 24 with "Play again keeps the room".** An 8-player, 3-round game uses exactly 24 glow-ups, so a rematch in the same room gets zero AI art. Kept as written (cost control). Recommended PRD change: make the cap per game, with a per-room ceiling of 48.

4. **Fixed 30-second Discuss in Demo Mode.** With three bots there is nobody to argue with, and the PRD's "verdict in under 3 minutes" is tight. The build has the bots bicker for 10 seconds via toasts and then uses the host's own skip, which the PRD allows. The solo verdict lands at about 70 seconds from the first tap; a full two-round demo takes about 3.5 minutes.

5. **Perfect Disguise at or above the artists' median is frequent with small groups.** With 3 artists the median is the middle score, so a mediocre decoy drawing often clears it and the imposter earns +100 on top of an escape or a steal. Kept as written. If playtests show imposters winning too often, raise the bar to "above the top third" or require Match % above 50.

6. **Glow-up timeout versus the gallery window.** A sketch submitted at the 50-second buzzer has only the 20-second gallery before Discuss begins, but its glow-up may take up to 25 seconds. The build never blocks: the tile keeps shimmering and morphs whenever the art lands, even during Discuss or Vote. Early submitters' art is always ready.

7. **Who can vote.** The PRD says "tap the one you think is the imposter. You can't vote for yourself" and never says the imposter sits out. The build lets the imposter vote (to frame someone), which makes ties possible and gives the imposter agency during the vote. Their vote can never score. If you prefer a silent imposter, it is a one-line change in `room.vote`.

8. **Judge input is the raw sketch, art is from the sketch only.** Both are kept exactly as written. One consequence: a beautiful glow-up can still score low because the judge never sees it. The verdict screen says "Sees: …" so players understand what was judged.

9. **"Someone joins mid-game spectates, then joins the next round."** Kept as written. Note the room can grow past the imposter rotation's memory: a player who joins in round 3 can never be imposter in that game. Harmless.

10. **Bots that vote for "the drawing least like the others."** Bots cannot compare images. The build approximates: bot artists vote for the imposter about 65% of the time and otherwise at random; a bot imposter frames a random artist. The human can win or lose either round, as the PRD asks.

11. **Prompt count.** The PRD targets 40 pairs by launch and ships 24. The game runs on 24 (no pair repeats inside a game, pairs recycle across games). Add the remaining 16 in `shared/prompts.ts`.

12. **Image model and price.** The PRD's model and price notes will be stale by submission. `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_QUALITY` and `OPENAI_JUDGE_MODEL` are environment variables, and `/api/proof` lists the models the key can reach so you can confirm before a playtest.

## Interpretations that the PRD leaves open

- A tie or an innocent most-voted player both count as the imposter escaping (+200). The innocent gets an INNOCENT stamp; the imposter is named at the verdict.
- Judge's Favorite goes to every artist tied at the top Match %.
- Catch streak: a player's streak increments on each correct vote; the ×1.5 applies from the second consecutive correct vote.
- The host is the first human to join. The main screen can also press Start and Skip, so a TV can run the show when the host's phone is busy.
- Host hand-off waits 5 seconds so a refresh does not lose the host role; imposter-fled waits 8 seconds for the same reason.
- Rooms drop disconnected players from the lobby after 15 seconds; mid-game seats are kept for the room's life so anyone can rejoin.

## Challenge scorecard (Execution, Creativity, Usefulness, Polish; 25% each)

**Execution: fully functional, stable, demo-ready end to end.**
- Live rooms with server-owned timers, early phase ends, rejoin on refresh, host hand-off, imposter-fled, spectators, duplicate names, full room, wrong code, nobody votes. Verified by a socket harness and 8 unit tests.
- Every AI call has a timeout and a designed fallback; the round never waits on the AI. Mock mode means the game runs with no key at all.
- Demo Mode is one tap from the landing page and reaches the live AI verdict in about 70 seconds.
- An error boundary guarantees no white screen; a reload rejoins the same seat.

**Creativity: fresh concept or clever implementation.**
- The AI is a character: it glows up every sketch and delivers a Match % verdict after the vote, so it either confirms the group or exposes an innocent's drawing as the worst in the room.
- The Steal gives a caught imposter a comeback, and Golden frames give a rare pull every player hopes for.

**Usefulness / value: delights its intended audience.**
- Works on any phone, no login, no install; the host's phone can be the main screen so it works over a video call.
- XP, levels, a personal gallery of your AI art, personal bests and unlockable canvas colors bring people back.

**Polish: feels real, edge cases handled, clear guidance.**
- One design system (tokens, motion tokens, components), one phase transition system, shared elements that glide between phases, title cards, stamps, spotlight, flying points, podium and confetti, sound for every moment with mute, haptics, reduced-motion variants, 44 px tap targets, AA contrast.
- 10-second how-to overlay with a "?" to reopen it, a QR code on the main screen, a result card to share, and a cover-image route for the submission.

**What a judge should do:** open the link, tap *Try it solo*, draw for 50 seconds, watch the gallery, vote, see the verdict. Then host a room from a laptop and join from two phones to see the sync.
