# Catalogue de recettes — Vague 0 : Fondations (modèle de données)

Date : 2026-08-10
Statut : validé, prêt pour plan d'implémentation

## Objectif

Poser le socle de données du catalogue de recettes communautaire : deux tables
(`catalog_recipes`, `catalog_recipe_ingredients`) et la logique de copie d'une
recette perso vers le catalogue.

Aucune fonctionnalité visible n'est livrée. Ni route, ni contrôleur, ni service
applicatif, ni UI, ni changement sur les recettes privées existantes.

## Principe

Publier = créer une **copie figée** dans le catalogue global. Les deux entités
(recette perso, recette catalogue) sont ensuite totalement indépendantes :
modifier l'une n'altère pas l'autre. Le lien `itemId` vers le catalogue
d'articles est préservé quand il est exploitable, car c'est lui qui permettra le
croisement avec le stock en Vague 3.

## Contraintes du repo relevées

- Migrations dans `backend/src/migrations/` (voir `.sequelizerc`), colonnes en
  **camelCase quotées**, tables en snake_case pluriel.
- Tests via vitest, avec interdiction explicite de toucher la DB ou le réseau
  (`backend/vitest.config.ts`).
- La difficulté existante est `'Easy' | 'Medium' | 'Hard'`
  (`backend/src/models/Recipe.ts`).
- **`items.householdId` est nullable** : `NULL` = article du catalogue global
  partagé, non-null = article créé par un foyer et privé à ce foyer. C'est le
  point structurant de ce ticket (voir « Décision 1 »).
- Le document `vision-catalogue-recettes.md` cité par le ticket n'existe pas dans
  le repo ; ce spec s'appuie uniquement sur le contenu du ticket.

## Décisions

### Décision 1 — Les `itemId` privés ne sont pas copiés

Un ingrédient de recette perso peut pointer vers un `Item` privé au foyer auteur.
Copier cet `itemId` tel quel dans une table publique exposerait l'identifiant
d'une donnée privée à tous les foyers, sans qu'aucun d'eux puisse la lire ni
l'exploiter pour le croisement de stock.

Règle retenue, appliquée ingrédient par ingrédient à la copie :

- `item.householdId === null` (article global) → `itemId` **préservé**.
- `item.householdId !== null` (article privé) → `itemId = null` et
  `rawText = item.name`.

Le nom de l'ingrédient reste donc toujours affichable. Le re-mapping d'un
`rawText` vers un article global (via `IngredientMatchingService`) est un
travail de Vague 1/3, hors périmètre ici.

Conséquence : `rawText` sert deux cas, pas un seul — l'agrégation externe non
mappée **et** l'article privé démappé à la publication.

### Décision 2 — Copie fidèle complète

Le schéma suggéré par le ticket omet `tags` (recette), `notes` et `usedInSteps`
(ingrédients). Ils sont ajoutés : le coût est nul maintenant, et sans eux une
recette publiée serait une version dégradée de l'originale et le fork de la
Vague 3 restituerait une recette perso amputée. Éviter une migration ultérieure.

### Décision 3 — `difficulty` réutilise l'enum existant

`'Easy' | 'Medium' | 'Hard'` plutôt que `facile/moyen/difficile`. Le ticket
laisse le choix ; l'alignement rend publication et fork sans perte et évite une
table de correspondance.

## Modèle de données

### `catalog_recipes`

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | UUID | PK, défaut UUIDV4 |
| `title` | STRING | NOT NULL, longueur 1–255 |
| `description` | TEXT | NULL |
| `instructions` | JSON | NOT NULL, défaut `[]` — `RecipeStep[]` |
| `tags` | JSON | NOT NULL, défaut `[]` |
| `prepTime` | INTEGER | NOT NULL, ≥ 0 |
| `cookTime` | INTEGER | NOT NULL, ≥ 0 |
| `servings` | INTEGER | NOT NULL, ≥ 1 |
| `difficulty` | ENUM(`Easy`,`Medium`,`Hard`) | NOT NULL, défaut `Easy` |
| `imageUrl` | TEXT | NULL |
| `authorUserId` | UUID | NULL → `users(id)` ON DELETE SET NULL |
| `authorHouseholdId` | UUID | NULL → `households(id)` ON DELETE SET NULL |
| `sourceRecipeId` | UUID | NULL → `recipes(id)` ON DELETE SET NULL |
| `originType` | ENUM(`community`,`aggregated`) | NOT NULL, défaut `community` |
| `sourceUrl` | TEXT | NULL — traçabilité de l'agrégation |
| `sourceDomain` | STRING | NULL — miroir de `recipes.sourceDomain` |
| `status` | ENUM(`published`,`under_review`,`removed`) | NOT NULL, défaut `published` |
| `publishedAt` | DATE | NOT NULL, défaut `CURRENT_TIMESTAMP` |
| `createdAt` / `updatedAt` | DATE | timestamps Sequelize |

**Tous les FK auteur/source sont en `SET NULL`, jamais `CASCADE`.** C'est la
traduction en schéma de la règle d'indépendance : supprimer la recette perso
d'origine, le foyer ou le compte de l'auteur ne doit pas faire disparaître la
copie catalogue.

Index :

- `(status, publishedAt)` — listing du catalogue (Vague 1)
- `(authorHouseholdId)`, `(authorUserId)` — profil contributeur
- `(originType, status)` — filtrage communauté / agrégation
- unique partiel sur `(sourceRecipeId)` `WHERE sourceRecipeId IS NOT NULL AND
  status <> 'removed'` — garantit une seule copie catalogue vivante par recette
  perso, ce qui rend le « republier = mettre à jour » de la Vague 1
  déterministe.

### `catalog_recipe_ingredients`

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | UUID | PK, défaut UUIDV4 |
| `catalogRecipeId` | UUID | NOT NULL → `catalog_recipes(id)` ON DELETE CASCADE |
| `itemId` | UUID | NULL → `items(id)` ON DELETE SET NULL |
| `rawText` | TEXT | NULL |
| `quantity` | DECIMAL(10,3) | NULL |
| `unit` | ENUM(...UNITS) | NOT NULL, défaut `piece` |
| `isFreeQuantity` | BOOLEAN | NOT NULL, défaut `false` |
| `notes` | TEXT | NULL |
| `usedInSteps` | JSON | NOT NULL, défaut `[]` |
| `displayOrder` | INTEGER | NOT NULL, défaut `0` |
| `createdAt` / `updatedAt` | DATE | timestamps Sequelize |

Validations au niveau modèle :

- **Au moins un de `itemId` / `rawText` doit être renseigné.** Un ingrédient
  totalement vide n'a pas de sens ; un ingrédient `rawText` seul est
  explicitement valide.
- `quantity` requis et strictement positif sauf si `isFreeQuantity` est vrai —
  même règle que `RecipeIngredient`.
- Les unités gestuelles (`FREE_QUANTITY_UNITS` : pincée/filet/noix) forcent
  `isFreeQuantity = true` — même règle que `RecipeIngredient`.

**Pas de contrainte unique `(catalogRecipeId, itemId)`**, contrairement à
`recipe_ingredients` : `itemId` peut être `NULL` sur plusieurs lignes d'une même
recette agrégée, et deux ingrédients non mappés ne doivent pas se bloquer
mutuellement.

Index : `(catalogRecipeId, displayOrder)` pour l'affichage ordonné, `(itemId)`
pour le croisement futur avec le stock.

### Associations (`models/index.ts`)

```
CatalogRecipe.hasMany(CatalogRecipeIngredient, { foreignKey: 'catalogRecipeId', as: 'ingredients', onDelete: 'CASCADE' })
CatalogRecipeIngredient.belongsTo(CatalogRecipe, { foreignKey: 'catalogRecipeId', as: 'catalogRecipe' })

Item.hasMany(CatalogRecipeIngredient, { foreignKey: 'itemId', as: 'catalogRecipeIngredients' })
CatalogRecipeIngredient.belongsTo(Item, { foreignKey: 'itemId', as: 'item' })

User.hasMany(CatalogRecipe, { foreignKey: 'authorUserId', as: 'publishedRecipes' })
CatalogRecipe.belongsTo(User, { foreignKey: 'authorUserId', as: 'author' })

Household.hasMany(CatalogRecipe, { foreignKey: 'authorHouseholdId', as: 'publishedRecipes' })
CatalogRecipe.belongsTo(Household, { foreignKey: 'authorHouseholdId', as: 'authorHousehold' })

Recipe.hasOne(CatalogRecipe, { foreignKey: 'sourceRecipeId', as: 'catalogPublication' })
CatalogRecipe.belongsTo(Recipe, { foreignKey: 'sourceRecipeId', as: 'sourceRecipe' })
```

## Logique de copie

### Fonction pure

`backend/src/services/catalogRecipe/buildCatalogRecipeFromRecipe.ts`

```ts
buildCatalogRecipeFromRecipe(
  recipe: Recipe & { ingredients: (RecipeIngredient & { item: Item })[] },
  options: { authorUserId: string }
): {
  recipe: CatalogRecipeCreationAttributes;
  ingredients: Omit<CatalogRecipeIngredientCreationAttributes, 'catalogRecipeId'>[];
}
```

Règles :

1. **Snapshot profond.** `instructions`, `tags`, `usedInSteps` sont clonés, jamais
   partagés par référence avec la recette source. C'est ce qui garantit
   techniquement l'indépendance des deux entités.
2. **Filtrage des items privés** (Décision 1).
3. `sourceRecipeId = recipe.id`, `authorHouseholdId = recipe.householdId`,
   `authorUserId` fourni par l'appelant, `originType = 'community'`,
   `status = 'published'`, `publishedAt = now`.
4. `sourceUrl` / `sourceDomain` recopiés depuis la recette perso quand présents
   (recette importée puis publiée).
5. `displayOrder` = index d'itération sur les ingrédients.

La fonction est pure : elle ne lit rien, n'écrit rien, ne dépend d'aucune
connexion. Elle porte toute la logique métier de la copie et concentre donc
l'essentiel des tests.

### Repository

`backend/src/repositories/CatalogRecipeRepository.ts`, deux méthodes seulement :

- `createFromRecipe(recipeId, authorUserId)` — charge la recette perso avec ses
  ingrédients et leurs articles, appelle le builder, insère la recette puis les
  ingrédients (`bulkCreate`) **dans une transaction**. Prend un identifiant
  plutôt qu'une instance déjà chargée : la copie a besoin du `householdId` de
  chaque article pour décider quels `itemId` sont publiables, et c'est au
  repository de garantir que ces données sont bien présentes.
- `findByIdWithIngredients(id)` — lecture avec `ingredients` et `item` inclus.

Pas de service applicatif, pas de contrôleur, pas de route : la Vague 1 les
ajoutera au-dessus.

## Migration

Un seul fichier : `backend/src/migrations/202608100-create-catalog-recipes-tables.js`.

- `up` : `createTable('catalog_recipes')`, `createTable('catalog_recipe_ingredients')`,
  puis les index (dont l'index unique partiel, via `queryInterface.addIndex`
  avec `where`, ou SQL brut si nécessaire).
- `down` : `dropTable` × 2 (ingrédients d'abord) puis
  `DROP TYPE IF EXISTS` des enums créés
  (`enum_catalog_recipes_difficulty`, `enum_catalog_recipes_originType`,
  `enum_catalog_recipes_status`, `enum_catalog_recipe_ingredients_unit`).

**Aucun `ALTER` sur `recipes` ou `recipe_ingredients`.** La non-régression sur
les recettes privées est donc structurelle, pas seulement testée.

## Tests

Dans `backend/src/services/catalogRecipe/__tests__/`, sous vitest, **sans accès
DB ni réseau** conformément à la contrainte du repo.

| Test | Critère d'acceptation |
|---|---|
| la copie préserve `itemId` des articles globaux, quantités, unités et ordre | « préserve les ingrédients et leurs item_id » |
| article privé → `itemId: null` + `rawText` = nom de l'article | Décision 1 |
| muter la recette perso **après** `build` laisse le payload inchangé (instructions, tags, ingrédients) | « modifier la recette perso n'altère pas la version catalogue » |
| `CatalogRecipeIngredient.build({ rawText, itemId: null }).validate()` passe | « un ingrédient sans item_id est accepté » |
| `build({ itemId: null, rawText: null }).validate()` échoue | garde-fou de validation |
| `tags`, `notes`, `usedInSteps`, `instructions` copiés fidèlement | Décision 2 |
| `originType = 'community'`, `status = 'published'`, `sourceRecipeId` renseigné | champs d'origine et de statut |

Risque identifié : les tests de validation instancient des modèles Sequelize
sans connexion. Si l'import de `config/database` s'avère exiger des variables
d'environnement au chargement, ces deux cas basculent sur un test de la fonction
de validation extraite. À vérifier à l'implémentation.

## Hors périmètre

Interface de publication, page catalogue, recherche, agrégation effective,
notations/commentaires, modération active, croisement avec le stock, fork.
Toutes ces briques sont des Vagues 1 à 3.
