import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DrawingTile, Stamp } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { ease, dur, durRM } from '@/design/motion';
import { useSfx } from '@/sound/useSfx';
import { galleryCols, phaseElapsed, type MomentProps } from './common';

/**
 * UNMASK choreography (9 s, synced to the server clock):
 *  0.0s drumroll; tiles dim. 0.3-3.3s spotlight beam sweeps tile to tile, slowing, lands on the most-voted.
 *  3.5s stamp slams: IMPOSTER! / INNOCENT! (or ESCAPED! on a tie / no votes). Vote counts pop on tiles.
 *  5.0s outcome line: caught -> "One chance to steal…", escaped -> "+200 to the imposter".
 */
export function UnmaskMoment({ view, phone }: MomentProps & { phone?: boolean }) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const room = view.room!; const r = view.round!;
  const tiles = r.drawings;
  const [step, setStep] = useState<'roll' | 'landed' | 'stamped' | 'outcome'>('roll');
  const [spot, setSpot] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [beam, setBeam] = useState<{ xs: number[]; ys: number[] } | null>(null);
  const counts = new Map<string, number>();
  for (const t of Object.values(r.votes)) counts.set(t, (counts.get(t) || 0) + 1);
  const target = r.revealedId;
  const D = rm ? durRM : dur;

  useEffect(() => {
    const el = phaseElapsed(view);
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => { const d = ms - el; if (d <= 0) fn(); else timers.push(window.setTimeout(fn, d)); };
    if (el < 300) sfx.play('drumroll');
    // Sweep: 14 hops, slowing down, final hop lands on target (or stays sweeping if escaped by tie).
    const order = tiles.map((d) => d.playerId);
    const hops = rm ? 4 : 14; let t = 300;
    const ends = target ? order.indexOf(target) : -1;
    for (let i = 0; i < hops; i++) {
      const idx = i === hops - 1 && ends >= 0 ? ends : i % order.length;
      at(t, () => { setSpot(order[idx]); if (!rm) sfx.play('tick'); });
      t += 120 + i * 18;
    }
    if (!rm && wrap.current) {
      const base = wrap.current.getBoundingClientRect();
      const xs: number[] = [], ys: number[] = [];
      for (let i = 0; i < hops; i++) {
        const idx = i === hops - 1 && ends >= 0 ? ends : i % order.length;
        const el2 = wrap.current.querySelector(`[data-tile="${order[idx]}"]`);
        if (!el2) continue;
        const b = el2.getBoundingClientRect();
        xs.push(b.left - base.left + b.width / 2); ys.push(b.top - base.top + b.height / 2);
      }
      if (xs.length) setBeam({ xs, ys });
    }
    at(3400, () => { setStep('landed'); setSpot(target); });
    at(3500, () => setStep('stamped'));
    at(5200, () => setStep('outcome'));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line
  }, []);

  const stamped = step === 'stamped' || step === 'outcome';
  const kind = r.caught ? 'imposter' : target ? 'innocent' : 'escaped';
  const imposterName = view.byId.get(r.imposterId)?.name;
  const outcome = r.caught ? `${view.byId.get(target!)?.name} was the imposter! One chance to steal…`
    : r.escapeReason === 'tie' ? `A tie! The imposter escapes. +200 to ${imposterName}`
    : r.escapeReason === 'novotes' ? `Nobody voted! The imposter escapes. +200 to ${imposterName}`
    : `${view.byId.get(target!)?.name} was innocent! The imposter escapes. +200`;

  return (
    <div ref={wrap} className={`unmask-wrap ${step === 'stamped' && !rm ? 'unmask-wrap--shake' : ''}`}>
      <Rise><h2 className="display-md phase__title">{step === 'roll' ? 'The votes are in…' : r.caught ? 'Caught!' : 'Escaped!'}</h2></Rise>
      <div className={`gallery ${phone ? 'gallery--phone' : galleryCols(tiles.length)}`}>
        {tiles.map((d) => (
          <DrawingTile key={d.playerId} drawing={d} player={view.byId.get(d.playerId)} layoutId={`tile-${r.index}-${d.playerId}`} size={phone ? 240 : 320}
            spot={spot === d.playerId} dim={step === 'roll' ? spot !== d.playerId : stamped && target !== d.playerId}
            votes={counts.get(d.playerId)} showVotes={stamped}>
            {stamped && target === d.playerId && <Stamp kind={kind === 'escaped' ? 'innocent' : kind} sm />}
          </DrawingTile>
        ))}
      </div>
      {beam && step === 'roll' && (
        <div className="spotlight" aria-hidden>
          <motion.div className="spotlight__beam" style={{ translateX: '-50%', translateY: '-50%' }}
            initial={{ x: beam.xs[0], y: beam.ys[0], opacity: 0 }}
            animate={{ x: beam.xs, y: beam.ys, opacity: 0.9 }}
            transition={{ duration: 3.1, ease: ease.smooth, times: beam.xs.map((_, i) => i / (beam.xs.length - 1)) }} />
        </div>
      )}
      <AnimatePresence>
        {stamped && !target && (
          <motion.div key="esc" style={{ display: 'grid', placeItems: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: D.base }}><Stamp kind="escaped" /></motion.div>
        )}
        {step === 'outcome' && (
          <motion.p key="out" className="phase__sub" initial={{ opacity: 0, y: rm ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: D.base, ease: ease.bounce }}>{outcome}</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
