/**
 * The social layer, no login: challenges (beat one recorded attempt) and crews (friends by device id).
 * Attempts are written by game.ts when a final score lands; this file only reads them and manages crews.
 */
import { v } from 'convex/values';
import { mutation, query, type QueryCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';

const CREW_MAX = 30;
const randomCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const pub = (a: Doc<'attempts'>) => ({ id: a._id, name: a.name, score: a.score, targetId: a.targetId, prompt: a.prompt, imageUrl: a.imageUrl, day: a.day, kind: a.kind, breakdown: a.breakdown, at: a._creationTime });

/** One attempt, for the challenge entry page and the duel result. */
export const attempt = query({
  args: { id: v.id('attempts') },
  handler: async (ctx, { id }) => { const a = await ctx.db.get('attempts', id); return a ? pub(a) : null; },
});

/** The attempt recorded for a seat in a game (to build its challenge link). Latest round first. */
export const attemptFor = query({
  args: { code: v.string(), gameId: v.string(), playerId: v.string() },
  handler: async (ctx, { code, gameId, playerId }) => {
    const rows = await ctx.db.query('attempts').withIndex('by_code_and_gameId_and_playerId', (q) => q.eq('code', code).eq('gameId', gameId).eq('playerId', playerId)).order('desc').take(5);
    const best = rows.sort((a, b) => b.score - a.score)[0];
    return best ? pub(best) : null;
  },
});

/** Top attempts on one target (any day), for "who else beat this picture". */
export const leaders = query({
  args: { targetId: v.string() },
  handler: async (ctx, { targetId }) => {
    const rows = await ctx.db.query('attempts').withIndex('by_targetId_and_score', (q) => q.eq('targetId', targetId)).order('desc').take(10);
    return rows.map((a) => ({ name: a.name, score: a.score, day: a.day }));
  },
});

async function crewByCode(ctx: QueryCtx, code: string) {
  return await ctx.db.query('crews').withIndex('by_code', (q) => q.eq('code', code.toUpperCase())).unique();
}
const clean = (s: string) => s.trim().slice(0, 12) || 'Player';

/** Start a crew (the caller is its first member). Returns the code to share. */
export const createCrew = mutation({
  args: { deviceId: v.string(), name: v.string(), crewName: v.optional(v.string()) },
  handler: async (ctx, { deviceId, name, crewName }) => {
    let code = randomCode();
    for (let i = 0; i < 20 && (await crewByCode(ctx, code)); i++) code = randomCode();
    await ctx.db.insert('crews', { code, name: (crewName || `${clean(name)}’s crew`).slice(0, 24), members: [{ deviceId: deviceId.slice(0, 40), name: clean(name), joinedAt: Date.now() }] });
    return { code };
  },
});

/** Join by code (from an invite link). Rejoining just refreshes the name. */
export const joinCrew = mutation({
  args: { code: v.string(), deviceId: v.string(), name: v.string() },
  handler: async (ctx, { code, deviceId, name }) => {
    const crew = await crewByCode(ctx, code);
    if (!crew) return { ok: false as const, error: 'No crew with that code.' };
    const id = deviceId.slice(0, 40);
    const members = crew.members.filter((m) => m.deviceId !== id);
    if (members.length >= CREW_MAX) return { ok: false as const, error: 'This crew is full.' };
    const mine = crew.members.find((m) => m.deviceId === id);
    await ctx.db.patch('crews', crew._id, { members: [...members, { deviceId: id, name: clean(name), joinedAt: mine?.joinedAt ?? Date.now() }] });
    return { ok: true as const, code: crew.code, name: crew.name };
  },
});

/** After a party game: one tap keeps everyone in the room as a crew. Every seat with a device id joins. */
export const crewFromRoom = mutation({
  args: { code: v.string(), token: v.optional(v.string()), hostToken: v.optional(v.string()) },
  handler: async (ctx, { code, token, hostToken }) => {
    const room = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', code.toUpperCase())).unique();
    if (!room) return { ok: false as const, error: 'This room has ended.' };
    const state = room.state as { hostToken: string; hostId: string | null; crewCode?: string; seats: { player: { id: string; name: string; isBot: boolean }; token: string; deviceId?: string }[] };
    const seat = token ? state.seats.find((s) => s.token === token) : null;
    const isHost = (!!hostToken && hostToken === state.hostToken) || (!!seat && seat.player.id === state.hostId);
    if (!isHost) return { ok: false as const, error: 'Only the host can do that.' };
    if (state.crewCode) return { ok: true as const, code: state.crewCode };
    const members = state.seats.filter((s) => s.deviceId && !s.player.isBot).map((s) => ({ deviceId: s.deviceId!, name: clean(s.player.name), joinedAt: Date.now() }));
    if (members.length < 2) return { ok: false as const, error: 'Need at least two players on their own devices.' };
    let crewCode = randomCode();
    for (let i = 0; i < 20 && (await crewByCode(ctx, crewCode)); i++) crewCode = randomCode();
    await ctx.db.insert('crews', { code: crewCode, name: `Room ${room.code} crew`, members: members.slice(0, CREW_MAX) });
    await ctx.db.patch('rooms', room._id, { state: { ...state, crewCode } });
    return { ok: true as const, code: crewCode };
  },
});

/** The crew board. `days` are the UTC day keys to total (the client passes the last 7, newest first). */
export const crewBoard = query({
  args: { code: v.string(), days: v.array(v.string()) },
  handler: async (ctx, { code, days }) => {
    const crew = await crewByCode(ctx, code);
    if (!crew) return null;
    const keys = days.slice(0, 7);
    const members = await Promise.all(crew.members.map(async (m) => {
      const byDay = await Promise.all(keys.map((day) => ctx.db.query('attempts').withIndex('by_deviceId_and_day', (q) => q.eq('deviceId', m.deviceId).eq('day', day)).filter((q) => q.eq(q.field('counts'), true)).first()));
      const scores = byDay.map((a) => a?.score ?? null);
      // Streak: consecutive counted days starting today (or yesterday, which still keeps it alive).
      let streak = 0; for (let i = scores[0] === null ? 1 : 0; i < scores.length && scores[i] !== null; i++) streak++;
      return { deviceId: m.deviceId, name: m.name, today: scores[0], week: scores.reduce<number>((n, x) => n + (x ?? 0), 0), played: scores.filter((x) => x !== null).length, streak };
    }));
    members.sort((a, b) => b.week - a.week || (b.today ?? -1) - (a.today ?? -1));
    return { code: crew.code, name: crew.name, members };
  },
});
