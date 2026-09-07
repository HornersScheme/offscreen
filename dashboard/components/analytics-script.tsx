'use client';

import Script from 'next/script';
import { flushAnalytics } from '@/lib/analytics';

type Props = {
  domains?: string;
  scriptUrl: string;
  websiteId: string;
};

export function AnalyticsScript({ domains, scriptUrl, websiteId }: Props) {
  return (
    <Script
      defer
      src={scriptUrl}
      data-website-id={websiteId}
      data-domains={domains}
      data-do-not-track="true"
      strategy="afterInteractive"
      onReady={flushAnalytics}
    />
  );
}
