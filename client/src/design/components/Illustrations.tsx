/** Ink-drawn characters keep the same face on every device. Legacy avatar IDs remain wire-compatible. */
const ids = ['🦊', '🐸', '🦄', '🐙', '🐼', '🦁', '🐧', '🐲'];
export function AvatarArt({ avatar, className = '' }: { avatar: string; className?: string }) {
  const i = Math.max(0, ids.indexOf(avatar));
  return <svg viewBox="0 0 64 64" className={`avatar-art ${className}`} aria-hidden="true" fill="none" stroke="var(--c-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {i === 0 && <><path d="M12 28 9 9 27 21M52 28 55 9 37 21" fill="var(--c-orange)"/><path d="M10 29Q32 13 54 29L47 48 32 56 17 48Z" fill="var(--c-orange)"/><path d="M12 34 32 48 52 34 46 49 32 56 18 49Z" fill="var(--c-paper)"/></>}
    {i === 1 && <><circle cx="19" cy="20" r="11" fill="var(--c-lime)"/><circle cx="45" cy="20" r="11" fill="var(--c-lime)"/><ellipse cx="32" cy="38" rx="25" ry="19" fill="var(--c-lime)"/></>}
    {i === 2 && <><path d="M16 27 13 11 28 23M47 27 51 11 37 23" fill="var(--c-purple)"/><path d="m27 22 5-18 7 19" fill="var(--c-yellow)"/><path d="M14 30Q32 12 50 30L47 48Q32 64 17 48Z" fill="var(--c-paper)"/><path d="M14 30Q8 43 15 52" stroke="var(--c-purple)" strokeWidth="7"/></>}
    {i === 3 && <><path d="M12 39V29a20 20 0 0 1 40 0v10q9 15 0 15-5 0-7-7-2 14-8 7l-5-9-5 9q-6 7-8-7-2 7-7 7-9 0 0-15Z" fill="var(--c-pink)"/></>}
    {i === 4 && <><circle cx="14" cy="18" r="10" fill="var(--c-ink)"/><circle cx="50" cy="18" r="10" fill="var(--c-ink)"/><ellipse cx="32" cy="35" rx="25" ry="22" fill="var(--c-paper)"/><ellipse cx="21" cy="32" rx="8" ry="10" fill="var(--c-ink)"/><ellipse cx="43" cy="32" rx="8" ry="10" fill="var(--c-ink)"/></>}
    {i === 5 && <><path d="M32 4 41 10 52 9 55 22 61 32 54 42 52 54 40 55 32 61 23 55 11 54 9 42 3 32 9 22 11 9 23 10Z" fill="var(--c-orange)"/><ellipse cx="32" cy="33" rx="20" ry="22" fill="var(--c-yellow)"/></>}
    {i === 6 && <><ellipse cx="32" cy="34" rx="23" ry="27" fill="var(--c-ink)"/><path d="M32 24q-17-17-17 15 0 19 17 19t17-19q0-32-17-15Z" fill="var(--c-paper)"/><path d="m26 36 6 7 6-7Z" fill="var(--c-orange)"/></>}
    {i === 7 && <><path d="M17 23 13 8 27 18M47 23 51 8 37 18" fill="var(--c-purple)"/><path d="m25 21 7-14 7 14" fill="var(--c-purple)"/><path d="M10 29Q32 13 54 29L50 48Q32 63 14 48Z" fill="var(--c-lime)"/><path d="M20 46 25 52 29 46M36 46 40 52 44 46" fill="var(--c-paper)"/></>}
    <g stroke="none" fill={i === 4 ? 'var(--c-paper)' : 'var(--c-ink)'}><ellipse cx="22" cy={i === 1 ? 21 : 31} rx="3" ry="4"/><ellipse cx="42" cy={i === 1 ? 21 : 31} rx="3" ry="4"/></g>
    {i !== 6 && <path d="M25 42q7 8 14 0"/>}
    <g stroke="none" fill="var(--c-pink)"><ellipse cx="15" cy="39" rx="4" ry="2"/><ellipse cx="49" cy="39" rx="4" ry="2"/></g>
  </svg>;
}
export function SoundIcon({ muted }: { muted: boolean }) {
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z"/>{muted ? <path d="m17 9 5 6m0-6-5 6"/> : <><path d="M17 8q4 4 0 8M20 5q6 7 0 14"/></>}</svg>;
}
export function AwardArt({ kind }: { kind: 'mask' | 'cup' | 'oops' | 'flame' }) {
  return <svg className={`award-art award-art--${kind}`} viewBox="0 0 48 48" fill="var(--c-yellow)" stroke="var(--c-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'mask' ? <><path d="M5 15q19-12 38 0v13Q24 44 5 28Z" fill="var(--c-purple)"/><path d="M12 21q5-6 10 0m4 0q5-6 10 0M19 30q5 4 10 0"/></> : kind === 'cup' ? <><path d="M14 8h20v12q0 11-10 11T14 20ZM14 12H6q0 16 11 12M34 12h8q0 16-11 12M24 31v8m-9 3h18"/></> : kind === 'flame' ? <path d="M24 3q0 12 10 18l4-7q12 23-8 29C8 49 3 28 15 17l1 10q10-13 8-24Z" fill="var(--c-orange)"/> : <><circle cx="24" cy="25" r="18" fill="var(--c-blue)"/><path d="m12 22 8 2m8 0 8-2M18 34q6-6 12 0"/><path d="M36 4q11 13 3 13T36 4Z" fill="var(--c-paper)"/></>}
  </svg>;
}

export function StatusIcon({ kind }: { kind: 'check' | 'star' | 'plus' | 'arrow' | 'info' }) {
  const paths = { check: 'm5 12 4 4L19 6', star: 'm12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z', plus: 'M12 5v14M5 12h14', arrow: 'M5 19 19 5M9 5h10v10', info: 'M12 11v6M12 7h.01' };
  return <svg className="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}
