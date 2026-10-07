import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Phase } from '@shared/types';
import { childVariants, phaseVariants, popVariants } from '@/design/motion';
import { useSfx } from '@/sound/useSfx';

/**
 * THE phase transition system. Every screen is a child keyed by phase:
 * exit lifts away (fast/snap) -> title card slams (bounce) -> new screen rises (base/smooth) with staggered children.
 * Shared elements (Avatar, DrawingTile, Timer) carry layoutIds inside one LayoutGroup so they glide between phases.
 * The stage never blocks input: the title card is pointer-events: none and lives on its own layer.
 */
export function PhaseStage({ phase, children, narrow, banner }: { phase: Phase; children: ReactNode; narrow?: boolean; banner?: { text: string; tone?: 'magenta' | 'cyan' | 'gold' | 'red' } | null }) {
  const rm = !!useReducedMotion();
  return (
    <LayoutGroup>
      <PhaseBanner phase={phase} banner={banner} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.section key={phase} className={`phase ${narrow ? 'phase--narrow' : ''}`} variants={phaseVariants(rm)} initial="initial" animate="enter" exit="exit">
          {children}
        </motion.section>
      </AnimatePresence>
    </LayoutGroup>
  );
}

/** Use inside a PhaseStage for staggered children. */
export function Rise({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const rm = !!useReducedMotion();
  return <motion.div className={className} style={style} variants={childVariants(rm)}>{children}</motion.div>;
}

const DEFAULT_BANNERS: Partial<Record<Phase, { text: string; tone?: 'magenta' | 'cyan' | 'gold' | 'red' }>> = {
  PROMPT: { text: 'Secret prompt', tone: 'magenta' }, DRAW: { text: 'Draw!', tone: 'cyan' }, GALLERY: { text: 'Glow-up', tone: 'gold' },
  DISCUSS: { text: 'Discuss', tone: 'magenta' }, VOTE: { text: 'Vote!', tone: 'red' }, UNMASK: { text: 'Unmask', tone: 'red' },
  STEAL: { text: 'The steal', tone: 'gold' }, VERDICT: { text: 'AI verdict', tone: 'cyan' }, SCORES: { text: 'Scores', tone: 'magenta' }, FINAL: { text: 'Final', tone: 'gold' },
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
