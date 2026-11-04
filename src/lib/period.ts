const YEAR_SELECTION_PATTERN = /^(\d{4})-all$/;

export function yearSelection(year: string): string {
  return `${year}-all`;
}

export function isYearSelection(value: string): boolean {
  return YEAR_SELECTION_PATTERN.test(value);
}

export function selectionYear(value: string): string {
  return value.slice(0, 4);
}

/** Months in a selected year, capped at the current month for the current year. */
export function monthsForYear(year: string, now = new Date()): string[] {
  const numericYear = Number(year);
  const currentYear = now.getUTCFullYear();
  const lastMonth = numericYear < currentYear
    ? 12
    : numericYear === currentYear
      ? now.getUTCMonth() + 1
      : 0;

  return Array.from(
    { length: lastMonth },
    (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`,
  );
}