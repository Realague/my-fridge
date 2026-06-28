# Spec — Base de données des enseignes (cartes de fidélité)

**Date** : 2026-06-28
**Statut** : validé (design)
**Ticket source** : « Base de données des enseignes (cartes de fidélité) »

## Objectif

Constituer un référentiel d'enseignes (`brands`) qui alimente la feature cartes de
fidélité. Quand un utilisateur scanne une carte, il l'associe à une enseigne du
référentiel ou en crée une nouvelle (custom) si absente. Le référentiel :

- démarre avec une liste curée de 41 enseignes françaises principales ;
- permet la création d'enseignes custom (globales) absentes de la liste ;
- s'enrichit progressivement via un compteur d'usage (`usageCount`).

## Périmètre

**Inclus (backend uniquement)** : table `brands`, seed des 41, script logos
one-shot, endpoints REST, tracking `usageCount`. Logos hébergés sur **Cloudinary**
(folder `brands`).

**Hors périmètre (autres tickets)** : UI sélecteur d'enseigne, recherche logo
**par nom** (logo.dev Brand Search / secret key), automatisation de la promotion
custom → curé, décrément d'`usageCount` à la suppression d'une carte.

## Décisions actées

1. **Enseignes custom = globales** avec déduplication stricte par nom normalisé
   (recommandation V1 du ticket). Pas de table `household_custom_brands`.
2. **Logos sur Cloudinary** (réutilise `uploadImageToCloudinary`, folder `brands`).
   `logoPath` stocke l'URL Cloudinary (ou une URL externe en fallback).
3. **Clé logo.dev** : la *publishable key* (`LOGODEV_PUBLISHABLE_KEY`, `pk_…`)
   suffit. Elle couvre `https://img.logo.dev/{domaine}?token=pk_…` pour les logos
   curés (par domaine) et custom (quand un domaine est fourni). La *secret key*
   (`sk_…`) n'est nécessaire que pour la recherche par nom (`search.logo.dev`),
   reportée à un ticket ultérieur.
4. **Dédup** : si un nom normalisé correspond à une enseigne existante (curée ou
   custom), `POST /api/brands` renvoie l'enseigne existante (200) au lieu de créer
   un doublon.
5. **Conventions repo** : colonnes **camelCase** (`logoPath`, `isCurated`,
   `usageCount`), pattern routes → controllers → services → repositories → models.

## Modèle de données

### Table `brands`

| colonne | type | contraintes |
|---|---|---|
| `id` | STRING | **PK** — slug (`carrefour`), pas UUID |
| `name` | STRING | not null |
| `normalizedName` | STRING | not null, **index** (dédup) |
| `domain` | STRING | null |
| `color` | STRING(7) | null (hex marque) |
| `logoPath` | STRING | null (URL Cloudinary ou externe) |
| `category` | ENUM(BRAND_CATEGORIES) | null (toléré pour custom) |
| `isCurated` | BOOLEAN | not null, default `false` |
| `usageCount` | INTEGER | not null, default `0` |
| `createdAt` | DATE | not null |
| `updatedAt` | DATE | not null |

**Index** : `normalizedName`, `category`, `isCurated`.

**Associations** : aucune. `brands` est global ; `LoyaltyCard.storeSlug` reste un
lien souple non contraint (comme aujourd'hui), pointant vers `brands.id`. Modèle
ré-exporté depuis `models/index.ts`.

### Enum `BRAND_CATEGORIES`

`grande_distribution`, `hard_discount`, `bio_alimentaire`, `surgele`, `beaute`,
`bricolage_maison`, `sport_culture_tech`, `mode`.

Ajouté dans `backend/src/types/enums.ts` **et** mirroré dans
`frontend/src/types/enums.ts` (règle de synchronisation enums du CLAUDE.md), même
si le frontend ne le consomme pas encore.

## Normalisation des noms (dédup)

Fonction pure `normalizeBrandName(name: string): string` :

1. trim + collapse des espaces multiples ;
2. minuscules ;
3. suppression des accents/diacritiques (NFD + suppression des marques) ;
4. suppression de tout caractère non `[a-z0-9]`.

Exemple : `"Grand Frais"`, `"grand frais"`, `"GrandFrais"` → `"grandfrais"`.

Utilisée au seed, à la création custom et pour la recherche de dédup.

## Données source + seed

- `backend/src/scripts/enseignes.json` : les 41 enseignes du ticket, **sans le
  token** (champ `logo_url` non requis ; on régénère depuis `domaine`). Champs :
  `id`, `nom`, `domaine`, `couleur`, `categorie`.
- Seed via **migration** `seed-curated-brands` :
  - lit `enseignes.json` ;
  - **upsert sur `id`** : insère/maj les 41 avec `isCurated=true`, `usageCount`
    inchangé (default 0 à l'insertion), `logoPath=null` (pas de réseau dans une
    migration), `normalizedName` calculé ;
  - idempotente (rejouable) ;
  - `down` : supprime les 41 ids curés.
- Les 3 entrées Carrefour (carrefour, carrefour-market, carrefour-city) partagent
  le même domaine/couleur → même logo (comportement voulu).

## Script logos one-shot

`npm run brands:logos` (script `backend/src/scripts/downloadBrandLogos.ts`) :

1. charge les brands ayant un `domain` et un `logoPath` vide ;
2. pour chaque : `https://img.logo.dev/{domain}?token=$LOGODEV_PUBLISHABLE_KEY` ;
3. upload Cloudinary via une nouvelle fonction `uploadImageFromUrl(url, publicId,
   folder)` ajoutée à `utils/imageUploader.ts` (Cloudinary sait fetch une URL
   distante) ;
4. met à jour `logoPath`.

Rejouable (saute ceux déjà pourvus). Échec réseau sur une enseigne → on log et on
continue (les autres ne sont pas bloquées).

## Couche applicative

### `BrandRepository`
- `findAll({ search?, category?, isCurated? })` — tri : curés d'abord, puis
  `usageCount` desc, puis `name`.
- `findById(id)`
- `findByNormalizedName(normalizedName)`
- `create(data)`
- `incrementUsage(id)`
- `upsert(data)` (seed / script)

### `BrandService`
- `getBrands(query)` / `getBrandById(id)`
- `createCustomBrand({ name, domain?, color?, category? })` :
  1. `normalizedName = normalizeBrandName(name)` ;
  2. dédup : `findByNormalizedName` → si existe, renvoie l'existant (200) ;
  3. sinon génère un slug `id` depuis `normalizedName` (suffixe `-2`, `-3`… si
     collision d'id avec un autre normalizedName) ;
  4. `isCurated=false`, `usageCount=1` ;
  5. logo : si `domain` fourni → tentative logo.dev → Cloudinary → `logoPath` ;
     échec/absence → `logoPath=null`, **création non bloquée**.
- `incrementUsage(id)` — appelé au tracking d'usage.
- `normalizeBrandName` exposée (utilitaire pur).

### `BrandController`
- `getBrands`, `getBrandById`, `createCustomBrand` — renvoient `ApiResponse<T>`,
  laissent remonter les `CustomErrors`.

### Routes `brands.ts`
- Ressource **globale** (non household-scoped), protégée par
  `authenticateGoogleToken`, montée sur `/api/brands` dans `index.ts`.
- `GET /api/brands?search=&category=`
- `GET /api/brands/:id`
- `POST /api/brands`

## Tracking `usageCount` (sémantique « foyers distincts »)

Dans `LoyaltyCardService.createLoyaltyCard` : si `storeSlug` est défini, pointe une
brand existante, **et** que le foyer n'a pas déjà une carte avec ce `storeSlug`,
alors `brandService.incrementUsage(storeSlug)`. Best-effort :

- pas de décrément à la suppression d'une carte (V1) ;
- pas de tracking à l'update de carte (V1).

Donne bien « nombre de foyers distincts » sans table supplémentaire (on s'appuie
sur l'absence préalable de carte (householdId, storeSlug)).

## Enrichissement / promotion

V1 : seul `usageCount` est tracké. La promotion d'une custom populaire (> ~50
foyers) vers la liste curée est un **process manuel admin**, documenté, non
automatisé. L'enrichissement repose sur un compteur agrégé — aucune donnée
personnelle exposée.

## Variables d'environnement

`LOGODEV_PUBLISHABLE_KEY=pk_…` — lue via `process.env` par le script logos et la
création custom. Documentée dans la liste env du `CLAUDE.md`.

## Cas particuliers (rappel ticket)

- Custom avec même nom qu'une curée → bloqué par la dédup (renvoie la curée).
- logo.dev indisponible à la création → enseigne créée sans logo.
- Domaine invalide fourni → ne bloque pas, pas de logo récupéré.
- Même domaine pour plusieurs enseignes (Carrefour x3) → voulu, logos identiques.
- Réexécution du seed → upsert sur `id`, pas de doublon.

## Tests

Le repo **n'a pas de test runner configuré** (`npm test` backend = placeholder,
aucun côté frontend). Aucun test automatisé exécutable n'est livré. La logique
critique (`normalizeBrandName`, dédup) est isolée en fonction pure, testable le
jour où un runner est ajouté. Vérification manuelle : seed (41 lignes, rejouable),
dédup (variantes de casse/espaces), création custom (avec/sans domaine), tracking
d'usage (1 incrément par foyer distinct).
