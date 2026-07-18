# Spec — Recherche d'articles personnalisée

> **Type**: Feature · **Portée**: Backend + Frontend · **Deux couches**: journal d'activité (nouveau) puis
> classement personnalisé (consommateur).

## 1. Objectif

Ordonner le sélecteur d'articles selon les habitudes de l'utilisateur et de son foyer, pour
réduire le nombre de caractères à taper dans un catalogue de ~2500 articles. Deux surfaces :
ajout au stock et ajout à la liste de courses.

## 2. État des lieux (vérifié)

Le ticket suppose que « les logs d'activité du foyer » existent déjà. **C'est faux dans ce repo.**

- `stock_exits` ([StockExit.ts](../../../backend/src/models/StockExit.ts)) est la seule table de type
  journal, et elle ne couvre que les **sorties** (`consumed` / `wasted` / `removed`) — précisément
  les actions que le ticket exclut du score.
- Aucun modèle, route ou migration d'activité. Le ticket « Activités récentes du foyer » n'a jamais
  été implémenté : le Dashboard n'a qu'un commentaire
  ([Dashboard.tsx:318](../../../frontend/src/pages/Dashboard.tsx#L318)) et des clés i18n orphelines.
- La recherche est **déjà côté serveur** : `ItemSelector` appelle `GET /api/items/search?limit=20`
  (debounce 300 ms) ; le catalogue n'est jamais envoyé au client.
- `ItemRepository.findAll` ([:103-160](../../../backend/src/repositories/ItemRepository.ts#L103))
  contient déjà un scoring de pertinence **par paliers**.
- Un seul composant `ItemSelector`, partagé par 6 sites d'appel, dont 3 hors périmètre.
- « Templates » n'existe pas dans ce codebase — cette exclusion du ticket est sans objet.

## 3. Décisions arrêtées

1. **Journal d'activité complet** (option C) plutôt que dérivation des tables existantes.
2. **Additions uniquement** (option C1) : `stock_exits` reste le journal des sorties, intouché.
   Un futur flux Dashboard lira l'union des deux tables. Évite de toucher à la machinerie
   d'annulation de `StockExitService` (fenêtre d'undo 60 s, `restoreSnapshot`, cascade).
3. **Backfill de tout l'historique** depuis `stored_items`, sinon la feature est inerte 30 jours.
4. **Section « Tous les articles » en scroll infini** (`offset` existe déjà côté service).
5. **Accent-folding hors périmètre** → ticket de suivi (voir §9).

## 4. Couche 1 — Journal d'activité

### Table `household_activities`

Migration `202607180-create-household-activities-table.js`.

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `householdId` | UUID NOT NULL | FK → `households.id` |
| `userId` | UUID NOT NULL | FK → `users.id` — nom générique (pas `exitedBy`, verbe spécifique) |
| `itemId` | UUID NULL | **pas de FK**, volontairement — cf. [StockExit.ts:94](../../../backend/src/models/StockExit.ts#L94) |
| `itemNameSnapshot` | STRING NULL | convention snapshot existante |
| `action` | ENUM | `item_added` / `shopping_added` / `shopping_checked` |
| `createdAt` / `updatedAt` | DATE | géré par Sequelize |

L'absence de FK sur `itemId` satisfait « article supprimé du catalogue → ignoré, pas d'erreur » :
la ligne survit, la jointure ne rend rien, le scoreur l'ignore.

Pas de colonnes `quantity` / `unit` : le classement compte des évènements, et la quantité reste
disponible dans les tables sources si un futur flux en a besoin.

### Index

- `(householdId, userId, createdAt)` — « Tes récents » + score personnel
- `(householdId, action, createdAt)` — score foyer
- `(householdId, createdAt)` — futur flux Dashboard

### Points d'écriture

| Service | Méthode | Action |
|---|---|---|
| `StoredItemService` | `createStoredItem` ([:20](../../../backend/src/services/StoredItemService.ts#L20)) | `item_added` |
| `ShoppingItemService` | `createShoppingItem` ([:32](../../../backend/src/services/ShoppingItemService.ts#L32)) | `shopping_added` |
| `ShoppingItemService` | `setShoppingItemStatus` ([:283](../../../backend/src/services/ShoppingItemService.ts#L283)) | `shopping_checked`, uniquement `to_buy → to_store` |
| `ShoppingItemService` | `bulkTransferToStorage` ([:394](../../../backend/src/services/ShoppingItemService.ts#L394)) | `item_added` (transaction déjà présente) |

Il n'y a pas de case à cocher dans cette app : le `shopping_checked` du ticket correspond à la
transition `to_buy → to_store` introduite par « liste de courses séparation à acheter / à ranger ».

**Politique d'échec** : la journalisation ne casse jamais l'action utilisateur. Là où une
transaction existe, l'écriture la rejoint ; sinon best-effort avec log d'erreur.

### Backfill

Dans la même migration, `INSERT … SELECT` depuis `stored_items` : tout l'historique, **y compris
`deletedAt IS NOT NULL`** (un article consommé reste la preuve d'un ajout). `createdBy → userId`,
`createdAt → createdAt`, action `item_added`. **Écrit par lots**, pas en une seule instruction.

`shopping_added` n'est pas backfillable (lignes hard-deleted) — sans conséquence : un ajout devenu
stock a déjà laissé une trace `item_added`.

## 5. Couche 2 — Score et API

### Le scoring existant est par paliers

`ItemRepository` attribue : exact `1000`, préfixe `500`, contient `100`, `+200` article du foyer,
`+50` multi-mots ; égalités départagées alphabétiquement.

La formule du ticket (`pertinence * 10 + perso * 3 + foyer * 1`) suppose une pertinence linéaire
qui n'existe pas ici. Appliquée telle quelle, un score perso de 47 ajoute 141, et à 200 un match
« contient » dépasserait un match « préfixe » — ce qui contredit l'intention explicite du ticket :
*« le match textuel reste dominant »*.

### Boost saturé

Le ticket autorise l'ajustement (*« formule indicative, à ajuster lors de l'implémentation »*).

```
personalBoost  = min(personalCount, 20) * 3    // max 60
householdBoost = min(householdCount, 20) * 1   // max 20
finalScore     = relevanceScore + personalBoost + householdBoost   // max +80
```

L'écart minimal entre paliers est de 400 : +80 ne peut jamais promouvoir un « contient » au-dessus
d'un « préfixe ». La fréquence **remplace le départage alphabétique à l'intérieur d'un palier**, et
rien de plus — exactement ce que demande le ticket.

Vérification sur l'exemple du ticket : « Œuf » et « Œuf de caille » sont tous deux des préfixes
(500), donc perso 47 vs 2 les ordonne correctement ; « Œillet » à 500 + 0 passe dessous.

Les plafonds (20/20) sont volontairement conservateurs et isolés en constantes.

### Source des scores

Une seule requête `GROUP BY itemId` sur `household_activities`, fenêtre 30 jours glissants,
renvoyant compteurs perso **et** foyer en une passe. Le résultat est borné par le nombre d'articles
distincts touchés par le foyer en 30 jours (des dizaines) → map en mémoire lue par le scoreur.

**Pas de vue matérialisée** : l'agrégat est petit, et un rafraîchissement nocturne trahirait la
promesse du ticket que le score « reflète toujours la vérité de l'historique ». Mesurer d'abord ;
n'ajouter un cache que si nécessaire.

### Endpoints

1. `GET /api/households/:householdId/item-suggestions`
   → `{ recent, personalFrequent, householdFrequent }` (5 / 8 / 5), **dédupliqués côté serveur**
   dans cet ordre de priorité : aucun article ne peut apparaître deux fois.
   Chaque entrée de `recent` porte un `lastSelectedAt` (ISO) — nécessaire à l'indicateur
   « il y a 2 jours » ; `personalFrequent` / `householdFrequent` n'en ont pas besoin.
   La **section 4 n'est pas servie par cet endpoint** : elle vient de `GET /api/items/search`
   avec `search` vide, qui trie déjà alphabétiquement
   ([ItemRepository.ts:162-164](../../../backend/src/repositories/ItemRepository.ts#L162)) et
   accepte `offset` — c'est ce qui alimente le scroll infini.
2. `GET /api/items/search` accepte un `householdId` optionnel ; `userId` vient de `req.user`.
   **Sans ce paramètre, le comportement est identique à aujourd'hui** — c'est ainsi que recettes,
   minimums et import restent hors périmètre.

**Règle foyer mono-membre** côté serveur : `householdFrequent` renvoie un tableau vide (seul le
backend connaît le nombre de membres).

## 6. Couche 3 — Frontend

### Activation par un prop

`ItemSelector` gagne `personalized?: boolean` (défaut `false`). À `false`, tous les chemins de code
sont ceux d'aujourd'hui. Activé sur trois sites :

- [AddStoredItemDialog.tsx:400](../../../frontend/src/components/AddStoredItemDialog.tsx#L400) — ajout au stock
- [StorageArea.tsx:296](../../../frontend/src/pages/StorageArea.tsx#L296) — formulaire inline par zone (stock également)
- [Shopping.tsx:456](../../../frontend/src/pages/Shopping.tsx#L456) — ajout manuel, via `AddItemCard`

Inchangés : `StructuredIngredientInput` (recettes), `ItemMinimumDialog`, `ImportRecipe`.

### Comportements

- **À l'ouverture** : fetch `/item-suggestions` au focus (remplace `loadHouseholdItemsOnDemand`
  quand `personalized`), rendu en 4 sections titrées. Une section dont le tableau est vide n'est
  pas rendue — c'est ainsi que « nouvel utilisateur », « inactif 30+ jours » et « foyer
  mono-membre » se règlent sans cas particulier client.
- **Pendant la frappe** : les sections disparaissent ; les résultats arrivent déjà classés par le
  serveur, le client ne trie pas. Debounce inchangé (300 ms).
- **Section 4** : suppression de `slice(0, 8)`
  ([ItemSelector.tsx:592](../../../frontend/src/components/ItemSelector.tsx#L592)). Le dropdown
  devient un conteneur `max-height` avec `onScroll` qui pagine `searchItems({ offset })` par 20.
  **Pas de virtualisation** : on ne détient que ce qui a été paginé.
  Le handler `wheel` existant (qui neutralise `react-remove-scroll` de Radix) doit être **préservé**
  — il est indispensable au portal.

Retirer le plafond corrige au passage un bug existant : 12 résultats sur 20 étaient silencieusement
jetés.

### Décisions d'implémentation

1. **Pas de React Query**, bien qu'il soit monté : il y a zéro `useQuery` dans tout le codebase.
   On suit le pattern existant (services + état local), mais avec un **cache module-level des
   suggestions, clé `householdId`, TTL court** — le cache par instance actuel (`useRef`) est la
   raison pour laquelle N lignes d'ingrédients déclenchent N requêtes identiques.
2. **Réutiliser l'helper de temps relatif** de
   [journalGrouping.ts](../../../frontend/src/utils/journalGrouping.ts) pour « il y a 2 jours ».

### Style et i18n

Charte Fresh : titres de section en gris atténué, séparateurs discrets, une seule liste scrollable.
Nouvelles clés `itemSelector.sections.*` (`recent`, `frequent`, `householdFrequent`, `allItems`) en
**en / es / fr**, `en` en fallback.

## 7. Cas particuliers

| Cas | Traitement |
|---|---|
| Nouvel utilisateur / foyer vierge | Tableaux vides → sections non rendues → catalogue alphabétique seul |
| Inactif 30+ jours | Compteurs perso vides → « Souvent utilisés » absente ; « Tes récents » reste (pas de fenêtre temporelle) |
| Foyer mono-membre | `householdFrequent` vide côté serveur |
| Article supprimé du catalogue | Ligne conservée (pas de FK), jointure vide, ignoré |
| Articles personnalisés du foyer | Comptés à l'identique ; bénéficient déjà du `+200` existant |
| Article jamais sélectionné | Boost nul → catalogue uniquement |

**Levée d'ambiguïté — portée de la déduplication.** Le critère « aucun doublon entre les sections »
s'applique **aux sections 1-3 entre elles**. La section 4 est « tous les articles » par définition et
répète donc les articles déjà suggérés au-dessus. L'alternative (exclure les suggérés du catalogue)
obligerait à filtrer un flux paginé côté serveur page par page, pour un gain nul : l'utilisateur qui
scrolle jusqu'à « Lait » dans l'alphabet ne sera pas surpris de l'y trouver.

## 8. Vérification

Il n'existe **aucun runner de test** : le `npm test` du backend est un placeholder qui sort en
erreur, le frontend n'en a pas. La vérification est donc manuelle sur une DB de dev — le backfill
est ce qui la rend possible dès le premier jour.

- Migration up/down sur DB seedée ; volumétrie backfillée cohérente avec `stored_items`.
- Chacun des 4 points d'écriture produit exactement une ligne, avec la bonne action.
- Sections : cardinalités 5 / 8 / 5, aucun doublon inter-sections, masquage correct (utilisateur
  neuf, foyer mono-membre).
- Classement : saisir `œ`, `lai`, `p` — les articles fréquents remontent **dans leur palier**, et
  un article rare reste trouvable en tapant son nom complet (garde-fou anti-sur-pondération).
- Scroll infini : pagination, pas de doublon aux frontières de page, scroll-lock toujours neutralisé
  dans un dialog Radix.

## 9. Risques

1. **Le handler de scroll du portal est la partie la plus délicate.** Un handler `wheel` custom
   lutte déjà contre `react-remove-scroll`. Repli : première page uniquement (bascule sans coût).
2. **Backfill non borné** → écriture par lots obligatoire.
3. **`shopping_added` favorise les utilisateurs qui rangent peu leur liste** (supprimer un article
   non acheté laisse le score). Acceptable : le ticket veut prédire l'*intention d'ajouter*.
4. **Les plafonds de saturation (20/20) sont des estimations** — deux constantes, ajustables.

## 10. Hors périmètre

- **Accent-folding** → ticket de suivi. Le ticket le présente comme existant, mais ni le client ni
  le `Op.iLike` backend ne normalisent les accents : son propre exemple « œ » → « Œuf » échoue
  aujourd'hui. Correction propre = normalisation serveur (`unaccent` ou colonne fantôme
  normalisée) + migration ; orthogonal au classement.
- **Flux d'activité du Dashboard** : la table le rend possible, ce ticket ne le construit pas.
- Sélecteurs recettes / minimums / import.
- Toutes les « Évolutions futures » du ticket (contextuel, cooccurrence, cross-foyers, tri
  configurable).
