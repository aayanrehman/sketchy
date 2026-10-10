/** Regenerates favicon.ico, favicon-64.png and apple-touch-icon.png from the mascot: head + full beret on a sky tile, never cropped. */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const mascot = `data:image/webp;base64,${(await fs.readFile('client/public/mascot/happy.webp')).toString('base64')}`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
// Head crop: beret top to chin, with a margin. The source is 512px; the head spans about x 100-420, y 10-330.
const html = (size: number, crop: boolean) => `<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.2)}px;background:linear-gradient(180deg,#BDE4FF,#E3F5FF);overflow:hidden;position:relative">
<img src="${mascot}" style="position:absolute;${crop ? `width:${size * 1.45}px;left:${-size * 0.235}px;top:${size * 0.03}px` : `width:${size * 0.9}px;left:${size * 0.05}px;top:${size * 0.05}px`}"></div></body>`;
async function render(size: number, crop: boolean, file: string) {
  await p.setViewportSize({ width: size, height: size }); await p.setContent(html(size, crop)); await p.waitForTimeout(150);
  const png = await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await fs.writeFile(path.join('client/public', file), png); return png;
}
const pngs = await Promise.all([16, 32, 48].map((s) => render(s, true, `favicon-${s}.tmp.png`)));
await render(64, true, 'favicon-64.png'); await render(180, false, 'apple-touch-icon.png');
// ICO container with PNG entries.
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length; const dirs: Buffer[] = [];
pngs.forEach((png, i) => { const s = [16, 32, 48][i]; const d = Buffer.alloc(16); d.writeUInt8(s, 0); d.writeUInt8(s, 1); d.writeUInt8(0, 2); d.writeUInt8(0, 3); d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(png.length, 8); d.writeUInt32LE(offset, 12); dirs.push(d); offset += png.length; });
await fs.writeFile('client/public/favicon.ico', Buffer.concat([header, ...dirs, ...pngs]));
for (const s of [16, 32, 48]) await fs.rm(`client/public/favicon-${s}.tmp.png`);
await b.close(); console.log('icons written');
