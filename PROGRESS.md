# PROGRESS.md — JontroBazar (server)

## Current Status
- Last completed task: Step 5 — Equipment CRUD (all endpoints: public search/filter/sort, featured, owner CRUD, admin approve/reject/delete/update, MongoDB text index)
- Currently working on: Step 6 — Client: Owner dashboard pages (Add Equipment, My Equipment table)
- Overall: 5 / 12 build steps done

## Next Steps
1. Step 6 support: Dashboard layouts, protected routing (middleware verifying JWT from BetterAuth via Authorization header)
2. Step 7 (Admin): Analytics aggregations — total users, equipment, bookings, revenue, monthly stats
3. Step 8: Bookings + Stripe webhook + payments collection

## Completed Features (summary checklist)
- [x] Setup & env
- [x] Auth (register / login / Google / JWT) — backend JWT generation and verification
- [x] Role middlewares / protected routes (`verifyToken`, `verifyCustomer`, `verifyOwner`, `verifyAdmin`)
- [x] Owner: equipment CRUD
- [ ] Admin: approve/reject, users, rentals
- [ ] Public pages (Home, All Equipment)
- [ ] Details + Favorites
- [ ] Booking + Stripe + Payments
- [ ] Dashboards (customer / owner / admin)
- [ ] Analytics
- [ ] Optional features
- [ ] README + Deployment

## API Endpoints / Routes Built
| Route | Method | Role | Status |
|---|---|---|---|
| `/` | `GET` | Public | Live |
| `/api/health` | `GET` | Public | Live |
| `/api/equipment` | `GET` | Public | Live — search, filter, sort, paginate (approved only) |
| `/api/equipment/featured` | `GET` | Public | Live — 6 most recent approved |
| `/api/equipment/categories` | `GET` | Public | Live — distinct categories |
| `/api/equipment/:id` | `GET` | Auth | Live — single item |
| `/api/equipment/owner/my-equipment` | `GET` | Owner | Live — owner's own listings |
| `/api/equipment` | `POST` | Owner | Live — create (status: pending) |
| `/api/equipment/:id` | `PUT` | Owner | Live — update own (resets to pending if core fields changed) |
| `/api/equipment/:id` | `DELETE` | Owner | Live — delete own |
| `/api/equipment/:id/status` | `PATCH` | Admin | Live — approve / reject / pending |
| `/api/admin/equipment` | `GET` | Admin | Live — all equipment all statuses |
| `/api/admin/equipment/:id` | `PUT` | Admin | Live — update any equipment |
| `/api/admin/equipment/:id` | `DELETE` | Admin | Live — delete any equipment |
| `/api/users/profile` | `PUT` | Customer, Owner, Admin | Live |
| `/api/users` | `GET` | Admin | Live |
| `/api/users/:id/role` | `PATCH` | Admin | Live |
| `/api/users/token` | `POST` | Public (Dev/Testing) | Live |

## Env Variables Used (names only)
- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `DB_NAME`
- `JWT_SECRET`
- `CLIENT_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Packages Installed
- `express` (^5.3.0)
- `mongodb` (^6.12.0)
- `dotenv` (^16.4.7)
- `cors` (^2.8.5)
- `jsonwebtoken` (^9.0.2)

## Known Issues / TODO
- MongoDB URI in `jontrobazar-server/.env` needs real credentials for full DB write/read; graceful fallback to verified JWT payload is active when DB is unconfigured.

## Log (newest first)
### 2026-11-18 — Step 5: Equipment CRUD (All Roles)
- Done:
  - Created `controllers/equipment.controller.js` with 11 handlers: `getAllEquipment` (public, search+filter+sort+paginate), `getFeaturedEquipment` (6 approved, public), `getEquipmentById` (auth, customers see approved only), `addEquipment` (owner, status=pending), `getMyEquipment` (owner), `updateEquipment` (owner own only, resets to pending if core fields changed), `deleteEquipment` (owner own only), `getAllEquipmentAdmin` (admin), `adminUpdateEquipment` (admin), `adminDeleteEquipment` (admin), `getCategories` (public, distinct categories).
  - Created `routes/equipment.routes.js` with correct route ordering (named segments before `/:id` wildcard to prevent conflicts).
  - Created `routes/admin.routes.js` for all admin-only equipment operations.
  - Registered both routers in `index.js`: `app.use("/api/equipment", ...)` and `app.use("/api/admin", ...)`.
  - Added MongoDB text index on `name`, `description`, `location`, `category`, `brand` in `config/db.js`. Added indexes on `status`, `owner.email`, `category`, `createdAt`.
- Files:
  - `H:/projects_web14/assignment-9/jontrobazar-server/controllers/equipment.controller.js` (new)
  - `H:/projects_web14/assignment-9/jontrobazar-server/routes/equipment.routes.js` (new)
  - `H:/projects_web14/assignment-9/jontrobazar-server/routes/admin.routes.js` (new)
  - `H:/projects_web14/assignment-9/jontrobazar-server/config/db.js` (updated — equipment indexes)
  - `H:/projects_web14/assignment-9/jontrobazar-server/index.js` (updated — mounted new routes)
  - `H:/projects_web14/assignment-9/jontrobazar-server/PROGRESS.md`
- Test:
  - Start server: `npm run dev`
  - `GET http://localhost:5000/api/equipment` → 200, empty array (no data yet)
  - `GET http://localhost:5000/api/equipment/featured` → 200, empty array
  - `POST http://localhost:5000/api/equipment` with Owner token → 201, item with `status: "pending"`
  - `PATCH http://localhost:5000/api/equipment/:id/status` with Admin token + `{"status":"approved"}` → 200
  - `GET http://localhost:5000/api/equipment` → shows approved item
  - `GET http://localhost:5000/api/equipment/owner/my-equipment` with Owner token → owner's listings
- Commit message: `feat: implement equipment crud with public search/filter/sort, owner management, and admin approve/reject`
### 2026-11-18 — Step 2: Users Collection, JWT Utilities & Role Middlewares
- Done:
  - Created JWT helper module (`utils/jwt.js`) for signing and verifying tokens.
  - Implemented role-based Express middlewares (`middlewares/auth.js`): `verifyToken`, `verifyCustomer`, `verifyOwner`, and `verifyAdmin`.
  - Created User controller (`controllers/user.controller.js`) and routes (`routes/user.routes.js`) for `GET /api/users/me`, `PUT /api/users/profile`, `GET /api/users`, `PATCH /api/users/:id/role`, and dev token endpoint `POST /api/users/token`.
  - Configured automated unique index creation on `users.email` and `users.role` in `config/db.js`.
  - Mounted `/api/users` route in `index.js`.
- Files:
  - `H:/projects_web14/assignment-9/jontrobazar-server/utils/jwt.js`
  - `H:/projects_web14/assignment-9/jontrobazar-server/middlewares/auth.js`
  - `H:/projects_web14/assignment-9/jontrobazar-server/controllers/user.controller.js`
  - `H:/projects_web14/assignment-9/jontrobazar-server/routes/user.routes.js`
  - `H:/projects_web14/assignment-9/jontrobazar-server/config/db.js`
  - `H:/projects_web14/assignment-9/jontrobazar-server/index.js`
  - `H:/projects_web14/assignment-9/jontrobazar-server/PROGRESS.md`
- Test:
  - Tested 401 Unauthorized rejection on unauthenticated `GET /api/users/me`.
  - Tested token generation via `POST /api/users/token`.
  - Tested authenticated 200 OK retrieval of user profile on `GET /api/users/me`.
  - Tested 403 Forbidden rejection when Customer role requests Admin-only `GET /api/users`.
  - Tested Admin token authorization.
- Commit message: `feat: implement jwt utils, role-based auth middlewares, and user management routes`

### 2026-11-18 — Step 1: Server Setup, MongoDB Native Driver & Health Check
- Done: Initialized Express application with CORS (credentials enabled), JSON parsing, MongoDB native connection singleton (`config/db.js`), `.env.example`, `.env`, `.gitignore`, `GET /` and `GET /api/health` endpoints, and verified Git initialization on branch `main`.
- Files:
  - `H:/projects_web14/assignment-9/jontrobazar-server/.env.example`
  - `H:/projects_web14/assignment-9/jontrobazar-server/.env`
  - `H:/projects_web14/assignment-9/jontrobazar-server/.gitignore`
  - `H:/projects_web14/assignment-9/jontrobazar-server/config/db.js`
  - `H:/projects_web14/assignment-9/jontrobazar-server/index.js`
  - `H:/projects_web14/assignment-9/jontrobazar-server/package.json`
  - `H:/projects_web14/assignment-9/jontrobazar-server/docs/api-spec.md`
  - `H:/projects_web14/assignment-9/jontrobazar-server/docs/db-schema.md`
  - `H:/projects_web14/assignment-9/jontrobazar-server/PROGRESS.md`
- Test: Tested `GET http://localhost:5000/api/health` via PowerShell `Invoke-RestMethod` — returned 200 OK with `{ status: "ok", uptime, database: "disconnected" }` fallback.
- Commit message: `feat: setup express server, mongodb native driver config, env, and health check`
