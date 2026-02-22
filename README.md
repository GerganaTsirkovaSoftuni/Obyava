# Obyava - OLX-Style Marketplace Platform

![Project Status](https://img.shields.io/badge/status-active-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

🌐 **Live Demo**: [https://melodious-trifle-b87c15.netlify.app](https://melodious-trifle-b87c15.netlify.app)

## 📋 Project Description

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
- ❌ Cannot create advertisements
- ❌ Cannot modify user advertisements

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

```
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

```
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
- **Supabase Account**: Free tier at https://supabase.com

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd Obyava
```

### Step 2: Install Frontend Dependencies

```bash
npm install
```

This installs:
- `vite` - Build tool
- `navigo` - Router library

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

```bash
npm run dev
```

Server runs on: **http://localhost:5173**

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

### Access Test Accounts

**Admin Account:**
- Email: `admin@gmail.com` | Password: `Test1234`

**Regular User Account:**
- Email: `user@gmail.com` | Password: `Test1234`

**Additional Test Users:**
- Email: `johndoe@gmail.com` | Password: generated during setup
- Email: `maria@gmail.com` | Password: generated during setup

**Link to the project**
https://melodious-trifle-b87c15.netlify.app
---

## 📁 Project Structure

```
Obyava/
├── src/                              # Frontend source code
│   ├── main.js                       # App entry point
│   ├── app.js                        # App initialization & layout
│   ├── router.js                     # Route definitions & navigation
│   ├── styles/
│   │   └── global.css                # Global styles & layout
│   ├── components/
│   │   ├── header/
│   │   │   ├── header.html           # Header markup
│   │   │   ├── header.css            # Header styles
│   │   │   └── header.js             # Header component logic
│   │   └── footer/
│   │       ├── footer.html           # Footer markup
│   │       ├── footer.css            # Footer styles
│   │       └── footer.js             # Footer component logic
│   └── pages/                        # Page components
│       ├── index/                    # Home page
│       │   ├── index.html
│       │   ├── index.css
│       │   └── index.js
│       └── dashboardPage/            # User dashboard
│           ├── dashboardPage.html
│           ├── dashboardPage.css
│           └── dashboardPage.js
│
├── supabase/                         # Backend configuration
│   ├── migrations/                   # Database migrations
│   │   ├── 20260221_000001_init_ads_schema.sql
│   │   ├── 20260221_000002_profiles_status_archive_indexes.sql
│   │   └── 20260221_000004_rename_profiles_to_users.sql
│   └── seed.sql                      # Database seed data
│
├── index.html                        # Main HTML entry
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
| `src/pages/index/index.js` | Homepage rendering |
| `src/pages/dashboardPage/dashboardPage.js` | User dashboard with ads |
| `vite.config.js` | Vite build configuration (port 5173) |
| `package.json` | Dependencies: vite, navigo, npm scripts |
| `supabase/migrations/*.sql` | Database schema creation & modifications |
| `supabase/seed.sql` | Test data: users, categories, ads |
| `API_DOCUMENTATION.md` | Complete API endpoint reference |
| `index.html` | HTML template with Vite script |

### Important Folders

```
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

All database changes are version-controlled in `supabase/migrations/`:

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

Apply migrations via Supabase dashboard or CLI:
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
