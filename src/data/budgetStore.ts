// Budget persistence abstraction. The UI depends only on this interface, so the
// storage backend can be swapped without touching components — same pattern used
// by the cost data provider.
//
// Active backend: Dataverse (shared across users), table `mzaxians_annualbudget`
// in environment b77ce512-615d-ec27-a2b1-f8cc441af254. Falls back to
// localStorage when the Power Apps data runtime is unavailable (e.g. plain
// `npm run dev` outside the Power Apps host).

import { Mzaxians_annualbudgetsService as BudgetsService } from '../generated/services/Mzaxians_annualbudgetsService';
import type { Mzaxians_annualbudgetsBase } from '../generated/models/Mzaxians_annualbudgetsModel';

export interface BudgetStore {
  /** Annual budget for the given year, or null when not set. */
  getBudget(year: number): Promise<number | null>;
  /** Persist the annual budget for the given year. */
  setBudget(year: number, amount: number): Promise<void>;
}

const STORAGE_PREFIX = 'ax-annual-budget:';

/** Browser-local implementation. Per-device, not shared across users. */
export class LocalStorageBudgetStore implements BudgetStore {
  async getBudget(year: number): Promise<number | null> {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${year}`);
      if (raw == null) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }

  async setBudget(year: number, amount: number): Promise<void> {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${year}`, String(amount));
    } catch {
      // Storage unavailable (private mode / quota) — silently ignore.
    }
  }
}

type BudgetCreate = Omit<Mzaxians_annualbudgetsBase, 'mzaxians_annualbudgetid'>;

/**
 * Dataverse-backed implementation. Reads/writes the `mzaxians_annualbudget`
 * table (one row per year). Mirrors writes to localStorage and falls back to it
 * when the Dataverse runtime is not reachable, so the app never breaks.
 */
export class DataverseBudgetStore implements BudgetStore {
  private readonly fallback = new LocalStorageBudgetStore();

  async getBudget(year: number): Promise<number | null> {
    try {
      const res = await BudgetsService.getAll({
        filter: `mzaxians_year eq ${year}`,
        select: ['mzaxians_year', 'mzaxians_totalamount'],
        top: 1,
      });
      if (res.success && res.data && res.data.length > 0) {
        const amount = res.data[0].mzaxians_totalamount;
        const value = typeof amount === 'number' ? amount : null;
        if (value != null) void this.fallback.setBudget(year, value);
        return value;
      }
      return null;
    } catch {
      return this.fallback.getBudget(year);
    }
  }

  async setBudget(year: number, amount: number): Promise<void> {
    try {
      const res = await BudgetsService.getAll({
        filter: `mzaxians_year eq ${year}`,
        select: ['mzaxians_annualbudgetid'],
        top: 1,
      });
      if (res.success && res.data && res.data.length > 0) {
        await BudgetsService.update(res.data[0].mzaxians_annualbudgetid, {
          mzaxians_totalamount: amount,
        });
      } else {
        const record = {
          mzaxians_budgetname: `Budget ${year}`,
          mzaxians_year: year,
          mzaxians_totalamount: amount,
        } as unknown as BudgetCreate;
        await BudgetsService.create(record);
      }
      void this.fallback.setBudget(year, amount);
    } catch (err) {
      // Persist locally so the value is not lost, then surface the failure.
      await this.fallback.setBudget(year, amount);
      throw err;
    }
  }
}

let store: BudgetStore | null = null;

/** Returns the active budget store (singleton). */
export function getBudgetStore(): BudgetStore {
  if (!store) {
    store = new DataverseBudgetStore();
  }
  return store;
}
