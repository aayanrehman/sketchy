import { SoundIcon } from '@/design/components/Illustrations';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { PublicRoom } from '@shared/types';
import { Avatar, Button, Modal, Scenery } from '@/design/components';
import { useMute } from '@/sound/useSfx';
import { HowTo } from './HowTo';
import { useState } from 'react';
import './shell.css';

/** Persistent layout for the main screen: brand + code + round pips on top, the stage, and the cast rail below. */
export function MainShell({ room, children, hideRail, railIds, meId }: { room: PublicRoom; children: ReactNode; hideRail?: boolean; railIds?: string[]; meId?: string | null }) {
  const [muted, setMuted] = useMute();
  const [help, setHelp] = useState(false);
  const players = railIds ? room.players.filter((p) => railIds.includes(p.id)) : room.players;
  return (
    <div className="main-shell">
      <Scenery hills={hideRail} density={4} />
      <header className="main-shell__head">
        <div className="main-shell__brand">
          <span className="display-md gold-text">SKETCHY</span>
          {room.round > 0 && (
            <span className="pips" aria-label={`Round ${room.round} of ${room.totalRounds}`}>
              {Array.from({ length: room.totalRounds }, (_, i) => <span key={i} className={`pip ${i + 1 < room.round ? 'pip--done' : i + 1 === room.round ? 'pip--on' : ''}`} />)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!room.isDemo && <span className="main-shell__code"><small>ROOM</small>{room.code}</span>}
          <Button variant="ghost" icon aria-label="How to play" onClick={() => setHelp(true)}>?</Button>
          <Button variant="ghost" icon aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted} onClick={() => setMuted(!muted)}><SoundIcon muted={muted} /></Button>
        </div>
      </header>
      <main className="main-shell__stage">{children}</main>
      {!hideRail && (
        <motion.footer className="main-shell__rail" layout>
          {players.map((p) => (
            <Avatar key={p.id} player={p} isHost={p.id === room.hostId} isYou={p.id === meId} showScore={room.round > 0}
              badge={p.spectator ? '…' : (room.phase === 'DRAW' && p.hasSubmitted) || (room.phase === 'VOTE' && p.hasVoted) || (room.phase === 'HOW_TO' && p.readyHowTo) ? '✓' : null}
              active={room.phase === 'DRAW' && !p.hasSubmitted && !p.spectator} />
          ))}
        </motion.footer>
      )}
      <Modal open={help} onClose={() => setHelp(false)} label="How to play"><HowTo onDone={() => setHelp(false)} cta="Close" /></Modal>
    </div>
  );
}
