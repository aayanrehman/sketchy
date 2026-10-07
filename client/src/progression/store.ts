/** Progression saved on the device, no login: XP, level, gallery, personal bests, unlocked colors. */
import { LEVEL_TITLES, XP_PER_LEVEL } from '@shared/types';
import { UNLOCK_COLORS } from '@/design/tokens';

export interface GalleryItem { url: string; golden: boolean; prompt: string; at: number }
export interface Progress {
  xp: number; games: number; gallery: GalleryItem[];
  bests: { match: number; streak: number; escapes: number };
  seenHowTo: boolean;
}
const KEY = 'sketchy.progress';
const DEFAULT: Progress = { xp: 0, games: 0, gallery: [], bests: { match: 0, streak: 0, escapes: 0 }, seenHowTo: false };

export function load(): Progress { try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULT }; } }
export function save(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); }
  catch { p.gallery = p.gallery.slice(-8); try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage full */ } }
}
export function level(xp: number) { return Math.min(LEVEL_TITLES.length, Math.floor(xp / XP_PER_LEVEL) + 1); }
export function levelTitle(xp: number) { return LEVEL_TITLES[level(xp) - 1]; }
export function levelProgress(xp: number) { return (xp % XP_PER_LEVEL) / XP_PER_LEVEL; }
export function unlockedColors(xp: number) { const l = level(xp); return UNLOCK_COLORS.filter((u) => u.level <= l); }

/** XP: 10 per point scored / 10, plus 100 per game. Called once per finished game. */
export function recordGame(args: { score: number; rank: number; bestMatch: number; bestStreak: number; escapes: number; gallery: GalleryItem[]; gameKey: string }) {
  const p = load();
  try { if (localStorage.getItem('sketchy.lastGame') === args.gameKey) return p; localStorage.setItem('sketchy.lastGame', args.gameKey); } catch { /* ignore */ }
  const before = level(p.xp);
  p.xp += 100 + Math.round(args.score / 5) + (args.rank === 1 ? 150 : args.rank === 2 ? 75 : args.rank === 3 ? 40 : 0);
  p.games += 1;
  p.bests.match = Math.max(p.bests.match, args.bestMatch);
  p.bests.streak = Math.max(p.bests.streak, args.bestStreak);
  p.bests.escapes += args.escapes;
  p.gallery = [...p.gallery, ...args.gallery].slice(-24);
  save(p);
  return { ...p, leveledUp: level(p.xp) > before };
}
export function markHowTo() { const p = load(); p.seenHowTo = true; save(p); }
