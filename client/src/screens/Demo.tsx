import { Loading } from '@/shell/Loading';
import { SoundControl } from '@/design/components';
import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { PhoneShell } from '@/shell/PhoneShell';
import { PhaseStage } from '@/shell/PhaseStage';
import { useRoom } from '@/state/useRoom';
import { convex, setSession, loadName, saveName } from '@/net/socket';
import { unlockAudio } from '@/sound/sfx';
import { Button, Card, Mascot, Scenery } from '@/design/components';
import { HowToPhone } from '@/moments/HowToPhase';
import { PromptPhone } from '@/moments/Prompt';
import { DrawPhone } from '@/moments/Draw';
import { GalleryPhone } from '@/moments/Gallery';
import { UnmaskMoment } from '@/moments/Unmask';
import { StealMoment } from '@/moments/Steal';
import { VerdictMoment } from '@/moments/Verdict';
import { ScoresMoment } from '@/moments/Scores';
import { FinalMoment } from '@/moments/Final';

/**
 * /demo: "Try it solo". One human + 3 bots, two rounds (artist, then imposter), in one tab.
 */
export function Demo() {
  const view = useRoom();
  const [name, setName] = useState(loadName() || '');
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const health = useQuery(api.game.health, {});
  const aiMode = health?.aiMode || 'loading';

  // Refresh: rejoin the same demo seat.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('sketchy.demo'); if (!saved) return;
      const { code, token } = JSON.parse(saved);
      convex.mutation(api.game.join, { code, token, name: loadName() || 'You' }).then((r) => {
        if (r.ok) { setSession({ code, token }); setStarted(true); }
        else { try { sessionStorage.removeItem('sketchy.demo'); } catch {} }
      }).catch(() => {});
    } catch { /* Storage is optional; the game still works. */ }
  }, []);

  const start = () => {
    unlockAudio(); const n = name.trim() || 'You'; saveName(n); setStarted(true); setError('');
    try { sessionStorage.removeItem('sketchy.demo'); } catch {}
    convex.mutation(api.game.createDemo, { name: n }).then((r) => {
      setSession({ code: r.code, token: r.token });
      try { sessionStorage.setItem('sketchy.demo', JSON.stringify({ code: r.code, token: r.token })); } catch {}
    }).catch(() => { setStarted(false); setError('Could not start the demo. Please try again.'); });
  };

  if (started && !error && (!view.room || !view.me)) return <Loading label="Setting up your game" />;
  if (!started || !view.room || !view.me) {
    return (
      <div className="landing"><div className="corner-sound"><SoundControl /></div>
        <Scenery density={3} />
        <form className="landing__inner" onSubmit={(e) => { e.preventDefault(); start(); }}>
          <div className="landing__hero"><Mascot mood="sus" size={120} float /></div>
          <h1 className="landing__logo gold-text">TRY IT SOLO</h1>
          <p className="landing__tag">Play 2 quick rounds against 3 bots: once as an artist, once as the imposter. Bots use pre-made art and example scores; your sketch is redrawn and scored live.</p>
          <p className="demo-mode">{['openai', 'fal'].includes(aiMode) ? 'Your sketch is redrawn as a sticker and scored live' : aiMode === 'loading' ? 'Checking the judge…' : 'Preview mode · sample scoring, no live AI'}</p>
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
  return (
    <PhoneShell room={room} me={view.me} serverOffset={view.serverOffset}>
      {!view.connected && <div className="offline" role="status">Reconnecting…</div>}
      <PhaseStage phase={phase} narrow banner={phase === 'HOW_TO' || phase === 'LOBBY' ? null : undefined}>
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
}
