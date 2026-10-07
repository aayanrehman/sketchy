import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const mediaDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sketchy-ai-test-'));
process.env.AI_MODE = 'openai';
process.env.LIVE_AI_ENABLED = 'true';
process.env.AI_BUDGET_FILE = path.join(mediaDir, 'budget.json');
process.env.OPENAI_API_KEY = 'test-key-never-sent';
process.env.MEDIA_DIR = mediaDir;
const { glowUp, judge, setForcedFailures } = await import('./ai');
const originalFetch = globalThis.fetch;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=';
after(async () => { globalThis.fetch = originalFetch; await fs.rm(mediaDir, { recursive: true, force: true }); });

test('image edits send only the common style and return compressed file URLs', async () => {
  const webp = await fs.readFile(new URL('../data/demo/art/cat-0.webp', import.meta.url));
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/images/edits');
    const form = options!.body as FormData;
    assert.equal(form.get('output_format'), 'webp'); assert.equal(form.get('output_compression'), '80');
    assert.equal(form.get('n'), '1'); assert.equal(form.get('size'), '1024x1024');
    assert.ok(!String(form.get('prompt')).includes('cat DJ')); assert.equal((form.get('image') as Blob).type, 'image/png');
    return Response.json({ data: [{ b64_json: webp.toString('base64') }] });
  };
  const result = await glowUp(png);
  assert.equal(result.status, 'done'); assert.match(result.glowUrl!, /^\/media\/[a-f0-9]{64}\.webp$/);
  assert.deepEqual(await fs.readFile(path.join(mediaDir, path.basename(result.glowUrl!))), webp);
});
test('invalid images fall back without calling the external API', async () => {
  globalThis.fetch = async () => { throw new Error('Must not call network'); };
  assert.equal((await glowUp('data:image/png;base64,bm90IGEgcG5n')).status, 'fallback');
});
test('image refusal and malformed upstream output have designed fallbacks', async () => {
  globalThis.fetch = async () => Response.json({ error: { code: 'moderation_blocked' } }, { status: 400 });
  assert.equal((await glowUp(png)).reason, 'http 400: moderation_blocked');
  globalThis.fetch = async () => Response.json({ data: [] });
  assert.equal((await glowUp(png)).status, 'fallback');
});
test('judge uses raw sketch and schema, validates score, and caches successful results', async () => {
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++; const body = JSON.parse(String(options!.body));
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.messages[1].content[1].image_url.url, png);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ match: 84, sees: 'a cat DJ', roast: 'Tiny paws, big tunes.' }) } }] });
  };
  const result = await judge(png, 'a cat DJ', false, 'TEST'); assert.equal(result.match, 84);
  await judge(png, 'a cat DJ', false, 'TEST'); assert.equal(calls, 1);
  setForcedFailures('TEST', ['judge']);
  assert.equal((await judge(png, 'a cat DJ', false, 'TEST')).status, 'fallback');
  setForcedFailures('TEST', []);
});
test('blank drawings do not spend API calls', async () => {
  globalThis.fetch = async () => { throw new Error('Must not call network'); };
  const result = await judge('', 'anything', true); assert.equal(result.match, undefined); assert.equal(result.status, 'fallback');
});
test('judge invalid JSON and refusals do not crash gameplay or poison cache', async () => {
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: 'nope' } }] });
  assert.equal((await judge(png, 'unique prompt', false)).status, 'fallback');
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: '{"match":73,"sees":"a sketch","roast":"Nice lines."}' } }] });
  assert.equal((await judge(png, 'unique prompt', false)).match, 73);
});
