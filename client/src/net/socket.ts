import { io, Socket } from 'socket.io-client';
import type { ClientToServer, ServerToClient } from '@shared/types';

let sock: Socket<ServerToClient, ClientToServer> | null = null;
export function socket(): Socket<ServerToClient, ClientToServer> {
  if (!sock) sock = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionDelayMax: 4000 });
  return sock;
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
