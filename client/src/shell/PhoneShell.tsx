import { useState, type ReactNode } from 'react';
import type { PublicRoom, MeView } from '@shared/types';
import { Button, Modal, Timer, Scenery } from '@/design/components';
import { useMute } from '@/sound/useSfx';
import { HowTo } from './HowTo';
import './shell.css';

/** Persistent portrait layout for phones: compact head with round, timer, help and mute; scrolling body. */
export function PhoneShell({ room, me, serverOffset, children, showTimer = true }: { room: PublicRoom; me: MeView | null; serverOffset: number; children: ReactNode; showTimer?: boolean }) {
  const [muted, setMuted] = useMute();
  const [help, setHelp] = useState(false);
  const p = me ? room.players.find((x) => x.id === me.playerId) : null;
  const timerOn = showTimer && !!room.phaseEndsAt && !['HOW_TO', 'STEAL', 'UNMASK', 'VERDICT', 'SCORES'].includes(room.phase);
  return (
    <div className="phone-shell">
      <Scenery hills={false} density={2} />
      <header className={`phone-shell__head ${timerOn ? 'phone-shell__head--timer' : ''}`}>
        <div className="phone-shell__me">
          {p && <span className="chip" data-avatar={p.id} style={{ ['--av-color' as any]: p.color }}><span>{p.avatar}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>{room.round > 0 && <span className="avatar__score">{p.score}</span>}</span>}
          {room.round > 0 ? <span className="phone-shell__round">R{room.round}/{room.totalRounds}</span> : !room.isDemo && <span className="phone-shell__round">{room.code}</span>}
        </div>
        <div className="phone-shell__ctl">
          {timerOn && <Timer endsAt={room.phaseEndsAt} serverOffset={serverOffset} compact />}
          <Button variant="ghost" icon aria-label="How to play" onClick={() => setHelp(true)}>?</Button>
          <Button variant="ghost" icon aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted} onClick={() => setMuted(!muted)}>{muted ? '🔇' : '🔊'}</Button>
        </div>
      </header>
      <main className="phone-shell__body">{children}</main>
      <Modal open={help} onClose={() => setHelp(false)} label="How to play"><HowTo onDone={() => setHelp(false)} cta="Close" /></Modal>
    </div>
  );
}
