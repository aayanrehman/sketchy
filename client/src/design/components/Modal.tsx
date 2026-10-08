import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { popVariants, t } from '../motion';

export function Modal({ open, onClose, children, label, wide }: { open: boolean; onClose?: () => void; children: ReactNode; label: string; wide?: boolean }) {
  const rm = !!useReducedMotion();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]') || []);
    (focusable()[0] || dialog.current)?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && close.current) { e.preventDefault(); close.current(); }
      if (e.key !== 'Tab') return;
      const items = focusable(); const first = items[0]; const last = items.at(-1);
      if (!first) { e.preventDefault(); dialog.current?.focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  // Portaled to <body> so no header or stacking context inside the page can cover it.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t.base(rm)} onClick={onClose} role="presentation">
          <motion.div ref={dialog} tabIndex={-1} className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={label} variants={popVariants(rm)} initial="initial" animate="enter" exit="exit" onClick={(e) => e.stopPropagation()}>
            {onClose && <div className="modal__controls"><Button variant="ghost" size="sm" onClick={onClose} aria-label={`Close ${label}`}>Close <span aria-hidden>×</span></Button></div>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
