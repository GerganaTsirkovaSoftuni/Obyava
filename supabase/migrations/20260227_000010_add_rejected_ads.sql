-- Simpler approach: Add Rejected status and create rejected_advertisements table
-- This creates a completely new approach without modifying the enum directly

-- Create rejected_advertisements table first
create table if not exists public.rejected_advertisements (
  advertisement_uuid uuid primary key,
  title text not null,
  description text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  rejection_date timestamptz not null default now(),
  rejection_reason text not null,
  constraint rejected_advertisements_reason_chk check (char_length(trim(rejection_reason)) > 0)
);

-- Enable RLS on rejected_advertisements
alter table public.rejected_advertisements enable row level security;

-- RLS Policy: Users can view their own rejected ads
create policy if not exists rejected_advertisements_select_own
on public.rejected_advertisements
for select
to authenticated
using (owner_id = auth.uid());

-- RLS Policy: Admins can view all rejected ads
create policy if not exists rejected_advertisements_select_admin
on public.rejected_advertisements
for select
to authenticated
using (public.is_admin(auth.uid()));

-- RLS Policy: Admins can insert rejected ads
create policy if not exists rejected_advertisements_insert_admin
on public.rejected_advertisements
for insert
to authenticated
with check (public.is_admin(auth.uid()));

-- RLS Policy: Admins can delete rejected ads
create policy if not exists rejected_advertisements_delete_admin
on public.rejected_advertisements
for delete
to authenticated
using (public.is_admin(auth.uid()));

-- Add indexes for faster lookups
create index if not exists rejected_advertisements_owner_id_idx on public.rejected_advertisements(owner_id);
create index if not exists rejected_advertisements_rejection_date_idx on public.rejected_advertisements(rejection_date);
create index if not exists rejected_advertisements_advertisement_uuid_idx on public.rejected_advertisements(advertisement_uuid);

