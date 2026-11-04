import type { ReactNode } from 'react';

interface HeaderProps {
  children?: ReactNode;
}

export function Header({ children }: HeaderProps) {
  return (
    <header className="ax-header">
      <div className="ax-brand">
        <img
          className="ax-logo"
          src={`${import.meta.env.BASE_URL}axians-logo.png`}
          alt="Axians"
        />
        <span className="ax-brand-divider" aria-hidden="true" />
        <div className="ax-brand-text">
          <span className="ax-brand-title">Cost Dashboard</span>
          <span className="ax-brand-sub">Pay-as-you-go · Power Platform &amp; AI Foundry</span>
        </div>
      </div>
      <div className="ax-header-actions">{children}</div>
    </header>
  );
}
