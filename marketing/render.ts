/**
 * Renders every marketing asset in marketing/kit.html to PNG at its exact size, plus carousel.pdf and index.html.
 *   node --import tsx marketing/render.ts            # everything
 *   node --import tsx marketing/render.ts poster     # only asset ids containing "poster"
 * Serves the project root on a local port so the template can load the game's own images and fonts.
 */
import { chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'out');
const SITE = 'https://sketchy-blue.vercel.app';
const only = process.argv.slice(2);

const MIME: Record<string, string> = { '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url || '/', 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

// Real content only: targets whose image (and masked view) exist on disk, and the recorded bot rounds.
const lib = JSON.parse(fs.readFileSync(path.join(ROOT, 'convex/targets.json'), 'utf8'));
const exists = (p: string) => fs.existsSync(path.join(ROOT, 'client/public', p));
const targets = lib.targets.filter((t: { image: string; masked: string }) => exists(t.image) && exists(t.masked));
const qr = async (url: string) => (await QRCode.toString(url, { type: 'svg', margin: 0, color: { dark: '#2B2540', light: '#FFFFFF' } })).replace('<svg ', '<svg style="width:100%;height:100%;display:block" ');
const KIT = { targets, demo: lib.demo, qrHome: await qr(SITE), qrPlay: await qr(`${SITE}/play`) };

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.addInitScript((k) => { (window as unknown as { KIT: unknown }).KIT = k; }, KIT);
page.on('pageerror', (e) => console.error('page error:', e.message));

await page.goto(`${base}/marketing/kit.html`);
type Asset = { id: string; w: number; h: number; group: string; title: string; transparent?: boolean };
const assets: Asset[] = await page.evaluate(() => (window as unknown as { ASSETS: Asset[] }).ASSETS);
const todo = only.length ? assets.filter((a) => only.some((o) => a.id.includes(o))) : assets;

for (const a of todo) {
  await page.setViewportSize({ width: a.w, height: a.h });
  await page.goto(`${base}/marketing/kit.html?a=${a.id}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode().catch(() => { throw new Error('image failed: ' + i.src); })));
    await new Promise((r) => setTimeout(r, 150)); // let SVG <image> hrefs paint
  });
  const file = path.join(OUT, `${a.id}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: a.w, height: a.h }, omitBackground: !!a.transparent });
  console.log(`${a.id}.png  ${a.w}x${a.h}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}

// carousel.pdf: one 1080x1350 page per slide
const slides = assets.filter((a) => a.id.startsWith('carousel-')).map((a) => `${base}/marketing/out/${a.id}.png`);
if (!only.length || only.some((o) => 'carousel'.includes(o) || o.includes('carousel'))) {
  await page.setViewportSize({ width: 1080, height: 1350 });
  await page.setContent(`<style>@page{size:1080px 1350px;margin:0}body{margin:0}img{display:block;width:1080px;height:1350px;break-after:page}</style>${slides.map((s) => `<img src="${s}">`).join('')}`);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  await page.pdf({ path: path.join(OUT, 'carousel.pdf'), width: '1080px', height: '1350px', printBackground: true, pageRanges: `1-${slides.length}` });
  console.log('carousel.pdf');
}

// index.html: every output with its size
const groups = [...new Set(assets.map((a) => a.group))];
const kb = (f: string) => (fs.existsSync(f) ? `${(fs.statSync(f).size / 1024).toFixed(0)} KB` : 'missing');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sketchy asset kit</title>
<style>
:root{--ink:#2B2540;--dim:#5A5478}
@font-face{font-family:Fredoka;font-weight:700;src:url(../node_modules/@fontsource/fredoka/files/fredoka-latin-700-normal.woff2)}
@font-face{font-family:Nunito;font-weight:800;src:url(../node_modules/@fontsource/nunito/files/nunito-latin-800-normal.woff2)}
body{margin:0;font-family:Nunito,system-ui,sans-serif;font-weight:800;color:var(--ink);background:linear-gradient(180deg,#BDE4FF,#E3F5FF 400px) no-repeat,#E3F5FF}
main{max-width:1280px;margin:0 auto;padding:40px 16px 80px}
h1{font-family:Fredoka;font-size:56px;margin:0;color:#FFD84D;text-shadow:0 4px 0 var(--ink),3px 0 0 var(--ink),-3px 0 0 var(--ink),0 -3px 0 var(--ink),3px 4px 0 var(--ink),-3px 4px 0 var(--ink)}
h2{font-family:Fredoka;font-size:30px;margin:48px 0 16px}
p{color:var(--dim);margin:8px 0 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
figure{margin:0;background:#fff;border:4px solid var(--ink);border-radius:20px;box-shadow:0 6px 0 var(--ink);padding:10px;display:flex;flex-direction:column}
figure a{display:block;flex:1;display:grid;place-items:center;background:repeating-conic-gradient(#EEF6FF 0 25%,#fff 0 50%) 0 0/16px 16px;border-radius:12px;min-height:180px}
figure img{max-width:100%;max-height:260px;display:block;border-radius:8px}
figcaption{padding:10px 4px 2px;font-size:15px;line-height:1.35}figcaption span{color:var(--dim);display:block;font-size:13px}
</style></head><body><main>
<h1>SKETCHY</h1><p>Marketing and submission kit · ${assets.length} images + carousel.pdf · rendered by marketing/render.ts from the game’s real targets, recorded rounds and screenshots. Copy and alt text: COPY.md.</p>
${groups.map((g) => `<h2>${g}</h2><div class="grid">${assets.filter((a) => a.group === g).map((a) => `<figure><a href="out/${a.id}.png"><img src="out/${a.id}.png" alt="${a.title}" loading="lazy"></a><figcaption>${a.title}<span>${a.id}.png · ${a.w}×${a.h} · ${kb(path.join(OUT, a.id + '.png'))}</span></figcaption></figure>`).join('')}${g === 'Carousel' ? `<figure><a href="out/carousel.pdf" style="font-family:Fredoka;font-size:28px;text-decoration:none;color:var(--ink)">carousel.pdf</a><figcaption>All 7 slides, one per page<span>carousel.pdf · 1080×1350 pages · ${kb(path.join(OUT, 'carousel.pdf'))}</span></figcaption></figure>` : ''}</div>`).join('')}
</main></body></html>`;
fs.writeFileSync(path.join(HERE, 'index.html'), html);
console.log('index.html');

await browser.close();
server.close();
