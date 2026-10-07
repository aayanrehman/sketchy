import { StatusIcon } from '@/design/components/Illustrations';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Avatar, Button, Card, Timer } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { DrawCanvas, type DrawHandle } from '@/draw/DrawCanvas';
import { load, unlockedColors } from '@/progression/store';
import { useSfx } from '@/sound/useSfx';
import { phaseElapsed, send, type MomentProps } from './common';
import './polish.css';

/** 3-2-1-Go! overlay shown once at the start of DRAW. Visual only: pointer-events none, canvas stays live. */
function Countdown({ startedAgo }: { startedAgo: number }) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const [step, setStep] = useState<number | null>(startedAgo < 1500 ? 0 : null);
  useEffect(() => {
    if (step === null) return;
    const steps = ['3', '2', '1', 'Go!'];
    const timers = steps.map((s, i) => window.setTimeout(() => { setStep(i); sfx.play(s === 'Go!' ? 'chime' : 'tick'); }, i * 550));
    timers.push(window.setTimeout(() => setStep(null), 2200));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line
  }, []);
  const label = step === null ? null : ['3', '2', '1', 'Go!'][step];
  return (
    <div className="countdown" aria-live="assertive">
      <AnimatePresence mode="popLayout">
        {label && (
          <motion.div key={label} className={`countdown__num ${label === 'Go!' ? 'countdown__num--go' : ''}`}
            initial={{ opacity: 0, scale: rm ? 1 : 0.4, rotate: rm ? 0 : -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: rm ? 1 : 1.4 }} transition={{ duration: rm ? 0.12 : 0.28, ease: [0.34, 1.56, 0.64, 1] }}>{label}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DrawMain({ view }: MomentProps) {
  const room = view.room!; const r = view.round!;
  const parts = room.players.filter((p) => r.participantIds.includes(p.id));
  const done = parts.filter((p) => p.hasSubmitted).length;
  return (
    <div className="phase" style={{ justifyItems: 'center' }}>
      <Rise><h1 className="theme-word neon-text">{r.theme}</h1></Rise>
      <Rise><Timer endsAt={room.phaseEndsAt} serverOffset={view.serverOffset} variant="ring" tick={false} /></Rise>
      <Rise><p className="phase__sub">{done}/{parts.length} submitted</p></Rise>
      <Rise className="status-strip">
        {parts.map((p) => <Avatar key={p.id} player={p} layoutPrefix="draw" badge={p.hasSubmitted ? '✓' : null} active={!p.hasSubmitted} />)}
      </Rise>
    </div>
  );
}

export function DrawPhone({ view }: MomentProps) {
  const room = view.room!; const me = view.me!; const r = view.round!;
  const ref = useRef<DrawHandle>(null);
  const p = view.byId.get(me.playerId);
  const [sent, setSent] = useState(false);
  const [strokes, setStrokes] = useState(0);
  const sfx = useSfx();
  const submitted = sent || !!p?.hasSubmitted;
  const spectating = !r.participantIds.includes(me.playerId);
  const extra = unlockedColors(load().xp).map((u) => u.color);
  const [startedAgo] = useState(() => phaseElapsed(view));

  const submit = () => {
    if (submitted || !ref.current) return;
    const { strokes, png } = ref.current.export();
    send().emit('draw:submit', { strokes, png });
    setSent(true); sfx.play('submit'); navigator.vibrate?.(40);
  };
  // Auto-submit just before the timer ends so a blank is never sent by accident when the net is slow.
  useEffect(() => {
    if (!room.phaseEndsAt || submitted || spectating) return;
    const ms = room.phaseEndsAt - (Date.now() + view.serverOffset) - 700;
    const id = setTimeout(submit, Math.max(0, ms));
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [room.phaseEndsAt, submitted]);

  if (spectating) return <Rise><Card padLg className="prompt-card"><p className="prompt-card__label">SPECTATING</p><p className="dim">Players are drawing "{r.theme}". You join next round.</p></Card></Rise>;

  return (
    <div className="phase phase--narrow draw-phase">
      {!submitted && <Countdown startedAgo={startedAgo} />}
      <Rise className="draw-head draw-head--big">
        <div className="draw-head__row">
          <span className="draw-head__label">{me.isImposter ? 'YOUR PROMPT' : 'DRAW'}</span>
          {me.isImposter && <span className="chip chip--red draw-head__chip">You’re the imposter: blend in</span>}
        </div>
        <div className={`draw-prompt draw-prompt--big ${me.isImposter ? 'draw-prompt--imposter' : ''}`} title={me.prompt || undefined}>{me.prompt}</div>
      </Rise>
      <Rise>
        <div style={{ opacity: submitted ? 0.5 : 1, pointerEvents: submitted ? 'none' : 'auto' }}>
          <DrawCanvas ref={ref} extraColors={extra} disabled={submitted} onStrokeCount={setStrokes} />
        </div>
      </Rise>
      <Rise>
        {submitted ? <Button variant="lime" size="lg" block disabled>Submitted <StatusIcon kind="check" /></Button>
          : <Button variant="secondary" size="lg" block disabled={!strokes} onClick={submit}>{strokes ? 'Submit drawing' : 'Draw something first'}</Button>}
      </Rise>
    </div>
  );
}
