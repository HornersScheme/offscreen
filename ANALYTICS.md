# Offscreen analytics

Umami loads only in production when these public environment variables are set:

- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
- `NEXT_PUBLIC_UMAMI_SCRIPT_URL`
- `NEXT_PUBLIC_UMAMI_DOMAINS`

The tracker records pageviews automatically. Do not add manual pageview calls, because that would double-count visits.

Custom events must go through `trackEvent` in `analytics.js`. Event properties are allowlisted there so contact details and other PII cannot be sent to Umami.

Consumer CTAs use one `cta_clicked` event with `cta` and `location` properties. Sponsor-funnel events use explicit names so the primary and secondary sponsor journeys can be measured separately.

Local development never sends Umami data. Production tracking is restricted to the domains configured in `NEXT_PUBLIC_UMAMI_DOMAINS` and respects visitors' Do Not Track setting.
