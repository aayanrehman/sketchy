import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { MIN_PLAYERS, MAX_PLAYERS } from '@shared/types';
import { Avatar, Button, Card } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { childVariants } from '@/design/motion';
import { send, type MomentProps } from './common';

function JoinQr({ url }: { url: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) QRCode.toCanvas(ref.current, url, { width: 120, margin: 0, color: { dark: '#2B2540', light: '#FFFFFF' } }).catch(() => {}); }, [url]);
  return <canvas ref={ref} className="lobby__qr" aria-label="QR code to join" />;
}

export function LobbyMain({ view }: MomentProps) {
  const rm = !!useReducedMotion();
  const room = view.room!;
  const n = room.players.filter((p) => !p.spectator).length;
  const url = `${location.origin}/play`;
  return (
    <div className="lobby">
      <Rise><Card className="lobby__join">
        <JoinQr url={`${url}?code=${room.code}`} />
        <div>
          <p className="lobby__url">Scan, or go to <b>{url.replace(/^https?:\/\//, '')}</b> and enter</p>
          <div className="lobby__code" aria-label={`Room code ${room.code.split('').join(' ')}`}>{room.code}</div>
        </div>
      </Card></Rise>
      <Rise className="lobby__cast">
        {room.players.map((p) => <motion.div key={p.id} variants={childVariants(rm)}><Avatar player={p} isHost={p.id === room.hostId} /></motion.div>)}
        {Array.from({ length: Math.max(0, MIN_PLAYERS - room.players.length) }, (_, i) => <div key={i} className="lobby__slot" aria-hidden />)}
      </Rise>
      <Rise>
        {n < MIN_PLAYERS ? <p className="phase__sub">Need {MIN_PLAYERS} players (or try Demo Mode) · {n}/{MAX_PLAYERS}</p> : <Button size="lg" onClick={() => send().emit('host:start')}>Start the show</Button>}
      </Rise>
      <Rise><p className="mute" style={{ fontWeight: 700 }}>Playing on this phone? <a href={`/play?code=${room.code}`}>Join as a player</a></p></Rise>
    </div>
  );
}

export function LobbyPhone({ view }: MomentProps) {
  const room = view.room!; const me = view.me!;
  const n = room.players.filter((p) => !p.spectator).length;
  const isHost = me.isHost;
  return (
    <div className="lobby">
      <Rise><h2 className="display-md">Room {room.code}</h2></Rise>
      <Rise><Card style={{ width: '100%' }}>
        <div className="lobby__cast">{room.players.map((p) => <Avatar key={p.id} player={p} isHost={p.id === room.hostId} isYou={p.id === me.playerId} />)}</div>
      </Card></Rise>
      <Rise style={{ width: '100%' }}>
        {isHost ? (
          <>
            <Button size="lg" block disabled={n < MIN_PLAYERS} onClick={() => send().emit('host:start')}>{n < MIN_PLAYERS ? `Need ${MIN_PLAYERS} players (${n}/${MIN_PLAYERS})` : 'Start the show'}</Button>
            {n < MIN_PLAYERS && <p className="mute" style={{ marginTop: 8, fontWeight: 700 }}>or <a href="/demo">try Demo Mode</a></p>}
          </>
        ) : <p className="phase__sub">Waiting for host… ({n}/{MAX_PLAYERS})</p>}
      </Rise>
      <Rise><Button variant="ghost" size="sm" onClick={() => { send().emit('leave'); location.href = '/'; }}>Leave</Button></Rise>
    </div>
  );
}
