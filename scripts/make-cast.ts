/**
 * Paints the player cast (and the AI detective) in the mascot's style with gpt-image-1-mini on fal (GPT Image 2 has no transparent backgrounds), using the mascot as the style reference.
 * Writes client/public/cast/<slug>.webp (transparent, 512 px, via cwebp). Review before committing.
 * Usage: node --import tsx scripts/make-cast.ts [slug ...]     (all when no slug; FAL_KEY from .env)
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { CAST, DETECTIVE } from '../shared/cast';

const FAL_KEY = process.env.FAL_KEY; if (!FAL_KEY) throw new Error('FAL_KEY missing (see .env)');
const OUT = 'client/public/cast';
const STYLE = `Use the attached character only as the STYLE reference: the same thick dark ink outline, flat cream and pastel fills, rosy round cheeks, small shiny black oval eyes, simple cute chibi proportions with a big head, clean sticker look. Draw a NEW character (not the reference): `;
const FRAME = ' Head-and-shoulders bust, facing the viewer, centered, the head filling the upper two thirds of the square, a little space above. Transparent background, no text, no frame, no shadow on the ground.';

const ref = `data:image/webp;base64,${(await fs.readFile('client/public/mascot/happy.webp')).toString('base64')}`;
const all = [...CAST, DETECTIVE];
const want = process.argv.slice(2);
await fs.mkdir(OUT, { recursive: true });
await Promise.all(all.filter((c) => !want.length || want.includes(c.slug)).map(async (c) => {
  const r = await fetch('https://fal.run/fal-ai/gpt-image-1-mini/edit', {
    method: 'POST', headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: STYLE + c.look + FRAME, image_urls: [ref], image_size: '1024x1024', background: 'transparent', quality: 'high', num_images: 1, output_format: 'png', sync_mode: true }),
  });
  if (!r.ok) throw new Error(`${c.slug}: http ${r.status} ${(await r.text()).slice(0, 200)}`);
  const json: any = await r.json();
  const url: string = json.images[0].url;
  const bytes = url.startsWith('data:') ? Buffer.from(url.split(',')[1], 'base64') : Buffer.from(await (await fetch(url)).arrayBuffer());
  const tmp = `${OUT}/${c.slug}.tmp.png`; await fs.writeFile(tmp, bytes);
  execFileSync('cwebp', ['-quiet', '-q', '86', '-alpha_q', '90', '-resize', '512', '512', tmp, '-o', `${OUT}/${c.slug}.webp`]); await fs.rm(tmp);
  console.log('wrote', c.slug);
}));
