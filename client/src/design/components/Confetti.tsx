import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { confettiPalette } from '../tokens';

/** Canvas confetti. Reduced motion: a brief, slow sprinkle instead of a storm. */
export function Confetti({ burst, gold }: { burst: number; gold?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rm = !!useReducedMotion();
  useEffect(() => {
    if (!burst || rm) return;
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = window.innerWidth * dpr; c.height = window.innerHeight * dpr;
    const W = c.width, H = c.height;
    const N = rm ? 40 : 160;
    const palette = gold ? ['#FFC83D', '#FFE27A', '#FF9F1C', '#FFFFFF'] : confettiPalette;
    const ps = Array.from({ length: N }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: H * 0.3, vx: (Math.random() - 0.5) * (rm ? 4 : 18) * dpr, vy: (-(Math.random() * (rm ? 6 : 18)) - 4) * dpr,
      w: (6 + Math.random() * 8) * dpr, h: (4 + Math.random() * 6) * dpr, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, c: palette[Math.floor(Math.random() * palette.length)], life: 1,
    }));
    let raf = 0; const t0 = performance.now(); const dur = rm ? 1200 : 2600;
    const step = (now: number) => {
      const p = (now - t0) / dur;
      ctx.clearRect(0, 0, W, H);
      for (const q of ps) {
        q.vy += 0.5 * dpr; q.x += q.vx; q.y += q.vy; q.vx *= 0.98; q.r += q.vr; q.life = 1 - p;
        ctx.save(); ctx.globalAlpha = Math.max(0, q.life); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillStyle = q.c; ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); ctx.restore();
      }
      if (p < 1) raf = requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [burst, rm, gold]);
  return <canvas ref={ref} className="confetti" aria-hidden />;
}
