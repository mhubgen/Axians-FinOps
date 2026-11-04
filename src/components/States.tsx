interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

interface LoadingStateProps {
  periodLabel?: string;
}

export function LoadingState({ periodLabel }: LoadingStateProps) {
  const message = periodLabel
    ? `Caricamento dati per ${periodLabel.toLocaleLowerCase('it-IT')}…`
    : 'Caricamento dei costi in corso…';

  return (
    <div className="ax-loading-dashboard" role="status" aria-live="polite" aria-label={message}>
      <div className="ax-loading-notice">
        <span className="ax-spinner" aria-hidden="true" />
        <span>{message}</span>
      </div>

      <div className="ax-loading-layout" aria-hidden="true">
        <div className="ax-loading-head">
          <span className="ax-skeleton ax-skeleton--title" />
          <span className="ax-skeleton ax-skeleton--subtitle" />
        </div>

        <div className="ax-loading-kpis">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="ax-loading-card ax-loading-card--kpi" key={index}>
              <span className="ax-skeleton ax-skeleton--label" />
              <span className="ax-skeleton ax-skeleton--value" />
              <span className="ax-skeleton ax-skeleton--meta" />
            </div>
          ))}
        </div>

        <div className="ax-loading-card ax-loading-card--budget">
          <span className="ax-skeleton ax-skeleton--label" />
          <span className="ax-skeleton ax-skeleton--value" />
          <span className="ax-skeleton ax-skeleton--bar" />
        </div>

        <div className="ax-loading-charts">
          <div className="ax-loading-card ax-loading-card--chart">
            <span className="ax-skeleton ax-skeleton--label" />
            <span className="ax-skeleton ax-skeleton--canvas" />
          </div>
          <div className="ax-loading-card ax-loading-card--chart">
            <span className="ax-skeleton ax-skeleton--label" />
            <span className="ax-skeleton ax-skeleton--canvas" />
          </div>
        </div>

        <div className="ax-loading-card ax-loading-card--table">
          <span className="ax-skeleton ax-skeleton--label" />
          <span className="ax-skeleton ax-skeleton--row" />
          <span className="ax-skeleton ax-skeleton--row" />
          <span className="ax-skeleton ax-skeleton--row" />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="ax-state ax-state--error" role="alert">
      <span className="ax-state-icon" aria-hidden="true">!</span>
      <p className="ax-state-title">Impossibile caricare i costi</p>
      <p className="ax-state-msg">{message}</p>
      <button className="ax-btn ax-btn--primary" onClick={onRetry}>
        Riprova
      </button>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="ax-state">
      <p className="ax-state-title">Nessun costo per questo mese</p>
      <p className="ax-state-msg">
        Non sono stati rilevati costi pay-as-you-go per il periodo selezionato.
      </p>
    </div>
  );
}
