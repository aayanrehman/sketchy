import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { PublicRoom, Drawing } from '@shared/types';
import { tierOf, tierInfo } from '@shared/types';
import { Button, Card } from '@/design/components';
import { convex, loadName } from '@/net/socket';
import { targetById } from '../../../convex/targets';
import { deviceId, crewCode, saveCrew, lastDays, crewLink } from './identity';
import './social.css';

/** 🥇 Gold · 🥈 Silver · 🥉 Bronze, or nothing. */
export function TierBadge({ score, big }: { score: number | undefined; big?: boolean }) {
  const t = tierInfo(tierOf(score));
  if (!t) return null;
  return <span className={`tier tier--${t.tier} ${big ? 'tier--big' : ''}`}>{t.medal} {t.label}</span>;
}

/** The challenge entry: who you're up against, before you play. */
export function ChallengeCard({ id }: { id: string }) {
  const a = useQuery(api.social.attempt, { id: id as Id<'attempts'> });
  if (a === undefined) return <p className="dim">Loading the challenge…</p>;
  if (!a) return <p className="err" role="alert">That challenge link has expired. You can still play today’s target.</p>;
  const t = targetById(a.targetId);
  return (
    <div className="challenge">
      {t && <img src={t.image} alt="" style={{ filter: 'blur(14px)' }} />}
      <div>
        <b>{a.name} scored {a.score}/100 <TierBadge score={a.score} /></b>
        <span>Same picture, one prompt. Beat {a.score} and the bragging rights are yours.</span>
      </div>
    </div>
  );
}

export interface Rival { name: string; score: number; imageUrl?: string; prompt?: string; loading?: boolean }
/** Head-to-head result: you vs one rival, side by side. */
export function Duel({ mine, rival, title }: { mine: Drawing | undefined; rival: Rival; title?: string }) {
  const my = typeof mine?.match === 'number' && mine.match >= 0 ? mine.match : null;
  const verdict = my === null ? 'No score this time.' : my > rival.score ? `You beat ${rival.name}!` : my === rival.score ? 'A dead heat!' : `${rival.name} takes it.`;
  return (
    <Card className="duel" variant={my !== null && my > rival.score ? 'gold' : 'default'}>
      {title && <span className="duel__kicker">{title}</span>}
      <h2 className="display-sm">{verdict}</h2>
      <div className="duel__row">
        <figure className={my !== null && my >= rival.score ? 'is-win' : ''}>
          {mine?.glowUrl ? <img src={mine.glowUrl} alt="Your image" /> : <div className="duel__none">No image</div>}
          <figcaption><b>You · {my ?? '—'}</b> <TierBadge score={my ?? undefined} /><small>{mine?.finalPrompt}</small></figcaption>
        </figure>
        <figure className={my === null || rival.score >= my ? 'is-win' : ''}>
          {rival.imageUrl ? <img src={rival.imageUrl} alt={`${rival.name}'s image`} /> : <div className="duel__none">{rival.loading ? 'Loading…' : 'No image'}</div>}
          <figcaption><b>{rival.name} · {rival.score}</b> <TierBadge score={rival.score} /><small>{rival.prompt}</small></figcaption>
        </figure>
      </div>
    </Card>
  );
}

/** Final screen of a challenge play: the challenger's recorded attempt is the rival. */
export function ChallengeDuel({ room, mine }: { room: PublicRoom; mine: Drawing | undefined }) {
  const ch = room.challenge!;
  const a = useQuery(api.social.attempt, { id: ch.id as Id<'attempts'> });
  return <Duel mine={mine} rival={{ name: ch.name, score: ch.score, imageUrl: a?.imageUrl, prompt: a?.prompt, loading: a === undefined }} title="Challenge" />;
}

/** Landing: your crew's board, or a way to start one. Joins from ?crew=CODE links. */
export function CrewCard() {
  const [code, setCode] = useState(crewCode());
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const board = useQuery(api.social.crewBoard, code ? { code, days: lastDays() } : 'skip');
  // Invite link: join the crew in the URL (once), then clean the URL.
  useEffect(() => {
    const invite = new URLSearchParams(location.search).get('crew');
    if (!invite || invite === code) return;
    convex.mutation(api.social.joinCrew, { code: invite, deviceId: deviceId(), name: loadName() || 'Player' }).then((r) => {
      if (r.ok) { saveCrew(r.code); setCode(r.code); setNote(`You joined ${r.name}.`); } else setNote(r.error);
      history.replaceState(null, '', '/');
    }).catch(() => setNote('Could not join that crew right now.'));
    // eslint-disable-next-line
  }, []);
  const flash = (t: string) => { setNote(t); setTimeout(() => setNote(null), 2500); };
  const invite = () => { if (!code) return; navigator.clipboard?.writeText(crewLink(code)).then(() => flash('Invite link copied. Send it to your friends.')).catch(() => flash(crewLink(code))); };
  const start = () => {
    setBusy(true);
    convex.mutation(api.social.createCrew, { deviceId: deviceId(), name: loadName() || 'Player' }).then((r) => { saveCrew(r.code); setCode(r.code); setBusy(false); navigator.clipboard?.writeText(crewLink(r.code)).then(() => flash('Crew started. Invite link copied.')).catch(() => flash('Crew started.')); })
      .catch(() => { setBusy(false); flash('Could not start a crew right now.'); });
  };
  if (!code) {
    return (
      <div className="crew crew--empty">
        <div><b>Play with friends</b><span>Start a crew: everyone’s daily scores on one board, all week.</span></div>
        <Button size="sm" variant="secondary" onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Start a crew'}</Button>
        {note && <p className="crew__note" role="status">{note}</p>}
      </div>
    );
  }
  const me = deviceId();
  return (
    <div className="crew">
      <div className="crew__head"><b>{board?.name || 'Your crew'}</b><span>{board ? `${board.members.length} member${board.members.length === 1 ? '' : 's'} · this week` : 'Loading…'}</span></div>
      {board && (
        <ol className="crew__board">
          {board.members.map((m, i) => (
            <li key={m.deviceId} className={m.deviceId === me ? 'is-me' : ''}>
              <span className="crew__rank">{i + 1}</span>
              <span className="crew__name">{m.name}{m.deviceId === me ? ' (you)' : ''}{m.streak > 1 ? <small> 🔥 {m.streak}</small> : null}</span>
              <span className="crew__today">{m.today === null ? <small>not yet today</small> : <>{m.today} <TierBadge score={m.today} /></>}</span>
              <b className="crew__week">{m.week}</b>
            </li>
          ))}
        </ol>
      )}
      <div className="crew__actions">
        <Button size="sm" variant="secondary" onClick={invite}>Invite</Button>
        <Button size="sm" variant="ghost" onClick={() => { saveCrew(null); setCode(null); }}>Leave</Button>
      </div>
      {note && <p className="crew__note" role="status">{note}</p>}
    </div>
  );
}
