import { AwardArt } from '@/design/components/Illustrations';
import { go } from '@/nav';
import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Avatar, Button, Card, Confetti } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { dur, durRM, ease, stagger } from '@/design/motion';
import { useSfx } from '@/sound/useSfx';
import { useToast } from '@/design/components/Toast';
import { recordGame, levelTitle, level, levelProgress, load } from '@/progression/store';
import { buildShareCard, downloadDataUrl } from '@/share/card';
import { send, type MomentProps } from './common';
import './polish.css';

/** FINAL: podium rises for the top 3 with fanfare and confetti, awards, share card, Play again. */
export function FinalMoment({ view, phone }: MomentProps & { phone?: boolean }) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const toast = useToast();
  const room = view.room!; const me = view.me;
  const ranked = useMemo(() => [...room.players].sort((a, b) => b.score - a.score), [room.players]);
  const top = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
  const [confetti, setConfetti] = useState(0);
  const [xp, setXp] = useState<{ before: number; after: number; up: boolean } | null>(null);
  const D = rm ? durRM : dur;

  useEffect(() => {
    sfx.play('fanfare'); setTimeout(() => setConfetti((n) => n + 1), rm ? 100 : 700);
    if (me) {
      const p = view.byId.get(me.playerId); if (!p) return;
      const rank = 1 + ranked.filter(x => x.score > p.score).length;
      const mine = room.rounds.flatMap((r) => r.drawings.filter((d) => d.playerId === me.playerId).map((d) => ({ d, r })));
      const before = load().xp;
      const res = recordGame({
        score: p.score, rank, gameKey: `${room.code}-${room.gameId}`,
        bestMatch: Math.max(0, ...mine.map(({ d }) => (typeof d.match === 'number' ? d.match : 0))),
        bestStreak: room.rounds.reduce((a, r) => { const run = r.votes[me.playerId] === r.imposterId ? a.run + 1 : 0; return { run, best: Math.max(a.best, run) }; }, { run: 0, best: 0 }).best,
        escapes: room.rounds.filter((r) => r.imposterId === me.playerId && !r.caught).length,
        gallery: mine.filter(({ d }) => d.glowStatus === 'done' && d.glowUrl && !d.glowMock).map(({ d, r }) => ({ url: d.glowUrl!, golden: d.golden, prompt: r.realPrompt, at: Date.now() })),
      });
      if (res && 'leveledUp' in res) { setXp({ before, after: res.xp, up: !!res.leveledUp }); if (res.leveledUp) toast.push({ kind: 'golden', text: `Level up! You are now a ${levelTitle(res.xp)}`, icon: '⬆️' }); }
    }
    // eslint-disable-next-line
  }, []);

  // Highlight reel: best AI redraws across all rounds, top match first.
  const reel = useMemo(() => {
    const all = room.rounds.flatMap((r) => r.drawings.filter((d) => d.glowStatus === 'done' && d.glowUrl && !d.blank).map((d) => ({ d, r })));
    all.sort((a, b) => (b.d.match ?? -1) - (a.d.match ?? -1));
    const picks = all.slice(0, 8);
    const tags = new Map<typeof picks[number], string>();
    if (picks[0] && (picks[0].d.match ?? -1) >= 0) tags.set(picks[0], 'Best drawing');
    const disguiser = room.finalAwards.find((a) => a.title === 'Best Disguise')?.playerId;
    const disguise = disguiser && all.filter(({ d, r }) => d.playerId === disguiser && r.imposterId === disguiser)[0];
    if (disguise) { if (!picks.includes(disguise)) picks[Math.min(picks.length, 7)] = disguise; tags.set(disguise, 'Best disguise'); }
    return picks.map((x) => ({ ...x, tag: tags.get(x) }));
  }, [room.rounds, room.finalAwards]);

  const share = async () => {
    const r = room.rounds[room.rounds.length - 1]; if (!r) return;
    try {
      const url = await buildShareCard({ drawings: r.drawings, players: view.byId, imposterId: r.imposterId, prompt: r.realPrompt, url: location.host, mode: room.isDemo ? 'demo' : !['openai', 'fal'].includes(room.aiMode) ? 'preview' : undefined });
      downloadDataUrl(url, `sketchy-${room.code}.png`);
    } catch { toast.push({ kind: 'info', text: 'Could not save the card. Please try again.' }); }
  };

  return (
    <div className="phase" style={{ justifyItems: 'center' }}>
      <Confetti burst={confetti} />
      <Rise><h1 className="display-lg phase__title gold-text">{ranked.filter(p => p.score === ranked[0]?.score).length > 1 ? 'A shared victory!' : `${ranked[0]?.name} wins!`}</h1></Rise>
      <div className="podium">
        {top.map((p) => { const place = 1 + ranked.filter(x => x.score > p.score).length; return (
          <div key={p.id} className="podium__col">
            <motion.div initial={{ opacity: 0, y: rm ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + (3 - place) * stagger.lg * 2, duration: D.base, ease: ease.bounce }}>
              <Avatar player={p} size={place === 1 ? 'lg' : 'md'} showScore layoutPrefix="podium" />
            </motion.div>
            <motion.div className={`podium__block podium__block--${place}`} initial={{ scaleY: rm ? 1 : 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.2 + (3 - place) * stagger.lg * 2, duration: D.dramatic, ease: ease.bounce }}>{place}</motion.div>
          </div>
        ); })}
      </div>
      {room.finalAwards.length > 0 && (
        <Rise className="awards">
          {room.finalAwards.map((a, i) => { const p = view.byId.get(a.playerId); return (
            <motion.div key={a.title} className="award" initial={{ opacity: 0, x: rm ? 0 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 + i * stagger.lg, duration: D.base, ease: ease.smooth }}>
              <AwardArt kind={a.title === 'Best Disguise' ? 'mask' : a.title === "Judge's Pet" ? 'cup' : 'oops'} />
              <div><div className="award__title">{a.title}: {p?.name}</div><div className="award__detail">{a.detail}</div></div>
            </motion.div>
          ); })}
        </Rise>
      )}
      {reel.length > 0 && (
        <Rise className="reel">
          <h2 className="display-sm">Highlight reel</h2>
          <div className="reel__strip">
            {reel.map(({ d, r, tag }) => (
              <figure key={`${r.index}-${d.playerId}`} className="reel__item">
                {tag && <span className={`chip reel__tag ${tag === 'Best disguise' ? 'chip--red' : 'chip--gold'}`}>{tag}</span>}
                <img src={d.glowUrl} alt={`${view.byId.get(d.playerId)?.name ?? 'Player'}'s drawing of ${r.realPrompt}`} loading="lazy" />
                <figcaption><div className="reel__name">{view.byId.get(d.playerId)?.name ?? 'Player'}</div><div className="reel__prompt">{r.realPrompt}</div></figcaption>
              </figure>
            ))}
          </div>
        </Rise>
      )}
      <Rise style={{ width: '100%', maxWidth: 520 }}><ol className="final-ranks" aria-label="Final rankings">
        {ranked.map(p => <li key={p.id}><span>#{1 + ranked.filter(x => x.score > p.score).length} {p.name}</span><b>{p.score} points</b></li>)}
      </ol></Rise>
      {xp && (
        <Rise style={{ width: '100%', maxWidth: 420 }}><Card variant="cyan">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div><div className="display-sm">+{xp.after - xp.before} XP</div><div className="mute" style={{ fontSize: 12, fontWeight: 900 }}>Level {level(xp.after)} · {levelTitle(xp.after)}</div></div>
            <div className="level-bar" style={{ width: 120 }}><i style={{ transform: `scaleX(${levelProgress(xp.after)})`, transition: `transform ${D.dramatic}s` }} /></div>
          </div>
        </Card></Rise>
      )}
      <Rise style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button variant="gold" size="lg" onClick={share}>Download share card</Button>
        {view.canHost && !room.isDemo && <Button variant="primary" size="lg" onClick={() => send().emit('host:playAgain')}>Play again</Button>}
        {room.isDemo && <Button variant="lime" onClick={() => { send().emit('host:playAgain'); send().emit('host:start'); }}>Try both roles again</Button>}
        {room.isDemo && <Button variant="primary" size="lg" onClick={() => { go('/'); }}>Host a real game</Button>}
        {phone && !me?.isHost && !room.isDemo && <p className="phase__sub">Waiting for the host to play again…</p>}
      </Rise>
    </div>
  );
}
