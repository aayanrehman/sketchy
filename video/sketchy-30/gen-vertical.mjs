// Generates ../sketchy-30-vertical/index.html: the same 26 s cut at 1080x1920 (shares assets/ and the beats in gen.mjs).
// Run: node gen-vertical.mjs
import fs from 'node:fs';
import { URL, DUR, FOOT, CAPS, SFX } from './gen.mjs';

const OUT = '../sketchy-30-vertical';
const WIN = { x: 40, y: 330, w: 1000, h: 1000 }; // square footage window; each clip picks its focus column
// Horizontal focus (object-position x %) per clip, so the square crop lands on the part that matters.
const FOCUS = { draft: 44, feedback: 52, refine: 50, reveal: 39, hint: 62, vote: 38, erased: 12, steal: 33, results: 40 };
const SEGS = [[8.0, 14.4], [16.8, 22.4]];
const CALLOUTS = [
  ['feedback', 10.0, 11.6, 540, 830, 980],
  ['hint', 16.95, 17.6, 540, 760, 760],
  ['sam-card', 20.5, 22.4, 540, 790, 560],
];
const SFX_LEN = { 'impact-bass-1': 2.7, 'glitch-1': 1.2, whoosh: 1.5, 'whoosh-short': 1.2, pop: 0.3, typing: 1.5, ping: 1.3, sparkle: 1.8, click: 0.35, chime: 2.4 };

const h = [];
const tl = [];
const at = (n) => +n.toFixed(3);

for (const [id, s, d, z] of FOOT) {
  const scale = (v) => id === 'steal' ? v : +(1 + (v - 1) * 0.6).toFixed(3); // the square crop is already a punch-in (steal keeps its full zoom to crop the old copy)
  h.push(`<div class="slot"><div class="zoom" data-layout-allow-overflow id="z-${id}" style="transform-origin:50% ${z.oy}%"><video id="v-${id}" class="clip" src="assets/clips/${id}.mp4" muted playsinline data-start="${s}" data-duration="${d}" data-track-index="2" style="object-position:${FOCUS[id]}% 50%"></video></div></div>`);
  tl.push(`tl.fromTo('#z-${id}', { scale: ${scale(z.from)} }, { scale: ${scale(z.to)}, duration: ${d}, ease: 'sine.inOut' }, ${s});`);
}
SEGS.forEach(([a, b], i) => {
  h.push(`<div class="frame clip" data-start="${a}" data-duration="${at(b - a)}" data-track-index="3"></div>`);
  h.push(`<div class="truth clip" data-start="${a}" data-duration="${at(b - a)}" data-track-index="4"><span id="truth-${i}">● Real gameplay</span></div>`);
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
SFX.forEach(([f, t, v], i) => h.push(`<audio id="sfx-${i}" src="assets/sfx/${f}.mp3" data-start="${t}" data-duration="${Math.min(SFX_LEN[f], DUR - t).toFixed(2)}" data-track-index="11" data-volume="${v}"></audio>`));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
@font-face { font-family: 'Fredoka'; font-weight: 500; src: url(assets/fonts/fredoka-latin-500-normal.woff2) format('woff2'); }
@font-face { font-family: 'Fredoka'; font-weight: 600; src: url(assets/fonts/fredoka-latin-600-normal.woff2) format('woff2'); }
@font-face { font-family: 'Fredoka'; font-weight: 700; src: url(assets/fonts/fredoka-latin-700-normal.woff2) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 800; src: url(assets/fonts/nunito-latin-800-normal.woff2) format('woff2'); }
:root { --ink: #2B2540; --sky: #BDE4FF; --sky2: #E3F5FF; --yellow: #FFD84D; --pink: #FF7AB0; --blue: #6CC1FF; --lime: #BDF26E; --purple: #B48BFF; --red: #FF5C5C; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: var(--sky2); }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: 'Fredoka', sans-serif; color: var(--ink); }
.clip { position: absolute; }
.bg { inset: 0; background: linear-gradient(180deg, var(--sky) 0%, var(--sky2) 72%); }
.sun { position: absolute; right: -60px; top: -140px; width: 560px; height: 560px; border-radius: 50%; background: radial-gradient(circle, rgba(255,241,184,.95) 0%, rgba(255,241,184,0) 68%); }
.cloud { position: absolute; background: #fff; border-radius: 999px; box-shadow: 0 6px 0 rgba(43,37,64,.06); }
.cloud::before, .cloud::after { content: ''; position: absolute; background: #fff; border-radius: 50%; }
.cloud::before { width: 46%; height: 150%; left: 14%; bottom: 20%; }
.cloud::after { width: 34%; height: 120%; left: 50%; bottom: 25%; }
.hills { position: absolute; left: 0; bottom: 0; width: 1080px; height: 300px; }
.slot { position: absolute; left: ${WIN.x}px; top: ${WIN.y}px; width: ${WIN.w}px; height: ${WIN.h}px; border-radius: 30px; overflow: hidden; }
.zoom { position: absolute; inset: 0; }
.zoom video { inset: 0; width: 100%; height: 100%; object-fit: cover; }
.frame { left: ${WIN.x - 7}px; top: ${WIN.y - 7}px; width: ${WIN.w + 14}px; height: ${WIN.h + 14}px; border: 7px solid var(--ink); border-radius: 36px; box-shadow: 0 12px 0 var(--ink); }
.truth { left: 0; width: 1080px; top: ${WIN.y - 26}px; display: flex; justify-content: center; }
.truth span { display: block; background: var(--lime); border: 4px solid var(--ink); border-radius: 999px; padding: 6px 22px; font-weight: 600; font-size: 30px; box-shadow: 0 4px 0 var(--ink); }
.callout { left: 0; top: 0; width: 1080px; height: 1920px; }
.callout .dim { position: absolute; left: ${WIN.x}px; top: ${WIN.y}px; width: ${WIN.w}px; height: ${WIN.h}px; border-radius: 30px; background: rgba(43,37,64,.45); }
.callout img { position: absolute; display: block; background: #fff; padding: 10px; border: 5px solid var(--ink); border-radius: 24px; box-shadow: 0 10px 0 var(--ink), 0 24px 60px rgba(43,37,64,.35); }
.badge, .chips, .callout, .cap { z-index: 20; }
.cap { left: 0; width: 1080px; top: 1400px; height: 260px; display: flex; align-items: center; justify-content: center; }
.pill { display: block; max-width: 980px; background: #fff; border: 6px solid var(--ink); border-radius: 30px; padding: 18px 36px 20px; font-weight: 600; font-size: 58px; line-height: 1.15; text-align: center; box-shadow: 0 8px 0 var(--ink); }
.logo { font-weight: 700; color: var(--yellow); letter-spacing: .02em; line-height: .95; text-shadow: 0 6px 0 var(--ink), 4px 0 0 var(--ink), -4px 0 0 var(--ink), 0 -4px 0 var(--ink), 4px 6px 0 var(--ink), -4px 6px 0 var(--ink), 4px -4px 0 var(--ink), -4px -4px 0 var(--ink); }
.card { position: absolute; background: #fff; border: 6px solid var(--ink); border-radius: 30px; box-shadow: 0 10px 0 var(--ink); overflow: hidden; }
.card img { display: block; width: 100%; height: 100%; object-fit: cover; }
.tag { position: absolute; display: block; background: #fff; border: 4px solid var(--ink); border-radius: 999px; padding: 6px 22px; font-weight: 600; font-size: 34px; box-shadow: 0 5px 0 var(--ink); white-space: nowrap; }
.stamp { position: absolute; display: block; padding: 6px 26px; border-radius: 16px; background: var(--red); border: 5px solid var(--ink); font-weight: 700; font-size: 72px; letter-spacing: .08em; box-shadow: 0 6px 0 var(--ink); white-space: nowrap; }
.big { position: absolute; left: 0; width: 1080px; text-align: center; font-weight: 700; font-size: 96px; line-height: 1.04; white-space: nowrap; }
.big em { font-style: normal; color: var(--yellow); text-shadow: 0 5px 0 var(--ink), 3px 0 0 var(--ink), -3px 0 0 var(--ink), 0 -3px 0 var(--ink), 3px 5px 0 var(--ink), -3px 5px 0 var(--ink); }
.big.red em { color: var(--red); }
.hook { inset: 0; }
#hook-card { position: absolute; left: 190px; top: 330px; width: 700px; height: 700px; }
#hook-card .card { inset: 0; }
#hook-dash { position: absolute; left: 162px; top: 302px; width: 756px; height: 756px; border: 8px dashed var(--red); border-radius: 48px; }
#hook-stamp { left: 350px; top: 330px; }
#hook-l1 { top: 1150px; } #hook-l2 { top: 1260px; } #hook-l3 { top: 1150px; } #hook-l4 { top: 1260px; }
.brand { inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
#br-row { display: flex; flex-direction: column; align-items: center; }
#br-row img { width: 420px; height: 420px; object-fit: contain; }
#br-row .logo { font-size: 200px; margin-top: 10px; }
#br-tag { margin-top: 40px; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 40px; letter-spacing: .12em; }
.join { inset: 0; }
#host-slot { position: absolute; left: 60px; top: 150px; width: 960px; height: 540px; border-radius: 22px; overflow: hidden; }
#host-slot video, #phone-slot video { width: 100%; height: 100%; object-fit: cover; }
.join-frame { left: 54px; top: 144px; width: 972px; height: 552px; border: 6px solid var(--ink); border-radius: 26px; box-shadow: 0 8px 0 var(--ink); }
#phone-slot { position: absolute; left: 620px; top: 590px; width: 360px; height: 780px; border-radius: 40px; overflow: hidden; }
.phone-frame { left: 608px; top: 578px; width: 384px; height: 804px; border: 12px solid var(--ink); border-radius: 52px; box-shadow: 0 12px 0 rgba(43,37,64,.5); }
.badge { left: 0; width: 1080px; top: 760px; display: flex; justify-content: center; }
.badge span { display: block; background: var(--yellow); border: 6px solid var(--ink); border-radius: 999px; padding: 14px 40px; font-weight: 700; font-size: 64px; box-shadow: 0 8px 0 var(--ink); white-space: nowrap; }
.badge b { display: inline-block; margin-left: 18px; padding: 2px 22px; border-radius: 999px; background: #E6E9F2; border: 4px solid var(--ink); font-size: 46px; vertical-align: middle; }
.twist { inset: 0; }
.twist .card { width: 470px; height: 470px; }
#tw-quote { position: absolute; left: 60px; top: 1060px; width: 450px; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 40px; line-height: 1.2; }
#tw-dash { position: absolute; left: 541px; top: 271px; width: 498px; height: 498px; border: 6px dashed var(--red); border-radius: 40px; }
.chips { left: 40px; width: 1000px; top: 1240px; display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
.chips span { display: block; border: 4px solid var(--ink); border-radius: 999px; padding: 8px 24px; font-weight: 600; font-size: 38px; box-shadow: 0 5px 0 var(--ink); white-space: nowrap; }
.end { inset: 0; }
#end-mascot { position: absolute; left: 290px; top: 170px; width: 500px; height: 500px; object-fit: contain; }
#end-col { position: absolute; left: 0; top: 700px; width: 1080px; display: flex; flex-direction: column; align-items: center; }
#end-col .logo { font-size: 190px; }
#end-col .play { font-weight: 600; font-size: 52px; margin-top: 40px; }
#end-url { display: block; margin-top: 16px; background: #fff; border: 7px solid var(--ink); border-radius: 30px; padding: 14px 36px 18px; font-weight: 700; font-size: 62px; box-shadow: 0 10px 0 var(--ink); white-space: nowrap; }
#end-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 50px; width: 960px; }
#end-chips span { display: block; border: 4px solid var(--ink); border-radius: 999px; padding: 8px 24px; font-weight: 600; font-size: 38px; box-shadow: 0 5px 0 var(--ink); white-space: nowrap; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="1080" data-height="1920">
<div class="bg clip" data-start="0" data-duration="${DUR}" data-track-index="0">
  <div class="sun" data-layout-allow-overflow></div>
  <div class="cloud" id="cl1" style="left:60px;top:120px;width:220px;height:60px"></div>
  <div class="cloud" id="cl2" style="left:760px;top:1150px;width:200px;height:54px"></div>
  <div class="cloud" id="cl3" style="left:520px;top:60px;width:170px;height:46px"></div>
  <svg class="hills" viewBox="0 0 1080 300" preserveAspectRatio="none">
    <path d="M0 130 C 200 60 400 80 560 120 S 900 80 1080 110 L1080 300 L0 300Z" fill="#B9F09A"/>
    <path d="M0 190 C 240 130 480 160 680 195 S 960 160 1080 180 L1080 300 L0 300Z" fill="#A9EC84"/>
    <path d="M0 245 C 300 215 560 230 780 252 S 990 235 1080 242 L1080 300 L0 300Z" fill="#7ED35C"/>
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
  <div id="br-row"><img src="assets/img/judge.webp" /><div class="logo">SKETCHY</div></div>
  <div id="br-tag">THE AI PROMPTING PARTY GAME</div>
</div>

<div class="join clip" data-start="4.8" data-duration="3.2" data-track-index="1">
  <span class="tag" id="tag-host" style="left:60px;top:70px">TV or laptop hosts</span>
  <span class="tag" id="tag-phone" style="left:320px;top:760px;background:var(--lime)">Your phone</span>
  <span class="tag" id="tag-n" style="left:60px;top:1000px;background:var(--yellow)">2–8 players</span><span class="tag" id="tag-b" style="left:60px;top:1090px">bots fill empty seats</span>
</div>
<div id="host-slot"><video id="v-join-host" class="clip" src="assets/clips/join-host.mp4" muted playsinline data-start="4.8" data-duration="3.2" data-track-index="2"></video></div>
<div id="phone-slot"><video id="v-join-phone" class="clip" src="assets/clips/join-phone.mp4" muted playsinline data-start="4.8" data-duration="3.2" data-track-index="2"></video></div>
<div class="join-frame clip" data-start="4.8" data-duration="3.2" data-track-index="3"></div>
<div class="phone-frame clip" data-start="4.8" data-duration="3.2" data-track-index="3"></div>

<div class="badge clip" data-start="13.5" data-duration="0.9" data-track-index="6"><span id="badge">Final: 80/100<b>SILVER</b></span></div>

<div class="twist clip" data-start="14.4" data-duration="2.4" data-track-index="1">
  <span class="tag" id="tw-t1" style="left:60px;top:200px">Everyone saw</span>
  <span class="tag" id="tw-t2" style="left:570px;top:200px;background:var(--pink)">The imposter saw</span>
  <span class="tag" id="tw-t3" style="left:570px;top:820px;background:var(--yellow)">The imposter’s draft</span>
  <div class="card" id="tw-c1" style="left:40px;top:290px"><img src="assets/img/frog-band.webp" /></div>
  <div id="tw-dash"></div>
  <div class="card" id="tw-c2" style="left:555px;top:285px"><img src="assets/img/frog-band-masked.webp" /></div>
  <div class="card" id="tw-c3" style="left:555px;top:900px"><img src="assets/img/frog-band-bot-imposter-draft.webp" /></div>
  <p id="tw-quote">“frog playing guitar on a lily pad”</p>
</div>

<div class="chips clip" data-start="20.5" data-duration="1.9" data-track-index="6">
  <span style="background:var(--yellow)">Daily target</span><span style="background:var(--pink)">Streaks</span><span style="background:var(--blue)">Challenge duels</span><span style="background:var(--lime)">Crews</span>
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
tl.fromTo('#cl1', { x: 0 }, { x: 200, duration: ${DUR}, ease: 'none' }, 0);
tl.fromTo('#cl2', { x: 0 }, { x: -180, duration: ${DUR}, ease: 'none' }, 0);
tl.fromTo('#cl3', { x: 0 }, { x: 120, duration: ${DUR}, ease: 'none' }, 0);
tl.fromTo('#hook-card', { scale: 1.6, opacity: 0, rotation: -8 }, { scale: 1, opacity: 1, rotation: -3, duration: 0.35, ease: 'power4.out' }, 0);
tl.fromTo('#hook-l1', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 0.25);
tl.fromTo('#hook-l2', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 0.55);
tl.to(['#hook-l1', '#hook-l2'], { opacity: 0, y: -40, duration: 0.15 }, 1.55);
tl.fromTo('#hook-masked', { opacity: 0 }, { opacity: 1, duration: 0.06 }, 1.6);
tl.fromTo('#hook-card', { x: 0 }, { x: 14, duration: 0.04, yoyo: true, repeat: 7, ease: 'none' }, 1.6);
tl.fromTo('#hook-dash', { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 0.2 }, 1.65);
tl.fromTo('#hook-stamp', { scale: 2.4, opacity: 0, rotation: 6 }, { scale: 1, opacity: 1, rotation: -7, duration: 0.25, ease: 'back.out(2.2)' }, 1.75);
tl.fromTo('#hook-l3', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 1.8);
tl.fromTo('#hook-l4', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 2.1);
tl.fromTo('#br-row', { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.2)' }, 3.2);
tl.fromTo('#br-tag', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, 3.5);
tl.fromTo(['#tag-host', '#tag-phone', '#tag-n', '#tag-b'], { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.2, ease: 'back.out(2)' }, 5.1);
tl.fromTo('#badge', { scale: 0.3, opacity: 0, rotation: -8 }, { scale: 1, opacity: 1, rotation: -3, duration: 0.3, ease: 'back.out(2.4)' }, 13.5);
tl.fromTo(['#tw-c1', '#tw-t1'], { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 14.55);
tl.fromTo(['#tw-c2', '#tw-t2'], { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.8)' }, 15.25);
tl.fromTo('#tw-dash', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 15.4);
tl.fromTo(['#tw-c3', '#tw-t3', '#tw-quote'], { y: 60, opacity: 0, rotation: 4 }, { y: 0, opacity: 1, rotation: 0, duration: 0.35, ease: 'back.out(1.8)' }, 15.9);
tl.fromTo('.chips span', { y: -24, opacity: 0, scale: 0.7 }, { y: 0, opacity: 1, scale: 1, duration: 0.25, stagger: 0.2, ease: 'back.out(2.4)' }, 20.55);
tl.fromTo('#end-mascot', { y: 120, opacity: 0, rotation: -10 }, { y: 0, opacity: 1, rotation: 0, duration: 0.4, ease: 'back.out(1.8)' }, 22.45);
tl.fromTo('#end-logo', { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.4)' }, 22.65);
tl.fromTo(['#end-play', '#end-url'], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.12, ease: 'back.out(2)' }, 23.0);
tl.fromTo('#end-chips span', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, stagger: 0.08, ease: 'back.out(2.4)' }, 23.5);
${tl.join('\n')}
window.__timelines['main'] = tl;
</script>
</body>
</html>
`;
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(`${OUT}/assets`)) fs.symlinkSync('../sketchy-30/assets', `${OUT}/assets`);
for (const f of ['hyperframes.json', 'package.json']) fs.copyFileSync(f, `${OUT}/${f}`);
let n = 0; // Studio needs a stable id on every timed element
fs.writeFileSync(`${OUT}/index.html`, html.replace(/<div class="([a-z-]+) clip"(?![^>]*\bid=)/g, (m, c) => `<div id="${c}-${n++}" class="${c} clip"`));
console.log(`${OUT}/index.html written`);
