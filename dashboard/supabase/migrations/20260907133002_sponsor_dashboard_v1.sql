-- Offscreen sponsor dashboard V1.
-- Fail closed if an equivalent model already exists: reconcile it manually instead of
-- creating duplicate campaign/session concepts.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  website_url text,
  created_at timestamptz not null default now()
);

create table public.sponsor_members (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'viewer')),
  created_at timestamptz not null default now(),
  unique (sponsor_id, user_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 160),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'budget_exhausted', 'completed')),
  reward_amount numeric(12, 2) not null check (reward_amount > 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  budget_total numeric(12, 2) not null check (budget_total >= 0),
  budget_available numeric(12, 2) not null check (budget_available >= 0),
  budget_reserved numeric(12, 2) not null default 0 check (budget_reserved >= 0),
  budget_spent numeric(12, 2) not null default 0 check (budget_spent >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  cta_text text check (cta_text is null or length(cta_text) <= 120),
  cta_url text,
  created_at timestamptz not null default now(),
  constraint campaigns_budget_balanced check (budget_available + budget_reserved + budget_spent = budget_total),
  constraint campaigns_date_order check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  activity text not null check (activity in ('coding', 'work', 'studying', 'writing', 'reading', 'other')),
  planned_duration_seconds integer not null check (planned_duration_seconds between 60 and 86400),
  started_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('active', 'completed', 'ended_early', 'failed')),
  reward_amount numeric(12, 2) not null check (reward_amount >= 0),
  reward_eligible boolean not null default true,
  created_at timestamptz not null default now(),
  constraint focus_sessions_schedule_order check (scheduled_end_at > started_at),
  constraint focus_sessions_completion_time check (completed_at is null or completed_at >= started_at),
  constraint focus_sessions_completed_at_required check (status <> 'completed' or completed_at is not null)
);

create table public.cta_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  focus_session_id uuid not null references public.focus_sessions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('view', 'click')),
  created_at timestamptz not null default now()
);

create index sponsor_members_user_id_idx on public.sponsor_members(user_id);
create index campaigns_sponsor_id_status_idx on public.campaigns(sponsor_id, status);
create index focus_sessions_campaign_started_idx on public.focus_sessions(campaign_id, started_at desc);
create index focus_sessions_campaign_status_idx on public.focus_sessions(campaign_id, status);
create index focus_sessions_campaign_user_idx on public.focus_sessions(campaign_id, user_id);
create index cta_events_campaign_type_idx on public.cta_events(campaign_id, event_type);

alter table public.sponsors enable row level security;
alter table public.sponsor_members enable row level security;
alter table public.campaigns enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.cta_events enable row level security;

revoke all on table public.sponsors from anon, authenticated;
revoke all on table public.sponsor_members from anon, authenticated;
revoke all on table public.campaigns from anon, authenticated;
revoke all on table public.focus_sessions from anon, authenticated;
revoke all on table public.cta_events from anon, authenticated;

-- Administrative ingestion remains server-only. The service role bypasses RLS,
-- but still receives explicit privileges so the setup does not depend on defaults.
grant usage on schema public, private to service_role;
grant all on table public.sponsors, public.sponsor_members, public.campaigns,
  public.focus_sessions, public.cta_events to service_role;

grant select (id, name, slug, logo_url, website_url, created_at)
  on public.sponsors to authenticated;
grant select (id, sponsor_id, user_id, role, created_at)
  on public.sponsor_members to authenticated;
grant select (
  id, sponsor_id, name, status, reward_amount, currency, budget_total,
  budget_available, budget_reserved, budget_spent, starts_at, ends_at,
  cta_text, cta_url, created_at
) on public.campaigns to authenticated;

create policy "Members can read their own memberships"
on public.sponsor_members
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Members can read their sponsor"
on public.sponsors
for select
to authenticated
using (
  exists (
    select 1
    from public.sponsor_members sm
    where sm.sponsor_id = sponsors.id
      and sm.user_id = (select auth.uid())
  )
);

create policy "Members can read their campaigns"
on public.campaigns
for select
to authenticated
using (
  exists (
    select 1
    from public.sponsor_members sm
    where sm.sponsor_id = campaigns.sponsor_id
      and sm.user_id = (select auth.uid())
  )
);

-- Keep campaign accounting consistent as sessions move between active and settled states.
create function private.reconcile_focus_session_budget()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_reserved numeric(12, 2) := 0;
  old_spent numeric(12, 2) := 0;
  new_reserved numeric(12, 2) := 0;
  new_spent numeric(12, 2) := 0;
  reserved_delta numeric(12, 2);
  spent_delta numeric(12, 2);
begin
  if tg_op = 'UPDATE' and old.campaign_id <> new.campaign_id then
    raise exception 'A focus session cannot change campaigns' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and old.reward_eligible then
    old_reserved := case when old.status = 'active' then old.reward_amount else 0 end;
    old_spent := case when old.status = 'completed' then old.reward_amount else 0 end;
  end if;

  if new.reward_eligible then
    new_reserved := case when new.status = 'active' then new.reward_amount else 0 end;
    new_spent := case when new.status = 'completed' then new.reward_amount else 0 end;
  end if;

  reserved_delta := new_reserved - old_reserved;
  spent_delta := new_spent - old_spent;

  update public.campaigns
  set
    budget_available = budget_available - reserved_delta - spent_delta,
    budget_reserved = budget_reserved + reserved_delta,
    budget_spent = budget_spent + spent_delta,
    status = case
      when budget_available - reserved_delta - spent_delta = 0
        and status in ('active', 'paused')
      then 'budget_exhausted'
      else status
    end
  where id = new.campaign_id
    and budget_available - reserved_delta - spent_delta >= 0
    and budget_reserved + reserved_delta >= 0
    and budget_spent + spent_delta >= 0;

  if not found then
    raise exception 'Campaign budget is unavailable for this session' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.reconcile_focus_session_budget() from public, anon, authenticated;
grant execute on function private.reconcile_focus_session_budget() to service_role;

create trigger reconcile_focus_session_budget
before insert or update of campaign_id, status, reward_amount, reward_eligible
on public.focus_sessions
for each row execute function private.reconcile_focus_session_budget();

-- The privileged function stays outside the exposed schema and performs its own
-- membership check before reading raw sessions or CTA events.
create function private.get_campaign_dashboard(p_campaign_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  is_authorized boolean := false;
begin
  select exists (
    select 1
    from public.campaigns c
    join public.sponsor_members sm on sm.sponsor_id = c.sponsor_id
    where c.id = p_campaign_id
      and sm.user_id = (select auth.uid())
      and (select auth.uid()) is not null
  ) into is_authorized;

  if not is_authorized then
    raise exception 'Campaign unavailable' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'sessions_started', count(fs.id),
    'sessions_completed', count(fs.id) filter (where fs.status = 'completed'),
    'completion_rate', coalesce(
      round(100.0 * count(fs.id) filter (where fs.status = 'completed') / nullif(count(fs.id), 0), 1),
      0
    ),
    'unique_users', count(distinct fs.user_id),
    'focus_seconds_completed', coalesce(sum(
      greatest(0, extract(epoch from fs.completed_at - fs.started_at))
    ) filter (where fs.status = 'completed'), 0),
    'cta_views', (
      select count(*) from public.cta_events ce
      where ce.campaign_id = p_campaign_id and ce.event_type = 'view'
    ),
    'cta_clicks', (
      select count(*) from public.cta_events ce
      where ce.campaign_id = p_campaign_id and ce.event_type = 'click'
    ),
    'cta_ctr', coalesce(round(100.0 * (
      select count(*) from public.cta_events ce
      where ce.campaign_id = p_campaign_id and ce.event_type = 'click'
    ) / nullif((
      select count(*) from public.cta_events ce
      where ce.campaign_id = p_campaign_id and ce.event_type = 'view'
    ), 0), 1), 0),
    'activity_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object('activity', activity, 'sessions', sessions) order by sessions desc, activity)
      from (
        select activity, count(*) as sessions
        from public.focus_sessions
        where campaign_id = p_campaign_id
        group by activity
      ) breakdown
    ), '[]'::jsonb),
    'recent_sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'activity', recent.activity,
        'planned_duration_seconds', recent.planned_duration_seconds,
        'started_at', recent.started_at,
        'completed_at', recent.completed_at,
        'status', recent.status
      ) order by recent.started_at desc)
      from (
        select activity, planned_duration_seconds, started_at, completed_at, status
        from public.focus_sessions
        where campaign_id = p_campaign_id
        order by started_at desc
        limit 8
      ) recent
    ), '[]'::jsonb)
  )
  into result
  from public.focus_sessions fs
  where fs.campaign_id = p_campaign_id;

  return result;
end;
$$;

revoke all on function private.get_campaign_dashboard(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.get_campaign_dashboard(uuid) to authenticated;
grant execute on function private.get_campaign_dashboard(uuid) to service_role;

create function public.get_campaign_dashboard(p_campaign_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_campaign_dashboard(p_campaign_id);
$$;

revoke all on function public.get_campaign_dashboard(uuid) from public, anon;
grant execute on function public.get_campaign_dashboard(uuid) to authenticated;
grant execute on function public.get_campaign_dashboard(uuid) to service_role;

comment on function public.get_campaign_dashboard(uuid) is
  'Returns sponsor-authorized aggregate campaign metrics and an anonymized recent-session feed.';
