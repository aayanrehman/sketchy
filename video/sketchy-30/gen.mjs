// Generates index.html: the 26 s fast launch cut (1920x1080). Run: node gen.mjs
import fs from 'node:fs';

export const URL = 'sketchy-blue.vercel.app'; // swap when the custom domain is live
export const DUR = 26;
const WIN = { x: 192, y: 36, w: 1536, h: 864 }; // game footage window (0.8 of the frame)

// Footage in the window: [clip, start, dur, zoom {from, to, ox, oy} (origin in % of the window)]
export const FOOT = [
  ['draft', 8.0, 1.6, { from: 1.2, to: 1.35, ox: 42, oy: 40 }],
  ['feedback', 9.6, 2.0, { from: 1, to: 1.06, ox: 50, oy: 40 }],
  ['refine', 11.6, 1.2, { from: 1.3, to: 1.4, ox: 55, oy: 72 }],
  ['reveal', 12.8, 1.6, { from: 1.05, to: 1.18, ox: 45, oy: 62 }],
  ['hint', 16.8, 0.8, { from: 1, to: 1.05, ox: 50, oy: 50 }],
  ['vote', 17.6, 0.8, { from: 1.08, to: 1.16, ox: 40, oy: 55 }],
  ['erased', 18.4, 0.6, { from: 1.5, to: 1.6, ox: 12, oy: 40 }],
  ['steal', 19.0, 1.0, { from: 1.5, to: 1.58, ox: 45, oy: 100 }],
  ['results', 20.0, 2.4, { from: 1, to: 1.05, ox: 40, oy: 50 }],
];
const SEGS = [[8.0, 14.4], [16.8, 22.4]]; // window frame on screen
const TRUTH = [[8.0, 14.4], [16.8, 20.5]]; // the feature chips take the top edge after 20.5

// Captions: [start, end, text]
export const CAPS = [
  [4.9, 8.0, 'Room code. No login. Any phone.'],
  [8.05, 9.6, 'Study the picture. Write a quick draft.'],
  [9.65, 11.6, 'The AI draws it, scores it, and says what you missed.'],
  [11.65, 12.8, 'Fix it in your final prompt.'],
  [12.85, 14.4, 'Everyone’s final image paints in.'],
  [14.45, 16.8, 'The imposter never saw the drums. They have to bluff.'],
  [16.85, 18.4, 'Get one hint from the AI host. Then vote.'],
  [18.45, 20.0, 'Caught? Guess what was erased to steal the round.'],
  [20.05, 22.4, 'A 5-area score every round. You get better at prompting.'],
];

// Magnified crops of the 4K screenshots: [id, start, end, centerX, centerY, width]
const CALLOUTS = [
  ['feedback', 10.0, 11.6, 960, 420, 1300],
  ['hint', 16.95, 17.6, 1250, 470, 620],
  ['sam-card', 20.5, 22.4, 1380, 470, 430],
];

// Sound effects: [file, at, volume]
export const SFX = [
  ['impact-bass-1', 0.05, 0.55], ['glitch-1', 1.6, 0.4], ['whoosh', 3.05, 0.4], ['pop', 3.35, 0.5],
  ['whoosh-short', 4.8, 0.35], ['pop', 5.15, 0.35], ['pop', 5.35, 0.35], ['pop', 5.55, 0.35],
  ['typing', 8.1, 0.3], ['ping', 10.0, 0.4], ['typing', 11.65, 0.3], ['sparkle', 13.55, 0.4],
  ['whoosh', 14.35, 0.4], ['pop', 14.6, 0.4], ['pop', 15.3, 0.4], ['pop', 15.95, 0.45],
  ['pop', 17.0, 0.35], ['click', 17.8, 0.45], ['glitch-1', 18.4, 0.3], ['chime', 19.45, 0.35],
  ['pop', 20.55, 0.35], ['pop', 21.0, 0.3], ['pop', 21.2, 0.3], ['pop', 21.4, 0.3], ['pop', 21.6, 0.3],
  ['whoosh', 22.35, 0.4], ['impact-bass-1', 22.65, 0.5], ['pop', 23.5, 0.35],
];

const h = [];
const tl = [];
const at = (n) => +n.toFixed(3);

for (const [id, s, d, z] of FOOT) {
  h.push(`<div class="slot"><div class="zoom" data-layout-allow-overflow id="z-${id}" style="transform-origin:${z.ox}% ${z.oy}%"><video id="v-${id}" class="clip" src="assets/clips/${id}.mp4" muted playsinline data-start="${s}" data-duration="${d}" data-track-index="2"></video></div></div>`);
  tl.push(`tl.fromTo('#z-${id}', { scale: ${z.from} }, { scale: ${z.to}, duration: ${d}, ease: 'sine.inOut' }, ${s});`);
}
SEGS.forEach(([a, b]) => h.push(`<div class="frame clip" data-start="${a}" data-duration="${at(b - a)}" data-track-index="3"></div>`));
TRUTH.forEach(([a, b], i) => {
  h.push(`<div class="truth clip" data-start="${a}" data-duration="${at(b - a)}" data-track-index="4"><span id="truth-${i}">● Real gameplay · sketchy-blue.vercel.app</span></div>`);
  tl.push(`tl.fromTo('#truth-${i}', { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, ${a + 0.1});`);
});
CALLOUTS.forEach(([id, s, e, cx, cy, w], i) => {
  const dim = id === 'hint' ? '' : `<div class="dim" id="d-${i}"></div>`;
  h.push(`<div class="callout clip" data-start="${s}" data-duration="${at(e - s)}" data-track-index="5">${dim}<img id="c-${i}" src="assets/callouts/${id}.png" style="left:${cx - w / 2}px;top:${cy}px;width:${w}px" /></div>`);
  if (dim) tl.push(`tl.fromTo('#d-${i}', { opacity: 0 }, { opacity: 1, duration: 0.2 }, ${s});`);
  tl.push(`tl.fromTo('#c-${i}', { yPercent: -50, scale: 0.5, opacity: 0, rotation: -3 }, { yPercent: -50, scale: 1, opacity: 1, rotation: 0, duration: 0.35, ease: 'back.out(1.8)' }, ${s});`);
});
CAPS.forEach(([s, e, text], i) => {
  h.push(`<div class="cap clip" data-start="${s}" data-duration="${at(e - s)}" data-track-index="8"><div class="pill" id="cap-${i}">${text}</div></div>`);
  tl.push(`tl.fromTo('#cap-${i}', { y: 30, scale: 0.9, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2)' }, ${s});`);
});
SFX.forEach(([f, t, v], i) => {
  const d = { 'impact-bass-1': 2.7, 'glitch-1': 1.2, whoosh: 1.5, 'whoosh-short': 1.2, pop: 0.3, typing: 1.5, ping: 1.3, sparkle: 1.8, click: 0.35, chime: 2.4 }[f];
  h.push(`<audio id="sfx-${i}" src="assets/sfx/${f}.mp3" data-start="${t}" data-duration="${Math.min(d, DUR - t).toFixed(2)}" data-track-index="11" data-volume="${v}"></audio>`);
});

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
@font-face { font-family: 'Fredoka'; font-weight: 500; src: url(assets/fonts/fredoka-latin-500-normal.woff2) format('woff2'); }
@font-face { font-family: 'Fredoka'; font-weight: 600; src: url(assets/fonts/fredoka-latin-600-normal.woff2) format('woff2'); }
@font-face { font-family: 'Fredoka'; font-weight: 700; src: url(assets/fonts/fredoka-latin-700-normal.woff2) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 800; src: url(assets/fonts/nunito-latin-800-normal.woff2) format('woff2'); }
:root { --ink: #2B2540; --sky: #BDE4FF; --sky2: #E3F5FF; --yellow: #FFD84D; --pink: #FF7AB0; --blue: #6CC1FF; --lime: #BDF26E; --purple: #B48BFF; --red: #FF5C5C; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--sky2); }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: 'Fredoka', sans-serif; color: var(--ink); }
.clip { position: absolute; }
.bg { inset: 0; background: linear-gradient(180deg, var(--sky) 0%, var(--sky2) 72%); }
.sun { position: absolute; right: 180px; top: -120px; width: 520px; height: 520px; border-radius: 50%; background: radial-gradient(circle, rgba(255,241,184,.95) 0%, rgba(255,241,184,0) 68%); }
.cloud { position: absolute; background: #fff; border-radius: 999px; box-shadow: 0 6px 0 rgba(43,37,64,.06); }
.cloud::before, .cloud::after { content: ''; position: absolute; background: #fff; border-radius: 50%; }
.cloud::before { width: 46%; height: 150%; left: 14%; bottom: 20%; }
.cloud::after { width: 34%; height: 120%; left: 50%; bottom: 25%; }
.hills { position: absolute; left: 0; bottom: 0; width: 1920px; height: 260px; }
.slot { position: absolute; left: ${WIN.x}px; top: ${WIN.y}px; width: ${WIN.w}px; height: ${WIN.h}px; border-radius: 26px; overflow: hidden; }
.zoom { position: absolute; inset: 0; }
.zoom video { inset: 0; width: 100%; height: 100%; object-fit: cover; }
.frame { left: ${WIN.x - 6}px; top: ${WIN.y - 6}px; width: ${WIN.w + 12}px; height: ${WIN.h + 12}px; border: 6px solid var(--ink); border-radius: 32px; box-shadow: 0 10px 0 var(--ink); }
.truth { left: 0; width: 1920px; top: ${WIN.y - 22}px; display: flex; justify-content: center; }
.truth span { display: block; background: var(--lime); border: 4px solid var(--ink); border-radius: 999px; padding: 6px 20px; font-weight: 600; font-size: 24px; box-shadow: 0 4px 0 var(--ink); }
.callout { left: ${WIN.x}px; top: ${WIN.y}px; width: ${WIN.w}px; height: ${WIN.h}px; }
.callout .dim { position: absolute; inset: 0; border-radius: 26px; background: rgba(43,37,64,.45); }
.callout img { position: absolute; display: block; background: #fff; padding: 10px; border: 5px solid var(--ink); border-radius: 24px; box-shadow: 0 10px 0 var(--ink), 0 24px 60px rgba(43,37,64,.35); margin-left: -${WIN.x}px; margin-top: -${WIN.y}px; }
.cap { left: 0; width: 1920px; top: 932px; height: 120px; display: flex; align-items: center; justify-content: center; }
.pill { display: block; max-width: 1760px; background: #fff; border: 5px solid var(--ink); border-radius: 26px; padding: 14px 34px 16px; font-weight: 600; font-size: 48px; line-height: 1.15; text-align: center; box-shadow: 0 7px 0 var(--ink); white-space: nowrap; }
.logo { font-weight: 700; color: var(--yellow); letter-spacing: .02em; line-height: .95; text-shadow: 0 6px 0 var(--ink), 4px 0 0 var(--ink), -4px 0 0 var(--ink), 0 -4px 0 var(--ink), 4px 6px 0 var(--ink), -4px 6px 0 var(--ink), 4px -4px 0 var(--ink), -4px -4px 0 var(--ink); }
.card { position: absolute; background: #fff; border: 6px solid var(--ink); border-radius: 30px; box-shadow: 0 10px 0 var(--ink); overflow: hidden; }
.card img { display: block; width: 100%; height: 100%; object-fit: cover; }
.tag { position: absolute; display: block; background: #fff; border: 4px solid var(--ink); border-radius: 999px; padding: 6px 22px; font-weight: 600; font-size: 30px; box-shadow: 0 5px 0 var(--ink); white-space: nowrap; }
.stamp { position: absolute; display: block; padding: 6px 26px; border-radius: 16px; background: var(--red); border: 5px solid var(--ink); font-weight: 700; font-size: 64px; letter-spacing: .08em; box-shadow: 0 6px 0 var(--ink); white-space: nowrap; }
.big { position: absolute; font-weight: 700; font-size: 104px; line-height: 1.02; white-space: nowrap; }
.big em { font-style: normal; color: var(--yellow); text-shadow: 0 5px 0 var(--ink), 3px 0 0 var(--ink), -3px 0 0 var(--ink), 0 -3px 0 var(--ink), 3px 5px 0 var(--ink), -3px 5px 0 var(--ink); }
.big.red em { color: var(--red); }
/* hook */
.hook { inset: 0; }
#hook-card { position: absolute; left: 150px; top: 150px; width: 640px; height: 640px; }
#hook-card .card { inset: 0; }
#hook-dash { position: absolute; left: 124px; top: 124px; width: 692px; height: 692px; border: 8px dashed var(--red); border-radius: 44px; }
#hook-stamp { left: 330px; top: 170px; }
#hook-l1 { left: 900px; top: 300px; }
#hook-l2 { left: 900px; top: 420px; }
#hook-l3 { left: 900px; top: 300px; }
#hook-l4 { left: 900px; top: 420px; }
/* logo */
.brand { inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
#br-row { display: flex; align-items: center; gap: 30px; }
#br-row img { width: 300px; height: 300px; object-fit: contain; }
#br-row .logo { font-size: 230px; }
#br-tag { margin-top: 40px; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 40px; letter-spacing: .12em; }
/* join */
.join { inset: 0; }
#host-slot { position: absolute; left: 70px; top: 96px; width: 1290px; height: 726px; border-radius: 24px; overflow: hidden; }
#host-slot video, #phone-slot video { width: 100%; height: 100%; object-fit: cover; }
.join-frame { left: 64px; top: 90px; width: 1302px; height: 738px; border: 6px solid var(--ink); border-radius: 30px; box-shadow: 0 10px 0 var(--ink); }
#phone-slot { position: absolute; left: 1468px; top: 70px; width: 372px; height: 806px; border-radius: 40px; overflow: hidden; }
.phone-frame { left: 1456px; top: 58px; width: 396px; height: 830px; border: 12px solid var(--ink); border-radius: 52px; box-shadow: 0 10px 0 rgba(43,37,64,.5); }
/* score badge */
.badge, .chips, .callout, .cap { z-index: 20; }
.badge { left: 0; width: 1920px; top: 470px; display: flex; justify-content: center; }
.badge span { display: block; background: var(--yellow); border: 6px solid var(--ink); border-radius: 999px; padding: 14px 40px; font-weight: 700; font-size: 64px; box-shadow: 0 8px 0 var(--ink); white-space: nowrap; }
.badge b { display: inline-block; margin-left: 18px; padding: 2px 22px; border-radius: 999px; background: #E6E9F2; border: 4px solid var(--ink); font-size: 46px; vertical-align: middle; }
/* twist */
.twist { inset: 0; }
.twist .card { width: 470px; height: 470px; top: 250px; }
.twist .tag { top: 176px; font-size: 34px; }
#tw-quote { position: absolute; left: 1330px; top: 760px; width: 480px; text-align: center; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 32px; }
#tw-dash { position: absolute; left: 708px; top: 236px; width: 504px; height: 504px; border: 6px dashed var(--red); border-radius: 40px; }
/* chips */
.chips { left: 0; width: 1920px; top: 46px; display: flex; justify-content: center; gap: 18px; }
.chips span { display: block; border: 4px solid var(--ink); border-radius: 999px; padding: 8px 24px; font-weight: 600; font-size: 34px; box-shadow: 0 5px 0 var(--ink); white-space: nowrap; }
/* end */
.end { inset: 0; }
#end-mascot { position: absolute; left: 120px; top: 190px; width: 620px; height: 620px; object-fit: contain; }
#end-col { position: absolute; left: 720px; top: 130px; width: 1120px; display: flex; flex-direction: column; align-items: center; }
#end-col .logo { font-size: 210px; }
#end-col .play { font-weight: 600; font-size: 50px; margin-top: 36px; }
#end-url { display: block; margin-top: 14px; background: #fff; border: 7px solid var(--ink); border-radius: 30px; padding: 14px 44px 18px; font-weight: 700; font-size: 84px; box-shadow: 0 10px 0 var(--ink); white-space: nowrap; }
#end-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 18px; margin-top: 46px; width: 1060px; }
#end-chips span { display: block; border: 4px solid var(--ink); border-radius: 999px; padding: 8px 24px; font-weight: 600; font-size: 36px; box-shadow: 0 5px 0 var(--ink); white-space: nowrap; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="1920" data-height="1080">
<div class="bg clip" data-start="0" data-duration="${DUR}" data-track-index="0">
  <div class="sun" data-layout-allow-overflow></div>
  <div class="cloud" id="cl1" style="left:140px;top:150px;width:240px;height:64px"></div>
  <div class="cloud" id="cl2" style="left:1560px;top:330px;width:200px;height:54px"></div>
  <div class="cloud" id="cl3" style="left:860px;top:70px;width:170px;height:46px"></div>
  <svg class="hills" viewBox="0 0 1920 260" preserveAspectRatio="none">
    <path d="M0 120 C 320 40 640 60 960 110 S 1600 70 1920 100 L1920 260 L0 260Z" fill="#B9F09A"/>
    <path d="M0 170 C 400 110 800 140 1120 175 S 1700 140 1920 160 L1920 260 L0 260Z" fill="#A9EC84"/>
    <path d="M0 215 C 500 185 900 200 1300 222 S 1750 205 1920 212 L1920 260 L0 260Z" fill="#7ED35C"/>
  </svg>
</div>

<div class="hook clip" data-start="0" data-duration="3.2" data-track-index="1">
  <div id="hook-dash"></div>
  <div id="hook-card">
    <div class="card"><img src="assets/img/frog-band.webp" /></div>
    <div class="card" id="hook-masked"><img src="assets/img/frog-band-masked.webp" /></div>
  </div>
  <span class="stamp" id="hook-stamp">ERASED</span>
  <div class="big" id="hook-l1">Recreate <em>this</em></div>
  <div class="big" id="hook-l2">with an AI prompt.</div>
  <div class="big red" id="hook-l3">But one of you</div>
  <div class="big red" id="hook-l4">can’t see <em>all</em> of it.</div>
</div>

<div class="brand clip" data-start="3.2" data-duration="1.6" data-track-index="1">
  <div id="br-row"><img src="assets/img/judge.webp" /><div class="logo" id="br-logo">SKETCHY</div></div>
  <div id="br-tag">THE AI PROMPTING PARTY GAME</div>
</div>

<div class="join clip" data-start="4.8" data-duration="3.2" data-track-index="1">
  <span class="tag" id="tag-host" style="left:90px;top:30px">TV or laptop hosts</span>
  <span class="tag" id="tag-n" style="left:470px;top:30px;background:var(--yellow)">2–8 players · bots fill empty seats</span>
  <span class="tag" id="tag-phone" style="left:1520px;top:-4px;background:var(--lime)">Your phone</span>
</div>
<div id="host-slot"><video id="v-join-host" class="clip" src="assets/clips/join-host.mp4" muted playsinline data-start="4.8" data-duration="3.2" data-track-index="2"></video></div>
<div id="phone-slot"><video id="v-join-phone" class="clip" src="assets/clips/join-phone.mp4" muted playsinline data-start="4.8" data-duration="3.2" data-track-index="2"></video></div>
<div class="join-frame clip" data-start="4.8" data-duration="3.2" data-track-index="3"></div>
<div class="phone-frame clip" data-start="4.8" data-duration="3.2" data-track-index="3"></div>

<div class="badge clip" data-start="13.5" data-duration="0.9" data-track-index="6"><span id="badge">Final: 80/100<b>SILVER</b></span></div>

<div class="twist clip" data-start="14.4" data-duration="2.4" data-track-index="1">
  <span class="tag" id="tw-t1" style="left:210px">Everyone saw</span>
  <span class="tag" id="tw-t2" style="left:740px;background:var(--pink)">The imposter saw</span>
  <span class="tag" id="tw-t3" style="left:1320px;background:var(--yellow)">The imposter’s draft</span>
  <div class="card" id="tw-c1" style="left:150px"><img src="assets/img/frog-band.webp" /></div>
  <div id="tw-dash"></div>
  <div class="card" id="tw-c2" style="left:725px"><img src="assets/img/frog-band-masked.webp" /></div>
  <div class="card" id="tw-c3" style="left:1300px"><img src="assets/img/frog-band-bot-imposter-draft.webp" /></div>
  <p id="tw-quote">“frog playing guitar on a lily pad”</p>
</div>

<div class="chips clip" data-start="20.5" data-duration="1.9" data-track-index="6">
  <span id="ch-0" style="background:var(--yellow)">Daily target</span><span id="ch-1" style="background:var(--pink)">Streaks</span><span id="ch-2" style="background:var(--blue)">Challenge duels</span><span id="ch-3" style="background:var(--lime)">Crews</span>
</div>

<div class="end clip" data-start="22.4" data-duration="3.6" data-track-index="1">
  <img id="end-mascot" src="assets/img/happy.webp" />
  <div id="end-col">
    <div class="logo" id="end-logo">SKETCHY</div>
    <div class="play" id="end-play">Play free at</div>
    <span id="end-url">${URL}</span>
    <div id="end-chips">
      <span style="background:var(--yellow)">2–8 players</span><span style="background:var(--blue)">Room code + QR</span><span style="background:var(--lime)">No login · no install</span><span style="background:#fff">Phone or laptop</span><span style="background:var(--pink)">Solo vs. bots</span>
    </div>
  </div>
</div>

${h.join('\n')}

<audio id="music" src="assets/bgm/track.mp3" data-start="0" data-duration="${DUR}" data-track-index="10" data-volume="0.85"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
tl.fromTo('#cl1', { x: 0 }, { x: 260, duration: ${DUR}, ease: 'none' }, 0);
tl.fromTo('#cl2', { x: 0 }, { x: -220, duration: ${DUR}, ease: 'none' }, 0);
tl.fromTo('#cl3', { x: 0 }, { x: 160, duration: ${DUR}, ease: 'none' }, 0);
// hook: target slams in, then glitches to the imposter's erased view
tl.fromTo('#hook-card', { scale: 1.7, opacity: 0, rotation: -8 }, { scale: 1, opacity: 1, rotation: -3, duration: 0.35, ease: 'power4.out' }, 0);
tl.fromTo('#hook-l1', { x: 120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 0.25);
tl.fromTo('#hook-l2', { x: 120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 0.55);
tl.to(['#hook-l1', '#hook-l2'], { opacity: 0, x: -60, duration: 0.15 }, 1.55);
tl.fromTo('#hook-masked', { opacity: 0 }, { opacity: 1, duration: 0.06 }, 1.6);
tl.fromTo('#hook-card', { x: 0 }, { x: 14, duration: 0.04, yoyo: true, repeat: 7, ease: 'none' }, 1.6);
tl.fromTo('#hook-dash', { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 0.2 }, 1.65);
tl.fromTo('#hook-stamp', { scale: 2.4, opacity: 0, rotation: 6 }, { scale: 1, opacity: 1, rotation: -7, duration: 0.25, ease: 'back.out(2.2)' }, 1.75);
tl.fromTo('#hook-l3', { x: 120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 1.8);
tl.fromTo('#hook-l4', { x: 120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 2.1);
// logo slam
tl.fromTo('#br-row', { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.2)' }, 3.2);
tl.fromTo('#br-tag', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, 3.5);
tl.to('#br-row', { scale: 1.06, duration: 1.2, ease: 'sine.inOut' }, 3.55);
// join
tl.fromTo(['#tag-host', '#tag-n', '#tag-phone'], { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.2, ease: 'back.out(2)' }, 5.1);
// score badge
tl.fromTo('#badge', { scale: 0.3, opacity: 0, rotation: -8 }, { scale: 1, opacity: 1, rotation: -3, duration: 0.3, ease: 'back.out(2.4)' }, 13.5);
// twist
tl.fromTo(['#tw-c1', '#tw-t1'], { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 14.55);
tl.fromTo(['#tw-c2', '#tw-t2'], { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 15.25);
tl.fromTo('#tw-dash', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 15.4);
tl.fromTo(['#tw-c3', '#tw-t3', '#tw-quote'], { y: 60, opacity: 0, rotation: 4 }, { y: 0, opacity: 1, rotation: 0, duration: 0.35, ease: 'back.out(1.8)' }, 15.9);
// feature chips
tl.fromTo('.chips span', { y: -24, opacity: 0, scale: 0.7 }, { y: 0, opacity: 1, scale: 1, duration: 0.25, stagger: 0.2, ease: 'back.out(2.4)' }, 20.55);
// end card
tl.fromTo('#end-mascot', { y: 120, opacity: 0, rotation: -10 }, { y: 0, opacity: 1, rotation: 0, duration: 0.4, ease: 'back.out(1.8)' }, 22.45);
tl.fromTo('#end-mascot', { rotation: 0 }, { rotation: 3, duration: 0.4, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 22.9);
tl.fromTo('#end-logo', { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.4)' }, 22.65);
tl.fromTo(['#end-play', '#end-url'], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.12, ease: 'back.out(2)' }, 23.0);
tl.fromTo('#end-chips span', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, stagger: 0.08, ease: 'back.out(2.4)' }, 23.5);
${tl.join('\n')}
window.__timelines['main'] = tl;
</script>
</body>
</html>
`;
let n = 0; // Studio needs a stable id on every timed element
if (process.argv[1]?.endsWith('gen.mjs')) fs.writeFileSync('index.html', html.replace(/<div class="([a-z-]+) clip"(?![^>]*\bid=)/g, (m, c) => `<div id="${c}-${n++}" class="${c} clip"`));
if (process.argv[1]?.endsWith('gen.mjs')) console.log('index.html written');
