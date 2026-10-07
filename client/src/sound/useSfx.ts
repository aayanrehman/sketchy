import { useEffect, useMemo, useState } from 'react';
import { isMuted, onMuteChange, play, setMuted, type SfxName } from './sfx';

export function useSfx() {
  return useMemo(() => ({ play: (n: SfxName) => play(n) }), []);
}
export function useMute(): [boolean, (m: boolean) => void] {
  const [m, setM] = useState(isMuted());
  useEffect(() => { const off = onMuteChange(setM); return () => { off(); }; }, []);
  return [m, setMuted];
}
