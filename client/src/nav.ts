import { useSyncExternalStore } from 'react';

/** In-app navigation: no page reload, so the music (and audio unlock) carry across screens. */
export function go(to: string) {
  if (to === location.pathname + location.search) return;
  history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}
export function usePath() {
  return useSyncExternalStore((l) => { window.addEventListener('popstate', l); return () => window.removeEventListener('popstate', l); }, () => location.pathname + location.search);
}
/** Same-origin <a href="/..."> clicks become in-app navigation. */
export function interceptLinks() {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    e.preventDefault(); go(url.pathname + url.search);
  });
}
