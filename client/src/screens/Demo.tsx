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
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => { const m = window.matchMedia('(min-width: 1024px)'); const h = () => setWide(m.matches); m.addEventListener('change', h); return () => m.removeEventListener('change', h); }, []);

  const start = () => {
    unlockAudio(); const n = name.trim() || 'You'; saveName(n); setStarted(true);
    const s = socket();
    const go = () => s.emit('demo:create', { name: n }, () => {});
    if (s.connected) go(); else s.once('connect', go);
  };

  if (!started || !view.room || !view.me) {
    return (
      <div className="landing">
        <Scenery density={3} />
        <form className="landing__inner" onSubmit={(e) => { e.preventDefault(); start(); }}>
          <div className="landing__hero"><Mascot mood="sus" size={120} float /></div>
          <h1 className="landing__logo gold-text">TRY IT SOLO</h1>
          <p className="landing__tag">Play 2 quick rounds against 3 bots: once as an artist, once as the imposter. Your drawing goes through the real AI.</p>
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
