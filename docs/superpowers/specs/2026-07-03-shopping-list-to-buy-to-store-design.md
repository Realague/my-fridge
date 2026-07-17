# Liste de courses — Séparation « À acheter » / « À ranger »

Date: 2026-07-03
Ticket: #180 (design source: `docs/design_shopping_list/`)

## Objectif

Séparer le parcours courses en deux étapes distinctes : cocher un article en
magasin ne le range plus immédiatement au stock, mais le fait passer dans une
section « À ranger », d'où il sera rangé au stock via l'assistant guidé une fois
rentré.

## Modèle conceptuel — 3 états

1. **À acheter** — dans la liste, pas encore dans le panier.
2. **À ranger** — acheté, en attente de rangement au stock.
3. **Rangé** — dans le stock du foyer ; l'article quitte la liste.

Les états 1 et 2 sont persistés via un champ `status`. L'état 3 n'est **pas**
persisté : ranger un article crée le `StoredItem` et **supprime** la ligne
`ShoppingItem`.

## Décisions (validées)

- **Temps réel : reporté en V2.** V1 = fetch au montage + refetch léger au focus
  de la fenêtre. Pas de WebSocket/SSE. Le chip « Synchronisé » existant reste.
- **Champ `status` enum** (`TO_BUY` | `TO_STORE`) remplace le booléen `completed`
  comme source de vérité.
- **Contrôles conservés** : toggle Rayon/A-Z + filtre catégorie, appliqués aux
  deux sections (« À ranger » suit le même mode d'affichage).

## Backend

### Enum
`ShoppingItemStatus = TO_BUY='to_buy' | TO_STORE='to_store'` ajouté dans
`backend/src/types/enums.ts` **et** `frontend/src/types/enums.ts` (miroir).

### Migration (`202607030-add-status-to-shopping-items`)
- Ajoute la colonne `status` (ENUM, défaut `to_buy`, NOT NULL).
- Backfill : `completed=false → to_buy`.
- Purge : `DELETE` des lignes `completed=true` (historique déjà stocké — le
  `StoredItem` existe déjà en stock ; les garder les ferait réapparaître à tort
  dans « À ranger »).
- Contrainte unique : remplacer `(household_id, item_id, unit, completed)` par
  `(household_id, item_id, unit, status)`.
- Supprime la colonne `completed`.
- `down` : recrée `completed`, backfill `to_store→true`/`to_buy→false`, restaure
  la contrainte, supprime `status`.

### Modèle / DTO / Repository
- `ShoppingItem` : `completed: boolean` → `status: ShoppingItemStatus`.
- DTO `ShoppingItemDto`, `UpdateShoppingItemDto`, `GetShoppingItemsQueryDto` :
  `completed` → `status`.
- Repository : les helpers de fusion (`getDuplicateShoppingItem`,
  `findByItemAndHousehold`, `getActiveQuantityByItem`) prennent un paramètre
  `status: ShoppingItemStatus` au lieu de `completed: boolean`.

### Service / Controller / Routes
- `PATCH /shopping/:id/status { status }` — déplace TO_BUY↔TO_STORE, conserve la
  logique de fusion des doublons, **sans** effet de bord stockage. Remplace
  `/toggle`.
- `POST /shopping/bulk-to-storage` — après création du `StoredItem`, **supprime**
  la ligne `ShoppingItem` (au lieu de `completed=true`). Accepte 1..N articles →
  sert « Tout ranger » et le rangement d'un article unique.
- `GET /shopping?status=to_buy|to_store` (filtre optionnel).
- Suppression des endpoints obsolètes : `/:id/toggle`, `/bulk-update`,
  `/completed` (+ handlers/méthodes associés).
- `MealService` : les appels `getDuplicateShoppingItem(..., false/true)` →
  `TO_BUY`/`TO_STORE`.

## Frontend

### Store (`shoppingStore`)
- `ShoppingItem.status` remplace `completed`.
- Getters `getToBuyItems()` / `getToStoreItems()`.
- `moveToStore(id)` / `moveToBuy(id)` → `PATCH status`, **update optimiste**
  (cochage instantané).
- `storeItems(list)` → `bulk-to-storage`, retire les lignes localement.

### Page (`Shopping.tsx`)
- Deux sections : **« À acheter »** (haut) puis **« À ranger »** (bas, masquée si
  vide). Desktop lg+ : 2 colonnes ; mobile : empilées.
- Toggle Rayon/A-Z + filtre catégorie conservés, appliqués aux deux sections.
- **À acheter** : case ronde → `moveToStore` + animation de glissement
  (framer-motion `layout`/`AnimatePresence`, respecte `prefers-reduced-motion`),
  **aucun toast**. Suppression via bouton/swipe existant (garde le toast undo).
- **À ranger** : panneau teinté vert, coche pleine ; bouton **« Tout ranger »** →
  assistant sur tous ; tap ligne / « Ranger » → assistant sur cet article ;
  **« Remettre dans à acheter »** → `moveToBuy` ; suppression → **dialog de
  confirmation**, sans undo.
- États vides : liste vide → message + CTA d'ajout ; « À ranger » vide → masquée ;
  tout rangé → message de satisfaction discret.

### Assistant de rangement
Réutilisation de `BulkStorageDialog`, généralisé pour recevoir une liste
`items` (1..N) + un titre. `onConfirm` → `storeItems` → lignes retirées.

### i18n
Nouvelles clés en/es/fr : titres de sections, « Tout ranger », « Remettre dans à
acheter », confirmation de suppression, message de satisfaction, états vides.

## Hors périmètre V1
Sync push temps réel, achats hors-liste / scan code-barres, indicateur
« X fait les courses », drag & drop entre sections, filtres avancés « À ranger »,
suggestions intelligentes de lieu.

## Critères d'acceptation
Cf. ticket #180 — structure 2 sections, transition à acheter→à ranger animée sans
toast, actions « À ranger » (tout ranger / article unique / remettre), rangement
au stock qui retire de la liste, états vides, confirmation de suppression, ajout
via « + » toujours dans « À acheter ».
