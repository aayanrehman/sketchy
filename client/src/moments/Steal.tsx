import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Avatar, Stamp, Timer } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { dur, durRM, ease, stagger } from '@/design/motion';
import { useSfx } from '@/sound/useSfx';
import { send, type MomentProps } from './common';

/** THE STEAL: 4 cards flip in sequence, a countdown ring, slot-machine sound on a hit. */
export function StealMoment({ view, phone }: MomentProps & { phone?: boolean }) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const room = view.room!; const r = view.round!; const me = view.me;
  const imposter = view.byId.get(r.imposterId);
  const isImposter = !!me && me.playerId === r.imposterId;
  const [picked, setPicked] = useState<string | null>(null);
  const D = rm ? durRM : dur;
  const resolved = r.stealPick !== null;

  useEffect(() => {
    if (rm) return;
    const timers = r.stealOptions.map((_, i) => setTimeout(() => sfx.play('flip'), i * stagger.lg * 1000 + 200));
    return () => timers.forEach(clearTimeout);
    /* eslint-disable-next-line */
  }, []);
  useEffect(() => {
    if (!resolved) return;
    if (r.stealCorrect) { sfx.play('slot'); navigator.vibrate?.([40, 30, 40, 30, 120]); } else sfx.play('thud');
    // eslint-disable-next-line
  }, [resolved]);

  const pick = (opt: string) => {
    if (!isImposter || picked || resolved) return;
    setPicked(opt); sfx.play('pop');
    send().emit('steal:pick', { option: opt });
  };

  return (
    <div className="steal">
      <Rise><h2 className="display-md phase__title">{isImposter ? 'Steal the round!' : `${imposter?.name} gets one steal`}</h2></Rise>
      <Rise><p className="phase__sub">{r.mode === 'prompt' ? (isImposter ? 'What was hidden behind the blur?' : 'If they guess what was hidden behind the blur, they steal +150') : isImposter ? 'Which prompt did everyone else get?' : 'If they guess the real prompt, they steal +150'}</p></Rise>
      <Rise style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {imposter && <Avatar player={imposter} size="lg" layoutPrefix="steal" />}
        <Timer endsAt={room.phaseEndsAt} serverOffset={view.serverOffset} variant="ring" tick={isImposter} layoutId="steal-timer" />
      </Rise>
      <div className="steal__cards">
        {r.stealOptions.map((opt, i) => {
          const isPick = (picked || r.stealPick) === opt;
          const state = resolved ? (opt === r.realPrompt ? 'steal-card--right' : isPick ? 'steal-card--wrong' : '') : isPick ? 'steal-card--picked' : '';
          return (
            <motion.button key={opt} type="button" className={`steal-card ${state} ${!isImposter || resolved ? 'steal-card--disabled' : ''}`}
              initial={{ rotateY: rm ? 180 : 0, opacity: 0 }} animate={{ rotateY: 180, opacity: 1 }}
              transition={{ delay: rm ? 0 : 0.2 + i * stagger.lg, duration: rm ? D.fast : D.dramatic * 0.7, ease: ease.snap }}
              whileTap={isImposter && !resolved && !rm ? { scale: 0.96 } : undefined}
              onClick={() => pick(opt)} disabled={!isImposter || resolved} aria-label={`Option ${i + 1}: ${opt}`}>
              <span className="steal-card__face steal-card__face--back">?</span>
              <span className="steal-card__face steal-card__face--front">{opt}</span>
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {resolved && (
          <motion.div key="res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
            {r.stealCorrect ? <Stamp kind="stolen" sm={phone} sound={false} /> : <p className="phase__sub">Nope! The real prompt was "{r.realPrompt}"</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
