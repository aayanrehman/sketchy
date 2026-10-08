import { Mascot, Scenery } from '@/design/components';

/** The calm in-between screen: Sketchy, one line, three soft dots. */
export function Loading({ label }: { label: string }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <Scenery lively />
      <div className="loading__in">
        <Mascot mood="think" size={110} float />
        <p>{label}</p>
        <div className="loading__dots" aria-hidden><i /><i /><i /></div>
      </div>
    </div>
  );
}
