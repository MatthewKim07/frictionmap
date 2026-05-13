-- FrictionMap: Supabase Auth + profiles (run in SQL Editor after enabling Email auth in Dashboard).
-- Dashboard checklist:
--   1) Authentication → Providers: enable Email.
--   2) Authentication → URL configuration: add http://localhost:5173 and your production site to Redirect URLs.
--   3) Run this file in SQL Editor. First user to sign up becomes admin (see handle_new_user).
-- Links each auth.users row to org_role, approval status, and seniority for real RBAC in the app.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  org_role text not null default 'employee',
  account_status text not null default 'pending',
  requested_role text not null default 'employee',
  seniority text not null default 'mid',
  invited_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists requested_role text not null default 'employee',
  add column if not exists invited_at timestamptz,
  add column if not exists approved_at timestamptz;

alter table public.profiles
  alter column account_status set default 'pending';

alter table public.profiles
  drop constraint if exists profiles_org_role_check,
  add constraint profiles_org_role_check
    check (org_role in ('employee', 'manager', 'operations', 'admin', 'judge'));

alter table public.profiles
  drop constraint if exists profiles_account_status_check,
  add constraint profiles_account_status_check
    check (account_status in ('pending', 'active'));

alter table public.profiles
  drop constraint if exists profiles_requested_role_check,
  add constraint profiles_requested_role_check
    check (requested_role in ('admin', 'employee'));

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- First registered user becomes admin; later signups default to employee unless metadata overrides.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
  requested text;
  role text;
  status text;
begin
  select not exists (select 1 from public.profiles) into is_first;

  requested := coalesce(nullif(new.raw_user_meta_data->>'requested_role', ''), nullif(new.raw_user_meta_data->>'org_role', ''), 'employee');
  if requested not in ('admin', 'employee') then
    requested := 'employee';
  end if;

  if is_first then
    role := 'admin';
    status := 'active';
  else
    role := 'employee';
    status := 'pending';
  end if;

  insert into public.profiles (id, email, display_name, org_role, account_status, requested_role, seniority, approved_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(coalesce(new.email, 'user@local'), '@', 1)),
    role,
    status,
    requested,
    coalesce(nullif(new.raw_user_meta_data->>'seniority', ''), 'mid'),
    case when status = 'active' then now() else null end
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for users created before this migration (optional one-time).
insert into public.profiles (id, email, display_name, org_role, account_status, requested_role, seniority, approved_at)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'display_name', split_part(coalesce(u.email, 'user@local'), '@', 1)),
  case
    when not exists (select 1 from public.profiles p2 where p2.id <> u.id and p2.org_role = 'admin') then 'admin'
    else 'employee'
  end,
  case
    when not exists (select 1 from public.profiles p2 where p2.id <> u.id and p2.org_role = 'admin') then 'active'
    else 'pending'
  end,
  case
    when coalesce(u.raw_user_meta_data->>'requested_role', u.raw_user_meta_data->>'org_role') in ('admin', 'employee')
      then coalesce(u.raw_user_meta_data->>'requested_role', u.raw_user_meta_data->>'org_role')
    else 'employee'
  end,
  coalesce(nullif(u.raw_user_meta_data->>'seniority', ''), 'mid'),
  case
    when not exists (select 1 from public.profiles p2 where p2.id <> u.id and p2.org_role = 'admin') then now()
    else null
  end
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Existing installs before account_status should keep current admins active. Existing non-admins are treated as active invited users.
update public.profiles
set
  account_status = coalesce(nullif(account_status, ''), 'active'),
  requested_role = case when requested_role in ('admin', 'employee') then requested_role else 'employee' end,
  approved_at = case when account_status = 'active' and approved_at is null then now() else approved_at end;

alter table public.profiles enable row level security;

create or replace function public.current_user_is_profile_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles adm
    where adm.id = auth.uid()
      and adm.org_role in ('admin', 'judge')
      and adm.account_status = 'active'
  );
$$;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id
    or public.current_user_is_profile_admin()
  );

drop policy if exists "profiles_update_authenticated" on public.profiles;
drop policy if exists "profiles_update_admin_only" on public.profiles;
create policy "profiles_update_admin_only"
  on public.profiles for update
  to authenticated
  using (
    public.current_user_is_profile_admin()
  )
  with check (
    public.current_user_is_profile_admin()
  );
