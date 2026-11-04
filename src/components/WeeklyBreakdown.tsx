import { useMemo, useState } from 'react';
import type { WeeklyPoint } from '../types/cost';
import { eur } from '../lib/format';
import { bucketColor } from '../theme/axians';
import { toCsv, csvNumber, downloadCsv } from '../lib/csv';

interface WeeklyBreakdownProps {
  weeks: WeeklyPoint[];
  month: string;
}

type Selection = 'month' | number;

interface Slice {
  label: string;
  range: string;
  powerPlatform: number;
  aiFoundry: number;
  total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function WeeklyBreakdown({ weeks, month }: WeeklyBreakdownProps) {
  const [selection, setSelection] = useState<Selection>('month');

  const monthSlice = useMemo<Slice>(() => {
    const pp = weeks.reduce((s, w) => s + w.powerPlatform, 0);
    const af = weeks.reduce((s, w) => s + w.aiFoundry, 0);
    return {
      label: 'Intero mese',
      range: weeks.length ? `${weeks[0].start} → ${weeks[weeks.length - 1].end}` : '—',
      powerPlatform: round2(pp),
      aiFoundry: round2(af),
      total: round2(pp + af),
    };
  }, [weeks]);

  const active: Slice =
    selection === 'month'
      ? monthSlice
      : {
          label: `Settimana ${selection + 1}`,
          range: weeks[selection].label,
          powerPlatform: weeks[selection].powerPlatform,
          aiFoundry: weeks[selection].aiFoundry,
          total: weeks[selection].total,
        };

  const maxTotal = monthSlice.total || 1;
  const ppPct = (active.powerPlatform / maxTotal) * 100;
  const afPct = (active.aiFoundry / maxTotal) * 100;

  const handleExport = () => {
    const headers = ['Settimana', 'Dal', 'Al', 'Power Platform (EUR)', 'AI Foundry (EUR)', 'Totale (EUR)'];
    const rows = weeks.map((w) => [
      w.label,
      w.start,
      w.end,
      csvNumber(w.powerPlatform),
      csvNumber(w.aiFoundry),
      csvNumber(w.total),
    ]);
    downloadCsv(`costi-settimanali-${month}`, toCsv(headers, rows));
  };

  return (
    <div className="ax-week">
      <div className="ax-week-toolbar">
        <div className="ax-segment ax-week-filter">
          <button
            className={`ax-segment-btn ${selection === 'month' ? 'is-active' : ''}`}
            onClick={() => setSelection('month')}
          >
            Mese
          </button>
          {weeks.map((w, i) => (
            <button
              key={w.week}
              className={`ax-segment-btn ${selection === i ? 'is-active' : ''}`}
              title={w.label}
              onClick={() => setSelection(i)}
            >
              Sett. {i + 1}
            </button>
          ))}
        </div>
        <button className="ax-btn ax-btn--ghost ax-btn--sm" onClick={handleExport} disabled={weeks.length === 0}>
          <span aria-hidden="true">⭳</span> Esporta CSV
        </button>
      </div>

      {weeks.length === 0 ? (
        <p className="ax-week-empty">Nessun dato settimanale per il mese selezionato.</p>
      ) : (
        <div className="ax-week-panel">
          <div className="ax-week-panel-head">
            <span className="ax-week-panel-title">{active.label}</span>
            <span className="ax-week-panel-range">{active.range}</span>
          </div>

          <div className="ax-week-total">{eur(active.total)}</div>

          <div className="ax-week-bar" aria-hidden="true">
            <span className="ax-bar-split" style={{ width: `${ppPct}%`, background: bucketColor.powerPlatform }} />
            <span className="ax-bar-split" style={{ width: `${afPct}%`, background: bucketColor.aiFoundry }} />
          </div>

          <div className="ax-week-legend">
            <span className="ax-week-leg">
              <span className="ax-dot" style={{ background: bucketColor.powerPlatform }} />
              Power Platform <strong>{eur(active.powerPlatform)}</strong>
            </span>
            <span className="ax-week-leg">
              <span className="ax-dot" style={{ background: bucketColor.aiFoundry }} />
              AI Foundry <strong>{eur(active.aiFoundry)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
