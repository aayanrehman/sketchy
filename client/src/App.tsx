import { Landing } from '@/screens/Landing';
import { HostScreen } from '@/screens/host/HostScreen';
import { PlayScreen } from '@/screens/play/PlayScreen';
import { Demo } from '@/screens/Demo';
import { Studio } from '@/screens/Studio';
import { ToastProvider, ScoreBurstLayer } from '@/design/components';
import { Cover } from '@/screens/Cover';
import { ErrorBoundary } from '@/shell/ErrorBoundary';

/** One URL, five routes: / landing, /host main screen, /play phone, /demo solo, /studio hidden tool. */
export default function App() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const screen = path === '/host' ? <HostScreen /> : path === '/play' ? <PlayScreen /> : path === '/demo' ? <Demo /> : path === '/studio' ? <Studio /> : path === '/cover' ? <Cover /> : <Landing />;
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ScoreBurstLayer>{screen}</ScoreBurstLayer>
      </ToastProvider>
    </ErrorBoundary>
  );
}
