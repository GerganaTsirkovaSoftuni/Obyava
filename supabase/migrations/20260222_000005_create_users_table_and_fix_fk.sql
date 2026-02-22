-- =========================================================
-- Create public.users table and fix advertisements foreign key
-- This allows PostgREST to properly traverse relationships
-- =========================================================

-- Create public.users table if it doesn't exist
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on users table
alter table public.users enable row level security;

-- Create trigger for updated_at
drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

-- Drop the old foreign key constraint from advertisements table
alter table public.advertisements
drop constraint if exists advertisements_owner_id_fkey;

-- Add new foreign key constraint to public.users
alter table public.advertisements
add constraint advertisements_owner_id_fkey
foreign key (owner_id)
references public.users(id) on delete cascade;

-- Create RLS policies for users table
create policy users_select_own_or_admin
on public.users
for select
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()));

create policy users_update_own_or_admin
on public.users
for update
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

create policy users_insert_own_or_admin
on public.users
for insert
to authenticated
with check (id = auth.uid() or public.is_admin(auth.uid()));

