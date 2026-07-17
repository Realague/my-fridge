# Brands Frontend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the loyalty-cards frontend to the `/api/brands` referential and delete the hardcoded Clearbit `storeCatalog.ts`, so the store selector and saved-card display use real brand data (name, color, Cloudinary logo) with a colored-initial fallback.

**Architecture:** A thin `brandService` (built on `makeAuthenticatedApiCall`, mirroring `loyaltyCardService.ts`) feeds a small Zustand `brandStore` (`fetchBrands`, `createBrand`, `getBrandBySlug`). A new `BrandLogo` component renders the Cloudinary logo with an initial fallback. `StoreSelector` consumes the store and creates custom brands (name + optional domain) via the API; `LoyaltyCardForm` and `LoyaltyCards` consume brands instead of the catalog. `storeCatalog.ts` is deleted once its last consumer is migrated.

**Tech Stack:** React 18 + TypeScript, Vite, Zustand, react-i18next (en/es/fr), Tailwind + shadcn/ui. Path alias `@/*` → `frontend/src/*`.

## Global Constraints

- **No test runner exists** (frontend has none). Do NOT write test files. Per-task verification gate, run from `frontend/`: (a) `npx tsc --noEmit` is clean (if it errors about project references/composite, use `npx tsc -b`), and (b) `npm run lint` is clean for the changed files. The final task also runs `npm run build`.
- **Data layer = Zustand stores** (the app's convention; React Query is provided but unused — do NOT introduce it). Use the canonical service pattern (`makeAuthenticatedApiCall`), NOT the legacy `initialize*` DI pattern.
- **API call bodies pass raw objects** (never `JSON.stringify`) — `makeAuthenticatedApiCall` serializes.
- **All user-facing strings are i18n keys** resolved via `useTranslation()`; every new key MUST be added to all three locales `frontend/src/i18n/locales/{en,es,fr}.json` (`en` is fallback).
- **`logoPath` is an absolute Cloudinary URL** — use it directly as `<img src>`. When `null`/onError → colored initial on `color` (default `#6B7280`).
- **`BrandCategory` enum already exists** in `frontend/src/types/enums.ts` (added by the backend ticket) — import from there, do not redefine.
- Follow existing component idioms (shadcn `Button`/`Input`, `variant="green"`, Tailwind tokens). Keep files focused.

---

### Task 1: `brandService` + Brand types

**Files:**
- Create: `frontend/src/services/brandService.ts`

**Interfaces:**
- Produces: `interface Brand { id; name; domain: string|null; color: string|null; logoPath: string|null; category: BrandCategory|null; isCurated: boolean; usageCount: number; createdAt: string; updatedAt: string }`.
- Produces: `interface CreateCustomBrandRequest { name: string; domain?: string }`.
- Produces: `brandService.getBrands(): Promise<Brand[]>`, `brandService.createBrand(data): Promise<Brand>`.

- [ ] **Step 1: Create the service**

Create `frontend/src/services/brandService.ts` (mirrors the `apiService` factory in `loyaltyCardService.ts`):

```typescript
import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { BrandCategory } from '@/types/enums';

export interface Brand {
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

export interface CreateCustomBrandRequest {
  name: string;
  domain?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const createApiService = () => {
  const makeApiCall = async (
    url: string,
    options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: any; headers?: Record<string, string> } = {}
  ) => {
    const response = await makeAuthenticatedApiCall(url, options, { showToast: false });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response;
  };

  return {
    get: (url: string) => makeApiCall(url, { method: 'GET' }),
    post: (url: string, body?: any) => makeApiCall(url, { method: 'POST', body }),
  };
};

const apiService = createApiService();

const getBrands = async (): Promise<Brand[]> => {
  const response = await apiService.get('/api/brands');
  const result: ApiResponse<Brand[]> = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch brands');
  }
  return result.data || [];
};

const createBrand = async (data: CreateCustomBrandRequest): Promise<Brand> => {
  const response = await apiService.post('/api/brands', data);
  const result: ApiResponse<Brand> = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to create brand');
  }
  return result.data!;
};

export const brandService = {
  getBrands,
  createBrand,
};
```

- [ ] **Step 2: Verify**

Run from `frontend/`: `npx tsc --noEmit` (clean) and `npm run lint` (clean).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/brandService.ts
git commit -m "✨ enseignes(front): brandService + types"
```

---

### Task 2: `brandStore` (Zustand)

**Files:**
- Create: `frontend/src/stores/brandStore.ts`

**Interfaces:**
- Consumes: `brandService`, `Brand` (Task 1).
- Produces: `useBrandStore` with state `{ brands: Brand[]; loaded: boolean; loading: boolean; error: string|null }` and actions `fetchBrands(force?: boolean): Promise<void>`, `createBrand(data: CreateCustomBrandRequest): Promise<Brand>`, `getBrandBySlug(slug: string|null|undefined): Brand|undefined`.

- [ ] **Step 1: Create the store**

Create `frontend/src/stores/brandStore.ts`:

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { brandService, Brand, CreateCustomBrandRequest } from '@/services/brandService';

interface BrandStore {
  brands: Brand[];
  loaded: boolean;
  loading: boolean;
  error: string | null;

  fetchBrands: (force?: boolean) => Promise<void>;
  createBrand: (data: CreateCustomBrandRequest) => Promise<Brand>;
  getBrandBySlug: (slug: string | null | undefined) => Brand | undefined;
}

export const useBrandStore = create<BrandStore>()(
  devtools(
    (set, get) => ({
      brands: [],
      loaded: false,
      loading: false,
      error: null,

      fetchBrands: async (force = false) => {
        if (get().loaded && !force) return;
        set({ loading: true, error: null });
        try {
          const brands = await brandService.getBrands();
          set({ brands, loaded: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch brands';
          set({ error: message });
        } finally {
          set({ loading: false });
        }
      },

      createBrand: async (data: CreateCustomBrandRequest) => {
        set({ error: null });
        try {
          const brand = await brandService.createBrand(data);
          // Merge: replace if the id already exists (dedup returns existing), else append.
          set((state) => {
            const others = state.brands.filter((b) => b.id !== brand.id);
            return { brands: [...others, brand] };
          });
          return brand;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create brand';
          set({ error: message });
          throw error;
        }
      },

      getBrandBySlug: (slug) => {
        if (!slug) return undefined;
        return get().brands.find((b) => b.id === slug);
      },
    }),
    { name: 'brand-store' }
  )
);
```

- [ ] **Step 2: Verify**

Run from `frontend/`: `npx tsc --noEmit` (clean) and `npm run lint` (clean).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/brandStore.ts
git commit -m "✨ enseignes(front): brandStore (Zustand)"
```

---

### Task 3: `BrandLogo` component + i18n keys

**Files:**
- Create: `frontend/src/components/BrandLogo.tsx`
- Modify: `frontend/src/i18n/locales/en.json`, `frontend/src/i18n/locales/es.json`, `frontend/src/i18n/locales/fr.json`

**Interfaces:**
- Consumes: nothing from prior tasks (pure presentational).
- Produces: `default export BrandLogo` with props `{ name: string; logoPath: string|null; color: string|null; size?: 'sm'|'md' }`.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/BrandLogo.tsx` (logic adapted from the old `StoreLogo`, but driven by `logoPath`/`color`):

```tsx
import { useEffect, useState } from 'react';

interface BrandLogoProps {
  name: string;
  logoPath: string | null;
  color: string | null;
  size?: 'sm' | 'md';
}

const BrandLogo = ({ name, logoPath, color, size = 'md' }: BrandLogoProps) => {
  const [failed, setFailed] = useState(false);
  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12';
  const padClass = size === 'sm' ? 'p-1' : 'p-1.5';
  const textSize = size === 'sm' ? 'text-sm' : 'text-lg';

  useEffect(() => {
    setFailed(false);
  }, [logoPath]);

  const showInitial = !logoPath || failed;

  if (showInitial) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold ${textSize} shrink-0`}
        style={{ backgroundColor: color || '#6B7280' }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-xl bg-white flex items-center justify-center ${padClass} shrink-0 shadow-sm ring-1 ring-black/5 dark:ring-white/10`}
    >
      <img
        src={logoPath}
        alt=""
        className="w-full h-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
};

export default BrandLogo;
```

- [ ] **Step 2: Add i18n keys to all three locales**

In each of `frontend/src/i18n/locales/{en,es,fr}.json`, inside the existing
`loyaltyCards.storeSelector` object, add these keys (keep existing keys). Use the
values below per file.

`fr.json` — `loyaltyCards.storeSelector`:
```json
      "website": "Site web (facultatif)",
      "websitePlaceholder": "ex. carrefour.fr",
      "loading": "Chargement des enseignes…",
      "error": "Impossible de charger les enseignes.",
      "noResults": "Aucune enseigne trouvée.",
      "creating": "Création…",
      "createError": "Impossible de créer l'enseigne."
```

`en.json` — `loyaltyCards.storeSelector`:
```json
      "website": "Website (optional)",
      "websitePlaceholder": "e.g. carrefour.fr",
      "loading": "Loading stores…",
      "error": "Could not load stores.",
      "noResults": "No store found.",
      "creating": "Creating…",
      "createError": "Could not create the store."
```

`es.json` — `loyaltyCards.storeSelector`:
```json
      "website": "Sitio web (opcional)",
      "websitePlaceholder": "ej. carrefour.fr",
      "loading": "Cargando tiendas…",
      "error": "No se pudieron cargar las tiendas.",
      "noResults": "No se encontró ninguna tienda.",
      "creating": "Creando…",
      "createError": "No se pudo crear la tienda."
```

Note: add a comma after the previous last key in each `storeSelector` block so the JSON stays valid. Verify each file parses (Step 3).

- [ ] **Step 3: Verify**

Run from `frontend/`:
```bash
node -e "['en','es','fr'].forEach(l=>{const j=require('./src/i18n/locales/'+l+'.json'); if(!j.loyaltyCards.storeSelector.website) throw new Error('missing key in '+l); }); console.log('i18n OK')"
npx tsc --noEmit
npm run lint
```
Expected: prints `i18n OK`; tsc and lint clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/BrandLogo.tsx frontend/src/i18n/locales/en.json frontend/src/i18n/locales/es.json frontend/src/i18n/locales/fr.json
git commit -m "✨ enseignes(front): composant BrandLogo + clés i18n sélecteur"
```

---

### Task 4: Migrate `LoyaltyCards` display to brandStore + BrandLogo

**Files:**
- Modify: `frontend/src/pages/LoyaltyCards.tsx`

**Interfaces:**
- Consumes: `useBrandStore` (Task 2), `BrandLogo` (Task 3).

This task removes `LoyaltyCards`' dependency on `storeCatalog` and on `StoreSelector`'s `StoreLogo`, replacing both with the brand store + `BrandLogo`. `storeCatalog.ts` and `StoreSelector` are left untouched here (still used by the form) and are migrated in Task 5.

- [ ] **Step 1: Swap imports**

In `frontend/src/pages/LoyaltyCards.tsx`:
- Remove: `import { StoreLogo } from '@/components/StoreSelector';`
- Remove: `import { getStoreBySlug } from '@/data/storeCatalog';`
- Add: `import BrandLogo from '@/components/BrandLogo';`
- Add: `import { useBrandStore } from '@/stores/brandStore';`

- [ ] **Step 2: Fetch brands and resolve via the store**

In the `LoyaltyCards` component body, after the existing store hooks, add:

```tsx
  const fetchBrands = useBrandStore((s) => s.fetchBrands);
  const getBrandBySlug = useBrandStore((s) => s.getBrandBySlug);

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands]);
```

- [ ] **Step 3: Replace the `CardLogo` helper**

Replace the existing `CardLogo` component (the `getStoreBySlug`/`StoreLogo` block) with:

```tsx
  const CardLogo = ({ card }: { card: LoyaltyCard }) => {
    const brand = getBrandBySlug(card.storeSlug);
    return (
      <BrandLogo
        name={card.storeName}
        logoPath={brand?.logoPath ?? null}
        color={brand?.color ?? card.color}
        size="md"
      />
    );
  };
```

- [ ] **Step 4: Replace the two remaining `getStoreBySlug` usages**

In the full-screen barcode view (currently using `catalogEntry`):

```tsx
  // Full-screen barcode view
  if (selectedCard) {
    const brand = getBrandBySlug(selectedCard.storeSlug);
    const bgColor = brand?.color || selectedCard.color || '#1f2937';
```

and replace the logo render inside that view:

```tsx
          <BrandLogo
            name={selectedCard.storeName}
            logoPath={brand?.logoPath ?? null}
            color={brand?.color ?? selectedCard.color}
            size="md"
          />
```

(Remove the `{catalogEntry && (...)}` conditional — `BrandLogo` always renders, falling back to the initial.)

In the card grid `.map`, replace the per-card color derivation:

```tsx
              const brand = getBrandBySlug(card.storeSlug);
              const cardColor = brand?.color || card.color || '#6B7280';
```

(The `<CardLogo card={card} />` call inside the grid stays unchanged.)

- [ ] **Step 5: Verify**

Run from `frontend/`:
```bash
npx tsc --noEmit
npm run lint
```
Expected: clean. (No `storeCatalog`/`StoreLogo` reference remains in this file.)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/LoyaltyCards.tsx
git commit -m "✨ enseignes(front): LoyaltyCards via brandStore + BrandLogo"
```

---

### Task 5: Migrate `StoreSelector` + `LoyaltyCardForm`; delete `storeCatalog.ts`

**Files:**
- Modify: `frontend/src/components/StoreSelector.tsx`
- Modify: `frontend/src/components/LoyaltyCardForm.tsx`
- Delete: `frontend/src/data/storeCatalog.ts`

**Interfaces:**
- Consumes: `useBrandStore` (Task 2), `BrandLogo` (Task 3), `Brand` (Task 1).
- Produces: `StoreSelector` with new prop `onSelect: (brand: Brand) => void` (no more `customName`). Removes the `StoreLogo` export.

These two components change together because the `onSelect` signature change in `StoreSelector` breaks `LoyaltyCardForm` simultaneously; `storeCatalog.ts` is deleted once neither references it.

- [ ] **Step 1: Rewrite `StoreSelector.tsx`**

Replace the entire file `frontend/src/components/StoreSelector.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrandStore } from '@/stores/brandStore';
import { Brand } from '@/services/brandService';
import BrandLogo from '@/components/BrandLogo';

interface StoreSelectorProps {
  onSelect: (brand: Brand) => void;
}

const StoreSelector = ({ onSelect }: StoreSelectorProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const brands = useBrandStore((s) => s.brands);
  const loading = useBrandStore((s) => s.loading);
  const error = useBrandStore((s) => s.error);
  const loaded = useBrandStore((s) => s.loaded);
  const fetchBrands = useBrandStore((s) => s.fetchBrands);
  const createBrand = useBrandStore((s) => s.createBrand);

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands]);

  const filtered = search
    ? brands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : brands;

  const handleCustomSubmit = async () => {
    const name = customName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const brand = await createBrand({ name, domain: customDomain.trim() || undefined });
      onSelect(brand);
    } catch {
      setCreateError(t('loyaltyCards.storeSelector.createError'));
    } finally {
      setCreating(false);
    }
  };

  if (showCustom) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">{t('loyaltyCards.storeSelector.customStore')}</h3>
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={t('loyaltyCards.storeSelector.enterStoreName')}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
        />
        <Input
          value={customDomain}
          onChange={(e) => setCustomDomain(e.target.value)}
          placeholder={t('loyaltyCards.storeSelector.websitePlaceholder')}
          aria-label={t('loyaltyCards.storeSelector.website')}
        />
        {createError && <p className="text-sm text-destructive">{createError}</p>}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCustom(false)} className="flex-1" disabled={creating}>
            {t('buttons.back')}
          </Button>
          <Button variant="green" onClick={handleCustomSubmit} disabled={!customName.trim() || creating} className="flex-1">
            {creating ? t('loyaltyCards.storeSelector.creating') : t('buttons.confirm')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">{t('loyaltyCards.storeSelector.title')}</h3>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('loyaltyCards.storeSelector.search')}
          className="pl-10"
        />
      </div>

      {loading && !loaded ? (
        <div className="py-8 text-center text-muted-foreground">{t('loyaltyCards.storeSelector.loading')}</div>
      ) : error && !loaded ? (
        <div className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{t('loyaltyCards.storeSelector.error')}</p>
          <Button variant="outline" onClick={() => fetchBrands(true)}>{t('common.retry')}</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">{t('loyaltyCards.storeSelector.noResults')}</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
          {filtered.map((brand) => (
            <button
              key={brand.id}
              onClick={() => onSelect(brand)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <BrandLogo name={brand.name} logoPath={brand.logoPath} color={brand.color} />
              <span className="text-xs font-medium text-foreground text-center leading-tight">{brand.name}</span>
            </button>
          ))}
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={() => setShowCustom(true)}>
        <Store className="h-4 w-4 mr-2" />
        {t('loyaltyCards.storeSelector.other')}
      </Button>
    </div>
  );
};

export default StoreSelector;
```

(Note: the `StoreLogo` named export is intentionally removed — Task 4 already migrated its only consumer to `BrandLogo`.)

- [ ] **Step 2: Update `LoyaltyCardForm.tsx`**

In `frontend/src/components/LoyaltyCardForm.tsx`:

Replace the import line `import { StoreCatalogEntry } from '@/data/storeCatalog';` with:
```tsx
import { Brand } from '@/services/brandService';
```

Change the store state and remove the custom-name state:
```tsx
  const [selectedStore, setSelectedStore] = useState<Brand | null>(null);
```
(delete the line `const [customStoreName, setCustomStoreName] = useState('');`)

In `reset()`, delete the `setCustomStoreName('');` line.

Replace `handleStoreSelect` with:
```tsx
  const handleStoreSelect = (brand: Brand) => {
    setSelectedStore(brand);
    setStep('barcode');
  };
```

In the `barcode` step heading, replace `selectedStore?.name || customStoreName` with `selectedStore?.name`:
```tsx
                {t('loyaltyCards.form.addBarcode', { store: selectedStore?.name })}
```

In `handleSubmit`, update the payload:
```tsx
      const data: CreateLoyaltyCardRequest = {
        storeName: selectedStore?.name ?? '',
        storeSlug: selectedStore?.id,
        cardNumber: cardNumber.trim(),
        barcodeData: finalBarcodeData,
        barcodeFormat: finalFormat,
        notes: notes.trim() || undefined,
        color: selectedStore?.color ?? undefined,
      };
```

(The `StoreSelector` usage `{step === 'store' && <StoreSelector onSelect={handleStoreSelect} />}` stays — its `onSelect` now receives a `Brand`.)

- [ ] **Step 3: Delete the catalog and confirm no references remain**

```bash
git rm frontend/src/data/storeCatalog.ts
```

Then verify nothing still imports it:
```bash
grep -rn "storeCatalog\|StoreCatalogEntry\|getStoreBySlug\|StoreLogo" frontend/src ; echo "exit: $?"
```
Expected: no matches (grep exit 1). If anything prints, fix that reference before continuing.

- [ ] **Step 4: Verify**

Run from `frontend/`:
```bash
npx tsc --noEmit
npm run lint
npm run build
```
Expected: tsc clean, lint clean, `vite build` succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StoreSelector.tsx frontend/src/components/LoyaltyCardForm.tsx
git commit -m "✨ enseignes(front): StoreSelector+form sur brandStore, suppression storeCatalog"
```

---

## Self-Review

**Spec coverage:**
- `brandService` (getBrands/createBrand) → Task 1. ✓
- `brandStore` Zustand (fetchBrands/createBrand/getBrandBySlug, no DI) → Task 2. ✓
- `BrandLogo` (logoPath → colored-initial fallback) → Task 3. ✓
- i18n keys in en/es/fr → Task 3. ✓
- `StoreSelector` refonte (store fetch, loading/error/empty, client-side search, custom create with optional domain, returns Brand) → Task 5. ✓
- `LoyaltyCardForm` adaptation (Brand; storeName/storeSlug/color) → Task 5. ✓
- `LoyaltyCards` display via store + BrandLogo, fallback color+initial → Task 4. ✓
- Delete `storeCatalog.ts` (Clearbit) → Task 5. ✓
- No category filter, no live logo.dev fallback → respected (not built). ✓
- Tests: no runner → compile + lint + build gates (Global Constraints). ✓

**Placeholder scan:** No TBD/TODO; all steps carry full code. ✓

**Type consistency:** `Brand`/`CreateCustomBrandRequest` (Task 1) used in Tasks 2/4/5; `useBrandStore` action names `fetchBrands`/`createBrand`/`getBrandBySlug` (Task 2) used consistently in Tasks 4/5; `BrandLogo` props `{name, logoPath, color, size}` (Task 3) used in Tasks 4/5; `StoreSelector` `onSelect(brand: Brand)` (Task 5) matches `LoyaltyCardForm.handleStoreSelect(brand: Brand)` (Task 5). ✓

**Build-green ordering:** Tasks 1–3 are additive. Task 4 removes LoyaltyCards' catalog/StoreLogo deps before Task 5 removes those exports/deletes the catalog, so every commit compiles. ✓
