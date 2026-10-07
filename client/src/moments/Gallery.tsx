import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Drawing } from '@shared/types';
import { Button, DrawingTile, Timer } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { childVariants } from '@/design/motion';
import { useFitGrid } from '@/design/useFitGrid';
import { useSfx } from '@/sound/useSfx';
import { phaseElapsed, send, type MomentProps } from './common';

/** At the start of the reveal, tiles paint in one after another (seconds from now); later mounts show art at once. */
export const revealAt = (view: MomentProps['view'], i: number) => view.room?.phase === 'GALLERY' ? Math.max(0, REVEAL_FIRST_S + i * REVEAL_STEP_S - phaseElapsed(view) / 1000) : 0;
const REVEAL_FIRST_S = 1.6, REVEAL_STEP_S = 0.9; // keep in sync with galleryMinMs in convex/engine.ts

/** One line telling everyone exactly what is happening right now. */
function copy(phase: string, drawings: Drawing[]) {
  const pending = drawings.filter((d) => d.glowStatus === 'pending').length;
  if (phase === 'GALLERY') return {
    title: 'Here’s what everyone drew',
    sub: pending ? 'Sketchy is redrawing every sketch as a sticker. The original stays in the corner.' : 'Every sketch, redrawn. Discussion starts in a moment.',
  };
  if (phase === 'DISCUSS') return { title: 'Who drew something different?', sub: 'One player had a slightly different prompt. Talk it over in the chat. Voting opens when the timer runs out.' };
  return { title: 'Vote for the imposter', sub: '' };
}

/** Main (TV) screen: GALLERY, DISCUSS and VOTE share one gallery so tiles never leave the stage. */
export function GalleryMain({ view }: MomentProps) {
  const rm = !!useReducedMotion();
  const room = view.room!; const r = view.round!;
  const phase = room.phase;
  const voters = room.players.filter((p) => r.participantIds.includes(p.id)).length;
  const votes = Object.keys(r.votes).length;
  const c = copy(phase, r.drawings);
  const grid = useFitGrid(r.drawings.length, { gap: 16, reserve: 160 });
  return (
    <div className="phase">
      <Rise className="gallery-head">
        <div>
          <h2 className="display-md">{c.title}</h2>
          <p className="gallery-head__sub">{phase === 'VOTE' ? `${r.revote ? 'Tie! Revote between the tied players' : 'Vote on your phone'} · ${votes}/${voters} votes in` : c.sub}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {phase === 'DISCUSS' && view.canHost && <Button variant="ghost" size="sm" onClick={() => send().emit('host:skip')}>Skip to vote</Button>}
          <Timer endsAt={room.phaseEndsAt} serverOffset={view.serverOffset} tick={phase === 'VOTE'} />
        </div>
      </Rise>
      <div ref={grid.ref} style={grid.style}>
        {r.drawings.map((d, i) => (
          <motion.div key={d.playerId} variants={childVariants(rm)}>
            <DrawingTile drawing={d} player={view.byId.get(d.playerId)} layoutId={`tile-${r.index}-${d.playerId}`} size={grid.size} revealDelay={revealAt(view, i)} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** The player's view: watch the reveal, discuss in the side chat, then click a drawing to vote. */
export function GalleryPhone({ view }: MomentProps) {
  const rm = !!useReducedMotion();
  const room = view.room!; const r = view.round!; const me = view.me!;
  const phase = room.phase;
  const p = view.byId.get(me.playerId);
  const [picked, setPicked] = useState<string | null>(null);
  const revote = r.revote || null;
  useEffect(() => setPicked(null), [revote?.join()]); // a revote clears your earlier pick
  const voted = !!picked || !!p?.hasVoted;
  const canVote = phase === 'VOTE' && r.participantIds.includes(me.playerId) && !voted;
  const sfx = useSfx();
  const grid = useFitGrid(r.drawings.length, { gap: 12, reserve: 56 });
  const vote = (id: string) => {
    if (!canVote || id === me.playerId || (revote && !revote.includes(id))) return;
    setPicked(id); sfx.play('pop'); navigator.vibrate?.(30);
    send().emit('vote', { targetId: id });
  };
  const voters = room.players.filter((x) => r.participantIds.includes(x.id));
  const left = voters.filter((x) => !x.hasVoted).length;
  const c = copy(phase, r.drawings);
  const names = (revote || []).map((id) => view.byId.get(id)?.name).filter(Boolean).join(' or ');
  const title = phase !== 'VOTE' ? c.title : revote && !voted ? 'It’s a tie! Revote' : voted ? `You voted for ${view.byId.get(picked || '')?.name || 'a player'}` : me.isImposter ? 'Frame someone' : 'Who’s the imposter?';
  const sub = phase !== 'VOTE' ? c.sub
    : voted ? (left ? `Waiting for ${left} more vote${left === 1 ? '' : 's'}…` : 'All votes in!')
    : revote ? `Pick between ${names}. If it’s still a tie, the imposter escapes.`
    : me.isImposter ? 'You’re the imposter. Click someone else’s drawing to throw suspicion on them.'
    : 'Click the drawing you think came from a different prompt. You can’t vote for yourself.';
  return (
    <div className="phase">
      <Rise className="gallery-head">
        <div>
          <h2 className="display-sm">{title}</h2>
          <p className="gallery-head__sub">{sub}</p>
          {phase === 'DISCUSS' && me.isImposter && <p className="gallery-head__tag">You’re the imposter: blend in!</p>}
        </div>
        {phase === 'DISCUSS' && me.isHost && <Button variant="ghost" size="sm" onClick={() => send().emit('host:skip')}>Skip to vote</Button>}
      </Rise>
      <div ref={grid.ref} style={grid.style}>
        {r.drawings.map((d, i) => (
          <motion.div key={d.playerId} variants={childVariants(rm)}>
            <DrawingTile drawing={d} player={view.byId.get(d.playerId)} layoutId={`tile-${r.index}-${d.playerId}`} size={grid.size} revealDelay={revealAt(view, i)}
              selectable={canVote && d.playerId !== me.playerId && (!revote || revote.includes(d.playerId))} selected={(picked || r.votes[me.playerId]) === d.playerId} actionLabel="Vote"
              dim={phase === 'VOTE' && (d.playerId === me.playerId || (!!revote && !revote.includes(d.playerId)))} onSelect={() => vote(d.playerId)} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
