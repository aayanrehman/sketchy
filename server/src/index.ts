import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server, Socket } from 'socket.io';
import type { ClientToServer, ServerToClient, StateMessage, ToastMessage } from '../../shared/types';
import { Room, ROOM_IDLE_MS, type Seat } from './room';
import { makeRoomCode, uid } from './util';
import { setupDemo, contentStatus, DEMO_DIR } from './demo';
import { glowUp, judge, AI_MODE, setForcedFailures } from './ai';
import { PROMPT_PAIRS } from '../../shared/prompts';
import { MEDIA_DIR, parseSketch, cleanupMedia } from './media';
import { validEvent, RateLimit } from './protocol';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const PROD = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json({ limit: '6mb' }));
app.use('/media', express.static(MEDIA_DIR, { maxAge: '1y', immutable: true, index: false, dotfiles: 'deny' }));
app.use('/demo-art', express.static(path.resolve(__dirname, '../data/demo/art'), { maxAge: '1d', index: false }));
const server = http.createServer(app);
const io = new Server<ClientToServer, ServerToClient>(server, { maxHttpBufferSize: 4e6, cors: PROD ? undefined : { origin: true } });

const rooms = new Map<string, Room>();
const limits = new RateLimit();
const MAX_ROOMS = Number(process.env.MAX_ROOMS || 100);
let shuttingDown = false;

/** Every socket in the room gets its own sanitized view. */
const emit = (code: string, build: (seat: Seat | null) => StateMessage, toast?: ToastMessage) => {
  const room = rooms.get(code); if (!room) return;
  const ids = io.sockets.adapter.rooms.get(code); if (!ids) return;
  for (const sid of ids) {
    const sock = io.sockets.sockets.get(sid); if (!sock) continue;
    const seat = (sock.data as any).seat as Seat | undefined;
    if (toast) sock.emit('toast', toast);
    const state = build(seat && room.seats.get(seat.player.id) === seat ? seat : null);
    state.canHost = !!sock.data.creator || !!state.me?.isHost;
    sock.emit('state', state);
  }
};

function createRoom(isDemo = false): Room {
  const code = makeRoomCode((c) => rooms.has(c));
  const room = new Room(code, emit, isDemo);
  rooms.set(code, room);
  return room;
}

// Rooms expire after 2 hours idle.
setInterval(() => {
  cleanupMedia().catch(() => console.warn('Media cleanup unavailable'));
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > ROOM_IDLE_MS) { room.destroy(); rooms.delete(code); io.in(code).disconnectSockets(); }
  }
}, 60_000).unref();

io.on('connection', (socket: Socket<ClientToServer, ServerToClient>) => {
  const data = socket.data as { seat?: Seat; code?: string; creator?: boolean };
  const ip = socket.handshake.address;
  if (io.engine.clientsCount > 512 || shuttingDown || !limits.allow(`connect:${ip}`, 60, 60000)) { socket.disconnect(true); return; }
  const fail = (message: string, args: any[] = []) => {
    const ack = args.at(-1);
    if (typeof ack === 'function') ack({ ok: false, error: message });
    else socket.emit('error', { message });
  };
  socket.use(([event, ...args], next) => {
    if (!validEvent(event, args)) { fail('Invalid request. Please reload and try again.', args); return; }
    const specific = event === 'draw:submit' ? 4 : event === 'chat:send' ? 10 : 40;
    if (!limits.allow(`events:${socket.id}`, 120, 10000) || !limits.allow(`${event}:${socket.id}`, specific, 10000)) { fail('Too many requests. Wait a few seconds and try again.', args); return; }
    if (['screen:create', 'demo:create'].includes(event) &&
      (rooms.size >= MAX_ROOMS || !limits.allow(`create:${ip}`, 5, 60000))) { fail('Room creation is busy. Try again in a minute.', args); return; }
    if (['join', 'screen:watch'].includes(event) && !limits.allow(`join:${ip}`, 60, 60000)) { fail('Too many join attempts. Try again in a minute.', args); return; }
    next();
  });
  const detach = () => {
    if (data.code) { rooms.get(data.code)?.disconnect(socket.id); socket.leave(data.code); }
    delete data.seat; delete data.code; delete data.creator;
  };

  socket.on('screen:create', (cb) => {
    detach();
    const room = createRoom();
    data.code = room.code; data.creator = true;
    room.screens.add(socket.id);
    socket.join(room.code);
    cb({ ok: true, code: room.code, hostToken: room.hostToken });
    room.broadcast();
  });

  socket.on('screen:watch', ({ code, hostToken }, cb) => {
    const room = rooms.get((code || '').toUpperCase());
    if (!room) return cb({ ok: false, error: 'Room not found' });
    if ((io.sockets.adapter.rooms.get(room.code)?.size || 0) >= 32 && data.code !== room.code) return cb({ ok: false, error: 'Too many connected devices. Close an unused tab and try again.' });
    if (hostToken && hostToken !== room.hostToken) return cb({ ok: false, error: 'Invalid host credential' });
    detach();
    data.code = room.code; data.creator = hostToken === room.hostToken;
    if (data.creator) room.screens.add(socket.id);
    socket.join(room.code);
    cb({ ok: true });
    socket.emit('state', { ...room.build(null), canHost: !!data.creator });
  });

  socket.on('join', ({ code, name, token, hostToken }, cb) => {
    const room = rooms.get((code || '').toUpperCase());
    if (!room) return cb({ ok: false, error: token ? 'This room ended or the server restarted. Return home and create a new room.' : 'No room with that code. Check the letters and try again.' });
    let seat = token ? room.findByToken(token) : null;
    if (token && !seat) return cb({ ok: false, error: 'Your session expired after a server restart or room closure. Return home to start or join a new game.' });
    if ((io.sockets.adapter.rooms.get(room.code)?.size || 0) >= 32 && data.code !== room.code) return cb({ ok: false, error: 'Too many connected devices. Close an unused tab and try again.' });
    if (hostToken && hostToken !== room.hostToken) return cb({ ok: false, error: 'Invalid host credential' });
    let rejoined = false;
    if (seat) {
      detach(); rejoined = room.connect(seat, socket.id);
    } else {
      const res = room.addPlayer(name || '');
      if ('error' in res) return cb({ ok: false, error: res.error });
      detach(); seat = res.seat; room.connect(seat, socket.id);
    }
    data.seat = seat; data.code = room.code;
    if (hostToken === room.hostToken) room.assignHost(seat.player.id);
    socket.join(room.code);
    cb({ ok: true, token: seat.token, playerId: seat.player.id });
    const p = seat.player;
    if (!rejoined && !token) room.broadcast({ id: uid(4), kind: 'join', text: p.spectator ? `${p.name} is watching, joins next round` : `${p.name} joined`, playerId: p.id });
    else room.broadcast(rejoined ? { id: uid(4), kind: 'info', text: `${p.name} is back`, playerId: p.id } : undefined);
  });

  socket.on('demo:create', ({ name }, cb) => {
    detach();
    const room = createRoom(true);
    const res = room.addPlayer(name || 'You');
    if ('error' in res) return cb({ ok: false, error: res.error });
    const seat = res.seat; room.connect(seat, socket.id);
    data.seat = seat; data.code = room.code;
    socket.join(room.code);
    setupDemo(room, seat.player.id);
    cb({ ok: true, code: room.code, token: seat.token, playerId: seat.player.id });
    room.broadcast();
    setTimeout(() => room.start(), 800);
  });

  const withRoom = (fn: (room: Room, seat: Seat | null) => void) => {
    const room = data.code ? rooms.get(data.code) : null;
    if (room) fn(room, data.seat && room.seats.get(data.seat.player.id) === data.seat ? data.seat : null);
  };
  const isHost = (room: Room, seat: Seat | null) => data.creator || (seat && seat.player.id === room.hostId);

  socket.on('host:assign', ({ playerId }) => withRoom((room) => { if (data.creator) room.assignHost(playerId); else fail('Only the room creator can assign a host.'); }));
  socket.on('chat:send', ({ text }) => withRoom((room, seat) => { if (seat) room.sendChat(seat.player.id, text); }));
  socket.on('verdict:ready', () => withRoom((room, seat) => { if (seat) room.readyVerdict(seat.player.id); }));
  socket.on('host:start', () => withRoom((room, seat) => {
    if (!isHost(room, seat)) return fail('Host permission required.');
    const err = room.start();
    if (err) socket.emit('error', { message: err });
  }));
  socket.on('host:skip', () => withRoom((room, seat) => { if (isHost(room, seat)) room.skip(null); }));
  socket.on('host:playAgain', () => withRoom((room, seat) => { if (isHost(room, seat)) room.playAgain(); }));
  socket.on('howto:ready', () => withRoom((room, seat) => { if (seat) room.howToReady(seat.player.id); }));
  socket.on('draw:submit', ({ strokes, png }) => withRoom((room, seat) => {
    if (seat) room.submitDrawing(seat.player.id, strokes, png);
  }));
  socket.on('vote', ({ targetId }) => withRoom((room, seat) => { if (seat) room.vote(seat.player.id, String(targetId)); }));
  socket.on('steal:pick', ({ option }) => withRoom((room, seat) => { if (seat) room.stealPick(seat.player.id, String(option)); }));
  socket.on('leave', () => withRoom((room, seat) => { if (seat) { room.removePlayer(seat.player.id); detach(); room.broadcast({ id: uid(4), kind: 'leave', text: `${seat.player.name} left` }); } }));

  socket.on('disconnect', () => withRoom((room) => {
    const seat = room.disconnect(socket.id);
    if (seat && !seat.player.connected && room.phase !== 'LOBBY') room.broadcast({ id: uid(4), kind: 'leave', text: `${seat.player.name} lost connection`, playerId: seat.player.id });
  }));
});

// ---------- HTTP API ----------
app.get('/api/health', (_req, res) => res.status(shuttingDown ? 503 : 200).json({ ok: !shuttingDown, rooms: rooms.size, aiMode: AI_MODE, sessions: 'memory; restart ends rooms' }));

/** Proof test from the PRD: a server call to an external API with a secret key. */
app.get('/api/proof', async (_req, res) => {
  if (!process.env.STUDIO_KEY || _req.header('x-studio-key') !== process.env.STUDIO_KEY) return res.status(401).json({ ok: false, error: 'Studio authorization required' });
  if (AI_MODE === 'fal') return res.json({ ok: Boolean(process.env.FAL_KEY), provider: 'fal', note: 'Key configured only; use ai:smoke to verify generation.' });
  if (AI_MODE !== 'openai' || !process.env.OPENAI_API_KEY) return res.json({ ok: false, error: 'Live OpenAI is not enabled' });
  try {
    const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(10_000) });
    const j: any = await r.json();
    const models = (j.data || []).map((m: any) => m.id);
    const requested = [process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini', process.env.OPENAI_JUDGE_MODEL || 'gpt-4.1-mini'];
    res.json({ ok: r.ok, status: r.status, configured: requested.map((id) => ({ id, available: models.includes(id) })), models: models.filter((id: string) => /image|gpt-4\.1/.test(id)) });
  } catch (e: any) { res.json({ ok: false, error: String(e?.message || e) }); }
});

if (!PROD && process.env.ENABLE_DEBUG === 'true') {
  /** Force fallbacks per room for testing: /api/debug/force?code=ABCD&kinds=glow,judge,safety */
  app.get('/api/debug/force', (req, res) => {
    const code = String(req.query.code || '').toUpperCase();
    const kinds = String(req.query.kinds || '').split(',').filter(Boolean);
    setForcedFailures(code, kinds);
    res.json({ ok: true, code, kinds });
  });
  /** Fill a room with bots to test solo: /api/debug/bots?code=ABCD&n=3 */
  app.get('/api/debug/bots', (req, res) => {
    const room = rooms.get(String(req.query.code || '').toUpperCase());
    if (!room) return res.status(404).json({ ok: false });
    const n = Number(req.query.n || 3);
    const human = room.players.find((p) => !p.isBot);
    if (!human) return res.status(400).json({ ok: false, error: 'join first' });
    setupDemo(room, human.id);
    room.totalRounds = 3; room.forcedImposters = {}; room.forcedPairs = {};
    room.broadcast();
    res.json({ ok: true, bots: Math.min(n, 3) });
  });
}

// ---------- Studio (hidden tool for making demo content) ----------
const studioGuard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const key = process.env.STUDIO_KEY;
  if (!key) return res.status(503).json({ ok: false, error: 'Studio disabled: configure STUDIO_KEY' });
  if (key && req.header('x-studio-key') !== key) return res.status(401).json({ ok: false, error: 'Bad studio key' });
  next();
};
app.get('/api/studio/content', studioGuard, (_req, res) => res.json({ ok: true, aiMode: AI_MODE, pairs: contentStatus() }));
app.post('/api/studio/generate', studioGuard, async (req, res) => {
  const { png, pairId } = req.body || {};
  const pair = PROMPT_PAIRS.find((p) => p.id === Number(pairId));
  if (!pair || typeof png !== 'string') return res.status(400).json({ ok: false, error: 'pairId and png required' });
  try { parseSketch(png); } catch { return res.status(400).json({ ok: false, error: 'A valid PNG sketch is required' }); }
  const [g, j] = await Promise.all([glowUp(png), judge(png, pair.real, false)]);
  res.json({ ok: true, glow: g, judge: j });
});
app.post('/api/studio/save', studioGuard, (req, res) => {
  const { pairId, slot, drawing } = req.body || {};
  const pair = PROMPT_PAIRS.find((p) => p.id === Number(pairId));
  if (!pair || !['real', 'decoy'].includes(slot) || !drawing?.strokes) return res.status(400).json({ ok: false, error: 'bad payload' });
  fs.mkdirSync(DEMO_DIR, { recursive: true });
  const f = path.join(DEMO_DIR, `${pair.id}.json`);
  const cur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { pairId: pair.id, real: [], decoy: [] };
  const entry = { strokes: drawing.strokes, glowUrl: drawing.glowUrl, golden: !!drawing.golden, match: Number(drawing.match) || 0, sees: String(drawing.sees || ''), roast: String(drawing.roast || '') };
  const max = slot === 'real' ? 3 : 1;
  cur[slot] = [...(cur[slot] || []), entry].slice(-max);
  fs.writeFileSync(f, JSON.stringify(cur));
  res.json({ ok: true, realCount: cur.real.length, decoyCount: cur.decoy.length });
});
app.post('/api/studio/reset', studioGuard, (req, res) => {
  const f = path.join(DEMO_DIR, `${Number(req.body?.pairId)}.json`);
  if (fs.existsSync(f)) fs.unlinkSync(f);
  res.json({ ok: true });
});

// ---------- Static client ----------
const dist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  app.get('/', (_req, res) => res.send('Sketchy server running. Build the client with `npm run build` or run `npm run dev`.'));
}

server.listen(PORT, () => console.log(`Sketchy server on :${PORT} (ai mode: ${AI_MODE})`));

for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  if (shuttingDown) return;
  shuttingDown = true;
  io.emit('error', { message: 'The server is restarting. This room has ended; return home to create a new room.' });
  for (const room of rooms.values()) room.destroy();
  io.close(() => server.close(() => process.exit(0)));
  setTimeout(() => process.exit(0), 5000).unref();
});

export { server, io, rooms };
