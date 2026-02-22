-- =========================================================
-- Assign Admin Role to admin@gmail.com
-- =========================================================
-- Run this after creating the admin user in Supabase Dashboard
-- Email: admin@gmail.com
-- Password: Test1234
-- =========================================================

begin;

-- Get the admin user's ID and assign admin role
with admin_user as (
  select id, email from auth.users where email = 'admin@gmail.com'
),
admin_role as (
  select id from public.roles where name = 'admin'
)
insert into public.user_roles (user_id, role_id, assigned_at)
select admin_user.id, admin_role.id, now()
from admin_user, admin_role
on conflict (user_id, role_id) do nothing;

-- Create/update user profile with admin role
insert into public.users (id, email, full_name, phone, role, created_at, updated_at)
select id, email, 'Administrator', '+1234567890', 'admin', now(), now()
from auth.users
where email = 'admin@gmail.com'
on conflict (id) do update
set role = 'admin', 
    full_name = 'Administrator',
    updated_at = now();

commit;

-- Verify the admin user was created successfully
select 
  u.id,
  u.email,
  u.full_name,
  u.role,
  r.name as role_name
from public.users u
left join public.user_roles ur on ur.user_id = u.id
left join public.roles r on r.id = ur.role_id
where u.email = 'admin@gmail.com';
