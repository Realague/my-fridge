# Spec — Journal des sorties (stock exit journal)

> **Type**: Feature · **Portée**: Desktop + Mobile · Frontend-heavy (data layer already exists)
> **Dépend de**: feature *Sorties de stock* (déjà implémentée: table `stock_exits`, `GET /stock-exits`).

## 1. Objectif

Page de consultation en lecture seule de toutes les sorties de stock (consommé / jeté /
retiré) d'un foyer : un **résumé chiffré** (compteurs par type + taux anti-gaspi) au-dessus,
et l'**historique chronologique filtrable** en dessous. Recrée les prototypes de
`docs/superpowers/design_journal_sorties_de_stock/` (haute fidélité) avec les composants et
tokens Fresh déjà en place.

## 2. Ce qui existe déjà (réutiliser)

- Table `stock_exits` + snapshots dénormalisés (`itemNameSnapshot`, `categorySnapshot`,
  `storageAreaNameSnapshot`, `expirationDateSnapshot`), `exitType`, `quantity`, `unit`,
  `exitedBy` + association `exitedByUser`.
- `GET /api/households/:householdId/stock-exits?limit=&offset=` → `StockExitDto[]` (tri
  `createdAt DESC`). Frontend : `stockExitService.listExits`.
- Tokens Fresh (`bg-mf-green`, `text-mf-green-deep`, `bg-mf-danger-soft`, `.mf-card`,
  `.mf-badge-*`, `.mf-stat`, `.mf-thumb`, `font-display`), `lucide-react`, `StorageAreaIcon`,
  `CategoryIcon`, membres via `householdStore`, `AppShell` + `breadcrumb.tsx`.

## 3. Décisions arrêtées

1. **Stats** : nouvel endpoint d'agrégats (pas de calcul client approximatif).
2. **Barre d'outils** : onglets par type + filtre Membre + filtre Période.
   Panneau « Filtres » avancé = ticket de suivi (bouton présent, désactivé).
   (Export retiré — jugé non utile.)
3. **Champ contexte (↳)** : hors périmètre (backend n'a pas de `note`, la capture appartient
   au ticket amont). Affiché uniquement si le DTO en fournit un un jour.
4. **Portée** : globale au foyer, stockage affiché par ligne.

## 4. Backend (minimal, sans migration)

- `listExits` accepte `from`, `to` (ISO), `exitType`, `exitedBy` optionnels → `where` dans
  `StockExitRepository.findAll`. Rend Période / Membre / Type **filtrés côté serveur** et
  cohérents avec la pagination.
- `GET /:householdId/stock-exits/stats?from&to&exitedBy` →
  `{ current: {consumed,wasted,removed}, previous: {consumed,wasted,removed} | null }`.
  `previous` calculé seulement si `[from,to)` couvre exactement un mois calendaire (pilote
  « +8 vs mai ») ; sinon `null` → deltas masqués. Compté via `GROUP BY exitType`.

## 5. Frontend

- Route `/products/journal` dans le groupe `AppShell` de `App.tsx`.
- Bouton d'entrée « Journal des sorties » (icône `History`) dans l'en-tête de `MyProducts.tsx`.
- React Query : `useInfiniteQuery` (timeline paginée) + `useQuery` (stats). État des filtres
  local ; tout changement refetch (offset remis à 0), scroll infini qui append.

### Composants (petits, à responsabilité unique)

- `StockExitJournal.tsx` — page (fetch, état filtres, layout responsive desktop/mobile).
- `JournalSummary.tsx` — 4 cartes (Consommés / Jetés / Retirés / Taux anti-gaspi + barre
  empilée + légende). Couleur des deltas = *favorabilité* (plus de consommés = vert, plus de
  jetés = défavorable) ; delta masqué si `previous` null.
- `JournalToolbar.tsx` — onglets type + compteurs, select Membre (masqué si 1 membre), select
  Période (Ce mois / Mois dernier / 30 derniers jours / Tout), bouton Filtres (désactivé).
- `JournalDayGroup.tsx` + `JournalEntry.tsx` — en-tête de jour (Aujourd'hui/Hier/date +
  résumé du jour) et ligne d'entrée (liseré, vignette `CategoryIcon`, nom, badge catégorie,
  stockage `StorageAreaIcon`, badge d'action, quantité, membre avatar+prénom, heure).
- `JournalEmptyState.tsx` — vide-filtre (« Aucune sortie ne correspond… » + réinitialiser) vs
  vide-total (mascotte + message encourageant).
- Helpers : `journalGrouping.ts` (groupe par jour + libellés relatifs), `antiGaspi.ts` (taux).

## 6. Règles métier

- Taux anti-gaspi = `round(consumed / (consumed + wasted) * 100)`, `removed` exclu.
- Les compteurs (cartes + onglets) reflètent Période + Membre, **pas** l'onglet type actif.
- Résumé du jour = « {n} sorties · {x} consommés · {y} jetés ».
- Entrées en lecture seule ; nom/catégorie figés au moment de la sortie (snapshots).
- Comparaison mensuelle masquée s'il n'y a pas de mois précédent.

## 7. Cas particuliers

- Filtre sans résultat → état vide + réinitialisation.
- Journal totalement vide → mascotte + message encourageant.
- Journal volumineux → scroll infini (pagination serveur).
- Foyer mono-membre → filtre Membre masqué.

## 8. i18n

Clés `stockExit.journal.*` (titres, sous-titre, cartes, onglets, périodes, états vides,
export) ajoutées en **en / es / fr**.

## 9. Hors périmètre

Capture du champ contexte, panneau Filtres avancé (catégorie/stockage/recherche), et l'analyse
riche du ticket *Statistiques* (courbes, top catégories gaspillées).
