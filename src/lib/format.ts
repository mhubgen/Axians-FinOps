// Localized (it-IT) formatting helpers.

const eurFmt = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eur0Fmt = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const numFmt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });

const pctFmt = new Intl.NumberFormat('it-IT', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const eur = (n: number): string => eurFmt.format(n);
export const eur0 = (n: number): string => eur0Fmt.format(n);
export const num = (n: number): string => numFmt.format(n);

/** Signed percentage, e.g. +12.5% / -3.0%. Returns "—" when base is 0. */
export function deltaPct(current: number, previous: number): string {
  if (!previous) return '—';
  const ratio = (current - previous) / previous;
  const sign = ratio > 0 ? '+' : '';
  return sign + pctFmt.format(ratio);
}

const MONTHS_IT = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];

const MONTHS_IT_LONG = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

/** 'YYYY-MM' -> 'Lug 2026'. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_IT[m - 1]} ${y}`;
}

/** 'YYYY-MM' -> 'Luglio 2026'. */
export function monthLabelLong(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_IT_LONG[m - 1]} ${y}`;
}

/** ISO string -> 'gg/mm/aaaa, hh:mm'. */
export function dateTimeLabel(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Compact day range label from two 'YYYY-MM-DD' dates, e.g.
 * "6–12 lug" (same month) or "28 giu–4 lug" (spanning months).
 */
export function dayRangeLabel(start: string, end: string): string {
  const [, sm, sd] = start.split('-').map(Number);
  const [, em, ed] = end.split('-').map(Number);
  if (sm === em) {
    return `${sd}–${ed} ${MONTHS_IT[em - 1]}`;
  }
  return `${sd} ${MONTHS_IT[sm - 1]}–${ed} ${MONTHS_IT[em - 1]}`;
}
