import { monthLabelLong } from '../lib/format';
import { yearSelection } from '../lib/period';

interface MonthSelectorProps {
  month: string;
  months: string[];
  onChange: (month: string) => void;
  disabled?: boolean;
}

export function MonthSelector({ month, months, onChange, disabled }: MonthSelectorProps) {
  const monthsByYear = months.reduce<Map<string, string[]>>((groups, value) => {
    const year = value.split('-')[0];
    const yearMonths = groups.get(year) ?? [];
    yearMonths.push(value);
    groups.set(year, yearMonths);
    return groups;
  }, new Map());

  return (
    <label className="ax-month">
      <span className="ax-month-label">Mese</span>
      <select
        className="ax-select"
        value={month}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {Array.from(monthsByYear, ([year, yearMonths]) => (
          <optgroup key={year} label={year}>
            <option value={yearSelection(year)}>Tutti</option>
            {yearMonths.map((value) => (
              <option key={value} value={value}>
                {monthLabelLong(value)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
