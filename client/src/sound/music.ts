/**
 * Lofi background loop, synthesized live with WebAudio so there are no asset files.
 * Jazzy 7th/9th chords on a Rhodes-ish voice over a warm pad, soft bass and a gentle kick, with a
 * slight tape wobble. No noise layers (no crackle, hats or snare). Driven by a lookahead scheduler. Shares the sfx AudioContext and mute toggle.
 * Nothing plays until startMusic() is called (after a user gesture).
 */
import { ac, getVolume, isMuted, onMuteChange, onVolumeChange } from './sfx';

export type MusicMood = 'chill' | 'upbeat';
type Prog = { key: number; chords: number[][] }; // each chord: [bassRoot, ...voicing] in MIDI

const PROGS: Prog[] = [
  { key: 0, chords: [[38, 53, 57, 60, 64], [43, 53, 59, 64, 69], [36, 52, 55, 59, 62], [45, 55, 60, 64, 71]] }, // C: Dm9 G13 Cmaj9 Am9
  { key: 5, chords: [[43, 58, 62, 65, 69], [36, 52, 58, 62, 67], [41, 57, 60, 64, 67], [38, 53, 57, 60, 64]] }, // F: Gm9 C9 Fmaj9 Dm9
  { key: 0, chords: [[41, 57, 60, 64, 67], [40, 55, 59, 62, 66], [38, 53, 57, 60, 64], [36, 52, 55, 59, 62]] }, // Fmaj9 Em9 Dm9 Cmaj9
  { key: 3, chords: [[41, 56, 60, 63, 67], [46, 56, 62, 65, 67], [39, 55, 58, 62, 65], [36, 55, 58, 62, 63]] }, // Eb: Fm9 Bb13 Ebmaj9 Cm9
];
const PENTA = [0, 2, 4, 7, 9];
const MOOD = {
  chill: { bpm: 74, swing: 0.58, vol: 0.17, kick: [0, 10], mel: 0.06, walk: false },
  upbeat: { bpm: 88, swing: 0.56, vol: 0.17, kick: [0, 8, 10], mel: 0.09, walk: true },
};

let c: AudioContext | null = null;
let bus: GainNode, keys: BiquadFilterNode, pad: BiquadFilterNode, out: GainNode, flutter: GainNode, lfo: OscillatorNode;
let timer: ReturnType<typeof setInterval> | undefined, unsub: (() => unknown) | undefined;
let mood: MusicMood = 'chill', pending: MusicMood | null = null, prog = PROGS[0], nextT = 0, step = 0;

const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function env(p: AudioParam, t: number, a: number, peak: number, d: number) {
  p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(peak, t + a); p.exponentialRampToValueAtTime(0.0001, t + d);
}
function osc(dest: AudioNode, type: OscillatorType, f: number, t: number, d: number, vol: number, a = 0.01, detune = 0, wow = false) {
  const o = c!.createOscillator(); const g = c!.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  if (wow) { const l = flutter; l.connect(o.detune); o.onended = () => { try { l.disconnect(o.detune); } catch { /* gone */ } }; }
  env(g.gain, t, a, vol, d); o.connect(g).connect(dest); o.start(t); o.stop(t + d + 0.05);
  return o;
}
function rhodes(m: number, t: number, d: number, vol: number) {
  const f = hz(m);
  osc(keys, 'sine', f, t, d, vol, 0.02, -4, true);
  osc(keys, 'triangle', f, t, d * 0.6, vol * 0.25, 0.02, 5, true);
  osc(keys, 'sine', f * 2, t, d * 0.25, vol * 0.1, 0.005); // tine
}
function kick(t: number) { osc(bus, 'sine', 85, t, 0.28, 0.45, 0.008).frequency.exponentialRampToValueAtTime(45, t + 0.14); }
/** A slow-swelling, detuned pad under each chord: the warm, nostalgic glue. */
function padChord(notes: number[], t: number, d: number) {
  for (const n of notes) for (const det of [-7, 7]) osc(pad, 'sine', hz(n), t, d, 0.022, d * 0.35, det, true);
}
function bass(m: number, t: number, d: number) { osc(bus, 'sine', hz(m), t, d, 0.4, 0.02); osc(bus, 'triangle', hz(m), t, d * 0.5, 0.08, 0.02); }

function schedule(i: number, bar: number, t: number) {
  const m = MOOD[mood], beat = 60 / m.bpm, chord = prog.chords[(bar >> 1) % 4];
  if (i === 0) {
    chord.slice(1).forEach((n, k) => rhodes(n, t + k * 0.018, beat * 3.8, bar % 2 ? 0.07 : 0.1)); // soft strum
    bass(chord[0], t, beat * 1.5);
    if (bar % 2 === 0) padChord(chord.slice(1, 4), t, beat * 8);
  }
  if (i === 10) bass(chord[0] + (bar % 2 ? 7 : 0), t, beat * 0.9);
  if (m.walk && i === 6) bass(chord[0] + 12, t, beat * 0.5);
  if (m.kick.includes(i)) kick(t);
  if (i % 2 === 0 && Math.random() < m.mel) rhodes(72 + prog.key + pick(PENTA), t, beat * 1.5, 0.05);
}

function level() {
  if (c) out.gain.setTargetAtTime(isMuted() ? 0 : MOOD[mood].vol * getVolume('music'), c.currentTime, 0.15); // ~0.5 s fade
}
function tick() {
  try {
    if (!c) return;
    if (nextT < c.currentTime) nextT = c.currentTime + 0.05; // recover from a stalled timer
    while (nextT < c.currentTime + 0.15) {
      const i = step % 16, bar = step >> 4;
      if (i === 0) {
        if (pending) { mood = pending; pending = null; level(); }
        if (bar % 8 === 0 && bar > 0) prog = pick(PROGS.filter((p) => p !== prog));
      }
      const m = MOOD[mood], sd = 15 / m.bpm;
      if (!isMuted()) schedule(i, bar, nextT + (step % 2 ? (m.swing - 0.5) * 2 * sd : 0));
      nextT += sd; step++;
    }
  } catch { /* audio is never allowed to break the game */ }
}
function vis() {
  clearInterval(timer); timer = undefined;
  if (c && !document.hidden) { nextT = c.currentTime + 0.05; timer = setInterval(tick, 25); }
}

export function startMusic() {
  try {
    if (c) return;
    const ctx = ac(); if (!ctx) return; c = ctx;
    out = c.createGain(); out.gain.value = 0;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    bus = c.createGain(); bus.connect(lp).connect(comp).connect(out).connect(c.destination);
    keys = c.createBiquadFilter(); keys.type = 'lowpass'; keys.frequency.value = 1800; keys.connect(bus);
    pad = c.createBiquadFilter(); pad.type = 'lowpass'; pad.frequency.value = 900; pad.connect(bus);
    lfo = c.createOscillator(); lfo.frequency.value = 0.4; flutter = c.createGain(); flutter.gain.value = 5; lfo.connect(flutter); lfo.start();
    step = 0; prog = PROGS[0];
    const offM = onMuteChange(level), offV = onVolumeChange(level); unsub = () => { offM(); offV(); }; document.addEventListener('visibilitychange', vis);
    level(); vis();
  } catch { /* audio is never allowed to break the game */ }
}

export function setMusicMood(m: MusicMood) {
  if (!c) { mood = m; return; }
  pending = m === mood ? null : m; // applied on the next bar
}

export function stopMusic() {
  try {
    if (!c) return;
    clearInterval(timer); timer = undefined; unsub?.(); document.removeEventListener('visibilitychange', vis);
    const t = c.currentTime + 0.6, o = out;
    o.gain.setTargetAtTime(0, c.currentTime, 0.1); lfo.stop(t);
    setTimeout(() => o.disconnect(), 700);
    c = null; pending = null;
  } catch { /* audio is never allowed to break the game */ }
}
