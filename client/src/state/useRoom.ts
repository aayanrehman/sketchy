import { useEffect, useMemo, useRef, useState } from 'react';
import type { Drawing, Player, PublicRoom, MeView, Round, StateMessage, ToastMessage } from '@shared/types';
import { socket } from '@/net/socket';
import { useToast } from '@/design/components/Toast';

export interface RoomView {
  room: PublicRoom | null; me: MeView | null; serverOffset: number; connected: boolean;
  round: Round | null; players: Player[]; byId: Map<string, Player>; drawingOf: (id: string) => Drawing | undefined; error: string | null;
}

/** Subscribes to the server state stream. Server clock offset lets every device show the same timer. */
export function useRoom(): RoomView {
  const [state, setState] = useState<StateMessage | null>(null);
  const [connected, setConnected] = useState(socket().connected);
  const [error, setError] = useState<string | null>(null);
  const offset = useRef(0);
  const toast = useToast();
  const prevPlayers = useRef<Map<string, Player>>(new Map());

  useEffect(() => {
    const s = socket();
    const onState = (m: StateMessage) => {
      offset.current = m.serverNow - Date.now();
      // Streak toast: fire when a player's streak reaches 2+ during SCORES.
      if (m.room.phase === 'SCORES') {
        for (const p of m.room.players) {
          const prev = prevPlayers.current.get(p.id);
          if (prev && p.streak >= 2 && p.streak > prev.streak) toast.push({ id: `streak-${p.id}-${m.room.round}`, kind: 'streak', text: `${p.name} is on a ${p.streak} catch streak!`, color: p.color, icon: '🔥' });
        }
      }
      prevPlayers.current = new Map(m.room.players.map((p) => [p.id, p]));
      setState(m);
    };
    const onToast = (t: ToastMessage) => {
      const p = t.playerId ? prevPlayers.current.get(t.playerId) : undefined;
      toast.push({ ...t, color: p?.color, icon: p && (t.kind === 'join' || t.kind === 'info' || t.kind === 'host') ? p.avatar : undefined });
    };
    const onErr = (e: { message: string }) => { setError(e.message); setTimeout(() => setError(null), 3000); };
    const onConn = () => setConnected(true); const onDisc = () => setConnected(false);
    s.on('state', onState); s.on('toast', onToast); s.on('error', onErr); s.on('connect', onConn); s.on('disconnect', onDisc);
    return () => { s.off('state', onState); s.off('toast', onToast); s.off('error', onErr); s.off('connect', onConn); s.off('disconnect', onDisc); };
  }, [toast]);

  return useMemo(() => {
    const room = state?.room || null;
    const round = room ? room.rounds[room.round - 1] || null : null;
    const players = room?.players || [];
    const byId = new Map(players.map((p) => [p.id, p]));
    return {
      room, me: state?.me || null, serverOffset: offset.current, connected, round, players, byId, error,
      drawingOf: (id: string) => round?.drawings.find((d) => d.playerId === id),
    };
  }, [state, connected, error]);
}
