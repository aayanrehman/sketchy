import { Button } from '@/design/components';

const PROMPT_STEPS = [
  { title: 'Recreate the picture with a prompt', text: 'Everyone sees a target image and recreates it with AI in two passes: a quick draft, then a longer final prompt using your draft’s score and tip.' },
  { title: 'One imposter had part of it erased', text: 'They have to guess what was there, so their draft is the best clue. Compare drafts and final images, chat, then vote.' },
  { title: 'Score for prompting and for catching', text: 'Only your final image is judged against the target. Better prompts, bigger improvements and catching the imposter all earn points.' },
];
const STEPS = [
  { title: 'Everyone draws the same secret prompt', text: 'Except one imposter, who secretly gets a slightly different one.' },
  { title: 'Spot the odd drawing', text: 'Chat about the drawings, then vote for the one you think the imposter made.' },
  { title: 'Catch them for points', text: 'Vote for the imposter: +100. If the imposter gets away, they get +200.' },
];

/** 3 illustrated steps. Used in the HOW_TO phase and from the "?" button anytime. */
export function HowTo({ onDone, cta = 'Got it', compact, solo, mode = 'prompt' }: { onDone?: () => void; cta?: string; compact?: boolean; solo?: boolean; mode?: 'prompt' | 'sketch' }) {
  const steps = mode === 'prompt' ? PROMPT_STEPS : STEPS;
  return (
    <div className="howto">
      {!compact && <h2 className="display-md" style={{ textAlign: 'center' }}>How to play</h2>}
      {solo && <p className="howto__solo">Practice game: 2 quick rounds against 3 bots. In round 1 you’re a regular player; in round 2 <b>you’re the imposter</b>. Sketchy will tell you what to do at each step.</p>}
      <ol className="howto__steps">
        {steps.map((s, i) => (
          <li key={i} className="howto__step">
            <img className="howto__pic" src={`/mascot/howto-${i + 1}.webp`} alt="" width={72} height={72} />
            <div><h3>{i + 1}. {s.title}</h3><p>{s.text}</p></div>
          </li>
        ))}
      </ol>
      <details className="howto__more">
        <summary>How points work</summary>
        <ul>
          <li>Vote for the imposter: +100 (+150 if you catch them two rounds in a row).</li>
          <li>Imposter escapes: +200. If the votes tie and the imposter is one of the tied players, there’s a quick revote.</li>
          <li>Caught imposter: one guess at {mode === 'prompt' ? 'what was hidden' : 'the real prompt'}; right = +150.</li>
          {mode === 'prompt'
            ? <li>An AI judge compares each final image with the target in five areas. Everyone earns half their match score; the closest artist +50; an imposter who matches as well as the typical artist +100.</li>
            : <li>An AI judge scores each original sketch against the real prompt: best artist +50; an imposter who matches as well as the typical artist +100.</li>}
        </ul>
      </details>
      {onDone && <Button variant="secondary" size="lg" block onClick={onDone}>{cta}</Button>}
    </div>
  );
}
