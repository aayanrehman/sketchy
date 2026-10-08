import { Landing } from '@/screens/Landing';
import { HostScreen } from '@/screens/host/HostScreen';
import { PlayScreen } from '@/screens/play/PlayScreen';
import { Demo } from '@/screens/Demo';
import { Studio } from '@/screens/Studio';
import { ToastProvider, ScoreBurstLayer } from '@/design/components';
import { Cover } from '@/screens/Cover';
import { ErrorBoundary } from '@/shell/ErrorBoundary';
import { usePath } from '@/nav';

/** One URL, five routes: / landing, /host main screen, /play phone, /demo solo, /studio hidden tool. */
export default function App() {
  const full = usePath();
  const path = full.split('?')[0].replace(/\/+$/, '') || '/';
  // Keyed by path so each screen mounts fresh on navigation; screens rewriting their own ?code= don't remount.
  const screen = path === '/host' ? <HostScreen /> : path === '/play' ? <PlayScreen /> : path === '/demo' ? <Demo /> : path === '/daily' ? <Demo daily /> : path === '/studio' ? <Studio /> : path === '/cover' ? <Cover /> : <Landing />;
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ScoreBurstLayer><div key={path} className="route">{screen}</div></ScoreBurstLayer>
      </ToastProvider>
    </ErrorBoundary>
  );
}
