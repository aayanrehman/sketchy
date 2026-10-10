/** Identity without login: one random id per device, plus the crew this device belongs to. */
const DEVICE = 'sketchy.device'; const CREW = 'sketchy.crew';
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE);
    if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem(DEVICE, id); }
    return id;
  } catch { return 'anon'; }
}
export function crewCode(): string | null { try { return localStorage.getItem(CREW); } catch { return null; } }
export function saveCrew(code: string | null) { try { if (code) localStorage.setItem(CREW, code); else localStorage.removeItem(CREW); } catch { /* ignore */ } }
/** The last 7 UTC day keys, newest first (the server totals these for the crew board). */
export function lastDays(n = 7, now = Date.now()) { return Array.from({ length: n }, (_, i) => new Date(now - i * 86_400_000).toISOString().slice(0, 10)); }
export const challengeLink = (id: string) => `${location.origin}/daily?c=${id}`;
export const crewLink = (code: string) => `${location.origin}/?crew=${code}`;
