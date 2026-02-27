-- Fix admin role source mismatch.
-- UI checks public.users.role, while RLS checks public.is_admin() (previously only user_roles).
-- This function now considers BOTH:
--   1) public.user_roles + public.roles mapping
--   2) public.users.role = 'admin'

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = check_user_id
      and r.name = 'admin'
  )
  or exists (
    select 1
    from public.users u
    where u.id = check_user_id
      and u.role = 'admin'
  );
$$;
