import { DashboardShell } from '@/components/dashboard-shell';
import { CampaignSwitcher } from '@/components/campaign-switcher';
import { getDashboardData } from '@/lib/dashboard-data';

type Props = { searchParams: Promise<{ campaign?: string; signed_in?: string }> };

function ShellHeader({ label }: { label: string }) {
  return (
    <header className="dashboard-header">
      <a className="wordmark" href="https://offscreenapp.com"><span className="wordmark-mark" aria-hidden="true" />Offscreen <span className="wordmark-section">/ Sponsors</span></a>
      <div className="header-account">
        <a href="/account/password">Password</a>
        <form action="/auth/signout" method="post"><button className="logout-button" type="submit">Log out</button></form>
      </div>
      <span className="sr-only">{label}</span>
    </header>
  );
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const data = await getDashboardData(params.campaign);

  if (data.state === 'ready') {
    return <DashboardShell {...data} signedIn={params.signed_in === '1'} />;
  }

  if (data.state === 'missing-membership') {
    return (
      <main className="dashboard-shell"><ShellHeader label="Membership required" /><section className="state-panel"><p className="eyebrow">Access pending</p><h1>Your sponsor account isn’t connected yet.</h1><p>Ask an Offscreen administrator to add this login to your sponsor organization.</p></section></main>
    );
  }

  if (data.state === 'empty') {
    return (
      <main className="dashboard-shell"><ShellHeader label={data.sponsor.name} /><section className="state-panel"><p className="eyebrow">{data.sponsor.name}</p><h1>No active campaigns.</h1><p>Your Offscreen campaigns will appear here.</p></section></main>
    );
  }

  if (data.state === 'unavailable') {
    return (
      <main className="dashboard-shell"><ShellHeader label={data.sponsor.name} /><section className="state-panel"><p className="eyebrow">Campaign unavailable</p><h1>That campaign can’t be opened.</h1><p>Choose one of the campaigns assigned to your sponsor account.</p><CampaignSwitcher campaigns={data.campaigns} selectedId={data.campaigns[0]?.id ?? ''} /></section></main>
    );
  }

  return (
    <main className="dashboard-shell"><ShellHeader label="Reporting unavailable" /><section className="state-panel"><p className="eyebrow">Temporary issue</p><h1>Reporting is unavailable.</h1><p>We couldn’t load campaign data. Refresh the page or try again shortly.</p></section></main>
  );
}
