import type { CostQueryBody } from './costQueries';

const WINDOW_BUFFER_MS = 250;
const REQUEST_LIMIT = 4;
const REQUEST_WINDOW_MS = 60_000;
const QPU_WINDOWS = [
  { limit: 12, durationMs: 10_000 },
  { limit: 60, durationMs: 60_000 },
  { limit: 600, durationMs: 60 * 60_000 },
] as const;
const MAX_WINDOW_MS = Math.max(...QPU_WINDOWS.map((window) => window.durationMs));

interface Charge {
  at: number;
  qpu: number;
}

function monthsInRange(body: CostQueryBody): number {
  if (!body.timePeriod) return 1;
  const from = new Date(body.timePeriod.from);
  const to = new Date(body.timePeriod.to);
  const months = (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    to.getUTCMonth() - from.getUTCMonth() + 1
  );
  return Math.min(Math.max(months, 1), 12);
}

export class CostQueryThrottle {
  private charges: Charge[] = [];
  private queue: Promise<void> = Promise.resolve();

  schedule(body: CostQueryBody): Promise<void> {
    const task = this.queue.then(() => this.reserve(monthsInRange(body)));
    this.queue = task.catch(() => undefined);
    return task;
  }

  private async reserve(qpu: number): Promise<void> {
    while (true) {
      const now = Date.now();
      this.charges = this.charges.filter((charge) => now - charge.at < MAX_WINDOW_MS);
      let waitMs = 0;

      for (const window of QPU_WINDOWS) {
        const active = this.charges.filter((charge) => now - charge.at < window.durationMs);
        let excess = active.reduce((sum, charge) => sum + charge.qpu, qpu) - window.limit;
        if (excess <= 0) continue;

        for (const charge of active) {
          excess -= charge.qpu;
          if (excess <= 0) {
            waitMs = Math.max(waitMs, charge.at + window.durationMs - now);
            break;
          }
        }
      }

      const recentRequests = this.charges.filter(
        (charge) => now - charge.at < REQUEST_WINDOW_MS,
      );
      if (recentRequests.length >= REQUEST_LIMIT) {
        waitMs = Math.max(
          waitMs,
          recentRequests[recentRequests.length - REQUEST_LIMIT].at + REQUEST_WINDOW_MS - now,
        );
      }

      if (waitMs <= 0) {
        this.charges.push({ at: now, qpu });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, waitMs + WINDOW_BUFFER_MS));
    }
  }
}