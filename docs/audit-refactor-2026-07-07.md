# Rapport d'audit — my-fridge

> **Date** : 2026-07-07
> **État audité** : branche `40-créeréditer-une-recette-amélioration` (2 commits « WIP » en tête — le rapport porte sur cet état, pas sur `main`).
> **Méthode** : audit en lecture seule, cinq explorations parallèles (architecture backend, infra/config/migrations, couche état frontend, pages/composants, duplication transversale).
> **Périmètre** : tout le monorepo — ~27 000 lignes backend (dont 8 400 de traductions générées), ~33 000 lignes frontend hors `components/ui/`.

## Synthèse

La base est fonctionnelle et l'architecture déclarée (routes → controllers → services → repositories) existe réellement, mais elle est appliquée de façon très inégale. Cinq constats dominent tout le reste :

1. **Faille de sécurité transversale (IDOR)** : la majorité des endpoints household-scopés ne vérifient jamais que l'utilisateur authentifié appartient au foyer dont il manipule les données.
2. **Les fichiers « miroirs » front/back ont déjà divergé**, avec un bug latent concret sur la conversion d'unités (tbsp/tsp).
3. **Zéro test dans tout le repo**, aucun lint/typecheck en CI, TypeScript non strict côté frontend : aucun filet pour refactorer.
4. **Le système de migrations est dangereux en l'état** : la prod auto-migre au démarrage contrairement à sa propre doc, et un admin peut migrer la prod via HTTP sans confirmation.
5. **Duplication massive** : le wrapper HTTP frontend est réimplémenté ~13 fois, la logique de merge shopping 4 fois côté backend, et la racine du repo est un second projet Vite fantôme.

---

## 1. Cartographie

**Backend** (`backend/src/`) — Express 4 + Sequelize. 16 routers montés dans `index.ts`, ~13 controllers, ~18 services, ~15 repositories, 19 modèles associés dans `models/index.ts`. Le domaine pivote autour de `Household` ; les gros services métier sont `MealService` (746 l.), `IngredientMatchingService` (499 l.), `RecipeConsumeService` (496 l.), `ShoppingItemService` (495 l.). Les migrations (55 fichiers `.js`) vivent dans `backend/src/migrations/` et sont exécutées par un moteur maison (`migrationManager` + `migrationStrategy`) au démarrage du serveur.

**Frontend** (`frontend/src/`) — React 18 + Vite + Zustand. 26 pages toutes routées dans `App.tsx`, 14 stores Zustand, 14 services, 2 Contexts React, shadcn/ui, i18n en/es/fr (3 995 clés, parfaitement synchronisées). L'auth Google vit dans `stores/authStore.ts` et tout appel API passe (en théorie) par `utils/apiAuth.ts`.

**Orchestration** : 5 docker-compose à la racine, 4 workflows GitHub Actions (build multi-arch arm64 → GHCR, déploiement sur runner self-hosted), reverse-proxy Caddy en prod.

---

## 2. Duplication et code mort

### 2.1 La racine du repo est un frontend fantôme

`package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json`, `index.html`, `eslint.config.js`, `components.json`, `postcss.config.js` à la racine dupliquent ceux de `frontend/` — versions **périmées** (pas de plugin PWA, deps manquantes, deps serveur `cloudinary`/`multer` égarées dedans) et **utilisées par rien** : ni les Dockerfiles, ni les compose, ni la CI (qui builde avec `context: ./frontend`). Double lockfile (263 KB racine + 465 KB frontend).

**Coût** : chaque montée de version ou config se fait potentiellement au mauvais endroit, et tout nouvel arrivant (humain ou outil) se trompe de projet.

### 2.2 Fichiers miroirs front/back : la synchro manuelle a déjà lâché

C'est le point le plus dangereux de la duplication, car il produit des **bugs silencieux**, pas juste du bruit :

- `frontend/src/utils/unitConversion.ts` (186 l.) vs `backend/src/utils/unitConversion.ts` (286 l.) : le backend convertit `TABLESPOON` (15 ml) et `TEASPOON` (5 ml), **le frontend ne les a pas**. Pour une recette en cuillères, le serveur agrège des quantités que le client refuse de convertir (`null`). Le backend a aussi été durci contre `undefined` là où le front peut produire `NaN` (front l.47, 152, 169). Fonctions présentes d'un seul côté : `convertVolumeToWeight`, `convertToStorageUnit`, paramètre `forStorage` de `getBestDisplayUnit` (back uniquement) ; `formatAggregatedQuantity` (front uniquement).
- `frontend/src/types/enums.ts` vs `backend/src/types/enums.ts` : valeurs d'enums identiques, mais 5 exports backend absents du front (`CATALOG_BASE_STORAGE_UNITS`, `STORAGE_UNITS`, `LINE_STORAGE_UNITS`, `isCatalogStorageUnitForCategory`, `RECIPE_UNITS`).
- `frontend/src/utils/cookedMealDefaults.ts` porte encore le commentaire « Mirrors backend » (l.5) alors que les signatures ont divergé (gardes tolérantes + `computeCookedMealExpirationISO` côté front uniquement).

**Coût** : chaque évolution d'unité/catégorie (le CLAUDE.md du projet en recense déjà trois récentes) exige une double modification sans aucun garde-fou pour détecter l'oubli.

### 2.3 Boilerplate réimplémenté en série (frontend)

- Le wrapper `createApiService()` (get/post/put/delete au-dessus de `makeAuthenticatedApiCall`) est **copié-collé dans ~8 fichiers** à l'identique (ex. `services/itemService.ts:63`, `services/storedItemService.ts:113`, `stores/householdStore.ts:72`, `stores/recipeStore.ts:28`), plus 3 copies d'un helper `call<T>()` (`notificationService`, `householdSettingsService`, `pushSubscriptionService`), une variante `apiCall()` (`mealService.ts:152`) et la version hook (`useApiWithAuth`) — **~13 réimplémentations** du même code.
- `ApiResponse<T>` est redéfini localement dans **≥ 9 fichiers** ; le helper `getHouseholdId` est copié **7 fois** dans les stores.
- 4 hooks de préférences (`useMyProductsPreferences`, `useShoppingPreferences`, `useStorageAreaSortPreferences`, `useStorageAreaSuggestion`) répliquent la même mécanique localStorage read/write/skip-first-render. `useSidebarPreferences` fait pareil mais avec `window.localStorage` direct au lieu de `getSafeStorage()`.

**Coût** : toute correction du client HTTP (timeout, header, gestion 401) doit être reportée 13 fois ; en pratique elle ne le sera pas, et les comportements divergeront (c'est déjà le cas pour la gestion d'erreur, cf. §4).

### 2.4 Duplication backend

- La logique « merge d'un article de courses en doublon avec conversion d'unité » est répétée **4 fois** : `ShoppingItemService.createShoppingItem` (l.60-89), `setShoppingItemStatus` (l.298-339), `updateShoppingItem` (l.206-228) et `MealService.commitShopping` (l.315-343).
- La vérification d'appartenance au household (`assertMember`) existe en **4 copies** (`HouseholdSettingsService.ts:77`, `ExpirationNotificationService.ts:336`, `StorageAreaService.ts:161`, inline dans `HouseholdService`) — et surtout, elle **manque** partout ailleurs (cf. §5.1).
- `buildRestoreSnapshot` est quasi identique dans `StockExitService.ts:222` et `RecipeConsumeService.ts:423` ; le bloc d'interprétation des erreurs Sequelize est dupliqué verbatim dans `RecipeController.ts` (l.153-161 et l.199-207).
- Les deux seeders `scripts/seedItemsFromCSV.ts` et `scripts/seedItemsIncremental.ts` partagent ~150 lignes recopiées (modèle local, `CATEGORY_MAP`, `parseCSVLine`…).

### 2.5 Code mort confirmé

| Élément | Fichiers | Preuve |
|---|---|---|
| Système de migration parallèle | `backend/src/utils/autoMigrate.ts`, `backend/src/utils/migrationRunner.ts` | importés nulle part ; le chemin vivant est `migrationStrategy` → `migrationManager` |
| Contexts fantômes | `frontend/src/contexts/RecipeContext.tsx`, `frontend/src/contexts/NotificationContext.tsx` | montés dans `App.tsx` mais **zéro consommateur** ; `RecipeContext` a en plus un bug d'init (`useState<Recipe[]>()` sans valeur → crash si utilisé) |
| React Query | `frontend/src/App.tsx:47,60` | `QueryClientProvider` monté, **0** `useQuery`/`useMutation` dans tout le code |
| `recipeService` à ~90 % | `frontend/src/services/recipeService.ts:246` | seul `importFromMarmiton` est consommé ; les 13 autres méthodes doublonnent `recipeStore` **et ciblent des URLs différentes** (`/api/recipes/:householdId/...` vs `/api/households/:householdId/recipes`) |
| Composant orphelin | `frontend/src/components/RecipeSelector.tsx` (217 l.) | jamais importé (seule la *page* homonyme l'est) ; contient du style legacy pré-tokens |
| Validation partielle | `backend/src/middleware/validation.ts` | `validateQuery`/`validateQueryParams` jamais utilisés ; branche `GoogleTokenVerifyDto` morte |
| Compose orphelin | `docker-compose.prod.build.yml` | référencé par aucun workflow ni script |

**Coût du mort** : au-delà du volume, il piège les modifications futures — corriger le « mauvais » `recipeService` ou le mauvais système de migration est une erreur plausible et coûteuse.

---

## 3. Couplage fort et dépendances problématiques

- **Les services contournent les repositories** de façon généralisée : `StoredItemService`, `RecipeConsumeService` (quasi exclusivement en accès directs aux modèles), `RecipeService`, `ShoppingItemService`, `StockExitService`, `RecipeAvailabilityService` appellent `Model.findAll/create/destroy` directement (ex. `RecipeConsumeService.ts:311-358`). **Coût** : la couche repository ne peut plus servir de point d'interception (scoping household, soft-delete, cache) et le refactor sécurité de §5.1 devra toucher les services eux-mêmes.
- **Deux routes sans aucune couche** : `backend/src/routes/import.ts` (~240 lignes de scraping Marmiton, axios + cheerio + parsing JSON-LD directement dans le handler) et `backend/src/routes/images.ts` (config + signature Cloudinary dans la route). Elles renvoient en plus une enveloppe `{ error }` différente du `ApiResponse` du reste de l'API.
- **Trois services de disponibilité d'ingrédients concurrents** : `RecipeAvailabilityService`, `RecipeConsumeService.getConsumePreview` et `MealService.getAvailability/getShoppingPreview` réimplémentent chacun la comparaison « besoin recette vs stock » avec la même math de conversion. Toute évolution de règle (péremption, unités) doit être faite trois fois.
- **Frontend : câblage fragile dans `components/StoreProvider.tsx`** — deux stores (`itemMinimumStore`, `loyaltyCardStore`) reçoivent leur API par injection *pendant le render* (commentaire l.14-16 : si on passe en `useEffect`, les fetches enfants deviennent des no-op silencieux), plus des imports dynamiques croisés `authStore` ↔ `householdStore` (`authStore.ts:61`, `householdStore.ts:104`). **Coût** : l'ordre de montage des providers est porteur de comportement — déplacer un provider casse des fetches sans erreur visible.
- **Trois définitions de navigation à synchroniser à la main** : `config/desktopNavigation.ts`, `config/moreNavigation.ts` et un tableau codé en dur dans `components/BottomNavigation.tsx:14-20` — déjà divergentes (clé `navigation.home` vs `navigation.dashboard` pour le même écran).
- **Montage des routes ordre-sensible** : quatre routers différents montés sur le même préfixe `/api/households` (`backend/src/index.ts:81-85`), et trois styles de montage différents selon la ressource. La doc d'endpoints de la route racine est d'ailleurs fausse (`index.ts:106` annonce `/api/recipes/:householdId/recipes` au lieu de `/api/households/:householdId/recipes`).

---

## 4. Incohérences de style, nommage et conventions

- **Deux conventions d'erreur API incompatibles** : la moitié des controllers renvoie la chaîne d'erreur dans `error` (`RecipeController`, `ItemController`, `HouseholdController`…), l'autre dans `message` (`StoredItemController`, `StorageAreaController`, `MealController`…). Le front doit deviner (`body?.error ?? body?.message` dans `recipeStore.ts:36`).
- **Deux styles de service backend** : `ShoppingItemService` et `ItemService` renvoient eux-mêmes des `ApiResponse` et avalent leurs erreurs, quand tous les autres renvoient des DTO nus et laissent le controller emballer.
- **Gestion d'erreur frontend : 4 stratégies** selon le store (stocke `error` silencieusement / `console.error` / toast direct depuis le store / rien), et `useStoreErrorToast` n'est branché que sur 5 pages — les échecs de `mealStore` et `expirationNotificationStore` sont **muets**.
- **Qualité outillée asymétrique** : backend TS `strict: true` avec toutes les options, frontend `strict: false`, `noImplicitAny: false` (`frontend/tsconfig.app.json:18-22`) ; ESLint uniquement côté front (et avec `no-unused-vars` désactivé) ; pas de Prettier ; la CI ne lance ni lint ni typecheck.
- **Nommage/forme** : hooks en kebab-case (`use-mobile.tsx`) et camelCase (`useApiWithAuth.ts`) mélangés ; 44 fichiers `export default` vs 57 exports nommés ; `PUT` et `PATCH` mélangés pour les updates ; 4 routes-alias legacy dans `routes/meals.ts:37-40` ; `var` en TS (`ShoppingItemService.ts:211`) et `require()` inline (`ItemMinimumService.ts:72`, `storedItemStore.ts:511`).
- **Trois dialectes de style UI** : tokens shadcn (`bg-card`), tokens maison `mf-*`, et valeurs arbitraires/`style` inline (`color-mix(...)` dans `MealsShoppingPreview`) ; couleurs en dur résiduelles (`#2BB673` dans `Index.tsx:52`, `#6B7280`, `text-gray-600` dans `StorageArea.tsx`…). Cosmétique, mais ça rend toute évolution de thème partielle par construction.
- **i18n** : les 3 locales sont parfaitement synchronisées (3 995 clés chacune). Quelques chaînes en dur résiduelles : `RecipeDetails.tsx:100` (`'Error'`), `Settings.tsx:117`, `OnboardingStorageSelector.tsx:84`, `Demo.tsx:177-185`, `FloatingTimerBar.tsx:151/163`.

---

## 5. Dette technique et points fragiles

### 5.1 🔴 Sécurité : contrôle d'appartenance au household absent (IDOR)

Un utilisateur **authentifié** peut lire et écrire les données de **n'importe quel foyer** en changeant l'ID dans l'URL. Les services suivants filtrent par le `householdId` de l'URL sans jamais vérifier que `req.user` en est membre :

- `StoredItemService` / `StockExitService` (toutes les routes stored-items, stock-exits, consume-portion, undo…)
- `ShoppingItemService` — en plus, `getShoppingItemById`/`updateShoppingItem`/`deleteShoppingItem`/`setShoppingItemStatus` opèrent sur l'ID brut de l'item **sans aucun scope household**
- `ItemMinimumService`, `LoyaltyCardService`
- `RecipeService` / `RecipeConsumeService` / `RecipeAvailabilityService` (toutes les routes recettes)
- `MealService` (toutes les routes meals)
- `ItemController` update/delete (vérifie que l'*item* appartient au household, jamais que l'*utilisateur* en est membre)

À l'inverse, `HouseholdService`, `StorageAreaService`, `HouseholdSettingsService` et `ExpirationNotificationService` vérifient correctement — la bonne pratique existe déjà dans la base, elle n'est appliquée que sur 4 domaines sur ~12. L'authentification elle-même est bien appliquée partout (`authenticateGoogleToken` sur tous les routers).

**Coût** : fuite de données entre foyers dès aujourd'hui ; chaque nouvel endpoint reproduit le trou tant qu'il n'existe pas de middleware mutualisé.

### 5.2 🔴 Validation backend quasi inexistante — et en partie factice

Aucune lib de validation (pas de zod/joi/express-validator). Le stub maison `middleware/validation.ts` fait un `switch` sur des noms de schémas en chaînes ; les routes items et storage-areas passent des noms **inconnus du switch** (`CreateItemDto`, `UpdateItemDto`, `CreateStorageAreaDto`, `UpdateStorageAreaDto`) → le validateur retourne toujours « ok » : la validation y est **décorative** (no-op silencieux). Les ~13 autres routers (stored-items, shopping, stock-exits, recipes, item-minimums, loyalty-cards, brands, notifications, push, images, import, household-settings, migrations) n'ont aucune validation. La seule vraie validation de shape (zod) est côté client.

**Coût** : n'importe quel body malformé atteint Sequelize ; les erreurs remontent en 500 illisibles et le contrat d'API n'est défini nulle part.

### 5.3 🔴 Écritures multi-tables sans transaction

`sequelize.transaction` est utilisé au bon endroit dans 6 flux (`RecipeConsumeService.consumeIngredients`, `RecipeService.create/update/delete`, `ShoppingItemService.bulkTransferToStorage`, les 2 services de cascade), mais une dizaine d'opérations multi-écritures n'en ont pas :

- `StockExitService.exitStoredItem` (l.64-121) : création du StockExit **puis** delete/update du StoredItem
- `StockExitService.undoExit` (l.126-169) : restore du StoredItem **puis** delete du StockExit
- `StoredItemService.createStoredItem` (flux cooked_meal) : `Item.create` puis `storedItemRepository.create`
- `StoredItemService.deleteStoredItem` / `consumePortion` : jusqu'à 3 écritures (item, notifications, cleanup)
- `MealService.commitShopping` / `confirmRemoval` / `autoCommitFromPreview` : boucles sur N ShoppingItems
- `ShoppingItemService.setShoppingItemStatus` / `updateShoppingItem` : delete du doublon + update

**Coût** : un crash au milieu laisse un état incohérent (sortie de stock loggée mais stock non décrémenté, ou l'inverse) — le genre de bug de données impossible à reproduire.

### 5.4 🔴 Migrations : la doc ment et les garde-fous sont contournables

- `ProductionMigrationStrategy` **exécute** les migrations au démarrage si `AUTO_MIGRATE !== 'false'` (`migrationStrategy.ts:100-118`), alors que `backend/MIGRATION_GUIDE.md` affirme que la prod ne fait que rapporter. La doc est fausse.
- `POST /api/migrations/run` exécute les migrations **quel que soit l'environnement, sans confirmation**, pour tout admin ; idem `/smart-run`. La garde `confirm: "I understand the risks"` de `/run-production` est donc décorative. (Les endpoints sont bien authentifiés + `requireAdmin` avec vrai contrôle DB.)
- Le validateur de doublons de `migrationManager.ts:82-83` est bugué (`substring(0,14)` sur des préfixes à 9 chiffres) : les 2 collisions de préfixes existantes (`202604261-*` ×2, `202604262-*` ×2) ne sont pas détectées.
- `.sequelizerc` pointe vers `src/config/database.js` qui n'existe pas → les scripts npm `db:migrate*` sont cassés sur le repo source.
- `NODE_ENV=development` dans `docker-compose.staging.yml:34` (et `prod.build.yml:44`) : la stratégie « staging » (dry-run + `APPROVE_MIGRATIONS`) ne s'active **jamais** dans un chemin réellement déployé. Le « staging » déployé par la CI est en réalité `docker-compose.yml` + override de port.

### 5.5 🟠 Gestion d'erreurs : le handler central ne sert à rien

Le middleware d'erreur de `backend/src/index.ts:138-144` renvoie toujours un 500 générique et **aucun controller n'appelle `next(err)`** — tout est catché localement, avec des mappings incohérents (un `householdId` manquant donne 400 sur POST mais 500 sur GET dans le même `StoredItemController`). La hiérarchie `CustomErrors` existe mais n'est pas exploitée au niveau global.

### 5.6 🟠 Auth frontend : refresh sans verrou, deux voies de redirection

`refreshTokens()` (`authStore.ts:174`) n'a aucun mutex : plusieurs 401 simultanés déclenchent plusieurs POST `/auth/refresh` concurrents (risque de déconnexions aléatoires si le serveur fait tourner les refresh tokens). Le refresh token est persisté en clair dans localStorage (`partialize` persiste `tokens` complets). Selon la voie d'appel, l'échec redirige via `window.location.href = '/auth'` (`apiAuth.ts:47,118`) ou via `navigate('/auth')` (`useApiWithAuth.ts:20`).

### 5.7 🟠 Contrat d'API non typé de bout en bout

Le front redéclare toutes les interfaces à la main et elles divergent déjà des DTOs backend :

- `quantity` : **`number` côté back** (`ItemDto.ts:83`), **`string` côté front** (`shoppingStore.ts:25`) pour ShoppingItem
- `excludeFromShopping` typé côté front (`itemService.ts:11`) mais inexistant dans le DTO back
- enums dégradés en `string` côté front (`category`, `defaultUnit`, `availableUnits`)
- `Date` vs `string` sur les timestamps (`StorageAreaDto` vs `storageAreaService`)
- deux définitions homonymes de `StorageArea` côté front (`storageAreaService.ts:4` vs `types/household.ts:3`) ; pas de fichier central de types de domaine

### 5.8 🟡 Complexité localisée et anomalies ponctuelles

- Backend : `MealService.getRemovalImpact` (~190 l.), `IngredientMatchingService.parseIngredient` (~155 l., regex Unicode dynamiques + Levenshtein maison), `RecipeConsumeService.consumeIngredients` (~150 l., 4 chemins dupliquant le log de sortie).
- Frontend : `AddStoredItemDialog.tsx` (**20 `useState`**, deux flux dans un composant), `ItemSelector.tsx` (11 states, 7 effects, combobox repositionné à la main alors que Radix Popover/Command sont dispo), `MyProducts.tsx` ↔ `StorageArea.tsx` qui dupliquent entre eux filtres/tri/hydratation/`SORT_CRITERIA`, logique métier dans le JSX (matching ingrédient↔étape calculé en plein render dans `RecipeDetails.tsx:278-299`), math d'expiration d'ouverture dupliquée verbatim (`AddStoredItemDialog.tsx:616-624` ≈ `StorageArea.tsx:360-362`).
- Calcul no-op `(x / servings) * servings` dans `RecipeAvailabilityService.ts:67`.
- Mot de passe Postgres `postgres` codé en dur non surchargeable dans les 5 compose, y compris la prod (`docker-compose.yml:26,46`). Aucun secret applicatif committé par ailleurs (Google/Cloudinary/VAPID via GitHub Secrets — vérifié).
- `README.Docker.md` périmé (décrit un flux prod abandonné).

---

## 6. Risques : ce qui sera le plus délicat à changer

1. **La logique de merge shopping (4 copies)** — toute correction doit être appliquée aux 4 sites sous peine de comportements différents selon le chemin (création directe, changement de statut, update, commit de plan de repas). Le refactor le plus « piégeux » sans tests.
2. **La math de conversion/disponibilité** (3 services + duplication front/back) — corriger la divergence tbsp/tsp **change le comportement du frontend** (des quantités deviennent soudain agrégeables) ; il faut caractériser l'existant avant.
3. **`authStore`/`apiAuth`** — tout le trafic passe par là ; une régression déconnecte tous les utilisateurs. À toucher en dernier, sous tests.
4. **`StoreProvider` et l'init au render** — le remplacement du pattern DI legacy est simple sur le papier, mais le mode de défaillance est un no-op silencieux (pages qui ne chargent plus rien, sans erreur).
5. **Le moteur de migrations maison** — le remplacer par sequelize-cli/umzug standard serait sain, mais l'état `SequelizeMeta` en prod dépend du comportement actuel (tri, préfixes 9 chiffres). À faire isolément et avec un dump de prod sous la main.
6. **Le montage des routes sur `/api/households`** — unifier les 3 styles de montage peut changer des priorités de matching Express ; à faire avec un test de fumée listant toutes les routes avant/après.
7. **Corriger l'IDOR est un changement de comportement volontaire** (des requêtes qui passaient renverront 403) — risque faible en pratique (app familiale), mais à déployer d'un bloc avec tests d'intégration, pas endpoint par endpoint sur plusieurs semaines.

---

## 7. Couverture de tests : néant — où en ajouter avant de toucher au code

Recherche exhaustive : **aucun** fichier `*.test.*`/`*.spec.*`, aucun runner installé (ni vitest, ni jest, ni supertest), `npm test` backend = placeholder qui échoue, pas de script test frontend, CI sans test/lint/typecheck.

Tests à écrire **avant** tout refactor, par ordre de levier :

1. **`unitConversion` (front + back)** — fonctions pures, triviales à tester ; prérequis des lots D/F. Écrire la même suite pour les deux fichiers rend la divergence tbsp/tsp visible et exécutable.
2. **Tests d'intégration API (supertest + Postgres jetable)** sur les flux critiques : merge shopping (les 4 chemins), `exitStoredItem`/`undoExit`, `consumeIngredients`, `commitShopping` — ils caractérisent le comportement actuel avant d'ajouter transactions et mutualisation.
3. **Tests de membership** (un utilisateur du foyer B sur les ressources du foyer A) — rouges aujourd'hui, ils *sont* la spec du correctif IDOR.
4. **`migrationManager.validateMigrations`** — fige le tri et la détection de doublons avant tout durcissement.
5. **`authStore.refreshTokens`** — un test de concurrence (2 appels simultanés → 1 seul POST) avant d'ajouter le mutex.

---

## 8. Plan de refactor hiérarchisé (lots indépendants et révisables séparément)

Ordonné du plus rentable/moins risqué au plus lourd. Chaque lot = une PR revuable isolément ; le lot A est le seul prérequis fort des autres.

### Lot A — Harnais de tests et CI *(prérequis, risque ~nul)*
Installer vitest (front+back) + supertest, écrire les tests de caractérisation du §7, ajouter `lint` + `tsc --noEmit` + tests dans `build.yml`. Aucun code de prod touché.

### Lot B — Correctif sécurité IDOR *(le plus rentable, périmètre net)*
Un middleware `requireHouseholdMember` unique (généralisation de l'`assertMember` existant) appliqué à tous les routers household-scopés + scoping par household des accès par ID brut dans `ShoppingItemService`. Changement de comportement volontaire (403), validé par les tests du lot A.

### Lot C — Purge du code mort *(risque ~nul, gros gain de lisibilité)*
Racine Vite fantôme (ne garder qu'un `package.json` d'orchestration minimal), `autoMigrate.ts` + `migrationRunner.ts`, `RecipeContext`/`NotificationContext` + leurs providers, `components/RecipeSelector.tsx`, les ~13 méthodes mortes de `recipeService` (ne garder qu'`importFromMarmiton`), `docker-compose.prod.build.yml`, retrait de React Query (ou décision explicite de l'adopter — recommandation : retirer, les stores couvrent le besoin). Chaque suppression = un commit distinct, validé explicitement avant exécution.

### Lot D — Durcissement migrations et config *(petit, forte valeur)*
Aligner code et doc (désactiver l'auto-migration prod par défaut, ou corriger MIGRATION_GUIDE.md — à trancher), exiger la confirmation sur `/run` et `/smart-run`, corriger le `substring` du validateur, réparer `.sequelizerc`, paramétrer `POSTGRES_PASSWORD`/`DB_PASSWORD` via variables d'env, corriger `NODE_ENV` du staging.

### Lot E — Client HTTP frontend unique + types centralisés *(mécanique)*
Un seul `createApiService` + un seul `ApiResponse<T>` + un `getHouseholdId` partagé ; migration des 2 stores DI (`itemMinimumStore`, `loyaltyCardStore`) vers le pattern canonique (et simplification de `StoreProvider`) ; types de domaine regroupés dans `types/` (résout les doublons `StorageArea`, `Recipe`). Vérifiable en grande partie par le typecheck.

### Lot F — Code partagé front/back (`shared/`)
Extraire `enums`, `unitConversion`, `cookedMealDefaults` dans un package/dossier partagé consommé par les deux apps. Corrige structurellement le bug tbsp/tsp — l'alignement du comportement front est un changement fonctionnel à tester (lot A.1). C'est le lot qui empêche la classe entière de bugs de resurgir.

### Lot G — Transactions + gestion d'erreurs backend
Envelopper les ~10 flux multi-écritures du §5.3 dans des transactions ; basculer les controllers sur `next(err)` + handler central mappant les `CustomErrors` ; unifier `error` vs `message` dans `ApiResponse`. Risque modéré (touche beaucoup de fichiers), couvert par les tests d'intégration.

### Lot H — Validation backend (zod)
Remplacer le stub `validation.ts` par des schémas zod par route, en commençant par les endpoints d'écriture (stored-items, shopping, recipes). Peut se faire router par router, chaque router = une PR.

### Lot I — Consolidation des services backend
Mutualiser la logique de merge shopping (1 implémentation, 4 appelants), extraire la math de disponibilité commune aux 3 services, donner une couche controller/service à `import.ts` et `images.ts`, unifier le montage des routes. Le plus délicat côté backend — à faire après G et H, sous tests.

### Lot J — Frontend UI *(le plus lourd, le moins urgent)*
Découpage des composants géants (commencer par `AddStoredItemDialog` : deux flux → deux sous-formulaires ; puis `ItemSelector` → hooks + Radix Command), mutualisation filtres/tri MyProducts↔StorageArea, source de navigation unique pour les 3 menus, résorption des couleurs en dur, activation progressive de `strict` côté front (fichier par fichier via liste d'exclusions). Découpable en autant de PRs que de composants.
