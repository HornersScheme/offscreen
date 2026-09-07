import type { Metadata } from 'next';
import { AnalyticsScript } from '@/components/analytics-script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Offscreen Sponsor Dashboard',
  description: 'Private campaign reporting for Offscreen sponsors.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analyticsEnabled = process.env.NODE_ENV === 'production'
    && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
    && process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;

  return (
    <html lang="en">
      <body>{children}</body>
      {analyticsEnabled ? (
        <AnalyticsScript
          scriptUrl={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL!}
          websiteId={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID!}
          domains={process.env.NEXT_PUBLIC_UMAMI_DOMAINS}
        />
      ) : null}
    </html>
  );
}
