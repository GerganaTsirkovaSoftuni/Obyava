-- =========================================================
-- Obyava: Rename application profile table
-- IMPORTANT:
-- - auth.users (Supabase-managed) remains unchanged and is the auth source of truth.
-- - public.users is the application-level profile table (renamed from public.profiles).
-- =========================================================

-- 1) Rename table (data-preserving refactor)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'users'
  ) then
    alter table public.profiles rename to users;
  end if;
end
$$;

-- 2) Keep RLS enabled on the renamed table
alter table if exists public.users enable row level security;

-- 3) Rename constraints from profiles_* to users_* (if they exist)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_pkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users rename constraint profiles_pkey to users_pkey;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_id_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users rename constraint profiles_id_fkey to users_id_fkey;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_chk'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users rename constraint profiles_role_chk to users_role_chk;
  end if;
end
$$;

-- 4) Rename trigger to match new table name
-- Trigger function public.set_updated_at() remains shared and unchanged.
do $$
begin
  if exists (
    select 1
    from information_schema.triggers
    where trigger_schema = 'public'
      and event_object_table = 'users'
      and trigger_name = 'set_profiles_updated_at'
  ) then
    alter trigger set_profiles_updated_at on public.users rename to set_users_updated_at;
  end if;
end
$$;

-- 5) Recreate policies on public.users with updated naming/references
-- Existing policies moved with the table rename, but we replace them for consistency.
drop policy if exists profiles_select_own_or_admin on public.users;
drop policy if exists profiles_update_own_or_admin on public.users;
drop policy if exists profiles_insert_own_or_admin on public.users;

drop policy if exists users_select_own_or_admin on public.users;
create policy users_select_own_or_admin
on public.users
for select
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists users_update_own_or_admin on public.users;
create policy users_update_own_or_admin
on public.users
for update
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists users_insert_own_or_admin on public.users;
create policy users_insert_own_or_admin
on public.users
for insert
to authenticated
with check (id = auth.uid() or public.is_admin(auth.uid()));

-- Note:
-- Foreign keys from other tables are not changed because current schema does not
-- reference public.profiles directly; auth.users remains referenced where required.
