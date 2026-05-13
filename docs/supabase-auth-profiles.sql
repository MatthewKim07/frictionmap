-- FrictionMap: Supabase Auth + profiles (run in SQL Editor after enabling Email auth in Dashboard).
-- Dashboard checklist:
--   1) Authentication → Providers: enable Email (and Google if you use Google sign-in).
--   2) Authentication → URL configuration: add http://localhost:5173 and your production site to Redirect URLs.
--   3) Run this file in SQL Editor. First user to sign up becomes admin (see handle_new_user).
-- Links each auth.users row to org_role + seniority for real RBAC in the app.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  org_role text not null default 'employee',
  seniority text not null default 'mid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  role text;
begin
  select not exists (select 1 from public.profiles) into is_first;
  if is_first then
    role := 'admin';
  else
    role := coalesce(nullif(new.raw_user_meta_data->>'org_role', ''), 'employee');
  end if;

  insert into public.profiles (id, email, display_name, org_role, seniority)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(coalesce(new.email, 'user@local'), '@', 1)),
    role,
    coalesce(nullif(new.raw_user_meta_data->>'seniority', ''), 'mid')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for users created before this migration (optional one-time).
insert into public.profiles (id, email, display_name, org_role, seniority)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'display_name', split_part(coalesce(u.email, 'user@local'), '@', 1)),
  'employee',
  'mid'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles adm
      where adm.id = auth.uid()
        and adm.org_role in ('admin', 'judge')
    )
  );

drop policy if exists "profiles_update_authenticated" on public.profiles;
create policy "profiles_update_authenticated"
  on public.profiles for update
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles adm
      where adm.id = auth.uid()
        and adm.org_role in ('admin', 'judge')
    )
  )
  with check (
    auth.uid() = id
    or exists (
      select 1 from public.profiles adm
      where adm.id = auth.uid()
        and adm.org_role in ('admin', 'judge')
    )
  );
