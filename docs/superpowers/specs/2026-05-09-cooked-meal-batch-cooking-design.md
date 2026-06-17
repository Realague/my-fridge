# Cooked Meal (Batch Cooking) — Design Spec

**Date:** 2026-05-09
**Ticket:** 1/3 of the batch-cooking trilogy (manual add + stock management). Tickets 2 (auto-add from "I cooked this" in meal plan) and 3 (notes, alerts, suggestions) are out of scope.
**Author:** Brainstormed with Claude Code

## Goal

Allow a user to add a cooked dish (batch cooking output) to inventory as a new article type alongside ingredients. Each batch is counted in portions, has its own cooking date, expires faster than raw ingredients, and may optionally be linked to a recipe.

## Non-goals

- Auto-add when "I cooked this" is pressed in the meal planner (ticket 2)
- Notes, custom alerts, suggestions on cooked meals (ticket 3)
- Migrating existing `meal`-category items to `cooked_meal`
- Sharing cooked meals across households

## Architecture overview

The feature reuses the existing `Item` + `StoredItem` infrastructure. Two new fields, one new enum value, no new tables. Lazy creation: an Item is materialised only at the first batch — never at recipe creation.

## Data model

### Enum extension — `ItemCategory`

Add `COOKED_MEAL = 'cooked_meal'` (in [backend/src/types/enums.ts](../../../backend/src/types/enums.ts) and the front mirror at [frontend/src/types/enums.ts](../../../frontend/src/types/enums.ts)).

`isCatalogStorageUnitForCategory` is extended so `serving` is allowed for both `meal` AND `cooked_meal` (currently only `meal`).

The existing `meal` category is **kept untouched** and represents purchased ready-to-eat dishes (frozen pizza, store-bought sushi). `cooked_meal` is exclusively for home-cooked batches.

### Item table additions

| Column | Type | Constraint | Purpose |
|---|---|---|---|
| `recipe_id` | UUID | NULL, FK → `recipes.id`, `ON DELETE SET NULL` | Optional link to source recipe. Cascade delete is handled in the service layer (so we can show a confirmation modal); the FK only prevents dangling references if a Recipe vanishes by some other path. |

Index: `CREATE INDEX idx_items_recipe_id ON items(recipe_id) WHERE recipe_id IS NOT NULL`.

### StoredItem table additions

| Column | Type | Constraint | Purpose |
|---|---|---|---|
| `cooked_date` | DATEONLY | NULL | The "cooked on" date, owned by the physical batch. Distinct from `frozen_date` and `opened_date`. Set only when `item.category = 'cooked_meal'`. |

### Item ephemerality rule

A `cooked_meal` Item with `recipeId IS NULL` is *one-shot*: it is automatically deleted when its last `StoredItem` disappears (consumed, thrown away, etc.). A `cooked_meal` Item with `recipeId IS NOT NULL` persists until the linked recipe is deleted.

This keeps the catalog clean: free-text dishes never accumulate; recipe-linked dishes have one canonical Item per recipe.

## Backend services

### Lazy item creation in `StoredItemService.create`

`POST /api/households/:hh/stored-items` accepts a new optional payload shape:

```json
{
  "articleType": "cooked_meal",
  "name": "Curry de poulet thaï",
  "recipeId": "<uuid or null>",
  "cookedDate": "2026-05-09",
  "quantity": 4,
  "unit": "serving",
  "storageAreaId": "<uuid>",
  "expirationDate": "2026-05-12"
}
```

Resolution logic (in a single transaction):

1. If `recipeId` is provided → look up Item where `recipeId = X`. If none, create one with `{ category: 'cooked_meal', name, recipeId, defaultUnit: 'serving', availableUnits: ['serving'], householdId }`. Reuse if it exists.
2. If `recipeId` is null → always create a fresh one-shot Item (`{ category: 'cooked_meal', name, recipeId: null, ... }`).
3. Create the StoredItem with the resolved `itemId` + `cookedDate`.

For ingredient flow, the existing payload shape is unchanged.

### Recipe rename sync

Extend `RecipeService.update`. If `title` changes, look up Item where `recipeId = recipe.id` and update `Item.name` in the same transaction. StoredItems carry no name of their own — they read through `Item.name` — so the change propagates to all in-stock portions for free.

### Recipe deletion impact

New endpoint `GET /api/households/:hh/recipes/:id/deletion-impact` returning:

```json
{
  "hasCookedMealItem": true,
  "storedItemCount": 2,
  "totalPortions": 6,
  "dishName": "Curry de poulet thaï"
}
```

The frontend calls it before opening the confirmation modal.

### Recipe deletion cascade

`DELETE /api/households/:hh/recipes/:id` always cascades when a linked `cooked_meal` Item exists. In a single transaction:

1. Delete all StoredItems with `itemId = linkedItem.id`
2. Delete the linked Item
3. Delete the Recipe (existing path: `RecipeIngredient` rows, then `Recipe`)

When no Item is linked, behaviour is unchanged.

The FK `Item.recipeId ON DELETE SET NULL` is only a safety net (in case the cascade is ever bypassed): it prevents dangling references but should never fire in normal flow, since the service always deletes the Item before the Recipe.

The user-facing confirmation (with portion count) is pure UX — the backend trusts that the frontend has shown the modal. There is no `?cascade=true` flag because there is no other meaningful behaviour to opt into.

The cascade lives in `RecipeService` — we do NOT extend `ItemCascadeDeletionService` because the trigger direction is inverted (recipe → item, not item-driven).

### Auto-cleanup of one-shot items

Extend the StoredItem deletion path in `StoredItemService.delete` (and the `consume one portion` path that reaches zero). After deleting a StoredItem, if its Item had `category = 'cooked_meal' AND recipeId IS NULL` AND no other StoredItem references it → delete the Item too.

## Frontend — add cooked meal flow

### `AddStoredItemDialog.tsx` extension

Add an `ArticleTypeToggle` at the top of the dialog: `Ingrédient` (default) / `Plat cuisiné`. Pistache for active, Encre for inactive, Funnel Sans semibold per [docs/charte-graphique.html](../../charte-graphique.html).

When `Plat cuisiné` is selected, the form mutates:

| Field | Behaviour |
|---|---|
| Dish name | Free-text input with debounced (250ms) auto-complete on `recipeStore.recipes` filtered by current household. Suggestions are `{ title, id }`. |
| Source recipe | Inline checkbox `Lier à cette recette` (checked by default) once a recipe match is selected. Unchecking demotes back to free-text. |
| Cooking date | Date picker, default today. |
| Portion count | Numeric input, default 1. |
| Storage area | Existing selector. Changing it recomputes the suggested expiration date. |
| Expiration date | Pre-filled by `computeCookedMealExpiration(storageAreaType, cookedDate)`. Editable. |
| Category | Hidden, fixed to `cooked_meal` server-side. |
| `isOpened` / `openedDate` / `daysAfterOpening` | Hidden. |
| Unit selector | Hidden, fixed to `serving`. |

On submit, posts the `articleType: 'cooked_meal'` shape described above. The frontend never creates the Item directly — backend handles it.

## Frontend — display & actions

### `MyProductsItemCard.tsx` extension

For `category === 'cooked_meal'`:

- Visual badge `Plat cuisiné` in Pistache (replacing or alongside the standard category badge)
- Sub-line `Cuisiné {{when}}` using `date-fns/formatDistanceToNow` with the user's locale
- Quantity rendered as `X portion(s)` (already handled — `serving` unit is i18n-ed to "portion" in FR)
- If `recipeId` is set, a clickable `ChefHat` icon → navigates to `/recipes/:id`
- Expiration badge / urgency indicator unchanged (computed from `expirationDate`)

### Consume one portion

New store action `consumePortion(storedItemId)`:

- If `quantity > 1` → `PUT` with `quantity -= 1`
- If `quantity === 1` → `DELETE` the StoredItem (backend then auto-cleans the Item if it was a one-shot)

Toast `Il te reste {{count}} portion(s) de {{name}}` (i18n FR/EN/ES with pluralisation).

Exposed via:
- Swipe-action on the card
- Context menu `⋯`
- Button on the detail page

The user can also directly edit the portion count (existing PUT path).

### Discard ("Jeter")

Reuse the existing DELETE. Toast wording adapts: `Plat jeté` instead of `Article jeté` for `cooked_meal`.

### Freeze ("Congeler")

The action exists today in [ExpiringSoonCard.tsx](../../../frontend/src/components/ExpiringSoonCard.tsx) (label `actionFreeze`). It moves the StoredItem to a freezer area and stamps `frozenDate`.

For cooked meals, we extend the freeze logic so the new expiration is computed via `computeCookedMealExpiration('freezer', cookedDate ?? frozenDate)` — i.e. cooked date + 60d (or frozen date + 60d if cookedDate is missing for some reason). Same UI, no new control.

## Frontend — recipe deletion cascade

In `Recipes.tsx` / `recipeStore.deleteRecipe`:

1. Pre-flight: call `GET /recipes/:id/deletion-impact`
2. Open a `Dialog` (shadcn) with charte tokens:
   - **Title**: `Supprimer cette recette ?`
   - **Body**:
     - Recipe name
     - If `storedItemCount > 0`: `Cette recette est utilisée pour {{portions}} portion(s) de {{dishName}} actuellement en stock.`
     - Warning: `Supprimer la recette supprimera aussi l'article plat cuisiné et toutes les portions en stock.`
   - **Buttons**:
     - `Annuler` (Encre 60%, paper texture)
     - `Supprimer quand même` (destructive variant, charte-coherent)
3. On confirm → `DELETE /recipes/:id`. Refresh the recipe list and the stored-items list.

If `hasCookedMealItem === false`, the modal is the existing simple delete confirmation (no extra wording).

## Constants & defaults

New module [backend/src/utils/cookedMealDefaults.ts](../../../backend/src/utils/cookedMealDefaults.ts) (mirrored at [frontend/src/utils/cookedMealDefaults.ts](../../../frontend/src/utils/cookedMealDefaults.ts)):

```ts
export const COOKED_MEAL_DEFAULT_EXPIRATION_DAYS: Record<StorageAreaType, number | null> = {
  fridge: 3,
  freezer: 60,
  pantry: null,
  kitchen_cupboard: null,
  other: null,
};

export function computeCookedMealExpiration(
  storageAreaType: StorageAreaType,
  cookedDate: Date,
): Date | null {
  const days = COOKED_MEAL_DEFAULT_EXPIRATION_DAYS[storageAreaType];
  if (days === null) return null;
  const d = new Date(cookedDate);
  d.setDate(d.getDate() + days);
  return d;
}
```

`freezerStorageRecommendations.ts` gets a `cooked_meal: 60` entry so the existing "frozen too long" alert system stays consistent.

## i18n

New keys in `en.json`, `es.json`, `fr.json` under `items.categories.cooked_meal`, and a new `cookedMeal.*` namespace:

| Key | FR | EN | ES |
|---|---|---|---|
| `items.categories.cooked_meal` | Plats cuisinés | Cooked meals | Platos cocinados |
| `cookedMeal.articleType.ingredient` | Ingrédient | Ingredient | Ingrediente |
| `cookedMeal.articleType.cookedMeal` | Plat cuisiné | Cooked meal | Plato cocinado |
| `cookedMeal.cookedAgo` | Cuisiné {{when}} | Cooked {{when}} | Cocinado {{when}} |
| `cookedMeal.dishNamePlaceholder` | Nom du plat (ex. Curry, Lasagnes…) | Dish name (e.g. Curry, Lasagna…) | Nombre del plato… |
| `cookedMeal.linkRecipeLabel` | Lier à la recette « {{title}} » | Link to recipe "{{title}}" | Vincular a la receta «{{title}}» |
| `cookedMeal.cookingDateLabel` | Date de cuisson | Cooking date | Fecha de cocción |
| `cookedMeal.portionsLeft_one` | Il te reste {{count}} portion de {{name}} | {{count}} portion left of {{name}} | Te queda {{count}} porción de {{name}} |
| `cookedMeal.portionsLeft_other` | Il te reste {{count}} portions de {{name}} | {{count}} portions left of {{name}} | Te quedan {{count}} porciones de {{name}} |
| `cookedMeal.deleteRecipeTitle` | Supprimer cette recette ? | Delete this recipe? | ¿Eliminar esta receta? |
| `cookedMeal.deleteRecipeImpact_one` | Cette recette est utilisée pour {{portions}} portion de {{dishName}} actuellement en stock. | This recipe is used for {{portions}} portion of {{dishName}} currently in stock. | Esta receta se usa para {{portions}} porción de {{dishName}} actualmente en stock. |
| `cookedMeal.deleteRecipeImpact_other` | Cette recette est utilisée pour {{portions}} portions de {{dishName}} actuellement en stock. | … | … |
| `cookedMeal.deleteRecipeWarning` | Supprimer la recette supprimera aussi l'article plat cuisiné et toutes les portions en stock. | Deleting the recipe will also delete the cooked-meal article and all portions in stock. | … |
| `cookedMeal.deleteRecipeConfirm` | Supprimer quand même | Delete anyway | Eliminar de todos modos |

`CATEGORY_ICONS` (frontend [utils/categoryIcons.tsx](../../../frontend/src/utils/categoryIcons.tsx)): add `cooked_meal: ChefHat` (distinct from `meal: UtensilsCrossed` — `meal` keeps its existing icon).

## Migration

Single migration `YYYYMMDDNN-add-cooked-meal-support.js` (one file, three concerns):

```js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Enum extension (cannot run inside a transaction)
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_items_category" ADD VALUE IF NOT EXISTS 'cooked_meal'`,
      { transaction: false }
    );

    // 2. Item.recipe_id + index
    await queryInterface.addColumn('items', 'recipe_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'recipes', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('items', ['recipe_id'], {
      name: 'idx_items_recipe_id',
      where: { recipe_id: { [Sequelize.Op.ne]: null } },
    });

    // 3. StoredItem.cooked_date
    await queryInterface.addColumn('stored_items', 'cooked_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
  },

  down: async () => {
    throw new Error('Cannot rollback enum extension; manual rollback required.');
  },
};
```

No data migration needed. Zero existing rows are touched. Deployment is purely additive.

## Acceptance criteria mapping

The original ticket's acceptance criteria all flow from the design above. Cross-reference:

| Ticket criterion | Where it lives in this design |
|---|---|
| ArticleType selector visible, defaults to Ingrédient | Section "AddStoredItemDialog extension" |
| `cooked_meal` category exists in FR/EN, in filters, in storage area config | Sections "Enum extension", "i18n" |
| Auto-complete on dish name, optional recipe link | Section "AddStoredItemDialog extension" |
| Lazy item creation on first batch | Section "Lazy item creation in StoredItemService.create" |
| Cooking date, portion count, storage area, expiration pre-fill | Section "AddStoredItemDialog extension" + "Constants & defaults" |
| Recipe rename → article rename | Section "Recipe rename sync" |
| Recipe deletion modal with portion count + cascade | Sections "Recipe deletion impact", "Recipe deletion cascade", "Frontend — recipe deletion cascade" |
| No deployment migration / no mass article creation | Section "Migration" |
| Display: portions left, cooked X days ago, expiration urgency, recipe link | Section "MyProductsItemCard.tsx extension" |
| Consume one portion / discard / freeze | Section "Frontend — display & actions" |
| Expiration notifications inherited | Inherits from existing `ExpirationNotificationService` (no change needed) |

## Risks & open questions

- **Enum extension ordering** — `ALTER TYPE` must be the first statement in the migration and run with `transaction: false`. Already accounted for.
- **Frontend dual catalog mirror** — `frontend/src/types/enums.ts` must be updated in lock-step with the backend enum. Convention enforced via [CLAUDE.md](../../../CLAUDE.md).
- **Auto-complete UX** — Debounce at 250ms is a starting point; tune in implementation if it feels laggy.
- **`meal` vs `cooked_meal` confusion in UI** — Keep `meal` icon as `UtensilsCrossed` and `cooked_meal` as `ChefHat` to make them visually distinct in filters.
- **Notifications inherit automatically** — Verify in tests that `ExpirationNotificationService` produces sensible labels for cooked meals (it currently uses `Item.name`, which will be the dish name → fine).
