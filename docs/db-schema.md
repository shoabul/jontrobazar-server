# JontroBazar — Database Schema Specification

This document defines the complete MongoDB database schema, data models, validation rules, indexes, and aggregation pipelines for **JontroBazar**.

---

## 1. Database Overview

- **Database Engine:** MongoDB (v6.0+ recommended)
- **Driver:** Native MongoDB NodeJS Driver (`mongodb`) / Mongoose
- **Database Name:** `jontrobazar` (configurable via `DB_NAME` in `.env`)
- **Naming Conventions:**
  - Collection names: plural, lowercase (`users`, `equipment`, `bookings`, `payments`, `favorites`).
  - Field names: camelCase (`equipmentId`, `totalAmount`, `paymentStatus`).
  - IDs: MongoDB `_id` (`ObjectId`).

---

## 2. Collections & Field Definitions

### 2.1 Collection: `users`
Stores all registered user profiles and role allocations.

```javascript
{
  _id: ObjectId,                     // Primary Key
  name: String,                      // Full name (Required)
  email: String,                     // Lowercase, trimmed (Required, Unique)
  password: String,                  // Hashed with bcrypt (Optional for Google OAuth users)
  photo: String,                     // Avatar URL (imgbb or Google profile URL)
  phone: String,                     // Contact phone number
  address: String,                   // Physical address / city
  role: String,                      // 'customer' | 'owner' | 'admin' (Default: 'customer')
  createdAt: Date,                   // Timestamp
  updatedAt: Date                    // Timestamp
}
```

#### Validation & Constraints
- `email`: Valid email syntax, forced lowercase, indexed unique.
- `role`: Must be one of `['customer', 'owner', 'admin']`.
- `password`: Enforced at API registration level (min 6 chars, >= 1 uppercase, >= 1 lowercase).

#### Indexes
```javascript
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
```

---

### 2.2 Collection: `equipment`
Stores rental listings published by owners.

```javascript
{
  _id: ObjectId,                     // Primary Key
  name: String,                      // Equipment title / name (Required)
  description: String,               // Detailed specifications and features (Required)
  category: String,                  // Enum: see category list below (Required)
  location: String,                  // City or area, e.g. "Mirpur, Dhaka" (Required)
  price: Number,                     // Daily base rental price in BDT (Required)
  rentalType: String,                // 'daily' | 'weekly' | 'monthly' (Default: 'daily')
  quantity: Number,                  // Total units available (Required, min: 1)
  condition: String,                 // 'New' | 'Like New' | 'Good' | 'Fair' (Required)
  brand: String,                     // Manufacturer brand, e.g. "Caterpillar", "Sony"
  model: String,                     // Model number or spec, e.g. "A7IV", "320D"
  image: String,                     // imgbb hosted image URL (Required)
  terms: String,                     // Rental conditions, terms, deposit info
  status: String,                    // 'pending' | 'approved' | 'rejected' (Default: 'pending')
  owner: {                           // Denormalized owner snapshot
    name: String,
    email: String,                   // References users.email (Required)
    photo: String
  },
  createdAt: Date,                   // Timestamp
  updatedAt: Date                    // Timestamp
}
```

#### Supported Categories
1. `Construction`
2. `Photography`
3. `Vehicles & Transportation`
4. `Agriculture`
5. `Electronics`
6. `Event Equipment`

#### Pricing Rule
- The `price` stored is always the **daily base price**.
- Booking calculations multiply: $\text{duration in days} \times \text{quantity} \times \text{price}$.

#### Indexes
```javascript
db.equipment.createIndex({ status: 1, createdAt: -1 });
db.equipment.createIndex({ category: 1, status: 1 });
db.equipment.createIndex({ "owner.email": 1 });
db.equipment.createIndex({ price: 1 });
db.equipment.createIndex({
  name: "text",
  description: "text",
  location: "text",
  category: "text",
  brand: "text"
});
```

---

### 2.3 Collection: `bookings`
Stores rental reservations made by customers.

```javascript
{
  _id: ObjectId,                     // Primary Key
  equipmentId: ObjectId,             // Reference to equipment._id (Required)
  equipmentName: String,             // Denormalized equipment name
  equipmentImage: String,            // Denormalized image for fast rendering
  customer: {
    name: String,                    // Customer name (Required)
    email: String,                   // References users.email (Required)
    phone: String                    // Contact phone (Required)
  },
  owner: {
    name: String,                    // Equipment owner name
    email: String                    // References users.email (Required)
  },
  startDate: Date,                   // Booking start date (Required)
  endDate: Date,                     // Booking end date (Required)
  durationDays: Number,              // Calculated number of rental days
  quantity: Number,                  // Units reserved (Required, min: 1)
  contact: String,                   // Contact number for delivery/pickup
  address: String,                   // Delivery / site address
  notes: String,                     // Optional special instructions
  totalAmount: Number,               // durationDays * quantity * dailyPrice (BDT)
  paymentStatus: String,             // 'unpaid' | 'paid' | 'refunded' (Default: 'unpaid')
  bookingStatus: String,             // 'pending' | 'confirmed' | 'completed' | 'cancelled' (Default: 'pending')
  createdAt: Date,                   // Timestamp
  updatedAt: Date                    // Timestamp
}
```

#### Status Lifecycle
```
[Created] -> paymentStatus: "unpaid", bookingStatus: "pending"
    |
    v (Payment Success via Stripe)
paymentStatus: "paid", bookingStatus: "confirmed"
    |
    v (Rental Finished / cron)
bookingStatus: "completed"
```

#### Indexes
```javascript
db.bookings.createIndex({ "customer.email": 1, createdAt: -1 });
db.bookings.createIndex({ "owner.email": 1, createdAt: -1 });
db.bookings.createIndex({ equipmentId: 1, startDate: 1, endDate: 1 });
db.bookings.createIndex({ bookingStatus: 1 });
db.bookings.createIndex({ paymentStatus: 1 });
```

---

### 2.4 Collection: `payments`
Stores verified financial transactions recorded from Stripe Checkout.

```javascript
{
  _id: ObjectId,                     // Primary Key
  bookingId: ObjectId,               // Reference to bookings._id (Required)
  transactionId: String,             // Stripe session ID or payment_intent ID (Required, Unique)
  amount: Number,                    // Total amount paid in BDT
  customerEmail: String,             // References users.email
  paymentMethod: String,             // 'stripe' (Default: 'stripe')
  status: String,                    // 'succeeded' | 'failed' | 'pending' (Default: 'succeeded')
  createdAt: Date                    // Timestamp
}
```

#### Indexes
```javascript
db.payments.createIndex({ transactionId: 1 }, { unique: true });
db.payments.createIndex({ bookingId: 1 });
db.payments.createIndex({ customerEmail: 1, createdAt: -1 });
```

---

### 2.5 Collection: `favorites`
Stores equipment items bookmarked by authenticated users.

```javascript
{
  _id: ObjectId,                     // Primary Key
  userEmail: String,                 // References users.email (Required)
  equipmentId: ObjectId,             // Reference to equipment._id (Required)
  createdAt: Date                    // Timestamp
}
```

#### Constraints & Indexes
Each user can only favorite a given equipment item once.
```javascript
db.favorites.createIndex({ userEmail: 1, equipmentId: 1 }, { unique: true });
db.favorites.createIndex({ userEmail: 1, createdAt: -1 });
```

---

## 3. Entity Relationship Diagram (ERD)

```
       +-----------------------+
       |         users         |
       +-----------------------+
       | _id                   |
       | email (unique)        |
       | name                  |
       | role                  |
       +-----------------------+
          |                 |
          | owns            | books / favorites
          v                 v
+-------------------+   +--------------------+   +-------------------+
|     equipment     |   |      bookings      |   |     favorites     |
+-------------------+   +--------------------+   +-------------------+
| _id               |   | _id                |   | _id               |
| owner.email       |---| equipmentId        |---| equipmentId       |
| status (approved) |   | customer.email     |   | userEmail         |
| price (per day)   |   | totalAmount        |   +-------------------+
+-------------------+   | paymentStatus      |
          |             | bookingStatus      |
          |             +--------------------+
          |                       |
          | paid via              |
          +---------------------->|
                                  v
                        +--------------------+
                        |      payments      |
                        +--------------------+
                        | _id                |
                        | bookingId          |
                        | transactionId      |
                        | amount             |
                        +--------------------+
```

---

## 4. Analytics Aggregation Pipelines

### 4.1 Admin Analytics Aggregation
Computes platform totals and monthly trends:
```javascript
// Platform summary counts
const [usersCount, equipmentCount, bookingsCount, pendingApprovals, completedRentals] = await Promise.all([
  db.collection("users").countDocuments(),
  db.collection("equipment").countDocuments({ status: "approved" }),
  db.collection("bookings").countDocuments(),
  db.collection("equipment").countDocuments({ status: "pending" }),
  db.collection("bookings").countDocuments({ bookingStatus: "completed" })
]);

// Revenue & monthly booking aggregation
const monthlyStats = await db.collection("bookings").aggregate([
  { $match: { paymentStatus: "paid" } },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
      count: { $sum: 1 },
      revenue: { $sum: "$totalAmount" }
    }
  },
  { $sort: { _id: 1 } }
]).toArray();
```

### 4.2 Owner Analytics Aggregation
Computes an owner's metrics and monthly earnings:
```javascript
const ownerEmail = req.user.email;

const [totalEquipment, completedRentals] = await Promise.all([
  db.collection("equipment").countDocuments({ "owner.email": ownerEmail }),
  db.collection("bookings").countDocuments({ "owner.email": ownerEmail, bookingStatus: "completed" })
]);

const earningsStats = await db.collection("bookings").aggregate([
  {
    $match: {
      "owner.email": ownerEmail,
      paymentStatus: "paid"
    }
  },
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
      monthlyEarnings: { $sum: "$totalAmount" },
      bookingsCount: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]).toArray();
```
