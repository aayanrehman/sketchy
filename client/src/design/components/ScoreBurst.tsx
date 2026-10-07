import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { dur, durRM, ease } from '../motion';
import { useSfx } from '@/sound/useSfx';

interface Burst { id: string; text: string; x: number; y: number; dx: number; dy: number; big: boolean }
interface Ctx { fly: (text: string, fromEl: Element | null, toEl: Element | null, big?: boolean) => void }
const BurstCtx = createContext<Ctx>({ fly: () => {} });
export const useScoreBurst = () => useContext(BurstCtx);

/**
 * Points fly from a source element (a drawing tile) to a target (an avatar) using transforms only.
 * Positions are read once at launch, then everything is translate/scale/opacity.
 */
export function ScoreBurstLayer({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Burst[]>([]);
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const fly = useCallback((text: string, fromEl: Element | null, toEl: Element | null, big = false) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const a = fromEl?.getBoundingClientRect() || { left: vw / 2 - 20, top: vh / 2, width: 40, height: 20 };
    const b = toEl?.getBoundingClientRect() || { left: vw / 2 - 20, top: 60, width: 40, height: 40 };
    const id = Math.random().toString(36).slice(2);
    const x = a.left + a.width / 2, y = a.top + a.height / 2;
    setItems((xs) => [...xs, { id, text, x, y, dx: b.left + b.width / 2 - x, dy: b.top + b.height / 2 - y, big }]);
    sfx.play(big ? 'coinBig' : 'coin');
    setTimeout(() => setItems((xs) => xs.filter((i) => i.id !== id)), (rm ? durRM.dramatic : dur.dramatic) * 1000 + 300);
  }, [rm, sfx]);
  const ctx = useMemo(() => ({ fly }), [fly]);
  const D = rm ? durRM : dur;
  return (
    <BurstCtx.Provider value={ctx}>
      {children}
      <div className="burst-layer" aria-hidden>
        <AnimatePresence>
          {items.map((b) => (
            <motion.div key={b.id} className={`burst ${b.big ? 'burst--big' : ''}`}
              initial={{ x: b.x, y: b.y, scale: 0.6, opacity: 0, translateX: '-50%', translateY: '-50%' }}
              animate={{ x: [b.x, b.x, b.x + b.dx], y: [b.y, b.y - (rm ? 0 : 30), b.y + b.dy], scale: [0.6, 1.3, 0.5], opacity: [0, 1, 0.9] }}
              exit={{ opacity: 0 }}
              transition={{ duration: D.dramatic, times: [0, 0.35, 1], ease: ease.snap }}
            >{b.text}</motion.div>
          ))}
        </AnimatePresence>
      </div>
    </BurstCtx.Provider>
  );
}
