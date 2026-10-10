/** Screenshots the live /cover route at 1200×630 into client/public/og.png, docs/sketchy-cover.png and video/sketchy-cover-1200x630.png. */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const SITE = process.env.SITE || 'https://sketchy-blue.vercel.app';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.goto(`${SITE}/cover`); await p.locator('.cover__card img').first().waitFor(); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
const png = await p.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
for (const f of ['client/public/og.png', 'docs/sketchy-cover.png', 'video/sketchy-cover-1200x630.png']) await fs.writeFile(f, png);
await b.close(); console.log('cover written');
