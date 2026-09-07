'use client';

declare global {
  interface Window {
    umami?: { track: (name: string) => void };
    offscreenDashboardAnalytics?: string[];
  }
}

const allowedEvents = new Set([
  'sponsor_login_success',
  'campaign_viewed',
  'campaign_switcher_used',
]);

export function trackEvent(name: string) {
  if (!allowedEvents.has(name)) return;
  if (typeof window.umami?.track === 'function') {
    window.umami.track(name);
    return;
  }
  window.offscreenDashboardAnalytics ||= [];
  window.offscreenDashboardAnalytics.push(name);
}

export function flushAnalytics() {
  if (typeof window.umami?.track !== 'function') return;
  const pending = window.offscreenDashboardAnalytics || [];
  pending.splice(0).forEach((name) => window.umami?.track(name));
}
