-- =========================================================
-- Obyava: Second migration
-- Adds profiles, advertisement location, status workflow rules,
-- archive snapshot automation, and performance indexes.
-- Safe/idempotent: no destructive table/data operations.
-- =========================================================

-- =============================
-- 1) Profiles table
-- =============================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_chk check (role in ('user', 'admin'))
);

-- Keep existing rows aligned if table pre-exists and role was nullable
alter table public.profiles
  alter column role set default 'user';

update public.profiles
set role = 'user'
where role is null;

alter table public.profiles
  alter column role set not null;

alter table public.profiles enable row level security;

-- Reusable updated_at trigger function (shared if already present)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Profiles RLS policies (idempotent create via catalog checks)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own_or_admin'
  ) then
    create policy profiles_select_own_or_admin
    on public.profiles
    for select
    to authenticated
    using (id = auth.uid() or public.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own_or_admin'
  ) then
    create policy profiles_update_own_or_admin
    on public.profiles
    for update
    to authenticated
    using (id = auth.uid() or public.is_admin(auth.uid()))
    with check (id = auth.uid() or public.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own_or_admin'
  ) then
    create policy profiles_insert_own_or_admin
    on public.profiles
    for insert
    to authenticated
    with check (id = auth.uid() or public.is_admin(auth.uid()));
  end if;
end
$$;

-- =============================
-- 2) Advertisements: location
-- =============================
alter table public.advertisements
  add column if not exists location text;

-- =============================
-- 3) Status workflow enforcement
-- =============================
-- Existing enum values from migration #1:
-- Draft | Pending | Published | Archived
-- Business rules enforced:
-- - Non-admin INSERT: only Draft/Pending
-- - Non-admin cannot transition status to Published/Archived
-- - Admin can transition to Published/Archived

create or replace function public.enforce_advertisement_status_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_system_role boolean;
  is_user_admin boolean;
begin
  is_system_role := current_user in ('postgres', 'supabase_admin');
  is_user_admin := public.is_admin(auth.uid()) or auth.role() = 'service_role' or is_system_role;

  if tg_op = 'INSERT' then
    if not is_user_admin and new.status not in ('Draft', 'Pending') then
      raise exception 'Non-admin users can create ads only with Draft or Pending status';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if not is_user_admin then
      if old.status is distinct from new.status and new.status in ('Published', 'Archived') then
        raise exception 'Only admin users can set status to Published or Archived';
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_advertisement_status_workflow on public.advertisements;
create trigger trg_enforce_advertisement_status_workflow
before insert or update on public.advertisements
for each row
execute function public.enforce_advertisement_status_workflow();

-- Tighten RLS insert/update policies to align with workflow intent
-- (Safe replacement of policies from migration #1)
drop policy if exists advertisements_insert_owner_or_admin on public.advertisements;
create policy advertisements_insert_owner_or_admin
on public.advertisements
for insert
to authenticated
with check (
  owner_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists advertisements_update_owner_or_admin on public.advertisements;
create policy advertisements_update_owner_or_admin
on public.advertisements
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  owner_id = auth.uid()
  or public.is_admin(auth.uid())
);

-- =============================
-- 4) Archive snapshot automation
-- =============================
-- On status transition to Archived, insert immutable snapshot once.
create or replace function public.snapshot_advertisement_on_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Archived'
     and old.status is distinct from new.status then
    insert into public.advertisement_archive (
      advertisement_uuid,
      title,
      description,
      owner_id,
      archived_at
    )
    values (
      new.uuid,
      new.title,
      new.description,
      new.owner_id,
      coalesce(new.archived_at, now())
    )
    on conflict (advertisement_uuid) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_snapshot_advertisement_on_archive on public.advertisements;
create trigger trg_snapshot_advertisement_on_archive
after update on public.advertisements
for each row
execute function public.snapshot_advertisement_on_archive();

-- Make archive immutable (no updates/deletes after snapshot insert)
create or replace function public.prevent_archive_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Archive snapshot is immutable';
end;
$$;

drop trigger if exists trg_prevent_archive_update on public.advertisement_archive;
create trigger trg_prevent_archive_update
before update on public.advertisement_archive
for each row
execute function public.prevent_archive_mutation();

drop trigger if exists trg_prevent_archive_delete on public.advertisement_archive;
create trigger trg_prevent_archive_delete
before delete on public.advertisement_archive
for each row
execute function public.prevent_archive_mutation();

-- Keep archive policies compatible with immutability intent
-- (admin can read; inserts are performed by archive trigger in admin transitions)
drop policy if exists advertisement_archive_admin_update on public.advertisement_archive;
drop policy if exists advertisement_archive_admin_delete on public.advertisement_archive;

-- =============================
-- 5) Performance indexes
-- =============================
create index if not exists idx_advertisements_status
  on public.advertisements(status);

create index if not exists idx_advertisements_category_id
  on public.advertisements(category_id);

create index if not exists idx_advertisements_owner_id
  on public.advertisements(owner_id);

create index if not exists idx_advertisements_location
  on public.advertisements(location);

-- The table already has a unique(advertisement_uuid, position),
-- but an explicit index is requested.
create index if not exists idx_advertisement_images_ad_uuid_position
  on public.advertisement_images(advertisement_uuid, position);
