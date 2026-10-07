import { useEffect, useState } from 'react';
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
import { Button, Card } from '@/design/components';

/** /host: the main screen. Creates a room (no code) or watches one (?code=). */
export function HostScreen() {
  const view = useRoom();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('code')?.toUpperCase();
    const s = socket();
    const go = () => {
      if (code) s.emit('screen:watch', { code }, (r) => { if (!r.ok) setErr(r.error || 'Room not found'); });
      else s.emit('screen:create', (r) => { if (r.ok) history.replaceState(null, '', `/host?code=${r.code}`); else setErr(r.error); });
    };
    if (s.connected) go(); else s.once('connect', go);
    s.on('connect', () => { const c = new URLSearchParams(location.search).get('code'); if (c) s.emit('screen:watch', { code: c }, () => {}); });
  }, []);

  if (err) return <div className="landing"><Card padLg><h2 className="display-md">Hmm</h2><p className="dim" style={{ margin: '8px 0 16px' }}>{err}</p><Button onClick={() => { location.href = '/'; }}>Back</Button></Card></div>;
  if (!view.room) return <div className="landing"><p className="display-md neon-text">Setting the stage…</p></div>;
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
