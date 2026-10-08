/** Dev helper: plays a solo demo to the final screen and prints {code, token} to resume it in the browser. */
import 'dotenv/config';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
const c = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);
const { code, token } = await c.mutation(api.game.createDemo, { name: 'Tester' });
const act = (action: any) => c.mutation(api.game.act, { code, token, action });
const done = new Set<string>();
for (let t = 0; t < 600; t++) {
  await c.mutation(api.game.heartbeat, { code, token });
  const s = (await c.query(api.game.state, { code, token }))!;
  const k = `${s.room.round}:${s.room.phase}`;
  if (s.room.phase === 'FINAL') break;
  if (!done.has(k)) {
    done.add(k);
    const r = s.room.rounds[s.room.round - 1];
    if (s.room.phase === 'HOW_TO') await act({ t: 'howto' });
    if (s.room.phase === 'DRAFT') await act({ t: 'draft', text: s.room.round === 1 ? 'frog with drums on lily pad' : 'orange kitty spinning music decks' });
    if (s.room.phase === 'REFINE') await act({ t: 'final', text: s.room.round === 1 ? 'cheerful green frog playing a bright red drum kit on a giant lily pad at sunset, soft watercolor' : 'chubby orange kitty with purple ear muffs spinning glowing music decks, pastel sticker art, thick outlines' });
    if (s.room.phase === 'DISCUSS') await act({ t: 'skip' });
    if (s.room.phase === 'VOTE') { const target = r.participantIds.find((id) => id !== s.me!.playerId)!; await act({ t: 'vote', targetId: target }); }
    if (s.room.phase === 'STEAL' && r.imposterId === s.me!.playerId) await act({ t: 'steal', option: r.stealOptions[0] });
    if (s.room.phase === 'VERDICT') await act({ t: 'verdictReady' });
  }
  await new Promise((res) => setTimeout(res, 1000));
}
console.log(JSON.stringify({ code, token }));
