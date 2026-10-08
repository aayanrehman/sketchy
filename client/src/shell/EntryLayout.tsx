import type { FormEvent, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Mascot, Scenery, SoundControl } from '@/design/components';
import type { MascotMood } from '@/design/components/Mascot';
import { childVariants, phaseVariants } from '@/design/motion';

/** Shared look for the pre-game pages (join, solo setup): the home page's sky, the brand row, one clear card. */
export function EntryLayout({ title, subtitle, mood = 'happy', onSubmit, children }: { title: string; subtitle?: ReactNode; mood?: MascotMood; onSubmit: () => void; children: ReactNode }) {
  const rm = !!useReducedMotion();
  return (
    <div className="landing entry">
      <div className="corner-sound"><SoundControl /></div>
      <Scenery lively />
      <motion.form className="entry__inner" variants={phaseVariants(rm)} initial="initial" animate="enter" onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit(); }}>
        <motion.div className="landing__brand" variants={childVariants(rm)}><Mascot mood={mood} size={96} float /><span className="landing__logo gold-text">SKETCHY</span></motion.div>
        <motion.div className="entry__card" variants={childVariants(rm)}>
          <h1 className="entry__title">{title}</h1>
          {subtitle && <p className="entry__sub">{subtitle}</p>}
          {children}
        </motion.div>
        <motion.a href="/" className="entry__back" variants={childVariants(rm)}>← Back to home</motion.a>
      </motion.form>
    </div>
  );
}
