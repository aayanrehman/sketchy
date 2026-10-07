import { AvatarArt, StatusIcon } from '@/design/components/Illustrations';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import type { Drawing, Player } from '@shared/types';
import { t } from '../motion';
import { SketchCanvas } from './SketchCanvas';
import { useSfx } from '@/sound/useSfx';

interface Props {
  drawing: Drawing; player?: Player; layoutId?: string; selectable?: boolean; selected?: boolean; dim?: boolean; spot?: boolean;
  votes?: number; showVotes?: boolean; onSelect?: () => void; children?: ReactNode; submittedCheck?: boolean; size?: number; hideName?: boolean;
  /** Seconds to show the raw sketch before morphing, when the art is already there on mount. */
  revealDelay?: number; rawOnly?: boolean;
  /** Label shown on hover/focus when the tile is selectable, e.g. "Vote". */
  actionLabel?: string;
}

/**
 * The drawing tile. Shared element across phases (layoutId). Handles the Glow-up choreography:
 * sketch + shimmer while pending -> crossfade/scale into AI art -> Golden frame with a shine sweep.
 * Fallback: raw sketch in a gold frame with "The AI was speechless."
 */
export function DrawingTile({ drawing, player, layoutId, selectable, selected, dim, spot, votes, showVotes, onSelect, children, submittedCheck, size = 320, hideName, revealDelay = 0, rawOnly = false, actionLabel }: Props) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const [ready, setReady] = useState(revealDelay <= 0);
  useEffect(() => { if (revealDelay > 0) { const id = setTimeout(() => setReady(true), revealDelay * 1000); return () => clearTimeout(id); } }, [revealDelay]);
  const mockOnly = drawing.glowStatus === 'done' && !drawing.glowUrl && !!drawing.glowMock;
  const [peek, setPeek] = useState(false);
  const glowed = !rawOnly && ready && drawing.glowStatus === 'done' && (!!drawing.glowUrl || mockOnly);
  // Redrawing: shown until this tile's sticker art appears (the AI is still working, or its staggered reveal hasn't come up yet).
  const pending = !rawOnly && !drawing.blank && drawing.glowStatus !== 'fallback' && !glowed;
  const [playedGold, setPlayedGold] = useState(false);
  useEffect(() => {
    if (drawing.golden && glowed && !playedGold) { setPlayedGold(true); sfx.play('golden'); }
  }, [drawing.golden, glowed, playedGold, sfx]);
  useEffect(() => { if (glowed) sfx.play('glow'); /* eslint-disable-next-line */ }, [glowed]);

  const cls = ['tile',
    pending ? 'tile--pending' : '',
    drawing.glowStatus === 'fallback' && !drawing.blank ? 'tile--fallback' : '',
    drawing.golden && glowed ? 'tile--golden' : '',
    selectable ? 'tile--selectable' : '', selected ? 'tile--selected' : '', dim ? 'tile--dim' : '', spot ? 'tile--spot' : '',
  ].join(' ');

  return (
    <motion.div
      layoutId={layoutId}
      layout
      transition={t.layout(rm)}
      className={cls}
      data-tile={drawing.playerId}
      onClick={selectable ? onSelect : undefined}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onKeyDown={selectable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(); } } : undefined}
      whileTap={selectable && !rm ? { scale: 0.97 } : undefined}
      aria-label={player ? `${player.name}'s drawing` : 'drawing'}
      aria-pressed={selectable ? !!selected : undefined}
      style={{ ['--av-color' as any]: player?.color }}
    >
      {drawing.blank ? (
        <div className="tile__blank">{drawing.draftStatus ? 'No prompt locked in' : 'blank'}</div>
      ) : (
        <SketchCanvas strokes={drawing.strokes} size={size} className="tile__layer" />
      )}
      <AnimatePresence>
        {glowed && !peek && (
          <motion.div
            key="glow"
            className="tile__layer"
            initial={rm ? { opacity: 0 } : { clipPath: 'circle(0% at 50% 50%)', scale: 1.06 }}
            animate={rm ? { opacity: 1 } : { clipPath: 'circle(75% at 50% 50%)', scale: 1 }}
            transition={{ duration: rm ? 0.2 : 0.75, ease: [0.2, 0, 0, 1] }}
          >
            {mockOnly
              ? <SketchCanvas strokes={drawing.strokes} size={size} className="tile__layer tile__layer--glow tile__layer--mock" />
              : <img src={drawing.glowUrl} alt="" className={`tile__layer tile__layer--glow ${drawing.glowMock ? 'tile__layer--mock' : ''}`} />}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="tile__shimmer" aria-hidden />
      {drawing.golden && glowed && <div className="tile__shine" aria-hidden />}
      <div className="tile__frame" aria-hidden />
      {drawing.golden && glowed && <span className="tile__golden-tag">GOLDEN</span>}
      {pending && <Redrawing />}
      {glowed && !rm && revealDelay > 0 && <span className="tile__burst" aria-hidden>{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ['--a' as any]: `${i * 45}deg` }} />)}</span>}
      {drawing.glowStatus === 'fallback' && !drawing.blank && !rawOnly && <span className="tile__fallback">Sketch only</span>}
      {glowed && !drawing.blank && (drawing.draftUrl
        ? <span className="tile__inset" title="This player's first draft"><img src={drawing.draftUrl} alt="" className="tile__layer" /><small>Draft</small></span>
        : !drawing.draftStatus && (
        <span className="tile__inset" onPointerEnter={() => setPeek(true)} onPointerLeave={() => setPeek(false)} title="Original sketch: hover to compare">
          <SketchCanvas strokes={drawing.strokes} size={96} className="tile__layer" />
          <small>{peek ? 'Original' : 'Sketch'}</small>
        </span>
      ))}
      {selectable && actionLabel && <span className="tile__action" aria-hidden>{actionLabel}</span>}
      {player && !hideName && (
        <span className="tile__name"><span className="tile__name-dot"><AvatarArt avatar={player.avatar} /></span><span className="tile__name-text">{player.name}</span></span>
      )}
      <AnimatePresence>
        {showVotes && !!votes && (
          <motion.span key={votes} className="tile__votes" initial={{ scale: rm ? 1 : 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={t.bounce(rm)}>{votes}</motion.span>
        )}
        {submittedCheck && (
          <motion.span key="check" className="tile__check" initial={{ scale: rm ? 1 : 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={t.bounce(rm)}><StatusIcon kind="check" /></motion.span>
        )}
      </AnimatePresence>
      {children && <div className="tile__stamp-slot">{children}</div>}
    </motion.div>
  );
}

const STEPS = ['Reading the sketch', 'Inking outlines', 'Adding color', 'Final touches'];
/** The redraw-in-progress overlay: a paint sweep, a scan line, twinkles, and a progress pill with Sketchy at work. */
function Redrawing() {
  const [i, setI] = useState(0);
  useEffect(() => { const id = setInterval(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), 2200); return () => clearInterval(id); }, []);
  return (
    <>
      <span className="tile__paint" aria-hidden />
      <span className="tile__scan" aria-hidden />
      <span className="tile__twinkles" aria-hidden>{[[18, 22], [74, 16], [82, 64], [26, 70], [52, 40]].map(([x, y], k) => <i key={k} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${k * 0.37}s` }}>✦</i>)}</span>
      <span className="tile__pending" role="status">
        <img src="/mascot/think.webp" alt="" width={30} height={30} />
        <span className="tile__pending-text">{STEPS[i]}…<b><em /></b></span>
      </span>
    </>
  );
}
