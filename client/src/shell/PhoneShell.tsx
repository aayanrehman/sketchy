import { AvatarArt } from '@/design/components/Illustrations';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PublicRoom, MeView, Player } from '@shared/types';
import { Button, Modal, SoundControl, Timer } from '@/design/components';
import { send } from '@/moments/common';
import { HowTo } from './HowTo';
import { Coach } from './Coach';
import './shell.css';

const TIMER_LABEL: Partial<Record<PublicRoom['phase'], string>> = {
  PROMPT: 'Study time', DRAW: 'Drawing time', DRAFT: 'Draft time', REFINE: 'Refine time', GALLERY: 'Revealing', DISCUSS: 'Discussion', VOTE: 'Voting closes in',
};

/**
 * The player's screen (phone or desktop). Head: you, round, timer, help, mute.
 * Desktop adds a right-hand panel with the players and the round chat; on phones the chat sits under the stage.
 */
export function PhoneShell({ room, me, serverOffset, children, showTimer = true }: { room: PublicRoom; me: MeView | null; serverOffset: number; children: ReactNode; showTimer?: boolean }) {
  const [help, setHelp] = useState(false);
  const p = me ? room.players.find((x) => x.id === me.playerId) : null;
  const timerOn = showTimer && !!room.phaseEndsAt && !!TIMER_LABEL[room.phase];
  const chatOpen = room.phase === 'DISCUSS' || room.phase === 'VOTE';
  const inGame = room.phase !== 'LOBBY' && room.phase !== 'FINAL';
  return (
    <div className={`phone-shell ${inGame ? 'phone-shell--side' : ''}`}>
      <header className="phone-shell__head">
        <div className="phone-shell__me">
          <span className="phone-shell__logo gold-text">SKETCHY</span>
          {p && <span className="chip" data-avatar={p.id} style={{ ['--av-color' as any]: p.color }}><AvatarArt avatar={p.avatar} /><span className="chip__name">{p.name}</span>{room.round > 0 && <span className="avatar__score">{p.score}</span>}</span>}
          {room.round > 0 ? <span className="phone-shell__round">Round {room.round}/{room.totalRounds}</span> : !room.isDemo && <span className="phone-shell__round">{room.code}</span>}
        </div>
        {timerOn && <div className="phone-shell__time"><span>{TIMER_LABEL[room.phase]}</span><Timer endsAt={room.phaseEndsAt} serverOffset={serverOffset} compact /></div>}
        <div className="phone-shell__ctl">
          <Button variant="ghost" icon aria-label="How to play" onClick={() => setHelp(true)}>?</Button>
          <SoundControl />
        </div>
      </header>
      <main className="phone-shell__body"><Coach room={room} me={me} />{children}</main>
      {inGame && (
        <aside className={`side ${chatOpen ? 'side--chat' : ''}`} aria-label="Players and chat">
          <PlayerList room={room} meId={me?.playerId} />
          <Chat room={room} me={me} open={chatOpen} />
        </aside>
      )}
      <Modal open={help} onClose={() => setHelp(false)} label="How to play"><HowTo onDone={() => setHelp(false)} cta="Close" mode={room.mode || 'sketch'} /></Modal>
    </div>
  );
}

function status(room: PublicRoom, p: Player): { text: string; done?: boolean } {
  const r = room.rounds[room.rounds.length - 1];
  if (p.spectator || (r && !r.participantIds.includes(p.id))) return { text: 'Joins next round' };
  if (!p.connected && !p.isBot) return { text: 'Reconnecting…' };
  if (room.phase === 'DRAW') return p.hasSubmitted ? { text: 'Done drawing', done: true } : { text: 'Drawing…' };
  if (room.phase === 'DRAFT') return p.hasSubmitted ? { text: 'Draft in', done: true } : { text: 'Writing…' };
  if (room.phase === 'REFINE') return r?.drawings.find((d) => d.playerId === p.id)?.finalIn ? { text: 'Final in', done: true } : { text: 'Refining…' };
  if (room.phase === 'VOTE') return p.hasVoted ? { text: 'Voted', done: true } : { text: 'Deciding…' };
  if (room.phase === 'VERDICT') return room.verdictReady?.includes(p.id) || p.isBot ? { text: 'Ready', done: true } : { text: 'Reviewing…' };
  return { text: `${p.score} pts` };
}

function PlayerList({ room, meId }: { room: PublicRoom; meId?: string }) {
  const players = [...room.players].sort((a, b) => b.score - a.score);
  return (
    <section className="side__card">
      <h3 className="side__title">Players</h3>
      <ul className="side__players">
        {players.map((p) => {
          const s = status(room, p);
          return (
            <li key={p.id} className={p.id === meId ? 'is-me' : ''}>
              <span className="side__av" style={{ ['--av-color' as any]: p.color }}><AvatarArt avatar={p.avatar} /></span>
              <span className="side__name">{p.name}{p.id === meId ? <small> (you)</small> : p.isBot ? <small> (bot)</small> : null}</span>
              <span className={`side__status ${s.done ? 'side__status--done' : ''}`}>{s.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Chat({ room, me, open }: { room: PublicRoom; me: MeView | null; open: boolean }) {
  const [text, setText] = useState('');
  const list = useRef<HTMLOListElement>(null);
  const chat = room.chat || [];
  const byId = new Map(room.players.map((p) => [p.id, p]));
  const canSend = open && !!me && !!room.rounds[room.rounds.length - 1]?.participantIds.includes(me.playerId);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' }); }, [chat.length]);
  return (
    <section className="side__card side__chat">
      <h3 className="side__title">Chat</h3>
      <ol ref={list} className="side__messages" aria-label="Round chat" aria-live="polite" aria-relevant="additions">
        {chat.length === 0 && <li className="side__empty">{open ? 'Who drew something different? Point out clues, but keep your exact prompt secret.' : ['PROMPT', 'DRAW', 'GALLERY', 'HOW_TO'].includes(room.phase) ? 'Chat opens after the drawings are revealed.' : 'Chat is closed until the next reveal.'}</li>}
        {chat.map((m) => { if (m.playerId === 'sketchy') return <li key={m.id} className="side__hint"><img src="/mascot/sus.webp" alt="" width={28} height={28} /><span><b>Sketchy’s hint</b> {m.text}</span></li>; const p = byId.get(m.playerId); return <li key={m.id}><b style={{ ['--av-color' as any]: p?.color }}>{p?.name || 'Player'}</b> {m.text}</li>; })}
      </ol>
      {canSend && (
        <form className="side__form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { send().emit('chat:send', { text }); setText(''); } }}>
          <label className="sr-only" htmlFor="chat-input">Message</label>
          <input id="chat-input" className="field" maxLength={240} value={text} placeholder="What looks suspicious?" onChange={(e) => setText(e.target.value)} />
          <Button type="submit" size="sm" disabled={!text.trim()}>Send</Button>
        </form>
      )}
    </section>
  );
}
