/** Blotto: a little ink-drop judge with a beret, pencil and a very questionable poker face. */
export type MascotMood = 'happy' | 'judge' | 'sus' | 'imposter' | 'think' | 'wow';
export function Mascot({ mood = 'happy', size = 96, className = '', float, bob }: { mood?: MascotMood; size?: number; className?: string; float?: boolean; bob?: boolean }) {
  return <svg className={`mascot ${float ? 'mascot--float' : ''} ${bob ? 'mascot--bob' : ''} ${className}`} style={{ ['--mascot-size' as any]: `${size}px` }} viewBox="0 0 140 140" role="img" aria-label={`Blotto, the Sketchy ${mood === 'judge' ? 'judge' : 'mascot'}`} stroke="var(--c-ink)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="67" cy="129" rx="43" ry="6" fill="var(--c-ink)" opacity=".12" stroke="none"/>
    <path d="M45 112q-12 6-10 15 15 6 23-7m22-8q12 6 10 15-15 6-23-7" fill="var(--c-orange)"/>
    <path d="M30 76q-15-6-19 5-3 12 17 13m78-19q15-6 19 5 3 12-17 13" fill="var(--c-yellow)"/>
    <path d="M66 23C99 23 115 50 112 79q-3 42-45 43Q24 122 22 80C20 51 35 23 66 23Z" fill="var(--c-yellow)"/>
    <path d="M37 39q-6 6-8 16" stroke="var(--c-paper)" strokeWidth="6"/>
    <ellipse cx="66" cy="97" rx="23" ry="16" fill="var(--c-gold-2)" stroke="none"/>
    <path d="M33 28q4-18 30-18 25-1 37 17l-7 7-57 2Z" fill="var(--c-purple)"/>
    <path d="M64 10 69 4m-29 26 51-3"/>
    <g fill="var(--c-pink)" stroke="none"><ellipse cx="38" cy="80" rx="7" ry="4"/><ellipse cx="96" cy="80" rx="7" ry="4"/></g>
    {mood === 'imposter' ? <><path d="M31 58q35-11 71 0v17q-36 11-71 0Z" fill="var(--c-ink)"/><ellipse cx="51" cy="66" rx="8" ry="6" fill="var(--c-paper)" stroke="none"/><ellipse cx="82" cy="66" rx="8" ry="6" fill="var(--c-paper)" stroke="none"/></> : null}
    <ellipse cx="51" cy="66" rx="4" ry="6" fill="var(--c-ink)" stroke="none"/><ellipse cx="82" cy="66" rx="4" ry="6" fill="var(--c-ink)" stroke="none"/>
    {(mood === 'judge' || mood === 'think') && <g fill="none" strokeWidth="3.5"><circle cx="51" cy="66" r="14"/><circle cx="82" cy="66" r="14"/><path d="M65 65h3m-32-3-9-4m70 4 9-4"/></g>}
    {mood === 'happy' ? <path d="M53 87q13 17 27 0Z" fill="var(--c-ink)"/> : mood === 'wow' ? <ellipse cx="66" cy="91" rx="7" ry="9" fill="var(--c-ink)"/> : mood === 'sus' ? <path d="m55 91 22-3M45 53l11 2m20-2 11-3"/> : mood === 'imposter' ? <path d="M55 94q16 2 23-10"/> : <path d="M56 90q10 7 21 0"/>}
    {mood === 'sus' && <path d="M113 40q13 17 3 19t-3-19Z" fill="var(--c-blue)" strokeWidth="3"/>}
    {mood === 'think' && <><circle cx="114" cy="31" r="4" fill="var(--c-paper)" strokeWidth="2"/><circle cx="126" cy="19" r="7" fill="var(--c-paper)" strokeWidth="2"/></>}
    {mood === 'happy' && <g transform="rotate(22 116 90)" strokeWidth="3"><path d="M111 53h11v51h-11Z" fill="var(--c-pink)"/><path d="m111 104 5.5 13 5.5-13Z" fill="var(--c-gold-2)"/><path d="M111 63h11"/><path d="M108 85q15-7 17 4-1 8-17 6" fill="var(--c-yellow)"/></g>}
  </svg>;
}
