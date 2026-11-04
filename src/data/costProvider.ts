// Data provider abstraction. The UI depends only on this interface, so the
// underlying source (mock data now, live Azure Cost Management connector later)
// can be swapped without touching components.

import type { CostSnapshot, DailyPoint } from '../types/cost';
import { buildMockSnapshot } from './mockData';

export interface CostDataProvider {
  /** Available months to browse, newest first ('YYYY-MM'). */
  listMonths(): string[];
  /** Cost snapshot for the given reference month. */
  getSnapshot(month: string): Promise<CostSnapshot>;
  /** Daily costs for the weekly drill-down of a single month. */
  getDaily(month: string): Promise<DailyPoint[]>;
  /** Clears a cached snapshot when its refresh cooldown has elapsed. */
  invalidate?(month: string): void;
}

/** Last `count` months including the current one, newest first. */
export function recentMonths(count = 12): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export class MockCostProvider implements CostDataProvider {
  listMonths(): string[] {
    return recentMonths(12);
  }

  async getSnapshot(month: string): Promise<CostSnapshot> {
    // Small delay to exercise loading states realistically.
    await new Promise((r) => setTimeout(r, 350));
    return buildMockSnapshot(month);
  }

  async getDaily(month: string): Promise<DailyPoint[]> {
    return buildMockSnapshot(month).daily;
  }
}
