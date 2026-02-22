-- Add email column to public.users for public seller contact links
alter table if exists public.users
add column if not exists email text;

-- Backfill from auth.users
update public.users u
set email = au.email
from auth.users au
where au.id = u.id
  and (u.email is null or u.email = '');

-- Optional: keep emails unique when present
create unique index if not exists users_email_unique_idx
on public.users (email)
where email is not null;
