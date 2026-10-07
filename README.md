# Sketchy

**One of you is drawing something different. The AI knows who.**

A drawing imposter party game for 4 to 8 players with an AI judge. Everyone draws the same secret prompt except one imposter, who draws a close-but-different one. The AI turns every sketch into art, the group votes on the imposter, and then the AI judge reveals how well each drawing matched the real prompt.

Built from the [Sketchy PRD & Build Kit](https://claude.ai/artifact/U5pVMUth1WjgvvbC5LvtM9). Gameplay, phases, timers, scoring and prompt pairs follow the PRD exactly. The visual and motion system is documented in [DESIGN.md](DESIGN.md); PRD feasibility notes, open interpretations and the challenge scorecard are in [docs/PRD-NOTES.md](docs/PRD-NOTES.md).

## Run it

```bash
npm install
cp .env.example .env        # add OPENAI_API_KEY to use the real AI; leave empty for mock mode
npm run dev                 # server on :3000, Vite client on :5173 (proxies sockets and /api)
```

Open http://localhost:5173 and:

- **Host a game** opens the main screen (`/host`) with a 4-letter room code.
- **Join a game** on each phone at `/play` with the code. Four players are needed to start. The first player to join is the host and sees the Start button; the main screen can also start.
- **Try it solo** (`/demo`) plays two rounds against three bots in one tab, once as an artist and once as the imposter. On a wide screen the main-screen stage sits beside the phone view.
- `/studio` is the hidden tool for recording bot sketches with their real glow-ups and judge scores.
- `/cover` renders a 1200×630 composition to screenshot for the submission's cover image.

To test with phones on your network, Vite listens on all interfaces: use `http://<your-ip>:5173/play`.

Production build (one process serves everything):

```bash
npm run build
npm start                   # http://localhost:3000
```

Other scripts: `npm run typecheck`, `npm test` (vote resolution and scoring table).

### Solo testing without 4 phones

In dev, after joining a room from one phone, fill it with bots:

```
http://localhost:3000/api/debug/bots?code=ABCD
```

### Forcing every AI fallback

Set `AI_FORCE_FAIL` in `.env` to any of `glow,judge,safety` for the whole server, or per room in dev:

```
http://localhost:3000/api/debug/force?code=ABCD&kinds=glow        # "The AI was speechless." gold frame
http://localhost:3000/api/debug/force?code=ABCD&kinds=judge       # Match % shows "??", "My glasses fogged up."
http://localhost:3000/api/debug/force?code=ABCD&kinds=safety      # silent fallback, same as a refusal
http://localhost:3000/api/debug/force?code=ABCD&kinds=            # clear
```

The per-room cap (24 glow-ups) is in `shared/types.ts` (`GLOWUP_ROOM_CAP`); lower it to test the cap fallback. A blank drawing always scores 0 with "Bold choice." without calling the AI.

## AI modes

| `AI_MODE` | What happens |
| --- | --- |
| `openai` (default when a key is set) | Glow-up via `POST /v1/images/edits` with the sketch only, never the prompt. Judge via a vision chat model with strict JSON output `{match, sees, roast}`, cached per drawing. 25 s and 15 s timeouts. |
| `mock` (default without a key) | Glow-up echoes the sketch with a sticker treatment and an "AI PREVIEW" tag after 1.5 to 5 s. The judge returns a deterministic pseudo-score. Nothing leaves the server. |
| `off` | Every drawing uses the designed fallback states. |

Keys live only on the server. Set a monthly spending cap in the OpenAI dashboard before launch, and confirm `OPENAI_IMAGE_MODEL` is still the cheapest current model that supports edits.

## Deploy

The server owns timers and pushes state over WebSockets, so it needs a host that runs a long-lived Node process. Vercel serverless functions do not hold WebSocket connections; use Render, Railway or Fly.

**Render (fastest):**

1. Push this repo to GitHub.
2. In Render, *New → Blueprint*, pick the repo. `render.yaml` defines the service.
3. Set `OPENAI_API_KEY` (and optionally `STUDIO_KEY`) in the environment.
4. Deploy. The health check is `/api/health`. Your game URL is the service URL.

**Any Docker host (Railway, Fly, a VPS):**

```bash
docker build -t sketchy .
docker run -p 3000:3000 -e OPENAI_API_KEY=sk-... sketchy
```

Rooms live in memory, so run one instance (or add sticky sessions and a shared store before scaling out).

## Demo content

Demo Mode prefers prompt pairs that have complete studio content (3 real sketches and 1 decoy sketch, each with a real glow-up and score) in `server/data/demo/<pairId>.json`. Until you record them in `/studio`, bots use procedural doodles with preset scores, tagged "AI PREVIEW". Record at least 2 pairs for a real-art demo. `STUDIO_KEY` protects the save endpoints in production.

## Project layout

```
shared/        types, phase lengths, scoring constants, the 24 prompt pairs
server/src/    room.ts (state machine, timers, privacy), ai.ts (glow-up + judge), scoring.ts, demo.ts (bots), index.ts
client/src/
  design/      tokens.css + tokens.ts + motion.ts, and the component library
  shell/       MainShell, PhoneShell, PhaseStage (the one transition system), HowTo
  moments/     one file per phase, each with main-screen and phone variants
  screens/     Landing, Host, Play, Demo, Studio
  sound/       WebAudio sfx + mute
  progression/ XP, levels, gallery, personal bests (localStorage)
  share/       result card PNG
```
