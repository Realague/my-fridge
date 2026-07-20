# Activités récentes du foyer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un feed d'activité du foyer (qui a fait quoi : stock, courses, meal plan), affiché en section compacte sur le Dashboard et sur une page dédiée `/activity` groupée par jour.

**Architecture:** On généralise la table `household_activities` existante (aujourd'hui simple signal de ranking à 3 actions) en journal canonique : enum élargi + colonnes `targetType` / `targetId` / `metadata` JSONB. Chaque action métier écrit une ligne d'activité best-effort (dual-write) ; les sorties de stock loggent en plus de leur `StockExit`. Un endpoint household-scoped paginé en keyset alimente le front, qui construit les libellés en i18n.

**Tech Stack:** Backend Express 4 + Sequelize 6 + PostgreSQL 15. Frontend React 18 + TypeScript + Zustand + React Query + shadcn/ui + Tailwind + react-i18next.

## Global Constraints

- **Pas de test runner** dans ce repo (CLAUDE.md). La « vérification » de chaque tâche = `npx tsc --noEmit` (compile), `npm run lint`, et checklist manuelle. Ne PAS ajouter vitest/jest (hors scope).
- **Backend** : flux routes → controllers → services → repositories → models. Controllers renvoient toujours `ApiResponse<T>` (`{ success, message?, data?, error? }`). Routes household-scoped montées sous `/api/households`, protégées par `authenticateGoogleToken`, `userId` lu via `(req as any).user`.
- **Associations** : toute nouvelle association Sequelize se déclare dans `backend/src/models/index.ts` (source unique). Déjà présent : `HouseholdActivity.belongsTo(User, { as: 'user' })` et `belongsTo(Household, { as: 'household' })`.
- **Enums partagés** : `frontend/src/types/enums.ts` doit rester en phase avec `backend/src/types/enums.ts`.
- **Logging best-effort** : `HouseholdActivityLogger.log()` avale déjà toutes les erreurs. JAMAIS appeler `log()` dans une transaction vive ; toujours après le succès de l'opération métier.
- **Migrations** : ne jamais éditer une migration déjà livrée ; créer un nouveau fichier. `ALTER TYPE ... ADD VALUE` exige `transaction: false` dans le module de migration.
- **Frontend services/stores** : suivre `frontend/SERVICE_ARCHITECTURE.md` (factory `get/post/put/delete` sur `makeAuthenticatedApiCall`) ; passer des objets bruts (pas de `JSON.stringify`). Pas de pattern `initialize*`.
- **i18n** : toute chaîne visible = clé i18n, ajoutée dans **en / es / fr** (`frontend/src/i18n/locales/{en,es,fr}.json`). `en` = fallback ; `fr` = langage naturel cible.
- **Charte graphique Fresh** (`docs/charte-graphique.html`) : tokens `mf-*` (`mf-card`, `mf-badge`, `font-display`, `text-mf-text`, `bg-mf-night-surface`, etc.). Réutiliser les patterns des composants `journal/`.
- **Utilisateur = pas d'avatar en base** (User a `firstName`/`lastName`, aucun champ image). L'« avatar » est un pastille d'initiales (voir `initialsOf` dans `JournalEntry.tsx`).
- Périmètre V1 : pas de filtres, pas d'actions sociales, pas de purge, pas de résumé d'actions groupées. Recettes/paramètres/stockages n'émettent PAS d'activité.

---

## Phase A — Fondations backend (table, modèle, API)

### Task A1 : Élargir l'enum d'actions + colonnes génériques (enums partagés + migration)

**Files:**
- Modify: `backend/src/types/enums.ts:110-116` (enum `HouseholdActivityAction` + ajout `HouseholdActivityTargetType`)
- Modify: `frontend/src/types/enums.ts` (miroir)
- Create: `backend/src/migrations/2026071900-generalize-household-activities.js`

**Interfaces:**
- Produces: `HouseholdActivityAction` (13 valeurs), `HOUSEHOLD_ACTIVITY_ACTIONS`, `HouseholdActivityTargetType`, `HOUSEHOLD_ACTIVITY_TARGET_TYPES`.

- [ ] **Step 1 : Élargir l'enum backend**

Dans `backend/src/types/enums.ts`, remplacer le bloc `HouseholdActivityAction` (lignes ~110-116) par :

```ts
export enum HouseholdActivityAction {
  // Stock
  ITEM_ADDED = 'item_added',
  ITEM_QUANTITY_CHANGED = 'item_quantity_changed',
  ITEM_EXPIRATION_CHANGED = 'item_expiration_changed',
  ITEM_CONSUMED = 'item_consumed',
  ITEM_THROWN = 'item_thrown',
  ITEM_REMOVED = 'item_removed',
  // Shopping list
  SHOPPING_ADDED = 'shopping_added',
  SHOPPING_CHECKED = 'shopping_checked',
  SHOPPING_REMOVED = 'shopping_removed',
  // Meal plan
  RECIPE_PLANNED = 'recipe_planned',
  RECIPE_SERVINGS_CHANGED = 'recipe_servings_changed',
  RECIPE_COOKED = 'recipe_cooked',
  RECIPE_UNPLANNED = 'recipe_unplanned',
}

export const HOUSEHOLD_ACTIVITY_ACTIONS = Object.values(HouseholdActivityAction);

export enum HouseholdActivityTargetType {
  ITEM = 'item',
  SHOPPING_ITEM = 'shopping_item',
  MEAL = 'meal',
  RECIPE = 'recipe',
}

export const HOUSEHOLD_ACTIVITY_TARGET_TYPES = Object.values(HouseholdActivityTargetType);
```

- [ ] **Step 2 : Mirror dans le frontend**

Dans `frontend/src/types/enums.ts`, ajouter le même `HouseholdActivityAction` (13 valeurs) et `HouseholdActivityTargetType` (+ leurs `Object.values` consts) au même endroit conceptuel que les autres enums. Si un `HouseholdActivityAction` réduit y existe déjà, le remplacer.

- [ ] **Step 3 : Créer la migration**

Créer `backend/src/migrations/2026071900-generalize-household-activities.js` :

```js
'use strict';

const { DataTypes } = require('sequelize');

// ADD VALUE (enum) ne peut pas tourner dans une transaction Postgres.
const NEW_ACTIONS = [
  'item_quantity_changed',
  'item_expiration_changed',
  'item_consumed',
  'item_thrown',
  'item_removed',
  'shopping_removed',
  'recipe_planned',
  'recipe_servings_changed',
  'recipe_cooked',
  'recipe_unplanned',
];

const TARGET_TYPES = ['item', 'shopping_item', 'meal', 'recipe'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  transaction: false,

  async up(queryInterface, Sequelize) {
    // 1. Élargir l'enum d'actions (idempotent).
    for (const value of NEW_ACTIONS) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_household_activities_action" ADD VALUE IF NOT EXISTS '${value}';`
      );
    }

    // 2. Type enum pour targetType (créé s'il n'existe pas).
    const [typeRows] = await queryInterface.sequelize.query(
      `SELECT 1 FROM pg_type WHERE typname = 'enum_household_activities_targetType' LIMIT 1;`
    );
    if (typeRows.length === 0) {
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_household_activities_targetType" AS ENUM ('${TARGET_TYPES.join("','")}');`
      );
    }

    // 3. Colonnes (idempotent via describeTable).
    const table = await queryInterface.describeTable('household_activities');

    if (!table.targetType) {
      await queryInterface.addColumn('household_activities', 'targetType', {
        type: '"enum_household_activities_targetType"',
        allowNull: true,
      });
    }
    if (!table.targetId) {
      await queryInterface.addColumn('household_activities', 'targetId', {
        type: DataTypes.UUID,
        allowNull: true,
      });
    }
    if (!table.metadata) {
      await queryInterface.addColumn('household_activities', 'metadata', {
        type: DataTypes.JSONB,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('household_activities', 'metadata');
    await queryInterface.removeColumn('household_activities', 'targetId');
    await queryInterface.removeColumn('household_activities', 'targetType');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_household_activities_targetType";'
    );
    // Les valeurs d'enum ajoutées ne sont pas retirables en Postgres — laissées en place.
  },
};
```

- [ ] **Step 4 : Compiler + migrer**

Run: `cd backend && npx tsc --noEmit`
Expected: pas d'erreur.

Run: `cd backend && npm run db:migrate`
Expected: migration `2026071900-generalize-household-activities` appliquée. Vérifier :
`docker-compose -f docker-compose.dev.yml exec db psql -U postgres -d my_fridge_db -c "\d household_activities"` → colonnes `targetType`, `targetId`, `metadata` présentes.

- [ ] **Step 5 : Commit**

```bash
git add backend/src/types/enums.ts frontend/src/types/enums.ts backend/src/migrations/2026071900-generalize-household-activities.js
git commit -m "✨ #activités généraliser household_activities (enum élargi + targetType/targetId/metadata)"
```

---

### Task A2 : Modèle + repository (colonnes génériques, feed keyset, suppression pour undo)

**Files:**
- Modify: `backend/src/models/HouseholdActivity.ts`
- Modify: `backend/src/repositories/HouseholdActivityRepository.ts`

**Interfaces:**
- Consumes: `HouseholdActivityAction`, `HouseholdActivityTargetType` (Task A1).
- Produces:
  - `CreateHouseholdActivityData` étendu avec `targetType?`, `targetId?`, `metadata?`.
  - `HouseholdActivityRepository.getFeed(householdId, { limit, before? }): Promise<{ rows: HouseholdActivity[]; nextCursor: string | null }>` — chaque row inclut `user`.
  - `HouseholdActivityRepository.deleteRecentForTarget(householdId, targetId, actions: HouseholdActivityAction[]): Promise<void>`.

- [ ] **Step 1 : Ajouter les attributs au modèle**

Dans `backend/src/models/HouseholdActivity.ts` :
- Importer `HouseholdActivityTargetType, HOUSEHOLD_ACTIVITY_TARGET_TYPES` depuis `../types/enums`.
- Ajouter à `HouseholdActivityAttributes` : `targetType: HouseholdActivityTargetType | null; targetId: string | null; metadata: Record<string, unknown> | null;`.
- Ajouter ces trois clés au `Optional<...>` de `HouseholdActivityCreationAttributes`.
- Ajouter les champs publics de classe :

```ts
  public targetType!: HouseholdActivityTargetType | null;
  public targetId!: string | null;
  public metadata!: Record<string, unknown> | null;
```

- Ajouter dans `HouseholdActivity.init({...})`, après `action` :

```ts
    targetType: {
      type: DataTypes.ENUM(...HOUSEHOLD_ACTIVITY_TARGET_TYPES),
      allowNull: true,
    },
    targetId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
```

- [ ] **Step 2 : Étendre `CreateHouseholdActivityData` + ajouter les méthodes feed/delete au repository**

Dans `backend/src/repositories/HouseholdActivityRepository.ts` :

Étendre l'interface :

```ts
export interface CreateHouseholdActivityData {
  householdId: string;
  userId: string;
  itemId: string | null;
  itemNameSnapshot: string | null;
  action: HouseholdActivityAction;
  targetType?: HouseholdActivityTargetType | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}
```

Ajouter en tête les imports nécessaires : `import { User } from '../models/User';`, et compléter l'import enums avec `HouseholdActivityTargetType`.

Ajouter ces méthodes à la classe (le curseur keyset encode `createdAt|id` en base64) :

```ts
  // Feed paginé en keyset décroissant sur (createdAt, id). `before` = curseur
  // opaque renvoyé par un appel précédent. Inclut l'auteur (User).
  async getFeed(
    householdId: string,
    opts: { limit: number; before?: string }
  ): Promise<{ rows: HouseholdActivity[]; nextCursor: string | null }> {
    const where: Record<string, unknown> = { householdId };

    if (opts.before) {
      const decoded = this.decodeCursor(opts.before);
      if (decoded) {
        where[Op.or as unknown as string] = [
          { createdAt: { [Op.lt]: decoded.createdAt } },
          { createdAt: decoded.createdAt, id: { [Op.lt]: decoded.id } },
        ];
      }
    }

    const rows = await HouseholdActivity.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: opts.limit + 1,
    });

    let nextCursor: string | null = null;
    if (rows.length > opts.limit) {
      const last = rows[opts.limit - 1];
      nextCursor = this.encodeCursor(last.createdAt, last.id);
      rows.length = opts.limit;
    }

    return { rows, nextCursor };
  }

  // Supprime la ligne d'activité la plus récente correspondant à un target +
  // une des actions données. Best-effort (undo dans la fenêtre de 10s).
  async deleteRecentForTarget(
    householdId: string,
    targetId: string,
    actions: HouseholdActivityAction[]
  ): Promise<void> {
    const row = await HouseholdActivity.findOne({
      where: { householdId, targetId, action: { [Op.in]: actions } },
      order: [['createdAt', 'DESC']],
    });
    if (row) await row.destroy();
  }

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(`${new Date(createdAt).toISOString()}|${id}`).toString('base64');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
    try {
      const [iso, id] = Buffer.from(cursor, 'base64').toString('utf8').split('|');
      if (!iso || !id) return null;
      return { createdAt: new Date(iso), id };
    } catch {
      return null;
    }
  }
```

- [ ] **Step 3 : Compiler**

Run: `cd backend && npx tsc --noEmit`
Expected: pas d'erreur. (Note : `Op` est déjà importé en tête du repository.)

- [ ] **Step 4 : Commit**

```bash
git add backend/src/models/HouseholdActivity.ts backend/src/repositories/HouseholdActivityRepository.ts
git commit -m "✨ #activités modèle + repo : colonnes génériques, feed keyset, deleteRecentForTarget"
```

---

### Task A3 : Service + controller + routes du feed

**Files:**
- Create: `backend/src/services/HouseholdActivityFeedService.ts`
- Create: `backend/src/controllers/HouseholdActivityController.ts`
- Create: `backend/src/routes/householdActivities.ts`
- Modify: `backend/src/index.ts` (import + `app.use`)

**Interfaces:**
- Consumes: `HouseholdActivityRepository.getFeed` (Task A2), `HouseholdMember` model, `HouseholdActivity` model.
- Produces:
  - DTO `ActivityEntryDto` (voir code).
  - `GET /api/households/:householdId/activities?limit&before` → `ApiResponse<{ entries: ActivityEntryDto[]; nextCursor: string | null }>`.
  - `GET /api/households/:householdId/activities/recent?limit` → `ApiResponse<{ entries: ActivityEntryDto[] }>`.

- [ ] **Step 1 : Créer le service feed**

Créer `backend/src/services/HouseholdActivityFeedService.ts` :

```ts
import { HouseholdActivityRepository } from '../repositories/HouseholdActivityRepository';
import { HouseholdActivity } from '../models/HouseholdActivity';
import { HouseholdMember } from '../models/HouseholdMember';
import { HouseholdActivityAction, HouseholdActivityTargetType } from '../types/enums';

export interface ActivityActorDto {
  id: string;
  name: string;
  isFormerMember: boolean;
}

export interface ActivityEntryDto {
  id: string;
  action: HouseholdActivityAction;
  targetType: HouseholdActivityTargetType | null;
  targetId: string | null;
  itemNameSnapshot: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: ActivityActorDto;
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export class HouseholdActivityFeedService {
  private repo: HouseholdActivityRepository;

  constructor(repo?: HouseholdActivityRepository) {
    this.repo = repo || new HouseholdActivityRepository();
  }

  async getFeed(
    householdId: string,
    opts: { limit?: number; before?: string } = {}
  ): Promise<{ entries: ActivityEntryDto[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(1, opts.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    const { rows, nextCursor } = await this.repo.getFeed(householdId, { limit, before: opts.before });

    const activeMemberIds = await this.activeMemberIds(householdId);
    const entries = rows.map((row) => this.toDto(row, activeMemberIds));

    return { entries, nextCursor };
  }

  async getRecent(householdId: string, limit = 5): Promise<{ entries: ActivityEntryDto[] }> {
    const { entries } = await this.getFeed(householdId, { limit });
    return { entries };
  }

  private async activeMemberIds(householdId: string): Promise<Set<string>> {
    const members = await HouseholdMember.findAll({
      where: { householdId, isActive: true },
      attributes: ['userId'],
      raw: true,
    });
    return new Set(members.map((m: any) => m.userId));
  }

  private toDto(row: HouseholdActivity, activeMemberIds: Set<string>): ActivityEntryDto {
    const firstName = row.user?.firstName?.trim();
    const lastName = row.user?.lastName?.trim();
    const name = [firstName, lastName].filter(Boolean).join(' ') || 'Membre';

    return {
      id: row.id,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      itemNameSnapshot: row.itemNameSnapshot,
      metadata: row.metadata,
      createdAt: new Date(row.createdAt).toISOString(),
      actor: {
        id: row.userId,
        name,
        isFormerMember: !activeMemberIds.has(row.userId),
      },
    };
  }
}
```

> Le flag d'appartenance active est `HouseholdMember.isActive` (vérifié).

- [ ] **Step 2 : Créer le controller**

Créer `backend/src/controllers/HouseholdActivityController.ts` (calqué sur `ItemSuggestionController`) :

```ts
import { Request, Response } from 'express';
import { HouseholdActivityFeedService } from '../services/HouseholdActivityFeedService';

export class HouseholdActivityController {
  private service: HouseholdActivityFeedService;

  constructor() {
    this.service = new HouseholdActivityFeedService();
  }

  async getFeed(req: Request, res: Response): Promise<void> {
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

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const before = (req.query.before as string) || undefined;

      const data = await this.service.getFeed(householdId, { limit, before });
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in activities getFeed:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async getRecent(req: Request, res: Response): Promise<void> {
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

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      const data = await this.service.getRecent(householdId, limit);
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in activities getRecent:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
```

- [ ] **Step 3 : Créer les routes**

Créer `backend/src/routes/householdActivities.ts` (calqué sur `stockExits.ts`) :

```ts
import { Router } from 'express';
import { HouseholdActivityController } from '../controllers/HouseholdActivityController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const controller = new HouseholdActivityController();

router.use(authenticateGoogleToken);

// GET /households/:householdId/activities/recent - 5 dernières (Dashboard)
router.get('/:householdId/activities/recent', controller.getRecent.bind(controller));

// GET /households/:householdId/activities - feed paginé keyset
router.get('/:householdId/activities', controller.getFeed.bind(controller));

export default router;
```

> L'ordre importe : `/activities/recent` avant `/activities` pour qu'Express ne matche pas `recent` comme paramètre.

- [ ] **Step 4 : Monter les routes dans index.ts**

Dans `backend/src/index.ts` :
- Après la ligne `import stockExitRoutes from './routes/stockExits';` (~ligne 9), ajouter :
  `import householdActivityRoutes from './routes/householdActivities';`
- Après `app.use('/api/households', stockExitRoutes);` (~ligne 84), ajouter :
  `app.use('/api/households', householdActivityRoutes);`

- [ ] **Step 5 : Compiler + smoke manuel**

Run: `cd backend && npx tsc --noEmit`
Expected: pas d'erreur.

Run: `cd backend && npm run dev` (dans un terminal), puis avec un token valide :
`curl -H "Authorization: Bearer <TOKEN>" "http://localhost:3000/api/households/<HH_ID>/activities?limit=5"`
Expected: `{"success":true,"data":{"entries":[...],"nextCursor":...}}`. Les entrées `item_added` de backfill apparaissent (auteur résolu, `isFormerMember` correct).

- [ ] **Step 6 : Commit**

```bash
git add backend/src/services/HouseholdActivityFeedService.ts backend/src/controllers/HouseholdActivityController.ts backend/src/routes/householdActivities.ts backend/src/index.ts
git commit -m "✨ #activités API feed : service + controller + routes (keyset paginé)"
```

---

## Phase B — Dual-write aux points d'action

> Chaque tâche enrichit/ajoute des appels `activityLogger.log(...)`. Le logger est best-effort : ne jamais faire échouer l'action métier. Vérification = compile + smoke (faire l'action, `GET /activities`, voir l'entrée).

### Task B1 : StoredItemService — enrichir `item_added`, logguer quantité & péremption

**Files:**
- Modify: `backend/src/services/StoredItemService.ts` (`createStoredItem` ~ligne 47-57 ; `updateStoredItem` ~ligne 151)

**Interfaces:**
- Consumes: `HouseholdActivityLogger.log`, `HouseholdActivityAction`, `HouseholdActivityTargetType`.

- [ ] **Step 1 : Enrichir le log d'ajout**

Dans `createStoredItem` (le `log` existant, ~ligne 51), remplacer par une version enrichie. Récupérer la zone de stockage si dispo via `storedItem.storageArea?.name` (le repo `create` renvoie-t-il l'include ? sinon passer `data.storageAreaId` et laisser `storageAreaName` absent). Version robuste :

```ts
    await this.activityLogger.log({
      householdId: data.householdId,
      userId: data.createdBy,
      itemId: resolvedItemId,
      itemNameSnapshot: null,
      action: HouseholdActivityAction.ITEM_ADDED,
      targetType: HouseholdActivityTargetType.ITEM,
      targetId: storedItem.id,
      metadata: {
        quantity: Number(data.quantity),
        unit: data.unit,
      },
    });
```

Ajouter l'import `HouseholdActivityTargetType` à l'import enums existant en tête de fichier.

- [ ] **Step 2 : Logguer les changements de quantité / péremption dans `updateStoredItem`**

Dans `updateStoredItem(id, householdId, data)`, après avoir obtenu l'item existant et appliqué l'update (juste avant le `return`), ajouter — en comparant ancien vs nouveau. Charger l'existant AVANT l'update pour la comparaison :

```ts
    // Snapshot avant mutation pour détecter les changements loggables.
    const before = await this.storedItemRepository.findById(id, householdId);
    // ... (update effectué) ...
    // Après update réussi, `updatedDto` disponible :
    if (before) {
      if (data.quantity !== undefined && Number(data.quantity) !== Number(before.quantity)) {
        await this.activityLogger.log({
          householdId,
          userId: before.createdBy,
          itemId: before.itemId,
          itemNameSnapshot: before.item?.name ?? null,
          action: HouseholdActivityAction.ITEM_QUANTITY_CHANGED,
          targetType: HouseholdActivityTargetType.ITEM,
          targetId: id,
          metadata: {
            oldQuantity: Number(before.quantity),
            newQuantity: Number(data.quantity),
            unit: before.unit,
          },
        });
      }
      const newExp = data.expirationDate ?? undefined;
      const oldExp = before.expirationDate
        ? new Date(before.expirationDate).toISOString().split('T')[0]
        : null;
      if (newExp !== undefined && String(newExp) !== String(oldExp)) {
        await this.activityLogger.log({
          householdId,
          userId: before.createdBy,
          itemId: before.itemId,
          itemNameSnapshot: before.item?.name ?? null,
          action: HouseholdActivityAction.ITEM_EXPIRATION_CHANGED,
          targetType: HouseholdActivityTargetType.ITEM,
          targetId: id,
          metadata: { oldDate: oldExp, newDate: newExp },
        });
      }
    }
```

> Adapter aux vrais noms de champs de `UpdateStoredItemDto` et au retour de `findById` (vérifier que `.item` est bien inclus ; sinon utiliser `before.itemId` et laisser `itemNameSnapshot: null`). L'`userId` de l'auteur du changement : si `updateStoredItem` reçoit un `userId`, l'utiliser à la place de `before.createdBy`. Vérifier la signature ; sinon, propager `userId` depuis le controller (voir Step 3).

- [ ] **Step 3 : (si nécessaire) propager `userId` de l'auteur**

Si `updateStoredItem` n'a pas accès à l'utilisateur courant, ajouter un paramètre `userId: string` à la méthode et le passer depuis `StoredItemController`. Utiliser ce `userId` dans les deux `log()` ci-dessus. Sinon, conserver `before.createdBy` (auteur d'origine) — acceptable mais moins précis ; préférer `userId` courant.

- [ ] **Step 4 : Compiler + smoke**

Run: `cd backend && npx tsc --noEmit` → pas d'erreur.
Smoke : ajouter un article → `item_added` dans le feed avec `metadata.quantity`. Modifier la quantité → `item_quantity_changed` ; la date → `item_expiration_changed`.

- [ ] **Step 5 : Commit**

```bash
git add backend/src/services/StoredItemService.ts
git commit -m "✨ #activités stock : enrichir item_added, logguer quantité & péremption"
```

---

### Task B2 : StockExitService — dual-write des sorties + suppression sur undo

**Files:**
- Modify: `backend/src/services/StockExitService.ts` (constructor, `exitStoredItem` ~ligne 107, `undoExit` ~ligne 166)

**Interfaces:**
- Consumes: `HouseholdActivityLogger`, `HouseholdActivityRepository.deleteRecentForTarget` (Task A2), `HouseholdActivityAction`, `HouseholdActivityTargetType`.

- [ ] **Step 1 : Injecter le logger + le repo dans le service**

En tête de `StockExitService.ts`, importer :

```ts
import { HouseholdActivityLogger } from './HouseholdActivityLogger';
import { HouseholdActivityRepository } from '../repositories/HouseholdActivityRepository';
import { HouseholdActivityAction, HouseholdActivityTargetType } from '../types/enums';
```

Ajouter les champs privés et les initialiser dans le constructor :

```ts
  private activityLogger: HouseholdActivityLogger;
  private activityRepo: HouseholdActivityRepository;
```
```ts
    this.activityLogger = new HouseholdActivityLogger();
    this.activityRepo = new HouseholdActivityRepository();
```

- [ ] **Step 2 : Mapping StockExitType → action + log après création**

Ajouter une constante en module (après les imports) :

```ts
const EXIT_TYPE_TO_ACTION: Record<StockExitType, HouseholdActivityAction> = {
  [StockExitType.CONSUMED]: HouseholdActivityAction.ITEM_CONSUMED,
  [StockExitType.WASTED]: HouseholdActivityAction.ITEM_THROWN,
  [StockExitType.REMOVED]: HouseholdActivityAction.ITEM_REMOVED,
};
```

Importer `StockExitType` est déjà fait. Dans `exitStoredItem`, juste après `const exit = await this.stockExitRepository.create(createData);` (~ligne 107) :

```ts
    await this.activityLogger.log({
      householdId,
      userId,
      itemId: storedItem.itemId,
      itemNameSnapshot: storedItem.item?.name ?? null,
      action: EXIT_TYPE_TO_ACTION[exitType],
      targetType: HouseholdActivityTargetType.ITEM,
      targetId: storedItem.id,
      metadata: {
        quantity: exitQty,
        unit: storedItem.unit,
        storageAreaName: storedItem.storageArea?.name ?? null,
      },
    });
```

- [ ] **Step 3 : Supprimer l'entrée sur undo**

Dans `undoExit`, juste après `await this.stockExitRepository.delete(exitId, householdId);` (~ligne 166) et avant le `return` :

```ts
    // L'undo (fenêtre 10s) doit effacer l'entrée d'activité correspondante :
    // le feed reflète l'état final. Best-effort.
    if (exit.storedItemId) {
      try {
        await this.activityRepo.deleteRecentForTarget(householdId, exit.storedItemId, [
          HouseholdActivityAction.ITEM_CONSUMED,
          HouseholdActivityAction.ITEM_THROWN,
          HouseholdActivityAction.ITEM_REMOVED,
        ]);
      } catch (e) {
        console.error('[StockExitService] failed to delete activity on undo', e);
      }
    }
```

- [ ] **Step 4 : Compiler + smoke**

Run: `cd backend && npx tsc --noEmit` → pas d'erreur.
Smoke : consommer/jeter/retirer un article → entrée `item_consumed/thrown/removed` avec `metadata.quantity/unit`. Annuler dans les 10s → l'entrée disparaît du feed.

- [ ] **Step 5 : Commit**

```bash
git add backend/src/services/StockExitService.ts
git commit -m "✨ #activités sorties de stock : dual-write activité + suppression sur undo"
```

---

### Task B3 : ShoppingItemService — enrichir added/checked, logguer removed

**Files:**
- Modify: `backend/src/services/ShoppingItemService.ts` (`createShoppingItem` ~106, `setShoppingItemStatus` ~366, `deleteShoppingItem` ~266)

**Interfaces:**
- Consumes: `HouseholdActivityLogger.log` (déjà présent dans ce service), `HouseholdActivityAction`, `HouseholdActivityTargetType`.

- [ ] **Step 1 : Ajouter targetType/targetId aux logs existants**

Ajouter l'import `HouseholdActivityTargetType` à l'import enums en tête.

Dans le `log` de `createShoppingItem` (~ligne 106), ajouter les champs :

```ts
        targetType: HouseholdActivityTargetType.SHOPPING_ITEM,
        targetId: shoppingItem.id,
```

Dans le `log` de `setShoppingItemStatus` pour `SHOPPING_CHECKED` (~ligne 366), ajouter :

```ts
          targetType: HouseholdActivityTargetType.SHOPPING_ITEM,
          targetId: id,
```

> Ne logger `SHOPPING_CHECKED` que lors du passage effectif à l'état "acheté" (`TO_STORE`), pas à chaque appel. Vérifier la condition existante autour de la ligne 366 ; si le log est inconditionnel, l'entourer d'un `if (status === ShoppingItemStatus.TO_STORE)`.

- [ ] **Step 2 : Logguer la suppression**

`deleteShoppingItem(id)` n'a aujourd'hui ni householdId ni userId ni le nom d'article en contexte direct. Charger l'item avant suppression pour construire le log. Au début de `deleteShoppingItem`, avant `this.shoppingItemRepository.delete(id)` :

```ts
    const existing = await this.shoppingItemRepository.findById(id);
```

Après la suppression réussie (dans le bloc succès), ajouter :

```ts
      if (existing) {
        await this.activityLogger.log({
          householdId: existing.householdId,
          userId: existing.createdBy,
          itemId: existing.itemId,
          itemNameSnapshot: existing.item?.name ?? null,
          action: HouseholdActivityAction.SHOPPING_REMOVED,
          targetType: HouseholdActivityTargetType.SHOPPING_ITEM,
          targetId: id,
          metadata: null,
        });
      }
```

> Vérifier le nom de la méthode repo (`findById`) et que `existing.item?.name` est chargé (include). Sinon, laisser `itemNameSnapshot: null`. ATTENTION : `deleteShoppingItem` est aussi appelé en interne pour dédupliquer (ex. lignes ~238, ~349, ~455). Une suppression de doublon interne ne doit PAS produire d'entrée `shopping_removed`. Ajouter un paramètre optionnel `opts?: { silent?: boolean }` à `deleteShoppingItem` et le passer `true` aux appels internes de déduplication ; ne logger que si `!opts?.silent`.

- [ ] **Step 3 : Compiler + smoke**

Run: `cd backend && npx tsc --noEmit` → pas d'erreur.
Smoke : ajouter à la liste → `shopping_added` ; marquer acheté → `shopping_checked` ; supprimer une ligne → `shopping_removed`. Ajouter un doublon (qui déclenche une déduplication interne) → PAS de `shopping_removed` parasite.

- [ ] **Step 4 : Commit**

```bash
git add backend/src/services/ShoppingItemService.ts
git commit -m "✨ #activités courses : enrichir added/checked, logguer removed (silencieux sur dédup)"
```

---

### Task B4 : MealService — planned / servings changed / cooked / unplanned

**Files:**
- Modify: `backend/src/services/MealService.ts` (constructor, `createMeal` ~61, `updateMeal` ~94, `deleteMeal` ~112, `markMealCooked` ~125)

**Interfaces:**
- Consumes: `HouseholdActivityLogger`, `HouseholdActivityAction`, `HouseholdActivityTargetType`. La déduction d'ingrédients (nombre) est disponible via le flux de cuisson — voir Step 4.

- [ ] **Step 1 : Injecter le logger**

En tête de `MealService.ts`, importer :

```ts
import { HouseholdActivityLogger } from './HouseholdActivityLogger';
import { HouseholdActivityAction, HouseholdActivityTargetType } from '../types/enums';
```

Ajouter le champ privé `private activityLogger: HouseholdActivityLogger;` et l'initialiser dans le constructor : `this.activityLogger = new HouseholdActivityLogger();`.

> `createMeal`/`markMealCooked` n'ont pas de `userId` en paramètre aujourd'hui. Ajouter `userId: string` à la signature de `createMeal`, `updateMeal`, `deleteMeal`, `markMealCooked` et le propager depuis `MealController` (lire `(req as any).user.id`). Vérifier chaque appel dans `MealController.ts` et l'ajouter.

- [ ] **Step 2 : `recipe_planned` dans `createMeal`**

Le `recipe` est déjà chargé (~ligne 64). À la fin de `createMeal`, avant chaque `return`, logguer (couvrir les deux chemins : update idempotent d'un meal actif existant ET création). Pour rester DRY, logguer juste avant le `return` final et le `return` du bloc `existingActive` avec la même donnée :

```ts
    await this.activityLogger.log({
      householdId,
      userId,
      itemId: null,
      itemNameSnapshot: null,
      action: HouseholdActivityAction.RECIPE_PLANNED,
      targetType: HouseholdActivityTargetType.RECIPE,
      targetId: data.recipeId,
      metadata: { recipeName: recipe.name, servings },
    });
```

- [ ] **Step 3 : `recipe_servings_changed` dans `updateMeal`**

Dans `updateMeal`, après `const updated = await this.mealRepository.updateServings(...)` réussi, en comparant à l'ancien `meal.servings` :

```ts
    if (Number(meal.servings) !== Number(data.servings)) {
      await this.activityLogger.log({
        householdId,
        userId,
        itemId: null,
        itemNameSnapshot: null,
        action: HouseholdActivityAction.RECIPE_SERVINGS_CHANGED,
        targetType: HouseholdActivityTargetType.MEAL,
        targetId: id,
        metadata: {
          recipeName: meal.recipe?.name ?? null,
          oldServings: Number(meal.servings),
          newServings: Number(data.servings),
        },
      });
    }
```

> Vérifier que `meal.recipe` est inclus par `mealRepository.findById(id, false)`. Sinon charger le nom ou laisser `null`.

- [ ] **Step 4 : `recipe_cooked` dans `markMealCooked`**

Dans `markMealCooked`, après `const updated = await this.mealRepository.markCooked(...)`. Le nombre d'ingrédients déduits : `markMealCooked` ne déduit pas lui-même le stock ici (la déduction passe par `commitShopping`/`ConsumeIngredients`). Pour V1, logguer sans compter, ou compter les ingrédients de la recette :

```ts
    const ingredientCount = updated.recipe?.ingredients?.length ?? 0;
    await this.activityLogger.log({
      householdId,
      userId,
      itemId: null,
      itemNameSnapshot: null,
      action: HouseholdActivityAction.RECIPE_COOKED,
      targetType: HouseholdActivityTargetType.MEAL,
      targetId: id,
      metadata: {
        recipeName: updated.recipe?.name ?? null,
        deductedIngredientCount: ingredientCount,
      },
    });
```

> Si `updated.recipe.ingredients` n'est pas inclus, mettre `deductedIngredientCount: 0` ou charger la recette. Le libellé front dégradera gracieusement (voir Task C2).

- [ ] **Step 5 : `recipe_unplanned` dans `deleteMeal`**

Dans `deleteMeal`, avant `await this.mealRepository.deleteAndRepack(...)` (l'objet `meal` est chargé) :

```ts
    await this.activityLogger.log({
      householdId,
      userId,
      itemId: null,
      itemNameSnapshot: null,
      action: HouseholdActivityAction.RECIPE_UNPLANNED,
      targetType: HouseholdActivityTargetType.MEAL,
      targetId: id,
      metadata: { recipeName: meal.recipe?.name ?? null },
    });
```

- [ ] **Step 6 : Compiler + smoke**

Run: `cd backend && npx tsc --noEmit` → pas d'erreur.
Smoke : ajouter une recette au plan → `recipe_planned` ; changer les portions → `recipe_servings_changed` ; cuisiner → `recipe_cooked` ; retirer → `recipe_unplanned`.

- [ ] **Step 7 : Commit**

```bash
git add backend/src/services/MealService.ts backend/src/controllers/MealController.ts
git commit -m "✨ #activités meal plan : planned / servings changed / cooked / unplanned"
```

---

## Phase C — Frontend

### Task C1 : Service + store d'activité

**Files:**
- Create: `frontend/src/services/activityService.ts`
- Create: `frontend/src/stores/activityStore.ts`

**Interfaces:**
- Produces:
  - Types `ActivityEntry`, `ActivityAction` (réutiliser l'enum de `@/types/enums`), `ActivityFeedResponse`.
  - `activityService.getFeed({ householdId, limit?, before? })`, `activityService.getRecent(householdId, limit?)`.
  - `useActivityStore` avec `recent`, `feed`, `nextCursor`, `hasMore`, `loading`, `loadRecent(hh)`, `loadFeed(hh, reset)`, `loadMore(hh)`.

- [ ] **Step 1 : Créer le service**

Créer `frontend/src/services/activityService.ts` :

```ts
import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { HouseholdActivityAction, HouseholdActivityTargetType } from '@/types/enums';

// Les services front définissent ApiResponse en local (cf. stockExitService.ts),
// pas d'import partagé.
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ActivityActor {
  id: string;
  name: string;
  isFormerMember: boolean;
}

export interface ActivityEntry {
  id: string;
  action: HouseholdActivityAction;
  targetType: HouseholdActivityTargetType | null;
  targetId: string | null;
  itemNameSnapshot: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: ActivityActor;
}

export interface ActivityFeedResponse {
  entries: ActivityEntry[];
  nextCursor: string | null;
}

const createApiService = () => {
  const makeApiCall = async (
    url: string,
    options: { method?: 'GET' | 'POST'; body?: any } = {}
  ) => {
    const response = await makeAuthenticatedApiCall(url, options, { showToast: false });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response;
  };
  return {
    get: (url: string) => makeApiCall(url, { method: 'GET' }),
  };
};

const apiService = createApiService();

const getFeed = async (params: {
  householdId: string;
  limit?: number;
  before?: string;
}): Promise<ActivityFeedResponse> => {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.before) qs.set('before', params.before);
  const response = await apiService.get(
    `/api/households/${params.householdId}/activities?${qs.toString()}`
  );
  const result: ApiResponse<ActivityFeedResponse> = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to load activities');
  return result.data!;
};

const getRecent = async (householdId: string, limit = 5): Promise<ActivityEntry[]> => {
  const response = await apiService.get(
    `/api/households/${householdId}/activities/recent?limit=${limit}`
  );
  const result: ApiResponse<{ entries: ActivityEntry[] }> = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to load recent activities');
  return result.data!.entries;
};

export const activityService = { getFeed, getRecent };
```

- [ ] **Step 2 : Créer le store**

Créer `frontend/src/stores/activityStore.ts` :

```ts
import { create } from 'zustand';
import { activityService, type ActivityEntry } from '@/services/activityService';

interface ActivityState {
  recent: ActivityEntry[];
  feed: ActivityEntry[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  loadRecent: (householdId: string) => Promise<void>;
  loadFeed: (householdId: string) => Promise<void>;
  loadMore: (householdId: string) => Promise<void>;
  reset: () => void;
}

const PAGE = 30;

export const useActivityStore = create<ActivityState>((set, get) => ({
  recent: [],
  feed: [],
  nextCursor: null,
  hasMore: false,
  loading: false,
  loadingMore: false,

  loadRecent: async (householdId) => {
    try {
      const entries = await activityService.getRecent(householdId, 5);
      set({ recent: entries });
    } catch (e) {
      console.error('loadRecent failed', e);
    }
  },

  loadFeed: async (householdId) => {
    set({ loading: true });
    try {
      const { entries, nextCursor } = await activityService.getFeed({ householdId, limit: PAGE });
      set({ feed: entries, nextCursor, hasMore: !!nextCursor, loading: false });
    } catch (e) {
      console.error('loadFeed failed', e);
      set({ loading: false });
    }
  },

  loadMore: async (householdId) => {
    const { nextCursor, loadingMore, feed } = get();
    if (!nextCursor || loadingMore) return;
    set({ loadingMore: true });
    try {
      const res = await activityService.getFeed({ householdId, limit: PAGE, before: nextCursor });
      set({
        feed: [...feed, ...res.entries],
        nextCursor: res.nextCursor,
        hasMore: !!res.nextCursor,
        loadingMore: false,
      });
    } catch (e) {
      console.error('loadMore failed', e);
      set({ loadingMore: false });
    }
  },

  reset: () => set({ feed: [], recent: [], nextCursor: null, hasMore: false }),
}));
```

- [ ] **Step 3 : Compiler**

Run: `cd frontend && npx tsc --noEmit` → pas d'erreur.

- [ ] **Step 4 : Commit**

```bash
git add frontend/src/services/activityService.ts frontend/src/stores/activityStore.ts
git commit -m "✨ #activités front : service + store"
```

---

### Task C2 : Fonction de libellé + clés i18n (en/es/fr)

**Files:**
- Create: `frontend/src/components/activity/activityLabel.ts`
- Modify: `frontend/src/i18n/locales/fr.json`, `en.json`, `es.json`

**Interfaces:**
- Consumes: `ActivityEntry`, `HouseholdActivityAction`.
- Produces: `buildActivityLabel(entry, t): { text: string; icon: LucideIcon; tone: string }` — texte i18n interpolé, prêt à afficher. L'emphase se fait côté composant (Task C3) en passant l'objet nom séparément ; ici on renvoie aussi `parts` (voir signature).

- [ ] **Step 1 : Écrire la fonction de libellé**

Créer `frontend/src/components/activity/activityLabel.ts` :

```ts
import type { TFunction } from 'i18next';
import {
  Plus,
  Minus,
  Trash2,
  PackageMinus,
  Pencil,
  CalendarClock,
  ShoppingCart,
  Check,
  X,
  CalendarPlus,
  Utensils,
  CalendarX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HouseholdActivityAction } from '@/types/enums';
import type { ActivityEntry } from '@/services/activityService';

export interface ActivityLabel {
  text: string; // libellé complet interpolé (i18n)
  target: string; // l'élément clé à mettre en emphase
  icon: LucideIcon;
  tone: string; // classe de teinte Fresh (ex. 'text-mf-green')
}

const META: Record<HouseholdActivityAction, { icon: LucideIcon; tone: string }> = {
  [HouseholdActivityAction.ITEM_ADDED]: { icon: Plus, tone: 'text-mf-green' },
  [HouseholdActivityAction.ITEM_QUANTITY_CHANGED]: { icon: Pencil, tone: 'text-mf-text-mute' },
  [HouseholdActivityAction.ITEM_EXPIRATION_CHANGED]: { icon: CalendarClock, tone: 'text-mf-text-mute' },
  [HouseholdActivityAction.ITEM_CONSUMED]: { icon: Minus, tone: 'text-mf-green' },
  [HouseholdActivityAction.ITEM_THROWN]: { icon: Trash2, tone: 'text-mf-danger' },
  [HouseholdActivityAction.ITEM_REMOVED]: { icon: PackageMinus, tone: 'text-mf-text-mute' },
  [HouseholdActivityAction.SHOPPING_ADDED]: { icon: ShoppingCart, tone: 'text-mf-green' },
  [HouseholdActivityAction.SHOPPING_CHECKED]: { icon: Check, tone: 'text-mf-green' },
  [HouseholdActivityAction.SHOPPING_REMOVED]: { icon: X, tone: 'text-mf-text-mute' },
  [HouseholdActivityAction.RECIPE_PLANNED]: { icon: CalendarPlus, tone: 'text-mf-green' },
  [HouseholdActivityAction.RECIPE_SERVINGS_CHANGED]: { icon: Pencil, tone: 'text-mf-text-mute' },
  [HouseholdActivityAction.RECIPE_COOKED]: { icon: Utensils, tone: 'text-mf-green' },
  [HouseholdActivityAction.RECIPE_UNPLANNED]: { icon: CalendarX, tone: 'text-mf-text-mute' },
};

function md<T = unknown>(entry: ActivityEntry, key: string): T | undefined {
  return entry.metadata ? (entry.metadata[key] as T) : undefined;
}

export function buildActivityLabel(entry: ActivityEntry, t: TFunction): ActivityLabel {
  const meta = META[entry.action];
  const a = entry.action;
  const M = HouseholdActivityAction;

  let target = '';
  let text = '';

  if (a === M.ITEM_ADDED || a === M.ITEM_CONSUMED || a === M.ITEM_THROWN || a === M.ITEM_REMOVED ||
      a === M.ITEM_QUANTITY_CHANGED || a === M.ITEM_EXPIRATION_CHANGED) {
    target = entry.itemNameSnapshot || t('activity.unknownItem');
    text = t(`activity.labels.${a}`, {
      target,
      quantity: md<number>(entry, 'quantity') ?? '',
      unit: md<string>(entry, 'unit') ?? '',
      storageArea: md<string>(entry, 'storageAreaName') ?? '',
    });
  } else if (a === M.SHOPPING_ADDED || a === M.SHOPPING_CHECKED || a === M.SHOPPING_REMOVED) {
    target = entry.itemNameSnapshot || t('activity.unknownItem');
    text = t(`activity.labels.${a}`, { target });
  } else {
    // recipe_*
    target = (md<string>(entry, 'recipeName')) || t('activity.unknownRecipe');
    text = t(`activity.labels.${a}`, {
      target,
      servings: md<number>(entry, 'servings') ?? '',
      oldServings: md<number>(entry, 'oldServings') ?? '',
      newServings: md<number>(entry, 'newServings') ?? '',
      count: md<number>(entry, 'deductedIngredientCount') ?? 0,
    });
  }

  return { text, target, icon: meta.icon, tone: meta.tone };
}
```

> Adapter les tons `mf-*` aux vrais tokens de la charte (vérifier `frontend/src/lib/tokenMaps.ts` / `docs/charte-graphique.html`). Si `text-mf-danger`/`text-mf-green` n'existent pas, utiliser les équivalents réels.

- [ ] **Step 2 : Ajouter les clés i18n françaises**

Dans `frontend/src/i18n/locales/fr.json`, ajouter un bloc `activity` (fusionner avec la structure existante) :

```json
"activity": {
  "title": "Activité du foyer",
  "recentTitle": "Activité récente",
  "seeAll": "Voir tout",
  "loadMore": "Charger plus",
  "empty": "Aucune activité pour le moment",
  "formerMember": "(ancien membre)",
  "you": "Vous",
  "unknownItem": "un article",
  "unknownRecipe": "une recette",
  "today": "Aujourd'hui",
  "yesterday": "Hier",
  "relativeMinutes": "il y a {{count}} min",
  "justNow": "à l'instant",
  "labels": {
    "item_added": "a ajouté {{target}} au stock",
    "item_quantity_changed": "a modifié la quantité de {{target}}",
    "item_expiration_changed": "a modifié la date de péremption de {{target}}",
    "item_consumed": "a consommé {{target}}",
    "item_thrown": "a jeté {{target}}",
    "item_removed": "a retiré {{target}} du stock",
    "shopping_added": "a ajouté {{target}} à la liste de courses",
    "shopping_checked": "a acheté {{target}}",
    "shopping_removed": "a retiré {{target}} de la liste de courses",
    "recipe_planned": "a planifié {{target}}",
    "recipe_servings_changed": "a modifié les portions de {{target}}",
    "recipe_cooked": "a cuisiné {{target}}",
    "recipe_unplanned": "a retiré {{target}} du meal plan"
  }
}
```

- [ ] **Step 3 : Ajouter les clés anglaises (en.json)**

Même structure, en anglais :

```json
"activity": {
  "title": "Household activity",
  "recentTitle": "Recent activity",
  "seeAll": "See all",
  "loadMore": "Load more",
  "empty": "No activity yet",
  "formerMember": "(former member)",
  "you": "You",
  "unknownItem": "an item",
  "unknownRecipe": "a recipe",
  "today": "Today",
  "yesterday": "Yesterday",
  "relativeMinutes": "{{count}} min ago",
  "justNow": "just now",
  "labels": {
    "item_added": "added {{target}} to the stock",
    "item_quantity_changed": "changed the quantity of {{target}}",
    "item_expiration_changed": "changed the expiration date of {{target}}",
    "item_consumed": "consumed {{target}}",
    "item_thrown": "threw away {{target}}",
    "item_removed": "removed {{target}} from the stock",
    "shopping_added": "added {{target}} to the shopping list",
    "shopping_checked": "bought {{target}}",
    "shopping_removed": "removed {{target}} from the shopping list",
    "recipe_planned": "planned {{target}}",
    "recipe_servings_changed": "changed the servings of {{target}}",
    "recipe_cooked": "cooked {{target}}",
    "recipe_unplanned": "removed {{target}} from the meal plan"
  }
}
```

- [ ] **Step 4 : Ajouter les clés espagnoles (es.json)**

```json
"activity": {
  "title": "Actividad del hogar",
  "recentTitle": "Actividad reciente",
  "seeAll": "Ver todo",
  "loadMore": "Cargar más",
  "empty": "Aún no hay actividad",
  "formerMember": "(ex miembro)",
  "you": "Tú",
  "unknownItem": "un artículo",
  "unknownRecipe": "una receta",
  "today": "Hoy",
  "yesterday": "Ayer",
  "relativeMinutes": "hace {{count}} min",
  "justNow": "ahora mismo",
  "labels": {
    "item_added": "añadió {{target}} al stock",
    "item_quantity_changed": "cambió la cantidad de {{target}}",
    "item_expiration_changed": "cambió la fecha de caducidad de {{target}}",
    "item_consumed": "consumió {{target}}",
    "item_thrown": "tiró {{target}}",
    "item_removed": "quitó {{target}} del stock",
    "shopping_added": "añadió {{target}} a la lista de la compra",
    "shopping_checked": "compró {{target}}",
    "shopping_removed": "quitó {{target}} de la lista de la compra",
    "recipe_planned": "planificó {{target}}",
    "recipe_servings_changed": "cambió las porciones de {{target}}",
    "recipe_cooked": "cocinó {{target}}",
    "recipe_unplanned": "quitó {{target}} del plan de comidas"
  }
}
```

- [ ] **Step 5 : Compiler + valider le JSON**

Run: `cd frontend && npx tsc --noEmit` → pas d'erreur.
Run: `cd frontend && node -e "['en','es','fr'].forEach(l=>JSON.parse(require('fs').readFileSync('src/i18n/locales/'+l+'.json','utf8')))"` → aucune erreur (JSON valides).

- [ ] **Step 6 : Commit**

```bash
git add frontend/src/components/activity/activityLabel.ts frontend/src/i18n/locales/
git commit -m "✨ #activités front : libellés riches + i18n en/es/fr"
```

---

### Task C3 : Composants `ActivityEntry` + `ActivityDayGroup`

**Files:**
- Create: `frontend/src/components/activity/ActivityEntry.tsx`
- Create: `frontend/src/components/activity/ActivityDayGroup.tsx`
- Create: `frontend/src/components/activity/activityTime.ts` (helpers de groupement/format)

**Interfaces:**
- Consumes: `ActivityEntry`, `buildActivityLabel` (C2).
- Produces:
  - `groupByDay(entries): { key: string; label: string; entries: ActivityEntry[] }[]` (dans `activityTime.ts`).
  - `formatEntryTime(createdAt, t): string` (relatif < 1h, sinon HH:mm).
  - `<ActivityEntry entry currentUserId />`, `<ActivityDayGroup label entries currentUserId />`.

- [ ] **Step 1 : Helpers temps/groupement**

Créer `frontend/src/components/activity/activityTime.ts` :

```ts
import type { TFunction } from 'i18next';
import type { ActivityEntry } from '@/services/activityService';

export function formatEntryTime(createdAt: string, t: TFunction): string {
  const d = new Date(createdAt);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('activity.justNow');
  if (diffMin < 60) return t('activity.relativeMinutes', { count: diffMin });
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export interface DayGroup {
  key: string;
  label: string;
  entries: ActivityEntry[];
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function groupByDay(entries: ActivityEntry[], t: TFunction): DayGroup[] {
  const now = new Date();
  const todayKey = dayKey(now);
  const yKey = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  const groups: DayGroup[] = [];
  const index = new Map<string, DayGroup>();

  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    const key = dayKey(d);
    let g = index.get(key);
    if (!g) {
      let label: string;
      if (key === todayKey) label = t('activity.today');
      else if (key === yKey) label = t('activity.yesterday');
      else label = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
      g = { key, label, entries: [] };
      index.set(key, g);
      groups.push(g);
    }
    g.entries.push(entry);
  }
  return groups; // entrées déjà triées desc par l'API
}
```

- [ ] **Step 2 : Composant `ActivityEntry`**

Créer `frontend/src/components/activity/ActivityEntry.tsx` :

```tsx
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ActivityEntry as ActivityEntryModel } from '@/services/activityService';
import { buildActivityLabel } from './activityLabel';
import { formatEntryTime } from './activityTime';

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join('').toUpperCase();
}

interface Props {
  entry: ActivityEntryModel;
  currentUserId?: string;
}

export function ActivityEntry({ entry, currentUserId }: Props) {
  const { t } = useTranslation();
  const label = buildActivityLabel(entry, t);
  const Icon = label.icon;

  const isCurrentUser = !!currentUserId && entry.actor.id === currentUserId;
  const firstName = entry.actor.name.trim().split(/\s+/)[0];
  const displayName = isCurrentUser ? t('activity.you') : firstName;
  const suffix = entry.actor.isFormerMember ? ` ${t('activity.formerMember')}` : '';

  return (
    <div className="flex items-start gap-3 py-2.5">
      {/* Heure */}
      <span className="w-16 shrink-0 pt-0.5 text-[11.5px] font-semibold text-mf-text-mute tabular-nums">
        {formatEntryTime(entry.createdAt, t)}
      </span>

      {/* Avatar initiales */}
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mf-text text-[10px] font-bold uppercase leading-none text-mf-night dark:bg-mf-night dark:text-mf-text"
        aria-hidden
      >
        {initialsOf(entry.actor.name)}
      </span>

      {/* Contenu */}
      <div className="min-w-0 flex-1 text-sm text-mf-text-soft">
        <Icon className={cn('mr-1 inline h-4 w-4 -translate-y-px', label.tone)} aria-hidden />
        <span className="font-display font-bold text-mf-text">
          {displayName}
          {suffix}
        </span>{' '}
        {/* le libellé contient déjà le verbe + le target ; on met le target en gras */}
        {renderWithEmphasis(label.text, label.target)}
      </div>
    </div>
  );
}

function renderWithEmphasis(text: string, target: string) {
  if (!target || !text.includes(target)) return <span>{text}</span>;
  const [before, after] = text.split(target);
  return (
    <span>
      {before}
      <span className="font-semibold text-mf-text">{target}</span>
      {after}
    </span>
  );
}
```

- [ ] **Step 3 : Composant `ActivityDayGroup`**

Créer `frontend/src/components/activity/ActivityDayGroup.tsx` :

```tsx
import type { ActivityEntry as ActivityEntryModel } from '@/services/activityService';
import { ActivityEntry } from './ActivityEntry';

interface Props {
  label: string;
  entries: ActivityEntryModel[];
  currentUserId?: string;
}

export function ActivityDayGroup({ label, entries, currentUserId }: Props) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-display text-sm font-extrabold uppercase tracking-wide text-mf-text-mute">
        {label}
      </h2>
      <div className="divide-y divide-mf-night-border">
        {entries.map((entry) => (
          <ActivityEntry key={entry.id} entry={entry} currentUserId={currentUserId} />
        ))}
      </div>
    </section>
  );
}
```

> Vérifier le token de bordure réel (`divide-mf-night-border` ou équivalent) dans les composants existants ; sinon utiliser `divide-border`.

- [ ] **Step 4 : Compiler**

Run: `cd frontend && npx tsc --noEmit` → pas d'erreur.

- [ ] **Step 5 : Commit**

```bash
git add frontend/src/components/activity/
git commit -m "✨ #activités front : composants ActivityEntry + ActivityDayGroup + helpers temps"
```

---

### Task C4 : Page dédiée `/activity` + route

**Files:**
- Create: `frontend/src/pages/Activity.tsx`
- Modify: `frontend/src/App.tsx` (route)

**Interfaces:**
- Consumes: `useActivityStore` (C1), `groupByDay` (C3), `ActivityDayGroup` (C3).

- [ ] **Step 1 : Créer la page**

Créer `frontend/src/pages/Activity.tsx` :

```tsx
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity as ActivityIcon } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { useActivityStore } from '@/stores/activityStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { useAuthStore } from '@/stores/authStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { ActivityDayGroup } from '@/components/activity/ActivityDayGroup';
import { groupByDay } from '@/components/activity/activityTime';

const Activity = () => {
  const { t } = useTranslation();
  useProtectedRoute();

  const selectedHouseholdId = useHouseholdStore((s) => s.selectedHouseholdId);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { feed, loading, loadingMore, hasMore, loadFeed, loadMore } = useActivityStore();

  useEffect(() => {
    if (selectedHouseholdId) loadFeed(selectedHouseholdId);
  }, [selectedHouseholdId, loadFeed]);

  const groups = useMemo(() => groupByDay(feed, t), [feed, t]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="container mx-auto flex items-center gap-2 px-4 py-4">
          <ActivityIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <h1 className="font-display text-xl font-bold text-foreground">{t('activity.title')}</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-6">
        {loading && feed.length === 0 ? (
          <p className="py-10 text-center text-sm text-mf-text-mute">…</p>
        ) : feed.length === 0 ? (
          <p className="py-10 text-center text-sm text-mf-text-mute">{t('activity.empty')}</p>
        ) : (
          <>
            {groups.map((g) => (
              <ActivityDayGroup
                key={g.key}
                label={g.label}
                entries={g.entries}
                currentUserId={currentUserId}
              />
            ))}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  disabled={loadingMore}
                  onClick={() => selectedHouseholdId && loadMore(selectedHouseholdId)}
                >
                  {t('activity.loadMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Activity;
```

> Vérifier les vrais sélecteurs de store : `useHouseholdStore` expose-t-il `selectedHouseholdId` ? `useAuthStore` expose-t-il `user?.id` ? S'aligner sur `Dashboard.tsx` (qui les utilise déjà) pour les noms exacts.

- [ ] **Step 2 : Ajouter la route dans App.tsx**

Dans `frontend/src/App.tsx`, ajouter l'import lazy/direct de `Activity` à côté des autres pages, puis dans `<Routes>` une entrée :

```tsx
<Route path="/activity" element={<Activity />} />
```

Suivre le style d'import/déclaration des routes voisines (lazy vs direct).

- [ ] **Step 3 : Compiler + smoke UI**

Run: `cd frontend && npx tsc --noEmit` → pas d'erreur.
Run: `cd frontend && npm run dev`, naviguer vers `/activity` : timeline groupée par jour, en-têtes « Aujourd'hui/Hier/date », heure (relatif < 1h), avatar initiales, bouton « Charger plus » si >30 entrées.

- [ ] **Step 4 : Commit**

```bash
git add frontend/src/pages/Activity.tsx frontend/src/App.tsx
git commit -m "✨ #activités front : page dédiée /activity (timeline groupée par jour + charger plus)"
```

---

### Task C5 : Section Dashboard « Activité récente »

**Files:**
- Create: `frontend/src/components/RecentActivityCard.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx` (insérer la carte)

**Interfaces:**
- Consumes: `useActivityStore.loadRecent/recent` (C1), `buildActivityLabel` (C2), `formatEntryTime` (C3).

- [ ] **Step 1 : Créer la carte**

Créer `frontend/src/components/RecentActivityCard.tsx` :

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity as ActivityIcon, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useActivityStore } from '@/stores/activityStore';
import { useAuthStore } from '@/stores/authStore';
import { ActivityEntry } from '@/components/activity/ActivityEntry';

interface Props {
  householdId: string;
}

export function RecentActivityCard({ householdId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recent = useActivityStore((s) => s.recent);
  const loadRecent = useActivityStore((s) => s.loadRecent);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (householdId) loadRecent(householdId);
  }, [householdId, loadRecent]);

  // Section masquée entièrement si aucune activité (spec : pas d'état vide).
  if (recent.length === 0) return null;

  return (
    <Card className="border-0 bg-mf-night-surface shadow-none">
      <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 font-display text-mf-text">
          <ActivityIcon className="h-5 w-5 text-primary" aria-hidden />
          {t('activity.recentTitle')}
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate('/activity')}>
          {t('activity.seeAll')}
          <ChevronRight className="ml-0.5 h-4 w-4" aria-hidden />
        </Button>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="divide-y divide-mf-night-border">
          {recent.map((entry) => (
            <ActivityEntry key={entry.id} entry={entry} currentUserId={currentUserId} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

> Aligner les classes `Card`/tokens sur la carte voisine du Dashboard (`<Card className="border-0 bg-mf-night-surface shadow-none">` existe déjà ~ligne 251).

- [ ] **Step 2 : Insérer dans le Dashboard**

Dans `frontend/src/pages/Dashboard.tsx` :
- Importer : `import { RecentActivityCard } from '@/components/RecentActivityCard';`
- Insérer `<RecentActivityCard householdId={selectedHouseholdId} />` dans le flux principal, à côté de `<ExpiringSoonCard .../>` / `<LowStockCard />` (~lignes 245-248). Vérifier le nom exact de la variable d'ID de foyer utilisée là (`selectedHouseholdId`).

- [ ] **Step 3 : Compiler + smoke UI**

Run: `cd frontend && npx tsc --noEmit` → pas d'erreur.
Smoke : Dashboard affiche « Activité récente » avec ≤5 lignes + « Voir tout » → `/activity`. Sur un foyer sans activité, la section est absente.

- [ ] **Step 4 : Commit**

```bash
git add frontend/src/components/RecentActivityCard.tsx frontend/src/pages/Dashboard.tsx
git commit -m "✨ #activités front : section Dashboard « Activité récente » (masquée si vide)"
```

---

### Task C6 : Entrées de navigation (sidebar desktop + More mobile)

**Files:**
- Modify: `frontend/src/config/desktopNavigation.ts`
- Modify: `frontend/src/config/moreNavigation.ts`
- Modify: `frontend/src/i18n/locales/{en,es,fr}.json` (clé `navigation.activity`)

**Interfaces:**
- Consumes: route `/activity` (C4), clés i18n (C2).

- [ ] **Step 1 : Sidebar desktop**

Dans `frontend/src/config/desktopNavigation.ts`, importer `Activity` de `lucide-react` et ajouter une entrée à `DESKTOP_NAV_ITEMS` (après `dashboard` ou en fin selon la logique de groupement) :

```ts
  {
    id: 'activity',
    labelKey: 'navigation.activity',
    icon: Activity,
    to: '/activity',
  },
```

- [ ] **Step 2 : More mobile**

Dans `frontend/src/config/moreNavigation.ts`, importer `Activity` de `lucide-react` et ajouter une feature. Placer dans une section pertinente — p.ex. en tête d'une nouvelle section « foyer » ou dans la section `account` (foyer) :

```ts
      {
        id: 'activity',
        titleKey: 'navigation.activity',
        descriptionKey: 'pages.more.features.activity.description',
        icon: Activity,
        to: '/activity',
      },
```

- [ ] **Step 3 : Clés i18n de nav**

Ajouter dans les trois locales :
- `fr.json` : `"navigation": { ..., "activity": "Activité du foyer" }` et `"pages.more.features.activity.description": "Voir les actions récentes des membres"`.
- `en.json` : `"activity": "Household activity"` / `"description": "See household members' recent actions"`.
- `es.json` : `"activity": "Actividad del hogar"` / `"description": "Ver las acciones recientes de los miembros"`.

> Respecter la structure imbriquée existante de `navigation` et `pages.more.features` dans chaque fichier.

- [ ] **Step 4 : Compiler + valider JSON + smoke**

Run: `cd frontend && npx tsc --noEmit` → pas d'erreur.
Run: `cd frontend && node -e "['en','es','fr'].forEach(l=>JSON.parse(require('fs').readFileSync('src/i18n/locales/'+l+'.json','utf8')))"` → JSON valides.
Smoke : entrée « Activité du foyer » visible dans la sidebar desktop et sur la page More mobile ; le clic mène à `/activity`.

- [ ] **Step 5 : Commit**

```bash
git add frontend/src/config/desktopNavigation.ts frontend/src/config/moreNavigation.ts frontend/src/i18n/locales/
git commit -m "✨ #activités front : entrées de navigation sidebar + More"
```

---

## Phase D — Vérification finale

### Task D1 : Lint + build complet + checklist manuelle

**Files:** aucun (vérification).

- [ ] **Step 1 : Lint & build backend**

Run: `cd backend && npx tsc --noEmit && npm run build`
Expected: succès sans erreur.

- [ ] **Step 2 : Lint & build frontend**

Run: `cd frontend && npm run lint && npm run build`
Expected: succès (0 erreur lint, build OK).

- [ ] **Step 3 : Checklist manuelle (dev complet via docker ou npm run dev x2)**

Cocher chaque critère d'acceptation :
- [ ] Ajout stock → entrée `item_added` (feed + Dashboard).
- [ ] Modif quantité → `item_quantity_changed` ; modif péremption → `item_expiration_changed`.
- [ ] Consommé / jeté / retiré → entrées correspondantes ; **undo < 10s → aucune entrée**.
- [ ] Courses : ajout / acheté / suppression → entrées ; dédup interne ne crée PAS de `shopping_removed`.
- [ ] Meal plan : planifié / portions / cuisiné / retiré → entrées.
- [ ] Recettes/paramètres/stockages → aucune entrée.
- [ ] Dashboard : section « Activité récente » (≤5), « Voir tout » → `/activity`, **masquée si vide**.
- [ ] Page `/activity` : accessible sidebar + More ; groupée par jour ; tri desc intra-jour ; heure relative < 1h sinon absolue ; avatar ; « Charger plus » (30/page).
- [ ] Ancien membre : mention « (ancien membre) » (désactiver un membre pour tester).
- [ ] Foyer mono-membre : timeline fonctionnelle.
- [ ] i18n : basculer en/es/fr, libellés cohérents et interpolés.

- [ ] **Step 4 : Finaliser la branche**

Utiliser la skill `superpowers:finishing-a-development-branch` pour décider merge/PR/cleanup.

---

## Self-Review (rempli à la rédaction)

- **Couverture spec** : périmètre stock/courses/meal (B1-B4) ; Dashboard (C5) ; page dédiée groupée + charger plus (C4) ; nav sidebar+More (C6) ; contenu enrichi + i18n (C2) ; vie privée (scope household côté route + `isFormerMember`) ; immuabilité (aucune route de modif/suppression exposée ; seule l'undo supprime) ; undo → pas d'entrée (B2) ; pas d'entrée orpheline (userId toujours présent, colonne NOT NULL). ✅
- **Placeholders** : aucun « TBD » ; chaque étape porte le code réel. Les `>` notes demandent une **vérification de nom exact** (flag `isActive`, includes `.item`/`.recipe`, sélecteurs de store, tokens `mf-*`) — ce sont des points de contrôle, pas des trous : chaque endroit indique la valeur par défaut et le fallback.
- **Cohérence des types** : `HouseholdActivityAction` (13 valeurs) et `HouseholdActivityTargetType` définis en A1, réutilisés partout ; `CreateHouseholdActivityData` étendu en A2 et consommé en B1-B4 ; `ActivityEntry`/`ActivityFeedResponse` définis en C1, consommés en C2-C5 ; `buildActivityLabel`/`groupByDay`/`formatEntryTime` définis en C2/C3, consommés en C3-C5.
