-- Add ad condition (new/used), backfill existing ads with random values,
-- and remove unused avatar_url from users table.

alter table public.advertisements
add column if not exists item_condition text;

update public.advertisements
set item_condition = case when random() < 0.5 then 'new' else 'used' end
where item_condition is null;

alter table public.advertisements
alter column item_condition set default 'used';

alter table public.advertisements
alter column item_condition set not null;

alter table public.advertisements
drop constraint if exists advertisements_item_condition_chk;

alter table public.advertisements
add constraint advertisements_item_condition_chk
check (item_condition in ('new', 'used'));

alter table public.users
drop column if exists avatar_url;