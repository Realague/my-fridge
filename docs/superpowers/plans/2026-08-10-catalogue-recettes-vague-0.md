# Catalogue de recettes — Vague 0 (fondations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer les tables `catalog_recipes` / `catalog_recipe_ingredients` et la logique pure de copie d'une recette perso vers le catalogue, sans exposer aucune API ni UI.

**Architecture:** Deux modèles Sequelize + une migration, une fonction pure `buildCatalogRecipeFromRecipe` qui porte toute la logique métier de la copie (snapshot profond, démappage des articles privés), et un repository mince qui l'exécute dans une transaction. Aucun service, contrôleur ou route : la Vague 1 les ajoutera par-dessus.

**Tech Stack:** TypeScript, Express 4, Sequelize 6 / PostgreSQL 15, vitest.

**Spec:** `docs/superpowers/specs/2026-08-10-catalogue-recettes-vague-0-design.md`

## Global Constraints

- Travailler dans `backend/`. Aucune modification du frontend dans ce plan.
- Colonnes en **camelCase** (le repo n'utilise PAS `underscored`), tables en snake_case pluriel.
- Migrations dans `backend/src/migrations/`, fichiers `.js` CommonJS (ils ne peuvent pas importer de TypeScript — dupliquer les valeurs d'enum en littéral avec un commentaire, comme `202607180-create-household-activities-table.js`).
- Tests vitest : **jamais de DB ni de réseau** (`backend/vitest.config.ts`). Importer les modèles est autorisé : `src/config/database.ts` instancie Sequelize sans se connecter.
- Aucun `ALTER`/`DROP` sur `recipes` ou `recipe_ingredients`.
- `difficulty` réutilise l'enum existant `'Easy' | 'Medium' | 'Hard'`.
- Tous les FK auteur/source en `ON DELETE SET NULL`. Seul `catalogRecipeId` est en `CASCADE`.
- Règle de démappage : un ingrédient dont l'`Item` a `householdId !== null` (article privé au foyer) perd son `itemId` (`null`) et conserve son nom dans `rawText`.
- Messages de commit : emoji + description courte en français, comme l'historique du repo.

---

### Task 1: Modèles `CatalogRecipe` et `CatalogRecipeIngredient`

**Files:**
- Create: `backend/src/models/CatalogRecipe.ts`
- Create: `backend/src/models/CatalogRecipeIngredient.ts`
- Modify: `backend/src/models/index.ts` (imports, associations, exports)
- Test: `backend/src/models/__tests__/catalogRecipeIngredient.test.ts`

**Interfaces:**
- Consumes: `Unit`, `UNITS`, `FREE_QUANTITY_UNITS` depuis `../types/enums` ; `RecipeStep` depuis `../types/RecipeDto` ; `RecipeDifficulty` depuis `./Recipe`.
- Produces:
  - `CatalogOriginType` (enum TS : `COMMUNITY = 'community'`, `AGGREGATED = 'aggregated'`), `CATALOG_ORIGIN_TYPES: CatalogOriginType[]`
  - `CatalogRecipeStatus` (enum TS : `PUBLISHED = 'published'`, `UNDER_REVIEW = 'under_review'`, `REMOVED = 'removed'`), `CATALOG_RECIPE_STATUSES: CatalogRecipeStatus[]`
  - `class CatalogRecipe`, `interface CatalogRecipeCreationAttributes`
  - `class CatalogRecipeIngredient`, `interface CatalogRecipeIngredientCreationAttributes`

- [ ] **Step 1: Écrire les tests de validation qui échouent**

Créer `backend/src/models/__tests__/catalogRecipeIngredient.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { CatalogRecipeIngredient } from '../CatalogRecipeIngredient';
import { Unit } from '../../types/enums';

const RECIPE_ID = '11111111-1111-4111-8111-111111111111';
const ITEM_ID = '22222222-2222-4222-8222-222222222222';

describe('CatalogRecipeIngredient validations', () => {
  it('accepte un ingrédient mappé sur un article du catalogue', async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: ITEM_ID,
      rawText: null,
      quantity: 200,
      unit: Unit.G,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).resolves.toBeDefined();
  });

  it("accepte un ingrédient non mappé qui n'a qu'un rawText", async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: null,
      rawText: '2 branches de céleri du jardin',
      quantity: 2,
      unit: Unit.PIECE,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).resolves.toBeDefined();
  });

  it('refuse un ingrédient sans itemId ni rawText', async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: null,
      rawText: null,
      quantity: 1,
      unit: Unit.PIECE,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).rejects.toThrow(/itemId or rawText/);
  });

  it('refuse une quantité absente quand isFreeQuantity est faux', async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: ITEM_ID,
      rawText: null,
      quantity: null,
      unit: Unit.G,
      isFreeQuantity: false,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).rejects.toThrow(/quantity is required/);
  });

  it('accepte une quantité absente quand isFreeQuantity est vrai', async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: ITEM_ID,
      rawText: null,
      quantity: null,
      unit: Unit.PINCH,
      isFreeQuantity: true,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).resolves.toBeDefined();
  });

  it('refuse une unité gestuelle sans isFreeQuantity', async () => {
    const ingredient = CatalogRecipeIngredient.build({
      catalogRecipeId: RECIPE_ID,
      itemId: ITEM_ID,
      rawText: null,
      quantity: 1,
      unit: Unit.PINCH,
      isFreeQuantity: false,
      displayOrder: 0,
    });

    await expect(ingredient.validate()).rejects.toThrow(/requires isFreeQuantity/);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `cd backend && npx vitest run src/models/__tests__/catalogRecipeIngredient.test.ts`
Expected: FAIL — `Cannot find module '../CatalogRecipeIngredient'`.

- [ ] **Step 3: Créer `backend/src/models/CatalogRecipe.ts`**

```ts
import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';
import { Household } from './Household';
import { Recipe, RecipeDifficulty } from './Recipe';
import { RecipeStep } from '../types/RecipeDto';
import { CatalogRecipeIngredient } from './CatalogRecipeIngredient';

/** Distingue une contribution d'un foyer d'une recette importée d'une source externe. */
export enum CatalogOriginType {
  COMMUNITY = 'community',
  AGGREGATED = 'aggregated',
}

export const CATALOG_ORIGIN_TYPES = Object.values(CatalogOriginType);

/** Prépare la modération a posteriori (Vague 2). En Vague 0 tout est `published`. */
export enum CatalogRecipeStatus {
  PUBLISHED = 'published',
  UNDER_REVIEW = 'under_review',
  REMOVED = 'removed',
}

export const CATALOG_RECIPE_STATUSES = Object.values(CatalogRecipeStatus);

interface CatalogRecipeAttributes {
  id: string;
  title: string;
  description: string | null;
  instructions: RecipeStep[];
  tags: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  imageUrl: string | null;
  /** Auteur de la publication. Null pour les recettes agrégées, ou si le compte est supprimé. */
  authorUserId: string | null;
  /** Foyer d'origine. Null pour les recettes agrégées, ou si le foyer est supprimé. */
  authorHouseholdId: string | null;
  /**
   * Recette perso d'origine. Nullable et SET NULL à la suppression : la copie
   * catalogue est indépendante et survit à la disparition de son original.
   */
  sourceRecipeId: string | null;
  originType: CatalogOriginType;
  /** Traçabilité de l'agrégation (et des recettes perso elles-mêmes importées). */
  sourceUrl: string | null;
  sourceDomain: string | null;
  status: CatalogRecipeStatus;
  publishedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CatalogRecipeCreationAttributes
  extends Optional<
    CatalogRecipeAttributes,
    | 'id'
    | 'description'
    | 'instructions'
    | 'tags'
    | 'imageUrl'
    | 'authorUserId'
    | 'authorHouseholdId'
    | 'sourceRecipeId'
    | 'originType'
    | 'sourceUrl'
    | 'sourceDomain'
    | 'status'
    | 'publishedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class CatalogRecipe
  extends Model<CatalogRecipeAttributes, CatalogRecipeCreationAttributes>
  implements CatalogRecipeAttributes
{
  public id!: string;
  public title!: string;
  public description!: string | null;
  public instructions!: RecipeStep[];
  public tags!: string[];
  public prepTime!: number;
  public cookTime!: number;
  public servings!: number;
  public difficulty!: RecipeDifficulty;
  public imageUrl!: string | null;
  public authorUserId!: string | null;
  public authorHouseholdId!: string | null;
  public sourceRecipeId!: string | null;
  public originType!: CatalogOriginType;
  public sourceUrl!: string | null;
  public sourceDomain!: string | null;
  public status!: CatalogRecipeStatus;
  public publishedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly author?: User;
  public readonly authorHousehold?: Household;
  public readonly sourceRecipe?: Recipe;
  public readonly ingredients?: CatalogRecipeIngredient[];
}

CatalogRecipe.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    instructions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    prepTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    cookTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    servings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    difficulty: {
      type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
      allowNull: false,
      defaultValue: 'Easy',
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    authorUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    authorHouseholdId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'households', key: 'id' },
    },
    sourceRecipeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'recipes', key: 'id' },
    },
    originType: {
      type: DataTypes.ENUM(...CATALOG_ORIGIN_TYPES),
      allowNull: false,
      defaultValue: CatalogOriginType.COMMUNITY,
    },
    sourceUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sourceDomain: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...CATALOG_RECIPE_STATUSES),
      allowNull: false,
      defaultValue: CatalogRecipeStatus.PUBLISHED,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'catalog_recipes',
    timestamps: true,
    indexes: [
      { fields: ['status', 'publishedAt'] },
      { fields: ['authorHouseholdId'] },
      { fields: ['authorUserId'] },
      { fields: ['originType', 'status'] },
    ],
  }
);
```

Note : l'index unique partiel sur `sourceRecipeId` n'est pas déclarable proprement côté modèle (Sequelize ne gère pas `where` dans `indexes`) — il est créé par la migration en Task 2.

- [ ] **Step 4: Créer `backend/src/models/CatalogRecipeIngredient.ts`**

```ts
import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Unit, UNITS, FREE_QUANTITY_UNITS } from '../types/enums';
import { Item } from './Item';
import { CatalogRecipe } from './CatalogRecipe';

interface CatalogRecipeIngredientAttributes {
  id: string;
  catalogRecipeId: string;
  /**
   * Article du catalogue global. Null quand l'ingrédient n'a pas pu être mappé
   * (agrégation externe) ou quand l'article d'origine était privé au foyer
   * auteur — dans les deux cas `rawText` porte l'information.
   */
  itemId: string | null;
  /** Texte source de l'ingrédient, ou snapshot du nom de l'article démappé. */
  rawText: string | null;
  /** Null quand `isFreeQuantity` est vrai (ingrédient "à l'œil"). */
  quantity: number | null;
  unit: Unit;
  isFreeQuantity: boolean;
  notes: string | null;
  usedInSteps: number[];
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CatalogRecipeIngredientCreationAttributes
  extends Optional<
    CatalogRecipeIngredientAttributes,
    | 'id'
    | 'itemId'
    | 'rawText'
    | 'quantity'
    | 'unit'
    | 'isFreeQuantity'
    | 'notes'
    | 'usedInSteps'
    | 'displayOrder'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class CatalogRecipeIngredient
  extends Model<CatalogRecipeIngredientAttributes, CatalogRecipeIngredientCreationAttributes>
  implements CatalogRecipeIngredientAttributes
{
  public id!: string;
  public catalogRecipeId!: string;
  public itemId!: string | null;
  public rawText!: string | null;
  public quantity!: number | null;
  public unit!: Unit;
  public isFreeQuantity!: boolean;
  public notes!: string | null;
  public usedInSteps!: number[];
  public displayOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly catalogRecipe?: CatalogRecipe;
  public readonly item?: Item;
}

CatalogRecipeIngredient.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    catalogRecipeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'catalog_recipes', key: 'id' },
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'items', key: 'id' },
    },
    rawText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      validate: {
        quantityRequiredUnlessFree(this: CatalogRecipeIngredient, value: number | null) {
          if (this.isFreeQuantity) return;
          if (value === null || value === undefined) {
            throw new Error('quantity is required unless isFreeQuantity is true');
          }
          if (Number(value) <= 0) {
            throw new Error('quantity must be positive');
          }
        },
      },
    },
    unit: {
      type: DataTypes.ENUM(...UNITS),
      allowNull: false,
      defaultValue: Unit.PIECE,
    },
    isFreeQuantity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        freeQuantityConsistency(this: CatalogRecipeIngredient, value: boolean) {
          // Gestural units (pinch/drizzle/knob) are always free-quantity.
          if (!value && FREE_QUANTITY_UNITS.includes(this.unit)) {
            throw new Error(`Unit ${this.unit} requires isFreeQuantity to be true`);
          }
        },
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    usedInSteps: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'catalog_recipe_ingredients',
    timestamps: true,
    validate: {
      // Un ingrédient non mappé reste affichable grâce à rawText ; un ingrédient
      // sans ni l'un ni l'autre ne porte plus aucune information.
      itemIdOrRawTextRequired(this: CatalogRecipeIngredient) {
        if (!this.itemId && !this.rawText) {
          throw new Error('catalog ingredient requires either itemId or rawText');
        }
      },
    },
    indexes: [
      { fields: ['catalogRecipeId', 'displayOrder'] },
      { fields: ['itemId'] },
    ],
  }
);
```

Note : pas de contrainte unique `(catalogRecipeId, itemId)` — contrairement à `recipe_ingredients` — car `itemId` peut être `NULL` sur plusieurs lignes d'une même recette agrégée.

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `cd backend && npx vitest run src/models/__tests__/catalogRecipeIngredient.test.ts`
Expected: PASS, 6 tests.

Si l'import de `../config/database` fait échouer la suite (dépendance non satisfaite au chargement), NE PAS ajouter de mock DB : extraire les trois validateurs dans `backend/src/models/validators/catalogRecipeIngredientValidators.ts` sous forme de fonctions pures, les appeler depuis le modèle, et tester ces fonctions directement.

- [ ] **Step 6: Câbler les associations dans `backend/src/models/index.ts`**

Ajouter les imports après `import { HouseholdActivity } from './HouseholdActivity';` :

```ts
import { CatalogRecipe } from './CatalogRecipe';
import { CatalogRecipeIngredient } from './CatalogRecipeIngredient';
```

Ajouter le bloc d'associations juste avant `// Export models` :

```ts
// Catalog Recipe associations.
// La recette catalogue est une COPIE FIGÉE et INDÉPENDANTE de la recette perso :
// tous les liens vers l'origine (auteur, foyer, recette source) sont en SET NULL,
// jamais en CASCADE. Supprimer la recette perso ou le compte de l'auteur ne doit
// pas faire disparaître la publication.
CatalogRecipe.hasMany(CatalogRecipeIngredient, {
  foreignKey: 'catalogRecipeId',
  as: 'ingredients',
  onDelete: 'CASCADE',
});
CatalogRecipeIngredient.belongsTo(CatalogRecipe, {
  foreignKey: 'catalogRecipeId',
  as: 'catalogRecipe',
});

Item.hasMany(CatalogRecipeIngredient, { foreignKey: 'itemId', as: 'catalogRecipeIngredients' });
CatalogRecipeIngredient.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

User.hasMany(CatalogRecipe, { foreignKey: 'authorUserId', as: 'publishedRecipes' });
CatalogRecipe.belongsTo(User, { foreignKey: 'authorUserId', as: 'author' });

Household.hasMany(CatalogRecipe, { foreignKey: 'authorHouseholdId', as: 'publishedRecipes' });
CatalogRecipe.belongsTo(Household, { foreignKey: 'authorHouseholdId', as: 'authorHousehold' });

// hasOne et non hasMany : un index unique partiel garantit une seule publication
// vivante (status <> 'removed') par recette perso.
Recipe.hasOne(CatalogRecipe, { foreignKey: 'sourceRecipeId', as: 'catalogPublication' });
CatalogRecipe.belongsTo(Recipe, { foreignKey: 'sourceRecipeId', as: 'sourceRecipe' });
```

Ajouter à la liste `export { ... }`, après `HouseholdActivity` :

```ts
  CatalogRecipe,
  CatalogRecipeIngredient
```

- [ ] **Step 7: Vérifier la compilation et relancer toute la suite**

Run: `cd backend && npx tsc --noEmit && npx vitest run`
Expected: aucune erreur TypeScript, tous les tests passent (les 9 suites existantes + la nouvelle).

- [ ] **Step 8: Commit**

```bash
git add backend/src/models/CatalogRecipe.ts backend/src/models/CatalogRecipeIngredient.ts backend/src/models/index.ts backend/src/models/__tests__/catalogRecipeIngredient.test.ts
git commit -m "✨ #166 modèles CatalogRecipe et CatalogRecipeIngredient"
```

---

### Task 2: Migration des tables catalogue

**Files:**
- Create: `backend/src/migrations/202608100-create-catalog-recipes-tables.js`

**Interfaces:**
- Consumes: les tables `users`, `households`, `recipes`, `items` (existantes).
- Produces: les tables `catalog_recipes` et `catalog_recipe_ingredients` en base, plus l'index unique partiel `catalog_recipes_source_recipe_live_unique`.

- [ ] **Step 1: Écrire la migration**

Créer `backend/src/migrations/202608100-create-catalog-recipes-tables.js` :

```js
'use strict';

const { DataTypes } = require('sequelize');

// Valeurs dupliquées depuis src/models/CatalogRecipe.ts et src/types/enums.ts :
// une migration CommonJS ne peut pas importer le TypeScript du projet.
const DIFFICULTY_VALUES = ['Easy', 'Medium', 'Hard'];
const ORIGIN_TYPE_VALUES = ['community', 'aggregated'];
const STATUS_VALUES = ['published', 'under_review', 'removed'];
const UNIT_VALUES = [
  'g', 'kg', 'ml', 'cl', 'l', 'piece', 'tbsp', 'tsp', 'serving',
  'pinch', 'drizzle', 'knob',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('catalog_recipes', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      instructions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      tags: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      prepTime: { type: DataTypes.INTEGER, allowNull: false },
      cookTime: { type: DataTypes.INTEGER, allowNull: false },
      servings: { type: DataTypes.INTEGER, allowNull: false },
      difficulty: {
        type: DataTypes.ENUM(...DIFFICULTY_VALUES),
        allowNull: false,
        defaultValue: 'Easy',
      },
      imageUrl: { type: DataTypes.TEXT, allowNull: true },
      // SET NULL et non CASCADE : la copie catalogue survit à la suppression
      // de son auteur, de son foyer et de sa recette d'origine.
      authorUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      authorHouseholdId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'households', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      sourceRecipeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'recipes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      originType: {
        type: DataTypes.ENUM(...ORIGIN_TYPE_VALUES),
        allowNull: false,
        defaultValue: 'community',
      },
      sourceUrl: { type: DataTypes.TEXT, allowNull: true },
      sourceDomain: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM(...STATUS_VALUES),
        allowNull: false,
        defaultValue: 'published',
      },
      publishedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    await queryInterface.addIndex('catalog_recipes', ['status', 'publishedAt']);
    await queryInterface.addIndex('catalog_recipes', ['authorHouseholdId']);
    await queryInterface.addIndex('catalog_recipes', ['authorUserId']);
    await queryInterface.addIndex('catalog_recipes', ['originType', 'status']);

    // Une seule publication vivante par recette perso : rend le "republier =
    // mettre à jour" de la Vague 1 déterministe, sans bloquer l'historique des
    // publications retirées.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX catalog_recipes_source_recipe_live_unique
      ON catalog_recipes ("sourceRecipeId")
      WHERE "sourceRecipeId" IS NOT NULL AND status <> 'removed';
    `);

    await queryInterface.createTable('catalog_recipe_ingredients', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      catalogRecipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'catalog_recipes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Nullable : ingrédient non mappé (agrégation) ou article d'origine privé
      // au foyer auteur. Dans les deux cas rawText porte l'information.
      itemId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      rawText: { type: DataTypes.TEXT, allowNull: true },
      quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
      unit: {
        type: DataTypes.ENUM(...UNIT_VALUES),
        allowNull: false,
        defaultValue: 'piece',
      },
      isFreeQuantity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      usedInSteps: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
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

    await queryInterface.addIndex('catalog_recipe_ingredients', ['catalogRecipeId', 'displayOrder']);
    await queryInterface.addIndex('catalog_recipe_ingredients', ['itemId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('catalog_recipe_ingredients');
    await queryInterface.dropTable('catalog_recipes');
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_catalog_recipe_ingredients_unit";
      DROP TYPE IF EXISTS "enum_catalog_recipes_status";
      DROP TYPE IF EXISTS "enum_catalog_recipes_originType";
      DROP TYPE IF EXISTS "enum_catalog_recipes_difficulty";
    `);
  },
};
```

- [ ] **Step 2: Vérifier que `UNIT_VALUES` correspond exactement à l'enum TypeScript**

Run: `cd backend && npx ts-node -e "import { UNITS } from './src/types/enums'; console.log(JSON.stringify(UNITS));"`
Expected: la sortie doit être identique, valeur par valeur et dans le même ordre, à `UNIT_VALUES` dans la migration. Si elle diffère, **corriger la migration** pour reprendre la liste exacte affichée.

- [ ] **Step 3: Lancer la migration sur la base de dev**

Run: `cd backend && npm run db:migrate`
Expected: `== 202608100-create-catalog-recipes-tables: migrated`.

Si la base de dev n'est pas démarrée : `docker-compose -f docker-compose.dev.yml up -d db` puis relancer.

- [ ] **Step 4: Vérifier le schéma créé et l'absence d'impact sur les recettes existantes**

Run:
```bash
docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres -d my_fridge_db -c "\d catalog_recipes" -c "\d catalog_recipe_ingredients" -c "\d recipes" -c "SELECT count(*) FROM recipes;" -c "SELECT count(*) FROM recipe_ingredients;"
```
Expected :
- `catalog_recipes` contient les 20 colonnes prévues et l'index `catalog_recipes_source_recipe_live_unique` apparaît avec sa clause `WHERE`.
- `catalog_recipe_ingredients` a `itemId` nullable et une FK `SET NULL` vers `items`.
- La définition de `recipes` est inchangée, et les deux `count(*)` sont identiques à ceux d'avant migration.

- [ ] **Step 5: Vérifier que le rollback est propre**

Run: `cd backend && npm run db:migrate:undo && npm run db:migrate`
Expected: le `undo` supprime les deux tables sans erreur, puis la migration se rejoue sans erreur (preuve que les types enum ont bien été droppés).

- [ ] **Step 6: Commit**

```bash
git add backend/src/migrations/202608100-create-catalog-recipes-tables.js
git commit -m "✨ #166 migration des tables catalog_recipes et catalog_recipe_ingredients"
```

---

### Task 3: Fonction pure de copie `buildCatalogRecipeFromRecipe`

**Files:**
- Create: `backend/src/services/catalogRecipe/buildCatalogRecipeFromRecipe.ts`
- Test: `backend/src/services/catalogRecipe/__tests__/buildCatalogRecipeFromRecipe.test.ts`

**Interfaces:**
- Consumes: `CatalogRecipeCreationAttributes`, `CatalogOriginType`, `CatalogRecipeStatus` (Task 1) ; `CatalogRecipeIngredientCreationAttributes` (Task 1) ; `Unit` (`../../types/enums`) ; `RecipeStep` (`../../types/RecipeDto`) ; `RecipeDifficulty` (`../../models/Recipe`).
- Produces:
  - `interface CatalogRecipeCopySource`
  - `interface CatalogRecipeIngredientCopySource`
  - `interface BuiltCatalogRecipe { recipe: CatalogRecipeCreationAttributes; ingredients: BuiltCatalogRecipeIngredient[] }`
  - `type BuiltCatalogRecipeIngredient = Omit<CatalogRecipeIngredientCreationAttributes, 'catalogRecipeId'>`
  - `function buildCatalogRecipeFromRecipe(source: CatalogRecipeCopySource, options: { authorUserId: string; publishedAt?: Date }): BuiltCatalogRecipe`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `backend/src/services/catalogRecipe/__tests__/buildCatalogRecipeFromRecipe.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import {
  buildCatalogRecipeFromRecipe,
  CatalogRecipeCopySource,
} from '../buildCatalogRecipeFromRecipe';
import { CatalogOriginType, CatalogRecipeStatus } from '../../../models/CatalogRecipe';
import { Unit } from '../../../types/enums';

const RECIPE_ID = '11111111-1111-4111-8111-111111111111';
const HOUSEHOLD_ID = '33333333-3333-4333-8333-333333333333';
const AUTHOR_ID = '44444444-4444-4444-8444-444444444444';
const GLOBAL_ITEM_ID = '55555555-5555-4555-8555-555555555555';
const PRIVATE_ITEM_ID = '66666666-6666-4666-8666-666666666666';

function makeSource(overrides: Partial<CatalogRecipeCopySource> = {}): CatalogRecipeCopySource {
  return {
    id: RECIPE_ID,
    title: 'Gratin dauphinois',
    description: 'Le vrai, sans fromage.',
    instructions: [
      { text: 'Éplucher les pommes de terre.', duration: 10 },
      { text: 'Enfourner.', duration: 60 },
    ],
    tags: ['gratin', 'hiver'],
    prepTime: 20,
    cookTime: 60,
    servings: 4,
    difficulty: 'Medium',
    imageUrl: 'https://cdn.example/gratin.jpg',
    sourceUrl: null,
    sourceDomain: null,
    householdId: HOUSEHOLD_ID,
    ingredients: [
      {
        itemId: GLOBAL_ITEM_ID,
        quantity: 1,
        unit: Unit.KG,
        isFreeQuantity: false,
        notes: 'à chair ferme',
        usedInSteps: [0],
        item: { id: GLOBAL_ITEM_ID, name: 'Pomme de terre', householdId: null },
      },
      {
        itemId: PRIVATE_ITEM_ID,
        quantity: 200,
        unit: Unit.ML,
        isFreeQuantity: false,
        notes: null,
        usedInSteps: [1],
        item: { id: PRIVATE_ITEM_ID, name: 'Crème de la ferme du coin', householdId: HOUSEHOLD_ID },
      },
    ],
    ...overrides,
  };
}

describe('buildCatalogRecipeFromRecipe', () => {
  it('copie les champs de la recette et marque la publication', () => {
    const built = buildCatalogRecipeFromRecipe(makeSource(), { authorUserId: AUTHOR_ID });

    expect(built.recipe.title).toBe('Gratin dauphinois');
    expect(built.recipe.description).toBe('Le vrai, sans fromage.');
    expect(built.recipe.prepTime).toBe(20);
    expect(built.recipe.cookTime).toBe(60);
    expect(built.recipe.servings).toBe(4);
    expect(built.recipe.difficulty).toBe('Medium');
    expect(built.recipe.imageUrl).toBe('https://cdn.example/gratin.jpg');
    expect(built.recipe.tags).toEqual(['gratin', 'hiver']);
    expect(built.recipe.instructions).toEqual([
      { text: 'Éplucher les pommes de terre.', duration: 10 },
      { text: 'Enfourner.', duration: 60 },
    ]);
    expect(built.recipe.sourceRecipeId).toBe(RECIPE_ID);
    expect(built.recipe.authorHouseholdId).toBe(HOUSEHOLD_ID);
    expect(built.recipe.authorUserId).toBe(AUTHOR_ID);
    expect(built.recipe.originType).toBe(CatalogOriginType.COMMUNITY);
    expect(built.recipe.status).toBe(CatalogRecipeStatus.PUBLISHED);
    expect(built.recipe.publishedAt).toBeInstanceOf(Date);
  });

  it("préserve l'itemId des articles du catalogue global", () => {
    const built = buildCatalogRecipeFromRecipe(makeSource(), { authorUserId: AUTHOR_ID });

    expect(built.ingredients[0]).toMatchObject({
      itemId: GLOBAL_ITEM_ID,
      rawText: null,
      quantity: 1,
      unit: Unit.KG,
      isFreeQuantity: false,
      notes: 'à chair ferme',
      usedInSteps: [0],
      displayOrder: 0,
    });
  });

  it("démappe les articles privés au foyer et conserve leur nom dans rawText", () => {
    const built = buildCatalogRecipeFromRecipe(makeSource(), { authorUserId: AUTHOR_ID });

    expect(built.ingredients[1]).toMatchObject({
      itemId: null,
      rawText: 'Crème de la ferme du coin',
      quantity: 200,
      unit: Unit.ML,
      displayOrder: 1,
    });
  });

  it('numérote displayOrder dans l’ordre des ingrédients source', () => {
    const built = buildCatalogRecipeFromRecipe(makeSource(), { authorUserId: AUTHOR_ID });

    expect(built.ingredients.map(i => i.displayOrder)).toEqual([0, 1]);
  });

  it('copie les ingrédients à quantité libre sans quantité', () => {
    const source = makeSource({
      ingredients: [
        {
          itemId: GLOBAL_ITEM_ID,
          quantity: null,
          unit: Unit.PINCH,
          isFreeQuantity: true,
          notes: null,
          usedInSteps: [],
          item: { id: GLOBAL_ITEM_ID, name: 'Sel', householdId: null },
        },
      ],
    });

    const built = buildCatalogRecipeFromRecipe(source, { authorUserId: AUTHOR_ID });

    expect(built.ingredients[0]).toMatchObject({
      itemId: GLOBAL_ITEM_ID,
      quantity: null,
      unit: Unit.PINCH,
      isFreeQuantity: true,
    });
  });

  it('recopie la traçabilité des recettes importées', () => {
    const source = makeSource({
      sourceUrl: 'https://www.marmiton.org/recettes/gratin.aspx',
      sourceDomain: 'marmiton.org',
    });

    const built = buildCatalogRecipeFromRecipe(source, { authorUserId: AUTHOR_ID });

    expect(built.recipe.sourceUrl).toBe('https://www.marmiton.org/recettes/gratin.aspx');
    expect(built.recipe.sourceDomain).toBe('marmiton.org');
  });

  it("modifier la recette perso après la copie n'altère pas la version catalogue", () => {
    const source = makeSource();
    const built = buildCatalogRecipeFromRecipe(source, { authorUserId: AUTHOR_ID });

    // Le foyer continue à faire vivre sa recette privée.
    source.title = 'Gratin dauphinois v2';
    source.tags.push('rapide');
    source.instructions[0].text = 'Ne pas éplucher, finalement.';
    source.instructions.push({ text: 'Servir.', duration: null });
    source.ingredients[0].quantity = 99;
    source.ingredients[0].usedInSteps.push(1);
    source.ingredients.push({
      itemId: GLOBAL_ITEM_ID,
      quantity: 3,
      unit: Unit.PIECE,
      isFreeQuantity: false,
      notes: null,
      usedInSteps: [],
      item: { id: GLOBAL_ITEM_ID, name: 'Oignon', householdId: null },
    });

    expect(built.recipe.title).toBe('Gratin dauphinois');
    expect(built.recipe.tags).toEqual(['gratin', 'hiver']);
    expect(built.recipe.instructions).toEqual([
      { text: 'Éplucher les pommes de terre.', duration: 10 },
      { text: 'Enfourner.', duration: 60 },
    ]);
    expect(built.ingredients).toHaveLength(2);
    expect(built.ingredients[0].quantity).toBe(1);
    expect(built.ingredients[0].usedInSteps).toEqual([0]);
  });

  it('accepte une recette sans ingrédient', () => {
    const built = buildCatalogRecipeFromRecipe(makeSource({ ingredients: [] }), {
      authorUserId: AUTHOR_ID,
    });

    expect(built.ingredients).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd backend && npx vitest run src/services/catalogRecipe`
Expected: FAIL — `Cannot find module '../buildCatalogRecipeFromRecipe'`.

- [ ] **Step 3: Écrire l'implémentation**

Créer `backend/src/services/catalogRecipe/buildCatalogRecipeFromRecipe.ts` :

```ts
import {
  CatalogOriginType,
  CatalogRecipeCreationAttributes,
  CatalogRecipeStatus,
} from '../../models/CatalogRecipe';
import { CatalogRecipeIngredientCreationAttributes } from '../../models/CatalogRecipeIngredient';
import { RecipeDifficulty } from '../../models/Recipe';
import { RecipeStep } from '../../types/RecipeDto';
import { Unit } from '../../types/enums';

/**
 * Article référencé par un ingrédient de recette perso. `householdId` est la
 * donnée décisive : `null` = article du catalogue global (partagé par tous les
 * foyers), non-null = article privé au foyer.
 */
export interface CatalogRecipeCopyItem {
  id: string;
  name: string;
  householdId: string | null;
}

export interface CatalogRecipeIngredientCopySource {
  itemId: string;
  quantity: number | null;
  unit: Unit;
  isFreeQuantity: boolean;
  notes: string | null;
  usedInSteps: number[];
  /** Toujours chargé : `recipe_ingredients.itemId` est NOT NULL avec une FK. */
  item: CatalogRecipeCopyItem;
}

export interface CatalogRecipeCopySource {
  id: string;
  title: string;
  description: string | null;
  instructions: RecipeStep[];
  tags: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
  householdId: string;
  ingredients: CatalogRecipeIngredientCopySource[];
}

export type BuiltCatalogRecipeIngredient = Omit<
  CatalogRecipeIngredientCreationAttributes,
  'catalogRecipeId'
>;

export interface BuiltCatalogRecipe {
  recipe: CatalogRecipeCreationAttributes;
  ingredients: BuiltCatalogRecipeIngredient[];
}

/**
 * Construit la copie catalogue d'une recette perso.
 *
 * Publier = figer une copie indépendante : toutes les structures imbriquées
 * (instructions, tags, usedInSteps) sont clonées, jamais partagées par
 * référence avec la recette source. Modifier la recette perso ensuite n'a donc
 * aucun effet sur la publication.
 *
 * Fonction pure : aucune lecture, aucune écriture, aucune dépendance à une
 * connexion base de données.
 */
export function buildCatalogRecipeFromRecipe(
  source: CatalogRecipeCopySource,
  options: { authorUserId: string; publishedAt?: Date }
): BuiltCatalogRecipe {
  const publishedAt = options.publishedAt ?? new Date();

  return {
    recipe: {
      title: source.title,
      description: source.description,
      instructions: cloneInstructions(source.instructions),
      tags: [...source.tags],
      prepTime: source.prepTime,
      cookTime: source.cookTime,
      servings: source.servings,
      difficulty: source.difficulty,
      imageUrl: source.imageUrl,
      authorUserId: options.authorUserId,
      authorHouseholdId: source.householdId,
      sourceRecipeId: source.id,
      originType: CatalogOriginType.COMMUNITY,
      sourceUrl: source.sourceUrl,
      sourceDomain: source.sourceDomain,
      status: CatalogRecipeStatus.PUBLISHED,
      publishedAt,
    },
    ingredients: source.ingredients.map(copyIngredient),
  };
}

/**
 * Un article privé au foyer auteur n'a aucun sens pour les autres foyers : son
 * identifiant est abandonné et seul son nom est conservé, dans `rawText`. Le
 * re-rattachement à un article global équivalent est un travail ultérieur.
 */
function copyIngredient(
  ingredient: CatalogRecipeIngredientCopySource,
  index: number
): BuiltCatalogRecipeIngredient {
  const isGlobalItem = ingredient.item.householdId === null;

  return {
    itemId: isGlobalItem ? ingredient.itemId : null,
    rawText: isGlobalItem ? null : ingredient.item.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    isFreeQuantity: ingredient.isFreeQuantity,
    notes: ingredient.notes,
    usedInSteps: [...ingredient.usedInSteps],
    displayOrder: index,
  };
}

function cloneInstructions(steps: RecipeStep[]): RecipeStep[] {
  return steps.map(step => ({ text: step.text, duration: step.duration ?? null }));
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `cd backend && npx vitest run src/services/catalogRecipe`
Expected: PASS, 8 tests.

- [ ] **Step 5: Vérifier la compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/catalogRecipe/
git commit -m "✨ #166 copie pure d'une recette perso vers le catalogue"
```

---

### Task 4: `CatalogRecipeRepository`

**Files:**
- Create: `backend/src/repositories/CatalogRecipeRepository.ts`

**Interfaces:**
- Consumes: `buildCatalogRecipeFromRecipe`, `CatalogRecipeCopySource` (Task 3) ; `CatalogRecipe`, `CatalogRecipeIngredient` (Task 1) ; `Recipe`, `RecipeIngredient`, `Item` ; `NotFoundError` depuis `../errors/CustomErrors`.
- Produces:
  - `class CatalogRecipeRepository`
  - `createFromRecipe(recipeId: string, authorUserId: string): Promise<CatalogRecipe>`
  - `findByIdWithIngredients(id: string): Promise<CatalogRecipe | null>`

- [ ] **Step 1: Écrire le repository**

Créer `backend/src/repositories/CatalogRecipeRepository.ts` :

```ts
import sequelize from '../config/database';
import { NotFoundError } from '../errors/CustomErrors';
import { CatalogRecipe } from '../models/CatalogRecipe';
import { CatalogRecipeIngredient } from '../models/CatalogRecipeIngredient';
import { Item } from '../models/Item';
import { Recipe } from '../models/Recipe';
import { RecipeIngredient } from '../models/RecipeIngredient';
import {
  buildCatalogRecipeFromRecipe,
  CatalogRecipeCopySource,
} from '../services/catalogRecipe/buildCatalogRecipeFromRecipe';

export class CatalogRecipeRepository {
  /**
   * Publie une recette perso : crée une copie figée et indépendante dans le
   * catalogue global. La recette source n'est jamais modifiée.
   *
   * Prend un identifiant plutôt qu'une instance déjà chargée : la copie a besoin
   * du `householdId` de chaque article pour décider quels `itemId` sont
   * publiables, et c'est au repository de garantir que ces données sont là.
   */
  async createFromRecipe(recipeId: string, authorUserId: string): Promise<CatalogRecipe> {
    return await sequelize.transaction(async (transaction) => {
      const recipe = await Recipe.findByPk(recipeId, {
        include: [
          {
            model: RecipeIngredient,
            as: 'ingredients',
            include: [{ model: Item, as: 'item' }],
          },
        ],
        // Ordre stable : il devient le displayOrder de la copie.
        order: [[{ model: RecipeIngredient, as: 'ingredients' }, 'createdAt', 'ASC']],
        transaction,
      });

      if (!recipe) {
        throw new NotFoundError(`Recipe ${recipeId} not found`);
      }

      const built = buildCatalogRecipeFromRecipe(toCopySource(recipe), { authorUserId });

      const catalogRecipe = await CatalogRecipe.create(built.recipe, { transaction });

      if (built.ingredients.length > 0) {
        await CatalogRecipeIngredient.bulkCreate(
          built.ingredients.map(ingredient => ({
            ...ingredient,
            catalogRecipeId: catalogRecipe.id,
          })),
          { transaction, validate: true }
        );
      }

      return catalogRecipe;
    });
  }

  async findByIdWithIngredients(id: string): Promise<CatalogRecipe | null> {
    return await CatalogRecipe.findByPk(id, {
      include: [
        {
          model: CatalogRecipeIngredient,
          as: 'ingredients',
          include: [{ model: Item, as: 'item' }],
        },
      ],
      order: [[{ model: CatalogRecipeIngredient, as: 'ingredients' }, 'displayOrder', 'ASC']],
    });
  }
}

/** Réduit l'instance Sequelize aux données dont la copie a besoin. */
function toCopySource(recipe: Recipe): CatalogRecipeCopySource {
  const ingredients = recipe.ingredients ?? [];

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    instructions: recipe.instructions,
    tags: recipe.tags,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    imageUrl: recipe.imageUrl,
    sourceUrl: recipe.sourceUrl,
    sourceDomain: recipe.sourceDomain,
    householdId: recipe.householdId,
    ingredients: ingredients.map(ingredient => {
      const item = ingredient.item;
      if (!item) {
        throw new NotFoundError(
          `Item ${ingredient.itemId} of recipe ingredient ${ingredient.id} could not be loaded`
        );
      }

      return {
        itemId: ingredient.itemId,
        // Sequelize renvoie les DECIMAL en string : la copie doit rester numérique.
        quantity: ingredient.quantity === null ? null : Number(ingredient.quantity),
        unit: ingredient.unit,
        isFreeQuantity: ingredient.isFreeQuantity,
        notes: ingredient.notes,
        usedInSteps: ingredient.usedInSteps ?? [],
        item: { id: item.id, name: item.name, householdId: item.householdId },
      };
    }),
  };
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Lancer toute la suite de tests**

Run: `cd backend && npx vitest run`
Expected: toutes les suites passent, y compris les 9 suites préexistantes de `recipeImport`.

- [ ] **Step 4: Vérifier que le serveur démarre toujours**

Run: `cd backend && npx tsc --noEmit && npm run build`
Expected: build réussi. Les nouveaux modèles sont chargés via `models/index.ts` sans erreur d'association.

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/CatalogRecipeRepository.ts
git commit -m "✨ #166 repository de publication d'une recette au catalogue"
```

---

## Vérification finale

- [ ] `cd backend && npx tsc --noEmit` — aucune erreur
- [ ] `cd backend && npx vitest run` — toutes les suites passent
- [ ] `cd backend && npm run db:migrate:status` — la migration `202608100` est `up`
- [ ] `git diff main --stat` ne montre **aucun** fichier sous `frontend/`, ni `backend/src/routes/`, ni `backend/src/controllers/`
- [ ] `git diff main -- backend/src/models/Recipe.ts backend/src/models/RecipeIngredient.ts` est vide
