'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

export function DashboardEvents({ campaignId, signedIn }: { campaignId: string; signedIn: boolean }) {
  useEffect(() => {
    trackEvent('campaign_viewed');
  }, [campaignId]);

  useEffect(() => {
    if (!signedIn) return;
    trackEvent('sponsor_login_success');
    const url = new URL(window.location.href);
    url.searchParams.delete('signed_in');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }, [signedIn]);

  return null;
}
