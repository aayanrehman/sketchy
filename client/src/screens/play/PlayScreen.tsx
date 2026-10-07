import { Loading } from '@/shell/Loading';
import { SoundControl } from '@/design/components';
import { useEffect, useState } from 'react';
import { PhoneShell } from '@/shell/PhoneShell';
import { PhaseStage } from '@/shell/PhaseStage';
import { useRoom } from '@/state/useRoom';
import { convex, setSession, saveToken, loadToken, saveName, loadName, loadHostToken } from '@/net/socket';
import { api } from '../../../../convex/_generated/api';
import { unlockAudio } from '@/sound/sfx';
import { Button, Card, Mascot, Scenery } from '@/design/components';
import { LobbyPhone } from '@/moments/Lobby';
import { HowToPhone } from '@/moments/HowToPhase';
import { PromptPhone } from '@/moments/Prompt';
import { DrawPhone } from '@/moments/Draw';
import { GalleryPhone } from '@/moments/Gallery';
import { UnmaskMoment } from '@/moments/Unmask';
import { StealMoment } from '@/moments/Steal';
import { VerdictMoment } from '@/moments/Verdict';
import { ScoresMoment } from '@/moments/Scores';
import { FinalMoment } from '@/moments/Final';

/** /play: the phone controller. Join with code + name; rejoin the same seat from a saved token on refresh. */
export function PlayScreen() {
  const view = useRoom();
  const params = new URLSearchParams(location.search);
  const [code, setCode] = useState((params.get('code') || '').toUpperCase());
  const [name, setName] = useState(loadName());
  const [err, setErr] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const join = (c: string, n: string, token?: string) => {
    setJoining(true); setErr(null);
    const hostToken = loadHostToken(c);
    convex.mutation(api.game.join, { code: c, name: n, token, hostToken }).then((r) => {
      setJoining(false);
      if (!r.ok) { setJoined(false); setErr(r.error); if (token) { try { localStorage.removeItem('sketchy.tokens'); } catch { /* ignore */ } } return; }
      saveToken(c, r.token); saveName(n); setSession({ code: c, token: r.token, hostToken }); setJoined(true);
      history.replaceState(null, '', `/play?code=${c}`);
    }).catch(() => { setJoining(false); setErr('Could not reach the room. Please try again.'); });
  };

  // Rejoin the same seat on refresh.
  useEffect(() => {
    const c = (params.get('code') || '').toUpperCase();
    const tok = c ? loadToken(c) : undefined;
    if (c && tok) join(c, loadName() || 'Player', tok);
    // eslint-disable-next-line
  }, []);

  if ((joined || joining) && !err && (!view.room || !view.me)) return <Loading label="Joining the room" />;
  if (!joined || !view.room || !view.me) {
    return (
      <div className="landing"><div className="corner-sound"><SoundControl /></div>
        <Scenery density={3} />
        <form className="landing__inner" onSubmit={(e) => { e.preventDefault(); unlockAudio(); if (code.length === 4 && name.trim()) join(code, name.trim()); }}>
          <div className="landing__hero"><Mascot mood="happy" size={110} float /></div>
          <h1 className="landing__logo gold-text">SKETCHY</h1>
          <Card padLg style={{ display: 'grid', gap: 12 }}>
            <label className="sr-only" htmlFor="code">Room code</label>
            <input id="code" className="field field--code" placeholder="ROOM CODE" value={code} maxLength={4} autoCapitalize="characters" autoComplete="off" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))} />
            <label className="sr-only" htmlFor="name">Your name</label>
            <input id="name" className="field" placeholder="Your name" value={name} maxLength={12} autoComplete="off" onChange={(e) => setName(e.target.value)} />
            <p className="err" role="alert">{err}</p>
            <Button type="submit" size="lg" block disabled={joining || code.length !== 4 || !name.trim()}>{joining ? 'Joining…' : 'Join game'}</Button>
          </Card>
          <a href="/" className="mute" style={{ fontWeight: 900 }}>Back</a>
        </form>
      </div>
    );
  }

  const room = view.room; const phase = room.phase; const me = view.me;
  const p = view.byId.get(me.playerId);
  return (
    <PhoneShell room={room} me={me} serverOffset={view.serverOffset}>
      {!view.connected && <div className="offline" role="status">Reconnecting…</div>}
      {view.error && <div className="offline" role="alert">{view.error} <a href="/">Return home</a></div>}
      <PhaseStage phase={phase} narrow banner={phase === 'LOBBY' || phase === 'HOW_TO' ? null : undefined}>
        {phase === 'LOBBY' && <LobbyPhone view={view} />}
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
      {p?.spectator && phase !== 'LOBBY' && <p className="phase__sub" style={{ marginTop: 16 }}>Spectating. You join the next round.</p>}
    </PhoneShell>
  );
}
