/** Sketchy: the beret-wearing detective artist. One transparent illustration per mood, in client/public/mascot. */
export type MascotMood = 'happy' | 'judge' | 'sus' | 'imposter' | 'think' | 'wow' | 'catch';
export function Mascot({ mood = 'happy', size = 96, className = '', float, bob }: { mood?: MascotMood; size?: number; className?: string; float?: boolean; bob?: boolean }) {
  return <img src={`/mascot/${mood}.webp`} width={size} height={size} draggable={false}
    className={`mascot ${float ? 'mascot--float' : ''} ${bob ? 'mascot--bob' : ''} ${className}`} style={{ ['--mascot-size' as any]: `${size}px` }}
    alt={mood === 'judge' ? 'Sketchy, the judge' : 'Sketchy, the mascot'} />;
}
