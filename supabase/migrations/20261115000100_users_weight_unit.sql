-- Preferred unit for showing weights: 'lb' (default) or 'kg'.
-- Weights are always stored in pounds; the app converts for display and
-- input, so existing sessions, PRs and body weights need no migration.
alter table public.users
  add column if not exists weight_unit text not null default 'lb'
  check (weight_unit in ('lb', 'kg'));

grant update (weight_unit) on public.users to authenticated;
