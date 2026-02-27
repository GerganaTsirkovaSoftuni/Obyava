-- HOTFIX: Admin user deletion flow
-- This migration is self-contained and idempotent.
-- It fixes:
-- 1) is_admin role-source mismatch (user_roles + users.role)
-- 2) missing/incorrect users delete policy
-- 3) adds security-definer RPC for robust admin deletion

-- 1) Ensure is_admin works for both role sources
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

-- 2) Ensure delete policy exists and matches business rules
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

-- 3) Robust RPC delete entrypoint (bypasses table-RLS ambiguity)
create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if not public.is_admin(auth.uid()) then
    raise exception 'not_admin';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'cannot_delete_self';
  end if;

  select u.role into target_role
  from public.users u
  where u.id = target_user_id;

  if target_role is null then
    raise exception 'user_not_found';
  end if;

  if target_role <> 'user' then
    raise exception 'target_must_be_regular_user';
  end if;

  delete from public.users
  where id = target_user_id
    and role = 'user';

  if not found then
    raise exception 'delete_blocked';
  end if;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;
