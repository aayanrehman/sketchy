/**
 * Paints the landing hero: the cast in a police lineup, Inspector Luna inspecting, one suspect hiding a "?" cloud.
 * References: every cast portrait. Writes client/public/hero.webp (1536x1024 -> 1200 px wide). Usage: node --import tsx scripts/make-hero.ts
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { CAST, DETECTIVE } from '../shared/cast';

const FAL_KEY = process.env.FAL_KEY; if (!FAL_KEY) throw new Error('FAL_KEY missing (see .env)');
const refs = await Promise.all([...CAST, DETECTIVE].map(async (c) => `data:image/webp;base64,${(await fs.readFile(`client/public/cast/${c.slug}.webp`)).toString('base64')}`));
const prompt = `A wide, cheerful cartoon illustration in exactly the style of the reference characters: thick dark ink outlines, flat pastel fills, rosy cheeks, cute chibi proportions, clean sticker look.
Scene: a playful police lineup inside a cozy art gallery. Against a pale lilac wall with a simple height chart, ALL EIGHT of these characters from the references (count them: exactly eight, none missing) stand side by side in one row, full body, slightly smaller so all eight fit, each holding a small framed painting, from left to right: the orange fox with a red scarf, the green frog with a straw hat, the white unicorn with an apron, the pink octopus with glasses and pens, the panda with a camera and cap, the lion with a monocle and bow tie, the penguin night guard with a flashlight, the mint dragon in a yellow hoodie.
Each looks a little guilty or smug. The painting held by the unicorn shows only a grey cloud with a big white question mark. Nothing floats in the air.
In the front right corner, larger and closer to the viewer, the grey owl detective from the references in a deerstalker hat and tan trench coat peers at the lineup through a big magnifying glass.
Pale sky-blue floor. Bright, soft lighting, sky blue, lilac and cream palette with pops of yellow and pink. No text, no letters, no numbers on the height chart.`;
const r = await fetch('https://fal.run/fal-ai/gpt-image-1-mini/edit', {
  method: 'POST', headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt, image_urls: refs, image_size: '1536x1024', quality: 'high', num_images: 1, output_format: 'png', sync_mode: true }),
});
if (!r.ok) throw new Error(`http ${r.status} ${(await r.text()).slice(0, 300)}`);
const url: string = (await r.json() as any).images[0].url;
const out = process.argv[2] || 'client/public/hero.webp';
const tmp = `${out}.tmp.png`;
await fs.writeFile(tmp, url.startsWith('data:') ? Buffer.from(url.split(',')[1], 'base64') : Buffer.from(await (await fetch(url)).arrayBuffer()));
execFileSync('cwebp', ['-quiet', '-q', '82', '-resize', '1200', '0', tmp, '-o', out]); await fs.rm(tmp);
console.log('wrote', out);
