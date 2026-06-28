# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

Monorepo with two independent apps plus Docker orchestration:

- [frontend/](frontend/) — React 18 + TypeScript + Vite, Zustand stores, React Query, shadcn/ui (Radix) components, Tailwind, react-router-dom v6, react-i18next (en/es/fr), `vite-plugin-pwa`. Path alias: `@/*` → `frontend/src/*`.
- [backend/](backend/) — Express 4 + TypeScript, Sequelize 6 ORM against PostgreSQL 15, Google OAuth (passport-google-oauth20), Cloudinary for images.
- [package.json](package.json) at the root duplicates a subset of frontend deps and has Vite scripts. The actual frontend lives in `frontend/`. Work inside `frontend/` or `backend/` rather than the root unless explicitly touching root config / tooling.

## Common commands

All `npm` commands run inside the respective `frontend/` or `backend/` directory unless noted.

### Frontend ([frontend/](frontend/))
```bash
npm run dev        # Vite dev server, port 8080 (override via VITE_DEV_SERVER_PORT / VITE_PORT)
npm run build      # production build
npm run build:dev  # build with development mode (keeps lovable-tagger)
npm run lint       # eslint .
npm run preview    # serve built dist
```

### Backend ([backend/](backend/))
```bash
npm run dev              # nodemon src/index.ts — auto-runs migrations on startup in dev
npm run debug            # nodemon with --inspect on 0.0.0.0:9229
npm run build            # tsc → dist/
npm start                # node dist/index.js

# Migrations (see backend/MIGRATION_GUIDE.md)
npm run db:migrate              # sequelize-cli db:migrate
npm run db:migrate:undo         # rollback last
npm run db:migrate:status
npm run db:migration:create <name>
npm run migrate:smart           # environment-aware smart migrator (utils/migrationStrategy.ts)
npm run migrate:production      # forces production migration; requires NODE_ENV=production
npm run migrate:validate
npm run dev:no-migrate          # AUTO_MIGRATE=false
npm run dev:manual              # NODE_ENV=manual — never auto-migrates

# Seeding
npm run seed:items              # seed Item catalog from src/scripts/output_*.csv (dev DB)
npm run seed:items:staging      # same, targets my_fridge_db_staging on port 5433
```

There is no test runner configured — `backend` has a placeholder `npm test` that exits with an error, and `frontend` has none.

### Docker workflows

- Dev (hot reload, auto-migrate, debug port 9229): `docker-compose -f docker-compose.dev.yml up --build`
- Staging (NODE_ENV=development but staging DB on host port 5433, backend on 3001, frontend on 8081): `docker-compose -f docker-compose.staging.yml up --build`
- Prod image pulls from GHCR (`ghcr.io/realague/my-fridge/{backend,frontend}`): `docker-compose up` (or `-f docker-compose.prod.build.yml` to build locally)
- DB shell: `docker-compose -f docker-compose.dev.yml exec db psql -U postgres -d my_fridge_db`

Service URLs in dev: frontend `http://localhost:8080`, backend `http://localhost:3000`, Postgres `localhost:5432` (user/password/db = `postgres`/`postgres`/`my_fridge_db`).

## Architecture

### Backend: routes → controllers → services → repositories → models

[backend/src/index.ts](backend/src/index.ts) wires route modules onto the Express app and calls `executeSmartMigration()` before `listen`. Domain flow:

- [routes/](backend/src/routes/) — Express routers, all protected routes call `authenticateGoogleToken` from [middleware/auth.ts](backend/src/middleware/auth.ts). Household-scoped resources mount under `/api/households/:householdId/...` (e.g. stored-items, storage-areas, meal-plans); standalone resources under `/api/items`, `/api/recipes`, etc.
- [controllers/](backend/src/controllers/) — thin HTTP layer; instantiate one service in the constructor, parse `req`, return `ApiResponse<T>` ([types/ApiResponse.ts](backend/src/types/ApiResponse.ts)), throw `CustomErrors` ([errors/CustomErrors.ts](backend/src/errors/CustomErrors.ts)).
- [services/](backend/src/services/) — business logic. Most depend on one or more repositories. `CascadeDeletionService` / `ItemCascadeDeletionService` coordinate multi-table deletions; `IngredientMatchingService` / `RecipeConsumeService` tie recipes to stored items; `AuthService` owns Google ID-token verification and our refresh tokens.
- [repositories/](backend/src/repositories/) — Sequelize queries. Keep raw `findAll/findOne/create` here, not in services.
- [models/](backend/src/models/) and [models/index.ts](backend/src/models/index.ts) — Sequelize models and the **single source of associations**. When adding a model, wire its `hasMany`/`belongsTo` there and re-export.

Data model revolves around **Household**: every `User` joins 1–N households through `HouseholdMember`, and almost every domain object (`Item`, `StoredItem`, `ShoppingItem`, `Recipe`, `MealPlan`, `ItemMinimum`, `LoyaltyCard`, `StorageArea`) is scoped by `householdId`. `StoredItem` also links to a `StorageArea` (fridge/freezer/pantry/etc.).

### Backend: migrations

Never hand-edit an already-run migration file; create a new one with `npm run db:migration:create <name>`. The system has two layers:

- Sequelize CLI (`db:migrate*`) for direct control.
- **Smart migration runner** in [utils/migrationStrategy.ts](backend/src/utils/migrationStrategy.ts) + [utils/migrationManager.ts](backend/src/utils/migrationManager.ts), invoked on server startup and via `/api/migrations/*` endpoints. It adapts to `NODE_ENV`:
  - `development` → auto-runs.
  - `staging` → dry-run unless `APPROVE_MIGRATIONS=true`.
  - `production` → **reports only**; execution requires `FORCE_PRODUCTION_MIGRATION=true` (or `POST /api/migrations/run-production` with `{"confirm":"I understand the risks"}`).
  - `manual` or `AUTO_MIGRATE=false` → never auto-runs.

See [backend/MIGRATION_GUIDE.md](backend/MIGRATION_GUIDE.md) for details and the full API.

### Frontend: stores, services, auth

Auth is Google OAuth; tokens live in the persisted Zustand `authStore` ([frontend/src/stores/authStore.ts](frontend/src/stores/authStore.ts)) with auto-refresh.

Every API call goes through `makeAuthenticatedApiCall` in [frontend/src/utils/apiAuth.ts](frontend/src/utils/apiAuth.ts), which:
1. pulls a valid access token from `authStore` (refreshing once on 401);
2. JSON-serializes the body (**callers must pass raw objects, not `JSON.stringify`d strings**);
3. redirects to `/auth` on auth failure.

Both services (`frontend/src/services/*.ts`) and stores (`frontend/src/stores/*.ts`) build a thin `apiService` wrapper on top of `makeAuthenticatedApiCall` — see [frontend/SERVICE_ARCHITECTURE.md](frontend/SERVICE_ARCHITECTURE.md) for the canonical pattern (the `get/post/put/delete` factory). Follow it verbatim when adding new services/stores; don't reintroduce the old dependency-injection `initialize*` pattern except where legacy stores still require it (`itemMinimumStore`, `loyaltyCardStore`, household sync — all wired in [StoreProvider.tsx](frontend/src/components/StoreProvider.tsx), which must run inside `BrowserRouter` and `AuthStore`).

### Frontend: routing & providers

[App.tsx](frontend/src/App.tsx) is the provider stack (order matters): `QueryClientProvider` → `ThemeProvider` → `TooltipProvider` → `NotificationProvider` → `RecipeProvider` → `BrowserRouter` → `MealPlanProvider` → `StoreProvider` → `Routes`. Add new routes here. `MealPlanProvider` / `RecipeProvider` / `NotificationContext` are React Context providers; domain state otherwise lives in Zustand stores.

### Frontend: i18n

All user-facing strings must be translation keys resolved via `useTranslation()` / `i18n.t()`. Keys live in [frontend/src/i18n/locales/{en,es,fr}.json](frontend/src/i18n/locales/) — when adding a key, update all three locales. `en` is the fallback.

### Frontend: PWA

PWA is built in via [`VitePWA`](frontend/vite.config.ts) with `registerType: 'autoUpdate'`. Icons are in [frontend/public/icons/](frontend/public/icons/); update the manifest block in `vite.config.ts` if adding sizes.

## Environment variables

Backend reads: `DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, PORT, NODE_ENV, FRONTEND_URL, AUTO_MIGRATE, APPROVE_MIGRATIONS, FORCE_PRODUCTION_MIGRATION, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, LOGODEV_PUBLISHABLE_KEY`.

`LOGODEV_PUBLISHABLE_KEY` — logo.dev publishable key (`pk_…`) used by the brands logo script and custom-brand logo fetch.

Frontend reads (via `import.meta.env`): `VITE_BACKEND_URL, VITE_GOOGLE_CLIENT_ID, VITE_DEV_SERVER_PORT` / `VITE_PORT`, plus the staging-banner vars (`VITE_SHOW_ENV_BANNER, VITE_DEPLOY_BRANCH, VITE_DEPLOY_COMMIT, VITE_BUILD_DATE`).

## Conventions worth following

- Backend controllers always return `ApiResponse<T>` (`{ success, message?, data?, error? }`) and let `CustomErrors` bubble to the Express error handler.
- Household-scoped routes take `householdId` as the first URL param; controllers pull `userId` from `req.user` (set by `authenticateGoogleToken`).
- CORS allow-list lives in [backend/src/index.ts](backend/src/index.ts); add new frontend origins there.
- Frontend enums shared with the backend live in [frontend/src/types/enums.ts](frontend/src/types/enums.ts) — keep in sync with [backend/src/types/enums.ts](backend/src/types/enums.ts) when touching units, categories, storage types, etc. (A few recent migrations — `add-cl-to-unit-enums`, `add-fish-seafood-to-category-enum`, `extend-loyalty-card-barcode-format-enum` — are specifically widening these enums; expect to touch both sides.)
- Unit conversion logic is duplicated front + back: [frontend/src/utils/unitConversion.ts](frontend/src/utils/unitConversion.ts) and [backend/src/utils/unitConversion.ts](backend/src/utils/unitConversion.ts). Changes must be mirrored.
