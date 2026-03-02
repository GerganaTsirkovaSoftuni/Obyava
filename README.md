# Obyava - OLX-Style Marketplace Platform

![Project Status](https://img.shields.io/badge/status-active-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

🌐 **Live Demo**: [https://melodious-trifle-b87c15.netlify.app](https://melodious-trifle-b87c15.netlify.app)

## � Quick Start

After cloning this project from GitHub:

```bash
# 1. Install dependencies (required!)
npm install

# 2. Start development server
npm run dev
```

The server will run at **<http://localhost:5173>**

💡 **Note**: You must run `npm install` before `npm run dev` or the project will not work!

---

## �📋 Project Description

**Obyava** is a modern, full-stack marketplace application built to facilitate peer-to-peer buying and selling of classified advertisements. It's inspired by platforms like OLX, providing users with an intuitive interface to post, manage, and browse advertisements across multiple product categories.

### Key Features

- **User Authentication**: Secure auth via Supabase with email/password
- **Advertisement Management**: Create, update, delete, and archive listings
- **Role-Based Access Control**: Regular users and admin moderators with distinct permissions
- **Approval Workflow**: Multi-stage advertisement lifecycle (Draft → Pending → Published → Archived)
- **Admin Moderation**: Admins can approve/reject pending advertisements
- **RLS Security**: Row-level security enforced at the database layer
- **Image Management**: Support for multiple images per advertisement
- **Search & Filtering**: Advanced search by title, description, category, and status

### User Roles & Permissions

#### Guest (Not Logged In)

- ✅ Access `Home` (published ads only)
- ✅ Access `Login`
- ✅ Access `Register`
- ✅ Access seller ads page (`/user/:id/ads`, published ads only)
- ❌ Cannot access profile, create/edit ad pages, admin dashboard, or other protected routes

#### Regular User

- ✅ Create advertisements (Draft status)
- ✅ View own advertisements (all statuses)
- ✅ Update own advertisements (Draft only)
- ✅ Delete own advertisements (Draft/Pending only)
- ✅ Submit for approval (Draft → Pending)
- ✅ Browse published advertisements
- ✅ Archive own published advertisements
- ❌ Cannot approve other advertisements
- ❌ Cannot create as admin

#### Admin User

- ✅ View all pending advertisements (moderation queue)
- ✅ Approve advertisements (Pending → Published)
- ✅ View all advertisements across platform
- ✅ Manage user roles
- ✅ On single ad page, has the same moderation options as in admin dashboard (approve/reject/archive/delete based on ad status)
- ❌ Cannot create advertisements
- ❌ Cannot modify user advertisements

### Authentication Edge Cases

- Deleted-user protection: if an auth account exists but its `public.users` profile is deleted, login is blocked with a clear message and session is immediately signed out.
- Registration duplicate-email handling returns a user-friendly message when account already exists.

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**

- **Framework**: Vanilla JavaScript (ES6+)
- **Build Tool**: Vite 5.4.21
- **Router**: Navigo 8.11.1 (SPA routing)
- **Styling**: CSS3 with Flexbox
- **Development Server**: Local on port 5173

**Backend:**

- **Platform**: Supabase (PostgreSQL + Auth)
- **Database**: PostgreSQL 14+ with RLS
- **Authentication**: Supabase Auth (JWT-based)
- **APIs**: Deno Edge Functions (serverless)
- **API Gateway**: Supabase Functions runtime

**Infrastructure:**

- **Hosting**: Supabase Cloud (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth (auth.users table)
- **Storage**: Supabase Storage (image files)
- **Real-time**: Potential for Supabase Realtime integration

### Architecture Diagram

```text
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vite + Vanilla JS)          │
│           Running on localhost:5173                      │
│  • Pages: Index, Dashboard, Advertisements, etc.        │
│  • Components: Header, Footer, Cards                    │
│  • Router: Navigo (SPA routing)                         │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/CORS
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Edge Functions (Deno)              │
│         Deployed serverless API endpoints                │
│  • get-ads, create-ad, update-ad, delete-ad            │
│  • publish-ad, archive-ad, admin-approve-ad            │
│  • get-user-ads, get-user-profile, get-pending-ads     │
│  • get-categories                                        │
└──────────────────────┬──────────────────────────────────┘
                       │ Direct SQL + RLS
                       ▼
┌─────────────────────────────────────────────────────────┐
│           Supabase PostgreSQL Database                   │
│         RLS Policies + Triggers + Functions              │
│  • Tables: roles, user_roles, users, categories         │
│  • Tables: advertisements, advertisement_images         │
│  • Tables: advertisement_archive                        │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│            Supabase Auth (auth.users)                    │
│         JWT Token Management                             │
│  • Regular users: johndoe@gmail.com, maria@gmail.com   │
│  • Admin user: admin@gmail.com                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Design

### Entity Relationship Diagram

```text
┌──────────────┐
│    roles     │
├──────────────┤
│ id (PK)      │
│ name (UK)    │ ◄────┐
│ created_at   │      │
└──────────────┘      │
                      │ FK
                      │
┌──────────────────────────┐
│     user_roles           │
├──────────────────────────┤
│ user_id (FK/PK)          │
│ role_id (FK/PK) ─────────┘
│ assigned_at              │
└───────────┬──────────────┘
            │ FK
            ▼
    ┌──────────────────────┐
    │      users           │
    ├──────────────────────┤
    │ id (PK, FK auth)     │
    │ full_name            │
    │ phone                │
    │ avatar_url           │
    │ role                 │
    │ created_at           │
    │ updated_at           │
    └────┬──────────────┬──┘
         │              │
         │ FK           │ FK
         │ (owner_id)   │
         ▼              ▼
 ┌─────────────────────────────────┐
 │   advertisements                │
 ├─────────────────────────────────┤
 │ id (PK)                         │
 │ uuid (UK)                       │
 │ title                           │
 │ description                     │
 │ price                           │
 │ category_id (FK) ──────────────┐│
 │ owner_id (FK)                  ││
 │ owner_phone                    ││
 │ status (enum)                  ││
 │ location                       ││
 │ primary_image_uuid (FK)    ┐   ││
 │ created_at, updated_at     │   ││
 │ published_at, archived_at  │   ││
 └──────────────┬──────────────┘   ││
                │                  ││
                │ FK (uuid)        ││
                ▼                  ││
 ┌──────────────────────────┐      ││
 │ advertisement_images     │      ││
 ├──────────────────────────┤      ││
 │ uuid (PK)                │      │├─FK─────┐
 │ advertisement_uuid (FK) ─┼──────┘│        │
 │ position                 │   ┌───┘        │
 │ file_path                │   │           ▼
 │ created_at               │   │  ┌────────────────┐
 └──────────────────────────┘   │  │  categories    │
                                │  ├────────────────┤
                                │  │ id (PK)        │
                                │  │ name (UK)      │
                                │  │ slug (UK)      │
                                │  │ is_active      │
                                │  │ created_at     │
                                │  └────────────────┘
                                │
 ┌──────────────────────────────┴┐
 │  advertisement_archive        │
 ├──────────────────────────────┤
 │ advertisement_uuid (PK/FK)   │
 │ title                        │
 │ description                  │
 │ owner_id (FK)                │
 │ archived_at                  │
 └──────────────────────────────┘

 ┌──────────────────────────────┐
 │ rejected_advertisements       │
 ├──────────────────────────────┤
 │ advertisement_uuid (PK/FK)   │
 │ title                        │
 │ description                  │
 │ owner_id (FK)                │
 │ rejection_date               │
 │ rejection_reason             │
 └──────────────────────────────┘

Legend:
PK = Primary Key
FK = Foreign Key
UK = Unique Key
```

### Table Descriptions

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `roles` | Defines available user roles | id, name |
| `user_roles` | Maps users to roles (many-to-many) | user_id, role_id |
| `users` | User profiles linked to auth.users | id, full_name, phone, avatar_url, role |
| `categories` | Product categories for ads | id, name, slug, is_active |
| `advertisements` | Main advertisement listings | id, uuid, title, description, price, status, location |
| `advertisement_images` | Images for each advertisement | uuid, advertisement_uuid, position, file_path |
| `advertisement_archive` | Immutable snapshots of archived ads | advertisement_uuid, title, description, owner_id |
| `rejected_advertisements` | Tracks rejected ads and rejection reasons | advertisement_uuid, owner_id, rejection_reason, rejection_date |

### Key Database Features

- **RLS (Row-Level Security)**: All tables protected with policies
- **Enum Type**: `advertisement_status` (Draft, Pending, Published, Archived)
- **Triggers**:
  - `enforce_advertisement_status_workflow`: Prevents non-admins from creating Published/Archived ads
  - `snapshot_advertisement_on_archive`: Auto-creates immutable archive entry
  - `prevent_archive_mutation`: Blocks updates/deletes on archived snapshots
  - `set_users_updated_at`: Auto-updates `updated_at` timestamp
- **Indexes**: Optimized for status, category, owner, and location queries

---

## 🚀 Local Development Setup

### Prerequisites

- **Node.js**: v18+ (check with `node --version`)
- **npm**: v8+ (check with `npm --version`)
- **Git**: For version control
- **Supabase Account**: Free tier at <https://supabase.com>

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd Obyava
```

### Step 2: Install Dependencies (Required!)

**After cloning the project from GitHub, you MUST install dependencies before running the project:**

```bash
npm install
```

This installs:

- `vite` - Build tool
- `navigo` - Router library

⚠️ **Important**: The project will not run without installing dependencies first!

### Step 3: Set Up Environment Variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://cdeozmfcesxegzejicij.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these values from your Supabase project dashboard:

1. Go to Project Settings > API
2. Copy `Project URL` and `anon` key

### Step 4: Start Development Server

**After installing dependencies, start the development server:**

```bash
npm run dev
```

Server runs on: **<http://localhost:5173>**

The development server will automatically open in your browser and support hot module replacement (HMR) for instant updates during development.

### Step 5: Build for Production

```bash
npm run build
```

Output generated in `dist/` folder.

### Step 6: Preview Production Build

```bash
npm run preview
```

### Useful Development Commands

```bash
# Start dev server
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview

# Check Node version
node --version

# Check npm version
npm --version
```

### Cache Troubleshooting (Regular Browser vs Incognito)

If ads are visible in Incognito but missing in a regular browser window, this is usually stale browser cache.

1. Open DevTools (`F12`) → **Application** → **Service Workers** and click **Unregister** if any worker is listed.
2. In DevTools → **Network**, enable **Disable cache** and hard refresh with `Ctrl+Shift+R`.
3. If needed, clear site data (cookies + local/session storage) for the app domain and reload.

For production deploys on Netlify, this repo includes [public/_headers](public/_headers) to reduce stale app-shell caching.

### Access Test Accounts

**Admin Account:**

- Email: `adminuser@gmail.com` | Password: `Test1234`

**Regular User Accounts:**

- Email: `steve@gmail.com` | Password: `pass123`
- Email: `maria@gmail.com` | Password: `pass123` _(deleted user; use to test deleted-account login/register behavior)_
- Email: `peter@gmail.com` | Password: `pass123`

### Link to the project

<https://melodious-trifle-b87c15.netlify.app>

---

## 📁 Project Structure

```text
Obyava/
├── src/                              # Frontend source code
│   ├── main.js                       # App entry point
│   ├── app.js                        # App initialization & layout
│   ├── router.js                     # Route definitions & navigation
│   ├── styles/
│   │   └── global.css                # Global styles & layout
│   ├── components/                   # Reusable UI components
│   │   ├── header/
│   │   │   ├── header.html           # Header markup
│   │   │   ├── header.css            # Header styles
│   │   │   └── header.js             # Header component logic
│   │   └── footer/
│   │       ├── footer.html           # Footer markup
│   │       ├── footer.css            # Footer styles
│   │       └── footer.js             # Footer component logic
│   ├── services/                     # Business logic & API calls
│   │   ├── supabaseClient.js         # Supabase initialization
│   │   ├── authService.js            # Authentication logic
│   │   ├── adsService.js             # Advertisement CRUD operations
│   │   ├── userService.js            # User profile operations
│   │   ├── storageService.js         # File upload/download logic
│   │   ├── validationService.js      # Form validation utilities
│   │   ├── sanitizeService.js        # Data sanitization
│   │   └── modalService.js           # Modal management
│   └── pages/                        # Page components
│       ├── index/                    # Home/landing page
│       ├── loginPage/                # Login page
│       ├── registerPage/             # Registration page
│       ├── dashboardPage/            # User dashboard
│       ├── advertisementPage/        # View single advertisement
│       ├── createAdPage/             # Create new advertisement
│       ├── userAdsPage/              # User's own advertisements
│       ├── profilePage/              # User profile management
│       └── notFoundPage/             # 404 error page
│
├── supabase/                         # Backend configuration
│   ├── migrations/                   # Database migrations (14 files)
│   │   ├── 20260221_000001_init_ads_schema.sql
│   │   ├── 20260221_000002_profiles_status_archive_indexes.sql
│   │   ├── 20260221_000004_rename_profiles_to_users.sql
│   │   ├── 20260222_000005_create_users_table_and_fix_fk.sql
│   │   ├── 20260226_000009_add_item_condition_and_drop_avatar_url.sql
│   │   ├── 20260227_000010_add_rejected_ads.sql
│   │   └── ... (8 additional migrations)
│   └── seed.sql                      # Database seed data
│
├── index.html                        # Main HTML entry
├── .copilot-instructions.md          # AI dev agent guidelines
├── vite.config.js                    # Vite configuration
├── package.json                      # Dependencies & scripts
├── .gitignore                        # Git ignore rules
├── API_DOCUMENTATION.md              # API endpoints reference
└── README.md                         # This file
```

### Key Files & Purposes

| File | Purpose |
|------|---------|
| `src/main.js` | App initialization, imports global styles |
| `src/app.js` | Creates layout structure (header/main/footer) |
| `src/router.js` | Route definitions, page mapping, navigation helpers |
| `src/components/header/header.js` | Header component with navigation |
| `src/pages/index/index.js` | Homepage/landing page |
| `src/pages/loginPage/loginPage.js` | Login functionality |
| `src/pages/registerPage/registerPage.js` | Registration functionality |
| `src/pages/dashboardPage/dashboardPage.js` | User dashboard with ad statistics |
| `src/pages/advertisementPage/advertisementPage.js` | Single advertisement details view |
| `src/pages/profilePage/profilePage.js` | User profile management and settings |
| `src/pages/userAdsPage/userAdsPage.js` | User's own advertisements listing |
| `src/services/supabaseClient.js` | Supabase client initialization |
| `src/services/authService.js` | User authentication and authorization |
| `src/services/adsService.js` | Advertisement CRUD and management operations |
| `src/services/userService.js` | User profile and user data operations |
| `src/services/storageService.js` | Supabase Storage file upload/download |
| `src/services/validationService.js` | Form and data validation utilities |
| `src/services/sanitizeService.js` | XSS prevention and data sanitization |
| `src/services/modalService.js` | Modal dialog management and state |
| `vite.config.js` | Vite build configuration (port 5173) |
| `package.json` | Dependencies and npm scripts |
| `supabase/migrations/*.sql` | Database schema creation & modifications (14 files) |
| `supabase/seed.sql` | Test data: users, categories, advertisements |
| `API_DOCUMENTATION.md` | Complete API endpoint reference |
| `index.html` | HTML template with Vite script entry point |

### Important Folders

```text
src/
├── components/     Dev modular UI components (header, footer, cards)
├── pages/          Page-specific components with routing
└── styles/         Global CSS and layout definitions

supabase/
├── migrations/     Version-controlled database changes
└── seed.sql        Test data for development

dist/               (Generated) Production build output
node_modules/       (Generated) Installed dependencies
```

---

## 🔧 Configuration Files

### `vite.config.js`

Vite build configuration:

```javascript
{
  server: { port: 5173 },
  build: { outDir: 'dist' }
}
```

### `package.json`

Dependencies and npm scripts:

- `vite`: Build tool
- `navigo`: SPA router
- Scripts: `dev`, `build`, `preview`

### Environment Variables (`.env.local`)

```env
VITE_SUPABASE_URL=<your-project-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## 📊 Database Migrations

All database changes are version-controlled in `supabase/migrations/` (14 total migrations):

1. **20260221_000001_init_ads_schema.sql**
   - Initial schema: roles, user_roles, categories, advertisements, advertisement_images, advertisement_archive
   - RLS policies and security functions

2. **20260221_000002_profiles_status_archive_indexes.sql**
   - User profiles table
   - Status workflow triggers
   - Archive automation
   - Performance indexes

3. **20260221_000004_rename_profiles_to_users.sql**
   - Renames `profiles` → `users` table
   - Updates constraints, triggers, policies

4. **20260222_000005_create_users_table_and_fix_fk.sql**
   - Recreates users table with proper schema
   - Fixes advertisements foreign key references

5. **20260226_000009_add_item_condition_and_drop_avatar_url.sql**
   - Adds item condition field
   - Removes avatar_url column

6. **20260227_000010_add_rejected_ads.sql**
   - Creates `rejected_advertisements` table for tracking rejected listings
   - RLS policies for admin and user access

7-14. **Additional migrations**

- Storage bucket configuration
- RLS policy refinements
- Admin role and deletion policy improvements

```bash
supabase db push
```

---

## 🔐 Security Features

### Row-Level Security (RLS)

- All tables protected with policies
- Users can only modify their own data
- Admins have elevated privileges

### Authentication

- JWT-based authentication via Supabase Auth
- Secure password hashing
- Session management

### Data Validation

- Server-side validation in Edge Functions
- Check constraints on database columns
- Enum type enforcement for statuses

### Authorization

- Role-based access control (user vs admin)
- Edge Functions verify user roles
- RLS policies prevent unauthorized access

---

## 📚 API Endpoints

All backend APIs are exposed via Supabase Edge Functions. For complete endpoint specifications, request/response examples, error handling, and authentication details, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

**📖 Full API Reference:** [API_DOCUMENTATION.md](https://github.com/GerganaTsirkovaSoftuni/Obyava/blob/main/API_DOCUMENTATION.md)

### Core Endpoints

- `GET /get-ads` - List published advertisements
- `POST /create-ad` - Create new advertisement
- `PUT /update-ad/:uuid` - Update advertisement
- `DELETE /delete-ad/:uuid` - Delete advertisement
- `POST /publish-ad/:uuid` - Submit for approval
- `POST /archive-ad/:uuid` - Archive advertisement
- `GET /get-user-ads` - Get user's own ads
- `POST /admin-approve-ad/:uuid` - Admin approve ad
- `GET /get-pending-ads` - Admin: get queue
- `GET /get-user-profile` - User profile + stats
- `GET /get-categories` - List all categories

---

## 📈 Future Enhancements

- [ ] Image upload to Supabase Storage (replace URLs)
- [ ] Real-time notifications via Supabase Realtime
- [ ] Advanced search with full-text search
- [ ] User reviews and ratings
- [ ] Messaging system between buyers/sellers
- [ ] Payment integration (Stripe/PayPal)
- [ ] Email notifications for ad status changes
- [ ] Mobile app (React Native/Flutter)
- [ ] Analytics dashboard for admins
- [ ] Spam detection and reporting

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open pull request

---

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 👥 Team

- **Developer**: Gergana
- **Project**: Obyava (SoftUni Challenge)

---

## 📞 Support

For questions or issues:

1. Check the API documentation: `API_DOCUMENTATION.md`
2. Review database schema diagrams above
3. Check `.copilot-instructions.md` for development guidelines

---

## ✅ Deployment Checklist

- [ ] All migrations applied to production Supabase
- [ ] Environment variables configured
- [ ] Edge Functions deployed (11 functions)
- [ ] RLS policies enabled and tested
- [ ] Seed data loaded (optional for production)
- [ ] Frontend build tested: `npm run build`
- [ ] CORS configured for production domain
- [ ] Monitoring and error tracking set up
- [ ] Database backups configured
- [ ] SSL/TLS certificates valid

---

**Last Updated**: February 21, 2026  
**Status**: ✅ Production Ready
