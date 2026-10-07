import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { popVariants, t } from '../motion';

export function Modal({ open, onClose, children, label }: { open: boolean; onClose?: () => void; children: ReactNode; label: string }) {
  const rm = !!useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t.base(rm)} onClick={onClose} role="presentation">
          <motion.div className="modal" role="dialog" aria-modal="true" aria-label={label} variants={popVariants(rm)} initial="initial" animate="enter" exit="exit" onClick={(e) => e.stopPropagation()}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
