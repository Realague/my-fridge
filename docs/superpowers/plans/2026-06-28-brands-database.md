# Brands Database (Loyalty Cards Referential) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend `brands` referential that powers the loyalty-cards feature — table, curated seed of 41 French retailers, one-shot logo hosting on Cloudinary, REST endpoints (list/search/create-custom with dedup), and distinct-household `usageCount` tracking.

**Architecture:** Standard backend layering (routes → controllers → services → repositories → models). `brands` is a **global** resource (not household-scoped); `LoyaltyCard.storeSlug` softly references `brands.id`. Curated data is seeded by an idempotent migration (no network); logos are fetched separately by a one-shot script that uploads to Cloudinary. Custom brands are global with strict dedup by normalized name.

**Tech Stack:** Express 4 + TypeScript, Sequelize 6 (PostgreSQL 15), Cloudinary (already wired in `utils/imageUploader.ts`), logo.dev image API (publishable key). `axios` is already a backend dependency.

## Global Constraints

- **No test runner exists.** `backend` `npm test` is a placeholder; there is no Jest/Vitest. Do NOT write `*.test.ts` files expecting a runner. Verification gates are: (a) `npx tsc --noEmit` from `backend/` compiles clean, and (b) the explicit manual check in each task (migration run / curl / `ts-node -e` assertion). Treat a non-compiling state as a failing test.
- **Column naming is camelCase** (matches every existing model/migration: `householdId`, `storeSlug`, `barcodeFormat`). Use `logoPath`, `isCurated`, `usageCount`, `normalizedName` — never snake_case.
- **Controllers return `ApiResponse<T>`** (`{ success, message?, data?, error? }` from `types/ApiResponse.ts`) and follow the existing try/catch-per-method style in `LoyaltyCardController.ts` (map known `CustomErrors` to status codes, default 500).
- **Enums must stay in sync** front + back (`backend/src/types/enums.ts` ↔ `frontend/src/types/enums.ts`) per CLAUDE.md.
- **Migrations are `.js` in `backend/src/migrations/`**, named `YYYYMMDD<seq>-<name>.js` (e.g. `202606280-...`). Never edit an already-run migration. Migrations run in lexical filename order.
- **Cloudinary cloud_name in use is `duxpbou8b`** (see existing scripts) — do not hardcode it; rely on `utils/imageUploader.ts` which reads `CLOUDINARY_*` env vars.
- **logo.dev**: publishable key only, env var `LOGODEV_PUBLISHABLE_KEY` (`pk_…`). Image API: `https://img.logo.dev/{domain}?token=${LOGODEV_PUBLISHABLE_KEY}`. No secret key, no name-search in this plan.
- **Run all `npm`/`npx`/`ts-node` commands from `backend/`** unless noted. Shell is PowerShell; the Bash tool is also available.

---

### Task 1: `BRAND_CATEGORIES` enum (back + front) and `normalizeBrandName` util

**Files:**
- Modify: `backend/src/types/enums.ts` (append at end)
- Modify: `frontend/src/types/enums.ts` (mirror — append the same enum)
- Create: `backend/src/utils/brandNormalize.ts`

**Interfaces:**
- Produces: `enum BrandCategory` + `const BRAND_CATEGORIES: BrandCategory[]` (values: `grande_distribution`, `hard_discount`, `bio_alimentaire`, `surgele`, `beaute`, `bricolage_maison`, `sport_culture_tech`, `mode`).
- Produces: `normalizeBrandName(name: string): string` and `slugifyBrandName(name: string): string`.

- [ ] **Step 1: Append the enum to the backend enums file**

In `backend/src/types/enums.ts`, append:

```typescript
export enum BrandCategory {
  GRANDE_DISTRIBUTION = 'grande_distribution',
  HARD_DISCOUNT = 'hard_discount',
  BIO_ALIMENTAIRE = 'bio_alimentaire',
  SURGELE = 'surgele',
  BEAUTE = 'beaute',
  BRICOLAGE_MAISON = 'bricolage_maison',
  SPORT_CULTURE_TECH = 'sport_culture_tech',
  MODE = 'mode'
}

export const BRAND_CATEGORIES = Object.values(BrandCategory);
```

- [ ] **Step 2: Mirror the enum in the frontend enums file**

Check the existing style of `frontend/src/types/enums.ts` first (it may already define `BarcodeFormat` etc. the same way). Append the identical `BrandCategory` enum + `BRAND_CATEGORIES` export so front/back stay in sync (CLAUDE.md rule). If the frontend file uses a different export idiom, match that file's idiom but keep the same string values.

- [ ] **Step 3: Create the normalization/slug util**

Create `backend/src/utils/brandNormalize.ts`:

```typescript
/**
 * Normalizes a brand name for deduplication: lowercase, accent-stripped,
 * and reduced to [a-z0-9] only.
 * "Grand Frais", "grand frais", "GrandFrais" -> "grandfrais".
 */
export function normalizeBrandName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Builds a URL-safe kebab slug candidate from a brand name.
 * "Carrefour City" -> "carrefour-city". Used as the brands.id seed for
 * custom brands (collisions are resolved by the service with a numeric suffix).
 */
export function slugifyBrandName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'brand';
}
```

- [ ] **Step 4: Verify it compiles and the function behaves**

Run (from `backend/`):

```bash
npx tsc --noEmit
npx ts-node -e "const {normalizeBrandName,slugifyBrandName}=require('./src/utils/brandNormalize'); const n=normalizeBrandName; if(n('Grand Frais')!==n('grand frais')||n('GrandFrais')!==n('Grand Frais')||n('Casino')!=='casino') throw new Error('normalize FAIL'); if(slugifyBrandName('Carrefour City')!=='carrefour-city') throw new Error('slug FAIL'); console.log('OK');"
```

Expected: `tsc` exits 0 (no output), the `ts-node` line prints `OK`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/types/enums.ts frontend/src/types/enums.ts backend/src/utils/brandNormalize.ts
git commit -m "✨ enseignes: enum catégories + normalisation des noms"
```

---

### Task 2: `Brand` model + create-table migration + association wiring

**Files:**
- Create: `backend/src/models/Brand.ts`
- Create: `backend/src/migrations/202606280-create-brands-table.js`
- Modify: `backend/src/models/index.ts` (import, no associations, re-export)

**Interfaces:**
- Consumes: `BrandCategory`, `BRAND_CATEGORIES` (Task 1).
- Produces: `class Brand` with attributes `id: string` (PK, slug), `name: string`, `normalizedName: string`, `domain: string | null`, `color: string | null`, `logoPath: string | null`, `category: BrandCategory | null`, `isCurated: boolean`, `usageCount: number`, `createdAt`, `updatedAt`.

- [ ] **Step 1: Create the Sequelize model**

Create `backend/src/models/Brand.ts`:

```typescript
import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { BrandCategory, BRAND_CATEGORIES } from '../types/enums';

interface BrandAttributes {
  id: string;
  name: string;
  normalizedName: string;
  domain: string | null;
  color: string | null;
  logoPath: string | null;
  category: BrandCategory | null;
  isCurated: boolean;
  usageCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BrandCreationAttributes
  extends Optional<BrandAttributes, 'domain' | 'color' | 'logoPath' | 'category' | 'isCurated' | 'usageCount' | 'createdAt' | 'updatedAt'> {}

export class Brand extends Model<BrandAttributes, BrandCreationAttributes> implements BrandAttributes {
  public id!: string;
  public name!: string;
  public normalizedName!: string;
  public domain!: string | null;
  public color!: string | null;
  public logoPath!: string | null;
  public category!: BrandCategory | null;
  public isCurated!: boolean;
  public usageCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Brand.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    normalizedName: { type: DataTypes.STRING, allowNull: false },
    domain: { type: DataTypes.STRING, allowNull: true },
    color: { type: DataTypes.STRING(7), allowNull: true },
    logoPath: { type: DataTypes.STRING, allowNull: true },
    category: { type: DataTypes.ENUM(...BRAND_CATEGORIES), allowNull: true },
    isCurated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    usageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: 'brands',
    timestamps: true,
    indexes: [
      { fields: ['normalizedName'] },
      { fields: ['category'] },
      { fields: ['isCurated'] },
    ],
  }
);
```

- [ ] **Step 2: Create the create-table migration**

Create `backend/src/migrations/202606280-create-brands-table.js`:

```javascript
'use strict';

const { DataTypes } = require('sequelize');

const BRAND_CATEGORIES = [
  'grande_distribution', 'hard_discount', 'bio_alimentaire', 'surgele',
  'beaute', 'bricolage_maison', 'sport_culture_tech', 'mode'
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('brands', {
      id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      normalizedName: { type: DataTypes.STRING, allowNull: false },
      domain: { type: DataTypes.STRING, allowNull: true },
      color: { type: DataTypes.STRING(7), allowNull: true },
      logoPath: { type: DataTypes.STRING, allowNull: true },
      category: { type: DataTypes.ENUM(...BRAND_CATEGORIES), allowNull: true },
      isCurated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      usageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { allowNull: false, type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { allowNull: false, type: DataTypes.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('brands', ['normalizedName']);
    await queryInterface.addIndex('brands', ['category']);
    await queryInterface.addIndex('brands', ['isCurated']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('brands');
    // Drop the enum type created for the category column (Postgres).
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_brands_category";');
  }
};
```

- [ ] **Step 3: Wire the model into models/index.ts**

In `backend/src/models/index.ts`: add `import { Brand } from './Brand';` near the other model imports (after the `PushSubscription` import is fine). Add a comment line `// Brand is a global referential — no associations` (intentionally no `hasMany`/`belongsTo`). Add `Brand` to the `export { ... }` block.

- [ ] **Step 4: Run the migration and verify the table exists**

Run (from `backend/`):

```bash
npx tsc --noEmit
npm run db:migrate
npm run db:migrate:status
```

Expected: `tsc` clean; migrate runs `202606280-create-brands-table` as `up`; status lists it as `up`. If a local DB is not reachable, note it and instead verify the migration file parses with `node -e "require('./src/migrations/202606280-create-brands-table.js'); console.log('OK')"`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/Brand.ts backend/src/migrations/202606280-create-brands-table.js backend/src/models/index.ts
git commit -m "✨ enseignes: table brands + modèle Sequelize"
```

---

### Task 3: Source data file + curated seed migration (upsert)

**Files:**
- Create: `backend/src/scripts/enseignes.json`
- Create: `backend/src/migrations/202606281-seed-curated-brands.js`

**Interfaces:**
- Consumes: `brands` table (Task 2). The migration computes `normalizedName` inline (same algorithm as `normalizeBrandName`) — it cannot import the TS util, so the logic is duplicated in plain JS in the migration.

- [ ] **Step 1: Create the source JSON (41 brands, no token)**

Create `backend/src/scripts/enseignes.json` with this exact content (token stripped; only `id`, `nom`, `domaine`, `couleur`, `categorie` kept):

```json
[
  { "id": "carrefour", "nom": "Carrefour", "domaine": "carrefour.fr", "couleur": "#00387B", "categorie": "grande_distribution" },
  { "id": "carrefour-market", "nom": "Carrefour Market", "domaine": "carrefour.fr", "couleur": "#00387B", "categorie": "grande_distribution" },
  { "id": "carrefour-city", "nom": "Carrefour City", "domaine": "carrefour.fr", "couleur": "#00387B", "categorie": "grande_distribution" },
  { "id": "leclerc", "nom": "E.Leclerc", "domaine": "leclerc.com", "couleur": "#0066B3", "categorie": "grande_distribution" },
  { "id": "auchan", "nom": "Auchan", "domaine": "auchan.fr", "couleur": "#E2001A", "categorie": "grande_distribution" },
  { "id": "intermarche", "nom": "Intermarché", "domaine": "intermarche.com", "couleur": "#E2001A", "categorie": "grande_distribution" },
  { "id": "super-u", "nom": "Super U", "domaine": "magasins-u.com", "couleur": "#E2001A", "categorie": "grande_distribution" },
  { "id": "hyper-u", "nom": "Hyper U", "domaine": "magasins-u.com", "couleur": "#E2001A", "categorie": "grande_distribution" },
  { "id": "u-express", "nom": "U Express", "domaine": "magasins-u.com", "couleur": "#E2001A", "categorie": "grande_distribution" },
  { "id": "casino", "nom": "Casino", "domaine": "casino.fr", "couleur": "#E2001A", "categorie": "grande_distribution" },
  { "id": "geant-casino", "nom": "Géant Casino", "domaine": "geantcasino.fr", "couleur": "#E2001A", "categorie": "grande_distribution" },
  { "id": "monoprix", "nom": "Monoprix", "domaine": "monoprix.fr", "couleur": "#ED1C24", "categorie": "grande_distribution" },
  { "id": "franprix", "nom": "Franprix", "domaine": "franprix.fr", "couleur": "#95C11F", "categorie": "grande_distribution" },
  { "id": "cora", "nom": "Cora", "domaine": "cora.fr", "couleur": "#E2001A", "categorie": "grande_distribution" },
  { "id": "simply-market", "nom": "Simply Market", "domaine": "simplymarket.fr", "couleur": "#E2001A", "categorie": "grande_distribution" },
  { "id": "lidl", "nom": "Lidl", "domaine": "lidl.fr", "couleur": "#0050AA", "categorie": "hard_discount" },
  { "id": "aldi", "nom": "Aldi", "domaine": "aldi.fr", "couleur": "#00005F", "categorie": "hard_discount" },
  { "id": "netto", "nom": "Netto", "domaine": "netto.fr", "couleur": "#FFD400", "categorie": "hard_discount" },
  { "id": "biocoop", "nom": "Biocoop", "domaine": "biocoop.fr", "couleur": "#94C11A", "categorie": "bio_alimentaire" },
  { "id": "naturalia", "nom": "Naturalia", "domaine": "naturalia.fr", "couleur": "#7AB51D", "categorie": "bio_alimentaire" },
  { "id": "grand-frais", "nom": "Grand Frais", "domaine": "grandfrais.com", "couleur": "#00954C", "categorie": "bio_alimentaire" },
  { "id": "la-vie-claire", "nom": "La Vie Claire", "domaine": "lavieclaire.com", "couleur": "#E30613", "categorie": "bio_alimentaire" },
  { "id": "picard", "nom": "Picard", "domaine": "picard.fr", "couleur": "#003DA5", "categorie": "surgele" },
  { "id": "thiriet", "nom": "Thiriet", "domaine": "thiriet.com", "couleur": "#E2001A", "categorie": "surgele" },
  { "id": "sephora", "nom": "Sephora", "domaine": "sephora.fr", "couleur": "#000000", "categorie": "beaute" },
  { "id": "marionnaud", "nom": "Marionnaud", "domaine": "marionnaud.fr", "couleur": "#E50019", "categorie": "beaute" },
  { "id": "yves-rocher", "nom": "Yves Rocher", "domaine": "yves-rocher.fr", "couleur": "#5A8200", "categorie": "beaute" },
  { "id": "nocibe", "nom": "Nocibé", "domaine": "nocibe.fr", "couleur": "#E2007A", "categorie": "beaute" },
  { "id": "leroy-merlin", "nom": "Leroy Merlin", "domaine": "leroymerlin.fr", "couleur": "#78BE20", "categorie": "bricolage_maison" },
  { "id": "castorama", "nom": "Castorama", "domaine": "castorama.fr", "couleur": "#0091D2", "categorie": "bricolage_maison" },
  { "id": "brico-depot", "nom": "Brico Dépôt", "domaine": "bricodepot.fr", "couleur": "#F36C21", "categorie": "bricolage_maison" },
  { "id": "ikea", "nom": "IKEA", "domaine": "ikea.com", "couleur": "#0058A3", "categorie": "bricolage_maison" },
  { "id": "maisons-du-monde", "nom": "Maisons du Monde", "domaine": "maisonsdumonde.com", "couleur": "#000000", "categorie": "bricolage_maison" },
  { "id": "decathlon", "nom": "Decathlon", "domaine": "decathlon.fr", "couleur": "#0082C3", "categorie": "sport_culture_tech" },
  { "id": "fnac", "nom": "Fnac", "domaine": "fnac.com", "couleur": "#E8B600", "categorie": "sport_culture_tech" },
  { "id": "darty", "nom": "Darty", "domaine": "darty.com", "couleur": "#E2001A", "categorie": "sport_culture_tech" },
  { "id": "boulanger", "nom": "Boulanger", "domaine": "boulanger.com", "couleur": "#FFCC00", "categorie": "sport_culture_tech" },
  { "id": "cultura", "nom": "Cultura", "domaine": "cultura.com", "couleur": "#E5004B", "categorie": "sport_culture_tech" },
  { "id": "intersport", "nom": "Intersport", "domaine": "intersport.fr", "couleur": "#0046AD", "categorie": "sport_culture_tech" },
  { "id": "go-sport", "nom": "Go Sport", "domaine": "go-sport.com", "couleur": "#E2001A", "categorie": "sport_culture_tech" },
  { "id": "kiabi", "nom": "Kiabi", "domaine": "kiabi.com", "couleur": "#E5004B", "categorie": "mode" }
]
```

- [ ] **Step 2: Create the seed migration (idempotent upsert on id)**

Create `backend/src/migrations/202606281-seed-curated-brands.js`:

```javascript
'use strict';

const fs = require('fs');
const path = require('path');

function normalizeBrandName(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Seeds the curated brands from enseignes.json (reference data, not user data).
 * Idempotent: upsert on `id`. logoPath is left NULL — run `npm run brands:logos`
 * to populate logos via logo.dev + Cloudinary.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const file = path.join(__dirname, '..', 'scripts', 'enseignes.json');
    const enseignes = JSON.parse(fs.readFileSync(file, 'utf8'));
    const now = new Date();

    // Raw upsert on `id`. queryInterface.bulkInsert does NOT support
    // updateOnDuplicate (that's a Model.bulkCreate option, unavailable here),
    // so we use Postgres ON CONFLICT. The category column is an enum type
    // (enum_brands_category), so the string param is cast explicitly.
    // usageCount and logoPath are intentionally NOT updated on conflict, so a
    // re-run never resets a counter or wipes an already-downloaded logo.
    for (const e of enseignes) {
      await queryInterface.sequelize.query(
        `INSERT INTO brands
           (id, name, "normalizedName", domain, color, "logoPath", category, "isCurated", "usageCount", "createdAt", "updatedAt")
         VALUES
           (:id, :name, :normalizedName, :domain, :color, NULL, CAST(:category AS "enum_brands_category"), true, 0, :now, :now)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           "normalizedName" = EXCLUDED."normalizedName",
           domain = EXCLUDED.domain,
           color = EXCLUDED.color,
           category = EXCLUDED.category,
           "isCurated" = true,
           "updatedAt" = EXCLUDED."updatedAt";`,
        {
          replacements: {
            id: e.id,
            name: e.nom,
            normalizedName: normalizeBrandName(e.nom),
            domain: e.domaine || null,
            color: e.couleur || null,
            category: e.categorie || null,
            now,
          },
        }
      );
    }
  },

  async down (queryInterface, Sequelize) {
    const file = path.join(__dirname, '..', 'scripts', 'enseignes.json');
    const enseignes = JSON.parse(fs.readFileSync(file, 'utf8'));
    const ids = enseignes.map((e) => e.id);
    await queryInterface.bulkDelete('brands', { id: ids });
  }
};
```

Note: `updateOnDuplicate` deliberately excludes `usageCount` and `logoPath` so re-running the seed never resets a counter or wipes an already-downloaded logo.

- [ ] **Step 3: Run the seed and verify 41 rows, idempotency**

Run (from `backend/`):

```bash
node -e "const e=require('./src/scripts/enseignes.json'); if(e.length!==41) throw new Error('expected 41, got '+e.length); console.log('json OK', e.length);"
npm run db:migrate
npm run db:migrate   # second run = no pending migrations, no error
```

Then verify row count via psql (dev DB):

```bash
docker-compose -f ../docker-compose.dev.yml exec db psql -U postgres -d my_fridge_db -c "SELECT count(*) FROM brands WHERE \"isCurated\"=true;"
```

Expected: json prints `json OK 41`; first migrate applies the seed; the count is `41`. If no DB is reachable, at minimum confirm the JSON length check passes and `node -e "require('./src/migrations/202606281-seed-curated-brands.js'); console.log('migration parses')"`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/scripts/enseignes.json backend/src/migrations/202606281-seed-curated-brands.js
git commit -m "✨ enseignes: seed des 41 enseignes curées (upsert idempotent)"
```

---

### Task 4: DTOs + `BrandRepository`

**Files:**
- Create: `backend/src/types/BrandDto.ts`
- Create: `backend/src/repositories/BrandRepository.ts`

**Interfaces:**
- Consumes: `Brand` model (Task 2), `BrandCategory` (Task 1).
- Produces:
  - `interface BrandDto { id; name; domain; color; logoPath; category; isCurated; usageCount; createdAt; updatedAt }` (dates as ISO strings).
  - `interface CreateCustomBrandDto { name: string; domain?: string; color?: string; category?: BrandCategory }`.
  - `interface GetBrandsQueryDto { search?: string; category?: BrandCategory; isCurated?: boolean }`.
  - `BrandRepository` methods: `findAll(query): Promise<Brand[]>`, `findById(id): Promise<Brand | null>`, `findByNormalizedName(normalizedName): Promise<Brand | null>`, `create(data): Promise<Brand>`, `incrementUsage(id): Promise<void>`.

- [ ] **Step 1: Create the DTOs**

Create `backend/src/types/BrandDto.ts`:

```typescript
import { BrandCategory } from './enums';

export interface BrandDto {
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

export interface CreateCustomBrandDto {
  name: string;
  domain?: string;
  color?: string;
  category?: BrandCategory;
}

export interface GetBrandsQueryDto {
  search?: string;
  category?: BrandCategory;
  isCurated?: boolean;
}

// Internal shape passed from service to repository on create.
export interface CreateBrandRecord {
  id: string;
  name: string;
  normalizedName: string;
  domain: string | null;
  color: string | null;
  logoPath: string | null;
  category: BrandCategory | null;
  isCurated: boolean;
  usageCount: number;
}
```

- [ ] **Step 2: Create the repository**

Create `backend/src/repositories/BrandRepository.ts`:

```typescript
import { Op } from 'sequelize';
import { Brand } from '../models/Brand';
import { GetBrandsQueryDto, CreateBrandRecord } from '../types/BrandDto';

export class BrandRepository {
  async findAll(query: GetBrandsQueryDto): Promise<Brand[]> {
    const where: any = {};

    if (query.category) {
      where.category = query.category;
    }
    if (typeof query.isCurated === 'boolean') {
      where.isCurated = query.isCurated;
    }
    if (query.search && query.search.trim()) {
      where.name = { [Op.iLike]: `%${query.search.trim()}%` };
    }

    return await Brand.findAll({
      where,
      order: [
        ['isCurated', 'DESC'],
        ['usageCount', 'DESC'],
        ['name', 'ASC'],
      ],
    });
  }

  async findById(id: string): Promise<Brand | null> {
    return await Brand.findByPk(id);
  }

  async findByNormalizedName(normalizedName: string): Promise<Brand | null> {
    return await Brand.findOne({ where: { normalizedName } });
  }

  async create(data: CreateBrandRecord): Promise<Brand> {
    return await Brand.create(data);
  }

  async incrementUsage(id: string): Promise<void> {
    await Brand.increment('usageCount', { by: 1, where: { id } });
  }
}
```

- [ ] **Step 3: Verify compile**

Run (from `backend/`): `npx tsc --noEmit`

Expected: exits 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/types/BrandDto.ts backend/src/repositories/BrandRepository.ts
git commit -m "✨ enseignes: DTOs + BrandRepository"
```

---

### Task 5: Logo helpers — `uploadImageFromUrl` + `logoDevClient`

**Files:**
- Modify: `backend/src/utils/imageUploader.ts` (add one exported function)
- Create: `backend/src/utils/logoDevClient.ts`

**Interfaces:**
- Produces: `uploadImageFromUrl(imageUrl: string, publicId: string, folder?: string): Promise<string | null>` in `imageUploader.ts` — uploads a **remote** URL to Cloudinary (Cloudinary fetches it server-side), returns secure URL or `null` on failure.
- Produces: `logoDevUrlForDomain(domain: string): string | null` and `fetchAndHostLogo(domain: string, publicId: string): Promise<string | null>` in `logoDevClient.ts`.

- [ ] **Step 1: Add `uploadImageFromUrl` to imageUploader.ts**

In `backend/src/utils/imageUploader.ts`, add this exported function (after `uploadImageToCloudinary`):

```typescript
/**
 * Uploads a remote image URL to Cloudinary. Cloudinary fetches the URL
 * server-side, so this works for logo.dev image URLs.
 * @returns Cloudinary secure URL, or null if the upload/fetch fails.
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  publicId: string,
  folder: string = 'brands'
): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder,
      public_id: publicId,
      overwrite: false,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (error) {
    console.error(`Failed to upload image from URL ${imageUrl}:`, error);
    return null;
  }
}
```

(`cloudinary` is already imported and configured at the top of the file.)

- [ ] **Step 2: Create the logo.dev client**

Create `backend/src/utils/logoDevClient.ts`:

```typescript
import { uploadImageFromUrl } from './imageUploader';

/**
 * Builds the logo.dev image API URL for a domain using the publishable key.
 * Returns null when no domain or no key is configured.
 */
export function logoDevUrlForDomain(domain: string | null | undefined): string | null {
  const key = process.env.LOGODEV_PUBLISHABLE_KEY;
  if (!domain || !key) {
    return null;
  }
  const clean = domain.trim().toLowerCase();
  return `https://img.logo.dev/${encodeURIComponent(clean)}?token=${key}&format=png`;
}

/**
 * Fetches a logo from logo.dev (by domain) and hosts it on Cloudinary under
 * folder `brands` with the given publicId. Best-effort: returns null if the
 * domain is missing, the key is unset, or Cloudinary fails. Never throws.
 */
export async function fetchAndHostLogo(
  domain: string | null | undefined,
  publicId: string
): Promise<string | null> {
  const url = logoDevUrlForDomain(domain);
  if (!url) {
    return null;
  }
  return await uploadImageFromUrl(url, publicId, 'brands');
}
```

- [ ] **Step 3: Verify compile**

Run (from `backend/`): `npx tsc --noEmit`

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add backend/src/utils/imageUploader.ts backend/src/utils/logoDevClient.ts
git commit -m "✨ enseignes: helper logo.dev + upload Cloudinary depuis URL"
```

---

### Task 6: `BrandService`

**Files:**
- Create: `backend/src/services/BrandService.ts`

**Interfaces:**
- Consumes: `BrandRepository` (Task 4), `normalizeBrandName`/`slugifyBrandName` (Task 1), `fetchAndHostLogo` (Task 5), DTOs (Task 4).
- Produces: `BrandService` with `getBrands(query): Promise<BrandDto[]>`, `getBrandById(id): Promise<BrandDto | null>`, `createCustomBrand(data: CreateCustomBrandDto): Promise<BrandDto>`, `incrementUsage(id): Promise<void>`.

- [ ] **Step 1: Create the service**

Create `backend/src/services/BrandService.ts`:

```typescript
import { BrandRepository } from '../repositories/BrandRepository';
import { Brand } from '../models/Brand';
import { BrandDto, CreateCustomBrandDto, GetBrandsQueryDto } from '../types/BrandDto';
import { normalizeBrandName, slugifyBrandName } from '../utils/brandNormalize';
import { fetchAndHostLogo } from '../utils/logoDevClient';
import { BadRequestError } from '../errors/CustomErrors';

export class BrandService {
  private brandRepository: BrandRepository;

  constructor() {
    this.brandRepository = new BrandRepository();
  }

  async getBrands(query: GetBrandsQueryDto): Promise<BrandDto[]> {
    const brands = await this.brandRepository.findAll(query);
    return brands.map((b) => this.mapToDto(b));
  }

  async getBrandById(id: string): Promise<BrandDto | null> {
    const brand = await this.brandRepository.findById(id);
    return brand ? this.mapToDto(brand) : null;
  }

  async createCustomBrand(data: CreateCustomBrandDto): Promise<BrandDto> {
    const name = (data.name || '').trim();
    if (!name) {
      throw new BadRequestError('Brand name is required');
    }

    // Dedup: if a brand (curated or custom) already exists with this
    // normalized name, return it instead of creating a duplicate.
    const normalizedName = normalizeBrandName(name);
    if (!normalizedName) {
      throw new BadRequestError('Brand name must contain alphanumeric characters');
    }
    const existing = await this.brandRepository.findByNormalizedName(normalizedName);
    if (existing) {
      return this.mapToDto(existing);
    }

    const id = await this.generateUniqueId(name);

    // Best-effort logo fetch (only when a domain is provided).
    const logoPath = data.domain ? await fetchAndHostLogo(data.domain, id) : null;

    const brand = await this.brandRepository.create({
      id,
      name,
      normalizedName,
      domain: data.domain ? data.domain.trim().toLowerCase() : null,
      color: data.color || null,
      logoPath,
      category: data.category || null,
      isCurated: false,
      usageCount: 1,
    });

    return this.mapToDto(brand);
  }

  async incrementUsage(id: string): Promise<void> {
    await this.brandRepository.incrementUsage(id);
  }

  /**
   * Builds a slug id from the name; appends -2, -3, ... if the id is already
   * taken by a brand with a *different* normalized name (rare slug collision).
   */
  private async generateUniqueId(name: string): Promise<string> {
    const base = slugifyBrandName(name);
    let candidate = base;
    let suffix = 2;
    // eslint-disable-next-line no-await-in-loop
    while (await this.brandRepository.findById(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private mapToDto(brand: Brand): BrandDto {
    return {
      id: brand.id,
      name: brand.name,
      domain: brand.domain,
      color: brand.color,
      logoPath: brand.logoPath,
      category: brand.category,
      isCurated: brand.isCurated,
      usageCount: brand.usageCount,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 2: Verify compile**

Run (from `backend/`): `npx tsc --noEmit`

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/BrandService.ts
git commit -m "✨ enseignes: BrandService (dédup + slug + logo best-effort)"
```

---

### Task 7: `BrandController` + routes + index wiring

**Files:**
- Create: `backend/src/controllers/BrandController.ts`
- Create: `backend/src/routes/brands.ts`
- Modify: `backend/src/index.ts` (import + mount + endpoint listing)

**Interfaces:**
- Consumes: `BrandService` (Task 6), `BrandCategory`/`BRAND_CATEGORIES` (Task 1), `ApiResponse`, `CustomErrors`.
- Produces: routes `GET /api/brands`, `GET /api/brands/:id`, `POST /api/brands`.

- [ ] **Step 1: Create the controller**

Create `backend/src/controllers/BrandController.ts`:

```typescript
import { Request, Response } from 'express';
import { BrandService } from '../services/BrandService';
import { CreateCustomBrandDto, GetBrandsQueryDto } from '../types/BrandDto';
import { ApiResponse } from '../types/ApiResponse';
import { BadRequestError, NotFoundError } from '../errors/CustomErrors';
import { BrandCategory, BRAND_CATEGORIES } from '../types/enums';

export class BrandController {
  private brandService: BrandService;

  constructor() {
    this.brandService = new BrandService();
  }

  async getBrands(req: Request, res: Response): Promise<void> {
    try {
      const categoryParam = req.query.category as string | undefined;
      if (categoryParam && !BRAND_CATEGORIES.includes(categoryParam as BrandCategory)) {
        throw new BadRequestError('Invalid brand category');
      }

      const query: GetBrandsQueryDto = {
        search: (req.query.search as string) || undefined,
        category: categoryParam ? (categoryParam as BrandCategory) : undefined,
        isCurated: req.query.isCurated === undefined ? undefined : req.query.isCurated === 'true',
      };

      const brands = await this.brandService.getBrands(query);

      const response: ApiResponse = {
        success: true,
        message: 'Brands retrieved successfully',
        data: brands,
      };
      res.json(response);
    } catch (error) {
      res.status(error instanceof BadRequestError ? 400 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve brands',
      });
    }
  }

  async getBrandById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const brand = await this.brandService.getBrandById(id);
      if (!brand) {
        throw new NotFoundError('Brand not found');
      }
      const response: ApiResponse = {
        success: true,
        message: 'Brand retrieved successfully',
        data: brand,
      };
      res.json(response);
    } catch (error) {
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve brand',
      });
    }
  }

  async createCustomBrand(req: Request, res: Response): Promise<void> {
    try {
      const { name, domain, color, category } = req.body || {};
      if (!name || typeof name !== 'string') {
        throw new BadRequestError('Brand name is required');
      }
      if (category && !BRAND_CATEGORIES.includes(category as BrandCategory)) {
        throw new BadRequestError('Invalid brand category');
      }

      const dto: CreateCustomBrandDto = { name, domain, color, category };
      const brand = await this.brandService.createCustomBrand(dto);

      const response: ApiResponse = {
        success: true,
        message: 'Brand created successfully',
        data: brand,
      };
      res.status(201).json(response);
    } catch (error) {
      res.status(error instanceof BadRequestError ? 400 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create brand',
      });
    }
  }
}
```

- [ ] **Step 2: Create the routes**

Create `backend/src/routes/brands.ts`:

```typescript
import { Router } from 'express';
import { BrandController } from '../controllers/BrandController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const brandController = new BrandController();

router.use(authenticateGoogleToken);

// GET /api/brands?search=&category=&isCurated=
router.get('/', brandController.getBrands.bind(brandController));

// GET /api/brands/:id
router.get('/:id', brandController.getBrandById.bind(brandController));

// POST /api/brands  (create custom brand, deduped)
router.post('/', brandController.createCustomBrand.bind(brandController));

export default router;
```

- [ ] **Step 3: Mount the router in index.ts**

In `backend/src/index.ts`:
- Add the import alongside the other route imports: `import brandRoutes from './routes/brands';`
- Add the mount alongside the other `app.use` calls (e.g. after `app.use('/api/items', itemRoutes);`): `app.use('/api/brands', brandRoutes);`
- Add `brands: '/api/brands',` to the `endpoints` object in the `app.get('/')` handler.

- [ ] **Step 4: Compile + manual endpoint check**

Run (from `backend/`):

```bash
npx tsc --noEmit
```

Then start the dev server (`npm run dev`) and verify the list endpoint returns the seeded brands (requires a valid Google bearer token; substitute `$TOKEN`):

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/brands?category=hard_discount"
```

Expected: `tsc` clean; the curl returns `{"success":true,...,"data":[ ... lidl, aldi, netto ... ]}` ordered curated-first. If no token/DB is available, confirm the server boots without route errors and `GET /api/brands` returns `401` (auth middleware reached) rather than `404`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/BrandController.ts backend/src/routes/brands.ts backend/src/index.ts
git commit -m "✨ enseignes: endpoints GET/POST /api/brands"
```

---

### Task 8: Logo download one-shot script + npm script + env doc

**Files:**
- Create: `backend/src/scripts/downloadBrandLogos.ts`
- Modify: `backend/package.json` (add `brands:logos` script)
- Modify: `CLAUDE.md` (add `LOGODEV_PUBLISHABLE_KEY` to the backend env list)

**Interfaces:**
- Consumes: `Brand` model + `sequelize` (Task 2), `fetchAndHostLogo` (Task 5).

- [ ] **Step 1: Create the script**

Create `backend/src/scripts/downloadBrandLogos.ts`:

```typescript
import dotenv from 'dotenv';
import { Op } from 'sequelize';
import { sequelize, Brand } from '../models';
import { fetchAndHostLogo } from '../utils/logoDevClient';

dotenv.config();

/**
 * One-shot: for every brand that has a domain but no logoPath, fetch the
 * logo from logo.dev and host it on Cloudinary (folder `brands`), then
 * update logoPath. Re-runnable: already-hosted logos are skipped. Failures
 * are logged and do not stop the run.
 */
async function main(): Promise<void> {
  if (!process.env.LOGODEV_PUBLISHABLE_KEY) {
    console.error('LOGODEV_PUBLISHABLE_KEY is not set. Aborting.');
    process.exit(1);
  }

  await sequelize.authenticate();

  const brands = await Brand.findAll({
    where: { domain: { [Op.ne]: null }, logoPath: null },
  });

  console.log(`Found ${brands.length} brand(s) needing a logo.`);

  let ok = 0;
  let failed = 0;
  for (const brand of brands) {
    const hosted = await fetchAndHostLogo(brand.domain, brand.id);
    if (hosted) {
      await brand.update({ logoPath: hosted });
      ok += 1;
      console.log(`✓ ${brand.id} -> ${hosted}`);
    } else {
      failed += 1;
      console.warn(`✗ ${brand.id} (${brand.domain}) — no logo hosted`);
    }
  }

  console.log(`Done. ${ok} hosted, ${failed} failed.`);
  await sequelize.close();
}

main().catch((err) => {
  console.error('downloadBrandLogos failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

In `backend/package.json` `scripts`, add after `seed:items:incremental`:

```json
    "brands:logos": "ts-node src/scripts/downloadBrandLogos.ts"
```

(Remember to add a trailing comma to the previous line.)

- [ ] **Step 3: Document the env var in CLAUDE.md**

In `CLAUDE.md`, in the "Environment variables" → "Backend reads:" list, add `LOGODEV_PUBLISHABLE_KEY` to the comma-separated list (e.g. after `CLOUDINARY_API_SECRET`). Add a one-line note: "`LOGODEV_PUBLISHABLE_KEY` — logo.dev publishable key (`pk_…`) used by the brands logo script and custom-brand logo fetch."

- [ ] **Step 4: Compile + run the script**

Run (from `backend/`):

```bash
npx tsc --noEmit
```

Then, with `LOGODEV_PUBLISHABLE_KEY` set in `backend/.env` and the seed applied:

```bash
npm run brands:logos
```

Expected: `tsc` clean; the script logs `Found 41 brand(s) needing a logo.` on first run and `✓ <id> -> https://res.cloudinary.com/...` lines, ending with a summary. Re-running prints `Found 0 brand(s) needing a logo.` (idempotent). If the key/DB is unavailable, confirm the script aborts cleanly with the `LOGODEV_PUBLISHABLE_KEY is not set` message (or DB auth error) rather than crashing uncaught.

- [ ] **Step 5: Commit**

```bash
git add backend/src/scripts/downloadBrandLogos.ts backend/package.json CLAUDE.md
git commit -m "✨ enseignes: script one-shot logos (logo.dev -> Cloudinary)"
```

---

### Task 9: `usageCount` tracking on loyalty-card creation

**Files:**
- Modify: `backend/src/services/LoyaltyCardService.ts`
- Modify: `backend/src/repositories/LoyaltyCardRepository.ts` (add a count helper)

**Interfaces:**
- Consumes: `BrandService.incrementUsage` (Task 6).
- Produces: `LoyaltyCardRepository.countByHouseholdAndSlug(householdId: string, storeSlug: string): Promise<number>`.

- [ ] **Step 1: Add the count helper to the repository**

In `backend/src/repositories/LoyaltyCardRepository.ts`, add this method to the `LoyaltyCardRepository` class:

```typescript
  async countByHouseholdAndSlug(householdId: string, storeSlug: string): Promise<number> {
    return await LoyaltyCard.count({ where: { householdId, storeSlug } });
  }
```

- [ ] **Step 2: Increment usage on first association in the service**

In `backend/src/services/LoyaltyCardService.ts`:
- Add imports at the top:

```typescript
import { BrandService } from './BrandService';
```

- Add a field + construct it in the constructor:

```typescript
  private brandService: BrandService;

  constructor() {
    this.loyaltyCardRepository = new LoyaltyCardRepository();
    this.brandService = new BrandService();
  }
```

(Merge with the existing constructor — keep the existing `loyaltyCardRepository` assignment.)

- In `createLoyaltyCard`, after the card is created and before returning, increment usage only when this household associates the brand for the first time. Replace the existing body so it reads:

```typescript
  async createLoyaltyCard(data: CreateLoyaltyCardDto): Promise<LoyaltyCardDto> {
    const loyaltyCard = await this.loyaltyCardRepository.create(data);

    // Track distinct-household usage of the referenced brand. Best-effort:
    // increment only when this household had no prior card for this brand.
    if (data.storeSlug) {
      const priorCount = await this.loyaltyCardRepository.countByHouseholdAndSlug(
        data.householdId,
        data.storeSlug
      );
      if (priorCount <= 1) {
        try {
          await this.brandService.incrementUsage(data.storeSlug);
        } catch (err) {
          console.warn(`Failed to increment usage for brand ${data.storeSlug}:`, err);
        }
      }
    }

    const retrieved = await this.loyaltyCardRepository.findById(loyaltyCard.id, data.householdId);
    if (!retrieved) {
      throw new Error('Failed to retrieve created loyalty card');
    }
    return this.mapToDto(retrieved);
  }
```

Note: the new card is already persisted when we count, so the first association yields `priorCount === 1` (`<= 1` → increment); subsequent cards for the same brand in the same household yield `>= 2` → no increment. `incrementUsage` is a no-op at the DB level if `storeSlug` doesn't match any brand id (custom brands created via `POST /api/brands` already start at 1).

- [ ] **Step 3: Compile + manual verification**

Run (from `backend/`): `npx tsc --noEmit`

Expected: exits 0.

Manual check (server running, `$TOKEN` + `$HID` household id): create a card with `storeSlug:"lidl"`, GET `/api/brands/lidl`, observe `usageCount` incremented by 1; create a second `lidl` card in the same household and confirm `usageCount` does NOT change again.

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"storeSlug":"lidl","storeName":"Lidl","cardNumber":"123"}' \
  "http://localhost:3000/api/households/$HID/loyalty-cards"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/brands/lidl"
```

Expected: after the first card, `data.usageCount` for `lidl` is 1 higher than before; after a second `lidl` card it is unchanged.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/LoyaltyCardService.ts backend/src/repositories/LoyaltyCardRepository.ts
git commit -m "✨ enseignes: tracking usageCount par foyer distinct à la création de carte"
```

---

## Self-Review

**Spec coverage:**
- Table `brands` (camelCase) → Task 2. ✓
- Enum catégories (front+back sync) → Task 1. ✓
- Normalisation dédup → Task 1. ✓
- Source JSON sans token → Task 3. ✓
- Seed upsert idempotent + down → Task 3. ✓
- Script logos one-shot (Cloudinary) → Task 8 (+ helpers Task 5). ✓
- Endpoints GET list/search/filter, GET by id, POST custom deduped → Tasks 4/6/7. ✓
- Logo best-effort custom (domaine fourni, non bloquant) → Task 6 (helper Task 5). ✓
- Tracking usageCount foyers distincts → Task 9. ✓
- Env var `LOGODEV_PUBLISHABLE_KEY` + doc → Task 8. ✓
- Promotion = process manuel, non automatisé → no task needed (documented in spec only). ✓
- Tests: no runner exists → replaced by compile + manual checks (Global Constraints). ✓ (gap vs ticket step 7 acknowledged; the only pure logic, `normalizeBrandName`/`slugify`, has a runnable `ts-node -e` assertion in Task 1 Step 4.)

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N" — all steps contain full code. ✓

**Type consistency:** `normalizeBrandName`/`slugifyBrandName` (Task 1) used in Task 6; `CreateBrandRecord`/`GetBrandsQueryDto`/`BrandDto` (Task 4) used in Tasks 4/6/7; `fetchAndHostLogo`/`logoDevUrlForDomain` (Task 5) used in Tasks 6/8; `BrandRepository` method names (`findAll`/`findById`/`findByNormalizedName`/`create`/`incrementUsage`) consistent across Tasks 4/6; `incrementUsage` (Task 6) used in Task 9; `countByHouseholdAndSlug` (Task 9) defined and used in Task 9. ✓
