import { EntryLayout } from '@/shell/EntryLayout';
import { Loading } from '@/shell/Loading';
import { SoundControl } from '@/design/components';
import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { PhoneShell } from '@/shell/PhoneShell';
import { PhaseStage, STUDY_BANNER } from '@/shell/PhaseStage';
import { useRoom } from '@/state/useRoom';
import { convex, setSession, loadName, saveName } from '@/net/socket';
import { unlockAudio } from '@/sound/sfx';
import { Button, Card, Mascot, Scenery } from '@/design/components';
import { HowToPhone } from '@/moments/HowToPhase';
import { PromptPhone } from '@/moments/Prompt';
import { StudyPhone, WritePhone } from '@/moments/PromptMode';
import { DrawPhone } from '@/moments/Draw';
import { GalleryPhone } from '@/moments/Gallery';
import { UnmaskMoment } from '@/moments/Unmask';
import { StealMoment } from '@/moments/Steal';
import { VerdictMoment } from '@/moments/Verdict';
import { ScoresMoment } from '@/moments/Scores';
import { FinalMoment } from '@/moments/Final';
import { dailyTarget } from '../../../convex/targets';
import { todayKey, dailyPlayed, dailyStreak, STREAK_MIN } from '@/progression/store';
import { deviceId } from '@/social/identity';
import { ChallengeCard } from '@/social/Social';
import type { Id } from '../../../convex/_generated/dataModel';

/**
 * /demo: "Try it solo". One human + 3 bots, two rounds (artist, then imposter), in one tab.
 */
export function Demo({ daily = false }: { daily?: boolean }) {
  const view = useRoom();
  const dayKey = todayKey();
  const target = daily ? dailyTarget(dayKey) : null;
  const playedToday = daily ? dailyPlayed(dayKey) : undefined;
  const challengeId = daily ? new URLSearchParams(location.search).get('c') : null;
  const [name, setName] = useState(loadName() || '');
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const health = useQuery(api.game.health, {});
  const aiMode = health?.aiMode || 'loading';

  // Refresh: rejoin the same demo seat.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(daily ? 'sketchy.daily' : 'sketchy.demo'); if (!saved) return;
      const { code, token } = JSON.parse(saved);
      convex.mutation(api.game.join, { code, token, name: loadName() || 'You' }).then((r) => {
        if (r.ok) { setSession({ code, token }); setStarted(true); }
        else { try { sessionStorage.removeItem(daily ? 'sketchy.daily' : 'sketchy.demo'); } catch {} }
      }).catch(() => {});
    } catch { /* Storage is optional; the game still works. */ }
  }, []);

  const start = () => {
    unlockAudio(); const n = name.trim() || 'You'; saveName(n); setStarted(true); setError('');
    try { sessionStorage.removeItem(daily ? 'sketchy.daily' : 'sketchy.demo'); } catch {}
    convex.mutation(api.game.createDemo, daily ? { name: n, daily: dayKey, deviceId: deviceId(), ...(challengeId ? { challengeId: challengeId as Id<'attempts'> } : {}) } : { name: n, deviceId: deviceId() }).then((r) => {
      setSession({ code: r.code, token: r.token });
      try { sessionStorage.setItem(daily ? 'sketchy.daily' : 'sketchy.demo', JSON.stringify({ code: r.code, token: r.token })); } catch {}
    }).catch(() => { setStarted(false); setError('Could not start the demo. Please try again.'); });
  };

  if (started && !error && (!view.room || !view.me)) return <Loading label="Setting up your game" />;
  if (!started || !view.room || !view.me) {
    return (
      <EntryLayout title={challengeId ? 'You’ve been challenged' : daily ? 'Today’s target' : 'Play solo vs. bots'} mood={daily ? 'judge' : 'sus'} onSubmit={start}
        subtitle={daily
          ? challengeId ? 'One round on the same picture. Score 60+ for Bronze, 75+ Silver, 85+ Gold.' : <>One picture a day, the same for everyone. One round, about two minutes. {playedToday !== undefined ? <b>You scored {playedToday} today. Play again for practice.</b> : <>Your first score counts. Score {STREAK_MIN}+ (Bronze) to keep your streak{dailyStreak() ? <b> (🔥 {dailyStreak()} day{dailyStreak() === 1 ? '' : 's'})</b> : null}.</>}</>
          : '2 quick rounds against 3 bots: once as a regular player, once as the imposter. Bots use pre-made prompts and example scores; yours are live.'}>
        {challengeId ? <ChallengeCard id={challengeId} /> : daily && target && <img src={target.image} alt="Today's target" className="entry__daily" style={{ filter: 'blur(14px)' }} />}
        <p className="entry__badge">{['openai', 'fal'].includes(aiMode) ? 'Live AI: your prompts become images and get scored' : aiMode === 'loading' ? 'Checking the AI…' : 'Preview mode · sample scoring, no live AI'}</p>
        <label className="entry__label" htmlFor="name">Your name</label>
        <input id="name" className="field field--center" placeholder="What should we call you?" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} />
        {error && <p className="err" role="alert">{error}</p>}
        <Button type="submit" size="lg" block variant="lime" disabled={started}>{started ? 'Setting up…' : 'Start'}</Button>
      </EntryLayout>
    );
  }

  const room = view.room; const phase = room.phase;
  return (
    <PhoneShell room={room} me={view.me} serverOffset={view.serverOffset}>
      {!view.connected && <div className="offline" role="status">Reconnecting…</div>}
      <PhaseStage phase={phase} narrow banner={phase === 'LOBBY' || phase === 'HOW_TO' ? null : phase === 'PROMPT' && view.round?.mode === 'prompt' ? STUDY_BANNER : undefined}>
        {phase === 'LOBBY' && <p className="phase__sub">Bots are warming up…</p>}
        {phase === 'HOW_TO' && <HowToPhone view={view} />}
        {phase === 'PROMPT' && (view.round?.mode === 'prompt' ? <StudyPhone view={view} /> : <PromptPhone view={view} />)}
        {(phase === 'DRAFT' || phase === 'REFINE') && <WritePhone view={view} />}
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
