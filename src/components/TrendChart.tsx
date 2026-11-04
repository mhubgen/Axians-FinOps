import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { MonthlyPoint } from '../types/cost';
import { axians, bucketColor } from '../theme/axians';
import { eur, eur0 } from '../lib/format';

interface TrendChartProps {
  data: MonthlyPoint[];
  compactLabels?: boolean;
}

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

function TrendTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((a, p) => a + (p.value || 0), 0);
  return (
    <div className="ax-tooltip">
      <div className="ax-tooltip-title">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="ax-tooltip-row">
          <span className="ax-dot" style={{ background: p.color }} />
          <span className="ax-tooltip-name">{p.name}</span>
          <span className="ax-tooltip-val">{eur(p.value)}</span>
        </div>
      ))}
      <div className="ax-tooltip-row ax-tooltip-total">
        <span className="ax-tooltip-name">Totale</span>
        <span className="ax-tooltip-val">{eur(total)}</span>
      </div>
    </div>
  );
}

export function TrendChart({ data, compactLabels = false }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={axians.border} />
        <XAxis
          dataKey="label"
          tickFormatter={(value: string) => compactLabels ? value.split(' ')[0] : value}
          tickLine={false}
          axisLine={{ stroke: axians.border }}
          tick={{ fill: axians.muted, fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tick={{ fill: axians.muted, fontSize: 12 }}
          tickFormatter={(v: number) => eur0(v)}
        />
        <Tooltip cursor={{ fill: 'rgba(230,0,126,0.06)' }} content={<TrendTooltip />} />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12, color: axians.muted, paddingTop: 8 }}
        />
        <Bar
          dataKey="powerPlatform"
          name="Power Platform"
          stackId="a"
          fill={bucketColor.powerPlatform}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="aiFoundry"
          name="AI Foundry"
          stackId="a"
          fill={bucketColor.aiFoundry}
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
