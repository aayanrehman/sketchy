import { useEffect, useState } from 'react';
import { PhoneShell } from '@/shell/PhoneShell';
import { MainShell } from '@/shell/MainShell';
import { PhaseStage } from '@/shell/PhaseStage';
import { useRoom } from '@/state/useRoom';
import { socket, loadName, saveName } from '@/net/socket';
import { unlockAudio } from '@/sound/sfx';
import { Button, Card, Mascot, Scenery } from '@/design/components';
import { HowToPhone, HowToMain } from '@/moments/HowToPhase';
import { PromptPhone, PromptMain } from '@/moments/Prompt';
import { DrawPhone, DrawMain } from '@/moments/Draw';
import { GalleryPhone, GalleryMain } from '@/moments/Gallery';
import { UnmaskMoment } from '@/moments/Unmask';
import { StealMoment } from '@/moments/Steal';
import { VerdictMoment } from '@/moments/Verdict';
import { ScoresMoment } from '@/moments/Scores';
import { FinalMoment } from '@/moments/Final';

/**
 * /demo: "Try it solo". One human + 3 bots, two rounds (artist, then imposter), in one tab.
 * On wide screens the main-screen stage sits beside the phone so a judge sees both views.
 */
export function Demo() {
  const view = useRoom();
  const [name, setName] = useState(loadName() || '');
  const [started, setStarted] = useState(false);
  const [aiMode, setAiMode] = useState('loading');
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/health').then((r) => r.json()).then((r) => setAiMode(r.aiMode)).catch(() => setAiMode('unavailable')); }, []);
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => { const m = window.matchMedia('(min-width: 1024px)'); const h = () => setWide(m.matches); m.addEventListener('change', h); return () => m.removeEventListener('change', h); }, []);

  useEffect(() => {
    const s = socket();
    const rejoin = () => {
      try {
        const saved = sessionStorage.getItem('sketchy.demo'); if (!saved) return;
        const { code, token } = JSON.parse(saved);
        s.timeout(10000).emit('join', { code, token, name: loadName() || 'You' }, (err, r) => {
          if (!err && r?.ok) { setStarted(true); setError(''); }
          else { setStarted(false); try { sessionStorage.removeItem('sketchy.demo'); } catch {} }
        });
      } catch { /* Storage is optional; the game still works. */ }
    };
    s.on('connect', rejoin); if (s.connected) rejoin();
    return () => { s.off('connect', rejoin); };
  }, []);

  const start = () => {
    unlockAudio(); const n = name.trim() || 'You'; saveName(n); setStarted(true);
    const s = socket();
    try { sessionStorage.removeItem('sketchy.demo'); } catch {}
    s.timeout(10000).emit('demo:create', { name: n }, (err, r) => { if (err || !r?.ok) { setStarted(false); setError('Could not start the demo. Please try again.'); } else { try { sessionStorage.setItem('sketchy.demo', JSON.stringify({ code: r.code, token: r.token })); } catch {} } });
  };

  if (!started || !view.room || !view.me) {
    return (
      <div className="landing">
        <Scenery density={3} />
        <form className="landing__inner" onSubmit={(e) => { e.preventDefault(); start(); }}>
          <div className="landing__hero"><Mascot mood="sus" size={120} float /></div>
          <h1 className="landing__logo gold-text">TRY IT SOLO</h1>
          <p className="landing__tag">Play 2 quick rounds against 3 bots: once as an artist, once as the imposter. Bots use prepared art & example scores.</p>
          <p className="demo-mode">{aiMode === 'openai' ? 'Live OpenAI judge + sketch glow-ups' : aiMode === 'loading' ? 'Checking the judge…' : 'Preview mode · sample scoring, no live AI'}</p>
          {error && <p className="err" role="alert">{error}</p>}
          <Card padLg style={{ display: 'grid', gap: 12 }}>
            <label className="sr-only" htmlFor="name">Your name</label>
            <input id="name" className="field" placeholder="Your name" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" size="lg" block variant="lime" disabled={started}>{started ? 'Setting up…' : 'Start demo'}</Button>
          </Card>
          <a href="/" className="mute" style={{ fontWeight: 900 }}>Back</a>
        </form>
      </div>
    );
  }

  const room = view.room; const phase = room.phase;
  const phone = (
    <PhoneShell room={room} me={view.me} serverOffset={view.serverOffset}>
      {!view.connected && <div className="offline" role="status">Reconnecting…</div>}
      <p className="demo-mode demo-mode--playing">{room.aiMode === 'openai' ? 'Live AI for your sketch' : 'Preview mode'} · Bot scores are examples</p>
      <PhaseStage phase={phase} narrow banner={wide || phase === 'HOW_TO' || phase === 'LOBBY' ? null : undefined}>
        {phase === 'LOBBY' && <p className="phase__sub">Bots are warming up…</p>}
        {phase === 'HOW_TO' && <HowToPhone view={view} />}
        {phase === 'PROMPT' && <PromptPhone view={view} />}
        {phase === 'DRAW' && <DrawPhone view={view} />}
        {(phase === 'GALLERY' || phase === 'DISCUSS' || phase === 'VOTE') && <GalleryPhone view={view} />}
        {phase === 'UNMASK' && <UnmaskMoment view={view} phone />}
        {phase === 'STEAL' && <StealMoment view={view} phone />}
        {phase === 'VERDICT' && <VerdictMoment view={view} />}
        {phase === 'SCORES' && <ScoresMoment view={view} phone />}
        {phase === 'FINAL' && <FinalMoment view={view} phone />}
      </PhaseStage>
    </PhoneShell>
  );
  if (!wide) return phone;
  return (
    <div className="demo-split">
      <MainShell room={room} hideRail={phase === 'FINAL'} meId={view.me.playerId}>
        <PhaseStage phase={phase} banner={phase === 'LOBBY' || phase === 'HOW_TO' ? null : undefined}>
          {phase === 'LOBBY' && <p className="phase__sub">Bots are warming up…</p>}
          {phase === 'HOW_TO' && <HowToMain view={view} />}
          {phase === 'PROMPT' && <PromptMain view={view} />}
          {phase === 'DRAW' && <DrawMain view={view} />}
          {(phase === 'GALLERY' || phase === 'DISCUSS' || phase === 'VOTE') && <GalleryMain view={view} />}
          {phase === 'UNMASK' && <UnmaskMoment view={view} />}
          {phase === 'STEAL' && <StealMoment view={view} />}
          {phase === 'VERDICT' && <VerdictMoment view={view} />}
          {phase === 'SCORES' && <ScoresMoment view={view} />}
          {phase === 'FINAL' && <FinalMoment view={view} />}
        </PhaseStage>
      </MainShell>
      <div className="demo-split__phone">{phone}</div>
    </div>
  );
}
