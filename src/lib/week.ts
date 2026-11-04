// Client-side aggregation of daily cost points into ISO calendar weeks
// (Monday–Sunday). Derived from the snapshot's `daily` series, so no extra
// Cost Management query is needed.

import type { DailyPoint, WeeklyPoint } from '../types/cost';
import { dayRangeLabel } from './format';

/** ISO 8601 week number (weeks start on Monday). */
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday of the current week decides the year.
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

/**
 * Group daily points into ISO weeks. Weeks are ordered chronologically and
 * labelled with the day range actually covered within the month.
 */
export function dailyToWeekly(daily: DailyPoint[]): WeeklyPoint[] {
  const groups = new Map<
    number,
    { start: string; end: string; pp: number; af: number }
  >();

  for (const d of daily) {
    const week = isoWeek(new Date(`${d.date}T00:00:00Z`));
    const cur = groups.get(week);
    if (!cur) {
      groups.set(week, { start: d.date, end: d.date, pp: d.powerPlatform, af: d.aiFoundry });
    } else {
      cur.end = d.date;
      cur.pp += d.powerPlatform;
      cur.af += d.aiFoundry;
    }
  }

  return [...groups.entries()]
    .sort((a, b) => a[1].start.localeCompare(b[1].start))
    .map(([week, g]) => ({
      week,
      label: dayRangeLabel(g.start, g.end),
      start: g.start,
      end: g.end,
      powerPlatform: g.pp,
      aiFoundry: g.af,
      total: g.pp + g.af,
    }));
}
