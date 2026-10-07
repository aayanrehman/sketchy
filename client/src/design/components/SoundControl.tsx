import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { SoundIcon } from './Illustrations';
import { useMute } from '@/sound/useSfx';
import { getVolume, onVolumeChange, play, setVolume, type VolumeKind } from '@/sound/sfx';

/** Speaker button: opens a small panel with mute plus separate Music and Effects levels. */
export function SoundControl() {
  const [muted, setMuted] = useMute();
  const [open, setOpen] = useState(false);
  const [, bump] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => onVolumeChange(() => bump((n) => n + 1)) as () => void, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', close); window.addEventListener('keydown', close);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', close); };
  }, [open]);
  const slider = (k: VolumeKind, label: string) => (
    <label className="sound__row">
      <span>{label}</span>
      <input type="range" min={0} max={100} value={Math.round(getVolume(k) * 100)} disabled={muted}
        onChange={(e) => setVolume(k, Number(e.target.value) / 100)} onPointerUp={() => k === 'sfx' && play('pop')} />
    </label>
  );
  return (
    <div className="sound" ref={ref}>
      <Button variant="ghost" icon aria-label="Sound settings" aria-expanded={open} onClick={() => setOpen(!open)}><SoundIcon muted={muted} /></Button>
      {open && (
        <div className="sound__panel" role="dialog" aria-label="Sound settings">
          {slider('music', 'Music')}
          {slider('sfx', 'Effects')}
          <Button variant={muted ? 'primary' : 'ghost'} size="sm" block onClick={() => setMuted(!muted)} aria-pressed={muted}>{muted ? 'Unmute all' : 'Mute all'}</Button>
        </div>
      )}
    </div>
  );
}
