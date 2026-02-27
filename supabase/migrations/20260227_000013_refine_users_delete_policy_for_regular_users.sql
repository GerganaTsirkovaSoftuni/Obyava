-- Refine users delete policy:
-- Any admin can delete accounts with current role = 'user' (regular),
-- regardless of account history (e.g., former admins now demoted).
-- Admin accounts themselves remain protected.

alter table public.users enable row level security;

drop policy if exists users_delete_admin on public.users;
create policy users_delete_admin
on public.users
for delete
to authenticated
using (
  public.is_admin(auth.uid())
  and id <> auth.uid()
  and role = 'user'
);
