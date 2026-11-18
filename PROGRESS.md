# PROGRESS.md — JontroBazar (server)

## Current Status
- Last completed task: Step 2 — Server: users collection setup, JWT utilities, role middlewares (`verifyToken`, `verifyCustomer`, `verifyOwner`, `verifyAdmin`), and user profile/admin management routes
- Currently working on: Ready for Step 3 (Client: layout, navbar/footer, theme, loading & error pages)
- Overall: 2 / 12 build steps done

## Next Steps
1. Move to Client (Step 3): Build dynamic responsive Navbar and Footer (with new X logo)
2. Setup theme toggle (light/dark with localStorage)
3. Implement global loading page (`loading.js`), error boundary (`error.js`), and not-found page (`not-found.js`)

## Completed Features (summary checklist)
- [x] Setup & env
- [x] Auth (register / login / Google / JWT) — backend JWT generation and verification
- [x] Role middlewares / protected routes (`verifyToken`, `verifyCustomer`, `verifyOwner`, `verifyAdmin`)
- [ ] Owner: equipment CRUD
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
| `/api/users/me` | `GET` | Customer, Owner, Admin | Live |
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
