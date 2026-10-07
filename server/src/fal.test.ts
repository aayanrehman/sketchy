import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sketchy-fal-'));
process.env.AI_MODE = 'fal'; process.env.LIVE_AI_ENABLED = 'true';
process.env.FAL_KEY = 'test-key-never-sent'; process.env.MEDIA_DIR = dir;
process.env.AI_BUDGET_FILE = path.join(dir, 'budget.json');
const { glowUp, judge, AI_MODE } = await import('./ai');
const originalFetch = globalThis.fetch;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=';
after(async () => { globalThis.fetch = originalFetch; await fs.rm(dir, { recursive: true, force: true }); });
test('fal image edits preserve the selected model, one low-quality image, and private input', async () => {
  assert.equal(AI_MODE, 'fal');
  const webp = await fs.readFile(new URL('../data/demo/art/cat-0.webp', import.meta.url));
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://fal.run/fal-ai/gpt-image-1-mini/edit');
    assert.equal((options!.headers as any).Authorization, 'Key test-key-never-sent');
    const body = JSON.parse(String(options!.body));
    assert.deepEqual(body.image_urls, [png]); assert.equal(body.quality, 'low');
    assert.equal(body.num_images, 1); assert.equal(body.sync_mode, true);
    assert.ok(!body.prompt.includes('cat DJ'));
    return Response.json({ images: [{ url: `data:image/webp;base64,${webp.toString('base64')}` }] });
  };
  const result = await glowUp(png); assert.equal(result.status, 'done');
  assert.deepEqual(await fs.readFile(path.join(dir, path.basename(result.glowUrl!))), webp);
});
test('fal refuses arbitrary output URLs and invalid inline images without following them', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ images: [{ url: 'http://127.0.0.1/private' }] }); };
  assert.equal((await glowUp(png)).status, 'fallback'); assert.equal(calls, 1);
  globalThis.fetch = async () => Response.json({ images: [{ url: 'data:image/webp;base64,bm90YW5pbWFnZQ==' }] });
  assert.equal((await glowUp(png)).status, 'fallback');
});
test('fal rates the original via vision with bounded generation and validates scores', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://fal.run/openrouter/router/vision');
    const body = JSON.parse(String(options!.body));
    assert.deepEqual(body.image_urls, [png]); assert.equal(body.model, 'openai/gpt-4.1-mini');
    assert.equal(body.max_tokens, 220); assert.equal(body.enable_web_search, false);
    return Response.json({ output: JSON.stringify({ match: 82, sees: 'cat DJ', roast: 'Tiny paws, big tunes.' }), usage: { cost: 0.001 } });
  };
  const result = await judge(png, 'a cat DJ', false, undefined, true);
  assert.equal(result.match, 82); assert.equal(result.providerCostUsd, 0.001);
  globalThis.fetch = async () => Response.json({ output: '{"match":101,"sees":"cat","roast":"wow"}' });
  assert.equal((await judge(png, 'a cat DJ', false, undefined, true)).status, 'fallback');
});
test('fal failures never fall through to the old OpenAI key', async () => {
  const urls: string[] = [];
  globalThis.fetch = async url => { urls.push(String(url)); return Response.json({}, { status: 401 }); };
  assert.equal((await glowUp(png)).status, 'fallback');
  assert.equal((await judge(png, 'unique', false)).status, 'fallback');
  assert.equal(urls.length, 2); assert.ok(urls.every(url => url.startsWith('https://fal.run/')));
});
