import { lazy, Suspense } from 'react';
import { Landing } from '@/screens/Landing';
import { ToastProvider, ScoreBurstLayer } from '@/design/components';
import { Loading } from '@/shell/Loading';
import { ErrorBoundary } from '@/shell/ErrorBoundary';
import { usePath } from '@/nav';

// Game screens load on demand so the landing page (the first thing a judge sees) ships only what it needs.
const HostScreen = lazy(() => import('@/screens/host/HostScreen').then((m) => ({ default: m.HostScreen })));
const PlayScreen = lazy(() => import('@/screens/play/PlayScreen').then((m) => ({ default: m.PlayScreen })));
const Demo = lazy(() => import('@/screens/Demo').then((m) => ({ default: m.Demo })));
const Studio = lazy(() => import('@/screens/Studio').then((m) => ({ default: m.Studio })));
const Cover = lazy(() => import('@/screens/Cover').then((m) => ({ default: m.Cover })));
// Warm the game chunks once the landing is up, so tapping Play doesn't wait on the network.
if (typeof window !== 'undefined') setTimeout(() => { import('@/screens/play/PlayScreen'); import('@/screens/Demo'); import('@/screens/host/HostScreen'); }, 1500);

/** One URL, five routes: / landing, /host main screen, /play phone, /demo solo, /studio hidden tool. */
export default function App() {
  const full = usePath();
  const path = full.split('?')[0].replace(/\/+$/, '') || '/';
  // Keyed by path so each screen mounts fresh on navigation; screens rewriting their own ?code= don't remount.
  const screen = path === '/host' ? <HostScreen /> : path === '/play' ? <PlayScreen /> : path === '/demo' ? <Demo /> : path === '/daily' ? <Demo daily /> : path === '/studio' ? <Studio /> : path === '/cover' ? <Cover /> : <Landing />;
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ScoreBurstLayer><div key={path} className="route"><Suspense fallback={<Loading label="Loading…" />}>{screen}</Suspense></div></ScoreBurstLayer>
      </ToastProvider>
    </ErrorBoundary>
  );
}
