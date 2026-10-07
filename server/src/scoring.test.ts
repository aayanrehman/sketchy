import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVotes, scoreRound } from './scoring';
import type { Round, Player } from '../../shared/types';

const player = (id: string, streak = 0): Player => ({ id, name: id, color: '#fff', avatar: '🦊', connected: true, isBot: false, spectator: false, score: 0, streak, readyHowTo: true, hasSubmitted: true, hasVoted: true });
const round = (over: Partial<Round>): Round => ({
  index: 1, promptPairId: 1, theme: 'T', realPrompt: 'real', decoyPrompt: 'decoy', imposterId: 'imp', participantIds: ['imp', 'a', 'b', 'c'],
  drawings: [], votes: {}, revealedId: null, caught: null, escapeReason: null, stealOptions: [], stealPick: null, stealCorrect: null, fled: false, awards: [], ...over,
});

test('tie means the imposter escapes', () => {
  const r = round({ votes: { a: 'imp', b: 'c', c: 'a' } });
  resolveVotes(r);
  assert.equal(r.caught, false); assert.equal(r.escapeReason, 'tie'); assert.equal(r.revealedId, null);
});
test('no votes means the imposter escapes', () => {
  const r = round({}); resolveVotes(r);
  assert.equal(r.caught, false); assert.equal(r.escapeReason, 'novotes');
});
test('most voted innocent means the imposter escapes', () => {
  const r = round({ votes: { a: 'b', b: 'a', c: 'b' } }); resolveVotes(r);
  assert.equal(r.caught, false); assert.equal(r.escapeReason, 'innocent'); assert.equal(r.revealedId, 'b');
});
test('most voted imposter is caught', () => {
  const r = round({ votes: { a: 'imp', b: 'imp', c: 'a' } }); resolveVotes(r);
  assert.equal(r.caught, true); assert.equal(r.revealedId, 'imp');
});
test('scoring table: votes, streak, escape, steal, perfect disguise, judges favorite', () => {
  const players = new Map([['imp', player('imp')], ['a', player('a', 1)], ['b', player('b')], ['c', player('c')]]);
  const d = (playerId: string, match: number) => ({ playerId, strokes: [], glowStatus: 'done' as const, golden: false, judgeStatus: 'done' as const, match, blank: false });
  const r = round({ votes: { a: 'imp', b: 'imp', c: 'a' }, drawings: [d('imp', 70), d('a', 80), d('b', 60), d('c', 50)] });
  resolveVotes(r); r.stealCorrect = true;
  const awards = scoreRound(r, players);
  assert.equal(players.get('a')!.score, 150 + 50);   // streak x1.5 + judge's favorite
  assert.equal(players.get('b')!.score, 100);
  assert.equal(players.get('c')!.score, 0);
  assert.equal(players.get('c')!.streak, 0);
  assert.equal(players.get('imp')!.score, 150 + 100); // steal + perfect disguise (70 >= median 60)
  assert.ok(awards.some((x) => x.reason === 'caught_vote_streak'));
});
test('escape gives +200 and fallback judge skips perfect disguise', () => {
  const players = new Map([['imp', player('imp')], ['a', player('a')], ['b', player('b')], ['c', player('c')]]);
  const d = (playerId: string, match: number, judgeStatus: 'done' | 'fallback' = 'done') => ({ playerId, strokes: [], glowStatus: 'done' as const, golden: false, judgeStatus, match, blank: false });
  const r = round({ votes: {}, drawings: [d('imp', -1, 'fallback'), d('a', 80), d('b', 60), d('c', 50)] });
  resolveVotes(r);
  scoreRound(r, players);
  assert.equal(players.get('imp')!.score, 200);
  assert.equal(players.get('a')!.score, 50);
});
test('imposter fled gives artists +50', () => {
  const players = new Map([['imp', player('imp')], ['a', player('a')], ['b', player('b')], ['c', player('c')]]);
  const r = round({ fled: true });
  scoreRound(r, players);
  assert.equal(players.get('a')!.score, 50); assert.equal(players.get('imp')!.score, 0);
});
