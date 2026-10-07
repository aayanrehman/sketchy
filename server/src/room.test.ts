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
