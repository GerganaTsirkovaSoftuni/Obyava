-- Restrict advertisement creation to regular (non-admin) users only.
-- Admins remain moderators: they can still SELECT/UPDATE/DELETE via existing policies.

-- Replace only the INSERT policy for advertisements.
drop policy if exists advertisements_insert_owner_or_admin on public.advertisements;

create policy advertisements_insert_owner_or_admin
on public.advertisements
for insert
to authenticated
with check (
  -- A user can create only their own advertisement
  owner_id = auth.uid()
  -- And the current user must NOT have the admin role
  and not exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = 'admin'
  )
);
