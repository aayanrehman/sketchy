import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button, DrawingTile, Timer } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { childVariants } from '@/design/motion';
import { useSfx } from '@/sound/useSfx';
import { galleryCols, send, type MomentProps } from './common';

/** GALLERY (glow-up), DISCUSS and VOTE all live on the same gallery so tiles never leave the stage. */
export function GalleryMain({ view }: MomentProps) {
  const rm = !!useReducedMotion();
  const room = view.room!; const r = view.round!;
  const phase = room.phase;
  const voters = room.players.filter((p) => r.participantIds.includes(p.id)).length - 1;
  const votes = Object.keys(r.votes).length;
  const glowing = r.drawings.filter((d) => d.glowStatus === 'pending').length;
  const sub = phase === 'GALLERY' ? (glowing ? `The AI is glowing up ${glowing} sketch${glowing === 1 ? '' : 'es'}…` : 'Every sketch, glowed up.')
    : phase === 'DISCUSS' ? 'Argue! "Why does yours have a chair?"' : `${votes}/${voters} votes in`;
  return (
    <div className="phase">
      <Rise style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 className="display-md">{phase === 'GALLERY' ? 'Glow-up gallery' : phase === 'DISCUSS' ? 'Discuss' : 'Who is the imposter?'}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {phase === 'DISCUSS' && <Button variant="ghost" size="sm" onClick={() => send().emit('host:skip')}>Skip</Button>}
          <Timer endsAt={room.phaseEndsAt} serverOffset={view.serverOffset} tick={phase === 'VOTE'} />
        </div>
      </Rise>
      <Rise><p className="phase__sub">{sub}</p></Rise>
      <div className={`gallery ${galleryCols(r.drawings.length)}`}>
        {r.drawings.map((d, i) => (
          <motion.div key={d.playerId} variants={childVariants(rm)}>
            <DrawingTile drawing={d} player={view.byId.get(d.playerId)} layoutId={`tile-${r.index}-${d.playerId}`} revealDelay={phase === 'GALLERY' ? 1 + i * 0.45 : 0} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function GalleryPhone({ view }: MomentProps) {
  const rm = !!useReducedMotion();
  const room = view.room!; const r = view.round!; const me = view.me!;
  const phase = room.phase;
  const p = view.byId.get(me.playerId);
  const canVote = phase === 'VOTE' && r.participantIds.includes(me.playerId) && !me.isImposter && !p?.hasVoted;
  const [picked, setPicked] = useState<string | null>(null);
  const sfx = useSfx();
  const vote = (id: string) => {
    if (!canVote || id === me.playerId || picked) return;
    setPicked(id); sfx.play('pop'); navigator.vibrate?.(30);
    send().emit('vote', { targetId: id });
  };
  const title = phase === 'GALLERY' ? 'Glow-up gallery' : phase === 'DISCUSS' ? 'Discuss out loud' : me.isImposter ? 'They are voting…' : canVote && !picked ? 'Tap the imposter' : picked || p?.hasVoted ? 'Vote locked in' : 'Vote';
  return (
    <div className="phase">
      <Rise style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2 className="display-sm">{title}</h2>
        {phase === 'DISCUSS' && me.isHost && <Button variant="ghost" size="sm" onClick={() => send().emit('host:skip')}>Skip</Button>}
      </Rise>
      {phase === 'VOTE' && me.isImposter && <Rise><p className="dim" style={{ fontWeight: 700 }}>Sit tight. If they pick you, you get one steal.</p></Rise>}
      <div className="gallery gallery--phone">
        {r.drawings.map((d) => (
          <motion.div key={d.playerId} variants={childVariants(rm)}>
            <DrawingTile drawing={d} player={view.byId.get(d.playerId)} layoutId={`tile-${r.index}-${d.playerId}`} size={240} revealDelay={phase === 'GALLERY' ? 1 + r.drawings.indexOf(d) * 0.45 : 0}
              selectable={canVote && d.playerId !== me.playerId && !picked} selected={picked === d.playerId}
              dim={phase === 'VOTE' && (d.playerId === me.playerId && !me.isImposter)} onSelect={() => vote(d.playerId)} />
          </motion.div>
        ))}
      </div>
      {phase === 'VOTE' && canVote && !picked && <Rise><p className="mute" style={{ textAlign: 'center', fontWeight: 700 }}>You can't vote for yourself.</p></Rise>}
    </div>
  );
}
