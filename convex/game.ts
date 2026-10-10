/**
 * Convex API for Sketchy. Every public mutation: load the room, run one Engine method, then
 * carry out the engine's effects (timers, AI jobs, sketch writes) and save. Queries return the
 * per-viewer sanitized state; secrets (prompts, imposter, scores) are stripped by Engine.build.
 */
import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { Engine, newState, randomCode, ROOM_IDLE_MS, type AiMode, type EngineState, type TimerAction } from './engine';

const LIVE = process.env.LIVE_AI_ENABLED === 'true';
const requested = process.env.AI_MODE || 'mock';
export const AI_MODE: AiMode = requested === 'openai' || requested === 'fal' ? (LIVE ? requested : 'off') : requested === 'off' ? 'off' : 'mock';
const DAILY_LIMIT = Number(process.env.AI_DAILY_JOB_LIMIT || 48);
/** No heartbeat for this long marks a player as away. */
const AWAY_MS = 15_000;

const strokeV = v.object({ color: v.string(), size: v.number(), points: v.array(v.object({ x: v.number(), y: v.number() })) });

async function roomByCode(ctx: QueryCtx, code: string) {
  return await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', code.toUpperCase())).unique();
}
function engineFor(room: Doc<'rooms'>) { return new Engine(room.state as EngineState, AI_MODE); }

/** Reserve one paid AI job from today's shared budget. Mock/off modes are free. */
async function reserve(ctx: MutationCtx, kind: 'image' | 'judge') {
  if (AI_MODE !== 'fal' && AI_MODE !== 'openai') return true;
  const day = new Date().toISOString().slice(0, 10);
  const row = await ctx.db.query('aiBudget').withIndex('by_day', (q) => q.eq('day', day)).unique();
  if ((row?.[kind] || 0) >= DAILY_LIMIT) return false;
  if (row) await ctx.db.patch('aiBudget', row._id, { [kind]: row[kind] + 1 });
  else await ctx.db.insert('aiBudget', { day, image: kind === 'image' ? 1 : 0, judge: kind === 'judge' ? 1 : 0 });
  return true;
}

/** Carry out the engine's effects, then persist its state. Effects can produce more effects (e.g. a budget fallback ends a phase). */
async function commit(ctx: MutationCtx, roomId: Id<'rooms'>, eng: Engine) {
  while (eng.effects.length) {
    const fx = eng.effects.shift()!;
    switch (fx.t) {
      case 'timer':
        await ctx.scheduler.runAfter(fx.ms, internal.game.fire, { roomId, key: fx.key, token: fx.token, action: fx.action });
        break;
      case 'sketch':
        await ctx.db.insert('sketches', { roomId, gameId: eng.s.gameId, round: fx.round, playerId: fx.playerId, strokes: fx.strokes, png: fx.png });
        break;
      case 'glow':
        if (await reserve(ctx, 'image')) await ctx.scheduler.runAfter(0, internal.ai.glow, { roomId, round: fx.round, playerId: fx.playerId, gameId: fx.gameId, mode: AI_MODE });
        else eng.applyGlow(fx.round, fx.playerId, fx.gameId, { status: 'fallback' });
        break;
      case 'judge':
        if (await reserve(ctx, 'judge')) await ctx.scheduler.runAfter(0, internal.ai.judge, { roomId, round: fx.round, playerId: fx.playerId, gameId: fx.gameId, prompt: fx.prompt, mode: AI_MODE });
        else eng.applyJudge(fx.round, fx.playerId, fx.gameId, { status: 'fallback' });
        break;
      case 'gen':
        if (await reserve(ctx, 'image')) await ctx.scheduler.runAfter(0, internal.ai.generate, { roomId, round: fx.round, playerId: fx.playerId, gameId: fx.gameId, pass: fx.pass, prompt: fx.prompt, mode: AI_MODE });
        else eng.applyGen(fx.round, fx.playerId, fx.gameId, fx.pass, { status: 'fallback' });
        break;
      case 'compare':
        if (await reserve(ctx, 'judge')) await ctx.scheduler.runAfter(0, internal.ai.compare, { roomId, round: fx.round, playerId: fx.playerId, gameId: fx.gameId, pass: fx.pass, attemptUrl: fx.attemptUrl, targetPath: fx.targetPath, styleRound: fx.styleRound, mode: AI_MODE });
        else eng.applyCompare(fx.round, fx.playerId, fx.gameId, fx.pass, { status: 'fallback' });
        break;
      case 'attempt': {
        const day = new Date().toISOString().slice(0, 10);
        const s = eng.s;
        const kind = s.daily ? 'daily' as const : s.challenge ? 'challenge' as const : s.isDemo ? 'solo' as const : 'party' as const;
        let counts = kind === 'daily';
        if (counts) {
          const prior = await ctx.db.query('attempts').withIndex('by_deviceId_and_day', (q) => q.eq('deviceId', fx.deviceId).eq('day', day)).filter((q) => q.eq(q.field('counts'), true)).first();
          counts = !prior;
        }
        await ctx.db.insert('attempts', {
          deviceId: fx.deviceId, name: fx.name, targetId: fx.targetId, day, kind, counts, score: fx.score, prompt: fx.prompt, imageUrl: fx.imageUrl, breakdown: fx.breakdown,
          code: s.code, gameId: s.gameId, playerId: fx.playerId, challengeId: s.challenge ? (s.challenge.id as Id<'attempts'>) : undefined,
        });
        break;
      }
      case 'hint':
        // Give the judge a moment to finish rating late submissions before hinting.
        await ctx.scheduler.runAfter(2_500, internal.ai.hint, { roomId, round: fx.round, gameId: fx.gameId, mode: AI_MODE });
        break;
    }
  }
  // JSON round-trip drops `undefined` fields, which Convex documents can't hold.
  const state = JSON.parse(JSON.stringify(eng.s)) as EngineState;
  await ctx.db.patch('rooms', roomId, { state, lastActivity: state.lastActivity });
}

async function createRoom(ctx: MutationCtx, isDemo: boolean) {
  let code = randomCode();
  for (let i = 0; i < 20 && (await roomByCode(ctx, code)); i++) code = randomCode();
  const state = newState(code, isDemo, Date.now());
  const roomId = await ctx.db.insert('rooms', { code, isDemo, state, lastActivity: state.lastActivity });
  return { roomId, eng: new Engine(state, AI_MODE) };
}

async function markSeen(ctx: MutationCtx, roomId: Id<'rooms'>, playerId: string) {
  const row = await ctx.db.query('presence').withIndex('by_roomId_and_playerId', (q) => q.eq('roomId', roomId).eq('playerId', playerId)).unique();
  if (row) await ctx.db.patch('presence', row._id, { lastSeen: Date.now() });
  else await ctx.db.insert('presence', { roomId, playerId, lastSeen: Date.now() });
}

// ---------------- public API ----------------

/** Server clock, so every device can show the same countdown. */
export const now = mutation({ args: {}, handler: async () => Date.now() });

export const health = query({ args: {}, handler: async () => ({ aiMode: AI_MODE }) });

export const createDemo = mutation({
  args: { name: v.string(), daily: v.optional(v.string()), deviceId: v.optional(v.string()), challengeId: v.optional(v.id('attempts')) },
  handler: async (ctx, { name, daily, deviceId, challengeId }) => {
    const { roomId, eng } = await createRoom(ctx, true);
    const seat = eng.addPlayer(name || 'You', false, deviceId?.slice(0, 40));
    if (!('player' in seat)) throw new Error(seat.error);
    const ch = challengeId ? await ctx.db.get('attempts', challengeId) : null;
    const challenge = ch ? { id: ch._id, name: ch.name, score: ch.score, targetId: ch.targetId } : undefined;
    eng.setupDemo(seat.player.id, { daily: daily && /^\d{4}-\d{2}-\d{2}$/.test(daily) ? daily : undefined, challenge });
    eng.start();
    await markSeen(ctx, roomId, seat.player.id);
    await commit(ctx, roomId, eng);
    return { code: eng.s.code, token: seat.token, playerId: seat.player.id };
  },
});

/** A TV / main screen creates a room and gets the host credential. */
export const createScreen = mutation({
  args: {},
  handler: async (ctx) => {
    const { roomId, eng } = await createRoom(ctx, false);
    await commit(ctx, roomId, eng);
    return { code: eng.s.code, hostToken: eng.s.hostToken };
  },
});

export const join = mutation({
  args: { code: v.string(), name: v.string(), token: v.optional(v.string()), hostToken: v.optional(v.string()), deviceId: v.optional(v.string()) },
  handler: async (ctx, { code, name, token, hostToken, deviceId }) => {
    const room = await roomByCode(ctx, code);
    if (!room) return { ok: false as const, error: token ? 'This room has ended. Return home to start a new game.' : 'No room with that code. Check the letters and try again.' };
    const eng = engineFor(room);
    if (hostToken && hostToken !== eng.s.hostToken) return { ok: false as const, error: 'Invalid host credential' };
    let seat = token ? eng.findByToken(token) : null;
    if (token && !seat) return { ok: false as const, error: 'Your seat in this room has expired. Return home to start or join a new game.' };
    if (seat) eng.connect(seat);
    else {
      const res = eng.addPlayer(name, false, deviceId?.slice(0, 40));
      if (!('player' in res)) return { ok: false as const, error: res.error };
      seat = res;
      eng.toast('join', seat.player.spectator ? `${seat.player.name} is watching, joins next round` : `${seat.player.name} joined`, seat.player.id);
    }
    if (hostToken) eng.assignHost(seat.player.id);
    await markSeen(ctx, room._id, seat.player.id);
    await commit(ctx, room._id, eng);
    return { ok: true as const, token: seat.token, playerId: seat.player.id };
  },
});

const actionV = v.union(
  v.object({ t: v.literal('howto') }),
  v.object({ t: v.literal('draw'), strokes: v.array(strokeV), png: v.string() }),
  v.object({ t: v.literal('vote'), targetId: v.string() }),
  v.object({ t: v.literal('steal'), option: v.string() }),
  v.object({ t: v.literal('chat'), text: v.string() }),
  v.object({ t: v.literal('verdictReady') }),
  v.object({ t: v.literal('start') }),
  v.object({ t: v.literal('skip') }),
  v.object({ t: v.literal('playAgain') }),
  v.object({ t: v.literal('assignHost'), playerId: v.string() }),
  v.object({ t: v.literal('leave') }),
  v.object({ t: v.literal('draft'), text: v.string() }),
  v.object({ t: v.literal('final'), text: v.string() }),
  v.object({ t: v.literal('setMode'), mode: v.union(v.literal('prompt'), v.literal('sketch')) }),
  v.object({ t: v.literal('setSettings'), pace: v.optional(v.union(v.literal('quick'), v.literal('classic'))), difficulty: v.optional(v.union(v.literal('easy'), v.literal('normal'), v.literal('hard'))) }),
);

/** Every in-game action. A player acts with their seat token; the main screen acts with the host token. */
export const act = mutation({
  args: { code: v.string(), token: v.optional(v.string()), hostToken: v.optional(v.string()), action: actionV },
  handler: async (ctx, { code, token, hostToken, action: a }) => {
    const room = await roomByCode(ctx, code); if (!room) return { ok: false, error: 'This room has ended.' };
    const eng = engineFor(room);
    const seat = token ? eng.findByToken(token) : null;
    const screenHost = !!hostToken && hostToken === eng.s.hostToken;
    if (!seat && !screenHost) return { ok: false, error: 'Not in this room.' };
    const id = seat?.player.id || null;
    const isHost = screenHost || (!!id && id === eng.s.hostId);
    if (seat) { eng.connect(seat); await markSeen(ctx, room._id, seat.player.id); }
    let error: string | null = null;
    switch (a.t) {
      case 'howto': if (id) eng.howToReady(id); break;
      case 'draw':
        if (a.png.length > 3_000_000 || (a.png && !a.png.startsWith('data:image/png;base64,'))) { error = 'Drawing too large.'; break; }
        if (a.strokes.reduce((n, s) => n + s.points.length, 0) > 20_000) { error = 'Drawing too detailed.'; break; }
        if (id) eng.submitDrawing(id, a.strokes, a.png);
        break;
      case 'vote': if (id) eng.vote(id, a.targetId); break;
      case 'steal': if (id) eng.stealPick(id, a.option); break;
      case 'chat': if (id) eng.sendChat(id, a.text); break;
      case 'verdictReady': if (id) eng.readyVerdict(id); break;
      case 'start': if (isHost) error = eng.start(); break;
      case 'skip': if (isHost) eng.skip(null); break;
      case 'playAgain': if (isHost) eng.playAgain(); break;
      case 'assignHost': if (screenHost) eng.assignHost(a.playerId); break;
      case 'leave': if (id) eng.removePlayer(id); break;
      case 'draft': if (id) error = eng.submitPrompt(id, 'draft', a.text.slice(0, 400)); break;
      case 'final': if (id) error = eng.submitPrompt(id, 'final', a.text.slice(0, 400)); break;
      case 'setMode': if (isHost) eng.setMode(a.mode); break;
      case 'setSettings': if (isHost) eng.setSettings({ ...(a.pace ? { pace: a.pace } : {}), ...(a.difficulty ? { difficulty: a.difficulty } : {}) }); break;
    }
    await commit(ctx, room._id, eng);
    return error ? { ok: false, error } : { ok: true };
  },
});

/** Clients ping every few seconds; anyone silent for AWAY_MS is marked away (which can pass host, or make an imposter flee). */
export const heartbeat = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, { code, token }) => {
    const room = await roomByCode(ctx, code); if (!room) return { ok: false };
    const eng = engineFor(room);
    const seat = eng.findByToken(token); if (!seat) return { ok: false };
    await markSeen(ctx, room._id, seat.player.id);
    let changed = !seat.player.connected;
    if (changed) eng.connect(seat);
    const cutoff = Date.now() - AWAY_MS;
    for (const other of eng.s.seats) {
      if (other.player.isBot || !other.player.connected || other === seat) continue;
      const row = await ctx.db.query('presence').withIndex('by_roomId_and_playerId', (q) => q.eq('roomId', room._id).eq('playerId', other.player.id)).unique();
      if (!row || row.lastSeen < cutoff) { eng.disconnect(other); changed = true; }
    }
    if (changed || eng.effects.length) await commit(ctx, room._id, eng);
    return { ok: true };
  },
});

/** The per-viewer room state. A viewer is a player (token), the main screen (hostToken), or an anonymous watcher. */
export const state = query({
  args: { code: v.string(), token: v.optional(v.string()), hostToken: v.optional(v.string()) },
  handler: async (ctx, { code, token, hostToken }) => {
    const room = await roomByCode(ctx, code); if (!room) return null;
    const eng = engineFor(room);
    const seat = token ? eng.findByToken(token) : null;
    return eng.build(seat, !!hostToken && hostToken === eng.s.hostToken);
  },
});

/** Sketch strokes for one round, only once drawing is over. */
export const sketches = query({
  args: { code: v.string(), round: v.number() },
  handler: async (ctx, { code, round }) => {
    const room = await roomByCode(ctx, code); if (!room) return [];
    const eng = engineFor(room);
    if (!eng.showArt(round)) return [];
    const rows = await ctx.db.query('sketches').withIndex('by_roomId_and_round_and_playerId', (q) => q.eq('roomId', room._id).eq('round', round)).take(16);
    return rows.filter((r) => r.gameId === eng.s.gameId).map((r) => ({ playerId: r.playerId, strokes: r.strokes }));
  },
});

// ---------------- internal ----------------

export const fire = internalMutation({
  args: { roomId: v.id('rooms'), key: v.string(), token: v.string(), action: v.any() },
  handler: async (ctx, { roomId, key, token, action }) => {
    const room = await ctx.db.get('rooms', roomId); if (!room) return;
    const eng = engineFor(room);
    if (!eng.fire(key, token, action as TimerAction)) return;
    await commit(ctx, roomId, eng);
  },
});

export const sketchFor = internalQuery({
  args: { roomId: v.id('rooms'), round: v.number(), playerId: v.string(), gameId: v.string() },
  handler: async (ctx, { roomId, round, playerId, gameId }) => {
    const row = await ctx.db.query('sketches').withIndex('by_roomId_and_round_and_playerId', (q) => q.eq('roomId', roomId).eq('round', round).eq('playerId', playerId))
      .filter((q) => q.eq(q.field('gameId'), gameId)).first();
    return row?.png || null;
  },
});

/** What the hint writer may see: the real prompt and what the judge saw in each drawing (no names). */
export const hintInput = internalQuery({
  args: { roomId: v.id('rooms'), round: v.number(), gameId: v.string() },
  handler: async (ctx, { roomId, round, gameId }) => {
    const room = await ctx.db.get('rooms', roomId); if (!room) return null;
    const s = room.state as EngineState;
    const r = s.rounds[round - 1];
    if (!r || s.gameId !== gameId) return null;
    const sees = r.drawings.filter((d) => !d.blank && d.sees).map((d) => ({ sees: d.sees!, match: d.match ?? -1, imposter: d.playerId === r.imposterId }));
    const drafts = r.mode === 'prompt' ? r.drawings.filter((d) => d.draftPrompt).map((d) => d.draftPrompt!) : [];
    return { realPrompt: r.realPrompt, decoyPrompt: r.decoyPrompt, sees, mode: r.mode || 'sketch', drafts };
  },
});

export const glowDone = internalMutation({
  args: { roomId: v.id('rooms'), round: v.number(), playerId: v.string(), gameId: v.string(), status: v.union(v.literal('done'), v.literal('fallback')), glowUrl: v.optional(v.string()), mock: v.optional(v.boolean()) },
  handler: async (ctx, { roomId, round, playerId, gameId, ...res }) => {
    const room = await ctx.db.get('rooms', roomId); if (!room) return;
    const eng = engineFor(room);
    eng.applyGlow(round, playerId, gameId, res);
    await commit(ctx, roomId, eng);
  },
});

export const judgeDone = internalMutation({
  args: { roomId: v.id('rooms'), round: v.number(), playerId: v.string(), gameId: v.string(), status: v.union(v.literal('done'), v.literal('fallback')), match: v.optional(v.number()), sees: v.optional(v.string()), roast: v.optional(v.string()) },
  handler: async (ctx, { roomId, round, playerId, gameId, ...res }) => {
    const room = await ctx.db.get('rooms', roomId); if (!room) return;
    const eng = engineFor(room);
    eng.applyJudge(round, playerId, gameId, res);
    await commit(ctx, roomId, eng);
  },
});

const breakdownV = v.object({ subject: v.number(), details: v.number(), style: v.number(), color: v.number(), composition: v.number() });
export const genDone = internalMutation({
  args: { roomId: v.id('rooms'), round: v.number(), playerId: v.string(), gameId: v.string(), pass: v.union(v.literal('draft'), v.literal('final')), status: v.union(v.literal('done'), v.literal('fallback')), url: v.optional(v.string()) },
  handler: async (ctx, { roomId, round, playerId, gameId, pass, ...res }) => {
    const room = await ctx.db.get('rooms', roomId); if (!room) return;
    const eng = engineFor(room);
    eng.applyGen(round, playerId, gameId, pass, res);
    await commit(ctx, roomId, eng);
  },
});
export const compareDone = internalMutation({
  args: { roomId: v.id('rooms'), round: v.number(), playerId: v.string(), gameId: v.string(), pass: v.union(v.literal('draft'), v.literal('final')), status: v.union(v.literal('done'), v.literal('fallback')), breakdown: v.optional(breakdownV), missed: v.optional(v.string()), tip: v.optional(v.string()), styleRound: v.optional(v.boolean()) },
  handler: async (ctx, { roomId, round, playerId, gameId, pass, ...res }) => {
    const room = await ctx.db.get('rooms', roomId); if (!room) return;
    const eng = engineFor(room);
    eng.applyCompare(round, playerId, gameId, pass, res);
    await commit(ctx, roomId, eng);
  },
});

export const hintDone = internalMutation({
  args: { roomId: v.id('rooms'), round: v.number(), gameId: v.string(), text: v.string() },
  handler: async (ctx, { roomId, round, gameId, text }) => {
    const room = await ctx.db.get('rooms', roomId); if (!room) return;
    const eng = engineFor(room);
    eng.addHint(round, gameId, text);
    await commit(ctx, roomId, eng);
  },
});

/** Hourly: delete rooms idle for 2 h, with their sketches and presence rows. */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const old = await ctx.db.query('rooms').withIndex('by_lastActivity', (q) => q.lt('lastActivity', Date.now() - ROOM_IDLE_MS)).take(50);
    for (const room of old) {
      for await (const s of ctx.db.query('sketches').withIndex('by_roomId_and_round_and_playerId', (q) => q.eq('roomId', room._id))) await ctx.db.delete('sketches', s._id);
      for await (const p of ctx.db.query('presence').withIndex('by_roomId_and_playerId', (q) => q.eq('roomId', room._id))) await ctx.db.delete('presence', p._id);
      await ctx.db.delete('rooms', room._id);
    }
    if (old.length === 50) await ctx.scheduler.runAfter(0, internal.game.cleanup, {});
  },
});
