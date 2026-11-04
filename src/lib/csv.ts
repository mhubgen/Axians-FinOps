// CSV generation + download helpers tuned for Excel in Italian locale:
//   - ';' field separator (it-IT Excel default)
//   - decimal comma for numbers
//   - UTF-8 BOM so accented characters render correctly

export type CsvCell = string | number | null | undefined;

/** Format a numeric value with a decimal comma and no thousands separator. */
export function csvNumber(n: number, fractionDigits = 2): string {
  return n.toFixed(fractionDigits).replace('.', ',');
}

function escapeCell(value: CsvCell): string {
  if (value == null) return '';
  const s = String(value);
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a semicolon-separated CSV string from headers + rows. */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(';'));
  return lines.join('\r\n');
}

/** Trigger a browser download of `content` as a UTF-8 CSV file. */
export function downloadCsv(filename: string, content: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
