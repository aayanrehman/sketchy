// Generates index.html (1920x1080) from the beat list below. Run: node gen.mjs
import fs from 'node:fs';

const URL = 'sketchy-blue.vercel.app'; // swap when the custom domain is live
const DUR = 85;
const WIN = { x: 192, y: 36, w: 1536, h: 864 }; // game footage window (0.8 of 1920x1080)

// Footage in the window: [id, start, dur, zoom {from, to, ox, oy} origin in % of the window]
const FOOT = [
  ['study', 14, 4, { from: 1, to: 1.12, ox: 25, oy: 40 }],
  ['draft', 18, 5, { from: 1.05, to: 1.3, ox: 48, oy: 22 }],
  ['feedback', 23, 7, { from: 1, to: 1.08, ox: 50, oy: 30 }],
  ['refine', 30, 5, { from: 1.1, to: 1.22, ox: 45, oy: 45 }],
  ['reveal', 35, 5, { from: 1, to: 1.06, ox: 45, oy: 60 }],
  ['hint', 46, 5, { from: 1, to: 1.05, ox: 60, oy: 50 }],
  ['vote', 51, 3, { from: 1, to: 1.06, ox: 45, oy: 55 }],
  ['unmask', 54, 3, { from: 1.06, to: 1.12, ox: 45, oy: 60 }],
  ['steal', 57, 2, { from: 1.15, to: 1.2, ox: 45, oy: 25 }],
  ['verdict', 59, 8, { from: 1, to: 1, ox: 50, oy: 50 }],
  ['bluff', 67, 4, { from: 1, to: 1.12, ox: 18, oy: 50 }],
  ['podium', 71, 3, { from: 1, to: 1.06, ox: 50, oy: 40 }],
  ['reel', 74, 2, { from: 1.05, to: 1.1, ox: 50, oy: 50 }],
  ['share', 76, 2, { from: 1.05, to: 1.12, ox: 50, oy: 45 }],
];

// Burned-in captions: [start, end, text]
const CAPS = [
  [0.3, 2.5, 'Recreate the picture with an AI prompt.'],
  [2.6, 5, 'One of you can’t see all of it.'],
  [5.3, 9.4, 'One screen hosts. Everyone joins on their own phone.'],
  [9.5, 14, 'Room code or QR. No login. No install.'],
  [14.15, 18, 'Everyone studies the same target picture.'],
  [18.15, 23, 'Write a quick draft. 8 words, max.'],
  [23.15, 30, 'The AI draws your prompt, scores it, and tells you what it missed.'],
  [30.15, 35, 'Refine it, up to 30 words. Only the final image is scored.'],
  [35.15, 40, 'Final images paint in, each with its draft in the corner.'],
  [40.3, 43, 'The twist: one player’s picture had the key detail blurred.'],
  [43.1, 46, 'They have to guess what’s there, and blend in.'],
  [46.15, 51, 'Sketchy, the AI host, drops one hint. Then everyone argues it out.'],
  [51.15, 54, 'Vote for the imposter.'],
  [54.1, 59, 'Caught! But they get one guess to steal the round.'],
  [59.15, 63.2, 'Then see the real prompt behind the picture…'],
  [63.3, 67, '…and a 5-area score. Draft 34 → final 74. You get better every round.'],
  [67.15, 71, 'Next round, you might be the one bluffing.'],
  [71.15, 77.9, 'Awards, a highlight reel, and a result card to share.'],
];

// Magnified crops from the 2x screenshots, over a dimmed window: [id, start, end, cx, cy, width]
const CALLOUTS = [
  ['feedback-card', 25.4, 30, 960, 400, 1240],
  ['hint-card', 47.2, 51, 900, 430, 760],
  ['pixel-draft', 48.6, 51, 1420, 430, 230],
  ['verdict-head', 59.9, 63.2, 960, 410, 1340],
  ['sam-card', 63.4, 67, 960, 482, 560],
];

const segs = [[14, 40], [46, 78]]; // when the window is on screen

const h = [];
const tl = [];
const at = (n) => +n.toFixed(3);

// Footage slots
for (const [id, s, d, z] of FOOT) {
  h.push(`<div class="slot"><div class="zoom" data-layout-allow-overflow id="z-${id}" style="transform-origin:${z.ox}% ${z.oy}%"><video id="v-${id}" class="clip" src="assets/clips/${id}.mp4" muted playsinline data-start="${s}" data-duration="${d}" data-track-index="2"></video></div></div>`);
  tl.push(`tl.fromTo('#z-${id}', { scale: ${z.from} }, { scale: ${z.to}, duration: ${d}, ease: 'sine.inOut' }, ${s});`);
}
// Window frame + truth chip
segs.forEach(([a, b], i) => {
  h.push(`<div class="frame clip" data-start="${a}" data-duration="${b - a}" data-track-index="3"></div>`);
  h.push(`<div class="truth clip" data-start="${a}" data-duration="${b - a}" data-track-index="4"><span id="truth-${i}">● Real gameplay · solo practice vs. 3 bots</span></div>`);
  tl.push(`tl.fromTo('#truth-${i}', { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(2)' }, ${a + 0.3});`);
});
// Callouts
CALLOUTS.forEach(([id, s, e, cx, cy, w], i) => {
  const dim = id !== 'pixel-draft' ? `<div class="dim" id="d-${i}"></div>` : '';
  h.push(`<div class="callout clip" data-start="${s}" data-duration="${at(e - s)}" data-track-index="5">${dim}<img id="c-${i}" src="assets/callouts/${id}.png" style="left:${cx - w / 2}px;top:${cy}px;width:${w}px" /></div>`);
  if (dim) tl.push(`tl.fromTo('#d-${i}', { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${s});`);
  tl.push(`tl.fromTo('#c-${i}', { yPercent: -50, scale: 0.6, opacity: 0, rotation: -2 }, { yPercent: -50, scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.7)' }, ${s});`);
});
// Captions
CAPS.forEach(([s, e, text], i) => {
  h.push(`<div class="cap clip" data-start="${s}" data-duration="${at(e - s)}" data-track-index="8"><div class="pill" id="cap-${i}">${text}</div></div>`);
  tl.push(`tl.fromTo('#cap-${i}', { y: 28, scale: 0.92, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.8)' }, ${s});`);
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
.callout .dim { position: absolute; inset: 0; border-radius: 26px; background: rgba(43,37,64,.42); }
.callout img { position: absolute; left: 0; top: 0; display: block; border: 5px solid var(--ink); border-radius: 22px; box-shadow: 0 10px 0 var(--ink), 0 24px 60px rgba(43,37,64,.35); margin-left: -${WIN.x}px; margin-top: -${WIN.y}px; }
.cap { left: 0; width: 1920px; top: 932px; height: 120px; display: flex; align-items: center; justify-content: center; }
.pill { display: block; max-width: 1760px; background: #fff; border: 5px solid var(--ink); border-radius: 26px; padding: 14px 34px 16px; font-weight: 600; font-size: 44px; line-height: 1.15; text-align: center; box-shadow: 0 7px 0 var(--ink); }
.logo { font-weight: 700; color: var(--yellow); letter-spacing: .02em; line-height: .95; text-shadow: 0 6px 0 var(--ink), 4px 0 0 var(--ink), -4px 0 0 var(--ink), 0 -4px 0 var(--ink), 4px 6px 0 var(--ink), -4px 6px 0 var(--ink), 4px -4px 0 var(--ink), -4px -4px 0 var(--ink); }
.card { position: absolute; background: #fff; border: 6px solid var(--ink); border-radius: 30px; box-shadow: 0 10px 0 var(--ink); overflow: hidden; }
.card img { display: block; width: 100%; height: 100%; object-fit: cover; }
.tag { position: absolute; display: block; background: #fff; border: 4px solid var(--ink); border-radius: 999px; padding: 6px 22px; font-weight: 600; font-size: 30px; box-shadow: 0 5px 0 var(--ink); white-space: nowrap; }
/* hook */
.hook { inset: 0; }
#hook-cards { position: absolute; left: 680px; top: 120px; width: 560px; height: 560px; }
#hook-cards .card { inset: 0; }
#hook-brand { position: absolute; left: 1040px; top: 150px; width: 760px; display: flex; flex-direction: column; align-items: center; }
#hook-brand img { width: 250px; height: 250px; object-fit: contain; }
#hook-brand .logo { font-size: 170px; margin-top: 4px; }
#hook-brand p { white-space: nowrap; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 26px; letter-spacing: .14em; margin-top: 26px; }
/* join */
.join { inset: 0; }
#host-slot { position: absolute; left: 70px; top: 96px; width: 1290px; height: 726px; border-radius: 24px; overflow: hidden; }
#host-slot video, #phone-slot video { width: 100%; height: 100%; object-fit: cover; }
.join-frame { left: 64px; top: 90px; width: 1302px; height: 738px; border: 6px solid var(--ink); border-radius: 30px; box-shadow: 0 10px 0 var(--ink); }
#phone-slot { position: absolute; left: 1468px; top: 70px; width: 372px; height: 806px; border-radius: 40px; overflow: hidden; }
.phone-frame { left: 1456px; top: 58px; width: 396px; height: 830px; border: 12px solid var(--ink); border-radius: 52px; box-shadow: 0 10px 0 rgba(43,37,64,.5); }
.join-tags { inset: 0; }
/* twist */
.twist { inset: 0; }
.twist .card { width: 430px; height: 430px; top: 250px; }
.twist .tag { top: 186px; }
.arrow { position: absolute; font-size: 90px; font-weight: 700; top: 400px; }
#tw-quote { position: absolute; left: 1290px; top: 712px; width: 520px; text-align: center; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 30px; }
/* end */
.end { inset: 0; }
#end-mascot { position: absolute; left: 150px; top: 200px; width: 600px; height: 600px; object-fit: contain; }
#end-col { position: absolute; left: 720px; top: 150px; width: 1100px; display: flex; flex-direction: column; align-items: center; }
#end-col .logo { font-size: 190px; }
#end-col .play { font-weight: 600; font-size: 46px; margin-top: 40px; }
#end-url { display: block; margin-top: 14px; background: #fff; border: 7px solid var(--ink); border-radius: 30px; padding: 14px 44px 18px; font-weight: 700; font-size: 82px; box-shadow: 0 10px 0 var(--ink); }
#end-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 18px; margin-top: 48px; width: 1000px; }
#end-chips span { display: block; border: 4px solid var(--ink); border-radius: 999px; padding: 8px 24px; font-weight: 600; font-size: 34px; box-shadow: 0 5px 0 var(--ink); }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="1920" data-height="1080">
<div class="bg clip" data-start="0" data-duration="${DUR}" data-track-index="0">
  <div class="sun"></div>
  <div class="cloud" id="cl1" style="left:140px;top:150px;width:240px;height:64px"></div>
  <div class="cloud" id="cl2" style="left:1560px;top:330px;width:200px;height:54px"></div>
  <div class="cloud" id="cl3" style="left:860px;top:70px;width:170px;height:46px"></div>
  <svg class="hills" viewBox="0 0 1920 260" preserveAspectRatio="none">
    <path d="M0 120 C 320 40 640 60 960 110 S 1600 70 1920 100 L1920 260 L0 260Z" fill="#B9F09A"/>
    <path d="M0 170 C 400 110 800 140 1120 175 S 1700 140 1920 160 L1920 260 L0 260Z" fill="#A9EC84"/>
    <path d="M0 215 C 500 185 900 200 1300 222 S 1750 205 1920 212 L1920 260 L0 260Z" fill="#7ED35C"/>
  </svg>
</div>

<div class="hook clip" data-start="0" data-duration="5" data-track-index="1">
  <div id="hook-cards">
    <div class="card"><img src="assets/img/frog-band.webp" /></div>
    <div class="card" id="hook-masked"><img src="assets/img/frog-band-masked.webp" /></div>
  </div>
  <div id="hook-brand"><img src="assets/img/judge.webp" /><div class="logo">SKETCHY</div><p>A LITTLE PROMPTING. A LOT OF ACCUSATIONS.</p></div>
</div>

<div class="join clip" data-start="5" data-duration="9" data-track-index="1">
  <span class="tag" id="tag-host" style="left:90px;top:30px">TV or laptop: the host screen</span>
  <span class="tag" id="tag-phone" style="left:1500px;top:-2px">Your phone</span>
  <span class="tag" id="tag-real" style="left:520px;top:30px;background:var(--lime)">● Real footage · ${URL}</span>
</div>
<div id="host-slot"><video id="v-join-host" class="clip" src="assets/clips/join-host.mp4" muted playsinline data-start="5" data-duration="9" data-track-index="2"></video></div>
<div id="phone-slot"><video id="v-join-phone" class="clip" src="assets/clips/join-phone.mp4" muted playsinline data-start="5" data-duration="9" data-track-index="2"></video></div>
<div class="join-frame clip" data-start="5" data-duration="9" data-track-index="3"></div>
<div class="phone-frame clip" data-start="5" data-duration="9" data-track-index="3"></div>

<div class="twist clip" data-start="40" data-duration="6" data-track-index="1">
  <span class="tag" id="tw-t1" style="left:262px">Everyone saw</span>
  <span class="tag" id="tw-t2" style="left:735px;background:var(--pink)">The imposter saw</span>
  <span class="tag" id="tw-t3" style="left:1335px;background:var(--yellow)">The imposter’s draft</span>
  <div class="card" id="tw-c1" style="left:170px"><img src="assets/img/frog-band.webp" /></div>
  <div class="card" id="tw-c2" style="left:690px"><img src="assets/img/frog-band-masked.webp" /></div>
  <div class="arrow" id="tw-arrow" style="left:1160px">→</div>
  <div class="card" id="tw-c3" style="left:1330px"><img src="assets/img/frog-band-bot-imposter-draft.webp" /></div>
  <p id="tw-quote">“frog playing guitar on a lily pad”</p>
</div>

<div class="end clip" data-start="78" data-duration="7" data-track-index="1">
  <img id="end-mascot" src="assets/img/happy.webp" />
  <div id="end-col">
    <div class="logo" id="end-logo">SKETCHY</div>
    <div class="play" id="end-play">Play free at</div>
    <span id="end-url">${URL}</span>
    <div id="end-chips">
      <span style="background:var(--yellow)">4–8 players</span><span style="background:var(--blue)">Room code + QR</span><span style="background:var(--lime)">No login · no install</span><span style="background:#fff">Phone or laptop</span><span style="background:var(--pink)">New picture every round</span>
    </div>
  </div>
</div>

${h.join('\n')}

<audio id="music" src="assets/music.m4a" data-start="0" data-duration="${DUR}" data-track-index="10" data-volume="1"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
// drifting clouds
tl.fromTo('#cl1', { x: 0 }, { x: 260, duration: ${DUR}, ease: 'none' }, 0);
tl.fromTo('#cl2', { x: 0 }, { x: -220, duration: ${DUR}, ease: 'none' }, 0);
tl.fromTo('#cl3', { x: 0 }, { x: 160, duration: ${DUR}, ease: 'none' }, 0);
// hook
tl.fromTo('#hook-cards', { scale: 0.7, opacity: 0, rotation: -4 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0);
tl.fromTo('#hook-masked', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.inOut' }, 2.5);
tl.fromTo('#hook-cards', { rotation: 0 }, { rotation: 2, duration: 0.12, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 3.1);
tl.to('#hook-cards', { x: -400, scale: 0.92, duration: 0.6, ease: 'power3.inOut' }, 3.5);
tl.fromTo('#hook-brand', { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.6, ease: 'back.out(1.5)' }, 3.75);
// join
tl.fromTo(['#tag-host', '#tag-real', '#tag-phone'], { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(2)' }, 5.2);
// twist
tl.fromTo(['#tw-c1', '#tw-t1'], { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }, 40.2);
tl.fromTo(['#tw-c2', '#tw-t2'], { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }, 41.0);
tl.fromTo('#tw-arrow', { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35 }, 43.0);
tl.fromTo(['#tw-c3', '#tw-t3', '#tw-quote'], { y: 40, opacity: 0, rotation: 3 }, { y: 0, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.6)' }, 43.3);
// end card
tl.fromTo('#end-mascot', { y: 80, opacity: 0, rotation: -6 }, { y: 0, opacity: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.6)' }, 78.2);
tl.fromTo('#end-mascot', { rotation: 0 }, { rotation: 3, duration: 0.6, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 79);
tl.fromTo('#end-logo', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2)' }, 78.4);
tl.fromTo(['#end-play', '#end-url'], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.15, ease: 'back.out(1.8)' }, 78.9);
tl.fromTo('#end-chips span', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.1, ease: 'back.out(2)' }, 79.6);
${tl.join('\n')}
window.__timelines['main'] = tl;
</script>
</body>
</html>
`;
fs.writeFileSync('index.html', html);
console.log('index.html written');
