-- =========================================================
-- Obyava: Seed script for development/testing
-- =========================================================
-- This script seeds:
-- - User role assignments (3 existing auth users → "user" role)
-- - 24 advertisements (8 per user: 2 published, 2 pending, 2 draft, 2 archived)
-- - 48–72 advertisement images (1–3 per ad)
-- - Archive snapshots for archived advertisements
-- =========================================================

begin;

-- =============================
-- 1) Get the 3 existing users from auth.users
-- =============================
-- We'll reference them directly by email or fetch them dynamically.
-- For determinism, we assume they exist and have these emails:
-- - johndoe@gmail.com
-- - maria@gmail.com
-- - user@gmail.com

-- =============================
-- 2) Ensure all 3 users have the "user" role
-- =============================
-- (Idempotent: on conflict ignore)
insert into public.user_roles (user_id, role_id, assigned_at)
select u.id, r.id, now()
from auth.users u
cross join public.roles r
where u.email in ('johndoe@gmail.com', 'maria@gmail.com', 'user@gmail.com')
  and r.name = 'user'
on conflict (user_id, role_id) do nothing;

-- =============================
-- 3) Ensure user profiles exist in public.users
-- =============================
insert into public.users (id, full_name, phone, role, created_at, updated_at)
select u.id, split_part(u.email, '@', 1), '+1' || (10000000 + (row_number() over (order by u.id) * 1000))::text,
       'user', now(), now()
from auth.users u
where u.email in ('johndoe@gmail.com', 'maria@gmail.com', 'user@gmail.com')
on conflict (id) do nothing;

-- =============================
-- 4) Seed categories (if not already present)
-- =============================
insert into public.categories (name, slug, is_active, created_at)
values
  ('Electronics', 'electronics', true, now()),
  ('Furniture', 'furniture', true, now()),
  ('Vehicles', 'vehicles', true, now()),
  ('Services', 'services', true, now()),
  ('Books', 'books', true, now()),
  ('Art', 'art', true, now())
on conflict (name) do nothing;

-- =============================
-- 5) Seed advertisements (24 total: 8 per user)
-- =============================
-- Insert advertisements directly for each user across all statuses.

insert into public.advertisements (
  uuid, title, description, price, category_id, owner_id, owner_phone,
  status, location, created_at, updated_at, published_at, archived_at
)
with user_list as (
  select id, row_number() over (order by email) as user_num
  from auth.users
  where email in ('johndoe@gmail.com', 'maria@gmail.com', 'user@gmail.com')
),
ad_data as (
  select
    u.id as owner_id,
    u.user_num,
    ad.status::public.advertisement_status,
    ad.ad_index,
    ad.title,
    ad.description,
    ad.price,
    ad.location,
    ((ad.ad_index - 1) % 6) + 1 as cat_id
  from user_list u
  cross join lateral (
    select 'Published'::text, 1,
           'MacBook Pro 16" 2023'::text as title,
           'Excellent condition, barely used. Includes original box and charger.'::text as description,
           1200.00::numeric as price, 'San Francisco, CA'::text as location
    union all
    select 'Published', 2,
           'Minimalist Office Desk',
           'White oak solid wood desk, 120cm x 60cm. Perfect for home office.',
           350.00, 'Oakland, CA'
    union all
    select 'Pending'::text, 3,
           'Sony WH-1000XM5 Headphones',
           'Brand new, sealed. Noise-cancelling wireless headphones.',
           380.00, 'Berkeley, CA'
    union all
    select 'Pending'::text, 4,
           'Standing Lamp with Touch Control',
           'Modern LED standing lamp, dimmable, USB charging port.',
           85.00, 'Mountain View, CA'
    union all
    select 'Draft'::text, 5,
           'Used Road Bicycle - Trek FX 3',
           '21-speed hybrid bike, good condition, minor scratches.',
           220.00, 'Palo Alto, CA'
    union all
    select 'Draft'::text, 6,
           'Piano Lessons - Beginner to Advanced',
           'Experienced pianist offering lessons online or in-person.',
           50.00, 'San Jose, CA'
    union all
    select 'Archived'::text, 7,
           'iPhone 12 Pro Max',
           'Space gray, 256GB, cracked screen but fully functional.',
           450.00, 'Cupertino, CA'
    union all
    select 'Archived'::text, 8,
           'IKEA Billy Bookshelf x3',
           'White finish, excellent condition. Need to pick up.',
           60.00, 'Sunnyvale, CA'
  ) ad(status, ad_index, title, description, price, location)
  where u.user_num = 1
  
  union all
  
  select u.id, u.user_num, ad.status::public.advertisement_status, ad.ad_index, ad.title, ad.description, ad.price, ad.location,
         ((ad.ad_index - 1) % 6) + 1
  from user_list u
  cross join lateral (
    select 'Published'::text, 1,
           'Canon EOS R6 Mirrorless Camera',
           'Professional camera with RF 24-105mm f/4L IS USM lens. Like new.',
           2800.00, 'London, UK'
    union all
    select 'Published'::text, 2,
           'Dining Table - Walnut',
           '180cm dining table, seats 6-8 people. Solid walnut construction.',
           890.00, 'Amsterdam, Netherlands'
    union all
    select 'Pending'::text, 3,
           'Apple iPad Air 5th Gen',
           '64GB WiFi, Space Gray, excellent condition with Apple Pencil.',
           520.00, 'Manchester, UK'
    union all
    select 'Pending'::text, 4,
           'Ergonomic Office Chair - Herman Miller',
           'Aeron chair, graphite, fully adjustable. Gently used.',
           950.00, 'Berlin, Germany'
    union all
    select 'Draft'::text, 5,
           'Motorcycle Helmet - Shoei X-Spirit III',
           'Medium size, black, DOT/ECE certified. Excellent condition.',
           280.00, 'Copenhagen, Denmark'
    union all
    select 'Draft'::text, 6,
           'Guitar Repair and Setup Services',
           'Expert luthier offering cleaning, intonation, and fret leveling.',
           75.00, 'Paris, France'
    union all
    select 'Archived'::text, 7,
           'Vintage Leather Sofa',
           'Brown leather, 3-seater, some wear but structurally sound.',
           420.00, 'Vienna, Austria'
    union all
    select 'Archived'::text, 8,
           'Sony PS5 Console',
           'Comes with 2 controllers and 5 games. Original box included.',
           550.00, 'Brussels, Belgium'
  ) ad(status, ad_index, title, description, price, location)
  where u.user_num = 2
  
  union all
  
  select u.id, u.user_num, ad.status::public.advertisement_status, ad.ad_index, ad.title, ad.description, ad.price, ad.location,
         ((ad.ad_index - 1) % 6) + 1
  from user_list u
  cross join lateral (
    select 'Published'::text, 1,
           'Gaming Laptop - ASUS ROG',
           'RTX 3070, Intel i7, 16GB RAM, 1TB SSD. Excellent for gaming and work.',
           1100.00, 'New York, NY'
    union all
    select 'Published', 2,
           'Mid-Century Modern Coffee Table',
           'Teak wood with tapered legs. Clean lines, vintage style.',
           280.00, 'Boston, MA'
    union all
    select 'Pending', 3,
           'DJI Air 3 Drone',
           'Barely used, all accessories included, ready to fly.',
           750.00, 'Chicago, IL'
    union all
    select 'Pending', 4,
           'Yoga & Pilates Classes Online',
           'Certified instructor offering group and private sessions.',
           35.00, 'Los Angeles, CA'
    union all
    select 'Draft', 5,
           'Tesla Model 3 2021',
           'White, 25K miles, excellent condition. Full self-driving capable.',
           35000.00, 'Seattle, WA'
    union all
    select 'Draft', 6,
           'Handmade Pottery Workshops',
           'Learn wheel throwing and hand-building techniques. Beginners welcome.',
           60.00, 'Portland, OR'
    union all
    select 'Archived', 7,
           'Samsung 65" 4K Smart TV',
           'QLED panel, excellent picture quality. Remote included.',
           680.00, 'Miami, FL'
    union all
    select 'Archived', 8,
           'Vintage Typewriter - Olivetti Lettera 32',
           'Classic portable typewriter, fully functional, nostalgic charm.',
           120.00, 'Austin, TX'
  ) ad(status, ad_index, title, description, price, location)
  where u.user_num = 3
)
select
  gen_random_uuid(),
  d.title,
  d.description,
  d.price,
  d.cat_id,
  d.owner_id,
  '+1' || (5550000 + d.ad_index * 1000 + d.user_num * 100)::text,
  d.status::public.advertisement_status,
  d.location,
  now() - ((d.ad_index * 24)::text || ' hours')::interval,
  now() - ((d.ad_index * 24)::text || ' hours')::interval,
  case when d.status = 'Published' then now() - ((d.ad_index * 24)::text || ' hours')::interval else null end,
  case when d.status = 'Archived' then now() else null end
from ad_data d
order by d.owner_id, d.ad_index;

-- =============================
-- 6) Archive snapshot trigger execution
-- =============================
-- The trigger on advertisements will automatically create archive snapshots
-- when status changes to 'Archived'. For seed data inserted with status='Archived',
-- we need to manually create archive entries to match the trigger behavior.

insert into public.advertisement_archive (advertisement_uuid, title, description, owner_id, archived_at)
select uuid, title, description, owner_id, coalesce(archived_at, now())
from public.advertisements
where status = 'Archived'
  and uuid not in (select advertisement_uuid from public.advertisement_archive)
on conflict (advertisement_uuid) do nothing;

-- =============================
-- 7) Seed advertisement images
-- =============================
-- For each advertisement, create 1–3 related images with placeholder URLs.
-- Image source: picsum.photos placeholders.

insert into public.advertisement_images (uuid, advertisement_uuid, position, file_path, created_at)
with ad_list as (
  select uuid, row_number() over (order by created_at) as ad_seq
  from public.advertisements
  order by created_at
),
image_specs as (
  select
    a.uuid as ad_uuid,
    a.ad_seq,
    img.position,
    img.url
  from ad_list a
  cross join lateral (
              select 0 as position, 'https://picsum.photos/seed/ad-image-1/600/400'::text as url
    union all
              select 1, 'https://picsum.photos/seed/ad-image-2/600/400'
    union all
              select 2, 'https://picsum.photos/seed/ad-image-3/600/400'
  ) img(position, url)
  where img.position < (1 + (((a.ad_seq - 1) % 3)))  -- Assign 1–3 images per ad
)
select
  gen_random_uuid(),
  img.ad_uuid,
  img.position,
  img.url,
  now()
from image_specs img
on conflict (advertisement_uuid, position) do nothing;

commit;

-- =============================
-- Summary
-- =============================
-- Seed data applied:
-- - 3 users with "user" role assigned
-- - 6 product categories
-- - 24 advertisements (8 per user) across all statuses
-- - 48–72 advertisement images (1–3 per ad)
-- - Automatic archive snapshots for archived advertisements
-- All data is deterministic and can be repeated safely.
