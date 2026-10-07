import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import type { Stroke, Point } from '@shared/types';
import { CANVAS_SIZE, INK_COLORS, BRUSH_SIZES, UNLOCK_COLORS } from '@/design/tokens';
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

  const radioKey = (e: React.KeyboardEvent<HTMLButtonElement>, index: number, count: number, choose: (i: number) => void) => {
    const direction = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
    if (!direction && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : (index + direction + count) % count;
    choose(next);
    (e.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
  };


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
    if (disabled || !e.isPrimary || current.current) return;
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
      // The round can end while a finger is still on the canvas.
      if (current.current) { strokes.current.push(current.current); current.current = null; }
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
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp}
        aria-label="Drawing canvas"
      />
      <div className="draw__tools">
        <div className="draw__colors" role="radiogroup" aria-label="Color">
          {colors.map((c, i) => (
            <button key={c} type="button" className={`draw__color ${c === color ? 'draw__color--on' : ''}`} style={{ ['--ink' as any]: c }} disabled={disabled} tabIndex={c === color ? 0 : -1} onKeyDown={(e) => radioKey(e, i, colors.length, (n) => setColor(colors[n]))} onClick={() => setColor(c)} role="radio" aria-checked={c === color} aria-label={`${['Black', 'Blue', 'Amber', 'Sky blue', 'Green', 'Orange'][i] || UNLOCK_COLORS.find(u => u.color === c)?.name || c} ink`} />
          ))}
        </div>
        <div className="draw__row">
          <div className="draw__sizes" role="radiogroup" aria-label="Brush size">
            {BRUSH_SIZES.map((s, i) => (
              <button key={s} type="button" className={`draw__size ${s === size ? 'draw__size--on' : ''}`} disabled={disabled} tabIndex={s === size ? 0 : -1} onKeyDown={(e) => radioKey(e, i, BRUSH_SIZES.length, (n) => setSize(BRUSH_SIZES[n]))} onClick={() => setSize(s)} role="radio" aria-checked={s === size} aria-label={`brush ${s === BRUSH_SIZES[0] ? 'thin' : 'thick'}`}>
                <span style={{ width: s, height: s }} />
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={undo} disabled={disabled || !strokes.current.length}>Undo</Button>
          <Button variant="ghost" size="sm" onClick={clear} disabled={disabled || !strokes.current.length}>Clear</Button>
        </div>
      </div>
    </div>
  );
});
