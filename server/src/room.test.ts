import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from './room';
import { loadContent } from './demo';

test('two shipped demo pairs include distinct subjects and URL artwork', () => {
  for (const id of [2, 9]) { const c = loadContent(id); assert.ok(c); assert.equal(c.source, 'prepared-sample'); assert.equal(c.real.length, 3); assert.equal(c.decoy.length, 1); assert.ok(c.real.every(d => d.strokes.length > 10 && d.glowUrl?.startsWith('/demo-art/'))); }
});
test('private prompts, drawings and judge scores stay hidden until their reveal', () => {
  const room = new Room('TEST', () => {}); const seats = ['A','B','C','D'].map(n => { const r = room.addPlayer(n); if ('error' in r) throw Error(r.error); return r.seat; });
  try {
    room.forcedPairs = { 1: 2 }; room.forcedImposters = { 1: seats[3].player.id };
    assert.equal(room.start(), null); seats.forEach(s => room.howToReady(s.player.id));
    assert.equal(room.phase, 'PROMPT');
    const r = room.currentRound()!; r.drawings.push({playerId:seats[0].player.id,strokes:[{color:'#000',size:6,points:[{x:10,y:10}]}],glowStatus:'done',glowUrl:'/demo-art/cat-0.webp',golden:false,judgeStatus:'done',match:88,sees:'a DJ',roast:'Nice.',blank:false});
    const screen = room.build(null); assert.equal(screen.room.rounds[0].promptPairId, 0); assert.equal(screen.room.rounds[0].realPrompt, ''); assert.equal(screen.room.rounds[0].imposterId, ''); assert.equal(screen.room.rounds[0].drawings[0].match, undefined); assert.deepEqual(screen.room.rounds[0].drawings[0].strokes, []);
    assert.equal(room.build(seats[0]).me?.prompt, 'A cat DJ'); assert.equal(room.build(seats[3]).me?.prompt, 'A cat chef');
    room.advance(); room.advance(); assert.equal(room.phase, 'GALLERY');
    const gallery = room.build(null).room.rounds[0]; assert.equal(gallery.drawings[0].glowUrl, '/demo-art/cat-0.webp'); assert.equal(gallery.drawings[0].match, undefined); assert.equal(gallery.imposterId, '');
    room.advance(); room.advance(); room.advance(); assert.equal(room.phase, 'UNMASK'); assert.equal(room.build(null).room.rounds[0].imposterId, seats[3].player.id); assert.equal(room.build(null).room.rounds[0].drawings[0].match, undefined);
    room.advance(); assert.equal(room.phase, 'VERDICT'); assert.equal(room.build(null).room.rounds[0].drawings[0].match, 88);
  } finally { room.destroy(); }
});

function fixture(n = 4, ai?: ConstructorParameters<typeof Room>[3]) {
  const room = new Room('TEST', () => {}, false, ai);
  const seats = Array.from({ length: n }, (_, i) => {
    const result = room.addPlayer(`Player ${i}`); if ('error' in result) throw Error(result.error);
    room.connect(result.seat, `socket-${i}`); return result.seat;
  });
  return { room, seats };
}
function begin(room: Room, seats: ReturnType<typeof fixture>['seats']) {
  assert.equal(room.start(), null); seats.forEach(s => room.howToReady(s.player.id)); room.advance();
  assert.equal(room.phase, 'DRAW');
}
const stroke = [{ color: '#111', size: 6, points: [{ x: 10, y: 10 }, { x: 40, y: 40 }] }];
const flush = () => new Promise(r => setImmediate(r));

test('serialized steal payloads hide answers and new private fields from every viewer until resolution', () => {
  const { room, seats } = fixture();
  try {
    room.forcedPairs = { 1: 2 }; room.forcedImposters = { 1: seats[3].player.id }; begin(room, seats);
    room.advance(); room.advance(); room.advance();
    const r = room.currentRound()!;
    Object.assign(r, { privateAnswer: r.realPrompt, nestedSecret: { answer: r.realPrompt } });
    seats.slice(0, 3).forEach(s => room.vote(s.player.id, r.imposterId)); room.advance();
    assert.equal(room.phase, 'UNMASK');
    for (const phase of ['UNMASK', 'STEAL']) {
      assert.equal(room.phase, phase);
      for (const seat of [null, ...seats]) {
        const state = JSON.parse(JSON.stringify(room.build(seat)));
        const out = state.room.rounds[0];
        assert.equal(out.realPrompt, ''); assert.equal(out.decoyPrompt, ''); assert.equal(out.promptPairId, 0);
        assert.equal(out.stealCorrect, null); assert.equal(out.stealPick, null);
        assert.equal(out.privateAnswer, undefined); assert.equal(out.nestedSecret, undefined);
        assert.equal(new Set(out.stealOptions).size, 4); assert.ok(!out.stealOptions.includes(r.decoyPrompt));
        assert.equal(out.stealOptions.filter((v: string) => v === r.realPrompt).length, 1);
        if (seat?.player.id === r.imposterId) assert.equal(state.me.prompt, r.decoyPrompt);
      }
      if (phase === 'UNMASK') room.advance();
    }
    room.stealPick(r.imposterId, r.realPrompt);
    assert.equal(room.build(null).room.rounds[0].realPrompt, r.realPrompt);
    room.stealPick(r.imposterId, r.stealOptions.find(x => x !== r.realPrompt)!);
    assert.equal(r.stealCorrect, true);
  } finally { room.destroy(); }
});

test('two eight-player games each get 24 image jobs and reset game identity', async () => {
  let images = 0;
  const ai = { glowUp: async () => { images++; return { status: 'fallback' as const }; }, judge: async () => ({ status: 'fallback' as const }) };
  const { room, seats } = fixture(8, ai);
  try {
    let previous = '';
    for (let game = 0; game < 2; game++) {
      begin(room, seats); assert.notEqual(room.gameId, previous); previous = room.gameId;
      for (let round = 0; round < 3; round++) {
        seats.forEach(s => room.submitDrawing(s.player.id, stroke, 'test-png')); await flush();
        assert.equal(room.phase, 'GALLERY');
        while (String(room.phase) !== 'SCORES') room.advance();
        room.advance(); if (String(room.phase) === 'PROMPT') room.advance();
      }
      assert.equal(room.phase, 'FINAL'); assert.equal(room.aiImageCount, 24); room.playAgain();
    }
    assert.equal(images, 48);
  } finally { room.destroy(); }
});

test('late AI completions cannot change a rematch, and voting evidence is frozen', async () => {
  let finishGlow!: (r: any) => void, finishJudge!: (r: any) => void;
  const ai = { glowUp: () => new Promise<any>(r => { finishGlow = r; }), judge: () => new Promise<any>(r => { finishJudge = r; }) };
  const { room, seats } = fixture(4, ai);
  try {
    begin(room, seats); room.submitDrawing(seats[0].player.id, stroke, 'test-png'); room.advance(); room.advance();
    assert.equal(room.phase, 'DISCUSS');
    const before = room.build(null).room.rounds[0].drawings[0];
    finishGlow({ status: 'done', glowUrl: '/media/late.webp' }); await flush();
    assert.deepEqual(room.build(null).room.rounds[0].drawings[0], before);
    room.advance(); assert.deepEqual(room.build(null).room.rounds[0].drawings[0], before);
    room.phase = 'FINAL'; room.playAgain(); begin(room, seats);
    const snapshot = JSON.stringify(room.build(null).room);
    finishJudge({ status: 'done', match: 100, sees: 'old answer', roast: 'old' }); await flush();
    assert.equal(JSON.stringify(room.build(null).room), snapshot);
  } finally { room.destroy(); }
});

test('phase deadlines reject late votes/steals; timeout steal fails; verdict waits for humans', () => {
  const { room, seats } = fixture();
  try {
    begin(room, seats); room.advance(); room.advance(); room.advance();
    const r = room.currentRound()!;
    room.phaseEndsAt = Date.now() - 1; room.vote(seats[0].player.id, seats[1].player.id);
    assert.deepEqual(r.votes, {});
    r.caught = true; room.phase = 'UNMASK'; room.advance(); room.phaseEndsAt = Date.now() - 1;
    room.stealPick(r.imposterId, r.realPrompt); assert.equal(r.stealPick, null);
    room.advance(); assert.equal(r.stealCorrect, false); assert.equal(room.phaseEndsAt, null);
    seats.slice(0, 3).forEach(s => room.readyVerdict(s.player.id)); assert.equal(room.phase, 'VERDICT');
    room.readyVerdict(seats[3].player.id); assert.equal(room.phase, 'SCORES');
  } finally { room.destroy(); }
});

test('chat is bounded, participant-only and survives reconnect; duplicate names stay bounded', () => {
  const { room, seats } = fixture();
  try {
    const duplicate = room.addPlayer('Player 0'); assert.ok('seat' in duplicate && duplicate.seat.player.name.length <= 12);
    begin(room, [...seats, ...( 'seat' in duplicate ? [duplicate.seat] : [])]); room.advance(); room.advance();
    for (let i = 0; i < 60; i++) room.sendChat(seats[0].player.id, '<script>clue</script>');
    room.sendChat('stranger', 'injected'); assert.equal(room.chat.length, 50);
    room.disconnect('socket-0'); room.connect(seats[0], 'replacement');
    assert.equal(room.build(seats[0]).room.chat?.length, 50);
    room.advance(); room.advance(); room.sendChat(seats[0].player.id, 'after discussion'); assert.equal(room.chat.length, 50);
  } finally { room.destroy(); }
});
