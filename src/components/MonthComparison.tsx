import { useMemo } from 'react';
import type { MonthlyPoint } from '../types/cost';
import { eur, deltaPct } from '../lib/format';
import { bucketColor } from '../theme/axians';

interface MonthComparisonProps {
  data: MonthlyPoint[];
}

interface Row extends MonthlyPoint {
  deltaTotal: string;
  up: boolean;
  flat: boolean;
}

export function MonthComparison({ data }: MonthComparisonProps) {
  const rows = useMemo<Row[]>(() => {
    // data is chronological (oldest -> newest); compute MoM delta then reverse.
    const withDelta = data.map((m, i) => {
      const previousTotal = i > 0 ? data[i - 1].total : 0;
      const comparable = i > 0 && Math.abs(previousTotal) >= 0.005;
      const diff = m.total - previousTotal;
      return {
        ...m,
        deltaTotal: comparable ? deltaPct(m.total, previousTotal) : '—',
        up: diff > 0,
        flat: !comparable || Math.abs(diff) < 0.005,
      };
    });
    return withDelta.reverse();
  }, [data]);

  const maxTotal = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.total), 0) || 1,
    [rows],
  );

  return (
    <div className="ax-table-wrap">
      <table className="ax-table">
        <thead>
          <tr>
            <th>Mese</th>
            <th className="ax-num">
              <span className="ax-th-dot" style={{ background: bucketColor.powerPlatform }} />
              Power Platform
            </th>
            <th className="ax-num">
              <span className="ax-th-dot" style={{ background: bucketColor.aiFoundry }} />
              AI Foundry
            </th>
            <th className="ax-num">Totale</th>
            <th className="ax-num">Δ vs mese prec.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <td>
                <div className="ax-cell-name">{r.label}</div>
                <div className="ax-bar" aria-hidden="true">
                  <span
                    className="ax-bar-split"
                    style={{
                      width: `${(r.powerPlatform / maxTotal) * 100}%`,
                      background: bucketColor.powerPlatform,
                    }}
                  />
                  <span
                    className="ax-bar-split"
                    style={{
                      width: `${(r.aiFoundry / maxTotal) * 100}%`,
                      background: bucketColor.aiFoundry,
                    }}
                  />
                </div>
              </td>
              <td className="ax-num ax-muted-cell">{eur(r.powerPlatform)}</td>
              <td className="ax-num ax-muted-cell">{eur(r.aiFoundry)}</td>
              <td className="ax-num ax-cost-cell">{eur(r.total)}</td>
              <td className="ax-num">
                <span
                  className={`ax-delta-pill ${r.flat ? 'is-flat' : r.up ? 'is-up' : 'is-down'}`}
                >
                  {r.flat ? '→' : r.up ? '▲' : '▼'} {r.deltaTotal}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
