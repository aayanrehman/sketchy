/** Progression saved on the device, no login: XP, level, gallery, personal bests, unlocked colors. */
import { LEVEL_TITLES, XP_PER_LEVEL } from '@shared/types';
import { UNLOCK_COLORS } from '@/design/tokens';

export interface GalleryItem { url: string; golden: boolean; prompt: string; at: number }
export interface DailyRecord { date: string; score: number }
export interface Progress {
  xp: number; games: number; gallery: GalleryItem[];
  bests: { match: number; streak: number; escapes: number };
  seenHowTo: boolean;
  /** Daily target: played days (date -> score), current streak and best streak. */
  daily: { played: Record<string, number>; streak: number; bestStreak: number; last: string | null };
}
const KEY = 'sketchy.progress';
const DEFAULT: Progress = { xp: 0, games: 0, gallery: [], bests: { match: 0, streak: 0, escapes: 0 }, seenHowTo: false, daily: { played: {}, streak: 0, bestStreak: 0, last: null } };

export function load(): Progress {
  try { const p = JSON.parse(localStorage.getItem(KEY) || '{}'); return { ...DEFAULT, ...p, daily: { ...DEFAULT.daily, ...(p.daily || {}) } }; } catch { return { ...DEFAULT }; }
}
/** UTC date key, the same one the server uses to pick the daily target. */
export const todayKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const prevKey = (key: string) => new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) - 86_400_000).toISOString().slice(0, 10);
export function dailyPlayed(key = todayKey()) { return load().daily.played[key]; }
/** Current streak, counting today if played; a streak survives until the end of the next day. */
export function dailyStreak(now = Date.now()) {
  const d = load().daily; const t = todayKey(now);
  if (!d.last) return 0;
  return d.last === t || d.last === prevKey(t) ? d.streak : 0;
}
/** Record today's daily score once. Returns the streak after recording, and whether it's a new best score. */
export function recordDaily(score: number, now = Date.now()) {
  const p = load(); const t = todayKey(now);
  if (p.daily.played[t] !== undefined) return { streak: dailyStreak(now), first: false, newBest: false };
  const continues = p.daily.last === prevKey(t);
  p.daily.streak = continues ? p.daily.streak + 1 : 1;
  p.daily.bestStreak = Math.max(p.daily.bestStreak, p.daily.streak);
  p.daily.played[t] = score; p.daily.last = t;
  const newBest = score > p.bests.match; p.bests.match = Math.max(p.bests.match, score);
  p.xp += 40 + Math.round(score / 4);
  save(p);
  return { streak: p.daily.streak, first: true, newBest };
}
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
