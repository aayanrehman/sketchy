import { Mascot } from '@/design/components';
import { DEMO_BOTS, targetById, matchOf } from '../../../convex/targets';
import { tierInfo, tierOf } from '@shared/types';
import './cover.css';

/**
 * Key art / link preview, composed at exactly 1200 × 630 and screenshotted into client/public/og.png
 * (`node --import tsx scripts/make-cover.ts`). Same ingredients as the home page: the sky, the hills, the mascot,
 * a real target next to a real AI recreation with its score and tier, and what the imposter saw.
 */
export function Cover() {
  const t = targetById('frog-band')!;
  const bot = DEMO_BOTS['frog-band']?.artists[0];
  const score = bot ? matchOf(bot.final) : 82;
  const tier = tierInfo(tierOf(score));
  return (
    <div className="cover">
      <div className="cover__sun" />
      <svg className="cover__hills" viewBox="0 0 1200 150" preserveAspectRatio="none" aria-hidden>
        <path d="M0 60 C 300 10 600 30 800 60 S 1100 40 1200 50 L1200 150 L0 150Z" fill="#B9F09A" />
        <path d="M0 105 C 350 80 700 95 900 112 S 1120 100 1200 104 L1200 150 L0 150Z" fill="#7ED35C" />
      </svg>
      <div className="cover__copy">
        <span className="cover__eyebrow">A LITTLE PROMPTING. A LOT OF ACCUSATIONS.</span>
        <div className="cover__brand"><Mascot mood="happy" size={132} /><h1 className="cover__title gold-text">SKETCHY</h1></div>
        <p className="cover__sub">Recreate the picture with an AI prompt.<br />One of you can’t see all of it. Find them.</p>
        <div className="cover__pills"><span className="cover__pill">2–8 players · bots fill empty seats</span><span className="cover__pill cover__pill--lime">Daily target · streaks · crews</span></div>
      </div>
      <div className="cover__art" aria-label="A target image, the AI image made from a prompt with its score, and the imposter's erased view">
        <figure className="cover__card cover__card--target"><img src={t.image} alt="The target" /><figcaption>Target</figcaption></figure>
        <span className="cover__arrow">→</span>
        <figure className="cover__card cover__card--mine">
          <img src={bot?.finalImage || t.image} alt="The AI image from the prompt" />
          <span className="cover__score">{score}/100 {tier ? `${tier.medal} ${tier.label}` : ''}</span>
          <figcaption>Your prompt</figcaption>
        </figure>
        <figure className="cover__card cover__card--imp"><img src={t.masked} alt="What the imposter saw" /><span className="cover__erased">ERASED</span><figcaption>The imposter saw</figcaption></figure>
      </div>
    </div>
  );
}
