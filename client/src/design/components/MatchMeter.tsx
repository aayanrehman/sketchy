import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Drawing, Player } from '@shared/types';
import { SketchCanvas } from './SketchCanvas';
import { useSfx } from '@/sound/useSfx';
import { dur, durRM } from '../motion';

interface Props { drawing: Drawing; player?: Player; isImposter?: boolean; isYou?: boolean; run: boolean; slow?: boolean; onDone?: () => void }

/**
 * Match % meter. When `run` turns true the bar fills (scaleX) and the number spins up with the
 * meter whir; the imposter's runs slowest. Fallback (match -1) is the "foggy glasses" state.
 */
export function MatchMeter({ drawing, player, isImposter, isYou, run, slow, onDone }: Props) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const fog = drawing.judgeStatus === 'fallback' || drawing.match === -1 || drawing.match === undefined;
  const target = fog ? 0 : (drawing.match as number);
  const [n, setN] = useState(0);
  const [typed, setTyped] = useState('');
  const started = useRef(false);
  const D = rm ? durRM : dur;
  const fillMs = (slow ? D.dramatic * 2.4 : D.dramatic * 1.2) * 1000;

  useEffect(() => {
    if (!run || started.current) return;
    started.current = true;
    if (fog) { setTyped(drawing.roast || 'My glasses fogged up.'); onDone?.(); return; }
    const t0 = performance.now();
    sfx.play(slow ? 'meterSlow' : 'meter');
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / fillMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else { sfx.play(target >= 70 ? 'ding' : 'thud'); typeOut(); }
    };
    raf = requestAnimationFrame(step);
    const typeOut = () => {
      const text = `${drawing.sees ? `Sees: ${drawing.sees}. ` : ''}${drawing.roast || ''}`;
      if (rm) { setTyped(text); onDone?.(); return; }
      let i = 0;
      const id = setInterval(() => { i += 2; setTyped(text.slice(0, i)); if (i >= text.length) { clearInterval(id); onDone?.(); } }, 28);
    };
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line
  }, [run]);

  return (
    <motion.div className={`meter ${isImposter ? 'meter--imposter' : ''} ${fog ? 'meter--fog' : ''}`} layout="position">
      <div className="meter__thumb">
        {drawing.glowUrl && drawing.glowStatus === 'done' ? <img src={drawing.glowUrl} alt="" className={`tile__layer ${drawing.glowMock ? 'tile__layer--mock' : ''}`} /> : <SketchCanvas strokes={drawing.strokes} size={56} className="tile__layer" />}
      </div>
      <div className="meter__body">
        <div className="meter__name">
          <span>{player?.avatar} {player?.name}</span>
          {isImposter && <span className="meter__tag">IMPOSTER</span>}
          {isYou && <span className="meter__tag meter__tag--you">YOU</span>}
        </div>
        <div className="meter__track">
          <div className="meter__fill" style={{ transform: `scaleX(${run && !fog ? target / 100 : 0})`, transition: run ? `transform ${fillMs}ms cubic-bezier(0.2,0,0,1)` : 'none' }} />
        </div>
        <div className="meter__text">{typed.startsWith('Sees:') ? <><b>{typed.split('. ')[0]}.</b> {typed.split('. ').slice(1).join('. ')}</> : typed}</div>
      </div>
      <div className="meter__num" aria-live="polite">
        {fog ? <>?? <span className={`meter__fog ${rm ? 'rm-still' : ''}`} aria-hidden /></> : `${run ? n : 0}%`}
      </div>
    </motion.div>
  );
}
