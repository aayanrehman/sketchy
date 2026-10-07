import { randomBytes, createHash } from 'node:crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O, 0, I, 1

export function makeRoomCode(taken: (c: string) => boolean): string {
  for (let i = 0; i < 100; i++) {
    let c = '';
    for (let j = 0; j < 4; j++) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (!taken(c)) return c;
  }
  throw new Error('Could not allocate a room code');
}

export const uid = (n = 8) => randomBytes(n).toString('hex');
export const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const PLAYER_COLORS = ['#FF6B6B', '#FFA94D', '#FFE066', '#63E6BE', '#4DABF7', '#B197FC', '#F783AC', '#F8F9FA'];
export const PLAYER_AVATARS = ['🦊', '🐸', '🦄', '🐙', '🐼', '🦁', '🐧', '🐲'];
