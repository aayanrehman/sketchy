import { castOf } from '@shared/cast';

/** The cast portrait for a player (Player.avatar holds the cast id). */
export function AvatarArt({ avatar, className = '' }: { avatar: string; className?: string }) {
  return <img src={`/cast/${castOf(avatar).slug}.webp`} alt="" className={`avatar-art ${className}`} draggable={false} decoding="async" />;
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
