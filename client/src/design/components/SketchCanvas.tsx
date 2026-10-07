import { useEffect, useRef } from 'react';
import type { Stroke } from '@shared/types';
import { CANVAS_SIZE } from '../tokens';
import { color } from '../tokens';

/** Draws vector strokes onto a canvas. Used for replay in tiles, thumbnails, share cards. */
export function paintStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], size: number, bg = color.paper) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
  const k = size / CANVAS_SIZE;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of strokes) {
    if (!s.points.length) continue;
    ctx.strokeStyle = s.color; ctx.lineWidth = s.size * k;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x * k, s.points[0].y * k);
    if (s.points.length === 1) ctx.lineTo(s.points[0].x * k + 0.1, s.points[0].y * k);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x * k, s.points[i].y * k);
    ctx.stroke();
  }
}

export function SketchCanvas({ strokes, size = 256, className = '' }: { strokes: Stroke[]; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    paintStrokes(ctx, strokes, size);
  }, [strokes, size]);
  return <canvas ref={ref} width={size} height={size} className={className} aria-hidden />;
}
