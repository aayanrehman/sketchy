import test from 'node:test';
import assert from 'node:assert/strict';
import { RateLimit, validEvent } from './protocol';
import { AiBudget } from './ai-budget';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('malformed event schemas cannot throw or bypass payload bounds', () => {
  for (const event of ['screen:watch','join','draw:submit','chat:send','vote','steal:pick']) {
    for (const payload of [null, undefined, [], 5, 'bad', {}, { strokes: [{ points: null }] }]) assert.equal(validEvent(event, [payload]), false);
  }
  assert.equal(validEvent('join', [{code:'ABCD',name:'x',token:'bad'}, () => {}]), false);
  assert.equal(validEvent('screen:create', []), false);
  assert.equal(validEvent('chat:send', [{text:'x'.repeat(241)}]), false);
  assert.equal(validEvent('chat:send', [{text:'<b>text</b>'}]), true);
  assert.equal(validEvent('draw:submit', [{strokes:[],png:''}]), true);
  assert.equal(validEvent('draw:submit', [{strokes:[{color:'#000',size:6,points:Array(20001).fill({x:1,y:1})}],png:''}]), false);
});
test('event windows recover after expiry without unlimited key storage', () => {
  const limit = new RateLimit(1);
  assert.equal(limit.allow('a', 1, 100, 0), true); assert.equal(limit.allow('a', 1, 100, 1), false);
  assert.equal(limit.allow('b', 1, 100, 1), false); assert.equal(limit.allow('b', 1, 100, 101), true);
});
test('deployment job caps persist across instances; concurrency releases once', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sketchy-budget-'));
  try {
    const file = path.join(dir, 'ledger.json'); const budget = new AiBudget(file, 2, 1);
    const release = budget.acquire('image'); assert.ok(release); assert.equal(budget.acquire('image'), null);
    release(); release(); assert.ok(budget.acquire('image'));
    assert.equal(new AiBudget(file, 2, 8).acquire('image'), null);
    assert.ok(new AiBudget(file, 2, 8).acquire('judge'));
    fs.writeFileSync(file, 'corrupt'); assert.equal(new AiBudget(file).acquire('judge'), null);
  } finally { fs.rmSync(dir, {recursive:true,force:true}); }
});
