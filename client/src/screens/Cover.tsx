import { Mascot } from '@/design/components';

/** Submission key art: a sticker-book accusation, composed at exactly 1200 × 630. */
export function Cover() {
  return <div className="cover cover--key-art">
    <div className="cover__hill" />
    <div className="cover__copy">
      <span className="cover__eyebrow">DRAW. BLUFF. BUST YOUR FRIENDS.</span>
      <h1 className="cover__title gold-text">SKETCHY</h1>
      <p className="cover__sub">One prompt.<br />One imposter.<br />The AI has opinions.</p>
      <span className="cover__pill">THE AI DRAWING PARTY GAME</span>
    </div>
    <div className="cover__art" aria-label="Three cat DJs and one suspicious cat chef">
      <div className="cover__sticker cover__sticker--one"><img src="/demo-art/cat-0.webp" alt="A cat DJ" /></div>
      <div className="cover__sticker cover__sticker--two"><img src="/demo-art/cat-1.webp" alt="Another cat DJ" /></div>
      <div className="cover__sticker cover__sticker--three"><img src="/demo-art/cat-2.webp" alt="A third cat DJ" /></div>
      <div className="cover__sticker cover__sticker--sus"><img src="/demo-art/cat-3.webp" alt="A cat chef, the imposter" /><b>SEEMS SKETCHY.</b></div>
      <span className="cover__scribble">Who invited the chef?</span>
      <div className="cover__mascot"><Mascot mood="judge" size={156} /></div>
    </div>
  </div>;
}
