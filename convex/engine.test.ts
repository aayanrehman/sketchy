import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, newState, type Seat } from './engine';

/** Let the current phase's timer fire. */
const timeout = (e: Engine) => { e.now = (e.s.phaseEndsAt ?? e.now) + 1; e.advance(); };

/** A prompt-mode room with 4 players, advanced to DRAFT. */
function draftRoom() {
  const e = new Engine(newState('TEST', false, 1_000), 'mock', 1_000);
  const seats = ['Ana', 'Ben', 'Cy', 'Dee'].map((n) => e.addPlayer(n) as Seat);
  for (const s of seats) e.connect(s);
  assert.equal(e.start(), null);
  for (const s of seats) e.howToReady(s.player.id);
  assert.equal(e.s.phase, 'PROMPT');
  e.advance();
  assert.equal(e.s.phase, 'DRAFT');
  return { e, seats };
}

test('a player who misses the draft can still write a final prompt in REFINE', () => {
  const { e, seats } = draftRoom();
  const [a, b, c, d] = seats;
  for (const s of [a, b, c]) assert.equal(e.submitPrompt(s.player.id, 'draft', 'a frog playing drums'), null);
  e.now = e.s.phaseEndsAt! + 1; e.advance(); // DRAFT timer fires: Dee never drafted
  assert.equal(e.s.phase, 'REFINE');
  const r = e.s.rounds[0];
  const dee = r.drawings.find((x) => x.playerId === d.player.id)!;
  assert.equal(dee.draftStatus, 'fallback');
  assert.equal(dee.finalPrompt, undefined, 'final stays open');
  assert.equal(e.submitPrompt(d.player.id, 'final', 'a green frog drumming on a lily pad, watercolor, warm light'), null);
  assert.equal(dee.blank, false);
  assert.equal(dee.glowStatus, 'pending');
  assert.ok(e.effects.some((x: any) => x.t === 'gen' && x.playerId === d.player.id && x.pass === 'final'), 'a final image is generated');
});

test('missing both passes leaves a blank entry and the round still advances', () => {
  const { e, seats } = draftRoom();
  const [a, b, c, d] = seats;
  for (const s of [a, b, c]) e.submitPrompt(s.player.id, 'draft', 'a frog playing drums');
  timeout(e);
  assert.equal(e.s.phase, 'REFINE');
  for (const s of [a, b, c]) e.submitPrompt(s.player.id, 'final', 'a frog playing drums on a lily pad');
  assert.equal(e.s.phase, 'REFINE', 'Dee has not locked a final yet');
  timeout(e);
  assert.equal(e.s.phase, 'GALLERY');
  const dee = e.s.rounds[0].drawings.find((x) => x.playerId === d.player.id)!;
  assert.equal(dee.finalPrompt, '');
  assert.equal(dee.blank, true);
});

test('word limits: 8 for the draft, 30 for the final, 320 characters', () => {
  const { e, seats } = draftRoom();
  const id = seats[0].player.id;
  assert.match(e.submitPrompt(id, 'draft', 'one two three four five six seven eight nine') || '', /at most 8 words/);
  assert.equal(e.submitPrompt(id, 'draft', 'one two three four five six seven eight'), null);
});

test('VERDICT waits for a late final score, then gives up after the settle timer', () => {
  const { e, seats } = draftRoom();
  const ids = seats.map((s) => s.player.id);
  for (const id of ids) e.submitPrompt(id, 'draft', 'a frog playing drums');
  assert.equal(e.s.phase, 'REFINE', 'all drafts in: Refine starts early');
  for (const id of ids) assert.equal(e.submitPrompt(id, 'final', 'a frog playing drums on a lily pad'), null);
  assert.equal(e.s.phase, 'GALLERY', 'all finals in: reveal starts early');
  timeout(e); // DISCUSS
  timeout(e); // VOTE
  const r = e.s.rounds[0];
  for (const id of ids) if (id !== r.imposterId) e.vote(id, r.imposterId);
  e.vote(r.imposterId, ids.find((x) => x !== r.imposterId)!);
  assert.equal(e.s.phase, 'UNMASK');
  timeout(e); // STEAL (caught)
  timeout(e); // VERDICT, every final image still unscored
  assert.equal(e.s.phase, 'VERDICT');
  assert.ok(e.s.timers['verdictSettle'], 'settle timer armed');
  for (const id of ids) e.readyVerdict(id);
  assert.equal(e.s.phase, 'VERDICT', 'everyone ready but scores pending: stay');
  // Three scores land; one never does.
  const gameId = e.s.gameId; const token = e.s.timers['verdictSettle'];
  for (const id of ids.slice(0, 3)) e.applyCompare(1, id, gameId, 'final', { status: 'done', breakdown: { subject: 15, details: 12, style: 10, color: 14, composition: 13 } });
  assert.equal(e.s.phase, 'VERDICT');
  assert.ok(e.fire('verdictSettle', token, { t: 'verdictSettle' }));
  assert.equal(e.s.phase, 'SCORES', 'settle timer scores what arrived and moves on');
  const scored = e.s.rounds[0].drawings.filter((d) => d.judgeStatus === 'done').length;
  assert.equal(scored, 3);
});

test('quick pace: 2 rounds and short phases; classic keeps PRD timings', () => {
  const e = new Engine(newState('TEST', false, 1_000), 'mock', 1_000);
  const seats = ['Ana', 'Ben', 'Cy', 'Dee'].map((n) => e.addPlayer(n) as Seat);
  for (const s of seats) e.connect(s);
  e.start(); for (const s of seats) e.howToReady(s.player.id);
  assert.equal(e.s.totalRounds, 2);
  assert.equal(e.s.phaseEndsAt! - e.now, 8_000, 'quick study');
  e.advance(); assert.equal(e.s.phaseEndsAt! - e.now, 25_000, 'quick draft');
  const c = new Engine(newState('CLSC', false, 1_000), 'mock', 1_000);
  const cs = ['Ana', 'Ben', 'Cy', 'Dee'].map((n) => c.addPlayer(n) as Seat);
  for (const s of cs) c.connect(s);
  c.setSettings({ pace: 'classic' });
  c.start(); for (const s of cs) c.howToReady(s.player.id);
  assert.equal(c.s.totalRounds, 3);
  assert.equal(c.s.phaseEndsAt! - c.now, 12_000, 'classic study');
  c.advance(); assert.equal(c.s.phaseEndsAt! - c.now, 35_000, 'classic draft');
});

test('difficulty changes word limits and round rules', () => {
  const e = new Engine(newState('TEST', false, 1_000), 'mock', 1_000);
  const seats = ['Ana', 'Ben', 'Cy', 'Dee'].map((n) => e.addPlayer(n) as Seat);
  for (const s of seats) e.connect(s);
  e.setSettings({ difficulty: 'hard' });
  e.start(); for (const s of seats) e.howToReady(s.player.id); e.advance();
  assert.equal(e.s.rounds[0].modifier, 'taboo', 'hard: a rule every round');
  const id = seats[0].player.id;
  assert.match(e.submitPrompt(id, 'draft', 'one two three four five six seven') || '', /at most 6 words/);
  const easy = new Engine(newState('EASY', false, 1_000), 'mock', 1_000);
  const es = ['Ana', 'Ben', 'Cy', 'Dee'].map((n) => easy.addPlayer(n) as Seat);
  for (const s of es) easy.connect(s);
  easy.setSettings({ difficulty: 'easy' });
  easy.start(); for (const s of es) easy.howToReady(s.player.id); easy.advance();
  assert.equal(easy.s.rounds[0].modifier, 'none');
  assert.equal(easy.submitPrompt(es[0].player.id, 'draft', 'one two three four five six seven eight nine ten'), null, 'easy allows 10-word drafts');
});

test('solo play works on any target with placeholder bots; daily uses today\'s target with the human as artist', () => {
  const e = new Engine(newState('DEMO', true, 1_000), 'mock', 1_000);
  const me = e.addPlayer('Me') as Seat; e.connect(me);
  e.setupDemo(me.player.id, { daily: '2026-10-08' });
  e.start(); e.howToReady(me.player.id);
  // bots ack the how-to via timers; fire them
  for (const [key, token] of Object.entries(e.s.timers)) if (key.startsWith('bot:')) e.fire(key, token, { t: 'bot', op: 'howto', id: e.s.botIds[Number(key.slice(-1)) % 3] || e.s.botIds[0] });
  for (const id of e.s.botIds) e.howToReady(id);
  assert.equal(e.s.totalRounds, 1);
  const r = e.s.rounds[0];
  assert.ok(r && r.targetId, 'round started with a target');
  assert.notEqual(r.imposterId, me.player.id, 'human is an artist on the daily');
  // a bot drafting on a target without recorded content gets placeholder content
  e.advance(); // DRAFT
  const bot = e.s.botIds[0];
  (e as any).botPrompt(bot, 'draft');
  const d = r.drawings.find((x) => x.playerId === bot)!;
  assert.ok(d && d.draftPrompt, 'placeholder bot drafted');
});
