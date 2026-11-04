import { useCallback, useEffect, useState } from 'react';
import { getBudgetStore } from '../data/budgetStore';

interface UseBudgetResult {
  budget: number | null;
  saving: boolean;
  loading: boolean;
  setBudget: (amount: number) => Promise<void>;
}

/** Loads and persists the annual budget for `year` via the active BudgetStore. */
export function useBudget(year: number): UseBudgetResult {
  const store = getBudgetStore();
  const [budget, setBudgetState] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    store
      .getBudget(year)
      .then((value) => {
        if (!cancelled) setBudgetState(value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [store, year]);

  const setBudget = useCallback(
    async (amount: number) => {
      setSaving(true);
      try {
        await store.setBudget(year, amount);
        setBudgetState(amount);
      } finally {
        setSaving(false);
      }
    },
    [store, year],
  );

  return { budget, saving, loading, setBudget };
}
