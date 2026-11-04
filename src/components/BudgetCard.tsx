import { useEffect, useState } from 'react';
import { eur } from '../lib/format';

interface BudgetCardProps {
  year: number;
  /** Spend from 1 Jan up to the reference month. */
  spent: number;
  budget: number | null;
  saving: boolean;
  onSave: (amount: number) => void;
}

export function BudgetCard({ year, spent, budget, saving, onSave }: BudgetCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!editing) setDraft(budget != null ? String(budget) : '');
  }, [budget, editing]);

  const pct = budget && budget > 0 ? Math.min(Math.max((spent / budget) * 100, 0), 100) : 0;
  const over = budget != null && budget > 0 && spent > budget;
  const remaining = budget != null ? budget - spent : null;

  const commit = () => {
    const amount = Number(draft.replace(',', '.'));
    if (Number.isFinite(amount) && amount >= 0) {
      onSave(amount);
      setEditing(false);
    }
  };

  return (
    <div className={`ax-budget ${over ? 'is-over' : ''}`}>
      <div className="ax-budget-head">
        <div>
          <span className="ax-kpi-label">Budget annuale {year}</span>
          <span className="ax-kpi-hint"> · speso dal 1° gennaio</span>
        </div>
        {!editing && (
          <button className="ax-btn ax-btn--ghost ax-btn--sm" onClick={() => setEditing(true)}>
            {budget != null ? 'Modifica' : 'Imposta budget'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="ax-budget-edit">
          <div className="ax-budget-input">
            <span className="ax-budget-cur">€</span>
            <input
              type="number"
              min={0}
              step={100}
              value={draft}
              autoFocus
              placeholder="0"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
            />
          </div>
          <button className="ax-btn ax-btn--primary ax-btn--sm" onClick={commit} disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
          <button className="ax-btn ax-btn--ghost ax-btn--sm" onClick={() => setEditing(false)} disabled={saving}>
            Annulla
          </button>
        </div>
      ) : budget != null ? (
        <>
          <div className="ax-budget-figures">
            <div className="ax-budget-spent">
              <span className="ax-kpi-value">{eur(spent)}</span>
              <span className="ax-budget-of">di {eur(budget)}</span>
            </div>
            <span className={`ax-budget-pct ${over ? 'is-over' : ''}`}>
              {budget > 0 ? `${Math.round((spent / budget) * 100)}%` : '—'}
            </span>
          </div>
          <div className="ax-budget-bar" aria-hidden="true">
            <span
              className={`ax-budget-bar-fill ${over ? 'is-over' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="ax-budget-foot">
            {over ? (
              <span className="ax-budget-warn">
                Budget superato di {eur(spent - budget)}
              </span>
            ) : (
              <span className="ax-budget-remaining">
                Residuo: <strong>{eur(remaining ?? 0)}</strong>
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="ax-budget-empty">
          <span className="ax-kpi-value">{eur(spent)}</span>
          <span className="ax-budget-of">spesi finora · nessun budget impostato</span>
        </div>
      )}
    </div>
  );
}
