import fs from 'node:fs';
import path from 'node:path';
import { MEDIA_DIR } from './media';

/** Deployment-wide reservations survive restart on the same persistent volume.
 * Dollar amounts are estimates. Use a provider-side key credit cap for a billing limit.
 */
export class AiBudget {
  private active = { image: 0, judge: 0 };
  constructor(private file: string, private jobLimit = 48, private concurrency = 8) {}
  acquire(kind: 'image' | 'judge'): (() => void) | null {
    if (this.active[kind] >= this.concurrency) return null;
    const day = new Date().toISOString().slice(0, 10);
    let ledger: { day: string; image: number; judge: number };
    try {
      ledger = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : { day, image: 0, judge: 0 };
      if (ledger.day !== day) ledger = { day, image: 0, judge: 0 };
      if (!Number.isFinite(ledger[kind]) || ledger[kind] >= this.jobLimit || this.jobLimit <= 0) return null;
      ledger[kind]++;
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(`${this.file}.tmp`, JSON.stringify(ledger), { mode: 0o600 });
      fs.renameSync(`${this.file}.tmp`, this.file);
    } catch { return null; } // Fail closed when the spending ledger is unavailable.
    this.active[kind]++;
    let released = false;
    return () => { if (!released) { released = true; this.active[kind]--; } };
  }
}
export const aiBudget = new AiBudget(
  process.env.AI_BUDGET_FILE || path.join(MEDIA_DIR, '../ai-budget.json'),
  Number(process.env.AI_DAILY_JOB_LIMIT || 48), Number(process.env.AI_CONCURRENCY || 8),
);
