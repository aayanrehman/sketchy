import { motion, useReducedMotion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { t } from '../motion';

type Variant = 'primary' | 'secondary' | 'lime' | 'ghost' | 'danger' | 'gold';
interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  variant?: Variant; size?: 'sm' | 'md' | 'lg'; block?: boolean; icon?: boolean; children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', block, icon, className = '', children, ...rest }: Props) {
  const rm = !!useReducedMotion();
  return (
    <motion.button
      type="button"
      className={`btn btn--${variant} ${size !== 'md' ? `btn--${size}` : ''} ${block ? 'btn--block' : ''} ${icon ? 'btn--icon' : ''} ${className}`}
      whileTap={rest.disabled ? undefined : { scale: rm ? 1 : 0.94 }}
      whileHover={rest.disabled || rm ? undefined : { scale: 1.03 }}
      transition={t.snap(rm)}
      {...(rest as any)}
    >
      {variant === 'primary' && <span className="btn__shine" aria-hidden />}
      {children}
    </motion.button>
  );
}
