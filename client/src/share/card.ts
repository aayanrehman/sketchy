import type { Drawing, Player } from '@shared/types';
import { paintStrokes } from '@/design/components/SketchCanvas';
import { color } from '@/design/tokens';

/** Shareable result card PNG: the round's gallery, who the imposter was, the game URL. */
export async function buildShareCard(args: { drawings: Drawing[]; players: Map<string, Player>; imposterId: string; prompt: string; url: string }): Promise<string> {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, color.sky); g.addColorStop(1, color.sky2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = '700 100px Fredoka, "Arial Rounded MT Bold", sans-serif'; ctx.lineWidth = 10; ctx.strokeStyle = color.ink; ctx.lineJoin = 'round'; ctx.strokeText('SKETCHY', W / 2, 130); ctx.fillStyle = color.yellow; ctx.fillText('SKETCHY', W / 2, 130);
  ctx.font = '800 40px Nunito, sans-serif'; ctx.fillStyle = color.ink; ctx.fillText(`"${args.prompt}"`, W / 2, 200);
  const n = args.drawings.length; const cols = n <= 4 ? 2 : 3; const rows = Math.ceil(n / cols);
  const gap = 30; const tile = Math.min((W - 120 - gap * (cols - 1)) / cols, (H - 500 - gap * (rows - 1)) / rows);
  const x0 = (W - (tile * cols + gap * (cols - 1))) / 2; const y0 = 250;
  const loads: Promise<void>[] = [];
  args.drawings.forEach((d, i) => {
    const x = x0 + (i % cols) * (tile + gap), y = y0 + Math.floor(i / cols) * (tile + gap);
    const p = args.players.get(d.playerId);
    const isImp = d.playerId === args.imposterId;
    const draw = (img?: HTMLImageElement) => {
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, tile, tile, 28); ctx.clip();
      if (img) ctx.drawImage(img, x, y, tile, tile);
      else { const t = document.createElement('canvas'); t.width = t.height = tile; paintStrokes(t.getContext('2d')!, d.strokes, tile); ctx.drawImage(t, x, y); }
      ctx.restore();
      ctx.lineWidth = 8; ctx.strokeStyle = d.golden ? color.gold : isImp ? color.red : color.ink; ctx.beginPath(); ctx.roundRect(x, y, tile, tile, 28); ctx.stroke();
      ctx.fillStyle = color.surface; ctx.strokeStyle = color.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x + 14, y + tile - 56, Math.min(tile - 28, 60 + (p?.name.length || 4) * 18), 42, 21); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color.ink; ctx.textAlign = 'left'; ctx.font = '900 26px Nunito, sans-serif'; ctx.fillText(`${p?.avatar || ''} ${p?.name || ''}`, x + 26, y + tile - 26);
      if (typeof d.match === 'number' && d.match >= 0) { ctx.textAlign = 'right'; ctx.fillStyle = color.ink; ctx.font = '700 34px Fredoka, sans-serif'; ctx.fillText(`${d.match}%`, x + tile - 18, y + 48); }
      if (isImp) {
        ctx.save(); ctx.translate(x + tile / 2, y + tile / 2); ctx.rotate(-0.2);
        ctx.font = '700 56px Fredoka, sans-serif'; ctx.lineWidth = 8; ctx.strokeStyle = color.red; ctx.fillStyle = color.surface;
        ctx.beginPath(); ctx.roundRect(-190, -50, 380, 100, 16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = color.red; ctx.textAlign = 'center'; ctx.fillText('IMPOSTER!', 0, 20); ctx.restore();
      }
    };
    if (d.glowUrl && d.glowStatus === 'done') {
      loads.push(new Promise((res) => { const img = new Image(); img.onload = () => { draw(img); res(); }; img.onerror = () => { draw(); res(); }; img.src = d.glowUrl!; }));
    } else draw();
  });
  await Promise.all(loads);
  ctx.fillStyle = color.ink; ctx.textAlign = 'center'; ctx.font = '700 44px Fredoka, sans-serif'; ctx.fillText('One of you is drawing something different.', W / 2, H - 120);
  ctx.fillStyle = color.textDim; ctx.font = '800 36px Nunito, sans-serif'; ctx.fillText(args.url, W / 2, H - 60);
  return c.toDataURL('image/png');
}

export function downloadDataUrl(url: string, name: string) {
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
