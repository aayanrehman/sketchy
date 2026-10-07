import { useEffect, useRef, useState } from 'react';
import { Button, Card, DrawingTile } from '@/design/components';
import { DrawCanvas, type DrawHandle } from '@/draw/DrawCanvas';
import type { Drawing } from '@shared/types';

interface PairStatus { id: number; theme: string; real: string; decoy: string; complete: boolean; realCount: number; decoyCount: number }

/** /studio: hidden tool. Draw bot sketches for a prompt pair, run them through the real AI, save as demo content. */
export function Studio() {
  const [key, setKey] = useState(() => { try { return localStorage.getItem('sketchy.studioKey') || ''; } catch { return ''; } });
  const [pairs, setPairs] = useState<PairStatus[]>([]);
  const [aiMode, setAiMode] = useState('');
  const [pairId, setPairId] = useState<number>(1);
  const [slot, setSlot] = useState<'real' | 'decoy'>('real');
  const [preview, setPreview] = useState<Drawing | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const ref = useRef<DrawHandle>(null);
  const headers = { 'Content-Type': 'application/json', 'x-studio-key': key };

  const refresh = async () => {
    const r = await fetch('/api/studio/content', { headers }); const j = await r.json();
    if (!j.ok) { setMsg(j.error || 'Studio locked'); return; }
    setPairs(j.pairs); setAiMode(j.aiMode);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [key]);
  const pair = pairs.find((p) => p.id === pairId);

  const generate = async () => {
    if (!ref.current) return;
    const { strokes, png } = ref.current.export();
    if (!strokes.length) { setMsg('Draw something first.'); return; }
    setBusy(true); setMsg('Running the glow-up and the judge…');
    const r = await fetch('/api/studio/generate', { method: 'POST', headers, body: JSON.stringify({ png, pairId }) });
    const j = await r.json(); setBusy(false);
    if (!j.ok) { setMsg(j.error || 'Failed'); return; }
    setPreview({ playerId: 'studio', strokes, glowUrl: j.glow.glowUrl, glowStatus: j.glow.status, glowMock: !!j.glow.mock, golden: false, judgeStatus: j.judge.status, match: j.judge.status === 'done' ? j.judge.match : -1, sees: j.judge.sees, roast: j.judge.roast, blank: false });
    setMsg(`Glow: ${j.glow.status}${j.glow.reason ? ` (${j.glow.reason})` : ''} · Judge: ${j.judge.status} ${j.judge.match ?? ''}% "${j.judge.roast || ''}"`);
  };
  const save = async () => {
    if (!preview) return;
    const r = await fetch('/api/studio/save', { method: 'POST', headers, body: JSON.stringify({ pairId, slot, drawing: { strokes: preview.strokes, glowUrl: preview.glowStatus === 'done' && !preview.glowMock ? preview.glowUrl : undefined, golden: preview.golden, match: preview.match, sees: preview.sees, roast: preview.roast } }) });
    const j = await r.json(); setMsg(j.ok ? `Saved. ${j.realCount}/3 real, ${j.decoyCount}/1 decoy` : j.error); setPreview(null); refresh();
  };

  return (
    <div className="studio">
      <h1 className="display-lg neon-text">Studio</h1>
      <p className="dim" style={{ fontWeight: 700 }}>Hidden tool. For each prompt pair, record 3 bot sketches of the real prompt and 1 of the decoy. Each runs through the real AI (mode: <b>{aiMode || '?'}</b>) and is saved with its glow-up and score for Demo Mode. Pairs with complete content are preferred by the demo.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="field" style={{ maxWidth: 260 }} placeholder="Studio key (if set)" value={key} onChange={(e) => { setKey(e.target.value); try { localStorage.setItem('sketchy.studioKey', e.target.value); } catch { /* ignore */ } }} />
        <Button variant="ghost" size="sm" onClick={refresh}>Refresh</Button>
      </div>
      <div className="studio__grid">
        <Card>
          <div className="studio__list">
            {pairs.map((p) => <div key={p.id} className={`studio__row ${p.id === pairId ? 'studio__row--on' : ''}`} onClick={() => setPairId(p.id)} role="button" tabIndex={0}><span>{p.id}. {p.real} <span className="mute">/ {p.decoy}</span></span><span>{p.complete ? '✅' : `${p.realCount}/3 · ${p.decoyCount}/1`}</span></div>)}
          </div>
        </Card>
        <Card style={{ display: 'grid', gap: 12 }}>
          {pair && <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant={slot === 'real' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSlot('real')}>Real ({pair.realCount}/3)</Button>
              <Button variant={slot === 'decoy' ? 'danger' : 'ghost'} size="sm" onClick={() => setSlot('decoy')}>Decoy ({pair.decoyCount}/1)</Button>
              <Button variant="ghost" size="sm" onClick={async () => { await fetch('/api/studio/reset', { method: 'POST', headers, body: JSON.stringify({ pairId }) }); refresh(); }}>Reset pair</Button>
            </div>
            <p className="display-sm">Draw: {slot === 'real' ? pair.real : pair.decoy}</p>
            {!preview ? <DrawCanvas ref={ref} /> : <DrawingTile drawing={preview} size={400} />}
            <p className="dim" style={{ fontWeight: 700, minHeight: '1.4em' }}>{msg}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {!preview ? <Button block disabled={busy} onClick={generate}>{busy ? 'Working…' : 'Run AI'}</Button>
                : <><Button variant="lime" block onClick={save}>Save to demo</Button><Button variant="ghost" onClick={() => setPreview(null)}>Redo</Button></>}
            </div>
          </>}
        </Card>
      </div>
      <a href="/" className="mute" style={{ fontWeight: 900 }}>Back to Sketchy</a>
    </div>
  );
}
