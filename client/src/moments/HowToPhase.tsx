import { StatusIcon } from '@/design/components/Illustrations';
import { Button, Card, Timer } from '@/design/components';
import { HowTo } from '@/shell/HowTo';
import { Rise } from '@/shell/PhaseStage';
import { markHowTo } from '@/progression/store';
import { send, type MomentProps } from './common';
import { useState } from 'react';

export function HowToMain({ view }: MomentProps) {
  const room = view.room!;
  return (
    <div className="phase phase--narrow">
      <Rise style={{ display: 'flex', justifyContent: 'center' }}><Timer endsAt={room.phaseEndsAt} serverOffset={view.serverOffset} tick={false} /></Rise>
      <Rise><Card padLg><HowTo mode={room.mode || 'sketch'} /></Card></Rise>
    </div>
  );
}
export function HowToPhone({ view }: MomentProps) {
  const [done, setDone] = useState(false);
  const me = view.me!; const p = view.byId.get(me.playerId);
  const ready = done || !!p?.readyHowTo;
  return (
    <Rise><Card padLg>
      <HowTo solo={view.room?.isDemo} mode={view.room?.mode || 'sketch'} cta="Let’s play" onDone={ready ? undefined : () => { setDone(true); markHowTo(); send().emit('howto:ready'); }} />
      {ready && <p className="phase__sub" style={{ marginTop: 12 }}>Waiting for the others…</p>}
      {ready && <Button variant="ghost" size="sm" block disabled>Got it <StatusIcon kind="check" /></Button>}
    </Card></Rise>
  );
}
