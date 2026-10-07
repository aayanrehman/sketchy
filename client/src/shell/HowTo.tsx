import { Button } from '@/design/components';

const STEPS = [
  { title: 'Everyone draws the secret prompt', text: 'Except one imposter, who gets a slightly different prompt and has to blend in.' },
  { title: 'Spot the odd one out', text: 'Each sketch is redrawn as a sticker (the original stays in the corner). Chat about the clues, then click the drawing you suspect. If the imposter is in a tie, there’s a quick revote; otherwise a tie lets them escape.' },
  { title: 'Catch them, or steal the round', text: 'Catch the imposter: +100 each (+150 on a streak). Imposter escapes: +200. If caught, the imposter can still steal +150 by guessing the real prompt.' },
];

/** 3 illustrated steps. Used in the HOW_TO phase and from the "?" button anytime. */
export function HowTo({ onDone, cta = 'Got it', compact }: { onDone?: () => void; cta?: string; compact?: boolean }) {
  return (
    <div className="howto">
      {!compact && <h2 className="display-md" style={{ textAlign: 'center' }}>How to play</h2>}
      <ol className="howto__steps">
        {STEPS.map((s, i) => (
          <li key={i} className="howto__step">
            <img className="howto__pic" src={`/mascot/howto-${i + 1}.webp`} alt="" width={72} height={72} />
            <div><h3>{i + 1}. {s.title}</h3><p>{s.text}</p></div>
          </li>
        ))}
      </ol>
      <p className="dim howto__note">Bonus points: an AI judge rates how well each sketch matches the real prompt. Best artist +50; an imposter who matches as well as the typical artist +100.</p>
      {onDone && <Button variant="secondary" size="lg" block onClick={onDone}>{cta}</Button>}
    </div>
  );
}
