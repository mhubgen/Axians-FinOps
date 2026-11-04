// Deterministic, realistic sample data so the dashboard renders before the
// live Azure Cost Management connector is wired in.

import type {
  CostLineItem,
  CostSnapshot,
  DailyPoint,
  MonthlyPoint,
} from '../types/cost';
import { monthLabel } from '../lib/format';
import { isYearSelection, monthsForYear, selectionYear } from '../lib/period';

// Simple seeded PRNG so figures stay stable for a given month.
function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function seedFromMonth(month: string): number {
  return [...month].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

interface MeterTemplate {
  category: string;
  name: string;
  unit: string;
  base: number; // baseline monthly cost in EUR
  qtyPerEur: number;
}

const POWER_PLATFORM_METERS: MeterTemplate[] = [
  { category: 'AI Builder', name: 'AI Builder Credits', unit: 'crediti', base: 420, qtyPerEur: 100 },
  { category: 'Copilot Studio', name: 'Copilot Studio Messages', unit: 'messaggi', base: 260, qtyPerEur: 40 },
  { category: 'Copilot Studio', name: 'Copilot Studio Messages (overage)', unit: 'messaggi', base: 95, qtyPerEur: 40 },
  { category: 'AI Builder', name: 'AI Builder Document Processing', unit: 'pagine', base: 70, qtyPerEur: 12 },
];

const AI_FOUNDRY_METERS: MeterTemplate[] = [
  { category: 'Azure OpenAI', name: 'GPT-4o', unit: '1K token', base: 610, qtyPerEur: 180 },
  { category: 'Azure OpenAI', name: 'GPT-4o mini', unit: '1K token', base: 180, qtyPerEur: 900 },
  { category: 'Azure OpenAI', name: 'o3-mini', unit: '1K token', base: 240, qtyPerEur: 260 },
  { category: 'Azure OpenAI', name: 'text-embedding-3-large', unit: '1K token', base: 85, qtyPerEur: 1500 },
  { category: 'Azure AI Foundry', name: 'DALL-E 3', unit: 'immagini', base: 60, qtyPerEur: 25 },
];

function monthsBack(month: string, n: number): string[] {
  const [y, m] = month.split('-').map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

function factorFor(month: string): number {
  // Gentle month-over-month growth trend with mild noise.
  const rnd = seeded(seedFromMonth(month));
  return 0.82 + rnd() * 0.5; // 0.82 .. 1.32
}

function bucketTotals(month: string, meters: MeterTemplate[]): { items: CostLineItem[]; total: number } {
  const f = factorFor(month);
  const rnd = seeded(seedFromMonth(month) + meters.length);
  const items = meters.map((t) => {
    const cost = +(t.base * f * (0.85 + rnd() * 0.3)).toFixed(2);
    return {
      id: `${month}-${t.name}`,
      bucket: meters === POWER_PLATFORM_METERS ? 'powerPlatform' : 'aiFoundry',
      category: t.category,
      name: t.name,
      cost,
      quantity: Math.round(cost * t.qtyPerEur),
      unit: t.unit,
    } as CostLineItem;
  });
  const total = +items.reduce((a, b) => a + b.cost, 0).toFixed(2);
  return { items, total };
}

function monthlyPoint(month: string): MonthlyPoint {
  const pp = bucketTotals(month, POWER_PLATFORM_METERS).total;
  const af = bucketTotals(month, AI_FOUNDRY_METERS).total;
  return {
    month,
    label: monthLabel(month),
    powerPlatform: pp,
    aiFoundry: af,
    total: +(pp + af).toFixed(2),
  };
}

/** Sum of monthly totals from January of the reference year up to `month`. */
function yearToDateTotals(month: string): { total: number; powerPlatform: number; aiFoundry: number } {
  const [y, m] = month.split('-').map(Number);
  let pp = 0;
  let af = 0;
  for (let mm = 1; mm <= m; mm++) {
    const key = `${y}-${String(mm).padStart(2, '0')}`;
    const p = monthlyPoint(key);
    pp += p.powerPlatform;
    af += p.aiFoundry;
  }
  return {
    total: +(pp + af).toFixed(2),
    powerPlatform: +pp.toFixed(2),
    aiFoundry: +af.toFixed(2),
  };
}

function buildDaily(month: string, ppTotal: number, afTotal: number): DailyPoint[] {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const now = new Date();
  const isCurrent = now.getUTCFullYear() === y && now.getUTCMonth() + 1 === m;
  const lastDay = isCurrent ? now.getUTCDate() : daysInMonth;

  const rnd = seeded(seedFromMonth(month) + 7);
  const weights = Array.from({ length: lastDay }, () => 0.5 + rnd());
  const wSum = weights.reduce((a, b) => a + b, 0);

  let cumulative = 0;
  const points: DailyPoint[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const share = weights[d - 1] / wSum;
    const pp = +(ppTotal * share).toFixed(2);
    const af = +(afTotal * share).toFixed(2);
    const total = +(pp + af).toFixed(2);
    cumulative = +(cumulative + total).toFixed(2);
    points.push({
      date: `${month}-${String(d).padStart(2, '0')}`,
      day: d,
      powerPlatform: pp,
      aiFoundry: af,
      total,
      cumulative,
    });
  }
  return points;
}

function buildMockYearSnapshot(selection: string): CostSnapshot {
  const year = selectionYear(selection);
  const months = monthsForYear(year);
  const trend = months.map(monthlyPoint);
  const previousYear = String(Number(year) - 1);
  const previousPoints = months.map((value) => monthlyPoint(`${previousYear}-${value.slice(5)}`));
  const byItem = new Map<string, CostLineItem>();

  for (const value of months) {
    const monthItems = [
      ...bucketTotals(value, POWER_PLATFORM_METERS).items,
      ...bucketTotals(value, AI_FOUNDRY_METERS).items,
    ];
    for (const item of monthItems) {
      const key = `${item.bucket}|${item.category}|${item.name}`;
      const existing = byItem.get(key);
      if (existing) {
        existing.cost += item.cost;
        existing.quantity = (existing.quantity ?? 0) + (item.quantity ?? 0);
      } else {
        byItem.set(key, { ...item, id: `${selection}-${key}` });
      }
    }
  }

  const totalPoints = (points: MonthlyPoint[]) => points.reduce(
    (totals, point) => ({
      total: totals.total + point.total,
      powerPlatform: totals.powerPlatform + point.powerPlatform,
      aiFoundry: totals.aiFoundry + point.aiFoundry,
    }),
    { total: 0, powerPlatform: 0, aiFoundry: 0 },
  );
  const totals = totalPoints(trend);

  return {
    month: selection,
    currency: 'EUR',
    totals,
    previous: totalPoints(previousPoints),
    yearToDate: totals,
    lineItems: [...byItem.values()].sort((a, b) => b.cost - a.cost),
    trend,
    daily: [],
    lastUpdated: new Date().toISOString(),
    isMock: true,
  };
}

export function buildMockSnapshot(month: string): CostSnapshot {
  if (isYearSelection(month)) return buildMockYearSnapshot(month);

  const pp = bucketTotals(month, POWER_PLATFORM_METERS);
  const af = bucketTotals(month, AI_FOUNDRY_METERS);
  const lineItems = [...pp.items, ...af.items].sort((a, b) => b.cost - a.cost);

  const prevMonth = monthsBack(month, 2)[0];
  const prev = monthlyPoint(prevMonth);

  const trend = monthsBack(month, 6).map(monthlyPoint);
  const daily = buildDaily(month, pp.total, af.total);

  return {
    month,
    currency: 'EUR',
    totals: {
      total: +(pp.total + af.total).toFixed(2),
      powerPlatform: pp.total,
      aiFoundry: af.total,
    },
    previous: {
      total: prev.total,
      powerPlatform: prev.powerPlatform,
      aiFoundry: prev.aiFoundry,
    },
    yearToDate: yearToDateTotals(month),
    lineItems,
    trend,
    daily,
    lastUpdated: new Date().toISOString(),
    isMock: true,
  };
}
