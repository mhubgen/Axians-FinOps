// Live Azure Cost Management provider.
//
// This is decoupled from the Power Platform connector: it receives a `queryFn`
// that performs the authenticated POST to the Cost Management Query API (and to
// the `nextLink` page URLs). See src/data/index.ts for the wiring and
// connector/azure-cost-management.swagger.json for the connector definition.
//
// Amounts are kept unrounded across the whole snapshot so that the KPI cards,
// the budget, the weekly panel and the charts always add up to the same figure;
// rounding happens once, in the formatters.

import type {
  CostLineItem,
  CostSnapshot,
  DailyPoint,
  MonthlyPoint,
} from '../types/cost';
import type { CostDataProvider } from './costProvider';
import { recentMonths } from './costProvider';
import { monthLabel } from '../lib/format';
import {
  buildAnnualQuery,
  buildDailyQuery,
  monthRange,
  type CostQueryBody,
} from './costQueries';
import { isYearSelection, monthsForYear, selectionYear } from '../lib/period';
import {
  classifyBucket,
  columnIndex,
  type CostQueryResponse,
} from './costMapping';

/** `url` is set when following a `nextLink` page; otherwise the default scope URL is used. */
export type CostQueryFn = (body: CostQueryBody, url?: string) => Promise<CostQueryResponse>;

const TREND_MONTHS = 6;
const MAX_PAGES = 40;

type Row = Array<string | number>;

interface Totals {
  total: number;
  powerPlatform: number;
  aiFoundry: number;
}

function emptyTotals(): Totals {
  return { total: 0, powerPlatform: 0, aiFoundry: 0 };
}

/** Runs a query and follows `nextLink`, so large result sets are never truncated. */
async function queryAll(queryFn: CostQueryFn, body: CostQueryBody): Promise<CostQueryResponse> {
  const first = await queryFn(body);
  const columns = first?.properties?.columns ?? [];
  const rows: Row[] = [...(first?.properties?.rows ?? [])];

  let next = first?.properties?.nextLink;
  for (let page = 0; next && page < MAX_PAGES; page++) {
    const resp = await queryFn(body, next);
    rows.push(...(resp?.properties?.rows ?? []));
    const link = resp?.properties?.nextLink;
    next = link === next ? undefined : link;
  }

  return { properties: { columns, rows } };
}

interface ColumnIndexes {
  cost: number;
  quantity: number;
  date: number;
  service: number;
  category: number;
  subCategory: number;
  meter: number;
  resourceGroup: number;
}

function firstIndex(columns: Array<{ name: string }>, names: string[]): number {
  for (const name of names) {
    const i = columnIndex(columns, name);
    if (i >= 0) return i;
  }
  return -1;
}

function columnIndexes(resp: CostQueryResponse): ColumnIndexes {
  const c = resp.properties.columns;
  return {
    cost: firstIndex(c, ['Cost', 'PreTaxCost', 'CostUSD']),
    quantity: firstIndex(c, ['UsageQuantity', 'Quantity']),
    date: firstIndex(c, ['UsageDate', 'BillingMonth']),
    service: columnIndex(c, 'ServiceName'),
    category: columnIndex(c, 'MeterCategory'),
    subCategory: columnIndex(c, 'MeterSubCategory'),
    meter: columnIndex(c, 'Meter'),
    resourceGroup: firstIndex(c, ['ResourceGroup', 'ResourceGroupName']),
  };
}

function text(row: Row, i: number): string {
  const value = i >= 0 ? row[i] : undefined;
  return value == null ? '' : String(value);
}

function amount(row: Row, i: number): number {
  if (i < 0) return 0;
  const value = Number(row[i]);
  return Number.isFinite(value) ? value : 0;
}

function bucketOf(row: Row, ix: ColumnIndexes) {
  return classifyBucket(text(row, ix.service), text(row, ix.category), text(row, ix.resourceGroup));
}

/** UsageDate comes as the number 20260803; ISO strings are tolerated too. */
function usageDay(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 8 ? Number(digits.slice(6, 8)) : 0;
}

function usageMonth(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 6 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}` : '';
}

function addTo(totals: Totals, bucket: 'powerPlatform' | 'aiFoundry', cost: number): void {
  totals.total += cost;
  if (bucket === 'powerPlatform') totals.powerPlatform += cost;
  else totals.aiFoundry += cost;
}

function parseBreakdown(
  resp: CostQueryResponse,
  month?: string,
): { lineItems: CostLineItem[]; totals: Totals } {
  const ix = columnIndexes(resp);
  const byKey = new Map<string, CostLineItem>();
  const totals = emptyTotals();

  for (const row of resp.properties.rows) {
    if (month && usageMonth(text(row, ix.date)) !== month) continue;
    const bucket = bucketOf(row, ix);
    if (!bucket) continue;

    const cost = amount(row, ix.cost);
    if (cost === 0) continue;

    const service = text(row, ix.service);
    const category = text(row, ix.category) || service;
    const name =
      text(row, ix.meter) || text(row, ix.subCategory) || category || service || 'Non classificato';
    const quantity = ix.quantity >= 0 ? amount(row, ix.quantity) : undefined;

    // The query also groups by resource group, so one meter can span several rows.
    const key = `${bucket}|${category}|${name}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.cost += cost;
      if (quantity != null) existing.quantity = (existing.quantity ?? 0) + quantity;
    } else {
      byKey.set(key, { id: key, bucket, category, name, cost, quantity });
    }

    addTo(totals, bucket, cost);
  }

  return { lineItems: [...byKey.values()].sort((a, b) => b.cost - a.cost), totals };
}

function parseDaily(resp: CostQueryResponse, month: string): DailyPoint[] {
  const ix = columnIndexes(resp);
  const byDay = new Map<number, Totals>();

  for (const row of resp.properties.rows) {
    const bucket = bucketOf(row, ix);
    if (!bucket) continue;
    const day = usageDay(text(row, ix.date));
    if (!day) continue;

    const slot = byDay.get(day) ?? emptyTotals();
    addTo(slot, bucket, amount(row, ix.cost));
    byDay.set(day, slot);
  }

  let cumulative = 0;
  return [...byDay.keys()]
    .sort((a, b) => a - b)
    .map((day) => {
      const slot = byDay.get(day)!;
      cumulative += slot.total;
      return {
        date: `${month}-${String(day).padStart(2, '0')}`,
        day,
        powerPlatform: slot.powerPlatform,
        aiFoundry: slot.aiFoundry,
        total: slot.total,
        cumulative,
      };
    });
}

function buildMonthlyPoints(resp: CostQueryResponse, months: string[]): MonthlyPoint[] {
  const ix = columnIndexes(resp);
  const acc = new Map(months.map((m) => [m, emptyTotals()]));

  for (const row of resp.properties.rows) {
    const slot = acc.get(usageMonth(text(row, ix.date)));
    if (!slot) continue;
    const bucket = bucketOf(row, ix);
    if (!bucket) continue;
    addTo(slot, bucket, amount(row, ix.cost));
  }

  return months.map((m) => {
    const slot = acc.get(m)!;
    return {
      month: m,
      label: monthLabel(m),
      powerPlatform: slot.powerPlatform,
      aiFoundry: slot.aiFoundry,
      total: slot.total,
    };
  });
}

function sumMonthlyPoints(points: MonthlyPoint[]): Totals {
  return points.reduce((totals, point) => {
    addTo(totals, 'powerPlatform', point.powerPlatform);
    addTo(totals, 'aiFoundry', point.aiFoundry);
    return totals;
  }, emptyTotals());
}

function reconcileMonthlyPoints(points: MonthlyPoint[], totals: Totals): void {
  if (points.length === 0) return;
  const pointTotals = sumMonthlyPoints(points);
  const last = points[points.length - 1];
  last.powerPlatform += totals.powerPlatform - pointTotals.powerPlatform;
  last.aiFoundry += totals.aiFoundry - pointTotals.aiFoundry;
  last.total += totals.total - pointTotals.total;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Inclusive chronological list of months from `from` to `to`. */
function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

export function createAzureCostProvider(
  queryFn: CostQueryFn,
  _subscriptionId: string,
): CostDataProvider {
  const annualResponses = new Map<string, Promise<CostQueryResponse>>();

  const annualResponse = (year: string): Promise<CostQueryResponse> => {
    const cached = annualResponses.get(year);
    if (cached) return cached;

    const months = monthsForYear(year);
    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];
    if (!firstMonth || !lastMonth) {
      return Promise.reject(new Error(`Anno non valido: ${year}`));
    }

    const request = queryAll(
      queryFn,
      buildAnnualQuery(monthRange(firstMonth).from, monthRange(lastMonth).to),
    ).catch((error: unknown) => {
      annualResponses.delete(year);
      throw error;
    });
    annualResponses.set(year, request);
    return request;
  };

  return {
    listMonths() {
      return recentMonths(12);
    },
    async getSnapshot(month: string): Promise<CostSnapshot> {
      if (isYearSelection(month)) {
        const year = selectionYear(month);
        const annualMonths = monthsForYear(year);
        const firstMonth = annualMonths[0];
        const lastMonth = annualMonths[annualMonths.length - 1];
        if (!firstMonth || !lastMonth) throw new Error(`Periodo annuale non valido: ${month}`);

        const previousYear = String(Number(year) - 1);
        const previousMonths = annualMonths.map((value) => `${previousYear}-${value.slice(5)}`);
        const [annualResp, previousResp] = await Promise.all([
          annualResponse(year),
          annualResponse(previousYear),
        ]);
        const { lineItems, totals } = parseBreakdown(annualResp);
        const trend = buildMonthlyPoints(annualResp, annualMonths);
        reconcileMonthlyPoints(trend, totals);

        const previous = sumMonthlyPoints(buildMonthlyPoints(previousResp, previousMonths));

        return {
          month,
          currency: 'EUR',
          totals,
          previous,
          yearToDate: totals,
          lineItems,
          trend,
          daily: [],
          lastUpdated: new Date().toISOString(),
          isMock: false,
        };
      }

      // The shared annual response feeds totals, detail, trend and year to date,
      // so browsing another month in the same year does not call Azure again.
      const year = month.slice(0, 4);
      const trendStart = shiftMonth(month, -(TREND_MONTHS - 1));
      const spanStart = trendStart < `${year}-01` ? trendStart : `${year}-01`;
      const spanMonths = monthsBetween(spanStart, month);
      const currentYearResp = await annualResponse(year);
      const { lineItems, totals } = parseBreakdown(currentYearResp, month);

      let points: MonthlyPoint[];
      if (spanStart.startsWith(`${year}-`)) {
        points = buildMonthlyPoints(currentYearResp, spanMonths);
      } else {
        const previousYear = String(Number(year) - 1);
        const previousMonths = spanMonths.filter((value) => value.startsWith(`${previousYear}-`));
        const previousResp = await annualResponse(previousYear);
        const previousPoints = buildMonthlyPoints(previousResp, previousMonths);
        const currentMonths = spanMonths.filter((value) => value.startsWith(`${year}-`));
        points = [
          ...previousPoints,
          ...buildMonthlyPoints(currentYearResp, currentMonths),
        ];
      }

      // The reference month is taken from the finer-grained breakdown query.
      points[points.length - 1] = {
        ...points[points.length - 1],
        powerPlatform: totals.powerPlatform,
        aiFoundry: totals.aiFoundry,
        total: totals.total,
      };

      const previous = points.length >= 2 ? points[points.length - 2] : emptyTotals();
      const yearToDate = points
        .filter((p) => p.month.startsWith(`${year}-`))
        .reduce((acc, p) => {
          acc.total += p.total;
          acc.powerPlatform += p.powerPlatform;
          acc.aiFoundry += p.aiFoundry;
          return acc;
        }, emptyTotals());

      return {
        month,
        currency: 'EUR',
        totals,
        previous: {
          total: previous.total,
          powerPlatform: previous.powerPlatform,
          aiFoundry: previous.aiFoundry,
        },
        yearToDate,
        lineItems,
        trend: points.slice(-TREND_MONTHS),
        daily: [],
        lastUpdated: new Date().toISOString(),
        isMock: false,
      };
    },
    async getDaily(month: string) {
      const dailyResp = await queryAll(queryFn, buildDailyQuery(month));
      return parseDaily(dailyResp, month);
    },
    invalidate(month: string) {
      annualResponses.delete(selectionYear(month));
    },
  };
}
