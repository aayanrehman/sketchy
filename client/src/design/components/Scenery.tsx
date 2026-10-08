import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Background scenery: drifting clouds and rolling hills drawn with ink outlines.
 * Pure decoration behind every shell; clouds move with transform only.
 */
export function Scenery({ hills = true, density = 3, lively }: { hills?: boolean; density?: number; lively?: boolean }) {
  const rm = !!useReducedMotion();
  if (lively) return <LivelyScenery rm={rm} />;
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

const SPARKS = [
  { x: 8, y: 22, s: 18, d: 0 }, { x: 22, y: 64, s: 12, d: 1.2 }, { x: 38, y: 14, s: 10, d: 2.4 }, { x: 55, y: 70, s: 14, d: 0.6 },
  { x: 68, y: 18, s: 16, d: 1.8 }, { x: 82, y: 58, s: 11, d: 3.0 }, { x: 93, y: 30, s: 15, d: 2.1 }, { x: 47, y: 42, s: 9, d: 3.6 },
];
const SOFT_CLOUDS = [
  { y: 10, w: 220, dur: 95, delay: -10, o: 0.95, layer: 'far' }, { y: 28, w: 300, dur: 70, delay: -40, o: 0.9, layer: 'mid' },
  { y: 54, w: 180, dur: 110, delay: -75, o: 0.8, layer: 'far' }, { y: 18, w: 360, dur: 60, delay: -5, o: 0.85, layer: 'near' },
  { y: 66, w: 260, dur: 80, delay: -55, o: 0.75, layer: 'mid' },
];

/** Home-page sky: soft drifting clouds at three depths, a sun glow, twinkling sparkles and layered hills with gentle pointer parallax. */
function LivelyScenery({ rm }: { rm: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (rm) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
        ref.current?.style.setProperty('--px', x.toFixed(3)); ref.current?.style.setProperty('--py', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', move);
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [rm]);
  return (
    <div className={`scene scene--lively ${rm ? 'scene--still' : ''}`} ref={ref} aria-hidden>
      <div className="sky__sun" />
      {SOFT_CLOUDS.map((c, i) => (
        <div key={i} className={`softcloud softcloud--${c.layer}`} style={{ top: `${c.y}%`, width: c.w, opacity: c.o, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
          <svg viewBox="0 0 200 80"><path d="M30 70 Q8 70 10 52 Q12 36 32 38 Q34 14 62 16 Q80 2 104 14 Q126 4 142 24 Q170 20 174 44 Q194 46 190 62 Q188 72 170 70 Z" /></svg>
        </div>
      ))}
      {SPARKS.map((p, i) => <span key={i} className="spark" style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.s, animationDelay: `${p.d}s` }}>✦</span>)}
      <div className="lhills">
        <svg className="lhills__far" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMax slice">
          <defs><linearGradient id="hf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D6F3C2" /><stop offset="1" stopColor="#BCE9A2" /></linearGradient></defs>
          <path d="M-40 120 C 150 70, 330 72, 480 104 S 780 150, 960 96 S 1160 64, 1240 84 L1240 260 L-40 260 Z" fill="url(#hf)" />
          <path d="M-40 120 C 150 70, 330 72, 480 104 S 780 150, 960 96 S 1160 64, 1240 84" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="3" />
        </svg>
        <svg className="lhills__mid" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMax slice">
          <defs><linearGradient id="hm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BDEFA0" /><stop offset=".6" stopColor="#A2E27F" /><stop offset="1" stopColor="#8FD66B" /></linearGradient></defs>
          <path d="M-40 160 C 160 112, 380 118, 580 150 S 960 182, 1240 128 L1240 260 L-40 260 Z" fill="url(#hm)" />
          <path d="M-40 160 C 160 112, 380 118, 580 150 S 960 182, 1240 128" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="3" />
        </svg>
        <svg className="lhills__near" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMax slice">
          <defs><linearGradient id="hn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ACEB86" /><stop offset=".55" stopColor="#8EDB65" /><stop offset="1" stopColor="#74C952" /></linearGradient></defs>
          <path d="M-40 196 C 220 168, 470 172, 720 192 S 1080 204, 1240 182 L1240 260 L-40 260 Z" fill="url(#hn)" />
          <path d="M-40 196 C 220 168, 470 172, 720 192 S 1080 204, 1240 182" fill="none" stroke="rgba(255,255,255,.65)" strokeWidth="3" />
          <g fill="none" stroke="#5FB842" strokeWidth="2.5" strokeLinecap="round">
            {[90, 260, 410, 640, 870, 1040, 1150].map((x, i) => <path key={i} d={`M${x} ${212 + (i % 3) * 6} q -3 -9 -7 -12 M${x} ${212 + (i % 3) * 6} q 0 -11 1 -15 M${x} ${212 + (i % 3) * 6} q 4 -8 8 -11`} />)}
          </g>
          {[[170, 214, '#FFFFFF'], [340, 222, '#FF9EC4'], [520, 216, '#FFE066'], [760, 222, '#FFFFFF'], [960, 216, '#FF9EC4'], [1100, 224, '#FFE066']].map(([x, y, c], i) => (
            <g key={i} transform={`translate(${x} ${y})`}><circle r="4.5" fill={c as string} /><circle r="1.8" fill="#FFC83D" /></g>
          ))}
        </svg>
      </div>
    </div>
  );
}
