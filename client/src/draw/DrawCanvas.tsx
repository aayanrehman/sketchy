import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import type { Stroke, Point } from '@shared/types';
import { CANVAS_SIZE, INK_COLORS, BRUSH_SIZES } from '@/design/tokens';
import { paintStrokes } from '@/design/components/SketchCanvas';
import { Button } from '@/design/components';
import { useSfx } from '@/sound/useSfx';
import './draw.css';

export interface DrawHandle { export: () => { strokes: Stroke[]; png: string } }
interface Props { extraColors?: string[]; disabled?: boolean; onStrokeCount?: (n: number) => void }

/** Phone drawing tool: 6 colorblind-safe colors (+ unlocked extras), 2 brush sizes, undo, clear. */
export const DrawCanvas = forwardRef<DrawHandle, Props>(function DrawCanvas({ extraColors = [], disabled, onStrokeCount }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [color, setColor] = useState(INK_COLORS[0]);
  const [size, setSize] = useState(BRUSH_SIZES[0]);
  const [, bump] = useState(0);
  const sfx = useSfx();
  const colors = [...INK_COLORS, ...extraColors];

  const redraw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    paintStrokes(ctx, current.current ? [...strokes.current, current.current] : strokes.current, CANVAS_SIZE);
  }, []);

  useEffect(() => { redraw(); }, [redraw]);

  const pos = (e: PointerEvent | React.PointerEvent): Point => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: Math.round(((e.clientX - r.left) / r.width) * CANVAS_SIZE), y: Math.round(((e.clientY - r.top) / r.height) * CANVAS_SIZE) };
  };
  const drawSegment = (p: Point) => {
    const c = canvasRef.current; const s = current.current; if (!c || !s) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const prev = s.points[s.points.length - 1];
    ctx.strokeStyle = s.color; ctx.lineWidth = s.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    s.points.push(p);
  };
  const onDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = pos(e);
    current.current = { color, size, points: [p] };
    drawSegment({ x: p.x + 0.01, y: p.y });
  };
  const onMove = (e: React.PointerEvent) => { if (!current.current) return; drawSegment(pos(e)); };
  const onUp = () => {
    if (!current.current) return;
    strokes.current.push(current.current); current.current = null;
    onStrokeCount?.(strokes.current.length); bump((n) => n + 1);
  };

  useImperativeHandle(ref, () => ({
    export: () => {
      const c = canvasRef.current!;
      redraw();
      return { strokes: strokes.current, png: strokes.current.length ? c.toDataURL('image/png') : '' };
    },
  }), [redraw]);

  const undo = () => { strokes.current.pop(); redraw(); onStrokeCount?.(strokes.current.length); bump((n) => n + 1); sfx.play('popDown'); };
  const clear = () => { strokes.current = []; redraw(); onStrokeCount?.(0); bump((n) => n + 1); sfx.play('whoosh'); };

  return (
    <div className="draw">
      <canvas
        ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="draw__canvas"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}
        aria-label="Drawing canvas"
      />
      <div className="draw__tools">
        <div className="draw__colors" role="radiogroup" aria-label="Color">
          {colors.map((c) => (
            <button key={c} type="button" className={`draw__color ${c === color ? 'draw__color--on' : ''}`} style={{ ['--ink' as any]: c }} onClick={() => setColor(c)} role="radio" aria-checked={c === color} aria-label={`color ${c}`} />
          ))}
        </div>
        <div className="draw__row">
          <div className="draw__sizes" role="radiogroup" aria-label="Brush size">
            {BRUSH_SIZES.map((s) => (
              <button key={s} type="button" className={`draw__size ${s === size ? 'draw__size--on' : ''}`} onClick={() => setSize(s)} role="radio" aria-checked={s === size} aria-label={`brush ${s === BRUSH_SIZES[0] ? 'thin' : 'thick'}`}>
                <span style={{ width: s, height: s }} />
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={undo} disabled={!strokes.current.length}>Undo</Button>
          <Button variant="ghost" size="sm" onClick={clear} disabled={!strokes.current.length}>Clear</Button>
        </div>
      </div>
    </div>
  );
});
