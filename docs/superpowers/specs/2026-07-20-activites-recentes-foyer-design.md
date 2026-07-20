# Activités récentes du foyer — Design

**Date :** 2026-07-20
**Statut :** approuvé (design), prêt pour planification d'implémentation

## Contexte et objectif

Transformer MyFridge d'un outil individuel partagé en un espace de coordination
familial : chaque membre voit passivement les actions récentes des autres
(ajouts au stock, liste de courses, meal plan) pour se coordonner sans demander
« qu'est-ce que tu as fait ? » et éviter les doublons.

Deux points d'affichage :
1. Section compacte « Activité récente » sur le Dashboard (5 dernières actions).
2. Page dédiée « Activité du foyer » (`/activity`) : timeline groupée par jour,
   pagination « Charger plus ».

## État de l'existant (à réutiliser)

- **`household_activities`** existe déjà, mais uniquement comme *signal de
  ranking* pour la recherche d'articles personnalisée (branche #163). Trois
  actions seulement (`item_added`, `shopping_added`, `shopping_checked`),
  colonnes `itemId` / `itemNameSnapshot`. Append-only, best-effort.
  Requêtes de ranking : `getScoreMap`, `getRecentItemRefs`, `getFrequent`.
- **`HouseholdActivityLogger`** : service best-effort qui avale toutes les
  erreurs (un échec de log ne doit jamais casser l'action utilisateur).
- **`stock_exits`** : table riche et distincte pour les sorties de stock
  (consommé / jeté / retiré), avec snapshots et `restoreSnapshot` pour l'undo.
  Possède déjà sa page `StockExitJournal.tsx` et ses composants `journal/`.
- **Undo 10 s** : implémenté côté serveur en *reverse* — l'action est exécutée
  immédiatement (la ligne existe pendant la fenêtre), et un endpoint `/undo`
  restaure l'état. Ce n'est pas un différé.
- **Navigation** : mobile via `frontend/src/config/moreNavigation.ts` (page
  `More.tsx`) ; desktop via `frontend/src/components/layout/AppSidebar.tsx`.

## Décision d'architecture

**Table unifiée + dual-write** (option retenue) :

- Généraliser `household_activities` en **journal d'activité canonique** :
  élargir l'enum d'actions, ajouter `targetType` / `targetId` / `metadata`
  (JSONB). Les colonnes existantes restent → le ranking continue de fonctionner
  sans modification.
- Les **sorties de stock** écrivent AUSSI une ligne d'activité légère
  (dual-write) au moment de la création du `StockExit`. `stock_exits` reste la
  source de vérité pour le restore ; `household_activities` n'en garde qu'une
  copie d'affichage (metadata : quantité, unité, raison, zone de stockage).
- Le feed est **une seule requête paginée simple** (keyset sur
  `createdAt, id`), pas une fusion multi-tables.

Rejeté : *merge-read* (pagination keyset multi-source complexe) et *nouvelle
table dédiée* (deux tables append-only quasi-identiques à maintenir).

## Modèle de données

Nouvelle migration `2026071900-generalize-household-activities.js`
(ne modifie jamais la migration existante).

### Enum d'actions élargi

Ajouts via `ALTER TYPE "enum_household_activities_action" ADD VALUE IF NOT
EXISTS ...` (idempotent, un `ADD VALUE` par valeur) :

Stock :
- `item_added` *(existant)*
- `item_quantity_changed`
- `item_expiration_changed`
- `item_consumed`
- `item_thrown`
- `item_removed`

Liste de courses :
- `shopping_added` *(existant)*
- `shopping_checked` *(existant)*
- `shopping_removed`

Meal plan :
- `recipe_planned`
- `recipe_servings_changed`
- `recipe_cooked`
- `recipe_unplanned`

> Note Postgres : `ALTER TYPE ... ADD VALUE` ne peut pas s'exécuter dans un bloc
> transactionnel implicite avec certaines versions ; suivre le pattern des
> migrations d'enum existantes du repo (`add-serving-to-unit-enums`, etc.).

### Nouvelles colonnes (toutes nullable)

| Colonne | Type | Rôle |
|---|---|---|
| `targetType` | ENUM(`item`, `shopping_item`, `meal`, `recipe`) | nature de l'objet concerné |
| `targetId` | UUID (pas de FK) | id de l'objet ; peut être hard/soft-deleted |
| `metadata` | JSONB | détails contextuels (voir ci-dessous) |

`itemId` / `itemNameSnapshot` sont **conservés** : les actions liées à un article
continuent de les remplir pour alimenter le ranking. Les index existants restent.
Un index couvre déjà `(householdId, createdAt)` → sert la requête du feed.

`updated_at` reste (timestamps: true) mais les entrées sont immuables en pratique.

### Contenu de `metadata` par action

Champs indicatifs (JSON libre, tout optionnel) :

| Action | metadata |
|---|---|
| `item_added` | `{ storageAreaName, quantity, unit }` |
| `item_quantity_changed` | `{ oldQuantity, newQuantity, unit, storageAreaName }` |
| `item_expiration_changed` | `{ oldDate, newDate, storageAreaName }` |
| `item_consumed` / `item_thrown` / `item_removed` | `{ quantity, unit, reason?, storageAreaName }` |
| `shopping_added` / `shopping_checked` / `shopping_removed` | `{ quantity?, unit? }` |
| `recipe_planned` | `{ recipeName, servings, plannedFor? }` |
| `recipe_servings_changed` | `{ recipeName, oldServings, newServings }` |
| `recipe_cooked` | `{ recipeName, deductedIngredientCount }` |
| `recipe_unplanned` | `{ recipeName }` |

`recipeName` est stocké en snapshot car une recette peut être renommée/supprimée.

## Backend : intégration du logging

`HouseholdActivityLogger` reste inchangé dans son principe (best-effort,
avale les erreurs). `CreateHouseholdActivityData` gagne les champs optionnels
`targetType`, `targetId`, `metadata`.

Points d'appel (dans les services, jamais dans les repositories) :

| Action | Service / méthode | Notes |
|---|---|---|
| `item_added` | `StoredItemService.create` *(déjà loggé)* | enrichir metadata (zone, qté, unité) + `targetType='item'`, `targetId=storedItem.id` |
| `item_quantity_changed` | `StoredItemService.update` | seulement si la quantité change réellement |
| `item_expiration_changed` | `StoredItemService.update` | seulement si la date change réellement |
| `item_consumed` / `item_thrown` / `item_removed` | `StockExitService.create` (**dual-write**) | mapping `StockExitType` → action ; metadata depuis les snapshots du StockExit |
| `shopping_added` | `ShoppingItemService` *(déjà loggé)* | enrichir |
| `shopping_checked` | `ShoppingItemService` *(déjà loggé)* | marquage acheté / `TO_STORE` |
| `shopping_removed` | `ShoppingItemService` (delete) | |
| `recipe_planned` | `MealService` (ajout meal) | |
| `recipe_servings_changed` | `MealService` (update servings) | seulement si changement réel |
| `recipe_cooked` | `MealService` (mark cooked) | `deductedIngredientCount` depuis la déduction |
| `recipe_unplanned` | `MealService` (retrait) | |

Chaque `log()` est appelé **hors transaction vive** (le logger est déjà conçu
pour ça), après le succès de l'opération métier.

### Gestion de l'undo (fenêtre 10 s)

L'undo étant un reverse côté serveur, chaque endpoint `/undo` **supprime la
ligne d'activité qu'il avait créée** (spec : « annulation ... empêche l'entrée
de se créer » → le feed reflète l'état final). L'immuabilité s'applique à tout
sauf cette fenêtre.

- Nouvelle méthode repo `deleteRecentForTarget(householdId, targetId, actions[])`
  qui supprime la ligne la plus récente correspondant à `targetId` + une des
  `actions` données.
- `StockExitService.undoExit` appelle cette méthode pour retirer l'entrée
  `item_consumed|item_thrown|item_removed` associée.
- Les autres undo (suppression stored item, suppression shopping item) suivent
  le même schéma s'ils créent une entrée.
- Best-effort : un échec de suppression ne casse pas l'undo.

## Backend : API du feed

Ressource household-scoped, protégée par `authenticateGoogleToken`, garde
d'appartenance au foyer comme les autres routes `/api/households/:householdId/...`.
`userId` vient de `req.user`. Réponses en `ApiResponse<T>`.

Nouvelles couches : `HouseholdActivityService` (métier) au-dessus du repo
existant, `HouseholdActivityController` (HTTP), routes montées dans `index.ts`.

### Endpoints

`GET /api/households/:householdId/activities?limit=30&before=<cursor>`
- Pagination **keyset** sur `(createdAt, id)` décroissant (pas d'OFFSET).
- `before` = curseur opaque encodant `createdAt` + `id` de la dernière entrée
  déjà vue.
- Retourne `{ entries: ActivityEntryDto[], nextCursor: string | null }`.

`GET /api/households/:householdId/activities/recent?limit=5`
- Même requête, petite limite, pas de curseur. Pour le Dashboard.

### DTO (agnostique de l'affichage)

```ts
interface ActivityEntryDto {
  id: string;
  action: HouseholdActivityAction;
  targetType: HouseholdActivityTargetType | null;
  targetId: string | null;
  itemNameSnapshot: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string; // ISO
  actor: {
    id: string;
    name: string;         // prénom / nom affiché au moment de la lecture
    avatarUrl: string | null;
    isFormerMember: boolean; // plus membre actif du foyer
  };
}
```

- L'auteur est résolu par **jointure `User`** ; `isFormerMember` vient d'un
  contrôle de `HouseholdMember` actif (membre désactivé → `true`).
- **Aucun libellé n'est construit côté API** : le front compose le texte
  (i18n). L'API ne renvoie que des données structurées.

## Frontend

Suivre `frontend/SERVICE_ARCHITECTURE.md` (factory `get/post`), pas de pattern
`initialize*` legacy.

### Service + store
- `frontend/src/services/activityService.ts` : `getFeed({ limit, before })`,
  `getRecent(limit)`.
- `frontend/src/stores/activityStore.ts` : état du feed (entrées, curseur,
  loading, hasMore), action `loadMore`, et `recent` pour le Dashboard.

### Section Dashboard — `RecentActivityCard.tsx`
- 5 dernières actions, format compact (1 ligne / action, avatar + libellé +
  temps relatif court).
- Lien « Voir tout » → `/activity`.
- **Masquée entièrement si aucune activité** (pas d'état vide affiché).

### Page dédiée — `Activity.tsx` (route `/activity`)
- Timeline **groupée par jour** : en-têtes « Aujourd'hui », « Hier »,
  « Lundi 12 mai » (date localisée).
- Au sein d'un jour : ordre **chronologique inverse** (plus récent en haut).
- Heure à gauche : **relative si < 1 h** (« il y a 30 min »), sinon absolue.
- Petit **avatar** de l'auteur devant chaque action.
- Chargement 30 par défaut + bouton **« Charger plus »** (keyset).
- Ajoutée dans le stack de routes de `App.tsx`.

### Composants dédiés `activity/`
Nouveau dossier `frontend/src/components/activity/` (on **ne** surcharge **pas**
`journal/`, spécifique aux sorties de stock) :
- `ActivityDayGroup.tsx` — en-tête de jour + liste.
- `ActivityEntry.tsx` — avatar, heure, libellé riche.
- `activityLabel.ts` — mappe `(action, metadata, itemName)` → parts de libellé.

### Navigation
- Desktop : entrée dans `AppSidebar.tsx` (icône type `Activity` / `History`).
- Mobile : entrée dans `moreNavigation.ts` (section pertinente, p.ex. la
  section liée au foyer ou une nouvelle entrée en tête).

### Libellés & i18n
- Toutes les chaînes en clés i18n, dans **en / es / fr** (fr = cible en langage
  naturel, en = fallback). Mettre à jour les 3 locales.
- `activityLabel.ts` produit un libellé avec **emphase sur l'élément clé**
  (ex. *« a ajouté **3 œufs** au **Frigo** »*) pour faciliter le scan.
- Membre ancien → suffixe « (ancien membre) » (équivalent localisé).
- Appliquer la **charte graphique Fresh** (`docs/charte-graphique.html` /
  `docs/superpowers/Charte Graphique Fresh.html`) : crème/ink, vert #2BB673,
  DM Sans + Inter, pills, mascotte.

## Vie privée / règles

- Seuls les membres du foyer voient l'activité du foyer (garde d'appartenance).
- Entrées **immuables** : ni édition ni suppression (sauf undo 10 s).
- **Aucune** action sociale (pas de like/commentaire/notification).
- Actions des anciens membres conservées, avec mention « (ancien membre) ».
- Foyer mono-membre : timeline fonctionnelle (historique perso).

## Cas particuliers (V1)

- **Actions multiples / templates** : hors périmètre V1 (le ticket templates
  n'est pas livré). Chaque action = une entrée distincte. Pas de résumé ni de
  modal d'expansion en V1.
- **Undo 10 s** : voir « Gestion de l'undo » → aucune entrée résiduelle.
- **Actions système** (déduction d'ingrédients à la cuisson) : rattachées à
  l'utilisateur déclencheur, jamais à un « système » anonyme.

## Hors périmètre V1

- Filtres (par membre / type / période).
- Modifications de recettes, stockages, paramètres du foyer.
- Connexions / déconnexions.
- Purge automatique / agrégats (rétention illimitée pour l'instant).
- Résumé des actions groupées (templates).

## Tests / vérification

Aucun test runner configuré (cf. CLAUDE.md). Vérification :
- `npm run lint` + build TS (`tsc`) sur `backend/` et `frontend/`.
- Checklist manuelle : exécuter chaque type d'action → vérifier une entrée dans
  le feed (Dashboard + page dédiée) ; annuler dans les 10 s → vérifier
  l'absence d'entrée ; vérifier le groupement par jour, le temps relatif < 1 h,
  l'avatar, « Charger plus », la mention « ancien membre », et le masquage de la
  section Dashboard quand vide.

## Critères d'acceptation (rappel synthétique)

- Stock : ajout, modif quantité, modif péremption, sorties → entrées.
- Courses : ajout, achat, suppression → entrées.
- Meal plan : ajout, modif portions, cuisson, retrait → entrées.
- Recettes/paramètres/stockages → **pas** d'entrées.
- Dashboard : section « Activité récente » (5), lien « Voir tout », masquée si
  vide.
- Page dédiée : accessible sidebar + More ; timeline groupée par jour ; tri
  inverse intra-jour ; heure (relative < 1 h) ; avatar ; 30 + « Charger plus ».
- Entrées : auteur, action, objet, détails, timestamp ; libellés fr naturels
  avec emphase.
- Vie privée : scope foyer, immuables, pas de social, « ancien membre » visible.
- Cas : undo 10 s = pas d'entrée ; pas d'entrée orpheline (toujours un userId).
