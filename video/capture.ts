/**
 * Captures real footage of the live game for the launch video.
 *   node --import tsx video/capture.ts demo [desktop|phone]   solo demo, full run
 *   node --import tsx video/capture.ts join                   host screen + phone joining a room
 *   node --import tsx video/capture.ts home                   home page hero
 *   node --import tsx video/capture.ts music [seconds]        the game's own procedural lofi bed
 * Output: video/raw/<name>/ (frames, shots, events.json) and video/raw/<name>.mp4.
 */
import { chromium, type Page, type BrowserContext } from 'playwright';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SITE = 'https://sketchy-blue.vercel.app';
const convex = new ConvexHttpClient('https://curious-chickadee-740.convex.cloud');
const RAW = path.resolve('video/raw');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Rec = { name: string; dir: string; frames: { file: string; t: number }[]; events: { t: number; label: string; shot?: string }[]; stop: () => Promise<string> };

/** CDP screencast to numbered JPEGs; stop() encodes a constant-30fps MP4 with the real frame timing. */
async function record(page: Page, name: string, w: number, h: number): Promise<Rec> {
  const dir = path.join(RAW, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(path.join(dir, 'frames'), { recursive: true }); fs.mkdirSync(path.join(dir, 'shots'));
  const cdp = await page.context().newCDPSession(page);
  const rec: Rec = { name, dir, frames: [], events: [], stop: async () => '' };
  let stopped = false;
  cdp.on('Page.screencastFrame', (f: any) => {
    if (stopped) return;
    const file = path.join(dir, 'frames', `${String(rec.frames.length).padStart(6, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    rec.frames.push({ file, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: w, maxHeight: h });
  const t0 = Date.now() / 1000;
  rec.stop = async () => {
    stopped = true;
    await cdp.send('Page.stopScreencast').catch(() => {});
    const end = Date.now() / 1000;
    const list = rec.frames.map((f, i) => `file '${f.file}'\nduration ${((rec.frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`).join('\n') + `\nfile '${rec.frames.at(-1)!.file}'\n`;
    fs.writeFileSync(path.join(dir, 'frames.txt'), list);
    const first = rec.frames[0].t;
    fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify({ videoStart: first, events: rec.events.map((e) => ({ ...e, at: +(e.t - first).toFixed(2) })) }, null, 1));
    const out = path.join(RAW, `${name}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'frames.txt'),
      '-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=white,fps=30,format=yuv420p`,
      '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', out]);
    fs.rmSync(path.join(dir, 'frames'), { recursive: true, force: true });
    console.log(`${name}: ${rec.frames.length} frames, ${(end - t0).toFixed(1)}s -> ${out}`);
    return out;
  };
  return rec;
}

async function mark(page: Page, rec: Rec, label: string, shot = true) {
  const e: Rec['events'][number] = { t: Date.now() / 1000, label };
  if (shot) { e.shot = path.join(rec.dir, 'shots', `${String(rec.events.length).padStart(3, '0')}-${label.replace(/[^a-z0-9]+/gi, '-')}.png`); await page.screenshot({ path: e.shot }).catch(() => {}); }
  rec.events.push(e); console.log(`[${rec.name}] ${label}`);
}

async function typeSlow(page: Page, sel: string, text: string) {
  await page.locator(sel).click(); await page.keyboard.type(text, { delay: 55 });
}

async function clickText(page: Page, re: RegExp) {
  const b = page.getByRole('button', { name: re }).first();
  if (await b.isVisible().catch(() => false) && await b.isEnabled().catch(() => false)) { await b.click(); return true; }
  return false;
}

async function launch() { return chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); }
function desktopCtx(b: any): Promise<BrowserContext> { return b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 }); }
function phoneCtx(b: any): Promise<BrowserContext> { return b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true }); }

const PROMPTS = {
  1: { draft: 'frog drumming on a lily pad, sunset', final: ', cheerful green frog with a bright red drum kit and gold cymbals, soft watercolor illustration' },
  2: { draft: 'orange kitty spinning music decks', final: ', chubby with purple ear muffs, glowing neon decks, pastel sticker art, thick outlines' },
} as const;

async function demo(kind: 'desktop' | 'phone') {
  const b = await launch(); const ctx = kind === 'desktop' ? await desktopCtx(b) : await phoneCtx(b);
  const page = await ctx.newPage();
  const [w, h] = kind === 'desktop' ? [1920, 1080] : [1080, 1920];
  await page.goto(`${SITE}/demo`, { waitUntil: 'networkidle' });
  const rec = await record(page, `demo-${kind}`, w, h);
  await sleep(1500); await mark(page, rec, 'entry');
  await typeSlow(page, '#name', 'Sam'); await sleep(400);
  await page.getByRole('button', { name: /start/i }).click();
  let sess: any = null;
  for (let i = 0; i < 60 && !sess; i++) { await sleep(500); sess = await page.evaluate(() => sessionStorage.getItem('sketchy.demo')).then((s) => s && JSON.parse(s)); }
  const { code, token } = sess;
  const done = new Set<string>(); let last = '';
  let shotAt = 0;
  for (let t = 0; t < 1500; t++) {
    const s: any = await convex.query(api.game.state, { code, token });
    const room = s.room; const k = `${room.round}:${room.phase}`;
    if (k !== last) { last = k; await mark(page, rec, `r${room.round}-${room.phase}`); shotAt = Date.now(); }
    else if (Date.now() - shotAt > 2500) { await mark(page, rec, `r${room.round}-${room.phase}-hold`); shotAt = Date.now(); }
    if (room.phase === 'FINAL') break;
    const r = room.rounds[room.round - 1];
    const once = async (fn: () => Promise<any>) => { if (!done.has(k)) { done.add(k); await fn(); } };
    if (room.phase === 'HOW_TO') { await clickText(page, /next|let.?s play|got it/i); }
    if (room.phase === 'DRAFT') await once(async () => { await sleep(1500); await typeSlow(page, '#prompt', PROMPTS[room.round as 1 | 2].draft); await sleep(600); await clickText(page, /lock in draft/i); });
    if (room.phase === 'REFINE') await once(async () => {
      for (let i = 0; i < 40; i++) { if (await page.locator('.feedback__score').isVisible().catch(() => false)) break; await sleep(500); }
      await mark(page, rec, 'feedback-visible'); await sleep(4500);
      await page.locator('#prompt').click(); await page.locator('#prompt').press('End'); await page.keyboard.type(PROMPTS[room.round as 1 | 2].final, { delay: 55 }); await sleep(600); await clickText(page, /lock in final/i);
    });
    if (room.phase === 'DISCUSS') await once(async () => {
      for (let i = 0; i < 30; i++) { if (await page.locator('.side__hint').first().isVisible().catch(() => false)) break; await sleep(500); }
      await mark(page, rec, 'hint-visible'); await sleep(3000);
      if (room.round === 1 && kind === 'desktop') { await page.locator('#chat-input').click(); await page.keyboard.type('whose drums look different? 👀', { delay: 55 }); await page.keyboard.press('Enter'); }
    });
    if (room.phase === 'VOTE' && room.round === 1) await once(async () => {
      await sleep(2500);
      const imp = (await import('../convex/targets.json', { with: { type: 'json' } })).default.demo['frog-band'].imposter;
      const d = r.drawings.find((x: any) => JSON.stringify(x).includes(imp.finalImage) || JSON.stringify(x).includes(imp.finalPrompt));
      const name = room.players.find((p: any) => p.id === d?.playerId)?.name;
      console.log('voting for', name);
      if (name) await page.getByLabel(`${name}'s drawing`).first().click();
    });
    if (room.phase === 'STEAL' && room.round === 2) await once(async () => { await sleep(3000); await page.getByRole('button', { name: /neon turntable/i }).click().catch(() => {}); });
    if (room.phase === 'VERDICT') await once(async () => {
      await sleep(5000);
      if (kind === 'desktop') { await page.mouse.move(960, 600); for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 250); await sleep(900); } await mark(page, rec, 'verdict-scrolled'); for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -250); await sleep(300); } }
      else { for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 300); await sleep(900); } await mark(page, rec, 'verdict-scrolled'); }
      await sleep(2500); await clickText(page, /see scores/i);
    });
    await sleep(400);
  }
  await sleep(7000); await mark(page, rec, 'final-settled');
  // Highlight reel: step through it if there are arrows.
  for (let i = 0; i < 3; i++) { if (!(await clickText(page, /next/i))) break; await sleep(1800); }
  await mark(page, rec, 'final-reel');
  await clickText(page, /share your result/i); await sleep(3500); await mark(page, rec, 'share-dialog'); await sleep(2500);
  await rec.stop(); await b.close();
}

async function join() {
  const b = await launch();
  const host = await (await desktopCtx(b)).newPage();
  await host.goto(`${SITE}/host`, { waitUntil: 'networkidle' });
  await host.waitForURL(/code=/); await host.mouse.click(5, 300); await host.evaluate(() => (document.activeElement as any)?.blur?.()); const code = new URL(host.url()).searchParams.get('code')!;
  const phone = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
  await phone.goto(`${SITE}/play`, { waitUntil: 'networkidle' });
  const rh = await record(host, 'join-host', 1920, 1080); const rp = await record(phone, 'join-phone', 1080, 2338);
  await sleep(2500); await mark(host, rh, 'host-ready'); await mark(phone, rp, 'phone-ready');
  await typeSlow(phone, '#code', code); await sleep(300); await typeSlow(phone, '#name', 'Maya'); await sleep(500);
  await phone.getByRole('button', { name: /join game/i }).click();
  await sleep(3000); await mark(host, rh, 'host-1-joined'); await mark(phone, rp, 'phone-joined');
  for (const n of ['Leo', 'Priya', 'Jordan']) { await convex.mutation(api.game.join, { code, name: n }); await sleep(1600); }
  await sleep(2500); await mark(host, rh, 'host-4-joined'); await mark(phone, rp, 'phone-lobby');
  await sleep(3000);
  await rh.stop(); await rp.stop(); await b.close();
}

async function home() {
  const b = await launch(); const page = await (await desktopCtx(b)).newPage();
  await page.goto(SITE, { waitUntil: 'networkidle' });
  const rec = await record(page, 'home', 1920, 1080);
  await sleep(1000); await mark(page, rec, 'home'); await sleep(14000); await mark(page, rec, 'home-later');
  await rec.stop(); await b.close();
}

/** Taps every connection to the AudioContext's destination into a MediaRecorder. */
async function music(seconds: number) {
  const b = await launch(); const page = await (await desktopCtx(b)).newPage();
  await page.addInitScript(() => {
    const orig = AudioNode.prototype.connect as any;
    (AudioNode.prototype as any).connect = function (dest: any, ...rest: any[]) {
      const ctx = this.context as any;
      if (dest instanceof AudioDestinationNode) {
        if (!ctx.__tap) { ctx.__tap = ctx.createMediaStreamDestination(); const mr = new MediaRecorder(ctx.__tap.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 }); const chunks: Blob[] = []; mr.ondataavailable = (e) => chunks.push(e.data); mr.start(1000); (window as any).__rec = { mr, chunks }; }
        orig.call(this, ctx.__tap);
      }
      return orig.call(this, dest, ...rest);
    };
  });
  await page.goto(SITE, { waitUntil: 'networkidle' });
  await page.mouse.click(10, 10); await page.keyboard.press('Shift');
  await sleep(seconds * 1000);
  const b64 = await page.evaluate(async () => {
    const r = (window as any).__rec; if (!r) return null; r.mr.stop(); await new Promise((res) => setTimeout(res, 800));
    const buf = await new Blob(r.chunks, { type: 'audio/webm' }).arrayBuffer(); let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s);
  });
  if (!b64) throw new Error('no audio captured');
  fs.mkdirSync(RAW, { recursive: true }); const webm = path.join(RAW, 'music.webm'); fs.writeFileSync(webm, Buffer.from(b64, 'base64'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-ar', '48000', '-ac', '2', path.join(RAW, 'music.wav')]);
  console.log('music ->', path.join(RAW, 'music.wav')); await b.close();
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'demo') await demo((arg as any) || 'desktop');
else if (cmd === 'join') await join();
else if (cmd === 'home') await home();
else if (cmd === 'music') await music(Number(arg) || 100);
else console.log('usage: demo [desktop|phone] | join | home | music [seconds]');
