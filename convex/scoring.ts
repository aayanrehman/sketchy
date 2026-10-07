import type { Award, Round, Player, Drawing } from '../shared/types';
const median = (xs: number[]): number => { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export function validScore(d: Drawing | undefined): d is Drawing & { match: number } {
  return !!d && !d.blank && d.judgeStatus === 'done' && Number.isFinite(d.match) && d.match! >= 0 && d.match! <= 100;
}

/** Pure scoring per the PRD table. Mutates player score/streak and returns the awards. */
export function scoreRound(round: Round, players: Map<string, Player>): Award[] {
  const awards: Award[] = [];
  const imposter = players.get(round.imposterId);
  const artists = round.participantIds.filter((id) => id !== round.imposterId);

  if (round.fled) {
    for (const id of artists) {
      const p = players.get(id); if (!p) continue;
      p.score += 50; awards.push({ playerId: id, points: 50, reason: 'imposter_fled' });
    }
    return awards;
  }

  // Votes: +100 for voting the imposter, x1.5 when it's a consecutive correct vote.
  for (const id of artists) {
    const p = players.get(id); if (!p) continue;
    const correct = round.votes[id] === round.imposterId;
    if (correct) {
      p.streak += 1;
      const streak = p.streak >= 2;
      const pts = streak ? 150 : 100;
      p.score += pts;
      awards.push({ playerId: id, points: pts, reason: streak ? 'caught_vote_streak' : 'caught_vote' });
    } else {
      p.streak = 0;
    }
  }
  if (imposter) {
    imposter.streak = 0; // imposters don't vote this round
    if (!round.caught) { imposter.score += 200; awards.push({ playerId: imposter.id, points: 200, reason: 'escape' }); }
    if (round.caught && round.stealCorrect) { imposter.score += 150; awards.push({ playerId: imposter.id, points: 150, reason: 'steal' }); }

    const byId = new Map(round.drawings.map((d) => [d.playerId, d]));
    const impD = byId.get(imposter.id);
    const artistScores = artists.map((id) => byId.get(id)).filter(validScore).map((d) => d.match);
    if (validScore(impD) && artistScores.length) {
      if (impD.match >= median(artistScores)) {
        imposter.score += 100; awards.push({ playerId: imposter.id, points: 100, reason: 'perfect_disguise' });
      }
    }
    if (round.mode === 'prompt') {
      // Prompt skill pays for everyone: half your final match, plus +50 for the closest artist.
      for (const id of round.participantIds) {
        const d = byId.get(id); const p = players.get(id);
        if (!p || !validScore(d)) continue;
        const pts = Math.round(d.match / 2);
        if (pts > 0) { p.score += pts; awards.push({ playerId: id, points: pts, reason: 'prompt_match' }); }
      }
      if (artistScores.length) {
        const top = Math.max(...artistScores);
        for (const id of artists) {
          const d = byId.get(id); const p = players.get(id);
          if (p && validScore(d) && d.match === top) { p.score += 50; awards.push({ playerId: id, points: 50, reason: 'best_prompt' }); }
        }
      }
    } else if (artistScores.length) {
      const top = Math.max(...artistScores);
      for (const id of artists) {
        const d = byId.get(id);
        if (validScore(d) && d.match === top) {
          const p = players.get(id); if (!p) continue;
          p.score += 50; awards.push({ playerId: id, points: 50, reason: 'judges_favorite' });
        }
      }
    }
  }
  return awards;
}

/** Vote resolution: most votes is revealed; a tie or no votes means the imposter escapes. Returns the tied top players. */
export function resolveVotes(round: Round): string[] {
  const counts = new Map<string, number>();
  for (const t of Object.values(round.votes)) counts.set(t, (counts.get(t) || 0) + 1);
  if (!counts.size) { round.revealedId = null; round.caught = false; round.escapeReason = 'novotes'; return []; }
  const max = Math.max(...counts.values());
  const top = [...counts.entries()].filter(([, n]) => n === max).map(([id]) => id);
  if (top.length > 1) { round.revealedId = null; round.caught = false; round.escapeReason = 'tie'; return top; }
  round.revealedId = top[0];
  if (top[0] === round.imposterId) { round.caught = true; round.escapeReason = null; }
  else { round.caught = false; round.escapeReason = 'innocent'; }
  return top;
}
