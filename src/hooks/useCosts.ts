import { useCallback, useEffect, useState } from 'react';
import type { CostSnapshot, DailyPoint } from '../types/cost';
import { getCostProvider } from '../data';
import { currentMonth } from '../data/costProvider';

interface UseCostsResult {
  month: string;
  setMonth: (m: string) => void;
  months: string[];
  snapshot: CostSnapshot | null;
  loading: boolean;
  error: string | null;
  daily: DailyPoint[] | null;
  dailyLoading: boolean;
  dailyError: string | null;
  loadDaily: () => void;
  refresh: () => void;
}

export function useCosts(): UseCostsResult {
  const provider = getCostProvider();
  const [month, setMonth] = useState<string>(currentMonth());
  const [snapshot, setSnapshot] = useState<CostSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyResult, setDailyResult] = useState<{ month: string; points: DailyPoint[] } | null>(null);
  const [dailyLoadingMonth, setDailyLoadingMonth] = useState<string | null>(null);
  const [dailyErrorResult, setDailyErrorResult] = useState<{ month: string; message: string } | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    provider
      .getSnapshot(month)
      .then((snap) => {
        if (!cancelled) setSnapshot(snap);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Errore imprevisto nel recupero dei costi.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [provider, month, nonce]);

  const snapshotDaily = snapshot?.month === month && snapshot.daily.length > 0
    ? snapshot.daily
    : null;
  const daily = dailyResult?.month === month ? dailyResult.points : snapshotDaily;
  const dailyLoading = dailyLoadingMonth === month;
  const dailyError = dailyErrorResult?.month === month ? dailyErrorResult.message : null;

  const loadDaily = useCallback(() => {
    if (daily || dailyLoading) return;
    const requestedMonth = month;
    setDailyLoadingMonth(requestedMonth);
    setDailyErrorResult(null);
    provider
      .getDaily(requestedMonth)
      .then((points) => setDailyResult({ month: requestedMonth, points }))
      .catch((err: unknown) => {
        setDailyErrorResult({
          month: requestedMonth,
          message: err instanceof Error ? err.message : 'Errore nel recupero dei costi settimanali.',
        });
      })
      .finally(() => {
        setDailyLoadingMonth((value) => value === requestedMonth ? null : value);
      });
  }, [daily, dailyLoading, month, provider]);

  const refresh = useCallback(() => {
    provider.invalidate?.(month);
    setDailyResult(null);
    setDailyErrorResult(null);
    setNonce((n) => n + 1);
  }, [provider, month]);

  return {
    month,
    setMonth,
    months: provider.listMonths(),
    snapshot,
    loading,
    error,
    daily,
    dailyLoading,
    dailyError,
    loadDaily,
    refresh,
  };
}
