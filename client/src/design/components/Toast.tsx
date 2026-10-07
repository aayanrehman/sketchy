import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ToastKind, ToastMessage } from '@shared/types';
import { popVariants } from '../motion';
import { useSfx } from '@/sound/useSfx';

interface ToastItem extends ToastMessage { color?: string; icon?: string }
interface Ctx { push: (t: Omit<ToastItem, 'id'> & { id?: string }) => void }
const ToastCtx = createContext<Ctx>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

const ICON: Record<ToastKind, string> = { join: '👋', leave: '🚪', host: '★', streak: '🔥', golden: '✨', info: '💬', fled: '🏃' };
const SOUND: Partial<Record<ToastKind, string>> = { join: 'pop', leave: 'popDown', host: 'chime', streak: 'streak', golden: 'golden', fled: 'thud' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const seen = useRef(new Set<string>());
  const push = useCallback((t: Omit<ToastItem, 'id'> & { id?: string }) => {
    const id = t.id || Math.random().toString(36).slice(2);
    if (seen.current.has(id)) return; seen.current.add(id);
    setItems((xs) => [...xs.slice(-3), { ...t, id }]);
    const s = SOUND[t.kind]; if (s) sfx.play(s as any);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), t.kind === 'golden' ? 4200 : 3200);
  }, [sfx]);
  const ctx = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} className={`toast toast--${t.kind}`} variants={popVariants(rm)} initial="initial" animate="enter" exit="exit" layout="position" style={{ ['--av-color' as any]: t.color }}>
              <span className="toast__icon">{t.icon || ICON[t.kind]}</span>
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
