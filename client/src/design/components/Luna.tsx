import { motion, useReducedMotion } from 'framer-motion';
import { DETECTIVE } from '@shared/cast';
import type { Round } from '@shared/types';

export const LUNA_IMG = `/cast/${DETECTIVE.slug}.webp`;

/** Inspector Luna, the AI detective, sits at every Prompt-mode table. Shown once a bet is in, so a failed call just means no detective. */
export function LunaChip({ round, phase }: { round: Round; phase: string }) {
  const rm = !!useReducedMotion();
  if (round.mode !== 'prompt' || !round.detectiveIn || !['DISCUSS', 'VOTE'].includes(phase)) return null;
  return (
    <motion.div className="luna-chip" initial={{ opacity: 0, scale: rm ? 1 : 0.8 }} animate={{ opacity: 1, scale: 1 }}>
      <img src={LUNA_IMG} alt="" />
      <span><b>{DETECTIVE.name}</b> has picked a suspect. Can you beat the AI?</span>
    </motion.div>
  );
}
