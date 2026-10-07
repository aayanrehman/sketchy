import { useReducedMotion } from 'framer-motion';

/**
 * Background scenery: drifting clouds and rolling hills drawn with ink outlines.
 * Pure decoration behind every shell; clouds move with transform only.
 */
export function Scenery({ hills = true, density = 3 }: { hills?: boolean; density?: number }) {
  const rm = !!useReducedMotion();
  const clouds = [
    { left: '-4%', top: '48%', scale: 0.7, delay: 0 },
    { left: '90%', top: '37%', scale: 0.9, delay: -8 },
    { left: '92%', top: '70%', scale: 0.5, delay: -16 },
    { left: '-5%', top: '76%', scale: 0.45, delay: -4 },
  ].slice(0, density);
  return (
    <div className="scene" aria-hidden>
      {clouds.map((c, i) => (
        <div key={i} className={`scene__cloud ${rm ? '' : 'scene__cloud--drift'}`} style={{ left: c.left, top: c.top, transform: `scale(${c.scale})`, animationDelay: `${c.delay}s`, transformOrigin: 'center' }}>
          <span className="scene__cloud-mask" />
        </div>
      ))}
      {hills && (
        <div className="scene__hills">
          <svg viewBox="0 0 1200 180" preserveAspectRatio="none">
            <path d="M-20 120 C 120 40, 300 40, 420 110 S 700 150, 860 90 S 1100 40, 1220 110 L1220 200 L-20 200 Z" fill="var(--c-hill)" stroke="var(--c-ink)" strokeWidth="3" />
            <path d="M-20 150 C 200 100, 380 120, 560 150 S 900 170, 1220 140 L1220 200 L-20 200 Z" fill="var(--c-grass)" stroke="var(--c-ink)" strokeWidth="3" />
          </svg>
        </div>
      )}
    </div>
  );
}
