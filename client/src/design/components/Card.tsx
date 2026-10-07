import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props extends HTMLMotionProps<'div'> { variant?: 'default' | 'flat' | 'neon' | 'cyan' | 'gold'; padLg?: boolean; children?: ReactNode }
export function Card({ variant = 'default', padLg, className = '', children, ...rest }: Props) {
  return (
    <motion.div className={`card ${variant !== 'default' ? `card--${variant}` : ''} ${padLg ? 'card--pad-lg' : ''} ${className}`} {...rest}>
      {children}
    </motion.div>
  );
}
