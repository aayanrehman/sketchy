/**
 * Records real bot attempts for every target that has none: 3 artists of different skill + 1 imposter who never
 * saw the key detail. For each: an LLM writes the draft and final prompts, fal paints both, and the game's own
 * compare judge scores them against the target. Writes client/public/targets/<id>-bot-<name>-{draft,final}.webp
 * and convex/targets.json demo[<id>]. Never run while people are playing (it shares the fal account).
 * Usage: node --import tsx scripts/make-bot-content.ts [targetId ...]   (default: every target without content; FAL_KEY from .env)
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const FAL_KEY = process.env.FAL_KEY; if (!FAL_KEY) throw new Error('FAL_KEY missing (see .env)');
const JSON_PATH = 'convex/targets.json'; const IMG_DIR = 'client/public/targets';
type Score = { subject: number; details: number; style: number; color: number; composition: number; missed: string; tip: string };
type Attempt = { name: string; draftPrompt: string; draftImage: string; draft: Score; finalPrompt: string; finalImage: string; final: Score };
const lib = JSON.parse(await fs.readFile(JSON_PATH, 'utf8')) as { targets: { id: string; prompt: string; key: string; taboo: string[]; image: string }[]; demo: Record<string, { artists: Attempt[]; imposter?: Attempt }> };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function fal(endpoint: string, body: object) {
  for (let i = 0; ; i++) {
    const r = await fetch(`https://fal.run/${endpoint}`, { method: 'POST', headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if ((r.status === 429 || r.status >= 500) && i < 5) { await sleep(1500 * 2 ** i); continue; }
    if (!r.ok) throw new Error(`${endpoint} http ${r.status}: ${(await r.text()).slice(0, 160)}`);
    return r.json() as Promise<any>;
  }
}
const parse = (out: unknown) => JSON.parse(String(out).replace(/^```(json)?|```$/g, '').trim());

const WRITER = `You write example attempts for a party game where players recreate a target picture by writing image prompts. You get the target's own prompt and its key detail. Output strict JSON {"artists":[a,b,c],"imposter":d} where each attempt is {"name": string, "draftPrompt": a first try of at most 8 words, "finalPrompt": an expanded version of the same idea of at most 30 words}.
Artists all saw the whole picture: artist a is strong (gets subject, key detail, setting and the named art style, but phrased in their own words, never copying the target prompt), artist b is decent (subject, key detail and setting, forgets the style or lighting), artist c is vague (subject and rough setting only, no key detail). The imposter saw the picture with the key detail erased: they describe everything else well but replace the key detail with a plausible WRONG guess of the same kind, and never mention the real one. Names: Pixel, Doodle, Smudge for the artists, Imp for the imposter.`;
const COMPARE = "You compare a player's AI-generated image (image 2) against a target image (image 1) in a prompt-recreation game. Score how closely the attempt recreates the target in five areas, each an integer 0-20: subject (main characters and objects), details (props, actions, secondary elements), style (art medium, rendering, line work), color (palette and lighting), composition (framing, layout, viewpoint). Be strict and consistent: 20 means essentially identical in that area. Output only JSON: {\"subject\":n,\"details\":n,\"style\":n,\"color\":n,\"composition\":n,\"missed\":\"the most important thing the attempt got wrong, under 8 words\",\"tip\":\"one concrete prompting tip to get closer, under 14 words, without quoting the target's exact wording\"}";

async function write(t: typeof lib.targets[number]) {
  const json = await fal('openrouter/router', { model: 'openai/gpt-4.1-mini', system_prompt: WRITER, temperature: 0.8, max_tokens: 700, prompt: `Target prompt: ${JSON.stringify(t.prompt)}. Key detail: ${JSON.stringify(t.key)}. Return only the JSON object.` });
  const s = parse(json.output);
  const ok = (a: any) => a && typeof a.draftPrompt === 'string' && typeof a.finalPrompt === 'string' && a.draftPrompt.split(/\s+/).length <= 9 && a.finalPrompt.split(/\s+/).length <= 32;
  if (!Array.isArray(s.artists) || s.artists.length !== 3 || !s.artists.every(ok) || !ok(s.imposter)) throw new Error(`bad attempts: ${JSON.stringify(s).slice(0, 200)}`);
  const keyRe = new RegExp(t.key.replace(/^(a|an|the)\s+/i, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (keyRe.test(s.imposter.draftPrompt) || keyRe.test(s.imposter.finalPrompt)) throw new Error('imposter mentioned the key');
  return s as { artists: { name: string; draftPrompt: string; finalPrompt: string }[]; imposter: { name: string; draftPrompt: string; finalPrompt: string } };
}
async function paint(prompt: string) {
  const json = await fal('fal-ai/gpt-image-1-mini', { prompt, image_size: '1024x1024', quality: 'low', num_images: 1, output_format: 'webp', sync_mode: true });
  const u = json.images[0].url as string; const m = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(u); if (!m) throw new Error('bad image');
  return { bytes: Buffer.from(m[1], 'base64'), dataUrl: u };
}
async function judge(targetDataUrl: string, attemptDataUrl: string): Promise<Score> {
  const json = await fal('openrouter/router/vision', { model: 'openai/gpt-4.1-mini', system_prompt: COMPARE, temperature: 0.2, max_tokens: 220, prompt: 'Score image 2 against image 1. Return only the JSON object, with no markdown.', image_urls: [targetDataUrl, attemptDataUrl] });
  const p = parse(json.output); const clamp = (x: number) => Math.max(0, Math.min(20, Math.round(Number(x) || 0)));
  return { subject: clamp(p.subject), details: clamp(p.details), style: clamp(p.style), color: clamp(p.color), composition: clamp(p.composition), missed: String(p.missed || '').slice(0, 60), tip: String(p.tip || '').slice(0, 100) };
}
const score = (s: Score) => Math.round(((s.subject + s.details + s.style + s.color + s.composition) / 100) * 100);

async function record(t: typeof lib.targets[number]) {
  const targetBytes = await fs.readFile(path.join('client/public', t.image));
  const targetData = `data:image/webp;base64,${targetBytes.toString('base64')}`;
  let plan!: Awaited<ReturnType<typeof write>>;
  for (let i = 0; ; i++) { try { plan = await write(t); break; } catch (e) { if (i >= 2) throw e; log(`  ${t.id}: retrying the writer (${(e as Error).message})`); } }
  const attempt = async (a: { name: string; draftPrompt: string; finalPrompt: string }, slot: string): Promise<Attempt> => {
    const [d, f] = await Promise.all([paint(a.draftPrompt), paint(a.finalPrompt)]);
    const [ds, fs2] = await Promise.all([judge(targetData, d.dataUrl), judge(targetData, f.dataUrl)]);
    const base = `${t.id}-bot-${slot}`;
    await fs.writeFile(path.join(IMG_DIR, `${base}-draft.webp`), d.bytes); await fs.writeFile(path.join(IMG_DIR, `${base}-final.webp`), f.bytes);
    log(`  ${t.id} ${a.name}: draft ${score(ds)} → final ${score(fs2)}`);
    return { name: a.name, draftPrompt: a.draftPrompt, draftImage: `/targets/${base}-draft.webp`, draft: ds, finalPrompt: a.finalPrompt, finalImage: `/targets/${base}-final.webp`, final: fs2 };
  };
  const artists: Attempt[] = [];
  for (const [i, a] of plan.artists.entries()) artists.push(await attempt(a, ['pixel', 'doodle', 'smudge'][i]));
  const imposter = await attempt(plan.imposter, 'imposter');
  lib.demo[t.id] = { artists, imposter };
  await fs.writeFile(JSON_PATH, JSON.stringify(lib, null, 2) + '\n');
}

const wanted = process.argv.slice(2);
const todo = lib.targets.filter((t) => (wanted.length ? wanted.includes(t.id) : !lib.demo[t.id]));
log(`recording ${todo.length} target(s): ${todo.map((t) => t.id).join(' ')}`);
const queue = [...todo]; let failed = 0;
await Promise.all(Array.from({ length: 2 }, async () => {
  for (let t = queue.shift(); t; t = queue.shift()) {
    try { await record(t); log(`✓ ${t.id}`); } catch (e: any) { failed++; log(`✗ ${t.id}: ${e?.message || e}`); }
  }
}));
log(`done, ${failed} failed`);
