import { eur, deltaPct } from '../lib/format';

interface KpiCardProps {
  label: string;
  value: number;
  previous: number;
  accent?: 'red' | 'charcoal' | 'blue' | 'neutral';
  hint?: string;
  comparisonLabel?: string;
}

export function KpiCard({
  label,
  value,
  previous,
  accent = 'neutral',
  hint,
  comparisonLabel = 'vs mese prec.',
}: KpiCardProps) {
  const diff = value - previous;
  // Without a previous figure there is nothing to compare against.
  const comparable = Math.abs(previous) >= 0.005;
  const up = diff > 0;
  const flat = !comparable || Math.abs(diff) < 0.005;

  return (
    <div className={`ax-kpi ax-kpi--${accent}`}>
      <span className="ax-kpi-accent" aria-hidden="true" />
      <div className="ax-kpi-head">
        <span className="ax-kpi-label">{label}</span>
        {hint && <span className="ax-kpi-hint">{hint}</span>}
      </div>
      <div className="ax-kpi-value">{eur(value)}</div>
      <div className={`ax-kpi-delta ${flat ? 'is-flat' : up ? 'is-up' : 'is-down'}`}>
        <span className="ax-kpi-arrow" aria-hidden="true">
          {flat ? '→' : up ? '▲' : '▼'}
        </span>
        <span>{deltaPct(value, previous)}</span>
        <span className="ax-kpi-delta-sub">{comparisonLabel}</span>
      </div>
    </div>
  );
}
