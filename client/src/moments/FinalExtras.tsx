import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Drawing, Round } from '@shared/types';
import { Button, Modal } from '@/design/components';
import { buildResultCard } from '@/share/card';
import type { RoomView } from '@/state/useRoom';
import './final.css';

export interface ReelItem { d: Drawing; r: Round; tag?: string }

/**
 * Coverflow carousel of the game's best images. Auto-advances (pauses on hover, focus, or reduced motion);
 * arrows, dots, swipe and arrow keys all work.
 */
export function HighlightReel({ items, view }: { items: ReelItem[]; view: RoomView }) {
  const rm = !!useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;
  const go = (k: number) => setI(((k % n) + n) % n);
  useEffect(() => { if (rm || paused || n < 2) return; const id = setInterval(() => setI((x) => (x + 1) % n), 3800); return () => clearInterval(id); }, [rm, paused, n]);
  const startX = useRef<number | null>(null);
  if (!n) return null;
  const cur = items[i];
  const name = (id: string) => view.byId.get(id)?.name ?? 'Player';
  return (
    <section className="hreel" aria-roledescription="carousel" aria-label="Highlight reel"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); }}>
      <h2 className="display-sm">Highlight reel</h2>
      <div className="hreel__stage"
        onPointerDown={(e) => { startX.current = e.clientX; }}
        onPointerUp={(e) => { if (startX.current === null) return; const dx = e.clientX - startX.current; startX.current = null; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); }}>
        {items.map((it, k) => {
          let off = k - i; if (off > n / 2) off -= n; if (off < -n / 2) off += n; // shortest way round
          const hidden = Math.abs(off) > 2;
          return (
            <motion.figure key={`${it.r.index}-${it.d.playerId}`} className={`hreel__card ${off === 0 ? 'is-on' : ''}`}
              aria-hidden={off !== 0} onClick={() => off !== 0 && go(k)}
              animate={rm ? { opacity: off === 0 ? 1 : 0, x: 0, scale: 1 } : {
                x: `${off * 62}%`, scale: off === 0 ? 1 : Math.abs(off) === 1 ? 0.78 : 0.6,
                rotateY: off === 0 ? 0 : off < 0 ? 28 : -28, opacity: hidden ? 0 : off === 0 ? 1 : Math.abs(off) === 1 ? 0.75 : 0.35,
                zIndex: 10 - Math.abs(off),
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              style={{ pointerEvents: hidden ? 'none' : 'auto' }}>
              {it.tag && <span className={`hreel__tag ${it.tag === 'Best disguise' ? 'is-imp' : ''}`}>{it.tag}</span>}
              <img src={it.d.glowUrl} alt={`${name(it.d.playerId)}'s image`} draggable={false} />
              {typeof it.d.match === 'number' && it.d.match >= 0 && <span className="hreel__score">{it.d.match}/100</span>}
            </motion.figure>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} className="hreel__caption" initial={{ opacity: 0, y: rm ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} aria-live="polite">
          <b>{name(cur.d.playerId)}{cur.d.playerId === cur.r.imposterId ? <span className="hreel__imp">imposter</span> : null}</b>
          <span>{cur.r.mode === 'prompt' ? (cur.d.finalPrompt ? `“${cur.d.finalPrompt}”` : 'No prompt') : `Drew “${cur.r.realPrompt}”`}</span>
          <small>Round {cur.r.index}</small>
        </motion.div>
      </AnimatePresence>
      <div className="hreel__nav">
        <Button variant="ghost" icon aria-label="Previous" onClick={() => go(i - 1)}>‹</Button>
        <div className="hreel__dots" role="tablist">{items.map((_, k) => <button key={k} role="tab" aria-selected={k === i} aria-label={`Image ${k + 1}`} className={k === i ? 'is-on' : ''} onClick={() => go(k)} />)}</div>
        <Button variant="ghost" icon aria-label="Next" onClick={() => go(i + 1)}>›</Button>
      </div>
    </section>
  );
}

/** "Share your result": a preview of your card with native share, copy image, download and copy-link actions. */
export function ShareDialog({ open, onClose, view }: { open: boolean; onClose: () => void; view: RoomView }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const site = `${location.host}`;
  useEffect(() => {
    if (!open || !view.room) return;
    let alive = true; let made: string | null = null;
    setBlob(null); setUrl(null); setErr(null); setNote(null);
    buildResultCard(view.room, view.byId, view.me?.playerId ?? null, site)
      .then((b) => { if (!alive) return; made = URL.createObjectURL(b); setBlob(b); setUrl(made); })
      .catch(() => alive && setErr('Couldn’t make your card. Try again in a moment.'));
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
    // eslint-disable-next-line
  }, [open]);
  const file = blob ? new File([blob], `sketchy-${view.room?.code || 'result'}.png`, { type: 'image/png' }) : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  const canCopy = !!blob && typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;
  const daily = !!view.room?.daily;
  const myScore = (() => { const me = view.me?.playerId; if (!me) return 0; return Math.max(0, ...(view.room?.rounds || []).flatMap((r) => r.drawings.filter((d) => d.playerId === me).map((d) => (typeof d.match === 'number' ? d.match : 0)))); })();
  const invite = daily ? `${location.origin}/daily` : `${location.origin}/`;
  const shareText = daily ? `I scored ${myScore}/100 on today’s Sketchy target. Beat me:` : 'Can you out-prompt me?';
  const flash = (t: string) => { setNote(t); setTimeout(() => setNote(null), 2200); };
  return (
    <Modal open={open} onClose={onClose} label="Share your result" wide>
      <div className="share">
        <h2 className="display-md">Share your result</h2>
        <div className="share__body">
        <div className="share__preview">
          {url ? <img src={url} alt="Your Sketchy result card" /> : err ? <p className="err">{err}</p> : <div className="share__loading"><i /><span>Making your card…</span></div>}
        </div>
        <div className="share__side">
        <p className="dim" style={{ fontWeight: 800 }}>Your card shows the target next to your image, your prompt, score and awards.</p>
        <div className="share__actions">
          {canShare && <Button variant="gold" size="lg" block onClick={() => navigator.share({ files: [file!], title: 'My Sketchy result', text: shareText, url: invite }).catch(() => {})}>Share…</Button>}
          {canCopy && <Button variant={canShare ? 'ghost' : 'gold'} block onClick={() => navigator.clipboard.write([new ClipboardItem({ 'image/png': blob! })]).then(() => flash('Image copied. Paste it anywhere.')).catch(() => flash('Copy isn’t allowed here. Use Download.'))}>Copy image</Button>}
          <Button variant="ghost" block disabled={!url} onClick={() => { const a = document.createElement('a'); a.href = url!; a.download = file!.name; a.click(); flash('Saved to your downloads.'); }}>Download PNG</Button>
          <Button variant="ghost" block onClick={() => navigator.clipboard?.writeText(daily ? `${shareText} ${invite}` : invite).then(() => flash(daily ? 'Challenge copied. Paste it to a friend.' : 'Link copied. Send it to your friends.')).catch(() => flash(invite))}>{daily ? 'Copy challenge' : 'Copy invite link'}</Button>
        </div>
        <p className="share__note" role="status">{note || ' '}</p>
        </div>
        </div>
      </div>
    </Modal>
  );
}
