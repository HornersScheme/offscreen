'use client';

import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

export function CampaignSwitcher({ campaigns, selectedId }: {
  campaigns: Array<{ id: string; name: string }>;
  selectedId: string;
}) {
  const router = useRouter();
  if (campaigns.length < 2) return null;

  return (
    <label className="campaign-switcher">
      <span>Campaign</span>
      <select
        value={selectedId}
        onChange={(event) => {
          trackEvent('campaign_switcher_used');
          router.push(`/dashboard?campaign=${encodeURIComponent(event.target.value)}`);
        }}
      >
        {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
      </select>
    </label>
  );
}
