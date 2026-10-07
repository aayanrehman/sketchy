import type { MeView, Phase, PublicRoom } from '@shared/types';

const STEPS = ['Prompt', 'Draw', 'Reveal', 'Discuss', 'Vote', 'Results'] as const;
const STEP_OF: Partial<Record<Phase, number>> = { PROMPT: 0, DRAW: 1, GALLERY: 2, DISCUSS: 3, VOTE: 4, UNMASK: 5, STEAL: 5, VERDICT: 5, SCORES: 5 };

/** One plain sentence: what is happening and what you should do right now. */
function line(room: PublicRoom, me: MeView): { text: string; mood: 'happy' | 'think' | 'sus' | 'imposter' | 'judge' } {
  const r = room.rounds[room.round - 1];
  const p = room.players.find((x) => x.id === me.playerId);
  const imp = me.isImposter;
  const last = room.round >= room.totalRounds;
  switch (room.phase) {
    case 'PROMPT': return imp
      ? { text: 'You’re the imposter this round! Your prompt is a little different from everyone else’s. Draw it so it blends in.', mood: 'imposter' }
      : { text: 'Remember your secret prompt. Everyone has the same one, except one secret imposter.', mood: 'happy' };
    case 'DRAW': return p?.hasSubmitted
      ? { text: 'Nice! Waiting for everyone else to finish drawing…', mood: 'happy' }
      : { text: imp ? `Draw “${me.prompt}”, but keep it vague enough to pass as everyone else’s. Press Submit when done.` : `Draw “${me.prompt}” on the canvas, then press Submit drawing.`, mood: 'think' };
    case 'GALLERY': return { text: 'Sketchy is turning every drawing into a sticker. Look for the one that doesn’t match the others.', mood: 'sus' };
    case 'DISCUSS': return imp
      ? { text: 'Act natural! Use the chat to point suspicion at someone else. Voting opens when the timer ends.', mood: 'imposter' }
      : { text: 'Which drawing looks different? Say why in the chat. Voting opens when the timer ends (or press Skip to vote).', mood: 'sus' };
    case 'VOTE': return p?.hasVoted
      ? { text: 'Vote locked in. Waiting for everyone else…', mood: 'happy' }
      : { text: r?.revote ? 'It’s a tie! Click one of the tied drawings to break it.' : imp ? 'Click someone else’s drawing to frame them.' : 'Click the drawing you think the imposter made.', mood: 'sus' };
    case 'UNMASK': return { text: 'Counting the votes… who got caught?', mood: 'sus' };
    case 'STEAL': return r?.imposterId === me.playerId
      ? { text: 'You got caught, but you can still steal points: pick the prompt everyone else had.', mood: 'imposter' }
      : { text: 'The imposter gets one guess at the real prompt to steal points…', mood: 'think' };
    case 'VERDICT': return { text: 'Here’s how the round went. Take a look, then press See scores.', mood: 'judge' };
    case 'SCORES': return { text: last ? 'Points for this round. The final results are next.' : 'Points for this round. The next round starts in a few seconds.', mood: 'happy' };
    default: return { text: '', mood: 'happy' };
  }
}

/** Where you are in the round, and the one thing to do now. Same spot on every screen. */
export function Coach({ room, me }: { room: PublicRoom; me: MeView | null }) {
  const step = STEP_OF[room.phase];
  if (step === undefined || !me || !room.rounds[room.round - 1]?.participantIds.includes(me.playerId)) return null;
  const { text, mood } = line(room, me);
  return (
    <div className={`coach ${me.isImposter && room.phase !== 'VERDICT' && room.phase !== 'SCORES' ? 'coach--imp' : ''}`}>
      <ol className="coach__steps" aria-label={`Round ${room.round} of ${room.totalRounds}: ${STEPS[step]}`}>
        {STEPS.map((s, i) => <li key={s} className={i < step ? 'is-done' : i === step ? 'is-on' : ''} aria-current={i === step ? 'step' : undefined}>{s}</li>)}
      </ol>
      <p className="coach__line" key={room.phase + text} role="status" aria-live="polite">
        <img src={`/mascot/${mood}.webp`} alt="" width={36} height={36} />
        <span>{text}</span>
      </p>
    </div>
  );
}
