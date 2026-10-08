// Generates vertical.html (1080x1920) from the phone-sized demo run. Run: node gen-vertical.mjs
// Render (from ../sketchy-vertical): npx hyperframes render --quality high --output renders/vertical.mp4
import fs from 'node:fs';

const URL = 'sketchy-blue.vercel.app';
const DUR = 85;
const WIN = { x: 120, y: 200, w: 840, h: 1493 }; // phone footage window (0.778 of 1080x1920)

const FOOT = [
  ['p-study', 14, 4, { from: 1, to: 1.08, ox: 50, oy: 45 }],
  ['p-draft', 18, 5, { from: 1, to: 1.12, ox: 50, oy: 75 }],
  ['p-feedback', 23, 6, { from: 1, to: 1.08, ox: 50, oy: 100 }],
  ['p-refine', 29, 6, { from: 1, to: 1.06, ox: 50, oy: 30 }],
  ['p-reveal', 35, 5, { from: 1, to: 1.05, ox: 50, oy: 50 }],
  ['p-discuss', 46, 5, { from: 1, to: 1.08, ox: 50, oy: 65 }],
  ['p-vote', 51, 3, { from: 1, to: 1.05, ox: 50, oy: 50 }],
  ['p-unmask', 54, 3, { from: 1.04, to: 1.1, ox: 50, oy: 55 }],
  ['p-steal', 57, 2, { from: 1.05, to: 1.1, ox: 50, oy: 50 }],
  ['p-verdict', 59, 8, { from: 1, to: 1, ox: 50, oy: 50 }],
  ['p-bluff', 67, 4, { from: 1, to: 1.08, ox: 50, oy: 40 }],
  ['p-podium', 71, 3, { from: 1, to: 1.05, ox: 50, oy: 40 }],
  ['p-reel', 74, 2, { from: 1, to: 1.05, ox: 50, oy: 50 }],
  ['p-share', 76, 2, { from: 1, to: 1.05, ox: 50, oy: 50 }],
];

const CAPS = [
  [0.3, 2.5, 'Recreate the picture with an AI prompt.'],
  [2.6, 5, 'One of you can’t see all of it.'],
  [5.3, 9.4, 'One screen hosts. Everyone joins on their own phone.'],
  [9.5, 14, 'Room code or QR. No login. No install.'],
  [14.15, 18, 'Everyone studies the same target picture.'],
  [18.15, 23, 'Write a quick draft. 8 words, max.'],
  [23.15, 29, 'The AI draws your prompt and scores it.'],
  [29.15, 35, 'It tells you what you missed. Refine it, up to 30 words.'],
  [35.15, 40, 'Final images paint in, each with its draft in the corner.'],
  [40.3, 43, 'The twist: one player’s picture had the key detail blurred.'],
  [43.1, 46, 'They have to guess what’s there, and blend in.'],
  [46.15, 51, 'Compare the final images and the drafts in the corners.'],
  [51.15, 54, 'Vote for the imposter.'],
  [54.1, 59, 'Caught! But they get one guess to steal the round.'],
  [59.15, 63, 'Then see the real prompt behind the picture…'],
  [63.1, 67, '…and every player’s score in 5 areas. You get better every round.'],
  [67.15, 71, 'Next round, you might be the one bluffing.'],
  [71.15, 77.9, 'Awards, a highlight reel, and a result card to share.'],
];

const segs = [[14, 40], [46, 78]];
const h = [];
const tl = [];
const at = (n) => +n.toFixed(3);

for (const [id, s, d, z] of FOOT) {
  h.push(`<div class="slot"><div class="zoom" data-layout-allow-overflow id="z-${id}" style="transform-origin:${z.ox}% ${z.oy}%"><video id="v-${id}" class="clip" src="assets/clips/${id}.mp4" muted playsinline data-start="${s}" data-duration="${d}" data-track-index="2"></video></div></div>`);
  tl.push(`tl.fromTo('#z-${id}', { scale: ${z.from} }, { scale: ${z.to}, duration: ${d}, ease: 'sine.inOut' }, ${s});`);
}
segs.forEach(([a, b], i) => {
  h.push(`<div class="frame clip" id="frame-${i}" data-start="${a}" data-duration="${b - a}" data-track-index="3"></div>`);
  h.push(`<div class="truth clip" id="truthw-${i}" data-start="${a}" data-duration="${b - a}" data-track-index="4"><span id="truth-${i}">● Real gameplay · solo practice vs. 3 bots</span></div>`);
  tl.push(`tl.fromTo('#truth-${i}', { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(2)' }, ${a + 0.3});`);
});
CAPS.forEach(([s, e, text], i) => {
  h.push(`<div class="cap clip" id="capw-${i}" data-start="${s}" data-duration="${at(e - s)}" data-track-index="8"><div class="pill" id="cap-${i}">${text}</div></div>`);
  tl.push(`tl.fromTo('#cap-${i}', { y: 28, scale: 0.92, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.8)' }, ${s});`);
});

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
@font-face { font-family: 'Fredoka'; font-weight: 600; src: url(assets/fonts/fredoka-latin-600-normal.woff2) format('woff2'); }
@font-face { font-family: 'Fredoka'; font-weight: 700; src: url(assets/fonts/fredoka-latin-700-normal.woff2) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 800; src: url(assets/fonts/nunito-latin-800-normal.woff2) format('woff2'); }
:root { --ink: #2B2540; --sky: #BDE4FF; --sky2: #E3F5FF; --yellow: #FFD84D; --pink: #FF7AB0; --blue: #6CC1FF; --lime: #BDF26E; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: var(--sky2); }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: 'Fredoka', sans-serif; color: var(--ink); }
.clip { position: absolute; }
.bg { inset: 0; background: linear-gradient(180deg, var(--sky) 0%, var(--sky2) 75%); }
.sun { position: absolute; right: -80px; top: -140px; width: 520px; height: 520px; border-radius: 50%; background: radial-gradient(circle, rgba(255,241,184,.95) 0%, rgba(255,241,184,0) 68%); }
.cloud { position: absolute; background: #fff; border-radius: 999px; box-shadow: 0 6px 0 rgba(43,37,64,.06); }
.cloud::before, .cloud::after { content: ''; position: absolute; background: #fff; border-radius: 50%; }
.cloud::before { width: 46%; height: 150%; left: 14%; bottom: 20%; }
.cloud::after { width: 34%; height: 120%; left: 50%; bottom: 25%; }
.hills { position: absolute; left: 0; bottom: 0; width: 1080px; height: 300px; }
.slot { position: absolute; left: ${WIN.x}px; top: ${WIN.y}px; width: ${WIN.w}px; height: ${WIN.h}px; border-radius: 34px; overflow: hidden; }
.zoom { position: absolute; inset: 0; }
.zoom video { inset: 0; width: 100%; height: 100%; object-fit: cover; }
.frame { left: ${WIN.x - 12}px; top: ${WIN.y - 12}px; width: ${WIN.w + 24}px; height: ${WIN.h + 24}px; border: 12px solid var(--ink); border-radius: 46px; box-shadow: 0 10px 0 rgba(43,37,64,.45); }
.truth { left: 0; width: 1080px; top: ${WIN.y - 76}px; display: flex; justify-content: center; }
.truth span { display: block; background: var(--lime); border: 4px solid var(--ink); border-radius: 999px; padding: 6px 22px; font-weight: 600; font-size: 30px; box-shadow: 0 4px 0 var(--ink); }
.cap { left: 0; width: 1080px; top: 1716px; height: 170px; display: flex; align-items: center; justify-content: center; }
.pill { display: block; max-width: 1000px; background: #fff; border: 5px solid var(--ink); border-radius: 28px; padding: 14px 30px 16px; font-weight: 600; font-size: 44px; line-height: 1.15; text-align: center; box-shadow: 0 7px 0 var(--ink); }
.logo { font-weight: 700; color: var(--yellow); letter-spacing: .02em; line-height: .95; text-shadow: 0 6px 0 var(--ink), 4px 0 0 var(--ink), -4px 0 0 var(--ink), 0 -4px 0 var(--ink), 4px 6px 0 var(--ink), -4px 6px 0 var(--ink), 4px -4px 0 var(--ink), -4px -4px 0 var(--ink); }
.card { position: absolute; background: #fff; border: 6px solid var(--ink); border-radius: 30px; box-shadow: 0 10px 0 var(--ink); overflow: hidden; }
.card img { display: block; width: 100%; height: 100%; object-fit: cover; }
.tag { position: absolute; display: block; background: #fff; border: 4px solid var(--ink); border-radius: 999px; padding: 6px 22px; font-weight: 600; font-size: 32px; box-shadow: 0 5px 0 var(--ink); white-space: nowrap; }
.scene { inset: 0; }
#hook-cards { position: absolute; left: 150px; top: 200px; width: 780px; height: 780px; }
#hook-cards .card { inset: 0; }
#hook-brand { position: absolute; left: 0; top: 1040px; width: 1080px; display: flex; flex-direction: column; align-items: center; }
#hook-brand img { width: 230px; height: 230px; object-fit: contain; }
#hook-brand .logo { font-size: 160px; }
#hook-brand p { white-space: nowrap; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 28px; letter-spacing: .12em; margin-top: 26px; }
#host-slot { position: absolute; left: 60px; top: 260px; width: 960px; height: 540px; border-radius: 22px; overflow: hidden; }
#host-slot video, #phone-slot video { width: 100%; height: 100%; object-fit: cover; }
.join-frame { left: 54px; top: 254px; width: 972px; height: 552px; border: 6px solid var(--ink); border-radius: 28px; box-shadow: 0 10px 0 var(--ink); }
#phone-slot { position: absolute; left: 350px; top: 930px; width: 380px; height: 823px; border-radius: 40px; overflow: hidden; }
.phone-frame { left: 338px; top: 918px; width: 404px; height: 847px; border: 12px solid var(--ink); border-radius: 52px; box-shadow: 0 10px 0 rgba(43,37,64,.5); }
#join-cards { position: absolute; }
.twist .card { width: 440px; height: 440px; }
#tw-quote { position: absolute; left: 0; width: 1080px; top: 1520px; text-align: center; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 36px; }
#tw-arrow { position: absolute; left: 0; width: 1080px; text-align: center; top: 840px; font-size: 100px; font-weight: 700; }
#end-mascot { position: absolute; left: 290px; top: 270px; width: 500px; height: 500px; object-fit: contain; }
#end-col { position: absolute; left: 0; top: 820px; width: 1080px; display: flex; flex-direction: column; align-items: center; }
#end-col .logo { font-size: 180px; }
#end-col .play { font-weight: 600; font-size: 50px; margin-top: 50px; }
#end-url { display: block; margin-top: 16px; background: #fff; border: 7px solid var(--ink); border-radius: 30px; padding: 14px 36px 18px; font-weight: 700; font-size: 66px; box-shadow: 0 10px 0 var(--ink); }
#end-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 18px; margin-top: 56px; width: 960px; }
#end-chips span { display: block; border: 4px solid var(--ink); border-radius: 999px; padding: 8px 24px; font-weight: 600; font-size: 38px; box-shadow: 0 5px 0 var(--ink); }
</style>
</head>
<body>
<div id="root" data-composition-id="vertical" data-start="0" data-duration="${DUR}" data-width="1080" data-height="1920">
<div class="bg clip" id="bg" data-start="0" data-duration="${DUR}" data-track-index="0">
  <div class="sun"></div>
  <div class="cloud" id="cl1" style="left:60px;top:120px;width:220px;height:60px"></div>
  <div class="cloud" id="cl2" style="left:760px;top:1050px;width:200px;height:54px"></div>
  <svg class="hills" viewBox="0 0 1080 300" preserveAspectRatio="none">
    <path d="M0 120 C 200 60 420 70 600 110 S 900 80 1080 100 L1080 300 L0 300Z" fill="#B9F09A"/>
    <path d="M0 180 C 260 130 520 150 700 185 S 960 160 1080 170 L1080 300 L0 300Z" fill="#A9EC84"/>
    <path d="M0 240 C 300 215 560 228 800 248 S 1000 236 1080 240 L1080 300 L0 300Z" fill="#7ED35C"/>
  </svg>
</div>

<div class="scene clip" id="hook" data-start="0" data-duration="5" data-track-index="1">
  <div id="hook-cards">
    <div class="card"><img src="assets/img/frog-band.webp" /></div>
    <div class="card" id="hook-masked"><img src="assets/img/frog-band-masked.webp" /></div>
  </div>
  <div id="hook-brand"><img src="assets/img/judge.webp" /><div class="logo">SKETCHY</div><p>A LITTLE PROMPTING. A LOT OF ACCUSATIONS.</p></div>
</div>

<div class="scene clip" id="join" data-start="5" data-duration="9" data-track-index="1">
  <span class="tag" id="tag-real" style="left:200px;top:120px;background:var(--lime)">● Real footage · ${URL}</span>
  <span class="tag" id="tag-host" style="left:60px;top:194px">TV or laptop: the host screen</span>
  <span class="tag" id="tag-phone" style="left:760px;top:1000px">Your phone</span>
</div>
<div id="host-slot"><video id="v-join-host" class="clip" src="assets/clips/join-host.mp4" muted playsinline data-start="5" data-duration="9" data-track-index="2"></video></div>
<div id="phone-slot"><video id="v-join-phone" class="clip" src="assets/clips/join-phone.mp4" muted playsinline data-start="5" data-duration="9" data-track-index="2"></video></div>
<div class="join-frame clip" id="join-frame" data-start="5" data-duration="9" data-track-index="3"></div>
<div class="phone-frame clip" id="phone-frame" data-start="5" data-duration="9" data-track-index="3"></div>

<div class="scene twist clip" id="twist" data-start="40" data-duration="6" data-track-index="1">
  <span class="tag" id="tw-t1" style="left:100px;top:250px">Everyone saw</span>
  <span class="tag" id="tw-t2" style="left:560px;top:250px;background:var(--pink)">The imposter saw</span>
  <div class="card" id="tw-c1" style="left:70px;top:320px"><img src="assets/img/frog-band.webp" /></div>
  <div class="card" id="tw-c2" style="left:570px;top:320px"><img src="assets/img/frog-band-masked.webp" /></div>
  <div id="tw-arrow">↓</div>
  <span class="tag" id="tw-t3" style="left:345px;top:990px;background:var(--yellow)">The imposter’s draft</span>
  <div class="card" id="tw-c3" style="left:320px;top:1060px"><img src="assets/img/frog-band-bot-imposter-draft.webp" /></div>
  <p id="tw-quote">“frog playing guitar on a lily pad”</p>
</div>

<div class="scene clip" id="end" data-start="78" data-duration="7" data-track-index="1">
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
tl.fromTo('#cl1', { x: 0 }, { x: 200, duration: ${DUR}, ease: 'none' }, 0);
tl.fromTo('#cl2', { x: 0 }, { x: -180, duration: ${DUR}, ease: 'none' }, 0);
tl.fromTo('#hook-cards', { scale: 0.7, opacity: 0, rotation: -4 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0);
tl.fromTo('#hook-masked', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.inOut' }, 2.5);
tl.fromTo('#hook-cards', { rotation: 0 }, { rotation: 2, duration: 0.12, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 3.1);
tl.fromTo('#hook-brand', { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' }, 3.5);
tl.fromTo(['#tag-real', '#tag-host', '#tag-phone'], { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(2)' }, 5.2);
tl.fromTo(['#tw-c1', '#tw-t1'], { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }, 40.2);
tl.fromTo(['#tw-c2', '#tw-t2'], { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }, 41.0);
tl.fromTo('#tw-arrow', { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 }, 43.0);
tl.fromTo(['#tw-c3', '#tw-t3', '#tw-quote'], { y: 40, opacity: 0, rotation: 3 }, { y: 0, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.6)' }, 43.3);
tl.fromTo('#end-mascot', { y: 80, opacity: 0, rotation: -6 }, { y: 0, opacity: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.6)' }, 78.2);
tl.fromTo('#end-mascot', { rotation: 0 }, { rotation: 3, duration: 0.6, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 79);
tl.fromTo('#end-logo', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2)' }, 78.4);
tl.fromTo(['#end-play', '#end-url'], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.15, ease: 'back.out(1.8)' }, 78.9);
tl.fromTo('#end-chips span', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.1, ease: 'back.out(2)' }, 79.6);
${tl.join('\n')}
window.__timelines['vertical'] = tl;
</script>
</body>
</html>
`;
fs.writeFileSync('../sketchy-vertical/index.html', html);
console.log('../sketchy-vertical/index.html written');
