import type { CostSnapshot, DailyPoint } from '../types/cost';
import type { CostDataProvider } from './costProvider';
import { currentMonth } from './costProvider';
import { isYearSelection, selectionYear } from '../lib/period';

const CURRENT_TTL_MS = 4 * 60 * 60 * 1000;
const HISTORICAL_TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'axians-cost-snapshot:v1:';
const DAILY_STORAGE_PREFIX = 'axians-cost-daily:v1:';

interface CacheEntry {
  cachedAt: number;
  snapshot: CostSnapshot;
}

interface DailyCacheEntry {
  cachedAt: number;
  points: DailyPoint[];
}

function ttlFor(period: string): number {
  const current = currentMonth();
  const currentPeriod = period === current || (
    isYearSelection(period) && selectionYear(period) === selectionYear(current)
  );
  return currentPeriod ? CURRENT_TTL_MS : HISTORICAL_TTL_MS;
}

function storageKey(period: string): string {
  return `${STORAGE_PREFIX}${period}`;
}

function readStored(period: string): CacheEntry | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(storageKey(period));
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as CacheEntry;
    if (
      typeof entry.cachedAt !== 'number' ||
      entry.snapshot?.month !== period
    ) return undefined;
    return entry;
  } catch {
    return undefined;
  }
}

function writeStored(period: string, entry: CacheEntry): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(period), JSON.stringify(entry));
  } catch {
    // Memory caching still works when browser storage is unavailable or full.
  }
}

function removeStored(period: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(period));
  } catch {
    // Ignore storage access restrictions.
  }
}

function readDailyStored(month: string): DailyCacheEntry | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(`${DAILY_STORAGE_PREFIX}${month}`);
    return raw ? JSON.parse(raw) as DailyCacheEntry : undefined;
  } catch {
    return undefined;
  }
}

function writeDailyStored(month: string, entry: DailyCacheEntry): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${DAILY_STORAGE_PREFIX}${month}`, JSON.stringify(entry));
  } catch {
    // Memory caching still works when browser storage is unavailable or full.
  }
}

export function createCachedCostProvider(source: CostDataProvider): CostDataProvider {
  const cache = new Map<string, CacheEntry>();
  const inFlight = new Map<string, Promise<CostSnapshot>>();
  const dailyCache = new Map<string, DailyCacheEntry>();
  const dailyInFlight = new Map<string, Promise<DailyPoint[]>>();

  const getEntry = (period: string): CacheEntry | undefined => {
    const entry = cache.get(period) ?? readStored(period);
    if (entry) cache.set(period, entry);
    return entry;
  };

  return {
    listMonths: () => source.listMonths(),

    async getSnapshot(period: string): Promise<CostSnapshot> {
      const cached = getEntry(period);
      if (cached && Date.now() - cached.cachedAt < ttlFor(period)) {
        return cached.snapshot;
      }

      const pending = inFlight.get(period);
      if (pending) return pending;

      const request = source.getSnapshot(period)
        .then((snapshot) => {
          const entry = { cachedAt: Date.now(), snapshot };
          cache.set(period, entry);
          writeStored(period, entry);
          return snapshot;
        })
        .catch((error: unknown) => {
          if (cached && /429|too many requests/i.test(String(error))) {
            return cached.snapshot;
          }
          throw error;
        })
        .finally(() => inFlight.delete(period));

      inFlight.set(period, request);
      return request;
    },

    async getDaily(month: string): Promise<DailyPoint[]> {
      const cached = dailyCache.get(month) ?? readDailyStored(month);
      if (cached && Date.now() - cached.cachedAt < ttlFor(month)) {
        dailyCache.set(month, cached);
        return cached.points;
      }

      const pending = dailyInFlight.get(month);
      if (pending) return pending;

      const request = source.getDaily(month)
        .then((points) => {
          const entry = { cachedAt: Date.now(), points };
          dailyCache.set(month, entry);
          writeDailyStored(month, entry);
          return points;
        })
        .catch((error: unknown) => {
          if (cached && /429|too many requests/i.test(String(error))) {
            return cached.points;
          }
          throw error;
        })
        .finally(() => dailyInFlight.delete(month));

      dailyInFlight.set(month, request);
      return request;
    },

    invalidate(period: string): void {
      const cached = getEntry(period);
      if (cached && Date.now() - cached.cachedAt < CURRENT_TTL_MS) return;
      cache.delete(period);
      removeStored(period);
      dailyCache.delete(period);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`${DAILY_STORAGE_PREFIX}${period}`);
      }
      source.invalidate?.(period);
    },
  };
}