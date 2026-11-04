import { useMemo, useState } from 'react';
import type { CostLineItem, CostBucket } from '../types/cost';
import { eur, num } from '../lib/format';
import { bucketColor } from '../theme/axians';

interface CostTableProps {
  items: CostLineItem[];
}

const BUCKET_LABEL: Record<CostBucket, string> = {
  powerPlatform: 'Power Platform',
  aiFoundry: 'AI Foundry',
};

type Filter = 'all' | CostBucket;

export function CostTable({ items }: CostTableProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.bucket === filter)),
    [items, filter],
  );
  const maxCost = useMemo(
    () => filtered.reduce((m, i) => Math.max(m, i.cost), 0) || 1,
    [filtered],
  );

  return (
    <div className="ax-table-wrap">
      <div className="ax-table-toolbar">
        <div className="ax-segment">
          {(['all', 'powerPlatform', 'aiFoundry'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`ax-segment-btn ${filter === f ? 'is-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Tutti' : BUCKET_LABEL[f]}
            </button>
          ))}
        </div>
      </div>
      <table className="ax-table">
        <thead>
          <tr>
            <th>Voce</th>
            <th>Servizio</th>
            <th>Categoria</th>
            <th className="ax-num">Quantità</th>
            <th className="ax-num">Costo</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="ax-cell-name">{item.name}</div>
                <div className="ax-bar" aria-hidden="true">
                  <span
                    className="ax-bar-fill"
                    style={{
                      width: `${Math.max(0, Math.min(100, (item.cost / maxCost) * 100))}%`,
                      background: bucketColor[item.bucket],
                    }}
                  />
                </div>
              </td>
              <td>
                <span
                  className="ax-tag"
                  style={{ ['--tag-color' as string]: bucketColor[item.bucket] }}
                >
                  {BUCKET_LABEL[item.bucket]}
                </span>
              </td>
              <td className="ax-muted-cell">{item.category}</td>
              <td className="ax-num ax-muted-cell">
                {item.quantity != null ? `${num(item.quantity)} ${item.unit ?? ''}`.trim() : '—'}
              </td>
              <td className="ax-num ax-cost-cell">{eur(item.cost)}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="ax-table-empty">
                Nessuna voce di costo per il filtro selezionato.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
