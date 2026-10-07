import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Drawing, Player, PublicRoom, MeView, Round } from '@shared/types';
import { convex, useSession } from '@/net/socket';
import { useToast } from '@/design/components/Toast';

export interface RoomView {
  canHost?: boolean; room: PublicRoom | null; me: MeView | null; serverOffset: number; connected: boolean;
  round: Round | null; players: Player[]; byId: Map<string, Player>; drawingOf: (id: string) => Drawing | undefined; error: string | null;
}

/** Subscribes to the room through Convex. Also keeps a heartbeat going and measures the server clock offset. */
export function useRoom(): RoomView {
  const session = useSession();
  const res = useQuery(api.game.state, session ? { code: session.code, token: session.token, hostToken: session.hostToken } : 'skip');
  const room = (res?.room || null) as (PublicRoom & { toasts?: { id: string; kind: any; text: string; playerId?: string }[] }) | null;
  const roundIndex = room?.round || 0;
  const artVisible = !!room && roundIndex > 0 && !['PROMPT', 'DRAW'].includes(room.phase);
  const strokes = useQuery(api.game.sketches, session && artVisible ? { code: session.code, round: roundIndex } : 'skip');
  const [offset, setOffset] = useState(0);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const seenToasts = useRef<Set<string> | null>(null);
  const prevPlayers = useRef<Map<string, Player>>(new Map());

  // Server clock: one round trip, halved.
  useEffect(() => {
    let alive = true;
    const sync = async () => { const t0 = Date.now(); try { const now = await convex.mutation(api.game.now, {}); if (alive) setOffset(now - (t0 + Date.now()) / 2); } catch { /* keep last */ } };
    sync(); const id = setInterval(sync, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  // Heartbeat: lets the room notice when someone closes their tab.
  useEffect(() => {
    if (!session?.token) return;
    const beat = () => convex.mutation(api.game.heartbeat, { code: session.code, token: session.token! }).catch(() => {});
    beat(); const id = setInterval(beat, 5_000);
    return () => clearInterval(id);
  }, [session?.code, session?.token]);
  useEffect(() => {
    const id = setInterval(() => setConnected(convex.connectionState().isWebSocketConnected), 2_000);
    const onErr = (e: Event) => { setError((e as CustomEvent).detail); setTimeout(() => setError(null), 3000); };
    window.addEventListener('sketchy:error', onErr);
    return () => { clearInterval(id); window.removeEventListener('sketchy:error', onErr); };
  }, []);
  // Toasts ride along in the room state; show each new one once.
  useEffect(() => {
    if (!room) return;
    const list = room.toasts || [];
    if (!seenToasts.current) { seenToasts.current = new Set(list.map((t) => t.id)); }
    else for (const t of list) {
      if (seenToasts.current.has(t.id)) continue;
      seenToasts.current.add(t.id);
      const p = t.playerId ? room.players.find((x) => x.id === t.playerId) : undefined;
      toast.push({ ...t, color: p?.color, icon: p && (t.kind === 'join' || t.kind === 'info' || t.kind === 'host') ? p.avatar : undefined });
    }
    if (room.phase === 'SCORES') for (const p of room.players) {
      const prev = prevPlayers.current.get(p.id);
      if (prev && p.streak >= 2 && p.streak > prev.streak) toast.push({ id: `streak-${p.id}-${room.round}`, kind: 'streak', text: `${p.name} is on a ${p.streak} catch streak!`, color: p.color, icon: '🔥' });
    }
    prevPlayers.current = new Map(room.players.map((p) => [p.id, p]));
  }, [room, toast]);

  return useMemo(() => {
    // Merge sketch strokes (fetched separately, they're large) into the current round's drawings.
    let merged = room;
    if (room && strokes?.length) {
      const by = new Map(strokes.map((s) => [s.playerId, s.strokes]));
      merged = { ...room, rounds: room.rounds.map((r) => r.index !== roundIndex ? r : { ...r, drawings: r.drawings.map((d) => ({ ...d, strokes: by.get(d.playerId) || d.strokes })) }) };
    }
    const round = merged ? merged.rounds[merged.round - 1] || null : null;
    const players = merged?.players || [];
    const byId = new Map(players.map((p) => [p.id, p]));
    const gone = session && res === null ? 'This room has ended. Return home to start a new game.' : null;
    return {
      canHost: res?.canHost, room: merged, me: res?.me || null, serverOffset: offset, connected, round, players, byId, error: error || gone,
      drawingOf: (id: string) => round?.drawings.find((d) => d.playerId === id),
    };
  }, [res, room, strokes, roundIndex, offset, connected, error, session]);
}
