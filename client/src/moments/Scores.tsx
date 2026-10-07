import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Award, AwardReason } from '@shared/types';
import { Avatar, DrawingTile, useScoreBurst } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { childVariants, stagger } from '@/design/motion';
import { useSfx } from '@/sound/useSfx';
import { phaseElapsed, type MomentProps } from './common';
import './polish.css';

export const REASON: Record<AwardReason, string> = {
  caught_vote: 'Correct vote', caught_vote_streak: 'Correct vote streak', escape: 'Escaped', steal: 'Guessed the prompt',
  perfect_disguise: 'Disguise bonus', judges_favorite: 'Best drawing', imposter_fled: 'Imposter left',
  prompt_match: 'Prompt match', best_prompt: 'Best prompt', improved: 'Improved your prompt',
};
const DETAIL: Partial<Record<AwardReason, string>> = {
  perfect_disguise: 'imposter matched as well as the artists', judges_favorite: 'highest AI match',
  prompt_match: 'half your final match score', best_prompt: 'closest final image', improved: 'half your draft-to-final gain',
};
const awardText = (a: Award) => `${REASON[a.reason]} +${a.points}${DETAIL[a.reason] ? ` (${DETAIL[a.reason]})` : ''}`;

/** SCORES: points fly from each drawing tile into the avatar, staggered; rows then settle in rank order. */
export function ScoresMoment({ view, phone }: MomentProps & { phone?: boolean }) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const burst = useScoreBurst();
  const room = view.room!; const r = view.round!; const me = view.me;
  const [settled, setSettled] = useState(phaseElapsed(view) > 3000);
  const parts = room.players.filter((p) => r.participantIds.includes(p.id));
  const before = new Map(parts.map((p) => [p.id, p.score - r.awards.filter((a) => a.playerId === p.id).reduce((s, a) => s + a.points, 0)]));
  const ranked = [...parts].sort((a, b) => (settled ? b.score - a.score : (before.get(b.id) || 0) - (before.get(a.id) || 0)));

  useEffect(() => {
    const el = phaseElapsed(view);
    if (el > 3000) return;
    const timers: number[] = [];
    r.awards.forEach((a, i) => {
      timers.push(window.setTimeout(() => {
        const from = document.querySelector(`[data-tile="${a.playerId}"]`) || document.querySelector(`[data-scorerow="${a.playerId}"]`);
        const to = document.querySelector(`[data-avatar="${a.playerId}"]`) || document.querySelector(`[data-scorerow="${a.playerId}"]`);
        burst.fly(`+${a.points}`, from, to, a.points >= 150);
      }, 600 + i * stagger.lg * 1000 * 2));
    });
    timers.push(window.setTimeout(() => { setSettled(true); sfx.play('chime'); }, 600 + r.awards.length * stagger.lg * 1000 * 2 + 700));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line
  }, []);

  return (
    <div className="phase" style={{ justifyItems: 'center' }}>
      <Rise><h2 className="display-md phase__title">{r.fled ? 'The imposter fled!' : `Round ${r.index} scores`}</h2></Rise>
      {me && r.participantIds.includes(me.playerId) && (() => {
        const earned = r.awards.filter((a) => a.playerId === me.playerId).reduce((s, a) => s + a.points, 0);
        return <Rise><p className={`score-summary ${earned > 0 ? 'score-summary--plus' : ''}`}>{earned > 0 ? `You earned +${earned} this round` : 'No points this round'}</p></Rise>;
      })()}
      {!r.fled && (
        <div className="gallery gallery--4" style={{ maxWidth: phone ? 420 : 520 }}>
          {r.drawings.map((d) => (
            <motion.div key={d.playerId} variants={childVariants(rm)}>
              <DrawingTile drawing={d} player={view.byId.get(d.playerId)} layoutId={`tile-${r.index}-${d.playerId}`} size={160} dim={d.playerId === r.imposterId ? false : undefined} />
            </motion.div>
          ))}
        </div>
      )}
      <motion.div className="scores" layout>
        {ranked.map((p, i) => {
          const mine = r.awards.filter((a) => a.playerId === p.id);
          const delta = mine.reduce((s, a) => s + a.points, 0);
          return (
            <motion.div key={p.id} layout="position" className={`score-row ${me?.playerId === p.id ? 'score-row--me' : ''}`} data-scorerow={p.id}>
              <Avatar player={p} size="sm" layoutPrefix="score" />
              <div>
                <div className="score-row__name">#{1 + ranked.filter(x => (settled ? x.score : before.get(x.id) || 0) > (settled ? p.score : before.get(p.id) || 0)).length} {p.name} {p.id === r.imposterId && <span className="chip chip--red" style={{ fontSize: 10, padding: '2px 8px' }}>IMPOSTER</span>}</div>
                <div className="score-row__reason">{mine.length ? mine.map(awardText).join(' · ') : r.fled ? '' : 'No points this round'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="score-row__total">{settled ? p.score : before.get(p.id)}</div>
                {delta > 0 && <motion.div className="score-row__delta" initial={{ opacity: 0 }} animate={{ opacity: settled ? 1 : 0 }}>+{delta}</motion.div>}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      {me && <Rise><p className="phase__sub">{(() => { const p = view.byId.get(me.playerId); if (!p) return ''; const rank = 1 + ranked.filter(x => x.score > p.score).length; return `You: ${p.score} pts · rank #${rank || '-'}${p.streak >= 2 ? ` · ${p.streak} catch streak` : ''}`; })()}</p></Rise>}
    </div>
  );
}
