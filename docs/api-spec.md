# JontroBazar — API Specification

This document defines the complete REST API specification for **JontroBazar**, a role-based equipment rental marketplace (Bangladesh).

---

## 1. Overview & Architecture

- **Backend Framework:** Express.js (Node.js)
- **Database:** MongoDB
- **Client Framework:** Next.js (App Router)
- **Authentication Strategy:**
  - Client authentication sessions handled via **BetterAuth** (with Google Social Login and credentials).
  - Backend API requests secured via **JWT** sent in the `Authorization` header:
    ```http
    Authorization: Bearer <jwt_access_token>
    ```
- **Custom Express Middleware:**
  - `verifyToken`: Validates JWT signature and extracts user payload (`email`, `role`, `id`).
  - `verifyCustomer`: Requires valid token with role `customer` (or higher if permitted).
  - `verifyOwner`: Requires valid token with role `owner` or `admin`.
  - `verifyAdmin`: Requires valid token with role `admin`.

---

## 2. Business Rules & Pricing Calculations

1. **Daily Base Pricing:**
   - Every equipment item has a base `price` defined **per day**.
   - Formula for booking total:
     $$\text{Total Amount} = \text{duration (in days)} \times \text{quantity} \times \text{daily price}$$
   - *Example:* 7 days $\times$ 1 unit $\times$ 20,000 BDT = **140,000 BDT**.
2. **Access Control on Equipment Details:**
   - Viewing single equipment details (`/equipment/[id]` on client, `GET /api/equipment/:id` on backend) is **strictly private**.
   - Unauthenticated visitors clicking "View Details" must be redirected to `/login?redirect=/equipment/[id]`.
3. **Equipment Approval Workflow:**
   - Newly created equipment listings are assigned `status: "pending"`.
   - Only `admin` can update status to `"approved"` or `"rejected"`.
   - Only `"approved"` items appear in public search and featured listings.

---

## 3. Endpoints Summary Table

| Category | Method | Path | Access / Role | Handled By | Description |
|---|---|---|---|---|---|
| **Auth** | `ALL` | `/api/auth/*` | Public | **Next.js (BetterAuth)** | Registration, Credentials login, Google OAuth, session & JWT generation |
| **Users** | `GET` | `/api/users/me` | Customer, Owner, Admin | Express API | Get current user's profile |
| **Users** | `PUT` | `/api/users/profile` | Customer, Owner, Admin | Express API | Update personal profile |
| **Users** | `GET` | `/api/users` | Admin | Express API | List all registered users |
| **Users** | `PATCH` | `/api/users/:id/role` | Admin | Express API | Update user role (`customer`, `owner`, `admin`) |
| **Equipment** | `GET` | `/api/equipment` | Public | Search, filter, and sort approved items |
| **Equipment** | `GET` | `/api/equipment/featured` | Public | 6 approved items for home page (`limit(6)`) |
| **Equipment** | `GET` | `/api/equipment/:id` | Customer, Owner, Admin | View details of single equipment (private) |
| **Equipment** | `POST` | `/api/equipment` | Owner, Admin | Add new equipment listing (`pending` status) |
| **Equipment** | `GET` | `/api/equipment/my-equipment` | Owner | List equipment owned by logged-in user |
| **Equipment** | `PUT` | `/api/equipment/:id` | Owner, Admin | Update equipment details |
| **Equipment** | `DELETE` | `/api/equipment/:id` | Owner, Admin | Delete equipment listing |
| **Equipment** | `GET` | `/api/admin/equipment` | Admin | List all equipment across all statuses |
| **Equipment** | `PATCH` | `/api/equipment/:id/status` | Admin | Approve or reject listing |
| **Bookings** | `POST` | `/api/bookings` | Customer | Create booking request & check availability |
| **Bookings** | `GET` | `/api/bookings/my-rentals` | Customer | List bookings made by logged-in customer |
| **Bookings** | `GET` | `/api/bookings/owner-rentals`| Owner | List rentals for equipment owned by user |
| **Bookings** | `GET` | `/api/bookings/all` | Admin | Monitor all bookings across the platform |
| **Bookings** | `PATCH` | `/api/bookings/:id/status` | Owner, Admin | Update booking status (`confirmed`, `completed`, `cancelled`) |
| **Payments** | `POST` | `/api/payments/create-checkout-session` | Customer | Create Stripe Checkout Session |
| **Payments** | `POST` | `/api/payments/verify` | Customer, Admin | Verify session, record payment, confirm booking |
| **Payments** | `POST` | `/api/payments/webhook` | Stripe (Webhook) | Fallback asynchronous payment listener |
| **Favorites**| `GET` | `/api/favorites` | Customer, Owner, Admin | Get user's saved favorite items |
| **Favorites**| `POST` | `/api/favorites` | Customer, Owner, Admin | Add item to favorites |
| **Favorites**| `DELETE`| `/api/favorites/:equipmentId` | Customer, Owner, Admin | Remove item from favorites |
| **Favorites**| `GET` | `/api/favorites/check/:equipmentId` | Customer, Owner, Admin | Check favorite state for an item |
| **Analytics**| `GET` | `/api/analytics/owner` | Owner | Aggregated metrics & monthly chart for owner |
| **Analytics**| `GET` | `/api/analytics/admin` | Admin | Platform-wide metrics & monthly chart for admin |
| **Health** | `GET` | `/api/health` | Public | Server health & MongoDB ping |

---

## 4. Detailed Endpoint Specifications

### 4.1 Authentication & User Management

#### Authentication Handled by Next.js (`src/app/api/auth/[...all]/route.js` via BetterAuth)
- **Routes:** Handled natively by BetterAuth catch-all handler in Next.js:
  - `authClient.signUp.email(...)`: Registers new user in MongoDB `users` collection with role `customer`.
  - `authClient.signIn.email(...)`: Authenticates email/password against MongoDB.
  - `authClient.signIn.social({ provider: "google" })`: Handles Google OAuth login & creates account/user in MongoDB if new.
  - Generates session and signs JWT token using `jwt()` plugin.
- **Client Usage:**
  - Client sends the signed JWT to the Express server in the `Authorization: Bearer <token>` header for all backend requests.

#### User Endpoints Handled by Express Server (`/api/users/*`)

#### `GET /api/users/me`
- **Access:** Authenticated (`verifyToken`)
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** Current user object with populated role and profile fields.

#### `PUT /api/users/profile`
- **Access:** Authenticated (`verifyToken`)
- **Request Body:**
  ```json
  {
    "name": "Rahim Ahmed",
    "photo": "https://i.ibb.co/new.jpg",
    "phone": "+8801700000000",
    "address": "Dhanmondi, Dhaka, Bangladesh"
  }
  ```

#### `GET /api/users`
- **Access:** Admin only (`verifyToken`, `verifyAdmin`)
- **Response (200 OK):** Array of all user objects.

#### `PATCH /api/users/:id/role`
- **Access:** Admin only (`verifyToken`, `verifyAdmin`)
- **Request Body:**
  ```json
  {
    "role": "owner" // "customer" | "owner" | "admin"
  }
  ```

---

### 4.2 Equipment Management

#### `GET /api/equipment`
- **Access:** Public
- **Query Parameters:**
  - `search`: Keyword string matched against name, category, or location.
  - `category`: Category string (e.g. `Construction`, `Agriculture`, `Photography`).
  - `rentalType`: `daily` | `weekly` | `monthly`.
  - `minPrice`, `maxPrice`: Numeric range.
  - `availability`: `available` (quantity > 0) | `all`.
  - `sort`: `price_asc` | `price_desc` | `newest`.
  - `page`, `limit`: For pagination (default limit: 12).
- **Filter:** Always includes `{ status: "approved" }`.

#### `GET /api/equipment/featured`
- **Access:** Public
- **Response (200 OK):** Array of top 6 approved equipment (`status: "approved"`, sorted by `createdAt: -1`, `limit: 6`).

#### `GET /api/equipment/:id`
- **Access:** Authenticated (`verifyToken`)
- **Behavior:** Returns full equipment details. If not authenticated, client redirects to `/login?redirect=/equipment/:id`.

#### `POST /api/equipment`
- **Access:** Owner or Admin (`verifyToken`, `verifyOwner`)
- **Request Body:**
  ```json
  {
    "name": "CAT 320 Hydraulic Excavator",
    "description": "Heavy-duty excavator suitable for construction sites.",
    "category": "Construction",
    "location": "Mirpur, Dhaka",
    "price": 25000,
    "rentalType": "daily",
    "quantity": 2,
    "condition": "Excellent",
    "brand": "Caterpillar",
    "model": "320D",
    "image": "https://i.ibb.co/excavator.jpg",
    "terms": "Fuel not included. Operator available upon request."
  }
  ```
- **Behavior:** Injects owner info from `req.user` (`name`, `email`, `photo`) and sets `status: "pending"`.

#### `GET /api/equipment/my-equipment`
- **Access:** Owner or Admin (`verifyToken`, `verifyOwner`)
- **Behavior:** Returns all equipment where `owner.email == req.user.email`.

#### `PUT /api/equipment/:id`
- **Access:** Owner (own equipment) or Admin
- **Behavior:** Updates fields. If non-admin owner updates critical info, status may return to `"pending"` or remain as configured.

#### `DELETE /api/equipment/:id`
- **Access:** Owner (own equipment) or Admin
- **Behavior:** Deletes the equipment listing.

#### `GET /api/admin/equipment`
- **Access:** Admin only (`verifyToken`, `verifyAdmin`)
- **Behavior:** Returns all equipment regardless of status (`pending`, `approved`, `rejected`).

#### `PATCH /api/equipment/:id/status`
- **Access:** Admin only (`verifyToken`, `verifyAdmin`)
- **Request Body:**
  ```json
  {
    "status": "approved" // "approved" | "rejected"
  }
  ```

---

### 4.3 Bookings & Rentals

#### `POST /api/bookings`
- **Access:** Customer (`verifyToken`, `verifyCustomer`)
- **Request Body:**
  ```json
  {
    "equipmentId": "673c...",
    "startDate": "2026-12-01T00:00:00.000Z",
    "endDate": "2026-12-08T00:00:00.000Z",
    "quantity": 1,
    "contact": "+8801711111111",
    "address": "Uttara, Dhaka",
    "notes": "Please deliver early morning."
  }
  ```
- **Validation:**
  - Checks if requested `quantity` is within available inventory for those dates.
  - Computes `days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))`.
  - Computes `totalAmount = days * quantity * equipment.price`.
  - Sets initial `paymentStatus: "unpaid"`, `bookingStatus: "pending"`.

#### `GET /api/bookings/my-rentals`
- **Access:** Customer (`verifyToken`)
- **Behavior:** Returns bookings where `customer.email == req.user.email`, populated with equipment details.

#### `GET /api/bookings/owner-rentals`
- **Access:** Owner (`verifyToken`, `verifyOwner`)
- **Behavior:** Returns bookings where `owner.email == req.user.email`.

#### `GET /api/bookings/all`
- **Access:** Admin (`verifyToken`, `verifyAdmin`)
- **Behavior:** Returns all bookings across the platform.

#### `PATCH /api/bookings/:id/status`
- **Access:** Owner (for their own equipment) or Admin
- **Request Body:**
  ```json
  {
    "bookingStatus": "completed" // "confirmed" | "completed" | "cancelled"
  }
  ```

---

### 4.4 Payments (Stripe Checkout)

#### `POST /api/payments/create-checkout-session`
- **Access:** Customer (`verifyToken`)
- **Request Body:**
  ```json
  {
    "bookingId": "673c..."
  }
  ```
- **Behavior:**
  - Retrieves booking & equipment data.
  - Creates a Stripe Checkout Session with `unit_amount: totalAmount * 100`, currency `bdt` (or `usd` depending on Stripe currency support), metadata with `bookingId`, `customerEmail`.
  - Success URL: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`
  - Cancel URL: `${CLIENT_URL}/equipment/${equipmentId}`
- **Response (200 OK):**
  ```json
  {
    "url": "https://checkout.stripe.com/c/pay/cs_test_..."
  }
  ```

#### `POST /api/payments/verify`
- **Access:** Customer or Admin (`verifyToken`)
- **Request Body:**
  ```json
  {
    "sessionId": "cs_test_..."
  }
  ```
- **Behavior (Idempotent):**
  - Fetches session from Stripe API.
  - If `payment_status === "paid"`:
    - Finds or creates record in `payments` collection.
    - Updates booking: `paymentStatus: "paid"`, `bookingStatus: "confirmed"`.
- **Response (200 OK):** Confirmed booking and transaction ID.

#### `POST /api/payments/webhook`
- **Access:** Stripe Webhook Signature verification (`stripe-signature` header)
- **Behavior:** Handles `checkout.session.completed` asynchronously.

---

### 4.5 Favorites

#### `GET /api/favorites`
- **Access:** Authenticated (`verifyToken`)
- **Behavior:** Returns user's favorite equipment items populated from `equipment` collection.

#### `POST /api/favorites`
- **Access:** Authenticated (`verifyToken`)
- **Request Body:**
  ```json
  {
    "equipmentId": "673c..."
  }
  ```
- **Behavior:** Creates favorite entry if not already present.

#### `DELETE /api/favorites/:equipmentId`
- **Access:** Authenticated (`verifyToken`)
- **Behavior:** Removes favorite entry.

#### `GET /api/favorites/check/:equipmentId`
- **Access:** Authenticated (`verifyToken`)
- **Response (200 OK):** `{ "isFavorite": true | false }`

---

### 4.6 Analytics

#### `GET /api/analytics/owner`
- **Access:** Owner (`verifyToken`, `verifyOwner`)
- **Response (200 OK):**
  ```json
  {
    "totalEquipment": 8,
    "completedRentals": 14,
    "totalEarnings": 280000,
    "monthlyEarnings": [
      { "month": "Jan", "earnings": 45000 },
      { "month": "Feb", "earnings": 60000 }
    ]
  }
  ```

#### `GET /api/analytics/admin`
- **Access:** Admin (`verifyToken`, `verifyAdmin`)
- **Response (200 OK):**
  ```json
  {
    "totalUsers": 120,
    "totalEquipment": 45,
    "totalBookings": 85,
    "pendingApprovals": 6,
    "completedRentals": 62,
    "totalRevenue": 1250000,
    "monthlyBookings": [
      { "month": "Jan", "count": 12, "revenue": 180000 },
      { "month": "Feb", "count": 18, "revenue": 240000 }
    ]
  }
  ```

---

### 4.7 Health Check

#### `GET /api/health`
- **Access:** Public
- **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "uptime": 124.5,
    "database": "connected",
    "timestamp": "2026-11-18T08:30:00.000Z"
  }
  ```
