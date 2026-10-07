import { ConvexReactClient } from 'convex/react';
import { useSyncExternalStore } from 'react';
import { api } from '../../../convex/_generated/api';
import type { Stroke } from '@shared/types';

/** The one Convex client. Real-time state arrives through queries; every action is a mutation. */
export const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

/** Which room this tab is in, and as whom (a player seat token, or the main screen's host token). */
export interface Session { code: string; token?: string; hostToken?: string }
let session: Session | null = null;
const listeners = new Set<() => void>();
export function setSession(s: Session | null) { session = s; listeners.forEach((l) => l()); }
export function getSession() { return session; }
export function useSession() { return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => session); }

type Events = {
  'draw:submit': { strokes: Stroke[]; png: string }; 'vote': { targetId: string }; 'steal:pick': { option: string };
  'chat:send': { text: string }; 'host:assign': { playerId: string };
  'prompt:draft': { text: string }; 'prompt:final': { text: string }; 'host:mode': { mode: 'prompt' | 'sketch' };
  'howto:ready': void; 'verdict:ready': void; 'host:start': void; 'host:skip': void; 'host:playAgain': void; 'leave': void;
};
function toAction<E extends keyof Events>(e: E, p: any) {
  switch (e) {
    case 'draw:submit': return { t: 'draw' as const, strokes: p.strokes, png: p.png };
    case 'vote': return { t: 'vote' as const, targetId: p.targetId };
    case 'steal:pick': return { t: 'steal' as const, option: p.option };
    case 'chat:send': return { t: 'chat' as const, text: p.text };
    case 'host:assign': return { t: 'assignHost' as const, playerId: p.playerId };
    case 'prompt:draft': return { t: 'draft' as const, text: p.text };
    case 'prompt:final': return { t: 'final' as const, text: p.text };
    case 'host:mode': return { t: 'setMode' as const, mode: p.mode };
    case 'howto:ready': return { t: 'howto' as const };
    case 'verdict:ready': return { t: 'verdictReady' as const };
    case 'host:start': return { t: 'start' as const };
    case 'host:skip': return { t: 'skip' as const };
    case 'host:playAgain': return { t: 'playAgain' as const };
    default: return { t: 'leave' as const };
  }
}

/** Fire-and-forget game actions, kept as `send().emit(event, payload)` so the moment components stay simple. */
export function socket() {
  return {
    /** Sends an action. Errors show as a toast-style banner unless `quiet` (the caller shows them inline). */
    emit<E extends keyof Events>(event: E, ...payload: Events[E] extends void ? [] : [Events[E]]): Promise<{ ok: boolean; error?: string }> {
      const s = session; if (!s) return Promise.resolve({ ok: false });
      const quiet = event === 'prompt:draft' || event === 'prompt:final';
      return convex.mutation(api.game.act, { code: s.code, token: s.token, hostToken: s.hostToken, action: toAction(event, payload[0]) })
        .then((r) => { if (!r.ok && r.error && !quiet) window.dispatchEvent(new CustomEvent('sketchy:error', { detail: r.error })); return r; })
        .catch(() => { const error = 'Could not reach the game. Check your connection.'; window.dispatchEvent(new CustomEvent('sketchy:error', { detail: error })); return { ok: false, error }; });
    },
  };
}

const TOKENS = 'sketchy.tokens';
export function saveToken(code: string, token: string) {
  try { const m = JSON.parse(localStorage.getItem(TOKENS) || '{}'); m[code] = token; localStorage.setItem(TOKENS, JSON.stringify(m)); } catch { /* ignore */ }
}
export function loadToken(code: string): string | undefined {
  try { return JSON.parse(localStorage.getItem(TOKENS) || '{}')[code]; } catch { return undefined; }
}
export function saveName(n: string) { try { localStorage.setItem('sketchy.name', n); } catch { /* ignore */ } }
export function loadName(): string { try { return localStorage.getItem('sketchy.name') || ''; } catch { return ''; } }

export function saveHostToken(code: string, token: string) { try { localStorage.setItem(`sketchy.host.${code}`, token); } catch {} }
export function loadHostToken(code: string): string | undefined { try { return localStorage.getItem(`sketchy.host.${code}`) || undefined; } catch { return undefined; } }
