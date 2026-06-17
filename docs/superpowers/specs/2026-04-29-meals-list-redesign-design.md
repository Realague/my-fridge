# Refonte Meal Plan → Liste de repas (Meals)

**Date** : 2026-04-29
**Statut** : Validé, prêt pour planification
**Ticket** : Planification de repas — Liste et sélecteur de recettes

## Contexte

L'écran actuel `/meal-plans` est une vue calendrier (jour × créneau breakfast/lunch/dinner). L'utilisateur trouve cette structure trop rigide : il veut juste lister les recettes qu'il prévoit de cuisiner, dans l'ordre qu'il veut, avec un ajustement de portions et un récapitulatif des courses à faire.

Cette refonte **remplace** l'écran calendrier par une liste simple, ajoute un sélecteur de recettes enrichi (indicateur de disponibilité basé sur le stock), et coupe la notion de date/créneau du modèle de données.

## Périmètre

**Inclus** :
- Refonte du modèle backend `MealPlan` → `Meal` (rename de table, drop `date`/`mealType`, add `position`)
- Refonte des routes/services backend correspondantes
- Endpoints d'agrégation : disponibilité globale (résumé) + disponibilité par recette (sélecteur)
- Refonte frontend : écran `Meals.tsx`, écran `RecipeSelector.tsx`, composants associés
- Conformité à la charte graphique [docs/charte-graphique.html](../../charte-graphique.html)
- i18n FR/EN/ES

**Exclus** (hors scope explicite) :
- Drag & drop pour réordonner les repas (la colonne `position` est en place mais l'UI ne l'expose pas)
- Bouton « J'ai cuisiné » (consommation auto du stock) — l'utilisateur retire manuellement via la croix
- Suggestions automatiques de recettes
- Partage de la liste de repas entre utilisateurs

## Décisions structurantes

| # | Décision | Rationale |
|---|---|---|
| 1 | **Migration destructive** : drop `date` et `mealType` de la table `meal_plans` | La feature remplace l'ancienne, on évite la dette de schéma |
| 2 | **Rename table** `meal_plans` → `meals` | Cohérence sémantique avec la nouvelle UX (plus de notion de plan) |
| 3 | **Catégorie via `tags`** existants, pas de nouveau champ | Évite migration + UI d'édition ; convention `vegetarian/fish/meat/...` |
| 4 | **Pas de tracking de cuisson** | Outil de planification, pas de tracking ; cohérent avec le ticket |

## Modèle de données

### Migration `refactor-meal-plans-to-meals.js`

```sql
-- Up
DROP INDEX IF EXISTS meal_plans_household_id_date_meal_type;
ALTER TABLE meal_plans DROP COLUMN date;
ALTER TABLE meal_plans DROP COLUMN meal_type;
ALTER TABLE meal_plans ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
UPDATE meal_plans SET position = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY household_id ORDER BY created_at) AS rn
  FROM meal_plans
) sub WHERE meal_plans.id = sub.id;
ALTER TABLE meal_plans RENAME TO meals;
CREATE INDEX meals_household_id_position ON meals (household_id, position);

-- Down
ALTER TABLE meals RENAME TO meal_plans;
DROP INDEX IF EXISTS meals_household_id_position;
ALTER TABLE meal_plans DROP COLUMN position;
ALTER TABLE meal_plans ADD COLUMN date DATE;
ALTER TABLE meal_plans ADD COLUMN meal_type VARCHAR(20);
-- (pas de backfill de date/meal_type — données perdues)
```

### Modèle `Meal` (backend)

```ts
interface Meal {
  id: string;            // UUID
  householdId: string;   // UUID FK
  recipeId: string;      // UUID FK
  servings: number;      // INT, 1-20
  position: number;      // INT, ordre dans la liste
  notes?: string;        // TEXT (conservé)
  createdAt: Date;
  updatedAt: Date;
}
```

Associations : `Meal.belongsTo(Recipe)`, `Meal.belongsTo(Household)`. À mettre à jour dans `models/index.ts`.

### Recipe (inchangé)

`tags: string[]` continue d'exister. Convention nouvelle : les tags suivants identifient la « catégorie » d'affichage et le filtre Végétarien :

```ts
// frontend/src/types/recipeCategory.ts (et miroir backend)
export const RECIPE_CATEGORIES = ['vegetarian', 'fish', 'meat', 'pasta', 'dessert', 'other'] as const;
```

Une recette sans aucun tag de cette liste n'affiche pas de catégorie et n'est pas filtrée par « Végétarien ».

## API backend

Toutes les routes sous `/api/households/:householdId/meals`, protégées par `authenticateGoogleToken`.

| Méthode | Endpoint | Body / Query | Réponse |
|---|---|---|---|
| `GET` | `/meals` | — | `Meal[]` ordonnés par `position` ASC, avec `recipe` embedded (`id, title, prepTime, cookTime, servings, tags, imageUrl`) |
| `POST` | `/meals` | `{ recipeId, servings? }` (servings défaut = `recipe.servings`) | `Meal` créé, `position = max(position) + 1` du household |
| `PATCH` | `/meals/:id` | `{ servings }` | `Meal` mis à jour |
| `DELETE` | `/meals/:id` | — | `204` ; après delete, repack des `position` consécutives en transaction |
| `GET` | `/meals/availability` | — | Voir ci-dessous |
| `POST` | `/meals/generate-shopping-list` | — | `ShoppingListItemDto[]` (mêmes items que `availability.items` filtrés sur `missing > 0`) |

**Routes supprimées** : `getMealPlanById`, `getMealPlansByDate`, `getMealPlansByDateRange`, `getMealPlanStats`, `updateMealPlan` complet (remplacé par PATCH ciblé sur `servings`).

### Endpoint `GET /meals/availability`

```ts
interface MealsAvailability {
  totalIngredients: number;     // nombre d'items distincts requis (hors free-quantity)
  missingCount: number;          // items où missing > 0
  inStockCount: number;          // items où inStock > 0
  expiringSoon: Array<{ itemId: string; itemName: string }>;
  items: Array<{
    itemId: string;
    itemName: string;
    needed: number;
    inStock: number;
    missing: number;
    unit: Unit;
  }>;
}
```

**Calcul** :
1. Charger tous les `Meal` du household + `Recipe` + `RecipeIngredient[]`
2. Pour chaque ingrédient avec `isFreeQuantity = false` :
   - `needed = ingredient.quantity * (meal.servings / recipe.servings)`
3. Agréger par `itemId`, sommer les `needed` (avec conversion d'unité via `backend/src/utils/unitConversion.ts` si nécessaire)
4. Pour chaque item agrégé, sommer `StoredItem.quantity` du household (avec conversion d'unité)
5. `missing = max(0, needed - inStock)`
6. Flag `expiringSoon` si au moins un `StoredItem` correspondant a `isExpiringSoon()` (≤ 3 jours)

### Endpoint `GET /api/households/:householdId/recipes/availability`

Retourne pour chaque recette du household :

```ts
interface RecipeAvailability {
  recipeId: string;
  status: 'haveAll' | 'missing' | 'usesExpiring';
  missingCount: number;          // 0 si status = haveAll
  expiringIngredients: string[]; // itemNames, vide si pas concerné
}
```

**Statut prioritaire** : `usesExpiring` > `haveAll` > `missing`. Si la recette a tous ses ingrédients ET utilise un ingrédient expirant, le statut est `usesExpiring`.

## Frontend

### Routes (`App.tsx`)

| Route | Composant | Remplace |
|---|---|---|
| `/meals` | `Meals.tsx` | `/meal-plans` (`MealPlans.tsx`) |
| `/meals/add` | `RecipeSelector.tsx` | (nouveau, remplace `AddMealPlanDialog`) |

L'ancienne route `/meal-plans` n'est pas conservée (la feature remplace).

### Stores Zustand

**`mealStore.ts`** (renommé depuis `mealPlanStore.ts`) :

```ts
interface MealState {
  meals: Meal[];
  availability: MealsAvailability | null;
  loading: boolean;
  fetchMeals(): Promise<void>;
  addMeal(recipeId: string, servings?: number): Promise<void>;
  updateServings(id: string, servings: number): Promise<void>;
  removeMeal(id: string): Promise<void>;
  fetchAvailability(): Promise<void>;
  generateShoppingList(): Promise<ShoppingListItemDto[]>;
}
```

**`recipeStore.ts`** étendu :

```ts
interface RecipeState {
  // ... existant ...
  recipesAvailability: Map<string, RecipeAvailability>;
  fetchRecipesAvailability(): Promise<void>;
}
```

### Écran `/meals` — `Meals.tsx`

Mobile-first, conforme à `docs/charte-graphique.html` (palette Pistache/Encre/Papier, typo Fraunces + Funnel Sans).

**Structure** :
- Header : H1 « Mes repas » (Fraunces), sous-titre « X recettes prévues » (Funnel Sans)
- Liste verticale de `MealRow`
- Bouton outline pleine largeur « + Ajouter une recette » → navigate `/meals/add`
- `AvailabilitySummaryCard` sticky bottom (mobile) / inline (desktop)

**`MealRow.tsx`** :
- Card avec titre recette (Fraunces), méta « X min · Catégorie » (Funnel Sans / encre/60)
- Sélecteur portions : boutons ronds `[−][+]` (pistache), valeur centrale en Fraunces, range 1-20
- Croix de retrait (encre/40)

**`AvailabilitySummaryCard.tsx`** :
- « X ingrédients manquants » (nombre en Fraunces, label en Funnel Sans)
- « Y déjà dans le frigo » (idem)
- Bouton primary pistache « Préparer ma liste » → POST `/meals/generate-shopping-list` puis navigate `/shopping`
- Si `meals.length === 0` : carte cachée

### Écran `/meals/add` — `RecipeSelector.tsx`

Full-screen (pas dialog).

**Structure** :
- Header avec bouton retour + titre « Choisir une recette »
- Barre de recherche
- Chips filtres : `Tout` (défaut) / `J'ai tout` / `Rapide` / `Végétarien` (mutuellement exclusifs)
- Liste verticale de `RecipeCard` (image, titre, méta, `RecipeAvailabilityBadge`)
- Au tap sur une recette → `ConfirmServingsDialog`

**`RecipeAvailabilityBadge.tsx`** :
- `haveAll` → pill vert pistache foncé : « Tu as tout ce qu'il faut »
- `missing` → pill encre/60 sur papier : « Manque {n} ingrédient(s) »
- `usesExpiring` → pill orange ambre : « Utilise des {itemName} qui périment » (premier item de la liste)

**`ConfirmServingsDialog.tsx`** :
- Titre « Combien de portions ? »
- Sélecteur `[−][+]` pré-rempli avec `recipe.servings`, range 1-20
- Bouton « Ajouter à mes repas » → `addMeal(recipeId, servings)` puis navigate back `/meals`

### Filtres du sélecteur

| Filtre | Logique |
|---|---|
| `Tout` | Toutes les recettes du household |
| `J'ai tout` | `recipesAvailability[recipeId].status === 'haveAll' \|\| 'usesExpiring'` |
| `Rapide` | `recipe.prepTime + recipe.cookTime < 30` |
| `Végétarien` | `recipe.tags.includes('vegetarian')` |

### Suppressions

- `frontend/src/contexts/MealPlanContext.tsx` (legacy, désynchronisé du backend)
- `frontend/src/pages/MealPlans.tsx` (remplacé)
- `AddMealPlanDialog` si existe (remplacé par `RecipeSelector`)
- Provider `MealPlanProvider` retiré de `App.tsx`
- Logique calendrier semaine, navigation jours, génération avec date range

## i18n

**Nouvelles clés** sous `pages.meals.*` dans `frontend/src/i18n/locales/{en,es,fr}.json` :

```json
{
  "pages": {
    "meals": {
      "title": "Mes repas",
      "subtitle_one": "{{count}} recette prévue",
      "subtitle_other": "{{count}} recettes prévues",
      "addRecipe": "Ajouter une recette",
      "removeMeal": "Retirer",
      "servings_one": "{{count}} portion",
      "servings_other": "{{count}} portions",
      "noMeals": "Aucune recette prévue. Ajoute ta première !",
      "availability": {
        "missingCount_one": "{{count}} ingrédient manquant",
        "missingCount_other": "{{count}} ingrédients manquants",
        "inStockCount_one": "{{count}} déjà dans le frigo",
        "inStockCount_other": "{{count}} déjà dans le frigo",
        "prepareList": "Préparer ma liste"
      },
      "selector": {
        "title": "Choisir une recette",
        "search": "Rechercher...",
        "filters": {
          "all": "Tout",
          "haveAll": "J'ai tout",
          "quick": "Rapide",
          "vegetarian": "Végétarien"
        },
        "haveAll": "Tu as tout ce qu'il faut",
        "missingCount_one": "Manque {{count}} ingrédient",
        "missingCount_other": "Manque {{count}} ingrédients",
        "usesExpiring": "Utilise des {{item}} qui périment",
        "confirmServings": {
          "title": "Combien de portions ?",
          "add": "Ajouter à mes repas"
        }
      },
      "categories": {
        "vegetarian": "Végétarien",
        "fish": "Poisson",
        "meat": "Viande",
        "pasta": "Pâtes",
        "dessert": "Dessert",
        "other": "Autre"
      }
    }
  }
}
```

Anciennes clés `pages.mealPlans.*` supprimées.

## Risques et mitigations

| Risque | Mitigation |
|---|---|
| Conversion d'unités côté `availability` (ingrédient en `g`, stock en `kg`) | Réutiliser `backend/src/utils/unitConversion.ts` ; tester avec un cas mixte |
| Données existantes `meal_plans` perdent `date`/`meal_type` | Validé (option A) ; communication utilisateur via release notes si besoin |
| Recette sans tag de catégorie connu | Pas d'affichage de catégorie, exclue du filtre Végétarien — comportement acceptable |
| `generateShoppingList` sans dates | Adapter `frontend/src/services/mealPlanService.ts` (déjà supprimé/renommé) ; vérifier que `Shopping.tsx` n'appelle pas l'ancienne signature |
| Performance `availability` (N meals × M ingrédients × P storedItems) | Acceptable en MVP (households modestes) ; à monitorer ; queries indexées sur `householdId` |

## Ordre d'implémentation

Détaillé dans le plan d'implémentation (à venir via `writing-plans`). Résumé :

1. Backend : migration + modèle `Meal`
2. Backend : repo / service / controller / routes (CRUD)
3. Backend : endpoints `availability`
4. Frontend : service + store
5. Frontend : composants atomiques (`MealRow`, `AvailabilityBadge`, `AvailabilitySummaryCard`)
6. Frontend : écrans `Meals.tsx` + `RecipeSelector.tsx` + `ConfirmServingsDialog.tsx`
7. Frontend : i18n FR/EN/ES
8. Cleanup : suppression `MealPlanContext`, `MealPlans.tsx`, dead code
