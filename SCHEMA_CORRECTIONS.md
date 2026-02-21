# Schema Corrections - Complete ✅

## What Was Fixed

Your Supabase backend was already created with a specific schema, but the services I initially created didn't match it. I've now corrected everything to work with your **actual** database structure.

## Actual Database Schema

### Tables in Your Database:
1. **users** - User profiles (id, full_name, phone, avatar_url, role)
2. **roles** - Role definitions ('user', 'admin')
3. **user_roles** - User-role assignments (many-to-many)
4. **advertisements** - Main ads table
5. **advertisement_images** - Ad images
6. **categories** - Ad categories
7. **advertisement_archive** - Archived ads

### Key Schema Details:

#### Advertisements Table
- **Primary Identifier**: `uuid` (UUID) - NOT `id`
- **Owner Reference**: `owner_id` references `auth.users.id`
- **Category Reference**: `category_id` (bigint) references `categories.id`
- **Status Values**: **'Draft', 'Pending', 'Published', 'Archived'** (capitalized)
- **Fields**: title, description, price, location, owner_phone, primary_image_uuid
- **Timestamps**: created_at, updated_at, published_at, archived_at

#### Advertisement Images Table
- **Primary Key**: `uuid` (UUID)
- **Foreign Key**: `advertisement_uuid` references `advertisements.uuid`
- **Image Path**: `file_path` (NOT `image_url`)
- **Order**: `position` (NOT `display_order`)

#### Users Table
- **Primary Key**: `id` (UUID) references `auth.users.id`
- **Fields**: full_name, phone, avatar_url, role ('user' or 'admin')
- **No email** in this table (email is in auth.users)

#### Categories Table
- **Primary Key**: `id` (bigint)
- **Fields**: name, slug, is_active

## Services Corrected

### 1. adsService.js - Complete Rewrite ✅
- Uses `uuid` for advertisement identification
- Uses `category_id` (number) instead of `category` (string)
- Uses `owner_id` instead of `user_id`
- Status values are capitalized: 'Draft', 'Pending', 'Published', 'Archived'
- Joins with `users` table via `owner_id`
- Joins with `categories` table via `category_id`
- Maps `advertisement_images` with `file_path` and `position`
- Removed placeholder increment_views RPC call

### 2. storageService.js - Complete Rewrite ✅
- Works with `advertisement_images` table using UUIDs
- Uses `advertisement_uuid` for foreign key
- Uses `file_path` for image URLs
- Uses `position` for ordering
- Validates images (5MB max, 5 images max)
- Uploads to 'advertisement-images' and 'user-avatars' buckets
- Gets public URLs from Supabase Storage

### 3. authService.js - Updated ✅
- Creates profile in `users` table (not `profiles`)
- Assigns default 'user' role to both:
  * `users.role` column
  * `user_roles` table with proper role_id
- No longer includes `email` in users table insert

### 4. userService.js - Complete Rewrite ✅
- Uses `users` table (not `profiles`)
- Updates `role` column AND `user_roles` table
- Uses capitalized status values for ad statistics
- Queries proper schema structure

## Pages Updated

### 1. index.js (Home Page) ✅
- Uses `uuid` instead of `id`
- Passes `category_id` for filtering
- Maps `file_path` from images
- Shows category name from joined `categories` table

### 2. advertisementPage.js ✅
- Uses `uuid` for ad identification
- Maps `owner_id` and `owner_phone`
- Uses capitalized status values
- Maps `file_path` for images
- Shows category from joined table

### 3. createAdPage.js ✅
- Sends `category_id` (number) not `category` (string)
- Uses `uuid` for editing
- Uses capitalized status values ('Draft', 'Pending')
- Maps `owner_phone` field
- Handles image UUIDs and file_paths properly

### 4. profilePage.js ✅
- Uses `uuid` for advertisements
- Uses capitalized status values
- Maps `file_path` for images
- Filters use capitalized statuses

### 5. dashboardPage.js ✅
- Uses `uuid` for all ad operations
- Uses capitalized status values in UI
- Maps `file_path` for images
- All admin actions use UUIDs

## Status Value Mapping

**OLD (Wrong)**: `'draft'`, `'pending'`, `'published'`, `'archived'`  
**NEW (Correct)**: `'Draft'`, `'Pending'`, `'Published'`, `'Archived'`

This matches the PostgreSQL ENUM type defined in your database.

## Storage Buckets

Your application uses these Supabase Storage buckets:
1. **advertisement-images** - For ad photos
2. **user-avatars** - For user profile pictures

Both should be **public buckets** for read access.

## What You Need To Do

### 1. Verify Storage Buckets
Make sure these buckets exist and are public:
- `advertisement-images`
- `user-avatars`

### 2. Check Your .env File
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Migrations (if not already done)
Execute in order:
1. `20260221_000001_init_ads_schema.sql`
2. `20260221_000002_profiles_status_archive_indexes.sql`
3. `20260221_000003_restrict_admin_ad_insert.sql`
4. `20260221_000004_rename_profiles_to_users.sql`

### 4. Test The Application
```bash
npm install
npm run dev
```

## Important Notes

### UUID vs ID
- **advertisements.uuid** is the main identifier (use in URLs, queries)
- **advertisements.id** is a bigint (auto-increment) - NOT used by the app
- **advertisement_images.uuid** is the primary key
- **advertisement_images.id** exists but we use uuid

### Category Handling
- Categories are referenced by **ID (number)**, not by slug/name
- Must fetch categories from database to populate dropdowns
- Store `category_id` in advertisements, not `category` string

### Phone Number
- Stored in `advertisements.owner_phone` (optional)
- Also available in `users.phone`
- Display priority: owner_phone > users.phone

### Admin Check
- Database has `public.is_admin()` function
- Also checks `users.role` column
- Also checks `user_roles` table
- All three should be synchronized

## Testing Checklist

- [ ] User can register (creates entry in `users` and `user_roles`)
- [ ] User can login
- [ ] User can create ad (status='Draft')
- [ ] User can upload images (max 5, stored in `advertisement-images` bucket)
- [ ] User can submit ad for review (status='Draft' → 'Pending')
- [ ] Admin can approve ad (status='Pending' → 'Published')
- [ ] Published ads show on home page
- [ ] Categories load from database
- [ ] Images display correctly
- [ ] Edit mode loads existing ad data
- [ ] Delete works (cascades to images)

## Files Modified

### Services (completely rewritten):
- `src/services/adsService.js`
- `src/services/storageService.js`
- `src/services/userService.js`
- `src/services/authService.js` (partial update)

### Pages (updated):
- `src/pages/index/index.js`
- `src/pages/advertisementPage/advertisementPage.js`
- `src/pages/createAdPage/createAdPage.js`
- `src/pages/profilePage/profilePage.js`
- `src/pages/dashboardPage/dashboardPage.js`

All code now matches your actual Supabase database schema! 🎉
