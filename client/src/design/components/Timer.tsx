import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { t } from '../motion';
import { useSfx } from '@/sound/useSfx';

interface Props { endsAt: number | null; serverOffset: number; variant?: 'pill' | 'ring'; urgentAt?: number; tick?: boolean; layoutId?: string; compact?: boolean }

/** Countdown driven by the server's phaseEndsAt. Bar/ring animate with transform only. */
export function Timer({ endsAt, serverOffset, variant = 'pill', urgentAt = 5, tick = true, layoutId = 'timer', compact }: Props) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const [now, setNow] = useState(() => Date.now() + serverOffset);
  const totalRef = useRef<number>(0);
  const lastSec = useRef<number>(-1);

  useEffect(() => {
    if (!endsAt) return;
    totalRef.current = Math.max(1, endsAt - (Date.now() + serverOffset));
    lastSec.current = -1;
    const id = setInterval(() => setNow(Date.now() + serverOffset), 250);
    return () => clearInterval(id);
  }, [endsAt, serverOffset]);

  const remainingMs = endsAt ? Math.max(0, endsAt - now) : 0;
  const sec = Math.ceil(remainingMs / 1000);
  const frac = endsAt ? Math.min(1, remainingMs / totalRef.current) : 0;
  const urgent = !!endsAt && sec <= urgentAt && sec > 0;

  useEffect(() => {
    if (!endsAt || !tick) return;
    if (sec !== lastSec.current) {
      lastSec.current = sec;
      if (sec <= urgentAt && sec > 0) sfx.play('tick');
    }
  }, [sec, endsAt, tick, urgentAt, sfx]);

  if (!endsAt) return null;

  if (variant === 'ring') {
    // Two half-rings rotated with transforms. Right half covers 100%..50%, left half 50%..0.
    const rDeg = frac >= 0.5 ? 0 : (0.5 - frac) * 360;
    const lDeg = frac >= 0.5 ? (1 - frac) * 360 : 180;
    return (
      <motion.div layoutId={layoutId} className={`timer timer--ring ${urgent ? 'timer--urgent' : ''}`} transition={t.layout(rm)} aria-live="off" aria-label={`${sec} seconds left`}>
        <div className="ring">
          <div className="ring__track" />
          <div className="ring__half ring__half--r"><div className="ring__fill" style={{ transform: `rotate(${rDeg}deg)` }} /></div>
          <div className="ring__half ring__half--l"><div className="ring__fill" style={{ transform: `rotate(${lDeg}deg)` }} /></div>
        </div>
        <motion.span className="timer__digits" key={sec} initial={{ scale: urgent && !rm ? 1.3 : 1 }} animate={{ scale: 1 }} transition={t.snap(rm)}>{sec}</motion.span>
      </motion.div>
    );
  }
  return (
    <motion.div layoutId={layoutId} className={`timer ${compact ? 'timer--compact' : ''} ${urgent ? 'timer--urgent' : ''}`} transition={t.layout(rm)} aria-label={`${sec} seconds left`}>
      <span className="timer__clock" aria-hidden><i style={{ ['--hand' as any]: `${(1 - frac) * 360}deg` }} /><b /></span>
      <motion.span className="timer__digits" key={sec} initial={{ scale: urgent && !rm ? 1.25 : 1 }} animate={{ scale: 1 }} transition={t.snap(rm)}>{sec}</motion.span>
      <div className="timer__bar"><div className="timer__fill" style={{ transform: `scaleX(${frac})`, transition: `transform 250ms linear` }} /></div>
    </motion.div>
  );
}
