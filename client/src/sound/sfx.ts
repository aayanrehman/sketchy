/**
 * Sound hooks for every moment, synthesized with WebAudio so there are no asset files.
 * Mute state persists in localStorage. Nothing here ever blocks input or a timer.
 */
export type SfxName =
  | 'tick' | 'whoosh' | 'pop' | 'popDown' | 'chime' | 'glow' | 'golden' | 'drumroll' | 'stamp' | 'flip'
  | 'slot' | 'meter' | 'meterSlow' | 'ding' | 'thud' | 'coin' | 'coinBig' | 'streak' | 'fanfare' | 'submit' | 'reveal';

const KEY = 'sketchy.muted';
let ctx: AudioContext | null = null;
let muted = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();
const listeners = new Set<(m: boolean) => void>();

export function isMuted() { return muted; }
export function setMuted(m: boolean) { muted = m; try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* ignore */ } listeners.forEach((l) => l(m)); }
export function onMuteChange(l: (m: boolean) => void) { listeners.add(l); return () => listeners.delete(l); }

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) { const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx!.state === 'suspended') ctx!.resume().catch(() => {});
  return ctx;
}
/** Call on first user gesture so iOS allows audio. */
export function unlockAudio() { const c = ac(); if (c) { const o = c.createOscillator(); const g = c.createGain(); g.gain.value = 0; o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.01); } }

function tone(c: AudioContext, f: number, t0: number, d: number, type: OscillatorType = 'sine', vol = 0.2, slideTo?: number) {
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + d + 0.02);
}
function noise(c: AudioContext, t0: number, d: number, vol = 0.15, hp = 800) {
  const n = c.sampleRate * d; const buf = c.createBuffer(1, n, c.sampleRate); const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = c.createGain(); g.gain.value = vol; s.connect(f).connect(g).connect(c.destination); s.start(t0);
}

const SFX: Record<SfxName, (c: AudioContext, t: number) => void> = {
  tick: (c, t) => tone(c, 1200, t, 0.05, 'square', 0.08),
  whoosh: (c, t) => noise(c, t, 0.35, 0.12, 400),
  pop: (c, t) => tone(c, 500, t, 0.12, 'sine', 0.2, 900),
  popDown: (c, t) => tone(c, 700, t, 0.15, 'sine', 0.15, 300),
  chime: (c, t) => { tone(c, 880, t, 0.3); tone(c, 1320, t + 0.08, 0.4); },
  glow: (c, t) => { tone(c, 520, t, 0.5, 'triangle', 0.12, 1040); noise(c, t, 0.3, 0.05, 2000); },
  golden: (c, t) => { [880, 1108, 1318, 1760].forEach((f, i) => tone(c, f, t + i * 0.09, 0.5, 'triangle', 0.18)); },
  drumroll: (c, t) => { for (let i = 0; i < 28; i++) { tone(c, 90, t + i * 0.07, 0.06, 'square', 0.12, 60); noise(c, t + i * 0.07, 0.05, 0.05, 1500); } },
  stamp: (c, t) => { tone(c, 150, t, 0.25, 'square', 0.35, 40); noise(c, t, 0.15, 0.2, 300); },
  flip: (c, t) => { noise(c, t, 0.12, 0.1, 1200); tone(c, 700, t + 0.05, 0.08, 'sine', 0.08); },
  slot: (c, t) => { for (let i = 0; i < 6; i++) tone(c, 660 + i * 110, t + i * 0.08, 0.1, 'square', 0.12); tone(c, 1320, t + 0.5, 0.5, 'triangle', 0.2); },
  meter: (c, t) => { for (let i = 0; i < 12; i++) tone(c, 300 + i * 60, t + i * 0.08, 0.06, 'sawtooth', 0.06); },
  meterSlow: (c, t) => { for (let i = 0; i < 24; i++) tone(c, 200 + i * 35, t + i * 0.09, 0.07, 'sawtooth', 0.06); },
  ding: (c, t) => { tone(c, 1046, t, 0.35, 'sine', 0.2); tone(c, 1568, t + 0.05, 0.4, 'sine', 0.15); },
  thud: (c, t) => tone(c, 120, t, 0.3, 'triangle', 0.3, 50),
  coin: (c, t) => { tone(c, 988, t, 0.08, 'square', 0.1); tone(c, 1319, t + 0.08, 0.25, 'square', 0.1); },
  coinBig: (c, t) => { [988, 1319, 1568, 2093].forEach((f, i) => tone(c, f, t + i * 0.07, 0.25, 'square', 0.1)); },
  streak: (c, t) => { noise(c, t, 0.4, 0.12, 600); tone(c, 440, t, 0.4, 'sawtooth', 0.08, 880); },
  fanfare: (c, t) => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(c, f, t + i * 0.13, i === 5 ? 0.7 : 0.18, 'square', 0.14)); },
  submit: (c, t) => { tone(c, 600, t, 0.08, 'sine', 0.15); tone(c, 900, t + 0.07, 0.15, 'sine', 0.15); },
  reveal: (c, t) => { tone(c, 220, t, 0.6, 'sawtooth', 0.1, 440); tone(c, 440, t + 0.3, 0.6, 'triangle', 0.15, 880); },
};

export function play(name: SfxName) {
  if (muted) return;
  try { const c = ac(); if (!c) return; SFX[name](c, c.currentTime); } catch { /* audio is never allowed to break the game */ }
}
