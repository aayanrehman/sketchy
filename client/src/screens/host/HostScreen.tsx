import { Loading } from '@/shell/Loading';
import { SoundControl } from '@/design/components';
import { useEffect, useRef, useState } from 'react';
import { go } from '@/nav';
import { MainShell } from '@/shell/MainShell';
import { PhaseStage } from '@/shell/PhaseStage';
import { useRoom } from '@/state/useRoom';
import { convex, setSession, saveHostToken, loadHostToken } from '@/net/socket';
import { api } from '../../../../convex/_generated/api';
import { LobbyMain } from '@/moments/Lobby';
import { HowToMain } from '@/moments/HowToPhase';
import { PromptMain } from '@/moments/Prompt';
import { DrawMain } from '@/moments/Draw';
import { GalleryMain } from '@/moments/Gallery';
import { UnmaskMoment } from '@/moments/Unmask';
import { StealMoment } from '@/moments/Steal';
import { VerdictMoment } from '@/moments/Verdict';
import { ScoresMoment } from '@/moments/Scores';
import { FinalMoment } from '@/moments/Final';
import { Button, Card, Mascot } from '@/design/components';

/** /host: the main screen. Creates a room (no code) or watches one (?code=). */
export function HostScreen() {
  const view = useRoom();
  const [err, setErr] = useState<string | null>(null);
  const creating = useRef(false);
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('code')?.toUpperCase();
    if (code) { setSession({ code, hostToken: loadHostToken(code) }); return; }
    if (creating.current) return;
    creating.current = true;
    convex.mutation(api.game.createScreen, {}).then((r) => {
      saveHostToken(r.code, r.hostToken); history.replaceState(null, '', `/host?code=${r.code}`);
      setSession({ code: r.code, hostToken: r.hostToken }); setErr(null);
    }).catch(() => setErr('Could not create a room. Please try again.')).finally(() => { creating.current = false; });
  }, []);

  if (err) return <div className="landing"><div className="corner-sound"><SoundControl /></div><Card padLg><h2 className="display-md">Hmm</h2><p className="dim" style={{ margin: '8px 0 16px' }}>{err}</p><Button onClick={() => { go('/'); }}>Back</Button></Card></div>;
  if (!view.room) return <Loading label="Setting up your room" />;
  const room = view.room;
  const phase = room.phase;
  return (
    <MainShell room={room} hideRail={phase === 'LOBBY' || phase === 'FINAL'}>
      {view.error && <div className="offline" role="alert">{view.error} <a href="/">Return home</a></div>}
      {!view.connected && <div className="offline" role="status">Reconnecting…</div>}
      <PhaseStage phase={phase} banner={phase === 'LOBBY' || phase === 'HOW_TO' ? null : undefined}>
        {phase === 'LOBBY' && <LobbyMain view={view} />}
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
  );
}
