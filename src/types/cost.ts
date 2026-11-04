// Domain model for the Axians PAYG cost dashboard.

export type CostBucket = 'powerPlatform' | 'aiFoundry';

export interface CostLineItem {
  id: string;
  bucket: CostBucket;
  /** Cost Management MeterCategory, e.g. "AI Builder", "Azure OpenAI". */
  category: string;
  /** Meter / model name, e.g. "GPT-4o", "AI Builder Credits". */
  name: string;
  /** Cost for the reference month, in the snapshot currency. */
  cost: number;
  quantity?: number;
  unit?: string;
}

export interface MonthlyPoint {
  /** 'YYYY-MM' */
  month: string;
  /** Localized short label, e.g. "Lug 2026". */
  label: string;
  powerPlatform: number;
  aiFoundry: number;
  total: number;
}

export interface DailyPoint {
  /** 'YYYY-MM-DD' */
  date: string;
  day: number;
  powerPlatform: number;
  aiFoundry: number;
  total: number;
  /** Running total from the 1st of the month. */
  cumulative: number;
}

export interface WeeklyPoint {
  /** ISO week number (1-53). */
  week: number;
  /** Localized label with the day range, e.g. "6–12 lug". */
  label: string;
  /** First day of the week within the month ('YYYY-MM-DD'). */
  start: string;
  /** Last day of the week within the month ('YYYY-MM-DD'). */
  end: string;
  powerPlatform: number;
  aiFoundry: number;
  total: number;
}

export interface BucketTotals {
  total: number;
  powerPlatform: number;
  aiFoundry: number;
}

export interface CostSnapshot {
  /** Reference period: a month ('YYYY-MM') or a whole year ('YYYY-all'). */
  month: string;
  currency: string;
  totals: BucketTotals;
  /** Same figures for the previous month (for deltas). */
  previous: BucketTotals;
  /** Spend from the 1st of January of the reference year up to the reference month. */
  yearToDate: BucketTotals;
  lineItems: CostLineItem[];
  /** Trailing months ending at the reference month. */
  trend: MonthlyPoint[];
  /** Daily cumulative spend within the reference month. */
  daily: DailyPoint[];
  lastUpdated: string;
  /** True when data comes from the mock provider (no live connector). */
  isMock: boolean;
}
