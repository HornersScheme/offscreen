# Offscreen sponsor dashboard

V1 reporting app for Offscreen pilot sponsors. It is a separate Next.js application intended for `dashboard.offscreenapp.com`; the existing consumer site remains unchanged.

## Architecture

- Next.js 16 App Router and TypeScript
- Supabase Auth with email/password signup, sign-in, and password recovery
- Supabase Postgres with RLS for sponsor isolation
- Server-rendered campaign reporting through a membership-checked database RPC
- Optional, production-only Umami analytics with event names only—no sponsor email, campaign ID, or Offscreen user data

The browser can read only its own membership, its sponsor, and that sponsor's campaign metadata. It receives no direct `SELECT` privilege on `focus_sessions` or `cta_events`. The `get_campaign_dashboard` RPC checks the authenticated membership and returns aggregates plus an anonymized eight-row activity feed. There is no service-role key in this app.

## Local development

Requires Node.js 22.13 or later.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. `.env.local` is ignored by Git and must never be committed.

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a legacy fallback. Do not add `SUPABASE_SERVICE_ROLE_KEY`; the dashboard neither needs nor reads it.

Optional Umami settings:

```text
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
NEXT_PUBLIC_UMAMI_WEBSITE_ID=<website-id>
NEXT_PUBLIC_UMAMI_DOMAINS=dashboard.offscreenapp.com
```

Analytics loads only in production. The app emits `sponsor_login_success`, `campaign_viewed`, and `campaign_switcher_used` without properties.

## Supabase schema

The migration is [`supabase/migrations/20260907133002_sponsor_dashboard_v1.sql`](supabase/migrations/20260907133002_sponsor_dashboard_v1.sql). It adds:

- `sponsors` and `sponsor_members`
- `campaigns` with balanced available/reserved/spent accounting
- sponsored `focus_sessions`
- aggregate-only `cta_events`
- RLS policies and the reporting RPC
- a trigger that reserves a reward on session start, settles it on completion, and releases it after an early end or failure

The target Offscreen Supabase project was not available through the connected workspace integration during implementation, so the migration was deliberately not applied to production. Before applying it, compare these concepts with the live schema. The migration fails if same-named tables already exist, which prevents silently creating a second representation. Reconcile against existing tables instead of renaming around a conflict.

With Supabase CLI authenticated and the correct project confirmed:

```bash
supabase link --workdir dashboard --project-ref <confirmed-project-ref>
supabase db diff --workdir dashboard --linked
supabase db push --workdir dashboard --dry-run
supabase db push --workdir dashboard
```

For local Supabase development, Docker must be running:

```bash
supabase start --workdir dashboard
supabase db reset --workdir dashboard
```

[`supabase/seed.sql`](supabase/seed.sql) is local-only and creates an obviously labeled demo sponsor and empty campaign. It never creates fake performance metrics. The reset statement is included at the bottom of that file.

### RLS and privacy model

- A member can select only their own `sponsor_members` row.
- Sponsor and campaign policies resolve access through that row.
- Raw session and CTA tables have RLS enabled and no privileges for `anon` or `authenticated`.
- The reporting function re-checks `auth.uid()` against the campaign's sponsor before reading raw data.
- The feed omits user IDs; metrics expose only campaign-level counts and durations.
- The `service_role` has explicit database privileges for trusted Offscreen backend/admin ingestion and continues to bypass RLS. That key belongs only in trusted infrastructure, never this dashboard or any `NEXT_PUBLIC_*` variable.

Sponsor A versus sponsor B access is enforced by both campaign RLS and the RPC membership check. A campaign UUID changed in the URL is matched against the already-authorized campaign list, and direct RPC calls for another sponsor raise an authorization error.

## Manual sponsor onboarding

1. Ask the sponsor to create an account from the dashboard signup page, or create/invite the user from Supabase Authentication. Signup creates only an Auth user; it never grants sponsor or campaign access.
2. Create the sponsor and keep its returned ID:

   ```sql
   insert into public.sponsors (name, slug, website_url)
   values ('Partner name', 'partner-slug', 'https://partner.example')
   returning id;
   ```

3. Copy the Auth user's UUID from Supabase Authentication and associate it:

   ```sql
   insert into public.sponsor_members (sponsor_id, user_id, role)
   values ('<sponsor-id>', '<auth-user-id>', 'owner');
   ```

4. Create the campaign. The four budget fields must balance:

   ```sql
   insert into public.campaigns (
     sponsor_id, name, status, reward_amount, currency,
     budget_total, budget_available, budget_reserved, budget_spent,
     starts_at, ends_at, cta_text, cta_url
   ) values (
     '<sponsor-id>', 'Spring focus pilot', 'draft', 0.10, 'EUR',
     25.00, 25.00, 0.00, 0.00,
     '2026-09-10T00:00:00Z', '2026-10-10T00:00:00Z',
     'Visit partner', 'https://partner.example'
   ) returning id;
   ```

5. Activate it only when the campaign is ready:

   ```sql
   update public.campaigns set status = 'active' where id = '<campaign-id>';
   ```

Use the trusted Offscreen backend/service role to create and settle sponsored sessions and CTA events. Do not give sponsors SQL access or the service-role credential.

## Auth configuration

In Supabase Auth URL Configuration:

- set the production site URL to `https://dashboard.offscreenapp.com`
- allow `https://dashboard.offscreenapp.com/auth/callback`
- add each Vercel preview callback pattern you intentionally support
- keep `http://localhost:3000/auth/callback` for local development only

Configure production SMTP before a pilot launch. Supabase's default email sender is rate-limited and intended for testing.

## Deploy to Vercel

Create a separate Vercel project from the same repository:

1. Import the repository into Vercel.
2. Set **Root Directory** to `dashboard`.
3. Keep the detected Next.js build settings.
4. Add the required Supabase environment variables to Production and Preview. Add Umami variables if desired.
5. Deploy and test the generated Vercel URL first.
6. Add the custom domain `dashboard.offscreenapp.com` in the Vercel project.
7. Add exactly the DNS record Vercel displays at the domain provider; do not guess the CNAME target.
8. Wait for Vercel to verify the domain and provision SSL, then test email/password sign-in on the final hostname.

No DNS changes are performed by this repository.

## Verification

Before release:

```bash
npm run lint
npm run typecheck
npm run build
```

After applying the migration to a non-production Supabase branch/project, use two sponsor users and confirm:

- each user sees only their sponsor and campaigns
- passing the other sponsor's campaign UUID returns “Campaign unavailable” in the UI and `42501` from the RPC
- direct REST selects on `focus_sessions` and `cta_events` fail for both users
- starting a reward-eligible session moves reward value from available to reserved
- completing it moves that value from reserved to spent
- ending or failing it returns the reserved value to available
- zero-session campaigns show the ready state and zero denominators do not inflate rates
- recent activity contains only activity, duration, status, and timestamps

## V1 limitations

- Offscreen admins create sponsors, users, memberships, and campaigns manually.
- Sponsors cannot edit campaigns, budgets, rewards, creatives, targeting, billing, or team members.
- Pause/resume is intentionally deferred until it can be aligned with production campaign/session concurrency rules.
- No raw exports, individual-user reporting, payment collection, or conversion attribution.
- One membership is displayed per login in V1; multi-organization switching is future work.
