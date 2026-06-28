# Spec — Intégration frontend du référentiel enseignes (cartes de fidélité)

**Date** : 2026-06-28
**Statut** : validé (design)
**Ticket source** : « Récupération nom + logo des enseignes » (flow d'association côté UI)
**Complément de** : [Base de données des enseignes](2026-06-28-brands-database-design.md) (backend, livré)

## Objectif

Brancher le frontend des cartes de fidélité sur le référentiel `brands`
(`/api/brands`) livré côté backend, et **supprimer l'ancien catalogue codé en dur**
[frontend/src/data/storeCatalog.ts](../../../frontend/src/data/storeCatalog.ts) qui
utilise l'API Clearbit (`logo.clearbit.com`, arrêtée depuis décembre 2025).

Résultat attendu : le sélecteur d'enseigne et l'affichage des cartes lisent les
enseignes (nom, couleur, logo) depuis l'API ; la création d'une enseigne absente
passe par `POST /api/brands` (dédupliquée côté backend).

## Périmètre

**Inclus (frontend uniquement)** : service + hook React Query pour `/api/brands`,
nouveau composant `BrandLogo`, refonte de `StoreSelector` (fetch + création custom
avec domaine optionnel), adaptation de `LoyaltyCardForm` et `LoyaltyCards`,
suppression de `storeCatalog.ts`.

**Hors périmètre** : filtre par catégorie dans le sélecteur ; fallback live
logo.dev au rendu ; logique de scan/saisie code-barres (inchangée) ; tout le
backend (déjà livré) ; migration des données de cartes existantes.

## Décisions actées

1. **Création custom** : nom (requis) + **site web / domaine (optionnel)**. Le
   domaine, s'il est fourni, permet au backend de récupérer un logo via logo.dev.
2. **Fallback logo** : quand `logoPath` est `null`, afficher une **initiale
   colorée** (pastille ronde, couleur de marque). Aucune dépendance réseau au
   rendu (objectif du ticket). Les vrais logos apparaissent après exécution du
   script `brands:logos` côté backend.
3. **Pas de filtre par catégorie** : grille recherchable (filtrage client-side sur
   le nom), tri curées-d'abord déjà assuré par l'API.
4. **Le sélecteur renvoie toujours un `Brand`** : le chemin « custom » crée un vrai
   Brand via l'API (au lieu d'un simple nom libre), ce qui unifie le flux.
5. **Suppression complète de `storeCatalog.ts`** ; les consommateurs de
   `getStoreBySlug` passent par la map `bySlug` du hook `useBrands`.

## Architecture & composants

### `brandService.ts` (nouveau)

Wrapper sur `apiService`/`makeAuthenticatedApiCall`, même pattern que
[loyaltyCardService.ts](../../../frontend/src/services/loyaltyCardService.ts) :

- `getBrands(): Promise<Brand[]>` → `GET /api/brands` (réponse `ApiResponse<Brand[]>`).
- `createBrand(data: CreateCustomBrandRequest): Promise<Brand>` → `POST /api/brands`
  (réponse `ApiResponse<Brand>`).

Types :

```ts
interface Brand {
  id: string;
  name: string;
  domain: string | null;
  color: string | null;
  logoPath: string | null;
  category: BrandCategory | null;
  isCurated: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}
interface CreateCustomBrandRequest { name: string; domain?: string }
```

`BrandCategory` est déjà exporté dans
[frontend/src/types/enums.ts](../../../frontend/src/types/enums.ts) (livré au
ticket backend).

### `useBrands()` (nouveau hook React Query)

- `useQuery({ queryKey: ['brands'], queryFn: brandService.getBrands, staleTime: 5*60*1000 })`.
- Renvoie `{ brands, bySlug, isLoading, isError, refetch }` où `bySlug` est une
  `Map<string, Brand>` (ou record) construite depuis `brands`, pour résoudre un
  `card.storeSlug` en O(1).
- Une mutation de création (inline `useMutation` dans `StoreSelector` ou hook
  `useCreateBrand`) invalide `['brands']` au succès.

### `BrandLogo` (remplace `StoreLogo`)

- Props : `{ name: string; logoPath: string | null; color: string | null; size?: 'sm' | 'md' }`.
- Rend `<img src={logoPath}>` (URL Cloudinary absolue) dans un conteneur blanc
  arrondi ; `onError` ou `logoPath` absent → pastille ronde initiale (1ʳᵉ lettre)
  sur `color` (défaut `#6B7280`). Pas de chaîne multi-source.
- Exporté depuis son propre fichier `components/BrandLogo.tsx` (au lieu d'être
  niché dans `StoreSelector`).

### `StoreSelector` (refonte)

- Récupère les enseignes via `useBrands`. États : **loading** (skeleton/spinner),
  **erreur** (message + retry via `refetch`), **liste vide** gérée.
- Recherche : filtre client-side sur `brand.name` (insensible à la casse), comme
  aujourd'hui.
- Grille de boutons → `onSelect(brand)` ; chaque bouton affiche `BrandLogo` + nom.
- Bouton « Autre » → sous-formulaire :
  - champ **nom** (requis) + champ **site web** (optionnel, placeholder ex.
    `carrefour.fr`) ;
  - au submit : `createBrand({ name, domain })` → en cas de succès, `onSelect`
    avec le `Brand` renvoyé (dédup backend : un nom existant renvoie l'enseigne
    existante) ; en cas d'échec, message inline, on reste sur le formulaire.
- Nouvelle signature : `onSelect: (brand: Brand) => void` (plus de
  `customName?`).

### `LoyaltyCardForm` (adaptation)

- `selectedStore: Brand | null` (au lieu de `StoreCatalogEntry | null`) ;
  suppression de l'état `customStoreName`.
- `handleStoreSelect(brand: Brand)` → stocke le brand, passe à l'étape `barcode`.
- Au submit : `storeName = brand.name`, `storeSlug = brand.id`,
  `color = brand.color ?? undefined`. Étapes `barcode`/`details` inchangées.

### `LoyaltyCards` (affichage)

- Utilise `useBrands().bySlug` pour résoudre `card.storeSlug` → `Brand`.
- Logo : `BrandLogo` avec `{ name: card.storeName, logoPath: brand?.logoPath ?? null, color: brand?.color ?? card.color }`.
- Couleur de fond : `brand?.color ?? card.color ?? '#6B7280'` (fallback inchangé).
- Remplace les imports `StoreLogo`/`getStoreBySlug` par `BrandLogo` + la map.

## Flux de données

```
useBrands ──GET /api/brands──> [Brand]  ─┬─> StoreSelector (grille + recherche)
                                         └─> LoyaltyCards (bySlug → logo/couleur)

StoreSelector "Autre" ──POST /api/brands──> Brand ──> onSelect ──> LoyaltyCardForm
LoyaltyCardForm submit ──POST loyalty-cards (storeSlug=brand.id)──> usageCount++ (backend)
```

## Gestion des erreurs

- **Fetch brands en échec** : `StoreSelector` affiche un message d'erreur + bouton
  réessayer ; la création custom reste possible (elle ne dépend pas de la liste).
  `LoyaltyCards` tombe sur le fallback couleur+initiale (pas de blocage).
- **Création custom en échec** : message inline dans le sous-formulaire, l'état
  saisi est conservé.

## Compatibilité

- Les cartes déjà enregistrées conservent `storeSlug` (anciens slugs du catalogue),
  `storeName` et `color`. Les slugs alignés avec un `brands.id` retrouvent leur
  logo ; les autres affichent l'initiale colorée. **Aucune migration de données.**

## i18n

Réutiliser les clés existantes `loyaltyCards.storeSelector.*` ; ajouter au besoin
(dans `en`, `es`, `fr`) : libellé du champ site web et son placeholder, état de
chargement, message d'erreur + réessayer, message liste vide. `en` reste le
fallback.

## Tests

Le repo **n'a pas de test runner** côté frontend. Aucun test automatisé livré ;
vérification : `npm run build` (frontend) compile, `npm run lint` propre, et
contrôle manuel du flux (sélection d'une enseigne curée, création d'un custom avec
et sans domaine, affichage des cartes avec logo et avec fallback initiale).

## Prérequis de déploiement

Les vrais logos n'apparaissent qu'après `seed` des 41 enseignes + exécution de
`npm run brands:logos` (avec `LOGODEV_PUBLISHABLE_KEY`) sur la base ciblée. Avant
cela, l'UI affiche des initiales colorées — comportement nominal, non bloquant.
