# Supabase Edge Functions - API Documentation

## Base URL
```
https://cdeozmfcesxegzejicij.supabase.co/functions/v1/
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Public Endpoints (No Authentication Required)

### 1. Get Categories
**Endpoint:** `GET /get-categories`

**Description:** Retrieve all active product categories

**Query Parameters:**
- None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Electronics",
      "slug": "electronics",
      "is_active": true
    }
  ]
}
```

---

## Advertisement Endpoints

### 2. Get Public Advertisements
**Endpoint:** `GET /get-ads`

**Description:** Retrieve all published advertisements with optional filters

**Query Parameters:**
- `status` (string, default: "Published"): Filter by status (Published, Pending, Draft, Archived)
- `category` (number): Filter by category ID
- `search` (string): Search in title and description
- `limit` (number, default: 20): Results per page
- `offset` (number, default: 0): Pagination offset

**Example:**
```
GET /get-ads?status=Published&category=1&search=laptop&limit=10&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "title": "MacBook Pro 16 M2",
      "description": "Excellent condition...",
      "price": "1250.00",
      "status": "Published",
      "location": "New York, NY",
      "created_at": "2026-02-21T10:00:00Z",
      "category_id": 1,
      "owner_id": "uuid-here",
      "categories": {
        "id": 1,
        "name": "Electronics",
        "slug": "electronics"
      },
      "users": {
        "full_name": "johndoe",
        "avatar_url": "https://..."
      },
      "advertisement_images": [
        {
          "uuid": "image-uuid",
          "file_path": "https://picsum.photos/seed/sample-image/600/400",
          "position": 1
        }
      ]
    }
  ],
  "count": 15,
  "limit": 10,
  "offset": 0
}
```

---

## User Advertisement Management

### 3. Get User's Advertisements
**Endpoint:** `GET /get-user-ads`

**Description:** Retrieve all advertisements owned by the authenticated user

**Query Parameters:**
- `limit` (number, default: 20)
- `offset` (number, default: 0)

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 8,
  "limit": 20,
  "offset": 0
}
```

---

### 4. Create Advertisement
**Endpoint:** `POST /create-ad`

**Description:** Create a new advertisement in Draft status

**Headers:** Authorization required + Content-Type: application/json

**Request Body:**
```json
{
  "title": "MacBook Pro 16 M2",
  "description": "Barely used, excellent condition. Includes charger.",
  "price": 1250.00,
  "category_id": 1,
  "location": "New York, NY",
  "owner_phone": "+15551234567",
  "image_urls": [
    "https://picsum.photos/seed/laptop/600/400",
    "https://picsum.photos/seed/electronics/600/400"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "uuid": "550e8400-e29b-41d4-a716-446655440001",
    "title": "MacBook Pro 16 M2",
    "description": "Barely used, excellent condition. Includes charger.",
    "price": "1250.00",
    "category_id": 1,
    "owner_id": "user-uuid",
    "status": "Draft",
    "created_at": "2026-02-21T10:00:00Z"
  }
}
```

---

### 5. Update Advertisement
**Endpoint:** `PUT /update-ad/:uuid`

**Description:** Update an advertisement (only Draft status allowed)

**Headers:** Authorization required + Content-Type: application/json

**Request Body:**
```json
{
  "title": "MacBook Pro 16 M2 - Updated",
  "description": "Updated description",
  "price": 1200.00,
  "category_id": 1,
  "location": "Boston, MA",
  "owner_phone": "+15551234567"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ...updated advertisement }
}
```

**Status Codes:**
- 200: Success
- 403: Not owner / Unauthorized
- 400: Invalid request

---

### 6. Delete Advertisement
**Endpoint:** `DELETE /delete-ad/:uuid`

**Description:** Delete an advertisement (Draft and Pending only)

**Headers:** Authorization required

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- 200: Success
- 403: Not owner / Unauthorized
- 400: Cannot delete published/archived ads

---

## Advertisement Workflow

### 7. Submit Advertisement for Review
**Endpoint:** `POST /publish-ad/:uuid`

**Description:** Submit a Draft advertisement for admin review (status: Draft → Pending)

**Headers:** Authorization required

**Request Body:** Empty

**Response:**
```json
{
  "success": true,
  "message": "Advertisement submitted for approval",
  "data": {
    "status": "Pending",
    "updated_at": "2026-02-21T10:05:00Z"
  }
}
```

---

### 8. Archive Advertisement
**Endpoint:** `POST /archive-ad/:uuid`

**Description:** Archive a published advertisement (status: Published → Archived)

**Headers:** Authorization required

**Request Body:** Empty

**Response:**
```json
{
  "success": true,
  "message": "Advertisement archived",
  "data": {
    "status": "Archived",
    "archived_at": "2026-02-21T10:10:00Z"
  }
}
```

---

## User Profile & Management

### 9. Get User Profile
**Endpoint:** `GET /get-user-profile`

**Description:** Retrieve authenticated user's profile and statistics

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "full_name": "johndoe",
    "phone": "+15550001000",
    "avatar_url": "https://i.pravatar.cc/150?u=...",
    "role": "user",
    "created_at": "2026-02-15T08:00:00Z",
    "stats": {
      "total_ads": 8,
      "published_ads": 2,
      "pending_ads": 1
    }
  }
}
```

---

## Admin Endpoints

### 10. Get Pending Advertisements
**Endpoint:** `GET /get-pending-ads`

**Description:** Retrieve all pending advertisements awaiting admin approval (Admin only)

**Headers:** Authorization required (admin user only)

**Query Parameters:**
- `limit` (number, default: 50)
- `offset` (number, default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "uuid": "550e8400-e29b-41d4-a716-446655440003",
      "title": "Sony WH-1000XM5 Headphones",
      "status": "Pending",
      "created_at": "2026-02-21T09:00:00Z",
      ...
    }
  ],
  "count": 5
}
```

---

### 11. Approve Advertisement
**Endpoint:** `POST /admin-approve-ad/:uuid`

**Description:** Approve a pending advertisement and publish it (Admin only)

**Headers:** Authorization required (admin user only)

**Request Body:** Empty

**Response:**
```json
{
  "success": true,
  "message": "Advertisement approved and published",
  "data": {
    "status": "Published",
    "published_at": "2026-02-21T10:20:00Z"
  }
}
```

**Status Codes:**
- 200: Success
- 403: Admin access required
- 400: Invalid request

---

## Error Handling

All endpoints return error responses in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- 200: Success
- 400: Bad Request (validation, parsing errors)
- 403: Forbidden (unauthorized access, wrong role)
- 500: Server Error

---

## Frontend Integration Example

```javascript
// Get published ads
const response = await fetch(
  'https://cdeozmfcesxegzejicij.supabase.co/functions/v1/get-ads?status=Published&limit=20',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  }
);
const data = await response.json();

// Create new ad
const createResponse = await fetch(
  'https://cdeozmfcesxegzejicij.supabase.co/functions/v1/create-ad',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'My New Item',
      description: 'Great condition',
      price: 100,
      category_id: 1,
      location: 'NY'
    })
  }
);
const newAd = await createResponse.json();
```

---

## Status Flow Reference

### Advertisement Lifecycle

User Creates Ad:
```
Draft → (user submits) → Pending → (admin approves) → Published → (user archives) → Archived
         ↓
         (user deletes - only Draft/Pending)
         Deleted
```

### Role Permissions

**Regular User:**
- Create ads (Draft only)
- View own ads (all statuses)
- Update own ads (Draft only)
- Delete own ads (Draft/Pending)
- Submit ads for review (Draft → Pending)
- View published ads by others
- Archive own published ads

**Admin User:**
- Cannot create ads
- View all pending ads
- Approve pending ads (Pending → Published)
- View all advertisements
- Manage moderation

---

## Deployment Status

✅ All 11 Edge Functions are ACTIVE and ready for production use.
