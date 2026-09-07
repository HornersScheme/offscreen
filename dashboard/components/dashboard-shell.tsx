import { CampaignSwitcher } from './campaign-switcher';
import { DashboardEvents } from './dashboard-events';
import type { Campaign, CampaignMetrics, Sponsor } from '@/lib/dashboard-data';

const statusLabels: Record<Campaign['status'], string> = {
  draft: 'Draft',
  active: 'Live',
  paused: 'Paused',
  budget_exhausted: 'Budget used',
  completed: 'Completed',
};

function currency(value: number, code: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency: code }).format(value);
}

function duration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (!hours) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function dateRange(start: string | null, end: string | null) {
  const formatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!start && !end) return 'Pilot schedule open';
  return [start, end].filter(Boolean).map((value) => formatter.format(new Date(value!))).join(' — ');
}

function relativeTime(timestamp: string) {
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (deltaSeconds < 60) return 'Just now';
  if (deltaSeconds < 3600) return `${Math.floor(deltaSeconds / 60)} min ago`;
  if (deltaSeconds < 86400) return `${Math.floor(deltaSeconds / 3600)}h ago`;
  return `${Math.floor(deltaSeconds / 86400)}d ago`;
}

function statusClass(status: Campaign['status']) {
  return status === 'active' ? 'campaign-status is-live' : 'campaign-status';
}

export function DashboardShell({ sponsor, campaigns, campaign, metrics, signedIn }: {
  sponsor: Sponsor;
  campaigns: Campaign[];
  campaign: Campaign;
  metrics: CampaignMetrics;
  signedIn: boolean;
}) {
  const spendPercent = campaign.budget_total > 0
    ? Math.min(100, (campaign.budget_spent / campaign.budget_total) * 100)
    : 0;
  const maxActivity = Math.max(...metrics.activity_breakdown.map((item) => item.sessions), 1);

  return (
    <main className="dashboard-shell">
      <DashboardEvents campaignId={campaign.id} signedIn={signedIn} />
      <header className="dashboard-header">
        <a className="wordmark" href="https://offscreenapp.com" aria-label="Offscreen home">
          <span className="wordmark-mark" aria-hidden="true" />
          Offscreen <span className="wordmark-section">/ Sponsors</span>
        </a>
        <div className="header-account">
          <span>{sponsor.name}</span>
          <a href="/account/password">Password</a>
          <form action="/auth/signout" method="post"><button type="submit">Log out</button></form>
        </div>
      </header>

      <section className="campaign-intro">
        <div>
          <p className="eyebrow">{sponsor.name}</p>
          <h1>{campaign.name}</h1>
          <p className="campaign-dates">{dateRange(campaign.starts_at, campaign.ends_at)}</p>
        </div>
        <div className="campaign-controls">
          <CampaignSwitcher campaigns={campaigns} selectedId={campaign.id} />
          <span className={statusClass(campaign.status)}><i aria-hidden="true" />{statusLabels[campaign.status]}</span>
        </div>
      </section>

      {metrics.sessions_started === 0 ? (
        <section className="campaign-ready">
          <p className="eyebrow">Ready</p>
          <h2>Your campaign is ready.</h2>
          <p>Session data will appear here once Offscreen users begin completing sponsored focus sessions.</p>
        </section>
      ) : (
        <>
          <section className="hero-metrics" aria-label="Campaign outcomes">
            <div><strong>{metrics.sessions_started.toLocaleString()}</strong><span>Sessions backed</span></div>
            <div><strong>{duration(metrics.focus_seconds_completed)}</strong><span>Focus backed</span></div>
            <div><strong>{metrics.unique_users.toLocaleString()}</strong><span>People</span></div>
          </section>

          <section className="spend-section">
            <div className="section-label">Campaign spend</div>
            <div className="spend-line">
              <strong>{currency(campaign.budget_spent, campaign.currency)}</strong>
              <span>/ {currency(campaign.budget_total, campaign.currency)}</span>
            </div>
            <div className="progress-track" role="progressbar" aria-label="Campaign budget spent" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(spendPercent)}>
              <span style={{ width: `${spendPercent}%` }} />
            </div>
            <div className="budget-notes">
              <span>{currency(campaign.budget_available, campaign.currency)} available</span>
              <span>{currency(campaign.budget_reserved, campaign.currency)} reserved</span>
            </div>
          </section>

          <section className="performance-grid">
            <div className="performance-lead"><strong>{metrics.completion_rate.toFixed(1)}%</strong><span>Completion rate</span><small>{metrics.sessions_completed} completed of {metrics.sessions_started} started</small></div>
            <div className="performance-secondary"><strong>{metrics.cta_clicks}</strong><span>CTA visits</span><small>{metrics.cta_ctr.toFixed(1)}% of {metrics.cta_views} views</small></div>
          </section>

          <section className="detail-grid">
            <div className="activity-section">
              <h2>What people focused on</h2>
              <div className="activity-list">
                {metrics.activity_breakdown.map((item) => (
                  <div className="activity-row" key={item.activity}>
                    <span>{item.activity.replace('_', ' ')}</span>
                    <div><i style={{ width: `${(item.sessions / maxActivity) * 100}%` }} /></div>
                    <strong>{item.sessions}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="principle-note">
              <span>What this measures</span>
              <p>Your brand backed deliberate focus—not 25 minutes of screen exposure.</p>
            </div>
          </section>

          <section className="recent-section">
            <div className="recent-heading"><h2>Recent sessions</h2><span>Anonymized activity</span></div>
            <div className="session-table" role="table" aria-label="Recent anonymized sponsored sessions">
              {metrics.recent_sessions.map((session, index) => (
                <div className="session-row" role="row" key={`${session.started_at}-${index}`}>
                  <strong role="cell">{session.activity.replace('_', ' ')}</strong>
                  <span role="cell">{Math.round(session.planned_duration_seconds / 60)} min</span>
                  <span role="cell" className={`session-state is-${session.status}`}>{session.status.replace('_', ' ')}</span>
                  <time role="cell" dateTime={session.completed_at || session.started_at}>{relativeTime(session.completed_at || session.started_at)}</time>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
