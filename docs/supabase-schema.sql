-- FrictionMap Supabase schema (hackathon baseline)
-- Apply in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.friction_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null,
  team text not null,
  process text not null,
  time_lost_hours numeric not null,
  frequency text not null,
  severity text not null,
  suggestion text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id text primary key,
  average_hourly_cost numeric not null default 50,
  selected_scenario text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_friction_reports_category on public.friction_reports(category);
create index if not exists idx_friction_reports_team on public.friction_reports(team);
create index if not exists idx_friction_reports_status on public.friction_reports(status);
create index if not exists idx_friction_reports_severity on public.friction_reports(severity);
create index if not exists idx_friction_reports_created_at on public.friction_reports(created_at desc);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_friction_reports_updated_at on public.friction_reports;
create trigger trg_friction_reports_updated_at
before update on public.friction_reports
for each row
execute function public.set_updated_at();

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

-- RLS notes:
-- For hackathon/demo mode you can leave auth and policies for later.
-- Option A: disable RLS during local demo validation.
--   alter table public.friction_reports disable row level security;
--   alter table public.app_settings disable row level security;
--
-- Option B: enable RLS and add permissive policies temporarily.
--   alter table public.friction_reports enable row level security;
--   create policy "demo full access reports" on public.friction_reports for all using (true) with check (true);
--   alter table public.app_settings enable row level security;
--   create policy "demo full access settings" on public.app_settings for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Ready-to-run (demo only): permissive RLS so the anon client can CRUD.
-- Remove or replace these policies before production; tighten by user/tenant.
-- Safe to re-run: drops then recreates the demo policies.
-- ---------------------------------------------------------------------------
alter table public.friction_reports enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "demo_friction_reports_all" on public.friction_reports;
create policy "demo_friction_reports_all"
  on public.friction_reports
  for all
  using (true)
  with check (true);

drop policy if exists "demo_app_settings_all" on public.app_settings;
create policy "demo_app_settings_all"
  on public.app_settings
  for all
  using (true)
  with check (true);

-- Optional: Supabase Auth + org roles in public.profiles — run docs/supabase-auth-profiles.sql after enabling Auth providers.
