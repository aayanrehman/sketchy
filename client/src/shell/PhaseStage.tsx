import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Phase } from '@shared/types';
import { childVariants, phaseVariants, popVariants } from '@/design/motion';
import { useSfx } from '@/sound/useSfx';
import { setMusicMood } from '@/sound/music';

/**
 * THE phase transition system. Every screen is a child keyed by phase:
 * exit lifts away (fast/snap) -> title card slams (bounce) -> new screen rises (base/smooth) with staggered children.
 * Shared elements (Avatar, DrawingTile, Timer) carry layoutIds inside one LayoutGroup so they glide between phases.
 * The stage never blocks input: the title card is pointer-events: none and lives on its own layer.
 */
export function PhaseStage({ phase, children, narrow, banner }: { phase: Phase; children: ReactNode; narrow?: boolean; banner?: { text: string; tone?: 'magenta' | 'cyan' | 'gold' | 'red' } | null }) {
  const rm = !!useReducedMotion();
  const region = useRef<HTMLElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); region.current?.focus({ preventScroll: true }); });
    return () => cancelAnimationFrame(frame);
  }, [phase]);
  useEffect(() => { setMusicMood(phase === 'DRAW' || phase === 'VOTE' || phase === 'STEAL' ? 'upbeat' : 'chill'); }, [phase]);
  return (
    <LayoutGroup>
      <PhaseBanner phase={phase} banner={phase === 'DRAW' ? null : banner} />
        <motion.section ref={region} onAnimationComplete={definition => { if (definition === 'enter') region.current?.focus({ preventScroll: true }); }} tabIndex={-1} aria-label={`${phase.toLowerCase()} phase`} key={phase} className={`phase ${narrow ? 'phase--narrow' : ''}`} variants={phaseVariants(rm)} initial="initial" animate="enter" exit="exit">
          {children}
        </motion.section>
    </LayoutGroup>
  );
}

/** Use inside a PhaseStage for staggered children. */
export function Rise({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const rm = !!useReducedMotion();
  return <motion.div className={className} style={style} variants={childVariants(rm)}>{children}</motion.div>;
}

const DEFAULT_BANNERS: Partial<Record<Phase, { text: string; tone?: 'magenta' | 'cyan' | 'gold' | 'red' }>> = {
  PROMPT: { text: 'Secret prompt', tone: 'magenta' }, DRAW: { text: 'Draw!', tone: 'cyan' }, GALLERY: { text: 'Reveal!', tone: 'gold' },
  DRAFT: { text: 'Quick draft · 8 words', tone: 'cyan' }, REFINE: { text: 'Refine · up to 30 words', tone: 'gold' },
  DISCUSS: { text: 'Discuss', tone: 'magenta' }, VOTE: { text: 'Vote!', tone: 'red' }, UNMASK: { text: 'Unmask', tone: 'red' },
  STEAL: { text: 'The steal', tone: 'gold' }, VERDICT: { text: 'Results', tone: 'cyan' }, SCORES: { text: 'Scores', tone: 'magenta' }, FINAL: { text: 'Final', tone: 'gold' },
};

function PhaseBanner({ phase, banner }: { phase: Phase; banner?: { text: string; tone?: 'magenta' | 'cyan' | 'gold' | 'red' } | null }) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const [show, setShow] = useState<{ text: string; tone: string } | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const b = banner === null ? null : banner || DEFAULT_BANNERS[phase];
    if (!b) return;
    setShow({ text: b.text, tone: b.tone || 'magenta' });
    sfx.play('whoosh');
    const id = setTimeout(() => setShow(null), rm ? 600 : 1100);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [phase]);
  return (
    <div className="phase-banner" aria-live="polite">
      <AnimatePresence>
        {show && (
          <motion.div key={show.text} className={`phase-banner__card phase-banner__card--${show.tone}`} variants={popVariants(rm)} initial="initial" animate="enter" exit="exit">
            {show.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
