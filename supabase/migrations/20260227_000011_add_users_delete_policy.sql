-- Add missing delete policy for public.users
-- Without this policy, delete operations return 0 affected rows even for admins.

alter table public.users enable row level security;

drop policy if exists users_delete_admin on public.users;
create policy users_delete_admin
on public.users
for delete
to authenticated
using (
  public.is_admin(auth.uid())
  and id <> auth.uid()
);
