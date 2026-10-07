import { motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { stampVariants } from '../motion';
import { useSfx } from '@/sound/useSfx';

type Kind = 'imposter' | 'innocent' | 'escaped' | 'stolen';
const TEXT: Record<Kind, string> = { imposter: 'Imposter!', innocent: 'Innocent!', escaped: 'Escaped!', stolen: 'Stolen!' };

/** Rubber stamp that slams in with the stamp sound. Pass `sm` for tile-sized stamps. */
export function Stamp({ kind, sm, sound = true, text }: { kind: Kind; sm?: boolean; sound?: boolean; text?: string }) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  useEffect(() => { if (sound) sfx.play('stamp'); if (navigator.vibrate) navigator.vibrate(kind === 'imposter' ? [60, 40, 120] : 60); /* eslint-disable-next-line */ }, []);
  return (
    <motion.div className={`stamp stamp--${kind} ${sm ? 'stamp--sm' : ''}`} variants={stampVariants(rm)} initial="initial" animate="enter" exit="exit" role="status">
      {text || TEXT[kind]}
    </motion.div>
  );
}
