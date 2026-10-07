import type { RoomView } from '@/state/useRoom';
import { socket } from '@/net/socket';

export interface MomentProps { view: RoomView }
export const send = socket;
export const galleryCols = (n: number) => (n <= 4 ? 'gallery--2' : n <= 6 ? 'gallery--3' : 'gallery--4');

/** Elapsed ms since the phase started, on the server clock. */
export function phaseElapsed(view: RoomView) {
  const r = view.room; if (!r) return 0;
  return Date.now() + view.serverOffset - r.phaseStartedAt;
}
