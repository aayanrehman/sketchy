/**
 * Procedural "kid doodle" strokes used as placeholder bot content for Demo Mode
 * until real bot sketches are recorded in /studio. Deterministic per seed.
 */
import type { Stroke, Point } from '../shared/types';

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; };
}
const COLORS = ['#111111', '#0072B2', '#E69F00', '#56B4E9', '#009E73', '#D55E00'];

function circle(cx: number, cy: number, r: number, rnd: () => number, jitter = 3): Point[] {
  const pts: Point[] = [];
  const start = rnd() * Math.PI * 2;
  for (let i = 0; i <= 28; i++) {
    const a = start + (i / 28) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r + (rnd() - 0.5) * jitter, y: cy + Math.sin(a) * r + (rnd() - 0.5) * jitter });
  }
  return pts;
}
function line(x1: number, y1: number, x2: number, y2: number, rnd: () => number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push({ x: x1 + (x2 - x1) * t + (rnd() - 0.5) * 4, y: y1 + (y2 - y1) * t + (rnd() - 0.5) * 4 });
  }
  return pts;
}

/** 512x512 canvas space. */
export function doodle(seed: number): Stroke[] {
  const rnd = rng(seed);
  const ink = COLORS[Math.floor(rnd() * COLORS.length)];
  const accent = COLORS[Math.floor(rnd() * COLORS.length)];
  const s: Stroke[] = [];
  const hx = 200 + rnd() * 110, hy = 150 + rnd() * 60, hr = 50 + rnd() * 30;
  s.push({ color: ink, size: 6, points: circle(hx, hy, hr, rnd) });
  // eyes + mouth
  s.push({ color: ink, size: 6, points: circle(hx - hr * 0.35, hy - hr * 0.15, 5, rnd, 1) });
  s.push({ color: ink, size: 6, points: circle(hx + hr * 0.35, hy - hr * 0.15, 5, rnd, 1) });
  s.push({ color: ink, size: 6, points: line(hx - hr * 0.3, hy + hr * 0.35, hx + hr * 0.3, hy + hr * 0.3 + rnd() * 12, rnd) });
  // body
  const by = hy + hr + 90 + rnd() * 40;
  s.push({ color: ink, size: 6, points: line(hx, hy + hr, hx + (rnd() - 0.5) * 20, by, rnd) });
  s.push({ color: ink, size: 6, points: line(hx - 10, hy + hr + 40, hx - 70 - rnd() * 40, hy + hr + 20 + rnd() * 80, rnd) });
  s.push({ color: ink, size: 6, points: line(hx + 10, hy + hr + 40, hx + 70 + rnd() * 40, hy + hr + 20 + rnd() * 80, rnd) });
  s.push({ color: ink, size: 6, points: line(hx, by, hx - 40 - rnd() * 30, by + 70 + rnd() * 30, rnd) });
  s.push({ color: ink, size: 6, points: line(hx, by, hx + 40 + rnd() * 30, by + 70 + rnd() * 30, rnd) });
  // hat / ears / horns
  const k = rnd();
  if (k < 0.33) s.push({ color: accent, size: 6, points: line(hx - hr * 0.6, hy - hr * 0.6, hx - hr * 0.9, hy - hr * 1.4, rnd).concat(line(hx - hr * 0.9, hy - hr * 1.4, hx - hr * 0.2, hy - hr * 0.95, rnd)) });
  else if (k < 0.66) s.push({ color: accent, size: 12, points: line(hx - hr, hy - hr * 0.8, hx + hr, hy - hr * 0.8, rnd) });
  else s.push({ color: accent, size: 6, points: circle(hx + hr * 0.8, hy - hr * 0.9, 14, rnd) });
  // a prop
  const px = 60 + rnd() * 380, py = 330 + rnd() * 120, pw = 40 + rnd() * 80;
  const prop = rnd();
  if (prop < 0.5) s.push({ color: accent, size: 6, points: [...line(px, py, px + pw, py, rnd), ...line(px + pw, py, px + pw, py + pw * 0.6, rnd), ...line(px + pw, py + pw * 0.6, px, py + pw * 0.6, rnd), ...line(px, py + pw * 0.6, px, py, rnd)] });
  else s.push({ color: accent, size: 6, points: circle(px, py, pw * 0.4, rnd) });
  // ground
  s.push({ color: ink, size: 6, points: line(30, 470 + rnd() * 20, 480, 470 + rnd() * 20, rnd) });
  return s;
}
