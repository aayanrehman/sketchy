import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { VERDICT_PER_DRAWING_MS } from '@shared/types';
import { MatchMeter } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { t } from '@/design/motion';
import { useSfx } from '@/sound/useSfx';
import { phaseElapsed, type MomentProps } from './common';

/**
 * AI VERDICT: the real prompt is revealed, then Match % meters spin up one by one on the server
 * schedule (BASE + i * PER_DRAWING). The imposter's meter is last and slowest; the judge's roast types out.
 */
export function VerdictMoment({ view }: MomentProps) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const r = view.round!; const me = view.me;
  const order = [...r.drawings.filter((d) => d.playerId !== r.imposterId), ...r.drawings.filter((d) => d.playerId === r.imposterId)];
  const [running, setRunning] = useState<number>(() => Math.max(0, Math.floor((phaseElapsed(view) - 2000) / VERDICT_PER_DRAWING_MS) + 1));
  const [showPrompt, setShowPrompt] = useState(phaseElapsed(view) > 400);

  useEffect(() => {
    const el = phaseElapsed(view);
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => { const d = ms - el; if (d <= 0) fn(); else timers.push(window.setTimeout(fn, d)); };
    at(400, () => { setShowPrompt(true); if (el < 400) sfx.play('reveal'); });
    order.forEach((_, i) => at(2000 + i * VERDICT_PER_DRAWING_MS, () => setRunning((n) => Math.max(n, i + 1))));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line
  }, []);

  return (
    <div className="verdict">
      <Rise className="judge"><span className="judge__face" aria-hidden>🤖</span><h2 className="display-md">The judge's verdict</h2></Rise>
      <motion.div className="verdict__prompt" initial={{ opacity: 0, scale: rm ? 1 : 0.9 }} animate={{ opacity: showPrompt ? 1 : 0, scale: 1 }} transition={t.bounce(rm)}>
        <span className="prompt-card__label">THE REAL PROMPT WAS</span>
        <b>{r.realPrompt}</b>
        <span className="mute" style={{ fontWeight: 700, fontSize: 'var(--t-body-sm)' }}>The imposter got "{r.decoyPrompt}"</span>
      </motion.div>
      {order.map((d, i) => (
        <MatchMeter key={d.playerId} drawing={d} player={view.byId.get(d.playerId)} isImposter={d.playerId === r.imposterId} isYou={!!me && me.playerId === d.playerId}
          run={running > i} slow={d.playerId === r.imposterId} />
      ))}
    </div>
  );
}
