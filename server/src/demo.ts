/**
 * Demo Mode: one human plays two rounds with 3 bots in one tab.
 * Round 1: human is an artist (a bot is the imposter). Round 2: human is the imposter.
 * Bots use pre-made rounds from /studio (server/data/demo/<pairId>.json) or procedural doodles.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Round, Drawing } from '../../shared/types';
import { PROMPT_PAIRS } from '../../shared/prompts';
import { Room } from './room';
import { doodle } from './doodle';
import { shuffle, pick } from './util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEMO_DIR = path.resolve(__dirname, '../data/demo');

export interface BotDrawing { strokes: Drawing['strokes']; glowUrl?: string; golden?: boolean; match: number; sees: string; roast: string }
export interface DemoContent { source?: 'prepared-sample'; pairId: number; real: BotDrawing[]; decoy: BotDrawing[] }

export const BOT_NAMES = ['Pixel', 'Doodle', 'Smudge'];
const BANTER = [
  'Why does yours have a chair??', 'Mine is clearly the best one.', 'Okay who drew the potato.',
  'I was going for a vibe.', 'Suspicious amount of detail there.', 'That is NOT what I got.',
];

export function loadContent(pairId: number): DemoContent | null {
  try {
    const f = path.join(DEMO_DIR, `${pairId}.json`);
    if (!fs.existsSync(f)) return null;
    const c = JSON.parse(fs.readFileSync(f, 'utf8')) as DemoContent;
    if (c.real?.length >= 3 && c.decoy?.length >= 1) return c;
    return null;
  } catch { return null; }
}

export function contentStatus() {
  return PROMPT_PAIRS.map((p) => {
    const c = loadContent(p.id);
    let partial: DemoContent | null = null;
    try { const f = path.join(DEMO_DIR, `${p.id}.json`); if (fs.existsSync(f)) partial = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* ignore */ }
    return { id: p.id, theme: p.theme, real: p.real, decoy: p.decoy, complete: !!c, realCount: partial?.real?.length || 0, decoyCount: partial?.decoy?.length || 0 };
  });
}

/** Procedural placeholder scores: artists score mid-high, the imposter's decoy lower. */
function procedural(pairId: number, slot: 'real' | 'decoy', idx: number): BotDrawing {
  const seed = pairId * 1000 + (slot === 'real' ? 0 : 500) + idx * 17;
  const sees = ['a cheerful creature', 'someone having a day', 'a figure with a prop', 'a very round hero', 'legs and ambition'];
  const roasts = ['Bold lines, bolder choices.', 'The chair steals the scene.', 'Anatomy is a suggestion here.', 'I feel the energy at least.', 'Confident. Wrong, but confident.'];
  const base = slot === 'real' ? 58 + ((seed * 7) % 30) : 28 + ((seed * 3) % 25);
  return { strokes: doodle(seed), match: base, sees: sees[seed % sees.length], roast: roasts[(seed * 3) % roasts.length], golden: false };
}

export function setupDemo(room: Room, humanId: string) {
  const bots = BOT_NAMES.map((n) => { const r = room.addPlayer(n, true); return 'seat' in r ? r.seat.player : null; }).filter(Boolean)!;
  const botIds = bots.map((b) => b!.id);
  room.totalRounds = 2;
  const withContent = PROMPT_PAIRS.filter((p) => loadContent(p.id)).map((p) => p.id);
  const pool = withContent.length >= 2 ? withContent : PROMPT_PAIRS.map((p) => p.id);
  const [a, b] = shuffle(pool);
  room.forcedPairs = { 1: a, 2: b };
  room.forcedImposters = { 1: pick(botIds), 2: humanId };

  const used = new Map<string, number>();
  room.botContent = (round: Round, playerId: string) => {
    if (!botIds.includes(playerId)) return null;
    const slot = playerId === round.imposterId ? 'decoy' : 'real';
    const content = loadContent(round.promptPairId);
    const key = `${round.index}:${slot}`;
    const idx = used.get(key) || 0; used.set(key, idx + 1);
    const bd = content ? content[slot][idx % content[slot].length] : procedural(round.promptPairId, slot, idx);
    const golden = bd.golden ?? false;
    return {
      strokes: bd.strokes, glowUrl: bd.glowUrl, glowStatus: 'done', glowMock: !bd.glowUrl,
      golden, match: bd.match, sees: bd.sees, roast: bd.roast, judgeStatus: 'done', blank: false,
    };
  };

  const timers: NodeJS.Timeout[] = [];
  const later = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)); };
  const clear = () => { while (timers.length) clearTimeout(timers.pop()!); };

  room.onPhase = (phase) => {
    clear();
    const r = room.currentRound();
    switch (phase) {
      case 'HOW_TO': for (const id of botIds) later(300, () => room.howToReady(id)); break;
      case 'DRAW':
        for (const id of botIds) later(5000 + Math.random() * 14000, () => room.submitDrawing(id, [{ color: '#111', size: 6, points: [] }], 'bot'));
        break;
      case 'DISCUSS': {
        // Bots bicker, then the demo uses the host skip so a solo judge is not stuck for 30 s.
        const lines = shuffle(BANTER).slice(0, 3);
        lines.forEach((l, i) => later(1500 + i * 2200, () => room.toast('info', `${BOT_NAMES[i % 3]}: ${l}`, botIds[i % 3])));
        later(10000, () => room.skip(null));
        break;
      }
      case 'VOTE': {
        if (!r) break;
        for (const id of botIds) {
          later(2500 + Math.random() * 8000, () => {
            const others = r.participantIds.filter((x) => x !== id);
            // A bot imposter frames a random artist; artist bots mostly pick the odd one out, sometimes wrong.
            const target = id === r.imposterId ? pick(others) : Math.random() < 0.65 ? r.imposterId : pick(others);
            room.vote(id, target);
          });
        }
        break;
      }
      case 'STEAL': {
        if (!r || !botIds.includes(r.imposterId)) break;
        later(3000 + Math.random() * 3000, () => room.stealPick(r.imposterId, Math.random() < 0.5 ? r.realPrompt : pick(r.stealOptions)));
        break;
      }
    }
  };
}
