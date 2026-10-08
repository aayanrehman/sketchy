import type { Drawing, Player, PublicRoom } from '@shared/types';
import { paintStrokes } from '@/design/components/SketchCanvas';
import { color } from '@/design/tokens';

const W = 1080, H = 1350;
const DISPLAY = '700 {s}px Fredoka, "Arial Rounded MT Bold", sans-serif';
const BODY = '{w} {s}px Nunito, sans-serif';
const font = (tpl: string, s: number, w = 800) => tpl.replace('{s}', String(s)).replace('{w}', String(w));

/** Loads an image for canvas drawing. crossOrigin keeps the canvas exportable for AI images served from Convex storage. */
function load(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((res) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    const t = setTimeout(() => res(null), 6000);
    img.onload = () => { clearTimeout(t); res(img); }; img.onerror = () => { clearTimeout(t); res(null); };
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = w; if (lines.length === maxLines) break; } else line = next;
  }
  if (lines.length < maxLines && line) lines.push(line);
  else if (line && lines.length === maxLines) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…');
  return lines;
}

function tileImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, d: Drawing | null, x: number, y: number, s: number, border: string, label?: string) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, s, s, 32); ctx.fillStyle = color.paper; ctx.fill(); ctx.clip();
  if (img) ctx.drawImage(img, x, y, s, s);
  else if (d?.strokes?.length) { const t = document.createElement('canvas'); t.width = t.height = s; paintStrokes(t.getContext('2d')!, d.strokes, s); ctx.drawImage(t, x, y); }
  ctx.restore();
  ctx.lineWidth = 8; ctx.strokeStyle = border; ctx.beginPath(); ctx.roundRect(x, y, s, s, 32); ctx.stroke();
  if (label) {
    ctx.font = font(BODY, 26, 900); const w = ctx.measureText(label).width + 36;
    ctx.fillStyle = color.surface; ctx.strokeStyle = color.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x + 16, y + 16, w, 46, 23); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color.ink; ctx.textAlign = 'left'; ctx.fillText(label, x + 34, y + 48);
  }
}

/**
 * A personal result card (1080×1350, portrait for socials): your best moment of the game,
 * next to the target in prompt mode, with your prompt, score, rank and awards, plus an invite to play.
 */
export async function buildResultCard(room: PublicRoom, players: Map<string, Player>, meId: string | null, site: string): Promise<Blob> {
  await document.fonts.ready;
  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  const hero = (meId && players.get(meId)) || ranked[0];
  const rank = 1 + ranked.filter((p) => p.score > (hero?.score ?? 0)).length;
  // Your best scored image across the game (falls back to any image you made).
  const mine = room.rounds.flatMap((r) => r.drawings.filter((d) => d.playerId === hero?.id && !d.blank).map((d) => ({ d, r })));
  mine.sort((a, b) => (b.d.match ?? -1) - (a.d.match ?? -1));
  const best = mine[0];
  const prompt = best?.r.mode === 'prompt';
  const [heroImg, targetImg, mascot] = await Promise.all([
    load(best?.d.glowStatus === 'done' ? best.d.glowUrl : undefined), load(prompt ? best?.r.targetUrl : undefined), load('/mascot/happy.webp'),
  ]);

  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, color.sky); g.addColorStop(1, color.sky2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color.grass; ctx.strokeStyle = color.ink; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, H - 150); ctx.bezierCurveTo(300, H - 230, 760, H - 100, W, H - 200); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill(); ctx.stroke();

  // Header: logo, mascot, who and how they did.
  ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  ctx.font = font(DISPLAY, 92); ctx.lineWidth = 12; ctx.strokeStyle = color.ink; ctx.strokeText('SKETCHY', 60, 120); ctx.fillStyle = color.yellow; ctx.fillText('SKETCHY', 60, 120);
  if (mascot) ctx.drawImage(mascot, W - 190, 20, 150, 150);
  ctx.fillStyle = color.ink; ctx.font = font(DISPLAY, 50);
  ctx.fillText(`${hero?.name ?? 'Player'} · #${rank} of ${ranked.length}`, 60, 200);
  ctx.font = font(BODY, 32, 900); ctx.fillStyle = color.textDim;
  ctx.fillText(`${hero?.score ?? 0} points${room.isDemo ? ' · solo practice vs bots' : ''}`, 60, 246);

  // Hero images.
  const top = 290;
  if (prompt) {
    const s = 450, gap = 60, x0 = (W - (s * 2 + gap)) / 2;
    tileImage(ctx, targetImg, null, x0, top, s, color.ink, 'Target');
    const score = typeof best?.d.match === 'number' && best.d.match >= 0 ? `Mine · ${best.d.match}/100` : 'Mine';
    tileImage(ctx, heroImg, best?.d ?? null, x0 + s + gap, top, s, best?.d.golden ? color.gold : color.ink, score);
    // Arrow between them.
    ctx.fillStyle = color.ink; ctx.font = font(DISPLAY, 60); ctx.textAlign = 'center'; ctx.fillText('→', W / 2, top + s / 2 + 20);
  } else {
    const s = 560;
    const score = typeof best?.d.match === 'number' && best.d.match >= 0 ? `${best.d.match}/100 match` : undefined;
    tileImage(ctx, heroImg, best?.d ?? null, (W - s) / 2, top, s, best?.d.golden ? color.gold : color.ink, score);
  }

  // The prompt (yours in prompt mode; the round's in sketch mode).
  const quote = prompt ? best?.d.finalPrompt : best?.r.realPrompt;
  let y = prompt ? top + 450 + 80 : top + 560 + 70;
  if (quote) {
    ctx.textAlign = 'center'; ctx.fillStyle = color.ink; ctx.font = font(DISPLAY, 40);
    for (const l of wrap(ctx, `“${quote}”`, W - 160, 3)) { ctx.fillText(l, W / 2, y); y += 50; }
  }
  // Awards earned.
  const awards = room.finalAwards.filter((a) => a.playerId === hero?.id).map((a) => a.title);
  if (awards.length) {
    y += 16; ctx.font = font(BODY, 30, 900);
    const pills = awards.slice(0, 3); const widths = pills.map((a) => ctx.measureText(`★ ${a}`).width + 40);
    let x = (W - (widths.reduce((a, b) => a + b, 0) + 16 * (pills.length - 1))) / 2;
    pills.forEach((a, i) => {
      ctx.fillStyle = color.gold2; ctx.strokeStyle = color.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x, y - 36, widths[i], 52, 26); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color.ink; ctx.textAlign = 'left'; ctx.fillText(`★ ${a}`, x + 20, y); x += widths[i] + 16;
    });
  }

  // Footer invite.
  ctx.textAlign = 'center'; ctx.fillStyle = color.ink; ctx.font = font(DISPLAY, 46);
  ctx.fillText(prompt ? 'Can you out-prompt me?' : 'Can you spot the imposter?', W / 2, H - 92);
  ctx.font = font(BODY, 34, 900); ctx.fillStyle = color.textDim; ctx.fillText(site, W / 2, H - 42);

  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('export failed'))), 'image/png'));
}
