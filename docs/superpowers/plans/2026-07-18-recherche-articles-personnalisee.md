# Recherche d'articles personnalisée — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rank the item picker by personal + household activity so frequently-added articles surface first, on the add-to-stock and shopping-list selectors.

**Architecture:** A new append-only `household_activities` log records the three *add* actions (`item_added`, `shopping_added`, `shopping_checked`), backfilled from `stored_items`. A weighted, **saturated** boost derived from that log (30-day window) is added to the existing banded relevance score in `ItemRepository`, opt-in per request. A new `/item-suggestions` endpoint powers the sectioned empty-state (Récents / Souvent utilisés / Populaires dans le foyer). The single shared `ItemSelector` gains a `personalized` prop that gates all of this; the 8-row cap is replaced by infinite scroll.

**Tech Stack:** Express 4 + TypeScript, Sequelize 6, PostgreSQL 15 (backend); React 18 + TypeScript + Vite, Zustand, shadcn/ui, react-i18next (frontend).

## Global Constraints

- **No test runner exists.** `backend`'s `npm test` is a placeholder that exits 1; `frontend` has none (spec §8). Verification is therefore: `npm run build` (tsc type-gate) + `psql` data checks + manual UI exercise. Do **not** add a test framework — it is out of scope and not requested.
- **`stored_items` uses camelCase quoted columns** (`"itemId"`, `"createdBy"`, `"householdId"`, `"createdAt"`, `"deletedAt"`) — the model has no `underscored`/`field` mappings. `shopping_items` uses snake_case. SQL must match each table.
- **Enums are duplicated** front + back ([backend/src/types/enums.ts](../../../backend/src/types/enums.ts) ↔ [frontend/src/types/enums.ts](../../../frontend/src/types/enums.ts)). This feature adds a backend-only enum (frontend never handles action values) — no frontend enum change needed.
- **i18n:** every user-facing string is a key in all three of [en.json](../../../frontend/src/i18n/locales/en.json) / [es.json](../../../frontend/src/i18n/locales/es.json) / [fr.json](../../../frontend/src/i18n/locales/fr.json); `en` is fallback.
- **`itemId` on the log has NO foreign key**, deliberately (mirrors [StockExit.ts:93-97](../../../backend/src/models/StockExit.ts#L93)) so rows survive catalog deletion.
- **Logging is best-effort and runs outside any live transaction** at every write site — a logging failure must never break the user's action, and must never poison a real transaction.
- **Charte graphique Fresh** ([docs/charte-graphique.html](../../../docs/charte-graphique.html)) governs section styling: muted grey titles, discrete separators, one scrollable list.
- DB shell for verification: `docker-compose -f docker-compose.dev.yml exec db psql -U postgres -d my_fridge_db`
- Commit style: end messages with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## File structure

**Backend — create:**
- `backend/src/models/HouseholdActivity.ts` — the log model
- `backend/src/migrations/202607180-create-household-activities-table.js` — table + indexes + backfill
- `backend/src/repositories/HouseholdActivityRepository.ts` — create + aggregate queries
- `backend/src/services/HouseholdActivityLogger.ts` — best-effort write wrapper
- `backend/src/services/ItemSuggestionService.ts` — sectioned suggestions
- `backend/src/controllers/ItemSuggestionController.ts` — HTTP layer
- `backend/src/routes/itemSuggestions.ts` — route
- `backend/src/utils/itemFormatter.ts` — shared `formatItemDto` (extracted from `ItemService`)

**Backend — modify:**
- `backend/src/types/enums.ts` — add `HouseholdActivityAction`
- `backend/src/models/index.ts` — import, associations, export
- `backend/src/types/ItemDto.ts` — add `personalized?` + `userId?` to `GetItemsQueryDto`
- `backend/src/repositories/ItemRepository.ts` — `findByIds` + saturated scoring boost
- `backend/src/services/ItemService.ts` — use shared `formatItemDto`
- `backend/src/services/StoredItemService.ts` — log `item_added`
- `backend/src/services/ShoppingItemService.ts` — log `shopping_added` + `shopping_checked` (+ `userId` param)
- `backend/src/controllers/ShoppingItemController.ts` — pass `user.id` to `setShoppingItemStatus`
- `backend/src/controllers/ItemController.ts` — pass `userId` + `personalized` into search query
- `backend/src/index.ts` — mount the suggestions route

**Frontend — create:**
- `frontend/src/utils/itemSuggestionsCache.ts` — module-level TTL cache
- `frontend/src/utils/relativeTime.ts` — `Intl.RelativeTimeFormat` helper

**Frontend — modify:**
- `frontend/src/services/itemService.ts` — `getItemSuggestions`, `getCatalogPage`, `personalized` on search, types
- `frontend/src/components/ItemSelector.tsx` — `personalized` prop, sections, infinite scroll, remove `slice(0,8)`
- `frontend/src/components/AddItemCard.tsx` — thread `personalized` prop
- `frontend/src/components/AddStoredItemDialog.tsx` — pass `personalized`
- `frontend/src/pages/StorageArea.tsx` — pass `personalized`
- `frontend/src/pages/Shopping.tsx` — pass `personalized` to `AddItemCard`
- `frontend/src/i18n/locales/{en,es,fr}.json` — `itemSelector.sections.*`

**Build order rationale:** the log and its backfill (Task 1) must exist before anything can read scores. Repository queries (Task 2) precede both the logger (Task 3), the scorer (Task 4), and suggestions (Task 5). Frontend (Tasks 6-10) consumes the finished API.

> **Correction vs spec write-point table:** the spec listed `bulkTransferToStorage` as a separate `item_added` site. It is **not** — it delegates to `StoredItemService.createStoredItem` ([ShoppingItemService.ts:429](../../../backend/src/services/ShoppingItemService.ts#L429)), so logging in `createStoredItem` (the single choke point) covers transfers for free. Logging in both would double-count. Task 3 logs only in `createStoredItem`.

> **Correction vs spec §5 endpoints:** `/api/items/search` already resolves household from `user.selectedHouseholdId` ([ItemController.ts:115](../../../backend/src/controllers/ItemController.ts#L115)) and rejects an empty `search` with 400 ([:121](../../../backend/src/controllers/ItemController.ts#L121)). So (a) scoring needs only `userId` + a `personalized` flag threaded — no new `householdId` param — and (b) the alphabetical catalogue (Section 4) is served by `GET /api/items` (`getItems`, which allows empty search and paginates alphabetically), not `/search`.

---

### Task 1: Activity log — enum, model, associations, migration + backfill

**Files:**
- Modify: `backend/src/types/enums.ts`
- Create: `backend/src/models/HouseholdActivity.ts`
- Modify: `backend/src/models/index.ts:19` (import), `:193` (after StockExit associations), `:193` (export list)
- Create: `backend/src/migrations/202607180-create-household-activities-table.js`

**Interfaces:**
- Produces: `HouseholdActivityAction` enum + `HOUSEHOLD_ACTIVITY_ACTIONS`; `HouseholdActivity` model (attrs `id, householdId, userId, itemId|null, itemNameSnapshot|null, action, createdAt, updatedAt`); table `household_activities`.

- [ ] **Step 1: Add the enum**

In [backend/src/types/enums.ts](../../../backend/src/types/enums.ts), after the `StockExitType` block (around line 108):

```ts
export enum HouseholdActivityAction {
  ITEM_ADDED = 'item_added',
  SHOPPING_ADDED = 'shopping_added',
  SHOPPING_CHECKED = 'shopping_checked',
}

export const HOUSEHOLD_ACTIVITY_ACTIONS = Object.values(HouseholdActivityAction);
```

- [ ] **Step 2: Create the model**

Create [backend/src/models/HouseholdActivity.ts](../../../backend/src/models/HouseholdActivity.ts):

```ts
import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { HouseholdActivityAction, HOUSEHOLD_ACTIVITY_ACTIONS } from '../types/enums';
import { User } from './User';
import { Household } from './Household';

// Append-only activity log for the three "add" actions used by personalized
// item search. Never records stock exits — those live in `stock_exits`.
interface HouseholdActivityAttributes {
  id: string;
  householdId: string;
  userId: string;
  itemId: string | null;
  itemNameSnapshot: string | null;
  action: HouseholdActivityAction;
  createdAt?: Date;
  updatedAt?: Date;
}

interface HouseholdActivityCreationAttributes
  extends Optional<
    HouseholdActivityAttributes,
    'id' | 'itemId' | 'itemNameSnapshot' | 'createdAt' | 'updatedAt'
  > {}

export class HouseholdActivity
  extends Model<HouseholdActivityAttributes, HouseholdActivityCreationAttributes>
  implements HouseholdActivityAttributes
{
  public id!: string;
  public householdId!: string;
  public userId!: string;
  public itemId!: string | null;
  public itemNameSnapshot!: string | null;
  public action!: HouseholdActivityAction;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public readonly user?: User;
  public readonly household?: Household;
}

HouseholdActivity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'households', key: 'id' },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    itemId: {
      // Plain UUID, NO hard FK: the referenced Item may be hard-deleted.
      // A dangling itemId simply yields no join row and is skipped by scoring.
      type: DataTypes.UUID,
      allowNull: true,
    },
    itemNameSnapshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    action: {
      type: DataTypes.ENUM(...HOUSEHOLD_ACTIVITY_ACTIONS),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'household_activities',
    timestamps: true,
    indexes: [
      { fields: ['householdId', 'userId', 'createdAt'] },
      { fields: ['householdId', 'action', 'createdAt'] },
      { fields: ['householdId', 'createdAt'] },
    ],
  }
);
```

- [ ] **Step 3: Wire associations + export in models/index.ts**

Import after line 19 (`import { StockExit } ...`):

```ts
import { HouseholdActivity } from './HouseholdActivity';
```

Add associations after the Stock Exit block (after [models/index.ts:160](../../../backend/src/models/index.ts#L160)):

```ts
// Household Activity associations
// itemId is intentionally a plain UUID (no FK) — the referenced item may be
// hard-deleted; the log keeps a name snapshot instead.
Household.hasMany(HouseholdActivity, { foreignKey: 'householdId', as: 'activities' });
HouseholdActivity.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

User.hasMany(HouseholdActivity, { foreignKey: 'userId', as: 'activities' });
HouseholdActivity.belongsTo(User, { foreignKey: 'userId', as: 'user' });
```

Add `HouseholdActivity` to the `export { ... }` block (after `BarcodeMapping` at [models/index.ts:194](../../../backend/src/models/index.ts#L194)):

```ts
  BarcodeMapping,
  HouseholdActivity
};
```

- [ ] **Step 4: Create the migration with keyset-batched backfill**

Create [backend/src/migrations/202607180-create-household-activities-table.js](../../../backend/src/migrations/202607180-create-household-activities-table.js):

```js
'use strict';

const { DataTypes } = require('sequelize');

const ACTION_VALUES = ['item_added', 'shopping_added', 'shopping_checked'];
const BATCH = 5000;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('household_activities', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      householdId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'households', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Plain UUID, no FK: the referenced item may be hard-deleted.
      itemId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      itemNameSnapshot: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      action: {
        type: DataTypes.ENUM(...ACTION_VALUES),
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('household_activities', ['householdId', 'userId', 'createdAt']);
    await queryInterface.addIndex('household_activities', ['householdId', 'action', 'createdAt']);
    await queryInterface.addIndex('household_activities', ['householdId', 'createdAt']);

    // Backfill `item_added` from ALL stored_items history, including soft-deleted
    // rows (raw SQL bypasses the paranoid scope). Keyset-batched on the PK to
    // stay O(n) and avoid a single table-locking statement. stored_items uses
    // camelCase quoted columns.
    let lastId = '00000000-0000-0000-0000-000000000000';
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [rows] = await queryInterface.sequelize.query(
        `
        WITH batch AS (
          SELECT si.id,
                 si."householdId" AS household_id,
                 si."createdBy"   AS user_id,
                 si."itemId"      AS item_id,
                 i."name"         AS item_name,
                 si."createdAt"   AS created_at
          FROM stored_items si
          LEFT JOIN items i ON i.id = si."itemId"
          WHERE si.id > :lastId
          ORDER BY si.id ASC
          LIMIT :batch
        ),
        ins AS (
          INSERT INTO household_activities
            (id, "householdId", "userId", "itemId", "itemNameSnapshot", action, "createdAt", "updatedAt")
          SELECT gen_random_uuid(), household_id, user_id, item_id, item_name,
                 'item_added', created_at, created_at
          FROM batch
          RETURNING 1
        )
        SELECT (SELECT max(id) FROM batch) AS last_id,
               (SELECT count(*) FROM batch) AS n
        `,
        { replacements: { lastId, batch: BATCH } }
      );

      const n = Number(rows[0].n);
      if (n === 0) break;
      lastId = rows[0].last_id;
      if (n < BATCH) break;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('household_activities');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_household_activities_action";'
    );
  },
};
```

- [ ] **Step 5: Run the migration**

Run: `cd backend && npm run db:migrate`
Expected: `== 202607180-create-household-activities-table: migrated` with no error.

- [ ] **Step 6: Verify the table + backfill against source counts**

Run:
```bash
docker-compose -f docker-compose.dev.yml exec db psql -U postgres -d my_fridge_db -c \
"SELECT (SELECT count(*) FROM stored_items) AS stored_items,
        (SELECT count(*) FROM household_activities WHERE action='item_added') AS backfilled;"
```
Expected: `backfilled` equals `stored_items` (both counts identical — every stored item, live or soft-deleted, produced one `item_added` row).

- [ ] **Step 7: Verify down-migration is clean, then re-migrate**

Run: `cd backend && npm run db:migrate:undo && npm run db:migrate`
Expected: undo drops the table + enum type without error; re-migrate recreates and re-backfills. (Confirms the migration is reversible and idempotent across a re-run.)

- [ ] **Step 8: Build + commit**

Run: `cd backend && npm run build`
Expected: tsc exits 0.

```bash
git add backend/src/types/enums.ts backend/src/models/HouseholdActivity.ts backend/src/models/index.ts backend/src/migrations/202607180-create-household-activities-table.js
git commit -m "✨ #NNN journal d'activité household_activities + backfill"
```

---

### Task 2: Activity repository — create + aggregate queries + `findByIds`

**Files:**
- Create: `backend/src/repositories/HouseholdActivityRepository.ts`
- Modify: `backend/src/repositories/ItemRepository.ts` (add `findByIds`)

**Interfaces:**
- Consumes: `HouseholdActivity` model, `HouseholdActivityAction` (Task 1).
- Produces:
  - `CreateHouseholdActivityData = { householdId: string; userId: string; itemId: string | null; itemNameSnapshot: string | null; action: HouseholdActivityAction }`
  - `HouseholdActivityRepository.create(data, options?: { transaction?: Transaction }): Promise<HouseholdActivity>`
  - `.getScoreMap(householdId: string, userId: string, since: Date): Promise<Map<string, { personalCount: number; householdCount: number }>>`
  - `.getRecentItemRefs(householdId: string, userId: string, limit: number): Promise<Array<{ itemId: string; lastSelectedAt: Date }>>`
  - `.getFrequent(householdId: string, since: Date, limit: number, userId?: string): Promise<Array<{ itemId: string; count: number }>>`
  - `ItemRepository.findByIds(ids: string[]): Promise<Item[]>`

- [ ] **Step 1: Create the repository**

Create [backend/src/repositories/HouseholdActivityRepository.ts](../../../backend/src/repositories/HouseholdActivityRepository.ts):

```ts
import { Transaction, Op, fn, col, literal } from 'sequelize';
import { HouseholdActivity } from '../models/HouseholdActivity';
import { HouseholdActivityAction } from '../types/enums';

export interface CreateHouseholdActivityData {
  householdId: string;
  userId: string;
  itemId: string | null;
  itemNameSnapshot: string | null;
  action: HouseholdActivityAction;
}

export interface ItemScore {
  personalCount: number;
  householdCount: number;
}

export class HouseholdActivityRepository {
  async create(
    data: CreateHouseholdActivityData,
    options?: { transaction?: Transaction }
  ): Promise<HouseholdActivity> {
    return await HouseholdActivity.create(data, { transaction: options?.transaction });
  }

  // Per-item personal + household counts within [since, now). Only non-null
  // itemIds are counted. One indexed grouped query per scope; results are small
  // (distinct items a household touched in 30 days).
  async getScoreMap(
    householdId: string,
    userId: string,
    since: Date
  ): Promise<Map<string, ItemScore>> {
    const rows = (await HouseholdActivity.findAll({
      attributes: [
        'itemId',
        [fn('COUNT', col('id')), 'householdCount'],
        [
          fn(
            'COUNT',
            literal(`CASE WHEN "userId" = '${userId}' THEN 1 END`)
          ),
          'personalCount',
        ],
      ],
      where: {
        householdId,
        itemId: { [Op.ne]: null },
        createdAt: { [Op.gte]: since },
      },
      group: ['itemId'],
      raw: true,
    })) as unknown as Array<{ itemId: string; householdCount: string; personalCount: string }>;

    const map = new Map<string, ItemScore>();
    for (const r of rows) {
      map.set(r.itemId, {
        personalCount: Number(r.personalCount),
        householdCount: Number(r.householdCount),
      });
    }
    return map;
  }

  // Distinct items this user most recently touched (any action, NO time window
  // — an inactive user still sees their récents). Ordered newest first.
  async getRecentItemRefs(
    householdId: string,
    userId: string,
    limit: number
  ): Promise<Array<{ itemId: string; lastSelectedAt: Date }>> {
    const rows = (await HouseholdActivity.findAll({
      attributes: ['itemId', [fn('MAX', col('createdAt')), 'lastSelectedAt']],
      where: { householdId, userId, itemId: { [Op.ne]: null } },
      group: ['itemId'],
      order: [[literal('"lastSelectedAt"'), 'DESC']],
      limit,
      raw: true,
    })) as unknown as Array<{ itemId: string; lastSelectedAt: string }>;

    return rows.map((r) => ({ itemId: r.itemId, lastSelectedAt: new Date(r.lastSelectedAt) }));
  }

  // Most frequent items within [since, now). userId omitted = whole household.
  async getFrequent(
    householdId: string,
    since: Date,
    limit: number,
    userId?: string
  ): Promise<Array<{ itemId: string; count: number }>> {
    const where: Record<string, unknown> = {
      householdId,
      itemId: { [Op.ne]: null },
      createdAt: { [Op.gte]: since },
    };
    if (userId) where.userId = userId;

    const rows = (await HouseholdActivity.findAll({
      attributes: ['itemId', [fn('COUNT', col('id')), 'count']],
      where,
      group: ['itemId'],
      order: [[literal('count'), 'DESC']],
      limit,
      raw: true,
    })) as unknown as Array<{ itemId: string; count: string }>;

    return rows.map((r) => ({ itemId: r.itemId, count: Number(r.count) }));
  }
}
```

> Note: `userId` is a trusted UUID from the verified auth token, interpolated into the `CASE` literal. It never originates from request body/query text, so this is not an injection surface. Keep it that way — do not pass user-supplied strings here.

- [ ] **Step 2: Add `findByIds` to ItemRepository**

In [backend/src/repositories/ItemRepository.ts](../../../backend/src/repositories/ItemRepository.ts), after `findById` (line 31), add:

```ts
  // Batch hydrate by id. Missing ids are simply absent from the result —
  // a suggestion referencing a deleted item is thereby skipped, not an error.
  async findByIds(ids: string[]): Promise<Item[]> {
    if (ids.length === 0) return [];
    return Item.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        { model: Household, as: 'household', attributes: ['id', 'name'], required: false },
      ],
    });
  }
```

`Op` is already imported at [ItemRepository.ts:1](../../../backend/src/repositories/ItemRepository.ts#L1).

- [ ] **Step 3: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0.

- [ ] **Step 4: Verify the aggregates against real data**

Pick a household with history:
```bash
docker-compose -f docker-compose.dev.yml exec db psql -U postgres -d my_fridge_db -c \
"SELECT \"householdId\", \"itemId\", count(*) FROM household_activities
 WHERE \"createdAt\" >= now() - interval '30 days' AND \"itemId\" IS NOT NULL
 GROUP BY \"householdId\", \"itemId\" ORDER BY count(*) DESC LIMIT 5;"
```
Expected: rows ordered by descending count — this is exactly what `getFrequent`/`getScoreMap` return. Confirms the grouping/window logic matches SQL truth.

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/HouseholdActivityRepository.ts backend/src/repositories/ItemRepository.ts
git commit -m "✨ #NNN requêtes d'agrégats du journal d'activité + findByIds"
```

---

### Task 3: Best-effort logger + wire into the three write points

**Files:**
- Create: `backend/src/services/HouseholdActivityLogger.ts`
- Modify: `backend/src/services/StoredItemService.ts` (`createStoredItem`)
- Modify: `backend/src/services/ShoppingItemService.ts` (`createShoppingItem`, `setShoppingItemStatus`)
- Modify: `backend/src/controllers/ShoppingItemController.ts` (`updateShoppingItemStatus`)

**Interfaces:**
- Consumes: `HouseholdActivityRepository.create` + `CreateHouseholdActivityData` (Task 2); `HouseholdActivityAction` (Task 1).
- Produces: `HouseholdActivityLogger.log(data: CreateHouseholdActivityData): Promise<void>` (never throws); `ShoppingItemService.setShoppingItemStatus(id: string, status: ShoppingItemStatus, userId: string)` (new 3rd param).

- [ ] **Step 1: Create the logger**

Create [backend/src/services/HouseholdActivityLogger.ts](../../../backend/src/services/HouseholdActivityLogger.ts):

```ts
import {
  HouseholdActivityRepository,
  CreateHouseholdActivityData,
} from '../repositories/HouseholdActivityRepository';

// Best-effort activity logging. Deliberately swallows all errors: losing a
// ranking signal must never break the user's action. Runs outside any live
// transaction at every call site, so a failed insert cannot poison one.
export class HouseholdActivityLogger {
  private repo: HouseholdActivityRepository;

  constructor(repo?: HouseholdActivityRepository) {
    this.repo = repo || new HouseholdActivityRepository();
  }

  async log(data: CreateHouseholdActivityData): Promise<void> {
    try {
      await this.repo.create(data);
    } catch (error) {
      console.error('[HouseholdActivityLogger] failed to log activity', error);
    }
  }
}
```

- [ ] **Step 2: Log `item_added` in `createStoredItem` (single choke point)**

In [backend/src/services/StoredItemService.ts](../../../backend/src/services/StoredItemService.ts): add imports at top, a logger field, and the log call after the stored item is created.

Imports (after line 9):
```ts
import { HouseholdActivityLogger } from './HouseholdActivityLogger';
import { HouseholdActivityAction } from '../types/enums';
```

Field + constructor (the class has a constructor at [:15](../../../backend/src/services/StoredItemService.ts#L15)):
```ts
  private activityLogger: HouseholdActivityLogger;

  constructor() {
    this.storedItemRepository = new StoredItemRepository();
    this.expirationNotificationRepository = new ExpirationNotificationRepository();
    this.activityLogger = new HouseholdActivityLogger();
  }
```

In `createStoredItem`, replace the tail (currently [:44-45](../../../backend/src/services/StoredItemService.ts#L44)):
```ts
    const storedItem = await this.storedItemRepository.create(createData);

    // Personalized-search signal. Best-effort; covers direct add-to-stock AND
    // shopping→storage transfers (bulkTransferToStorage delegates here).
    await this.activityLogger.log({
      householdId: data.householdId,
      userId: data.createdBy,
      itemId: resolvedItemId,
      itemNameSnapshot: null,
      action: HouseholdActivityAction.ITEM_ADDED,
    });

    return this.mapToDto(storedItem);
```

- [ ] **Step 3: Log `shopping_added` in `createShoppingItem`**

In [backend/src/services/ShoppingItemService.ts](../../../backend/src/services/ShoppingItemService.ts): add imports, a logger field in the constructor, and log after the item is created.

Imports (after line 12):
```ts
import { HouseholdActivityLogger } from './HouseholdActivityLogger';
import { HouseholdActivityAction } from '../types/enums';
```

Add to the class fields + constructor (constructor at [:20](../../../backend/src/services/ShoppingItemService.ts#L20)):
```ts
  private activityLogger: HouseholdActivityLogger;
```
and inside the constructor body, after the existing assignments (after [:29](../../../backend/src/services/ShoppingItemService.ts#L29)):
```ts
    this.activityLogger = new HouseholdActivityLogger();
```

In `createShoppingItem`, immediately after the `if (!shoppingItem) { ... }` guard (after [:100](../../../backend/src/services/ShoppingItemService.ts#L100)) and before building `shoppingItemDto`:
```ts
      // Personalized-search signal (best-effort).
      await this.activityLogger.log({
        householdId: data.householdId,
        userId: data.createdBy,
        itemId: data.itemId,
        itemNameSnapshot: item.name,
        action: HouseholdActivityAction.SHOPPING_ADDED,
      });
```
(`item` and `data.createdBy` are already in scope — `item` from [:35](../../../backend/src/services/ShoppingItemService.ts#L35), `data.createdBy` from `CreateShoppingItemDto`.)

- [ ] **Step 4: Log `shopping_checked` on `to_buy → to_store` (add `userId` param)**

Change the signature of `setShoppingItemStatus` ([:283](../../../backend/src/services/ShoppingItemService.ts#L283)):
```ts
  async setShoppingItemStatus(id: string, status: ShoppingItemStatus, userId: string): Promise<ApiResponse<ShoppingItemDto>> {
```

The early `if (shoppingItem.status === status)` return ([:294](../../../backend/src/services/ShoppingItemService.ts#L294)) already excludes no-op calls. Capture the previous status and log after a successful update. Immediately after the `if (!updatedShoppingItem) { ... }` guard (after [:350](../../../backend/src/services/ShoppingItemService.ts#L350)) and before the success `return`:
```ts
      // "Checked off" = moved to "à ranger". Personalized-search signal.
      if (shoppingItem.status === ShoppingItemStatus.TO_BUY && status === ShoppingItemStatus.TO_STORE) {
        await this.activityLogger.log({
          householdId: shoppingItem.householdId,
          userId,
          itemId: shoppingItem.itemId,
          itemNameSnapshot: null,
          action: HouseholdActivityAction.SHOPPING_CHECKED,
        });
      }
```
(`shoppingItem` is fetched at [:285](../../../backend/src/services/ShoppingItemService.ts#L285); its `.status` still holds the pre-update value here.)

- [ ] **Step 5: Pass `user.id` from the controller**

In [backend/src/controllers/ShoppingItemController.ts](../../../backend/src/controllers/ShoppingItemController.ts) `updateShoppingItemStatus` ([:164](../../../backend/src/controllers/ShoppingItemController.ts#L164)), read the user and pass the id:
```ts
  async updateShoppingItemStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      if (!SHOPPING_ITEM_STATUSES.includes(status as ShoppingItemStatus)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Expected one of: ${SHOPPING_ITEM_STATUSES.join(', ')}`,
        });
        return;
      }

      const result = await this.shoppingItemService.setShoppingItemStatus(
        id as string,
        status as ShoppingItemStatus,
        user.id
      );
```
(Leave the rest of the method unchanged.)

- [ ] **Step 6: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0. (If any other caller of `setShoppingItemStatus` exists, tsc will flag the missing arg — grep `setShoppingItemStatus` to confirm the controller is the only caller; it is.)

- [ ] **Step 7: Verify each write point produces exactly one row**

Start the dev stack (`docker-compose -f docker-compose.dev.yml up --build`), then through the running app: (a) add one item to stock, (b) add one item to the shopping list, (c) move one shopping item from "à acheter" to "à ranger". Then:
```bash
docker-compose -f docker-compose.dev.yml exec db psql -U postgres -d my_fridge_db -c \
"SELECT action, count(*) FROM household_activities
 WHERE \"createdAt\" >= now() - interval '5 minutes' GROUP BY action;"
```
Expected: one `item_added`, one `shopping_added`, one `shopping_checked`. Repeat the "à ranger" move back and forth — only `to_buy → to_store` adds a row (moving back adds none).

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/HouseholdActivityLogger.ts backend/src/services/StoredItemService.ts backend/src/services/ShoppingItemService.ts backend/src/controllers/ShoppingItemController.ts
git commit -m "✨ #NNN journalisation best-effort des actions d'ajout"
```

---

### Task 4: Weighted, saturated scoring in item search (opt-in)

**Files:**
- Modify: `backend/src/types/ItemDto.ts` (`GetItemsQueryDto`)
- Modify: `backend/src/repositories/ItemRepository.ts` (`findAll`)
- Modify: `backend/src/controllers/ItemController.ts` (`searchItems`)

**Interfaces:**
- Consumes: `HouseholdActivityRepository.getScoreMap` (Task 2).
- Produces: `GetItemsQueryDto` gains `personalized?: boolean` and `userId?: string`; scoring boost applied inside `findAll` when `search && personalized && userId && householdId`.

- [ ] **Step 1: Extend the query DTO**

In [backend/src/types/ItemDto.ts](../../../backend/src/types/ItemDto.ts) `GetItemsQueryDto` ([:54-60](../../../backend/src/types/ItemDto.ts#L54)):
```ts
export interface GetItemsQueryDto {
  search?: string;
  householdId?: string;
  language?: string;
  limit?: number;
  offset?: number;
  personalized?: boolean;
  userId?: string;
}
```

- [ ] **Step 2: Apply the saturated boost in `findAll`**

In [backend/src/repositories/ItemRepository.ts](../../../backend/src/repositories/ItemRepository.ts): import the activity repo at the top (after line 5):
```ts
import { HouseholdActivityRepository } from './HouseholdActivityRepository';
```
Add module-level constants above the class (after [:6](../../../backend/src/repositories/ItemRepository.ts#L6)):
```ts
// Personalized-search boost. Deliberately SATURATED so frequency can only
// re-order ties WITHIN a relevance band, never cross one: the smallest gap
// between bands (contains=100 → startsWith=500) is 400, and the max boost is
// 20*3 + 20*1 = 80. This preserves the ticket's rule that textual match stays
// dominant (a rare item found by full name is never buried by a frequent one).
const PERSONAL_WEIGHT = 3;
const HOUSEHOLD_WEIGHT = 1;
const PERSONAL_CAP = 20;
const HOUSEHOLD_CAP = 20;
const ACTIVITY_WINDOW_DAYS = 30;
```

Extract `personalized` + `userId` in the destructure ([:34-40](../../../backend/src/repositories/ItemRepository.ts#L34)):
```ts
    const {
      search,
      householdId,
      language,
      limit = 50,
      offset = 0,
      personalized = false,
      userId,
    } = query;
```

Inside the `if (search && allItems.length > 0) { ... }` block, fetch the score map once before the `.map` that computes `relevanceScore` (before [:109](../../../backend/src/repositories/ItemRepository.ts#L109)):
```ts
      // Personalized boost map (best-effort: on failure, fall back to pure
      // textual ranking rather than failing the search).
      let scoreMap = new Map<string, { personalCount: number; householdCount: number }>();
      if (personalized && userId && householdId) {
        try {
          const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
          scoreMap = await new HouseholdActivityRepository().getScoreMap(householdId, userId, since);
        } catch (err) {
          console.error('ItemRepository: failed to load activity scores, ranking without boost', err);
        }
      }
```

Then, inside the existing `.map(item => { ... })` that builds `relevanceScore`, just before `return { item, relevanceScore };` ([:144](../../../backend/src/repositories/ItemRepository.ts#L144)):
```ts
        const score = scoreMap.get(item.id);
        if (score) {
          relevanceScore +=
            Math.min(score.personalCount, PERSONAL_CAP) * PERSONAL_WEIGHT +
            Math.min(score.householdCount, HOUSEHOLD_CAP) * HOUSEHOLD_WEIGHT;
        }
```

The existing sort ([:148-153](../../../backend/src/repositories/ItemRepository.ts#L148)) — descending score, then `localeCompare` — now breaks intra-band ties by frequency, then alphabetically. No change needed there.

- [ ] **Step 3: Thread `userId` + `personalized` from the controller**

In [backend/src/controllers/ItemController.ts](../../../backend/src/controllers/ItemController.ts) `searchItems` ([:113-119](../../../backend/src/controllers/ItemController.ts#L113)):
```ts
      const query: GetItemsQueryDto = {
        search: req.query.search as string,
        householdId: user.selectedHouseholdId,
        language: req.query.language as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        personalized: req.query.personalized === 'true',
        userId: user.id,
      };
```

- [ ] **Step 4: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0.

- [ ] **Step 5: Verify ranking behaviour**

Against the dev DB, confirm the boost re-orders ties but not bands. Find a household + user with a clearly frequent item, then compare the two orderings by hitting the search from the running app twice (DevTools Network): once as the app sends it (`&personalized=true`) and once by editing the URL to drop the param. Expected:
- With `personalized=true`, a frequently-added item that shares a relevance band with its neighbours (e.g. two prefix matches for `lai` → "Lait", "Laitue") surfaces above the alphabetical order when it has the higher 30-day count.
- A rare item typed in full (e.g. a long exact name) still appears at the top in both modes — the boost never pushes a frequent *contains*-match above it.
- Out-of-scope selectors (recipe editor) send no `personalized` param → identical order to before.

- [ ] **Step 6: Commit**

```bash
git add backend/src/types/ItemDto.ts backend/src/repositories/ItemRepository.ts backend/src/controllers/ItemController.ts
git commit -m "✨ #NNN tri pondéré saturé de la recherche d'articles"
```

---

### Task 5: `/item-suggestions` endpoint (sectioned empty-state)

**Files:**
- Create: `backend/src/utils/itemFormatter.ts`
- Modify: `backend/src/services/ItemService.ts` (use shared formatter)
- Create: `backend/src/services/ItemSuggestionService.ts`
- Create: `backend/src/controllers/ItemSuggestionController.ts`
- Create: `backend/src/routes/itemSuggestions.ts`
- Modify: `backend/src/index.ts` (mount)

**Interfaces:**
- Consumes: `HouseholdActivityRepository` (Task 2), `ItemRepository.findByIds` (Task 2), `HouseholdRepository.getMemberCount` ([HouseholdRepository.ts:122](../../../backend/src/repositories/HouseholdRepository.ts#L122)), `ItemDto`.
- Produces: `GET /api/households/:householdId/item-suggestions` → `ApiResponse<{ recent: Array<ItemDto & { lastSelectedAt: string }>; personalFrequent: ItemDto[]; householdFrequent: ItemDto[] }>`.

- [ ] **Step 1: Extract the shared item formatter**

Create [backend/src/utils/itemFormatter.ts](../../../backend/src/utils/itemFormatter.ts) with the exact body currently in `ItemService.formatItemResponse`:
```ts
import { Item } from '../models/Item';
import { ItemDto } from '../types/ItemDto';

// Canonical Item → ItemDto mapping. Shared by ItemService and
// ItemSuggestionService so both endpoints return the identical shape the
// frontend already consumes.
export function formatItemDto(item: Item): ItemDto {
  let availableUnits = item.availableUnits;
  if (typeof availableUnits === 'string') {
    try {
      availableUnits = JSON.parse(availableUnits);
    } catch {
      availableUnits = [item.defaultUnit];
    }
  }
  if (!Array.isArray(availableUnits)) {
    availableUnits = [item.defaultUnit];
  }

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    defaultUnit: item.defaultUnit,
    availableUnits: availableUnits,
    pieceAlias: item.pieceAlias ?? null,
    daysAfterOpening: item.daysAfterOpening || undefined,
    createdBy: item.createdBy,
    householdId: item.householdId,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    creator: item.creator
      ? { id: item.creator.id, displayName: item.creator.firstName + ' ' + item.creator.lastName, email: item.creator.email }
      : undefined,
    household: item.household ? { id: item.household.id, name: item.household.name } : undefined,
  };
}
```
Then in [backend/src/services/ItemService.ts](../../../backend/src/services/ItemService.ts): import it (`import { formatItemDto } from '../utils/itemFormatter';`), delete the private `formatItemResponse` method, and replace every `this.formatItemResponse(` call with `formatItemDto(`.

- [ ] **Step 2: Create the suggestion service**

Create [backend/src/services/ItemSuggestionService.ts](../../../backend/src/services/ItemSuggestionService.ts):
```ts
import { HouseholdActivityRepository } from '../repositories/HouseholdActivityRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { ItemDto } from '../types/ItemDto';
import { formatItemDto } from '../utils/itemFormatter';

const WINDOW_DAYS = 30;
const RECENT_LIMIT = 5;
const PERSONAL_LIMIT = 8;
const HOUSEHOLD_LIMIT = 5;
// Over-fetch frequents so dedup against higher-priority sections can't starve a
// section below its display limit.
const FETCH_MULTIPLIER = 4;

export interface RecentItemDto extends ItemDto {
  lastSelectedAt: string;
}

export interface ItemSuggestionsResult {
  recent: RecentItemDto[];
  personalFrequent: ItemDto[];
  householdFrequent: ItemDto[];
}

export class ItemSuggestionService {
  private activityRepository: HouseholdActivityRepository;
  private itemRepository: ItemRepository;
  private householdRepository: HouseholdRepository;

  constructor() {
    this.activityRepository = new HouseholdActivityRepository();
    this.itemRepository = new ItemRepository();
    this.householdRepository = new HouseholdRepository();
  }

  async getSuggestions(householdId: string, userId: string): Promise<ItemSuggestionsResult> {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [recentRefs, personalFreq, householdFreqRaw, memberCount] = await Promise.all([
      this.activityRepository.getRecentItemRefs(householdId, userId, RECENT_LIMIT),
      this.activityRepository.getFrequent(householdId, since, PERSONAL_LIMIT * FETCH_MULTIPLIER, userId),
      this.activityRepository.getFrequent(householdId, since, HOUSEHOLD_LIMIT * FETCH_MULTIPLIER),
      this.householdRepository.getMemberCount(householdId),
    ]);

    // Mono-member household: "Populaires dans le foyer" duplicates "Souvent
    // utilisés", so it is suppressed (spec §7).
    const householdFreq = memberCount > 1 ? householdFreqRaw : [];

    // Hydrate every referenced id in one batch; missing ids (deleted items)
    // silently drop out.
    const allIds = Array.from(
      new Set([
        ...recentRefs.map((r) => r.itemId),
        ...personalFreq.map((f) => f.itemId),
        ...householdFreq.map((f) => f.itemId),
      ])
    );
    const items = await this.itemRepository.findByIds(allIds);
    const byId = new Map(items.map((it) => [it.id, it]));

    // Dedup across sections in priority order: recent → personal → household.
    const used = new Set<string>();

    const recent: RecentItemDto[] = [];
    for (const ref of recentRefs) {
      const item = byId.get(ref.itemId);
      if (!item || used.has(ref.itemId)) continue;
      used.add(ref.itemId);
      recent.push({ ...formatItemDto(item), lastSelectedAt: ref.lastSelectedAt.toISOString() });
    }

    const personalFrequent = this.pick(personalFreq, byId, used, PERSONAL_LIMIT);
    const householdFrequent = this.pick(householdFreq, byId, used, HOUSEHOLD_LIMIT);

    return { recent, personalFrequent, householdFrequent };
  }

  private pick(
    freq: Array<{ itemId: string; count: number }>,
    byId: Map<string, import('../models/Item').Item>,
    used: Set<string>,
    limit: number
  ): ItemDto[] {
    const out: ItemDto[] = [];
    for (const f of freq) {
      if (out.length >= limit) break;
      const item = byId.get(f.itemId);
      if (!item || used.has(f.itemId)) continue;
      used.add(f.itemId);
      out.push(formatItemDto(item));
    }
    return out;
  }
}
```

- [ ] **Step 3: Create the controller**

Create [backend/src/controllers/ItemSuggestionController.ts](../../../backend/src/controllers/ItemSuggestionController.ts):
```ts
import { Request, Response } from 'express';
import { ItemSuggestionService } from '../services/ItemSuggestionService';

export class ItemSuggestionController {
  private itemSuggestionService: ItemSuggestionService;

  constructor() {
    this.itemSuggestionService = new ItemSuggestionService();
  }

  async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }
      if (!householdId) {
        res.status(400).json({ success: false, error: 'Household ID is required' });
        return;
      }

      const data = await this.itemSuggestionService.getSuggestions(householdId, user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in getSuggestions:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
```

- [ ] **Step 4: Create + mount the route**

Create [backend/src/routes/itemSuggestions.ts](../../../backend/src/routes/itemSuggestions.ts):
```ts
import { Router } from 'express';
import { ItemSuggestionController } from '../controllers/ItemSuggestionController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const itemSuggestionController = new ItemSuggestionController();

router.use(authenticateGoogleToken);

// GET /households/:householdId/item-suggestions — sectioned empty-state data
router.get('/:householdId/item-suggestions', itemSuggestionController.getSuggestions.bind(itemSuggestionController));

export default router;
```
In [backend/src/index.ts](../../../backend/src/index.ts): import after the stockExit import ([:9](../../../backend/src/index.ts#L9)):
```ts
import itemSuggestionRoutes from './routes/itemSuggestions';
```
and mount alongside the other household-scoped routers (after [:83](../../../backend/src/index.ts#L83)):
```ts
app.use('/api/households', itemSuggestionRoutes);
```

- [ ] **Step 5: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0.

- [ ] **Step 6: Verify the endpoint shape + rules**

From the running app (DevTools Network, or copy the `Authorization: Bearer` header into curl), call `GET /api/households/<id>/item-suggestions`. Expected:
- `recent` ≤ 5, each with an ISO `lastSelectedAt`, newest first.
- `personalFrequent` ≤ 8, none overlapping `recent`.
- `householdFrequent` ≤ 5, none overlapping the two above; **empty** when the household has one member (verify against a mono-member household).
- A brand-new user (no history) → all three arrays empty.

- [ ] **Step 7: Commit**

```bash
git add backend/src/utils/itemFormatter.ts backend/src/services/ItemService.ts backend/src/services/ItemSuggestionService.ts backend/src/controllers/ItemSuggestionController.ts backend/src/routes/itemSuggestions.ts backend/src/index.ts
git commit -m "✨ #NNN endpoint item-suggestions (récents / fréquents / foyer)"
```

---

### Task 6: Frontend service — suggestions, catalog page, personalized search

**Files:**
- Modify: `frontend/src/services/itemService.ts`

**Interfaces:**
- Consumes: backend `GET /api/households/:householdId/item-suggestions` (Task 5), `GET /api/items` (getItems), `GET /api/items/search?...&personalized=true` (Task 4).
- Produces:
  - `interface RecentItem extends Item { lastSelectedAt: string }`
  - `interface ItemSuggestions { recent: RecentItem[]; personalFrequent: Item[]; householdFrequent: Item[] }`
  - `itemService.getItemSuggestions(householdId: string): Promise<ItemSuggestions>`
  - `itemService.getCatalogPage(params: { householdId: string; language?: string; limit?: number; offset?: number }): Promise<SearchItemsResponse>`
  - `SearchItemsRequest` gains `personalized?: boolean`.

- [ ] **Step 1: Add types + `personalized` to search**

In [frontend/src/services/itemService.ts](../../../frontend/src/services/itemService.ts), extend `SearchItemsRequest` ([:43-48](../../../frontend/src/services/itemService.ts#L43)):
```ts
export interface SearchItemsRequest {
  search: string;
  language?: string;
  limit?: number;
  offset?: number;
  personalized?: boolean;
}
```
Add the suggestion types after `SearchItemsResponse` ([:53](../../../frontend/src/services/itemService.ts#L53)):
```ts
export interface RecentItem extends Item {
  lastSelectedAt: string;
}

export interface ItemSuggestions {
  recent: RecentItem[];
  personalFrequent: Item[];
  householdFrequent: Item[];
}
```
In `searchItems` ([:92-108](../../../frontend/src/services/itemService.ts#L92)), append the flag after the `offset` line:
```ts
  if (params.personalized) searchParams.append('personalized', 'true');
```

- [ ] **Step 2: Add `getCatalogPage` + `getItemSuggestions`**

After `getItemsByHousehold` ([:170](../../../frontend/src/services/itemService.ts#L170)):
```ts
// Full catalog (global + household), alphabetical, paginated. Backed by the
// empty-search branch of GET /api/items — powers the "Tous les articles"
// section's infinite scroll.
const getCatalogPage = async (params: {
  householdId: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Promise<SearchItemsResponse> => {
  const searchParams = new URLSearchParams();
  searchParams.append('householdId', params.householdId);
  if (params.language) searchParams.append('language', params.language);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  const response = await apiService.get(`/api/items?${searchParams.toString()}`);
  const result: ApiResponse<SearchItemsResponse> = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to load catalog');
  }
  return result.data || { items: [], total: 0 };
};

const getItemSuggestions = async (householdId: string): Promise<ItemSuggestions> => {
  const response = await apiService.get(`/api/households/${householdId}/item-suggestions`);
  const result: ApiResponse<ItemSuggestions> = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to load suggestions');
  }
  return result.data || { recent: [], personalFrequent: [], householdFrequent: [] };
};
```
Add both to the exported `itemService` object ([:197-206](../../../frontend/src/services/itemService.ts#L197)):
```ts
export const itemService = {
  searchItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getItemsByHousehold,
  getItemsByCategory,
  getRecipeCount,
  getCatalogPage,
  getItemSuggestions,
};
```

- [ ] **Step 3: Build + commit**

Run: `cd frontend && npm run build`
Expected: Vite/tsc build succeeds.
```bash
git add frontend/src/services/itemService.ts
git commit -m "✨ #NNN service: suggestions, page catalogue, recherche personnalisée"
```

---

### Task 7: Frontend suggestions cache + relative-time helper

**Files:**
- Create: `frontend/src/utils/itemSuggestionsCache.ts`
- Create: `frontend/src/utils/relativeTime.ts`

**Interfaces:**
- Consumes: `itemService.getItemSuggestions`, `ItemSuggestions` (Task 6).
- Produces:
  - `getCachedSuggestions(householdId: string): Promise<ItemSuggestions>`
  - `invalidateSuggestions(householdId?: string): void`
  - `formatRelativeTime(iso: string, locale: string): string`

- [ ] **Step 1: Module-level TTL cache**

Create [frontend/src/utils/itemSuggestionsCache.ts](../../../frontend/src/utils/itemSuggestionsCache.ts). A single module-level map shared by every `ItemSelector` instance — replaces the per-instance `useRef` that made N ingredient rows fire N identical requests. In-flight promises are cached too, so concurrent selectors coalesce into one request.
```ts
import { itemService, ItemSuggestions } from '@/services/itemService';

const TTL_MS = 60_000;

interface Entry {
  at: number;
  promise: Promise<ItemSuggestions>;
}

const cache = new Map<string, Entry>();

export function getCachedSuggestions(householdId: string): Promise<ItemSuggestions> {
  const now = Date.now();
  const hit = cache.get(householdId);
  if (hit && now - hit.at < TTL_MS) {
    return hit.promise;
  }
  const promise = itemService.getItemSuggestions(householdId).catch((err) => {
    // Don't cache failures — drop the entry so the next open retries.
    cache.delete(householdId);
    throw err;
  });
  cache.set(householdId, { at: now, promise });
  return promise;
}

export function invalidateSuggestions(householdId?: string): void {
  if (householdId) cache.delete(householdId);
  else cache.clear();
}
```

- [ ] **Step 2: Relative-time helper**

Create [frontend/src/utils/relativeTime.ts](../../../frontend/src/utils/relativeTime.ts). Native `Intl.RelativeTimeFormat`, locale-aware, no dependency (the journal's `dayRelativeLabel` only covers today/yesterday, so it can't render "il y a 2 jours"):
```ts
// "il y a 2 jours" / "2 days ago" — coarse day/hour/minute granularity, enough
// for the récents indicator. Locale is the i18n base code (fr/en/es).
export function formatRelativeTime(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const diffMs = then - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs >= day) return rtf.format(Math.round(diffMs / day), 'day');
  if (abs >= hour) return rtf.format(Math.round(diffMs / hour), 'hour');
  if (abs >= minute) return rtf.format(Math.round(diffMs / minute), 'minute');
  return rtf.format(Math.round(diffMs / 1000), 'second');
}
```

- [ ] **Step 3: Build + commit**

Run: `cd frontend && npm run build`
Expected: build succeeds.
```bash
git add frontend/src/utils/itemSuggestionsCache.ts frontend/src/utils/relativeTime.ts
git commit -m "✨ #NNN cache suggestions + helper temps relatif"
```

---

### Task 8: ItemSelector — personalized prop, sectioned empty-state, i18n, call-site wiring

**Files:**
- Modify: `frontend/src/components/ItemSelector.tsx`
- Modify: `frontend/src/components/AddItemCard.tsx`
- Modify: `frontend/src/components/AddStoredItemDialog.tsx`
- Modify: `frontend/src/pages/StorageArea.tsx`
- Modify: `frontend/src/pages/Shopping.tsx`
- Modify: `frontend/src/i18n/locales/{en,es,fr}.json`

**Interfaces:**
- Consumes: `getCachedSuggestions` (Task 7), `formatRelativeTime` (Task 7), `ItemSuggestions`/`RecentItem` (Task 6).
- Produces: `ItemSelector` prop `personalized?: boolean` (default `false`); `AddItemCard` prop `personalized?: boolean` (threaded to its `ItemSelector`).

- [ ] **Step 1: Add i18n keys (all three locales)**

In each of [en.json](../../../frontend/src/i18n/locales/en.json), [fr.json](../../../frontend/src/i18n/locales/fr.json), [es.json](../../../frontend/src/i18n/locales/es.json), add a `sections` object inside the existing `itemSelector` block (near line 308).

en.json:
```json
    "sections": {
      "recent": "Your recent items",
      "frequent": "Frequently used",
      "householdFrequent": "Popular in your household",
      "allItems": "All items"
    },
```
fr.json:
```json
    "sections": {
      "recent": "Tes récents",
      "frequent": "Souvent utilisés",
      "householdFrequent": "Populaires dans le foyer",
      "allItems": "Tous les articles"
    },
```
es.json:
```json
    "sections": {
      "recent": "Tus recientes",
      "frequent": "Usados con frecuencia",
      "householdFrequent": "Populares en tu hogar",
      "allItems": "Todos los artículos"
    },
```

- [ ] **Step 2: Add the `personalized` prop + suggestions state**

In [frontend/src/components/ItemSelector.tsx](../../../frontend/src/components/ItemSelector.tsx): add imports (after [:21](../../../frontend/src/components/ItemSelector.tsx#L21)):
```ts
import { getCachedSuggestions } from '@/utils/itemSuggestionsCache';
import { formatRelativeTime } from '@/utils/relativeTime';
import type { ItemSuggestions } from '@/services/itemService';
```
Add to the props interface ([:23-32](../../../frontend/src/components/ItemSelector.tsx#L23)):
```ts
  /** Enable personalized ranking + sectioned empty-state (stock & shopping only). */
  personalized?: boolean;
```
Destructure it with a default ([:34-42](../../../frontend/src/components/ItemSelector.tsx#L34)):
```ts
  personalized = false,
```
Add state near the other `useState`s (after [:53](../../../frontend/src/components/ItemSelector.tsx#L53)):
```ts
  const [suggestions, setSuggestions] = useState<ItemSuggestions | null>(null);
```

- [ ] **Step 3: Load suggestions on focus when personalized**

Add a loader alongside `loadHouseholdItemsOnDemand` (after [:111](../../../frontend/src/components/ItemSelector.tsx#L111)):
```ts
  const loadSuggestionsOnDemand = async () => {
    if (!personalized || !user || !isAuthenticated || !selectedHouseholdId) return;
    try {
      const data = await getCachedSuggestions(selectedHouseholdId);
      setSuggestions(data);
    } catch (error) {
      console.error('ItemSelector: failed to load suggestions', error);
      setSuggestions(null); // fall back silently to the plain catalog
    }
  };
```
Reset it when the household changes — extend the existing reset effect ([:114-118](../../../frontend/src/components/ItemSelector.tsx#L114)):
```ts
  useEffect(() => {
    setHasLoadedHouseholdItems(false);
    setApiResults([]);
    householdItemsRef.current = [];
    setSuggestions(null);
  }, [selectedHouseholdId]);
```
Call it from `handleInputFocus` ([:497-505](../../../frontend/src/components/ItemSelector.tsx#L497)) and `handleInputChange` ([:487-495](../../../frontend/src/components/ItemSelector.tsx#L487)), in the same `!query.trim()` branch that lazy-loads household items. In `handleInputFocus`:
```ts
  const handleInputFocus = () => {
    setIsOpen(true);
    setTimeout(updateDropdownPosition, 0);

    if (!query.trim()) {
      if (personalized) {
        loadSuggestionsOnDemand();
      } else if (!hasLoadedHouseholdItems) {
        loadHouseholdItemsOnDemand();
      }
    }
  };
```
Apply the same `personalized` branch in `handleInputChange`'s existing empty-query block.

- [ ] **Step 4: Render the sections in the empty-query, personalized state**

The current list renders `filteredResults.slice(0, 8)` inside `{filteredResults.length > 0 && (...)}` ([:590-646](../../../frontend/src/components/ItemSelector.tsx#L590)). Wrap the dropdown body so that **when `personalized && !query.trim() && suggestions`**, the sectioned view renders; otherwise the existing list renders (Task 9 handles that list's paging).

Add this helper above the `return` (near [:513](../../../frontend/src/components/ItemSelector.tsx#L513)), reusing the exact row markup already used for results so styling stays identical:
```tsx
  const renderRow = (item: Item, subtitle?: string) => (
    <div
      key={item.id}
      onClick={() => handleItemSelect(item)}
      className="group flex items-center justify-between p-2 hover:bg-muted cursor-pointer rounded transition-colors"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <ItemImage
          src={item.imageUrl}
          alt={getItemDisplayName(item, t)}
          containerClassName="w-10 h-10 rounded-md"
          fallbackIconSize={22}
          category={item.category}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{getItemDisplayName(item, t)}</div>
          <div className="flex items-center gap-2">
            <Badge className={`${getCategoryColor(item.category)} inline-flex items-center gap-1`}>
              <CategoryIcon category={item.category} className="h-3.5 w-3.5" />
              {t(`items.categories.${item.category}`)}
            </Badge>
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionHeader = (label: string) => (
    <div className="px-2 pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
  );

  // Filter out excluded / cleaning / cooked-meal items the same way the search
  // results are filtered, so sections honour the same exclusions.
  const keepSuggestion = (item: Item) =>
    !excludedItems.some((e) => e.id === item.id) &&
    !(excludeCleaningProducts && item.category === ItemCategory.CLEANING_PRODUCTS) &&
    item.category !== ItemCategory.COOKED_MEAL;

  const showSections = personalized && !query.trim() && !!suggestions;
  const hasAnySuggestion =
    !!suggestions &&
    (suggestions.recent.length + suggestions.personalFrequent.length + suggestions.householdFrequent.length) > 0;
```
Then, inside the portal dropdown, add the sectioned block just before the existing `{filteredResults.length > 0 && (...)}` block ([:590](../../../frontend/src/components/ItemSelector.tsx#L590)):
```tsx
          {showSections && hasAnySuggestion && (
            <div className="p-1">
              {suggestions!.recent.filter(keepSuggestion).length > 0 && (
                <>
                  {renderSectionHeader(t('itemSelector.sections.recent'))}
                  {suggestions!.recent.filter(keepSuggestion).map((item) =>
                    renderRow(item, formatRelativeTime((item as RecentItem).lastSelectedAt, i18n.language.split('-')[0]))
                  )}
                </>
              )}
              {suggestions!.personalFrequent.filter(keepSuggestion).length > 0 && (
                <>
                  {renderSectionHeader(t('itemSelector.sections.frequent'))}
                  {suggestions!.personalFrequent.filter(keepSuggestion).map((item) => renderRow(item))}
                </>
              )}
              {suggestions!.householdFrequent.filter(keepSuggestion).length > 0 && (
                <>
                  {renderSectionHeader(t('itemSelector.sections.householdFrequent'))}
                  {suggestions!.householdFrequent.filter(keepSuggestion).map((item) => renderRow(item))}
                </>
              )}
              {renderSectionHeader(t('itemSelector.sections.allItems'))}
            </div>
          )}
```
Add the `RecentItem` type to the import from `@/services/itemService` (extend the existing `import { itemService, Item } from '@/services/itemService';` at [:8](../../../frontend/src/components/ItemSelector.tsx#L8) to also import `RecentItem`). The "Tous les articles" list beneath the header is wired in Task 9; for now the existing `filteredResults` block renders below it.

- [ ] **Step 5: Thread `personalized` through AddItemCard**

In [frontend/src/components/AddItemCard.tsx](../../../frontend/src/components/AddItemCard.tsx): add to `AddItemCardProps` ([:13-22](../../../frontend/src/components/AddItemCard.tsx#L13)):
```ts
  /** Forwarded to the underlying ItemSelector to enable personalized ranking. */
  personalized?: boolean;
```
Destructure it ([:24-32](../../../frontend/src/components/AddItemCard.tsx#L24)) with `personalized = false,` and pass it to the `<ItemSelector>` ([:122-128](../../../frontend/src/components/AddItemCard.tsx#L122)):
```tsx
                <ItemSelector
                  onItemSelect={handleItemSelect}
                  placeholder={placeholder}
                  selectedItem={selectedItem}
                  className="w-full"
                  autoFocus
                  personalized={personalized}
                />
```

- [ ] **Step 6: Enable at the three in-scope call sites**

Add `personalized` to the `<ItemSelector>` / `<AddItemCard>` at each site (leave recipes/minimums/import untouched):
- [AddStoredItemDialog.tsx](../../../frontend/src/components/AddStoredItemDialog.tsx): the `<ItemSelector ...>` near line 400 → add `personalized`.
- [StorageArea.tsx](../../../frontend/src/pages/StorageArea.tsx): the `<ItemSelector ...>` near line 296 → add `personalized`.
- [Shopping.tsx](../../../frontend/src/pages/Shopping.tsx): the `<AddItemCard ...>` near line 456 → add `personalized`.

(Locate each by the component tag rather than the exact line, in case of drift.)

- [ ] **Step 7: Build + manual verify sections**

Run: `cd frontend && npm run build`
Expected: build succeeds.

Then in the running app, on **Add to stock** and the **Shopping** manual-add: focus the selector without typing. Expected:
- Sections render in order Récents → Souvent utilisés → Populaires dans le foyer → Tous les articles, with muted grey headers.
- Récents rows show "il y a N jours"; no item repeats across the top three sections.
- On a mono-member household, "Populaires dans le foyer" is absent.
- On a brand-new account, only "Tous les articles" shows.
- On the **recipe editor** ingredient selector, no sections appear (unchanged behaviour).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ItemSelector.tsx frontend/src/components/AddItemCard.tsx frontend/src/components/AddStoredItemDialog.tsx frontend/src/pages/StorageArea.tsx frontend/src/pages/Shopping.tsx frontend/src/i18n/locales/en.json frontend/src/i18n/locales/es.json frontend/src/i18n/locales/fr.json
git commit -m "✨ #NNN sélecteur personnalisé: sections récents/fréquents/foyer"
```

---

### Task 9: ItemSelector — remove the 8-row cap + infinite scroll

**Files:**
- Modify: `frontend/src/components/ItemSelector.tsx`

**Interfaces:**
- Consumes: `itemService.getCatalogPage` (Task 6), `itemService.searchItems` with `offset`/`personalized` (Task 6).
- Produces: paginated list rendering for both the empty-query catalogue and active search.

- [ ] **Step 1: Add paging state**

Near the other state (after the `suggestions` state from Task 8):
```ts
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const catalogOffsetRef = useRef(0);
  const PAGE_SIZE = 20;
```

- [ ] **Step 2: Load the first catalogue page for the personalized empty state**

The "Tous les articles" list needs its own data (the full catalog), distinct from `apiResults`. When `personalized && !query.trim()`, load page 0 via `getCatalogPage` on focus. Extend `loadSuggestionsOnDemand` (Task 8) to also seed the catalogue:
```ts
  const loadSuggestionsOnDemand = async () => {
    if (!personalized || !user || !isAuthenticated || !selectedHouseholdId) return;
    try {
      const [data, firstPage] = await Promise.all([
        getCachedSuggestions(selectedHouseholdId),
        itemService.getCatalogPage({
          householdId: selectedHouseholdId,
          language: i18n.language.split('-')[0],
          limit: PAGE_SIZE,
          offset: 0,
        }),
      ]);
      setSuggestions(data);
      setApiResults(firstPage.items);
      setCatalogTotal(firstPage.total);
      catalogOffsetRef.current = firstPage.items.length;
    } catch (error) {
      console.error('ItemSelector: failed to load suggestions/catalog', error);
      setSuggestions(null);
    }
  };
```
Here `apiResults` holds the catalogue page under the "Tous les articles" header. (For the non-personalized selector, `apiResults` keeps its current household-items meaning — untouched.)

- [ ] **Step 3: Remove the 8-row cap**

Replace `filteredResults.slice(0, 8).map(...)` ([:592](../../../frontend/src/components/ItemSelector.tsx#L592)) with `filteredResults.map(...)` — render all loaded results. The `key` stays `` `${item.id}-${index}` ``.

- [ ] **Step 4: Infinite-scroll handler on the dropdown**

Add a scroll handler that loads the next page when near the bottom. It must page the **catalogue** in the personalized empty state and the **search results** during active search. Add near the wheel effect ([:290-300](../../../frontend/src/components/ItemSelector.tsx#L290)):
```ts
  const loadMore = async () => {
    if (loadingMore) return;

    // Active search: page more matches via the search endpoint.
    if (query.trim()) {
      if (filteredResults.length >= 200) return; // sane bound on a typed search
      setLoadingMore(true);
      try {
        const resp = await itemService.searchItems({
          search: query,
          language: i18n.language.split('-')[0],
          limit: PAGE_SIZE,
          offset: apiResults.length,
          personalized,
        });
        if (resp.items.length > 0) {
          setApiResults((prev) => [...prev, ...resp.items]);
        }
      } catch (error) {
        console.error('ItemSelector: failed to load more search results', error);
      } finally {
        setLoadingMore(false);
      }
      return;
    }

    // Personalized empty state: page the alphabetical catalogue.
    if (personalized && catalogOffsetRef.current < catalogTotal) {
      setLoadingMore(true);
      try {
        const page = await itemService.getCatalogPage({
          householdId: selectedHouseholdId!,
          language: i18n.language.split('-')[0],
          limit: PAGE_SIZE,
          offset: catalogOffsetRef.current,
        });
        setApiResults((prev) => [...prev, ...page.items]);
        catalogOffsetRef.current += page.items.length;
        setCatalogTotal(page.total);
      } catch (error) {
        console.error('ItemSelector: failed to load more catalog items', error);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      loadMore();
    }
  };
```
Wire it to the portal container ([:554-564](../../../frontend/src/components/ItemSelector.tsx#L554)) by adding `onScroll={handleDropdownScroll}` to the `<div ref={dropdownRef} ...>`. The existing `wheel` handler ([:290-300](../../../frontend/src/components/ItemSelector.tsx#L290)) drives `scrollTop`, which fires this React `onScroll` — so wheel-scrolling inside a Radix dialog paginates correctly. **Do not remove the wheel handler.**

- [ ] **Step 5: Optional loading affordance**

Below the results list, show a spinner row while paging:
```tsx
          {loadingMore && (
            <div className="flex items-center justify-center p-2 text-xs text-muted-foreground bg-card">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t('itemSelector.searching')}
            </div>
          )}
```
(`Loader2` is already imported at [:3](../../../frontend/src/components/ItemSelector.tsx#L3).)

- [ ] **Step 6: Build + manual verify scrolling**

Run: `cd frontend && npm run build`
Expected: build succeeds.

In the running app, on Add-to-stock/Shopping:
- Empty query: scroll the "Tous les articles" list — more items load past the first 20, no duplicate rows at page boundaries, reaches deep into the alphabet.
- Type 2–3 letters with many matches: more than 8 results show (cap gone) and scrolling loads further matches.
- **Inside the Add-to-stock dialog (Radix):** mouse-wheel scrolling still moves the dropdown and triggers paging (wheel handler intact).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ItemSelector.tsx
git commit -m "✨ #NNN sélecteur: scroll infini + suppression du plafond 8 lignes"
```

---

## Self-Review

**Spec coverage** (spec §-by-§ → task):
- §4 table/indexes/no-FK/snapshots → Task 1. Write points → Task 3 (with the `bulkTransferToStorage` correction). Backfill all-history incl. soft-deleted → Task 1 step 4/6.
- §5 banded-score analysis + saturated boost + 30-day score map + `/item-suggestions` + mono-member gate → Tasks 4 & 5.
- §6 `personalized` prop, empty-state fetch, sections, no-React-Query module cache, `Intl.RelativeTimeFormat`, remove `slice(0,8)`, infinite scroll, preserve wheel handler → Tasks 6–9.
- §7 edge cases: new user (empty arrays → sections hidden, Task 8 step 4 `hasAnySuggestion`), inactive 30d (récents has no window in `getRecentItemRefs`, Task 2), mono-member (Task 5), deleted item (`findByIds` drops it, Task 2 + no-FK Task 1), custom items (counted as ordinary rows), never-selected (absent from log → catalog only).
- §8 verification = build + psql + manual (no runner) → every task's verify steps.
- §10 out of scope: accent-folding (untouched), dashboard feed (table only), recipes/minimums/import (no `personalized` prop passed).

**Placeholder scan:** no TBD/TODO; `#NNN` in commit messages is an intentional slot for the tracker issue number — replace with the real number at execution time. All code steps carry complete code.

**Type consistency:** `HouseholdActivityAction` (Task 1) used identically in Tasks 2/3. `CreateHouseholdActivityData` shape (Task 2) matches every `activityLogger.log({...})` call (Task 3). `getScoreMap` return `{ personalCount, householdCount }` matches the consumer in Task 4. `ItemSuggestions`/`RecentItem` (Task 6) match the render in Task 8 and the endpoint payload in Task 5. `getCatalogPage`/`searchItems` signatures (Task 6) match calls in Task 9. `setShoppingItemStatus(id, status, userId)` (Task 3) matches the controller call.

**One behaviour to watch at execution:** in the personalized empty state, `apiResults` is repurposed to hold the alphabetical catalogue page (Task 9 step 2), whereas non-personalized keeps it as household items. Keep the `personalized` branch strict so the two meanings never cross.
