import { motion, useReducedMotion } from 'framer-motion';
import { Card, Timer, Mascot } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { t } from '@/design/motion';
import type { MomentProps } from './common';
import './polish.css';

export function PromptMain({ view }: MomentProps) {
  const rm = !!useReducedMotion();
  const room = view.room!; const r = view.round!;
  return (
    <div className="phase" style={{ justifyItems: 'center' }}>
      <Rise><p className="prompt-card__label">THIS ROUND'S THEME</p></Rise>
      <Rise><motion.h1 className="theme-word neon-text" initial={{ scale: rm ? 1 : 0.6 }} animate={{ scale: 1 }} transition={t.bounce(rm)}>{r.theme}</motion.h1></Rise>
      <Rise><p className="phase__sub">Phones are reading their secret prompts…</p></Rise>
      <Rise><Timer endsAt={room.phaseEndsAt} serverOffset={view.serverOffset} tick={false} /></Rise>
    </div>
  );
}

export function PromptPhone({ view }: MomentProps) {
  const me = view.me!; const r = view.round!;
  const spectating = !r.participantIds.includes(me.playerId);
  return (
    <div className="phase phase--narrow">
      {spectating ? (
        <Rise><Card padLg className="prompt-card"><p className="prompt-card__label">SPECTATING</p><p className="prompt-card__text">{r.theme}</p><p className="dim">You join the next round.</p></Card></Rise>
      ) : (
        <Rise><Card padLg className={`prompt-card ${me.isImposter ? 'prompt-card--imposter' : ''}`}>
          <Mascot mood={me.isImposter ? 'imposter' : 'happy'} size={88} float />
          {me.isImposter ? <span className="prompt-card__banner">You're the imposter</span> : <p className="prompt-card__label">YOUR SECRET PROMPT</p>}
          <p className="prompt-card__text">{me.prompt}</p>
          <p className="prompt-card__hint">{me.isImposter ? 'Your prompt is slightly different. Draw it so you blend in.' : 'Everyone has this prompt except the imposter.'}</p>
        </Card></Rise>
      )}
      <Rise><p className="phase__sub">Get ready to draw</p></Rise>
    </div>
  );
}
