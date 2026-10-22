import { motion, useReducedMotion } from 'framer-motion';
import { go } from '@/nav';
import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { MIN_PLAYERS, MAX_PLAYERS, FULL_TABLE } from '@shared/types';
import { Avatar, Button, Card } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { childVariants } from '@/design/motion';
import { send, type MomentProps } from './common';
import { CAST, DETECTIVE } from '@shared/cast';
import { AvatarArt } from '@/design/components/Illustrations';
import { LUNA_IMG } from '@/design/components';

const CAST_KEY = 'sketchy.cast';
const savedCast = () => { try { return localStorage.getItem(CAST_KEY); } catch { return null; } };

/** Character select: tap a suspect. Taken ones are greyed out; the pick is remembered on this device. */
function CastPicker({ view }: MomentProps) {
  const room = view.room!; const me = view.me!;
  const mine = view.byId.get(me.playerId)?.avatar;
  const takenBy = new Map(room.players.filter((p) => p.id !== me.playerId).map((p) => [p.avatar, p.name]));
  const pick = (id: string) => { if (takenBy.has(id)) return; try { localStorage.setItem(CAST_KEY, id); } catch { /* private mode */ } send().emit('avatar:set', { avatar: id }); };
  // Rejoin as your usual character when it's free.
  useEffect(() => { const s = savedCast(); if (s && s !== mine && !takenBy.has(s) && CAST.some((c) => c.id === s)) send().emit('avatar:set', { avatar: s }); /* eslint-disable-next-line */ }, []);
  const me2 = CAST.find((c) => c.id === mine);
  return (
    <div className="cast-pick">
      <p className="cast-pick__title">Choose your suspect{me2 && <>: <b>{me2.name}</b>, {me2.role}</>}</p>
      <div className="cast-pick__grid" role="radiogroup" aria-label="Choose your character">
        {CAST.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={mine === c.id} aria-label={`${c.name}, ${c.role}${takenBy.has(c.id) ? `, taken by ${takenBy.get(c.id)}` : ''}`}
            disabled={takenBy.has(c.id)} className={`cast-pick__opt ${mine === c.id ? 'is-on' : ''}`} onClick={() => pick(c.id)}>
            <AvatarArt avatar={c.id} /><span>{takenBy.has(c.id) ? takenBy.get(c.id) : c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Inspector Luna joins every Prompt-mode table as the AI detective. */
function LunaSeat() {
  return <div className="lobby__luna"><img src={LUNA_IMG} alt="" /><div><b>{DETECTIVE.name}</b><small>AI detective · also hunts the imposter</small></div></div>;
}

function JoinQr({ url }: { url: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) QRCode.toCanvas(ref.current, url, { width: 120, margin: 0, color: { dark: '#2B2540', light: '#FFFFFF' } }).catch(() => {}); }, [url]);
  return <canvas ref={ref} className="lobby__qr" aria-label="QR code to join" />;
}

export function LobbyMain({ view }: MomentProps) {
  const rm = !!useReducedMotion();
  const room = view.room!;
  const n = room.players.filter((p) => !p.spectator).length;
  const url = `${location.origin}/play`;
  return (
    <div className="lobby lobby--host">
      <Rise><h1 className="entry__title lobby__title">Your room is ready</h1><p className="entry__sub">Everyone joins on their own phone or laptop. {MIN_PLAYERS}–{MAX_PLAYERS} players; with fewer than {FULL_TABLE}, bots fill the empty seats.</p></Rise>
      <Rise><Card className="lobby__join">
        <JoinQr url={`${url}?code=${room.code}`} />
        <div>
          <p className="lobby__url">Scan, or go to <b>{url.replace(/^https?:\/\//, '')}</b> and enter</p>
          <div className="lobby__code" aria-label={`Room code ${room.code.split('').join(' ')}`}>{room.code}</div>
        </div>
      </Card></Rise>
      <Rise style={{ width: '100%', maxWidth: 640 }}><ModePicker view={view} canPick={!!view.canHost} /></Rise>
      <Rise style={{ width: '100%', maxWidth: 640 }}><SettingsPicker view={view} canPick={!!view.canHost} /></Rise>
      <Rise className="lobby__cast">
        {room.players.map((p) => <motion.div key={p.id} variants={childVariants(rm)}><Avatar player={p} isHost={p.id === room.hostId} />{view.canHost && p.id !== room.hostId && <Button size="sm" variant="ghost" onClick={() => send().emit('host:assign', { playerId: p.id })}>Make host</Button>}</motion.div>)}
        {Array.from({ length: Math.max(0, FULL_TABLE - room.players.length) }, (_, i) => <div key={i} className="lobby__slot" aria-hidden title="Bot seat">🤖</div>)}
      </Rise>
      {room.mode !== 'sketch' && <Rise><LunaSeat /></Rise>}
      <Rise>
        {n < MIN_PLAYERS ? <p className="phase__sub">Need {MIN_PLAYERS} players (or try solo mode) · {n}/{MAX_PLAYERS}</p> : view.canHost ? <Button size="lg" onClick={() => send().emit('host:start')}>{n < FULL_TABLE ? `Start with ${FULL_TABLE - n} bot${FULL_TABLE - n === 1 ? '' : 's'}` : 'Start the show'}</Button> : <p className="phase__sub">Watching · Waiting for the host</p>}
        {n === 2 && <p className="mute" style={{ fontWeight: 700 }}>Two players: a head-to-head. A bot plays the imposter; you both hunt it and compete on score.</p>}
      </Rise>
      <Rise><p className="mute" style={{ fontWeight: 700 }}>Playing on this phone? <a href={`/play?code=${room.code}`}>Join as a player</a></p></Rise>
    </div>
  );
}

export function LobbyPhone({ view }: MomentProps) {
  const room = view.room!; const me = view.me!;
  const n = room.players.filter((p) => !p.spectator).length;
  const isHost = me.isHost;
  return (
    <div className="lobby">
      <Rise><h2 className="display-md">Room {room.code}</h2></Rise>
      <Rise><Card style={{ width: '100%' }}>
        <div className="lobby__cast">{room.players.map((p) => <Avatar key={p.id} player={p} isHost={p.id === room.hostId} isYou={p.id === me.playerId} />)}</div>
        {room.mode !== 'sketch' && <LunaSeat />}
      </Card></Rise>
      <Rise style={{ width: '100%' }}><Card style={{ width: '100%' }}><CastPicker view={view} /></Card></Rise>
      <Rise style={{ width: '100%' }}><ModePicker view={view} canPick={isHost} /></Rise>
      <Rise style={{ width: '100%' }}><SettingsPicker view={view} canPick={isHost} /></Rise>
      <Rise style={{ width: '100%' }}>
        {isHost ? (
          <>
            <Button size="lg" block disabled={n < MIN_PLAYERS} onClick={() => send().emit('host:start')}>{n < MIN_PLAYERS ? `Need ${MIN_PLAYERS} players (${n}/${MIN_PLAYERS})` : n < FULL_TABLE ? `Start with ${FULL_TABLE - n} bot${FULL_TABLE - n === 1 ? '' : 's'}` : 'Start the show'}</Button>
            {n < MIN_PLAYERS && <p className="mute" style={{ marginTop: 8, fontWeight: 700 }}>or <a href="/demo">play solo vs. bots</a></p>}
            {n === 2 && <p className="mute" style={{ marginTop: 8, fontWeight: 700 }}>Head-to-head: a bot plays the imposter, you both hunt it and compete on score.</p>}
          </>
        ) : <p className="phase__sub">Waiting for host… ({n}/{MAX_PLAYERS})</p>}
      </Rise>
      <Rise><Button variant="ghost" size="sm" onClick={() => { send().emit('leave'); go('/'); }}>Leave</Button></Rise>
    </div>
  );
}

/** Pace (how long a game takes) and difficulty (word limits and round rules). */
export function SettingsPicker({ view, canPick }: MomentProps & { canPick: boolean }) {
  const st = view.room?.settings || { pace: 'quick', difficulty: 'normal' };
  const prompt = (view.room?.mode || 'prompt') === 'prompt';
  const row = (label: string, key: 'pace' | 'difficulty', opts: { id: string; title: string; text: string }[]) => (
    <div className="setting">
      <span className="setting__label">{label}</span>
      <div className="setting__opts" role="radiogroup" aria-label={label}>
        {opts.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={st[key] === o.id} disabled={!canPick} className={`setting__opt ${st[key] === o.id ? 'is-on' : ''}`} title={o.text}
            onClick={() => canPick && send().emit('host:settings', { [key]: o.id } as any)}>
            <b>{o.title}</b><small>{o.text}</small>
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="settings">
      {row('Pace', 'pace', [
        { id: 'quick', title: 'Quick', text: '2 rounds · ~5 min' },
        { id: 'classic', title: 'Classic', text: '3 rounds · ~12 min' },
      ])}
      {prompt && row('Difficulty', 'difficulty', [
        { id: 'easy', title: 'Easy', text: '10 + 40 words · no rules' },
        { id: 'normal', title: 'Normal', text: '8 + 30 words · rules rotate' },
        { id: 'hard', title: 'Hard', text: '6 + 18 words · a rule every round' },
      ])}
    </div>
  );
}

/** Host picks the game: write prompts to recreate a picture (default), or the original drawing game. */
export function ModePicker({ view, canPick }: MomentProps & { canPick: boolean }) {
  const mode = view.room?.mode || 'prompt';
  const opts = [
    { id: 'prompt' as const, title: 'Prompt mode', text: 'Recreate a picture by writing AI prompts. One imposter has part of it erased.' },
    { id: 'sketch' as const, title: 'Sketch mode', text: 'Draw a secret prompt. One imposter got a slightly different one.' },
  ];
  return (
    <div className="modes" role="radiogroup" aria-label="Game mode">
      {opts.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={mode === o.id} disabled={!canPick} className={`modes__opt ${mode === o.id ? 'is-on' : ''}`}
          onClick={() => canPick && send().emit('host:mode', { mode: o.id })}>
          <b>{o.title}</b><span>{o.text}</span>
        </button>
      ))}
    </div>
  );
}
