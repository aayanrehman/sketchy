import { Button, Mascot } from '@/design/components';

/** 3 illustrated steps. Used in the HOW_TO phase and from the "?" button anytime. */
export function HowTo({ onDone, cta = 'Got it', compact }: { onDone?: () => void; cta?: string; compact?: boolean }) {
  return (
    <div className="howto">
      {!compact && <h2 className="display-md" style={{ textAlign: 'center' }}>How to play</h2>}
      <div className="howto__steps">
        <div className="howto__step"><div className="howto__pic howto__pic--1"><Mascot mood="happy" size={56} /></div><div><h3>1. Everyone draws the secret prompt</h3><p>Except one imposter, who gets a close-but-different prompt and has to blend in.</p></div></div>
        <div className="howto__step"><div className="howto__pic howto__pic--2"><Mascot mood="sus" size={56} /></div><div><h3>2. Watch the AI glow-up, then vote</h3><p>Sketches turn into AI art. Argue, then tap the drawing you think is the fake.</p></div></div>
        <div className="howto__step"><div className="howto__pic howto__pic--3"><Mascot mood="judge" size={56} /></div><div><h3>3. The AI judge has the last word</h3><p>Match % for every drawing. Catch the imposter for points; escape or steal if you are it.</p></div></div>
      </div>
      {onDone && <Button variant="secondary" size="lg" block onClick={onDone}>{cta}</Button>}
    </div>
  );
}
