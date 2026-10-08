import { useEffect, useState } from 'react';

/**
 * "Add to home screen" support. Chrome/Android hands us a deferred prompt; iOS Safari has no API,
 * so we show a one-line hint there. Shown only after the player has finished at least one game,
 * and dismissable for good.
 */
export function useInstall() {
  const [deferred, setDeferred] = useState<any>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('sketchy.installHidden') === '1'; } catch { return false; } });
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const ua = navigator.userAgent;
    setIos(/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua));
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  const dismiss = () => { setHidden(true); try { localStorage.setItem('sketchy.installHidden', '1'); } catch { /* ignore */ } };
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const r = await deferred.userChoice.catch(() => null);
    if (r?.outcome === 'accepted') dismiss();
    setDeferred(null);
  };
  return { canInstall: !!deferred && !standalone && !hidden, iosHint: ios && !standalone && !hidden && !deferred, install, dismiss };
}
