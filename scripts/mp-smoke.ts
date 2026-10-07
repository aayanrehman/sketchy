/**
 * Multiplayer smoke test: a main screen + 4 scripted players play a full 3-round game against a Convex deployment.
 * MODE=sketch (blank drawings, no paid AI) or MODE=prompt (default; real drafts/finals, ~24 paid images on a live deployment).
 * Usage: VITE_CONVEX_URL=... [MODE=sketch] node --import tsx scripts/mp-smoke.ts
 */
import 'dotenv/config';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

const url = process.env.VITE_CONVEX_URL; if (!url) throw new Error('Set VITE_CONVEX_URL');
const c = new ConvexHttpClient(url);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(14, 19), ...a);

const { code, hostToken } = await c.mutation(api.game.createScreen, {});
log('room', code);
const players: { name: string; token: string; id: string }[] = [];
for (const name of ['Ana', 'Ben', 'Cy', 'Dee']) {
  const r = await c.mutation(api.game.join, { code, name });
  if (!r.ok) throw new Error(r.error);
  players.push({ name, token: r.token, id: r.playerId });
}
const act = (token: string | undefined, action: any, host = false) => c.mutation(api.game.act, { code, token, hostToken: host ? hostToken : undefined, action });
const MODE = process.env.MODE === 'sketch' ? 'sketch' : 'prompt';
await act(undefined, { t: 'setMode', mode: MODE }, true);
const start = await act(undefined, { t: 'start' }, true);
if (!start.ok) throw new Error(`start failed: ${start.error}`);

const done = new Set<string>(); let lastPhase = ''; const t0 = Date.now();
while (Date.now() - t0 < 6 * 60_000) {
  for (const p of players) await c.mutation(api.game.heartbeat, { code, token: p.token });
  const views = await Promise.all(players.map((p) => c.query(api.game.state, { code, token: p.token })));
  const room = views[0]!.room; const key = `${room.round}:${room.phase}${room.rounds[room.round - 1]?.revote ? ':re' : ''}`;
  if (key !== lastPhase) {
    lastPhase = key;
    const r = room.rounds[room.round - 1];
    log(`R${room.round} ${room.phase}${r?.revote && room.phase === 'VOTE' ? ' (revote)' : ''}`, r && room.phase === 'UNMASK' ? `caught=${r.caught} reason=${r.escapeReason}` : '', room.phase === 'SCORES' ? room.players.map((p) => `${p.name}:${p.score}`).join(' ') : '');
    const imps = views.filter((v) => v!.me?.isImposter).length;
    if (['PROMPT', 'DRAW'].includes(room.phase) && imps !== 1) throw new Error(`expected 1 imposter, saw ${imps}`);
    if (['PROMPT', 'DRAW', 'DRAFT', 'REFINE', 'VOTE'].includes(room.phase) && views.some((v) => v!.room.rounds[room.round - 1]?.realPrompt)) throw new Error('real prompt leaked before the reveal');
    if (MODE === 'prompt' && ['PROMPT', 'DRAFT', 'REFINE'].includes(room.phase)) {
      const urls = views.map((v) => v!.me?.targetUrl);
      if (urls.filter((u) => u?.includes('-masked')).length !== 1) throw new Error('expected exactly one masked target (the imposter)');
      if (views.some((v) => v!.room.rounds[room.round - 1]?.targetUrl)) throw new Error('target leaked in the public room state');
    }
    if (room.phase === 'VERDICT' && MODE === 'prompt') {
      const r = room.rounds[room.round - 1];
      log('  scores', r.drawings.map((d) => `${room.players.find((p) => p.id === d.playerId)?.name}:${d.draftMatch ?? '-'}→${d.match ?? '-'}`).join(' '), '| hidden:', r.realPrompt, '| modifier:', r.modifier);
    }
  }
  if (room.phase === 'FINAL') { log('FINAL', room.finalAwards.map((a) => a.title).join(', ') || '(no awards)'); break; }
  for (const [i, p] of players.entries()) {
    const v = views[i]!; const k = `${key}:${p.id}`; const rr = v.room.rounds[v.room.round - 1];
    if (done.has(k) || done.has(`${k}:${rr?.revote ? 'revote' : 'vote'}`)) continue;
    const r = v.room.rounds[v.room.round - 1];
    if (room.phase === 'HOW_TO') { await act(p.token, { t: 'howto' }); done.add(k); }
    if (room.phase === 'DRAW') { await act(p.token, { t: 'draw', strokes: [], png: '' }); done.add(k); }
    if (room.phase === 'DRAFT') { const res = await act(p.token, { t: 'draft', text: 'a happy animal outdoors, watercolor' }); if (!res.ok) throw new Error(`draft rejected: ${res.error}`); done.add(k); }
    if (room.phase === 'REFINE') { const res = await act(p.token, { t: 'final', text: 'a cheerful cartoon animal playing outdoors at golden hour, soft watercolor illustration, centered' }); if (!res.ok) throw new Error(`final rejected: ${res.error}`); done.add(k); }
    if (room.phase === 'DISCUSS' && i === 0) { await act(p.token, { t: 'chat', text: `hello from ${p.name}` }); await act(undefined, { t: 'skip' }, true); done.add(k); }
    if (room.phase === 'VOTE') {
      const imp = players[views.findIndex((x) => x!.me?.isImposter)]?.id || players[0].id;
      const inn = players.filter((x) => x.id !== imp).map((x) => x.id);
      let target: string;
      if (room.round === 1 && !r?.revote) {
        // Force a 2-2 tie that includes the imposter: imposter + inn[1] -> inn[0]; inn[0] + inn[2] -> imposter.
        target = p.id === imp || p.id === inn[1] ? inn[0] : imp;
      } else if (r?.revote) {
        if (!r.revote.includes(imp)) throw new Error('revote must include the imposter');
        target = p.id === imp ? r.revote.find((x) => x !== imp)! : imp;
      } else {
        // Everyone piles onto one innocent (no tie).
        target = p.id === inn[0] ? inn[1] : inn[0];
      }
      await act(p.token, { t: 'vote', targetId: target }); done.add(`${k}:${r?.revote ? 'revote' : 'vote'}`);
    }
    if (room.phase === 'STEAL' && v.me?.playerId === r?.imposterId && r) { await act(p.token, { t: 'steal', option: r.stealOptions[0] }); done.add(k); }
    if (room.phase === 'VERDICT') { await act(p.token, { t: 'verdictReady' }); done.add(k); }
  }
  await sleep(700);
}
if (!lastPhase.endsWith('FINAL')) throw new Error(`stuck at ${lastPhase}`);
log(`full game OK in ${Math.round((Date.now() - t0) / 1000)} s`);
