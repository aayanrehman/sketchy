import { Landing } from '@/screens/Landing';
import { HostScreen } from '@/screens/host/HostScreen';
import { PlayScreen } from '@/screens/play/PlayScreen';
import { Demo } from '@/screens/Demo';
import { Studio } from '@/screens/Studio';
import { ToastProvider, ScoreBurstLayer } from '@/design/components';

/** One URL, five routes: / landing, /host main screen, /play phone, /demo solo, /studio hidden tool. */
export default function App() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const screen = path === '/host' ? <HostScreen /> : path === '/play' ? <PlayScreen /> : path === '/demo' ? <Demo /> : path === '/studio' ? <Studio /> : <Landing />;
  return (
    <ToastProvider>
      <ScoreBurstLayer>{screen}</ScoreBurstLayer>
    </ToastProvider>
  );
}
