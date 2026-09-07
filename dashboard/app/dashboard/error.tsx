'use client';

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="dashboard-shell"><section className="state-panel"><p className="eyebrow">Temporary issue</p><h1>Reporting is unavailable.</h1><p>We couldn’t load campaign data.</p><button className="retry-button" type="button" onClick={reset}>Try again</button></section></main>
  );
}
