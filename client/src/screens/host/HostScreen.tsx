import { useEffect, useRef, useState } from 'react';
import { MainShell } from '@/shell/MainShell';
import { PhaseStage } from '@/shell/PhaseStage';
import { useRoom } from '@/state/useRoom';
import { socket } from '@/net/socket';
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
    const s = socket();
    const go = () => {
      const code = new URLSearchParams(location.search).get('code')?.toUpperCase();
      if (code) s.timeout(10000).emit('screen:watch', { code }, (timeout: Error | null, r: { ok: boolean; error?: string }) => {
        setErr(timeout ? 'Could not reach the game. Please try again.' : !r.ok ? r.error || 'Room not found' : null);
      });
      else if (!creating.current) {
        creating.current = true;
        s.timeout(10000).emit('screen:create', (timeout: Error | null, r: { ok: boolean; code?: string; error?: string }) => {
          creating.current = false;
          if (timeout) setErr('Could not create a room. Please try again.');
          else if (r.ok) { history.replaceState(null, '', `/host?code=${r.code}`); setErr(null); }
          else setErr(r.error || 'Could not create a room');
        });
      }
    };
    const fail = () => setErr('Could not connect to the game. Please try again.');
    s.on('connect', go); s.on('connect_error', fail);
    if (s.connected) go();
    return () => { s.off('connect', go); s.off('connect_error', fail); };
  }, []);

  if (err && !view.room) return <div className="landing"><Card padLg><h2 className="display-md">Hmm</h2><p className="dim" style={{ margin: '8px 0 16px' }}>{err}</p><Button onClick={() => { location.href = '/'; }}>Back</Button></Card></div>;
  if (!view.room) return <div className="landing"><div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}><Mascot mood="think" size={120} float /><p className="display-md ink-text">Setting the stage…</p></div></div>;
  const room = view.room;
  const phase = room.phase;
  return (
    <MainShell room={room} hideRail={phase === 'LOBBY' || phase === 'FINAL'}>
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
