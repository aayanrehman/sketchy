import { StatusIcon } from '@/design/components/Illustrations';
import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Card, Timer } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { DrawCanvas, type DrawHandle } from '@/draw/DrawCanvas';
import { load, unlockedColors } from '@/progression/store';
import { useSfx } from '@/sound/useSfx';
import { send, type MomentProps } from './common';

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
    <div className="phase phase--narrow">
      <Rise className="draw-head">
        <div className={`draw-prompt ${me.isImposter ? 'draw-prompt--imposter' : ''}`}>{me.prompt}{me.isImposter && <span className="chip chip--red" style={{ marginLeft: 8, fontSize: 11 }}>Blend in</span>}</div>
      </Rise>
      <Rise>
        <div style={{ opacity: submitted ? 0.5 : 1, pointerEvents: submitted ? 'none' : 'auto' }}>
          <DrawCanvas ref={ref} extraColors={extra} disabled={submitted} onStrokeCount={setStrokes} />
        </div>
      </Rise>
      <Rise>
        {submitted ? <Button variant="lime" size="lg" block disabled>Submitted <StatusIcon kind="check" /></Button>
          : <Button variant="secondary" size="lg" block onClick={submit}>{strokes ? 'Submit drawing' : 'Submit (blank)'}</Button>}
      </Rise>
    </div>
  );
}
