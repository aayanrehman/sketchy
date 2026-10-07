/**
 * Motion tokens, as code. 3 durations, 3 easings, stagger values.
 * Every animation in the app imports from here. `rm` variants are the calm versions
 * used when the viewer prefers reduced motion.
 */
import type { Transition, Variants } from 'framer-motion';

export const dur = { fast: 0.16, base: 0.32, dramatic: 0.9 } as const;
export const durRM = { fast: 0.08, base: 0.16, dramatic: 0.3 } as const;
export const ease = {
  snap: [0.2, 0, 0, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
  smooth: [0.4, 0, 0.2, 1] as const,
};
export const stagger = { sm: 0.04, md: 0.08, lg: 0.14 } as const;

export function tokens(reduced: boolean) {
  const d = reduced ? durRM : dur;
  const e = reduced ? { ...ease, bounce: ease.snap } : ease;
  const s = reduced ? { sm: 0, md: 0, lg: 0 } : stagger;
  return { d, e, s };
}

/** Transition presets. */
export const t = {
  snap: (reduced = false): Transition => ({ duration: tokens(reduced).d.fast, ease: ease.snap }),
  base: (reduced = false): Transition => ({ duration: tokens(reduced).d.base, ease: ease.smooth }),
  bounce: (reduced = false): Transition => ({ duration: tokens(reduced).d.base, ease: tokens(reduced).e.bounce }),
  dramatic: (reduced = false): Transition => ({ duration: tokens(reduced).d.dramatic, ease: ease.smooth }),
  layout: (reduced = false): Transition => ({ type: 'spring', stiffness: reduced ? 400 : 320, damping: reduced ? 40 : 26, mass: 0.8 }),
};

/** The one phase hand-off pattern: rise in, lift out. Children stagger via `staggerChildren`. */
export const phaseVariants = (reduced: boolean): Variants => ({
  initial: { opacity: 0, y: reduced ? 0 : 28, scale: reduced ? 1 : 0.98 },
  enter: { opacity: 1, y: 0, scale: 1, transition: { duration: tokens(reduced).d.base, ease: ease.smooth, when: 'beforeChildren', staggerChildren: tokens(reduced).s.md } },
  exit: { opacity: 0, y: reduced ? 0 : -24, scale: reduced ? 1 : 0.98, transition: { duration: tokens(reduced).d.fast, ease: ease.snap } },
});

export const childVariants = (reduced: boolean): Variants => ({
  initial: { opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.96 },
  enter: { opacity: 1, y: 0, scale: 1, transition: { duration: tokens(reduced).d.base, ease: tokens(reduced).e.bounce } },
  exit: { opacity: 0, transition: { duration: tokens(reduced).d.fast } },
});

/** Stamp slam: huge and transparent, slams down with bounce, slight tilt. */
export const stampVariants = (reduced: boolean): Variants => ({
  initial: { opacity: 0, scale: reduced ? 1.1 : 3, rotate: reduced ? 0 : -14 },
  enter: { opacity: 1, scale: 1, rotate: -8, transition: { duration: tokens(reduced).d.base, ease: tokens(reduced).e.bounce } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: tokens(reduced).d.fast } },
});

export const popVariants = (reduced: boolean): Variants => ({
  initial: { opacity: 0, scale: reduced ? 1 : 0.8, y: reduced ? 0 : 12 },
  enter: { opacity: 1, scale: 1, y: 0, transition: { duration: tokens(reduced).d.base, ease: tokens(reduced).e.bounce } },
  exit: { opacity: 0, scale: reduced ? 1 : 0.9, transition: { duration: tokens(reduced).d.fast, ease: ease.snap } },
});
