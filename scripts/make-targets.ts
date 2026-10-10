/**
 * Generates new Prompt-mode targets with fal: an LLM writes the spec (prompt, key detail, steal options, taboo words),
 * gpt-image-1-mini paints the target, and the edit model erases the key detail under a grey "?" cloud for the imposter.
 * Writes client/public/targets/<id>.webp + <id>-masked.webp and appends to convex/targets.json. Review the images before committing.
 * Usage: node --import tsx scripts/make-targets.ts "a llama running a lemonade stand" "an octopus knitting" ...   (FAL_KEY from .env)
 *        node --import tsx scripts/make-targets.ts --count 10        (the LLM invents the themes)
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const FAL_KEY = process.env.FAL_KEY; if (!FAL_KEY) throw new Error('FAL_KEY missing (see .env)');
const JSON_PATH = 'convex/targets.json'; const IMG_DIR = 'client/public/targets';
const lib = JSON.parse(await fs.readFile(JSON_PATH, 'utf8')) as { targets: any[]; demo: Record<string, unknown> };
const existingIds = new Set(lib.targets.map((t) => t.id));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fal(endpoint: string, body: object) {
  for (let i = 0; ; i++) {
    const r = await fetch(`https://fal.run/${endpoint}`, { method: 'POST', headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 429 && i < 4) { await sleep(1000 * 2 ** i); continue; }
    if (!r.ok) throw new Error(`${endpoint} http ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json() as Promise<any>;
  }
}
const SPEC_SYSTEM = `You write targets for a party game where players recreate a picture by writing an image prompt. Output strict JSON:
{"id": kebab-case two words, "theme": 1-2 words, "prompt": 14-22 words describing ONE vivid, funny scene with exactly one main character, one clearly visible key prop or detail, a setting, and a named art style (e.g. watercolor, flat vector, claymation, pixel art, 3D render, comic book, gouache, paper cut-out), "key": the key prop as a short noun phrase that appears VERBATIM in the prompt (e.g. "a red drum kit"), "stealOptions": 4 options of the same kind, the first is the key verbatim, "taboo": 3-5 obvious lowercase words a player would reach for (the subject and the key prop, singular forms)}.
The key prop must be a distinct physical object that could be erased from the picture without making the scene unreadable. Avoid text, logos, real people and brands.`;

async function spec(theme: string | null, avoid: string[]) {
  const ask = theme ? `Theme: ${theme}.` : 'Invent a fresh theme.';
  const json = await fal('openrouter/router', { model: 'openai/gpt-4.1-mini', system_prompt: SPEC_SYSTEM, temperature: 0.9, max_tokens: 300, prompt: `${ask} Do not reuse these ids or subjects: ${avoid.join(', ')}. Return only the JSON object.` });
  const s = JSON.parse(String(json.output).replace(/^```(json)?|```$/g, '').trim());
  const bad = !s.id || !s.prompt || !s.key || !Array.isArray(s.stealOptions) || s.stealOptions.length !== 4 || !Array.isArray(s.taboo) || !String(s.prompt).toLowerCase().includes(String(s.key).toLowerCase());
  if (bad) throw new Error(`bad spec: ${JSON.stringify(s)}`);
  s.id = String(s.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (existingIds.has(s.id)) s.id = `${s.id}-${Math.random().toString(36).slice(2, 5)}`;
  return s as { id: string; theme: string; prompt: string; key: string; stealOptions: string[]; taboo: string[] };
}
const dataUrlToBytes = (u: string) => { const m = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(u); if (!m) throw new Error('not a webp data url'); return Buffer.from(m[1], 'base64'); };
async function paint(prompt: string) {
  const json = await fal('fal-ai/gpt-image-1-mini', { prompt, image_size: '1024x1024', quality: 'medium', num_images: 1, output_format: 'webp', sync_mode: true });
  return json.images[0].url as string;
}
async function erase(imageUrl: string, key: string) {
  const json = await fal('fal-ai/gpt-image-1-mini/edit', {
    prompt: `Remove ${key} from this picture completely and cover exactly the area where it was with a soft fluffy grey cloud bearing a large white question mark, drawn in the same art style. Keep everything else in the image exactly as it is: same character, pose, setting, colors and framing.`,
    image_urls: [imageUrl], image_size: '1024x1024', quality: 'medium', num_images: 1, output_format: 'webp', sync_mode: true,
  });
  return json.images[0].url as string;
}

const args = process.argv.slice(2);
const count = args[0] === '--count' ? Number(args[1] || 5) : 0;
const themes: (string | null)[] = count ? Array.from({ length: count }, () => null) : args;
if (!themes.length) throw new Error('Give themes or --count N');
const made: string[] = [];
for (const theme of themes) {
  try {
    const s = await spec(theme, [...existingIds, ...made]);
    console.log(`→ ${s.id}: ${s.prompt}  [key: ${s.key}]`);
    const image = await paint(s.prompt);
    const masked = await erase(image, s.key);
    await fs.writeFile(path.join(IMG_DIR, `${s.id}.webp`), dataUrlToBytes(image));
    await fs.writeFile(path.join(IMG_DIR, `${s.id}-masked.webp`), dataUrlToBytes(masked));
    lib.targets.push({ id: s.id, theme: s.theme, prompt: s.prompt, key: s.key, stealOptions: s.stealOptions, taboo: s.taboo.map((w: string) => w.toLowerCase()), image: `/targets/${s.id}.webp`, masked: `/targets/${s.id}-masked.webp`, maskFallback: false });
    await fs.writeFile(JSON_PATH, JSON.stringify(lib, null, 2) + '\n');
    existingIds.add(s.id); made.push(s.id);
  } catch (e: any) { console.error(`✗ ${theme || '(invented)'}: ${e?.message || e}`); }
}
console.log(`made ${made.length}: ${made.join(' ')}`);
