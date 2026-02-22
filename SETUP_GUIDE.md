# Setup Guide - Obyava Platform

## ✅ Completed Integration

All Supabase backend integration has been successfully implemented! Here's what's been done:

### Services Created

1. **supabaseClient.js** - Central Supabase client configuration
2. **authService.js** - Complete authentication (signup, signin, signout, profiles, admin checks)
3. **adsService.js** - Advertisement CRUD + admin operations (15 functions)
4. **storageService.js** - Image upload/management with validation
5. **userService.js** - Admin user management operations

### Pages Updated

1. ✅ **Login Page** - Real Supabase signIn integration
2. ✅ **Register Page** - Real Supabase signUp with profile creation
3. ✅ **Home Page** - API calls for published ads, auth state check
4. ✅ **Advertisement Page** - View, delete, archive, approve/reject with role-based access
5. ✅ **Create/Edit Ad Page** - Full CRUD with image upload
6. ✅ **Profile Page** - User profile management, password change, account deletion
7. ✅ **Admin Dashboard** - Complete admin panel for ads and users
8. ✅ **Header Component** - Real-time auth state with onAuthStateChange listener

## 🚀 Next Steps to Get Started

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to be provisioned

### 2. Run Database Migrations

Execute the SQL migrations in order from the `supabase/migrations/` folder:

1. `20260221_000001_init_ads_schema.sql` - Creates tables, RLS policies
2. `20260221_000002_profiles_status_archive_indexes.sql` - Adds indexes
3. `20260221_000003_restrict_admin_ad_insert.sql` - Restricts admin ad creation
4. `20260221_000004_rename_profiles_to_users.sql` - Renames profiles to users

You can run these in the Supabase SQL Editor.

### 3. Create Storage Buckets

In Supabase Storage, create two public buckets:

1. **advertisement-images** - For ad images
2. **user-avatars** - For user profile pictures

Make both buckets **public** for read access.

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   Copy-Item .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   Find these values in your Supabase project settings under "API".

### 5. Create Admin User

To create the admin user with full platform access:

1. **Register the admin account**:
   - Go to your Supabase Dashboard → Authentication → Users
   - Click "Add user" → "Create new user"
   - Email: `admin@gmail.com`
   - Password: `Test1234`
   - Auto Confirm User: **Yes** (check this box)
   - Click "Create user"

2. **Assign admin role via SQL**:
   - Go to SQL Editor in Supabase
   - Run this query (replace `admin@gmail.com` if you used a different email):
   
   ```sql
   -- Get the admin user's ID and assign admin role
   with admin_user as (
     select id from auth.users where email = 'admin@gmail.com'
   ),
   admin_role as (
     select id from public.roles where name = 'admin'
   )
   insert into public.user_roles (user_id, role_id, assigned_at)
   select admin_user.id, admin_role.id, now()
   from admin_user, admin_role
   on conflict (user_id, role_id) do nothing;
   
   -- Create/update user profile
   insert into public.users (id, email, full_name, phone, role, created_at, updated_at)
   select id, email, 'Administrator', '+1234567890', 'admin', now(), now()
   from auth.users
   where email = 'admin@gmail.com'
   on conflict (id) do update
   set role = 'admin', full_name = 'Administrator';
   ```

3. **Verify admin access**:
   - Login to the app with `admin@gmail.com` / `Test1234`
   - You should see the "Dashboard" link in the header
   - Dashboard gives access to moderate ads and manage users

### 6. Seed Test Data (Optional)

Run `supabase/seed.sql` to create test categories and sample data.

### 7. Start Development Server

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`

## 📋 Database Schema

### Tables Created

- **users** - User profiles with role-based access (user/admin)
- **categories** - Advertisement categories
- **advertisements** - Main ads table with status workflow
- **advertisement_images** - Multiple images per ad

### Status Workflow

- **draft** → User creates ad
- **pending** → User submits for review
- **published** → Admin approves (visible to public)
- **archived** → User or admin archives

## 🔐 Row Level Security (RLS)

All tables have RLS policies enforcing:

- Users can only modify their own ads
- Admins can view/modify all ads
- Public can only view published ads
- Users table is protected (users can only read/update their own profile)

## 🎨 Features Implemented

### Regular Users Can:
- ✅ Register and login with email/password
- ✅ Create advertisements (draft status)
- ✅ Upload up to 5 images per ad (5MB max each)
- ✅ Submit ads for admin approval
- ✅ Edit draft advertisements
- ✅ Delete their own draft/pending ads
- ✅ Archive their published ads
- ✅ View all published ads
- ✅ Update their profile (name, phone)
- ✅ Change password
- ✅ Delete their account

### Admins Can:
- ✅ View pending advertisements (moderation queue)
- ✅ Approve advertisements (status: pending → published)
- ✅ Reject advertisements with reason
- ✅ Archive any advertisement
- ✅ Delete any advertisement
- ✅ View all users
- ✅ Change user roles (promote/demote)
- ✅ Delete users (cascade deletes their ads)
- ✅ View platform statistics

## 🔧 API Services Available

### authService.js
- `signUp(email, password, metadata)` - Register new user
- `signIn(email, password)` - Login
- `signOut()` - Logout
- `getSession()` - Get current session
- `getCurrentUser()` - Get current user
- `getUserProfile()` - Get user profile with role
- `updateUserProfile(updates)` - Update profile
- `updatePassword(newPassword)` - Change password
- `deleteAccount()` - Delete account
- `isUserAdmin()` - Check if current user is admin
- `onAuthStateChange(callback)` - Listen for auth changes

### adsService.js
- `getPublishedAds(filters)` - Get published ads with filters
- `getAdvertisementById(id)` - Get single ad (increments views)
- `getUserAds(filters)` - Get current user's ads
- `createAdvertisement(adData)` - Create new ad
- `updateAdvertisement(id, updates)` - Update ad
- `deleteAdvertisement(id)` - Delete ad
- `submitForReview(id)` - Submit draft for approval
- `archiveAdvertisement(id)` - Archive ad
- `getPendingAds()` - Get pending ads (admin)
- `getAllAds(filters)` - Get all ads (admin)
- `approveAdvertisement(id)` - Approve ad (admin)
- `rejectAdvertisement(id, reason)` - Reject ad (admin)
- `getCategories()` - Get all categories
- `getUserAdStats()` - Get user's ad statistics

### storageService.js
- `uploadAdImages(adId, files)` - Upload multiple ad images
- `deleteAdImages(adId, imageIds)` - Delete ad images
- `deleteSingleImage(imageId)` - Delete one image
- `uploadAvatar(file)` - Upload user avatar
- `validateImageFile(file)` - Validate image before upload
- `getAdImages(adId)` - Get all images for an ad

### userService.js
- `getAllUsers()` - Get all users (admin)
- `updateUserRole(userId, newRole)` - Change user role (admin)
- `deleteUser(userId)` - Delete user (admin)
- `getPlatformStats()` - Get platform statistics (admin)

## 🐛 Testing Checklist

### Authentication
- [ ] Register new user
- [ ] Login with credentials
- [ ] Logout
- [ ] Password change
- [ ] Account deletion

### Advertisements (User)
- [ ] Create draft ad
- [ ] Upload images
- [ ] Submit for review
- [ ] Edit draft
- [ ] Delete draft
- [ ] Archive published ad

### Advertisements (Admin)
- [ ] View pending ads
- [ ] Approve ad
- [ ] Reject ad with reason
- [ ] Archive any ad
- [ ] Delete any ad

### Admin Panel
- [ ] View all users
- [ ] Promote user to admin
- [ ] Demote admin to user
- [ ] Delete user
- [ ] View platform stats

## 📝 Notes

- All error messages are in Bulgarian (Cyrillic)
- Image validation: max 5 images, 5MB each, types: jpg, jpeg, png, gif, webp
- Email verification is enabled (check `.env` for confirmation redirect)
- RLS policies are enforced at database level for security
- Admin users cannot create their own ads (restriction policy)

## 🔗 Useful Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📞 Troubleshooting

### "Supabase client not configured"
- Check `.env` file exists
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart dev server after changing `.env`

### Images not uploading
- Verify storage buckets exist: `advertisement-images`, `user-avatars`
- Check buckets are set to public
- Ensure images are under 5MB

### RLS Policy Errors
- Verify all migrations have been run
- Check user is authenticated
- Confirm user has correct role for operation

### Auth State Not Updating
- Header uses `onAuthStateChange` for real-time updates
- Pages check auth state on mount
- Logout clears session properly

---

**All backend integration is complete!** You just need to configure Supabase and start the development server.
