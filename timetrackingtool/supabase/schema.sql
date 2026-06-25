-- ESTEEM Operations Platform — Full Schema
-- Paste this entire file into: Supabase SQL Editor → New → Run

-- ─── TABLES ──────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'freelancer' check (role in ('owner','operations','freelancer')),
  avatar_initials text not null default '??',
  specialisation text,
  hourly_rate numeric(10,2),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  name text not null,
  service_type text not null default '',
  budget numeric(12,2),
  billable boolean not null default true,
  status text not null default 'active' check (status in ('active','completed','on-hold','at-risk')),
  description text not null default '',
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.project_assignments (
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (project_id, user_id)
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  date date not null,
  start_time time,
  end_time time,
  hours numeric(5,2) not null default 0,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','paid')),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  amount numeric(10,2),
  created_at timestamptz not null default now()
);

create table if not exists public.time_off (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('vacation','sick')),
  start_date date not null,
  end_date date not null,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  submitted_at timestamptz not null default now(),
  responded_at timestamptz,
  responded_by uuid references public.profiles(id)
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  account_holder text not null,
  bank_name text not null,
  sort_code text not null,
  account_number text not null,
  iban text,
  payment_ref text,
  updated_at timestamptz not null default now()
);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  initials text;
  name_parts text[];
begin
  name_parts := string_to_array(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ');
  initials := upper(left(coalesce(name_parts[1], new.email), 1)) ||
              upper(left(coalesce(name_parts[2], ''), 1));
  insert into public.profiles (id, email, full_name, role, avatar_initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'freelancer'),
    case when initials = '' then upper(left(new.email, 2)) else initials end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── ENABLE RLS ───────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.time_entries enable row level security;
alter table public.time_off enable row level security;
alter table public.bank_accounts enable row level security;

-- ─── RLS POLICIES ─────────────────────────────────────────────────────────────

-- Profiles: own row always visible; owner/ops see everyone
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (
  auth.uid() = id or
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','operations'))
);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Projects: freelancers see only assigned projects; owner/ops see all
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','operations'))
  or exists (select 1 from public.project_assignments pa where pa.project_id = id and pa.user_id = auth.uid())
);
drop policy if exists "projects_write" on public.projects;
create policy "projects_write" on public.projects for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- Project assignments
drop policy if exists "assignments_select" on public.project_assignments;
create policy "assignments_select" on public.project_assignments for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','operations'))
  or user_id = auth.uid()
);
drop policy if exists "assignments_write" on public.project_assignments;
create policy "assignments_write" on public.project_assignments for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- Time entries: freelancers own rows; owner/ops see all; owner approves/pays
drop policy if exists "time_entries_select" on public.time_entries;
create policy "time_entries_select" on public.time_entries for select using (
  user_id = auth.uid() or
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','operations'))
);
drop policy if exists "time_entries_insert" on public.time_entries;
create policy "time_entries_insert" on public.time_entries for insert with check (user_id = auth.uid());
drop policy if exists "time_entries_update" on public.time_entries;
create policy "time_entries_update" on public.time_entries for update using (
  (user_id = auth.uid() and status = 'draft') or
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- Time off: freelancers own rows; owner/ops see all; owner approves
drop policy if exists "time_off_select" on public.time_off;
create policy "time_off_select" on public.time_off for select using (
  user_id = auth.uid() or
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','operations'))
);
drop policy if exists "time_off_insert" on public.time_off;
create policy "time_off_insert" on public.time_off for insert with check (user_id = auth.uid());
drop policy if exists "time_off_update" on public.time_off;
create policy "time_off_update" on public.time_off for update using (
  (user_id = auth.uid() and status = 'pending') or
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- Bank accounts: own row + owner role can view; only holder can write
drop policy if exists "bank_accounts_select" on public.bank_accounts;
create policy "bank_accounts_select" on public.bank_accounts for select using (
  user_id = auth.uid() or
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);
drop policy if exists "bank_accounts_write" on public.bank_accounts;
create policy "bank_accounts_write" on public.bank_accounts for all using (user_id = auth.uid());


-- ─── PROJECT INSERT TEMPLATE ──────────────────────────────────────────────────
-- Copy and adapt this block to insert your real projects.
-- billable = true  → client project with a budget
-- billable = false → internal project, budget can be omitted (NULL)

/*
insert into public.projects (client_name, name, service_type, budget, billable, status, description, start_date, end_date)
values
  ('Client Name',  'Project Name',  'WCAG 2.2 Audit',   25000, true,  'active',    'Description here', '2026-01-01', '2026-06-30'),
  ('Client Name',  'Project Name',  'Inclusive Design',  null,  false, 'active',    'Internal project',  '2026-01-01', null);
*/
