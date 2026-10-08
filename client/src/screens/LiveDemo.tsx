import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DEMO_BOTS, DEMO_TARGETS, matchOf, targetById } from '../../../convex/targets';

/** Real solo-demo content: the target, a bot's final prompt, its image and score. */
const EXAMPLES = DEMO_TARGETS.flatMap((id) => {
  const t = targetById(id); const a = DEMO_BOTS[id]?.artists?.[0];
  return t && a ? [{ target: t.image, masked: t.masked, key: t.key, prompt: a.finalPrompt, image: a.finalImage, score: matchOf(a.final) }] : [];
});

type Step = 'target' | 'typing' | 'result' | 'imposter';
const STEP_MS: Record<Step, number> = { target: 900, typing: 0, result: 2400, imposter: 2600 };

/** The home page's living explainer: target → a prompt types itself → the image paints in and scores → what the imposter sees. */
export function LiveDemo() {
  const rm = !!useReducedMotion();
  const [ex, setEx] = useState(0);
  const [step, setStep] = useState<Step>(rm ? 'result' : 'target');
  const [typed, setTyped] = useState(0);
  const [score, setScore] = useState(0);
  const e = EXAMPLES[ex % EXAMPLES.length];

  useEffect(() => {
    if (!e || rm) return;
    let id: ReturnType<typeof setTimeout>;
    if (step === 'target') id = setTimeout(() => { setTyped(0); setStep('typing'); }, STEP_MS.target);
    else if (step === 'typing') {
      if (typed < e.prompt.length) id = setTimeout(() => setTyped((n) => n + 1), 28);
      else id = setTimeout(() => setStep('result'), 350);
    } else if (step === 'result') id = setTimeout(() => setStep('imposter'), STEP_MS.result);
    else id = setTimeout(() => { setEx((n) => n + 1); setScore(0); setStep('target'); }, STEP_MS.imposter);
    return () => clearTimeout(id);
  }, [step, typed, e, rm]);

  // Score counts up when the result lands.
  useEffect(() => {
    if (step !== 'result' || !e) return;
    if (rm) { setScore(e.score); return; }
    const t0 = performance.now(); let raf = 0;
    const tick = (now: number) => { const p = Math.min(1, (now - t0) / 800); setScore(Math.round(e.score * (1 - (1 - p) ** 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, e, rm]);

  if (!e) return null;
  const showResult = step === 'result' || step === 'imposter';
  const imposter = step === 'imposter';
  return (
    <div className="livedemo" aria-label="How a round works: recreate the target with a prompt">
      <div className="livedemo__pair">
        <figure className={`livedemo__card ${imposter ? 'is-imp' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.img key={imposter ? 'm' : 't'} src={imposter ? e.masked : e.target} alt={imposter ? 'What the imposter sees' : 'The target image'}
              initial={{ opacity: 0, rotateY: rm ? 0 : -60 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: rm ? 0 : 60 }} transition={{ duration: 0.35 }} />
          </AnimatePresence>
          <figcaption>{imposter ? 'The imposter sees this' : 'Target'}</figcaption>
        </figure>
        <span className="livedemo__arrow" aria-hidden>→</span>
        <figure className="livedemo__card">
          {showResult
            ? <motion.img key={`r${ex}`} src={e.image} alt="The AI image from that prompt" initial={rm ? { opacity: 0 } : { clipPath: 'circle(0% at 50% 50%)' }} animate={rm ? { opacity: 1 } : { clipPath: 'circle(75% at 50% 50%)' }} transition={{ duration: 0.7, ease: [0.2, 0, 0, 1] }} />
            : <div className="livedemo__wait"><i /><i /><i /></div>}
          {showResult && <span className="livedemo__score">{score}/100</span>}
          <figcaption>AI image from the prompt</figcaption>
        </figure>
      </div>
      <div className="livedemo__prompt">
        <span className="livedemo__label">Prompt</span>
        <span className="livedemo__text">{rm ? e.prompt : e.prompt.slice(0, step === 'target' ? 0 : step === 'typing' ? typed : e.prompt.length)}{step === 'typing' && <b className="livedemo__caret" />}</span>
      </div>
      <p className="livedemo__note">{imposter ? `One player can’t see ${e.key}. Their prompt has to guess.` : 'Write a prompt to recreate the target as closely as you can.'}</p>
    </div>
  );
}
