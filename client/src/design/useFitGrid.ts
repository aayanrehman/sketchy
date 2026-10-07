import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Sizes a grid of square tiles so every tile fits in the space left on screen: picks the column count
 * that gives the biggest tile without scrolling. `reserve` is px to keep free below the grid.
 */
export function useFitGrid(n: number, { gap = 12, reserve = 24, min = 120, max = 420 } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ cols: Math.min(n, 2), size: 240 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el || !n) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = window.innerHeight - el.getBoundingClientRect().top - reserve;
      let best = { cols: 1, size: 0 };
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const size = Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows, max);
        if (size > best.size) best = { cols, size };
      }
      // Too little height (small phones): fall back to two readable columns and let the page scroll.
      if (best.size < min) best = { cols: Math.min(n, 2), size: Math.min(max, (w - gap) / 2) };
      setFit((f) => (f.cols === best.cols && Math.abs(f.size - best.size) < 1 ? f : { cols: best.cols, size: Math.floor(best.size) }));
    };
    measure();
    const late = setTimeout(measure, 450); // re-measure once the phase enter animation has settled
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(late); ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [n, gap, reserve, min, max]);
  const style = { display: 'grid', width: '100%', gap, gridTemplateColumns: `repeat(${fit.cols}, ${fit.size}px)`, justifyContent: 'center' } as const;
  return { ref, style, size: fit.size };
}
