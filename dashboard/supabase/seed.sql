-- LOCAL DEVELOPMENT ONLY. Never run this file against production.
-- It creates a visible sponsor and campaign but deliberately does not invent users,
-- focus sessions, or production-looking performance metrics.

insert into public.sponsors (id, name, slug, website_url)
values (
  '10000000-0000-0000-0000-000000000001',
  'Pasly (local demo)',
  'pasly-local-demo',
  'https://example.com'
)
on conflict (id) do nothing;

insert into public.campaigns (
  id, sponsor_id, name, status, reward_amount, currency,
  budget_total, budget_available, budget_reserved, budget_spent
)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Local focus pilot',
  'active',
  0.10,
  'EUR',
  25.00,
  25.00,
  0.00,
  0.00
)
on conflict (id) do nothing;

-- After creating a local Auth user, connect it with:
-- insert into public.sponsor_members (sponsor_id, user_id, role)
-- values ('10000000-0000-0000-0000-000000000001', '<auth-user-uuid>', 'owner');

-- Reset only this seed data with:
-- delete from public.sponsors where id = '10000000-0000-0000-0000-000000000001';
