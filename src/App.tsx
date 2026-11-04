import { Header } from './components/Header';
import { MonthSelector } from './components/MonthSelector';
import { KpiCard } from './components/KpiCard';
import { BudgetCard } from './components/BudgetCard';
import { CostTable } from './components/CostTable';
import { MonthComparison } from './components/MonthComparison';
import { WeeklyBreakdown } from './components/WeeklyBreakdown';
import { LoadingState, ErrorState, EmptyState } from './components/States';
import { useCosts } from './hooks/useCosts';
import { useBudget } from './hooks/useBudget';
import { dailyToWeekly } from './lib/week';
import { toCsv, csvNumber, downloadCsv } from './lib/csv';
import { monthLabelLong, dateTimeLabel } from './lib/format';
import { isYearSelection, selectionYear } from './lib/period';
import { lazy, Suspense, useMemo } from 'react';
import './App.css';

// Heavy recharts-based charts are code-split so they stay out of the initial bundle.
const TrendChart = lazy(() => import('./components/TrendChart').then((m) => ({ default: m.TrendChart })));
const BreakdownChart = lazy(() =>
  import('./components/BreakdownChart').then((m) => ({ default: m.BreakdownChart })),
);

const BUCKET_LABEL = { powerPlatform: 'Power Platform', aiFoundry: 'AI Foundry' } as const;

function App() {
  const {
    month,
    setMonth,
    months,
    snapshot,
    loading,
    error,
    daily,
    dailyLoading,
    dailyError,
    loadDaily,
    refresh,
  } = useCosts();
  const selectedYear = selectionYear(month);
  const year = Number(selectedYear);
  const isAnnual = isYearSelection(month);
  const periodLabel = isAnnual ? `Anno ${selectedYear}` : monthLabelLong(month);
  const comparisonLabel = isAnnual ? 'vs anno prec.' : 'vs mese prec.';
  const { budget, saving, setBudget } = useBudget(year);

  const weeks = useMemo(() => dailyToWeekly(daily ?? []), [daily]);

  const changingPeriod = snapshot != null && snapshot.month !== month;
  const showLoading = loading && (!snapshot || changingPeriod);
  const isEmpty = snapshot != null && snapshot.totals.total <= 0;

  const handleExportDetail = () => {
    if (!snapshot) return;
    const headers = ['Categoria', 'Voce', 'Servizio', 'Quantità', 'Unità', 'Costo (EUR)'];
    const rows = snapshot.lineItems.map((i) => [
      BUCKET_LABEL[i.bucket],
      i.name,
      i.category,
      i.quantity != null ? String(i.quantity) : '',
      i.unit ?? '',
      csvNumber(i.cost),
    ]);
    downloadCsv(`costi-dettaglio-${isAnnual ? selectedYear : month}`, toCsv(headers, rows));
  };

  return (
    <div className="ax-app">
      <Header>
        <MonthSelector month={month} months={months} onChange={setMonth} disabled={loading} />
        <button
          className="ax-btn ax-btn--ghost"
          onClick={handleExportDetail}
          disabled={loading || !snapshot}
          title="Esporta il dettaglio costi in CSV"
        >
          <span aria-hidden="true">⭳</span>
          Esporta CSV
        </button>
        <button
          className="ax-btn ax-btn--ghost"
          onClick={refresh}
          disabled={loading}
          title="Aggiorna i dati"
        >
          <span className={`ax-refresh-icon ${loading ? 'is-spinning' : ''}`} aria-hidden="true">↻</span>
          Aggiorna
        </button>
      </Header>


      <main className="ax-main">
        {showLoading && <LoadingState periodLabel={periodLabel} />}
        {error && !loading && <ErrorState message={error} onRetry={refresh} />}

        {snapshot && !error && !changingPeriod && (
          <>
            <div className="ax-page-head">
              <div>
                <h1 className="ax-page-title">Costi pay-as-you-go</h1>
                <p className="ax-page-sub">
                  {periodLabel} · subscription singola
                </p>
              </div>
            </div>

            <section className="ax-kpis">
              <KpiCard
                label={isAnnual ? 'Totale anno' : 'Totale mese'}
                value={snapshot.totals.total}
                previous={snapshot.previous.total}
                accent="red"
                comparisonLabel={comparisonLabel}
              />
              <KpiCard
                label="Power Platform"
                hint="AI Builder · Copilot credits"
                value={snapshot.totals.powerPlatform}
                previous={snapshot.previous.powerPlatform}
                accent="red"
                comparisonLabel={comparisonLabel}
              />
              <KpiCard
                label="AI Foundry"
                hint="Modelli deployati"
                value={snapshot.totals.aiFoundry}
                previous={snapshot.previous.aiFoundry}
                accent="blue"
                comparisonLabel={comparisonLabel}
              />
            </section>

            <section className="ax-budget-section">
              <BudgetCard
                year={year}
                spent={snapshot.yearToDate.total}
                budget={budget}
                saving={saving}
                onSave={setBudget}
              />
            </section>

            {isEmpty ? (
              <EmptyState />
            ) : (
              <>
                <section className="ax-charts">
                  <div className="ax-card ax-card--trend">
                    <div className="ax-card-head">
                      <h2 className="ax-card-title">
                        {isAnnual ? `Andamento ${selectedYear}` : 'Andamento ultimi 6 mesi'}
                      </h2>
                      <span className="ax-card-hint">
                        {isAnnual ? 'Costo mensile per servizio' : 'Costo per servizio'}
                      </span>
                    </div>
                    <Suspense fallback={<div className="ax-chart-loading">Caricamento grafico…</div>}>
                      <TrendChart data={snapshot.trend} compactLabels={isAnnual} />
                    </Suspense>
                  </div>

                  <div className="ax-card ax-card--breakdown">
                    <div className="ax-card-head">
                      <h2 className="ax-card-title">Ripartizione per categoria</h2>
                      <span className="ax-card-hint">{periodLabel}</span>
                    </div>
                    <Suspense fallback={<div className="ax-chart-loading">Caricamento grafico…</div>}>
                      <BreakdownChart lineItems={snapshot.lineItems} total={snapshot.totals.total} />
                    </Suspense>
                  </div>
                </section>

                {!isAnnual && (
                  <section className="ax-card">
                    <div className="ax-card-head">
                      <h2 className="ax-card-title">Costi per settimana</h2>
                      <span className="ax-card-hint">{periodLabel} · settimane ISO</span>
                    </div>
                    {dailyLoading ? (
                      <div className="ax-week-request" role="status" aria-live="polite">
                        <span className="ax-spinner" aria-hidden="true" />
                        <span>Caricamento costi settimanali…</span>
                      </div>
                    ) : dailyError ? (
                      <div className="ax-week-request" role="alert">
                        <span>Impossibile caricare i costi settimanali.</span>
                        <button className="ax-btn ax-btn--ghost ax-btn--sm" onClick={loadDaily}>
                          Riprova
                        </button>
                      </div>
                    ) : daily ? (
                      <WeeklyBreakdown weeks={weeks} month={month} />
                    ) : (
                      <div className="ax-week-request">
                        <button className="ax-btn ax-btn--ghost" onClick={loadDaily}>
                          Mostra costi settimanali
                        </button>
                      </div>
                    )}
                  </section>
                )}

                <section className="ax-card">
                  <div className="ax-card-head">
                    <h2 className="ax-card-title">Dettaglio costi</h2>
                    <span className="ax-card-hint">
                      Voci di spesa e modelli · {periodLabel.toLocaleLowerCase('it-IT')}
                    </span>
                  </div>
                  <CostTable items={snapshot.lineItems} />
                </section>

                <section className="ax-card">
                  <div className="ax-card-head">
                    <h2 className="ax-card-title">Confronto mensile</h2>
                    <span className="ax-card-hint">
                      {isAnnual ? `${selectedYear} · ${snapshot.trend.length} mesi` : `Ultimi ${snapshot.trend.length} mesi`}
                    </span>
                  </div>
                  <MonthComparison data={snapshot.trend} />
                </section>
              </>
            )}

            <footer className="ax-footer">
              <span>
                Ultimo aggiornamento: {dateTimeLabel(snapshot.lastUpdated)} · Valuta: {snapshot.currency}
              </span>
              <span className="ax-footer-brand">Axians · The best of ICT with a human touch</span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
