import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { CostLineItem } from '../types/cost';
import { categoryPalette } from '../theme/axians';
import { eur } from '../lib/format';

interface BreakdownChartProps {
  lineItems: CostLineItem[];
  total: number;
}

interface Slice {
  name: string;
  value: number;
  color: string;
}

export function BreakdownChart({ lineItems, total }: BreakdownChartProps) {
  const slices = useMemo<Slice[]>(() => {
    const byCategory = new Map<string, number>();
    for (const item of lineItems) {
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.cost);
    }
    return [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name,
        value: Math.round(value * 100) / 100,
        color: categoryPalette[i % categoryPalette.length],
      }));
  }, [lineItems]);

  return (
    <div className="ax-breakdown">
      <div className="ax-donut">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0] as unknown as { name: string; value: number };
                return (
                  <div className="ax-tooltip">
                    <div className="ax-tooltip-row">
                      <span className="ax-tooltip-name">{p.name}</span>
                      <span className="ax-tooltip-val">{eur(p.value)}</span>
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="ax-donut-center">
          <span className="ax-donut-center-label">Totale</span>
          <span className="ax-donut-center-value">{eur(total)}</span>
        </div>
      </div>
      <ul className="ax-legend">
        {slices.map((s) => (
          <li key={s.name} className="ax-legend-item">
            <span className="ax-dot" style={{ background: s.color }} />
            <span className="ax-legend-name">{s.name}</span>
            <span className="ax-legend-val">{eur(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
