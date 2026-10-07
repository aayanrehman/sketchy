import type { Stroke } from '../../shared/types';
import { parseSketch } from './media';

const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
const code = (v: unknown) => typeof v === 'string' && /^[A-Z2-9]{4}$/i.test(v);
const token = (v: unknown) => v === undefined || (typeof v === 'string' && /^[a-f0-9]{32,64}$/i.test(v));
export function validStrokes(v: unknown): v is Stroke[] {
  if (!Array.isArray(v) || v.length > 500) return false;
  let points = 0;
  return v.every(s => object(s) && /^#[a-f0-9]{3}([a-f0-9]{3})?$/i.test(s.color) &&
    Number.isFinite(s.size) && s.size >= 1 && s.size <= 50 && Array.isArray(s.points) &&
    (points += s.points.length) <= 20000 && s.points.every((p: unknown) => object(p) &&
      Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 512 && p.y >= 0 && p.y <= 512));
}
export function validEvent(event: string, args: any[]): boolean {
  const p = args[0];
  switch (event) {
    case 'screen:create': return args.length === 1 && typeof p === 'function';
    case 'screen:watch': return object(p) && code(p.code) && token(p.hostToken) && typeof args[1] === 'function';
    case 'join': return object(p) && code(p.code) && str(p.name, 12) && token(p.token) && token(p.hostToken) && typeof args[1] === 'function';
    case 'demo:create': return object(p) && str(p.name, 12) && typeof args[1] === 'function';
    case 'host:assign': case 'vote': return object(p) && str(p.playerId ?? p.targetId, 24);
    case 'steal:pick': return object(p) && str(p.option, 160);
    case 'chat:send': return object(p) && str(p.text, 240);
    case 'draw:submit':
      if (!object(p) || !validStrokes(p.strokes) || !str(p.png, 3000000)) return false;
      if (p.png === '' && p.strokes.length === 0) return true;
      try { parseSketch(p.png); return true; } catch { return false; }
    case 'host:start': case 'host:skip': case 'host:playAgain': case 'howto:ready': case 'verdict:ready': case 'leave': return args.length === 0;
    default: return false;
  }
}

/** Fixed windows, bounded storage; callers use the transport address, never untrusted headers. */
export class RateLimit {
  private entries = new Map<string, { n: number; until: number }>();
  constructor(private maxKeys = 10000) {}
  allow(key: string, max: number, ms: number, now = Date.now()): boolean {
    let e = this.entries.get(key);
    if (!e || e.until <= now) {
      if (this.entries.size >= this.maxKeys) for (const [k, v] of this.entries) if (v.until <= now) this.entries.delete(k);
      if (!e && this.entries.size >= this.maxKeys) return false;
      e = { n: 0, until: now + ms }; this.entries.set(key, e);
    }
    return ++e.n <= max;
  }
}
