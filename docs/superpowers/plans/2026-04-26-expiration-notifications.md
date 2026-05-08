# Expiration Notifications Implementation Plan

**Goal:** Alert household members when items approach expiration via a Dashboard card and notification drawer, with a configurable household-level alert window.

**Architecture:**
- **Backend (Express/Sequelize/PG):** Two new tables. `household_settings` (household-scoped config: expiration_alert_days). `expiration_notifications` (one row per item+phase, deduped). Notifications are generated **lazily** on every authenticated GET to `/notifications` so we don't need a cron worker. Read state is per-user via a join table `expiration_notification_reads`. Cleanup of >30d notifications happens in the same lazy pass.
- **Frontend (React/Vite/Zustand/i18next):** New `expirationNotificationStore` (server-driven, replaces local-only `NotificationContext` for expiration alerts). New `ExpiringSoonCard` Dashboard component. New household settings section. Existing `NotificationDrawer` is rewired to read from the new store.

**Tech Stack:** TypeScript, Express, Sequelize 6, PostgreSQL, React 18, React Router 6, Zustand 5, TanStack Query (already present but optional here), Tailwind, shadcn/ui, framer-motion, i18next, date-fns. Apply the canonical charter: Pistache/Encre/Papier palette, Fraunces + Funnel Sans, motion tokens, calm voice.

---

## Decisions / Constraints

1. **Lazy generation, not cron.** When the frontend calls `GET /api/households/:id/notifications`, the backend computes which `(storedItem, phase)` pairs *should* exist now and inserts the missing ones (idempotent via unique constraint). This satisfies "se met à jour à chaque ouverture de l'app" without requiring a scheduler.
2. **Two phases per item:** `initial` (J-X where X = household setting) and `reminder` (J-1). If `expirationAlertDays === 1`, only `reminder` is created.
3. **No J0 entry in drawer.** Spec is explicit. The Dashboard card shows "Aujourd'hui" / "Expiré" — those come from a *separate* endpoint that returns current expiring items, not from the notifications table.
4. **Read state is per-user.** Notifications themselves are household-shared.
5. **Auto-resolution.** When a `StoredItem` is destroyed, its notifications are deleted via Sequelize cascade.
6. **Notifications older than 30 days are pruned** during the lazy generation pass.
7. **Freezer items never trigger expiration alerts.** Reuse `getEffectiveExpirationDate()` semantics.
8. **Settings change does not retroactively delete already-created notifications.** New notifications are computed using the new threshold.
9. **Effective expiration date = item-level computation.** Use `StoredItem.getEffectiveExpirationDate()` (already accounts for opened items, freezer).

---

## File Inventory

### Backend (create)
- `backend/src/models/HouseholdSettings.ts`
- `backend/src/models/ExpirationNotification.ts`
- `backend/src/models/ExpirationNotificationRead.ts`
- `backend/src/migrations/202604260-create-household-settings-table.js`
- `backend/src/migrations/202604261-create-expiration-notifications-table.js`
- `backend/src/migrations/202604262-create-expiration-notification-reads-table.js`
- `backend/src/repositories/HouseholdSettingsRepository.ts`
- `backend/src/repositories/ExpirationNotificationRepository.ts`
- `backend/src/services/HouseholdSettingsService.ts`
- `backend/src/services/ExpirationNotificationService.ts`
- `backend/src/controllers/HouseholdSettingsController.ts`
- `backend/src/controllers/ExpirationNotificationController.ts`
- `backend/src/routes/householdSettings.ts`
- `backend/src/routes/notifications.ts`

### Backend (modify)
- `backend/src/models/index.ts` — register new models, associations, cascade
- `backend/src/index.ts` — mount new routes
- `backend/src/types/ItemDto.ts` (or new dto file) — add notification DTOs

### Frontend (create)
- `frontend/src/services/notificationService.ts`
- `frontend/src/services/householdSettingsService.ts`
- `frontend/src/stores/expirationNotificationStore.ts`
- `frontend/src/stores/householdSettingsStore.ts`
- `frontend/src/components/ExpiringSoonCard.tsx`
- `frontend/src/components/HouseholdExpirationSettings.tsx`
- `frontend/src/types/expirationNotification.ts`

### Frontend (modify)
- `frontend/src/components/NotificationDrawer.tsx` — switch to server-driven data
- `frontend/src/pages/Dashboard.tsx` — render `ExpiringSoonCard`, real bell badge
- `frontend/src/pages/HouseholdDetails.tsx` — embed `HouseholdExpirationSettings`
- `frontend/src/i18n/locales/{fr,en,es}.json` — add translations

---

## Data Model

### `household_settings`
```
id              UUID PK
householdId     UUID UNIQUE FK -> households.id (CASCADE)
expirationAlertDays  INT NOT NULL DEFAULT 3 CHECK (1..14)
createdAt, updatedAt
```

### `expiration_notifications`
```
id                 UUID PK
householdId        UUID FK -> households.id (CASCADE)
storedItemId       UUID FK -> stored_items.id (CASCADE)
phase              ENUM('initial','reminder')
itemNameSnapshot   TEXT (in case item is renamed/deleted before user reads)
storageAreaSnapshot TEXT
storageAreaIdSnapshot UUID NULL
expirationDateSnapshot DATE
isOpenedSnapshot   BOOL DEFAULT false
openedDateSnapshot DATE NULL
createdAt, updatedAt

UNIQUE (storedItemId, phase)  -- dedup
INDEX (householdId, createdAt DESC)
```

### `expiration_notification_reads`
```
notificationId  UUID FK -> expiration_notifications.id (CASCADE)
userId          UUID FK -> users.id (CASCADE)
readAt          TIMESTAMP NOT NULL DEFAULT NOW()
PRIMARY KEY (notificationId, userId)
```

---

## API

| Verb | Path | Description |
|---|---|---|
| GET | `/api/households/:id/settings` | Returns settings (auto-creates with defaults if missing) |
| PUT | `/api/households/:id/settings` | Updates expirationAlertDays |
| GET | `/api/households/:id/notifications` | Lazy-generates + returns notifications (sorted desc) with `readByCurrentUser`, `unreadCount` |
| POST | `/api/households/:id/notifications/:notificationId/read` | Marks one as read (for current user) |
| POST | `/api/households/:id/notifications/read-all` | Marks all as read (for current user) |
| DELETE | `/api/households/:id/notifications/:notificationId` | Deletes notification (household-wide) |
| DELETE | `/api/households/:id/notifications` | Clears all notifications (household-wide) |
| GET | `/api/households/:id/expiring-now` | Returns items grouped by urgency for Dashboard card (does not write the notifications table) |

All gated by `authenticateGoogleToken`. All verify caller is a member of `householdId`.

---

## Lazy Generation Algorithm (`ExpirationNotificationService.syncForHousehold`)

```
input: householdId
1. Read household settings; alertDays = settings.expirationAlertDays
2. Load all stored items for household with item + storageArea
3. For each item:
   a. Skip if storageArea.type === FREEZER
   b. effectiveExpDate = item.getEffectiveExpirationDate()
   c. Skip if effectiveExpDate is null
   d. daysUntil = ceil((effectiveExpDate - now) / 1day)
   e. Compute candidate phases:
        - if daysUntil === alertDays AND alertDays > 1 → 'initial'
        - if daysUntil === 1 → 'reminder'
        (for items inserted late, also create 'initial' if 1 < daysUntil ≤ alertDays
         and no notification yet — captures items that came under threshold while app was closed)
   f. For each candidate phase: insert with ON CONFLICT DO NOTHING (rely on unique idx)
4. Delete notifications with createdAt < now - 30d
```

Edge case: if alertDays === 1, never create 'initial'. Only 'reminder' at J-1.

---

## Implementation Tasks

### Task 1 — Backend: HouseholdSettings table + model

**Files:**
- Create: `backend/src/migrations/202604260-create-household-settings-table.js`
- Create: `backend/src/models/HouseholdSettings.ts`
- Modify: `backend/src/models/index.ts` (register + associate)

- [ ] **Step 1:** Write migration (creates `household_settings` with unique `householdId`, CHECK constraint 1..14)
- [ ] **Step 2:** Write Sequelize model
- [ ] **Step 3:** Add associations in `models/index.ts`: `Household.hasOne(HouseholdSettings)`, `HouseholdSettings.belongsTo(Household)`
- [ ] **Step 4:** Run `npm run db:migrate` and observe "ok"
- [ ] **Step 5:** Commit `feat(backend): add household_settings table + model`

### Task 2 — Backend: ExpirationNotification + read tables

**Files:**
- Create: `backend/src/migrations/202604261-create-expiration-notifications-table.js`
- Create: `backend/src/migrations/202604262-create-expiration-notification-reads-table.js`
- Create: `backend/src/models/ExpirationNotification.ts`
- Create: `backend/src/models/ExpirationNotificationRead.ts`
- Modify: `backend/src/models/index.ts`

- [ ] **Step 1:** Migration A: `expiration_notifications` table with FKs (CASCADE on storedItem and household), unique(storedItemId, phase), index(householdId, createdAt)
- [ ] **Step 2:** Migration B: `expiration_notification_reads` join table with composite PK
- [ ] **Step 3:** Sequelize models (snapshot fields ensure UI works even if storedItem just got deleted in same render cycle)
- [ ] **Step 4:** Associations: `Household.hasMany(ExpirationNotification)`, `StoredItem.hasMany(ExpirationNotification, onDelete: CASCADE)`, `ExpirationNotification.hasMany(ExpirationNotificationRead, onDelete: CASCADE)`, `User.hasMany(ExpirationNotificationRead)`
- [ ] **Step 5:** Run migrations
- [ ] **Step 6:** Commit `feat(backend): add expiration notifications schema`

### Task 3 — Backend: HouseholdSettings service + routes

**Files:**
- Create: `backend/src/repositories/HouseholdSettingsRepository.ts` (`findByHousehold`, `upsert`)
- Create: `backend/src/services/HouseholdSettingsService.ts` (`getOrCreate`, `update` with 1..14 validation + member check)
- Create: `backend/src/controllers/HouseholdSettingsController.ts`
- Create: `backend/src/routes/householdSettings.ts`
- Modify: `backend/src/index.ts` (mount under `/api/households`)

- [ ] **Step 1:** Repo: `findByHousehold(id)`; `upsert({householdId, expirationAlertDays})`
- [ ] **Step 2:** Service: `getOrCreate` returns row; if missing creates with default 3. `update` validates `1 ≤ days ≤ 14` and verifies caller is a household member
- [ ] **Step 3:** Controller: `getSettings`, `updateSettings`. Translate validation errors to 400.
- [ ] **Step 4:** Route: `GET /:householdId/settings`, `PUT /:householdId/settings` (gated by `authenticateGoogleToken`)
- [ ] **Step 5:** Mount routes in `index.ts`
- [ ] **Step 6:** Smoke test with curl
- [ ] **Step 7:** Commit `feat(backend): household settings endpoints`

### Task 4 — Backend: ExpirationNotification service + routes

**Files:**
- Create: `backend/src/repositories/ExpirationNotificationRepository.ts`
- Create: `backend/src/services/ExpirationNotificationService.ts`
- Create: `backend/src/controllers/ExpirationNotificationController.ts`
- Create: `backend/src/routes/notifications.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1:** Repo with: `bulkUpsertSkippingConflict(rows)`, `listByHouseholdWithReadState(householdId, userId)`, `markRead(notificationId, userId)`, `markAllRead(householdId, userId)`, `delete(notificationId, householdId)`, `clearHousehold(householdId)`, `pruneOlderThan(date)`
- [ ] **Step 2:** Service with: `syncForHousehold(householdId)` (the algorithm above), `getNotifications(householdId, userId)` (calls sync first, then returns mapped DTO), `markRead`, `markAllRead`, `deleteOne`, `clearAll`, `getExpiringNow(householdId)` (Dashboard card source: returns items grouped by `expired | today | tomorrow | soon`, each with metadata: name, qty, unit, storageArea, isOpened, openedDaysAgo, suggested action)
- [ ] **Step 3:** Controller mapping each service method to HTTP
- [ ] **Step 4:** Routes: GET/POST/DELETE per the API table
- [ ] **Step 5:** Mount under `/api/households`
- [ ] **Step 6:** Smoke test: create stored item with `expirationDate = today + 3`, set settings to 3, GET notifications → expect one with phase=`initial`. Repeat → no duplicate. Set expirationDate = today + 1, GET → also `reminder`.
- [ ] **Step 7:** Commit `feat(backend): expiration notifications service + endpoints`

### Task 5 — Backend: cascade verification

**Files:**
- Verify: deleting a `StoredItem` cascades to `expiration_notifications`
- Inspect: `backend/src/services/StoredItemService.ts` for any custom delete path that would bypass FK

- [ ] **Step 1:** Open `StoredItemService` delete method
- [ ] **Step 2:** Confirm it uses `repo.delete()` which does `StoredItem.destroy()` (Sequelize will fire FK cascade)
- [ ] **Step 3:** Smoke test: create item → notify → delete item → confirm notifications gone
- [ ] **Step 4:** Commit if any wiring changed (likely none needed beyond migrations)

### Task 6 — Frontend: types + services

**Files:**
- Create: `frontend/src/types/expirationNotification.ts`
- Create: `frontend/src/services/householdSettingsService.ts`
- Create: `frontend/src/services/notificationService.ts`

- [ ] **Step 1:** Type definitions matching backend DTOs (`ExpirationNotification`, `HouseholdSettings`, `ExpiringNowGroups`)
- [ ] **Step 2:** `householdSettingsService.ts`: `getSettings(householdId)`, `updateSettings(householdId, {expirationAlertDays})`. Use `getAuthHeaders()` from `utils/apiHeaders.ts`
- [ ] **Step 3:** `notificationService.ts`: `listNotifications`, `markRead`, `markAllRead`, `deleteNotification`, `clearAll`, `getExpiringNow`
- [ ] **Step 4:** Commit `feat(frontend): notification + settings services`

### Task 7 — Frontend: stores

**Files:**
- Create: `frontend/src/stores/expirationNotificationStore.ts` (Zustand, no persist; server is source of truth)
- Create: `frontend/src/stores/householdSettingsStore.ts`

- [ ] **Step 1:** `expirationNotificationStore`: state `{ notifications, expiringNow, isLoading, lastFetchedHouseholdId }`. Actions: `fetchAll(householdId)`, `markRead(id)`, `markAllRead()`, `removeOne(id)`, `clearAll()`. `unreadCount` selector.
- [ ] **Step 2:** Optimistic updates: mark-read flips local state immediately, on error refetch
- [ ] **Step 3:** `householdSettingsStore`: state `{ settings, isLoading }`. Actions: `fetch(householdId)`, `update(householdId, dto)`
- [ ] **Step 4:** Commit `feat(frontend): notification + settings stores`

### Task 8 — Frontend: rewire NotificationDrawer

**Files:**
- Modify: `frontend/src/components/NotificationDrawer.tsx`

- [ ] **Step 1:** Replace `useNotifications` (local context) with `useExpirationNotificationStore`
- [ ] **Step 2:** Map server notification → display fields:
  - title from translation key driven by `phase` and snapshot data: e.g. `t('expirationNotifications.titleReminder', { name })` ("Le poulet expire demain")
  - message: storage area + opened-days-ago (computed from snapshot)
  - timestamp: `createdAt`
  - `actionUrl`: `/storage/{storageAreaIdSnapshot}` (fallback to dashboard if storage area gone)
  - color: `phase==='reminder'` → `error`, else → `warning`
- [ ] **Step 3:** Tap → mark read + navigate (already wired, just ensure new store is called)
- [ ] **Step 4:** Wire bell badge: replace commented `unreadCount` block in `Dashboard.tsx` with the real value from the store
- [ ] **Step 5:** Apply charter palette tweaks (Pistache for unread accent, Encre for text). Ensure motion respects `useReducedMotion`.
- [ ] **Step 6:** Commit `feat(frontend): server-driven notification drawer`

### Task 9 — Frontend: ExpiringSoonCard on Dashboard

**Files:**
- Create: `frontend/src/components/ExpiringSoonCard.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1:** Component reads `expiringNow` from `expirationNotificationStore`. Sorted: expired → today → tomorrow → soon.
- [ ] **Step 2:** Per-row UI:
  - background red + badge "Expiré" when expired → button "Jeter" → calls `storedItemService.delete`
  - left border red + badge "Aujourd'hui" → button "Congeler" → opens existing freeze flow (see how `MyProducts.tsx` triggers freeze; if missing, dispatch a "transfer to freezer" modal)
  - left border orange (J-1) → "Recettes" → navigates `/recipes?ingredient={itemId}`
  - left border neutral (J-2+) → "Recettes"
- [ ] **Step 3:** Each row shows: name, quantity+unit (translated), storage area name, "Ouvert il y a X jours" if `isOpened` (use date-fns `formatDistanceToNowStrict` over `openedDate`)
- [ ] **Step 4:** "Voir les X autres" link if total > 5 → navigates to a filtered list (use `/storage/...` with a query, or scroll to a section). For v1, just route to `/storage/{firstStorage.id}` filtered or use existing filtering UI; if not feasible, show inline expand.
- [ ] **Step 5:** Render `null` when no items in any bucket
- [ ] **Step 6:** Add to Dashboard above `LowStockCard`
- [ ] **Step 7:** Trigger fetch in Dashboard `useEffect` (call `fetchAll(householdId)` from notifications store)
- [ ] **Step 8:** Apply charter (Fraunces titles, Funnel Sans body, Pistache accent for action buttons)
- [ ] **Step 9:** Commit `feat(frontend): expiring soon dashboard card`

### Task 10 — Frontend: HouseholdExpirationSettings

**Files:**
- Create: `frontend/src/components/HouseholdExpirationSettings.tsx`
- Modify: `frontend/src/pages/HouseholdDetails.tsx`

- [ ] **Step 1:** Component fetches `householdSettingsStore` on mount, renders shadcn `Select` with values 1..14
- [ ] **Step 2:** Label "Me prévenir {N} jour{N>1?'s':''} avant expiration"
- [ ] **Step 3:** On change → optimistic update + API; toast confirmation; refetch notifications on success (so the UI reflects the new threshold immediately on next sync)
- [ ] **Step 4:** Add component to `HouseholdDetails.tsx` near other household-level settings
- [ ] **Step 5:** Commit `feat(frontend): household expiration alert delay setting`

### Task 11 — i18n

**Files:**
- Modify: `frontend/src/i18n/locales/{fr,en,es}.json`

- [ ] **Step 1:** Add keys under `expirationNotifications` and `pages.dashboard.expiringSoon` and `pages.householdDetails.expirationAlerts` for fr/en/es. Ensure French copy uses calm, action-oriented voice from the charter.
- [ ] **Step 2:** Update existing `notifications` block if labels change (e.g. drawer title)
- [ ] **Step 3:** Commit `i18n: expiration notifications copy`

### Task 12 — Verification

- [ ] **Step 1:** Backend: `cd backend && npx tsc --noEmit`
- [ ] **Step 2:** Frontend: `cd frontend && npx tsc -b --noEmit`
- [ ] **Step 3:** Lint: `cd frontend && npm run lint` (root has eslint config)
- [ ] **Step 4:** Manual smoke: spin up dev (`docker-compose -f docker-compose.dev.yml up` or whatever the project uses), create test data, validate flows
- [ ] **Step 5:** Final commit if anything had to be patched

---

## Acceptance Criteria → Test Checklist (cross-reference)

- [x] Setting accessible in household settings → Task 10
- [x] Default 3 days → Task 1 migration default
- [x] Range 1..14 → DB CHECK + Service validation → Tasks 1, 3
- [x] Change applies to whole household → settings are household-scoped, all members see same threshold → Task 1
- [x] Existing notifications unaffected by setting change → lazy sync only inserts new rows; never deletes based on setting → Task 4
- [x] Card appears only when items expire within window → ExpiringSoonCard returns null when empty → Task 9
- [x] Freezer items don't trigger → service skips FREEZER → Tasks 4, 9
- [x] Effective expiration accounts for opened state → reuse `getEffectiveExpirationDate` → Task 4
- [x] Sorted by urgency → service returns grouped output, card concatenates groups in order → Task 9
- [x] Right action per urgency → mapping in component → Task 9
- [x] Bell badge correct unread count → store selector → Task 8
- [x] Tap notification marks read + navigates → Task 8
- [x] Mark all read clears badge → store action → Task 8
- [x] Read state per-user → join table → Task 2
- [x] No duplicate notifications → unique(storedItemId, phase) → Task 2
- [x] Notifications older than 30d pruned → sync prune step → Task 4
- [x] Max 2 notifications per item; 1 if alertDays=1 → algorithm in Task 4
- [x] No J0 entry in drawer → algorithm only emits initial/reminder → Task 4
- [x] Auto-resolution on item delete → CASCADE FK → Task 2
