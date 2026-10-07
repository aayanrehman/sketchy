/**
 * The Sketchy mascot "Blotto": a round yellow character with an ink outline.
 * Variants give it a job: the judge wears glasses, the imposter wears a mask.
 */
export type MascotMood = 'happy' | 'judge' | 'sus' | 'imposter' | 'think' | 'wow';

export function Mascot({ mood = 'happy', size = 96, className = '', float, bob }: { mood?: MascotMood; size?: number; className?: string; float?: boolean; bob?: boolean }) {
  const ink = 'var(--c-ink)';
  return (
    <svg className={`mascot ${float ? 'mascot--float' : ''} ${bob ? 'mascot--bob' : ''} ${className}`} style={{ ['--mascot-size' as any]: `${size}px` }} viewBox="0 0 120 120" role="img" aria-label="Sketchy mascot">
      {/* ears */}
      <ellipse cx="34" cy="28" rx="12" ry="14" fill="var(--c-yellow)" stroke={ink} strokeWidth="4" />
      <ellipse cx="86" cy="28" rx="12" ry="14" fill="var(--c-yellow)" stroke={ink} strokeWidth="4" />
      {/* body */}
      <path d="M60 18 C 92 18, 108 40, 108 66 C 108 94, 88 108, 60 108 C 32 108, 12 94, 12 66 C 12 40, 28 18, 60 18 Z" fill="var(--c-yellow)" stroke={ink} strokeWidth="4" />
      {/* belly */}
      <ellipse cx="60" cy="82" rx="22" ry="14" fill="#FFF3B0" />
      {/* cheeks */}
      <circle cx="36" cy="66" r="6" fill="var(--c-pink)" opacity="0.7" />
      <circle cx="84" cy="66" r="6" fill="var(--c-pink)" opacity="0.7" />
      {mood === 'imposter' ? (
        <>
          <path d="M28 50 Q 60 40, 92 50 L 92 64 Q 60 72, 28 64 Z" fill={ink} />
          <ellipse cx="46" cy="57" rx="6" ry="5" fill="#fff" /><ellipse cx="74" cy="57" rx="6" ry="5" fill="#fff" />
          <circle cx="47" cy="57" r="2.5" fill={ink} /><circle cx="75" cy="57" r="2.5" fill={ink} />
        </>
      ) : (
        <>
          <circle cx="46" cy="58" r="4" fill={ink} />
          <circle cx="74" cy="58" r="4" fill={ink} />
        </>
      )}
      {mood === 'judge' && (
        <>
          <circle cx="46" cy="58" r="11" fill="none" stroke={ink} strokeWidth="3" />
          <circle cx="74" cy="58" r="11" fill="none" stroke={ink} strokeWidth="3" />
          <path d="M57 58 L63 58" stroke={ink} strokeWidth="3" />
          <path d="M34 18 L 56 10 L 70 14 L 60 20 Z" fill="var(--c-purple)" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        </>
      )}
      {/* mouth */}
      {mood === 'happy' && <path d="M50 74 Q 60 84, 70 74" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />}
      {mood === 'wow' && <ellipse cx="60" cy="78" rx="6" ry="8" fill={ink} />}
      {(mood === 'judge' || mood === 'think') && <path d="M52 76 Q 60 80, 68 76" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />}
      {mood === 'imposter' && <path d="M50 78 Q 60 72, 70 78" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />}
      {mood === 'sus' && (
        <>
          <path d="M50 78 L 70 78" stroke={ink} strokeWidth="4" strokeLinecap="round" />
          <path d="M92 40 C 100 50, 100 58, 92 58 C 84 58, 84 50, 92 40 Z" fill="var(--c-blue)" stroke={ink} strokeWidth="3" />
        </>
      )}
      {mood === 'think' && <circle cx="98" cy="30" r="5" fill="#fff" stroke={ink} strokeWidth="3" />}
      {/* pencil in hand */}
      {mood === 'happy' && (
        <g transform="rotate(-30 92 96)">
          <rect x="86" y="70" width="12" height="36" rx="3" fill="var(--c-pink)" stroke={ink} strokeWidth="3" />
          <path d="M86 106 L 92 118 L 98 106 Z" fill="#FFF3B0" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}
