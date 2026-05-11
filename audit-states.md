# Audit teammate-states

Scope: state-coverage audit (empty / loading / error / heavy data) across every top-level route registered in [`frontend/src/App.tsx`](frontend/src/App.tsx).

## Page-by-page state matrix

Legend: ✅ custom & on-brand · ⚠️ generic / minimal · ❌ none / broken.

| Page (route) | Empty | Loading | Error | Heavy data |
|---|---|---|---|---|
| `/` (Index, [Index.tsx](frontend/src/pages/Index.tsx)) | n/a (marketing) | ⚠️ generic spinner ([Index.tsx:32-41](frontend/src/pages/Index.tsx#L32)) | ❌ none | n/a |
| `/auth` ([Auth.tsx](frontend/src/pages/Auth.tsx)) | n/a | ⚠️ local `authLoading` boolean only, no UI feedback during code exchange | ❌ silent — `console.error` only ([Auth.tsx:35](frontend/src/pages/Auth.tsx#L35), [:69](frontend/src/pages/Auth.tsx#L69)) | n/a |
| `/onboarding` ([Onboarding.tsx](frontend/src/pages/Onboarding.tsx)) | n/a | ⚠️ generic spinner ([:47](frontend/src/pages/Onboarding.tsx#L47)) | toast (via `householdStore`) | n/a |
| `/join` ([JoinHousehold.tsx](frontend/src/pages/JoinHousehold.tsx)) | n/a | local `joining` flag, no full-screen state | toast | n/a |
| `/dashboard` ([Dashboard.tsx](frontend/src/pages/Dashboard.tsx)) | ⚠️ no-storage area block ([:250-260](frontend/src/pages/Dashboard.tsx#L250)) only; **rest of page silently empty** (Recent Activity is hard-coded fake data, not real); | ⚠️ initial spinner pre-render ([:100-109](frontend/src/pages/Dashboard.tsx#L100)); **no skeleton** for storage cards / counts (flash of zero) | ❌ none — every store error swallowed; toasts only on mutations | ❌ no virtualization; OK as long as ≤ ~30 areas |
| `/storage/:id` ([StorageArea.tsx](frontend/src/pages/StorageArea.tsx)) | ✅ custom empty card ([:1014-1029](frontend/src/pages/StorageArea.tsx#L1014)) | ⚠️ "Loading…" text card ([:911-916](frontend/src/pages/StorageArea.tsx#L911)) — no skeleton | ❌ no error UI; mutation toasts only via store | ❌ unbounded `displayRows.map` ([:983](frontend/src/pages/StorageArea.tsx#L983)); no virtualization or pagination |
| `/products` (My Products, [MyProducts.tsx](frontend/src/pages/MyProducts.tsx)) | ✅ custom empty + "no-results" filter empty ([:591-626](frontend/src/pages/MyProducts.tsx#L591)) | ⚠️ "Loading…" text card ([:585-590](frontend/src/pages/MyProducts.tsx#L585)) — no skeleton | ❌ silent; per-item Item fetches `console.error` only ([:220](frontend/src/pages/MyProducts.tsx#L220)) | ❌ flat list, no virtualization. With 500+ items this page also issues N parallel `getItemById` calls ([:210-212](frontend/src/pages/MyProducts.tsx#L210)) — will hammer the API |
| `/shopping` ([Shopping.tsx](frontend/src/pages/Shopping.tsx)) | ✅ custom empty (and per-category) ([:831-849](frontend/src/pages/Shopping.tsx#L831), [:892-898](frontend/src/pages/Shopping.tsx#L892)) | ⚠️ generic spinner card ([:653-660](frontend/src/pages/Shopping.tsx#L653)) | ❌ no top-level error UI; mutation toasts only | ❌ no virtualization; aisle DnD has measurable cost above ~200 items |
| `/recipes` ([Recipes.tsx](frontend/src/pages/Recipes.tsx)) | ✅ ChefHat empty ([:221-228](frontend/src/pages/Recipes.tsx#L221)) | ✅ `RecipeGridSkeleton` ([:313-343](frontend/src/pages/Recipes.tsx#L313)) | ⚠️ destructive toast via `useEffect(error)` ([:59-68](frontend/src/pages/Recipes.tsx#L59)) — no inline retry UI | ❌ no virtualization; client-side `.filter()` on every keystroke ([:72-77](frontend/src/pages/Recipes.tsx#L72)) |
| `/recipes/:id` ([RecipeDetails.tsx](frontend/src/pages/RecipeDetails.tsx)) | ✅ "Recipe not found" ([:108-120](frontend/src/pages/RecipeDetails.tsx#L108)) | ✅ `RecipeDetailsSkeleton` ([:79-106](frontend/src/pages/RecipeDetails.tsx#L79)) | ⚠️ destructive toast ([:68-77](frontend/src/pages/RecipeDetails.tsx#L68)); on error → "Recipe not found" (misleading: looks like 404 vs network) | n/a (single resource) |
| `/recipes/:id/cook` ([RecipeCookingMode.tsx](frontend/src/pages/RecipeCookingMode.tsx)) | n/a | ⚠️ generic spinner ([:95-101](frontend/src/pages/RecipeCookingMode.tsx#L95)) | ⚠️ falls through to "Recipe not found" path on error | n/a |
| `/recipes/:id/edit` ([EditRecipe.tsx](frontend/src/pages/EditRecipe.tsx)) | n/a | ⚠️ relies on `currentRecipe` being null → shows blank form briefly | toast | n/a |
| `/add-recipe` ([AddRecipe.tsx](frontend/src/pages/AddRecipe.tsx)) | n/a (form) | n/a | toast | n/a |
| `/import-recipe` ([ImportRecipe.tsx](frontend/src/pages/ImportRecipe.tsx)) | n/a (form) | local `loading` flag ([:42](frontend/src/pages/ImportRecipe.tsx#L42)), no skeleton for parsed recipe | ⚠️ destructive toast | n/a |
| `/meals` ([Meals.tsx](frontend/src/pages/Meals.tsx)) | ✅ custom empty ([:247-252](frontend/src/pages/Meals.tsx#L247)) | ⚠️ generic spinner ([:253-258](frontend/src/pages/Meals.tsx#L253)) — **no skeleton, ordering is `count > 0 ? rows : !loading ? empty : spinner` so empty flashes before spinner if `count===0` and not yet loading** | ⚠️ destructive toast on mutations only; initial fetch error silent | OK; meals are usually ≤ ~20 |
| `/meals/add` (RecipeSelector, [RecipeSelector.tsx](frontend/src/pages/RecipeSelector.tsx)) | ✅ custom empty ([:172-180](frontend/src/pages/RecipeSelector.tsx#L172)) | ✅ skeleton list ([:156-171](frontend/src/pages/RecipeSelector.tsx#L156)) | ⚠️ destructive toast on mutation only; initial fetch silent | ❌ no virtualization; same `.filter()` per-render ([:53-76](frontend/src/pages/RecipeSelector.tsx#L53)) |
| `/meals/shopping-preview` ([MealsShoppingPreview.tsx](frontend/src/pages/MealsShoppingPreview.tsx)) | not checked closely (preview state) | local `loading` flag ([:49](frontend/src/pages/MealsShoppingPreview.tsx#L49)) — no skeleton | ⚠️ destructive toast on fetch error ([:71-77](frontend/src/pages/MealsShoppingPreview.tsx#L71)) | OK |
| `/household` ([Household.tsx](frontend/src/pages/Household.tsx)) | ❌ **none** — empty `households` array renders an empty `Card` body silently ([:88-116](frontend/src/pages/Household.tsx#L88)) | ❌ **none** — `loading` flag exists in store but isn't read here; user sees an empty card during fetch | ❌ silent — store sets `error` but page never reads it | n/a |
| `/household/:id` ([HouseholdDetails.tsx](frontend/src/pages/HouseholdDetails.tsx)) | n/a | ❌ **broken**: `householdDetails` is `null` while loading → page renders "Household not found" ([:89-99](frontend/src/pages/HouseholdDetails.tsx#L89)) — false 404 on every visit |  ❌ same false-404 bucket for real errors | n/a |
| `/settings` ([Settings.tsx](frontend/src/pages/Settings.tsx)) | n/a | n/a (form fields seeded from `user`) | toasts on mutations only | n/a |
| `/item-minimums` ([ItemMinimums.tsx](frontend/src/pages/ItemMinimums.tsx)) | ✅ custom empty ([:131-147](frontend/src/pages/ItemMinimums.tsx#L131)) | ⚠️ "Loading…" text only ([:127-130](frontend/src/pages/ItemMinimums.tsx#L127)) — no skeleton | ❌ silent for fetch; toast on mutation | OK; usually small list |
| `/loyalty-cards` ([LoyaltyCards.tsx](frontend/src/pages/LoyaltyCards.tsx)) | ✅ custom empty ([:208-219](frontend/src/pages/LoyaltyCards.tsx#L208)) | ⚠️ generic spinner ([:203-207](frontend/src/pages/LoyaltyCards.tsx#L203)) | ❌ silent on fetch; toast on delete only | OK; small list |
| `/more` ([More.tsx](frontend/src/pages/More.tsx)) | ✅ static menu, only `StorageAreasRow` lazy-fetches with empty fallback ([:210-213](frontend/src/pages/More.tsx#L210)) | ❌ no spinner for the lazy fetch — empty label appears even while loading | ❌ silent | OK |
| `/demo` ([Demo.tsx](frontend/src/pages/Demo.tsx)) | static demo page | n/a | n/a | n/a |
| `*` (NotFound, [NotFound.tsx](frontend/src/pages/NotFound.tsx)) | static — but **hard-coded `bg-gray-100` ignores dark mode**, "Oops! Page not found" is **not translated** ([:20](frontend/src/pages/NotFound.tsx#L20)) | n/a | n/a | n/a |

## Pages missing custom empty state
- **`/household`** — empty households array renders blank card; should explain and CTA to create/join.
- **`/dashboard`** — only "no storage areas" path is custom; there's no signal when the household is empty (zero items, zero recipes, zero meals): the entire dashboard just shows zeros + a hard-coded fake "Recent Activity" ([Dashboard.tsx:280-310](frontend/src/pages/Dashboard.tsx#L280)).

## Pages missing loading skeleton
Only **`/recipes`**, **`/recipes/:id`** and **`/meals/add`** have real skeletons. Every other page falls back to one of:
- Full-screen spinner block (Dashboard, Index, Onboarding, RecipeCookingMode, LoyaltyCards, Shopping)
- Plain "Loading…" text card (StorageArea, MyProducts, ItemMinimums)
- Nothing at all (Household, HouseholdDetails, Settings, More's lazy storages, MealsShoppingPreview)

This produces a visible flash of empty content on every list-based route. The codebase has `Skeleton` available ([components/ui/skeleton.tsx](frontend/src/components/ui/skeleton.tsx)) but only Recipes pages use it.

## Pages with silent or generic error handling
Network or 5xx fetch errors are **silently swallowed** (only `console.error`) and the page renders as if it were empty on:
- `/dashboard` (every store: storage areas, stored items, recipes, item-minimums, expiration notifications)
- `/storage/:id` (`fetchStoredItemsByStorageArea` error → looks empty)
- `/products` (`fetchStoredItems` error → looks empty; per-item `getItemById` errors → row shows "Loading…" forever)
- `/shopping` (initial fetch errors → silent, looks empty)
- `/household` & `/household/:id` (broken-404 confusion)
- `/item-minimums`, `/loyalty-cards`, `/more` storage row
- `/auth` OAuth callback (only `console.error` on token-exchange failure → user stuck on a button that does nothing)

The few good citizens use destructive `toast()` driven from a store `error` field via `useEffect`: Recipes, RecipeDetails, EditRecipe, MealsShoppingPreview. None of them surface an inline retry button.

Note: `apiAuth.makeAuthenticatedApiCall` ([utils/apiAuth.ts](frontend/src/utils/apiAuth.ts)) already toasts on timeout (line 104) and 401/session-expired (line 114) when `showToast: true` (the default). But the `householdStore` explicitly opts out (`showToast: false` in [householdStore.ts:75](frontend/src/stores/householdStore.ts#L75)), comment says "let individual stores handle messaging" — and individual pages don't.

## Pages at risk with heavy data
**No virtualization is used anywhere** — `react-window` / `react-virtualized` are not in dependencies (verified via repo-wide search). All lists render every row plus a `motion.div` wrapper with framer-motion `scrollReveal*` animations.

Worst offenders, in order:
1. **`/products`** — flat `storedItems.map()` with motion wrappers, plus issues N parallel `itemService.getItemById` calls for every stored item missing the embedded `item` payload ([MyProducts.tsx:197-227](frontend/src/pages/MyProducts.tsx#L197)). 500 items = 500 cards + (potentially) 500 fetches.
2. **`/storage/:id`** — `displayRows.map` over all items in the area ([StorageArea.tsx:983](frontend/src/pages/StorageArea.tsx#L983)). Same pattern of per-item `getItemById` ([:204-231](frontend/src/pages/StorageArea.tsx#L204)).
3. **`/shopping`** — flat map + dnd-kit `SortableContext` over all aisles. >100 pending items causes visible jank during drag.
4. **`/recipes`** — client-side `filter()` runs on every keystroke against the whole `recipes` array. No server-side search, no debounce.
5. **`/meals/add`** (RecipeSelector) — same client-side `filter()` over all recipes on every keystroke.

The backend already supports paginated recipe listings (`total` is read on Recipes) but the frontend never sends `limit`/`offset` and never asks for more pages.

## Stale data / refetch
React Query is initialized in [App.tsx:45](frontend/src/App.tsx#L45) but **`useQuery` / `useMutation` are not called anywhere in the codebase** (verified via search). All data flows through Zustand stores with manual `useEffect`-driven fetches. Consequences:
- No refetch on window focus / network reconnect / interval — a user who leaves the tab open all day sees stale storage / shopping data.
- No request deduping — multiple components mounting at once that each call `fetchStoredItems()` will fire concurrent requests.
- No stale-while-revalidate; the only "refresh" path is to re-mount the page or trigger a mutation.

## ErrorBoundary coverage
**Zero `ErrorBoundary` components exist in the codebase** (verified via search). [App.tsx](frontend/src/App.tsx) wraps the route tree in `QueryClientProvider`, `ThemeProvider`, etc. but no `ErrorBoundary`. Any uncaught render error in a page or sub-component blanks the whole app to React's default white screen.

This is the single biggest robustness gap — rendering a stored item with an unexpected `unit` or a recipe with malformed `instructions` would currently kill the app.

## Runtime validation (Playwright, 2026-05-10)

Run sur 4 pages clé (`/dashboard`, `/products`, `/recipes`, `/shopping`), mode dark.

### Console errors observés sur `/shopping`

8 erreurs `404 Not Found` Cloudinary (broken images en data backend ou cache invalidé) :
```
https://res.cloudinary.com/duxpbou8b/image/upload/v1776549221/items/bplfg2kjk8ah8uzgxwtb.jpg
https://res.cloudinary.com/duxpbou8b/image/upload/v1776629767/items/ok34wy444qxztjpqnmlx.jpg
https://res.cloudinary.com/duxpbou8b/image/upload/v1776593793/items/kx6ltxghbm2nslvcmhpd.jpg
https://res.cloudinary.com/duxpbou8b/image/upload/v1763055075/items/tomatoPaste2.jpg
https://res.cloudinary.com/duxpbou8b/image/upload/v1763055075/items/bacon2.jpg
https://res.cloudinary.com/duxpbou8b/image/upload/v1763055075/items/darkChocolate2.jpg
https://res.cloudinary.com/duxpbou8b/image/upload/v1763055075/items/burgundy2.jpg
https://res.cloudinary.com/duxpbou8b/image/upload/v1763055075/items/groundBeef2.jpg
```
**Nouveau finding non détectable statiquement** : 8 articles présentent une image cassée à l'écran. Soit (a) les uploads ont expiré du cache Cloudinary, soit (b) le seed initial pointait vers des assets qui n'existent plus (`*2.jpg` suggère un suffixe d'index oublié). Côté UX : l'`<img>` rend un broken-image icon à la place du thumbnail. Aucun fallback `onError` n'est en place dans les rows.

### Heading hierarchy live

| Page | Hiérarchie observée |
|------|---------------------|
| /dashboard | H1 → H3 → H3 → H2 → H3 ×6 (h3 avant h2 dans le flow document) |
| /products | H1 → H3 ×11 (pas de h2) |
| /recipes | H1 → H3 ×7 (pas de h2) |

→ Pattern systémique confirmé : `<CardTitle>` est `<h3>` partout, et il n'y a pas de `<h2>` intermédiaire pour structurer.

### React Query — confirmation runtime

Pas observé de `?refetch=` ou réactivité au focus. Le `QueryClientProvider` est mounted (vérifié dans devtools React) mais les chargements suivent le pattern Zustand `useEffect`. Pas d'évidence de stale-while-revalidate.

### ErrorBoundary — non vérifié

Impossible de provoquer un render error sans modifier le code. Le finding statique reste valide (`grep` n'a trouvé aucune `class ErrorBoundary` ni `componentDidCatch`).

### Empty states / loading — pas observés ce run

L'utilisateur a déjà des données ; les états empty/loading n'étaient pas atteignables sans modifier les données ou clear-localStorage. Findings statiques inchangés.

---

## Top 5 state issues (priority)

1. **[HIGH] No `ErrorBoundary` anywhere** — a single render bug blanks the entire app. Add a top-level boundary in [`App.tsx`](frontend/src/App.tsx) around `<Routes>` and per-route boundaries inside `AppShell` ([components/layout/AppShell.tsx]).
2. **[HIGH] `/household/:id` shows "Household not found" while loading** — [HouseholdDetails.tsx:89-99](frontend/src/pages/HouseholdDetails.tsx#L89) treats `null` as a 404 instead of a loading state. Read `loading` from the store and render a skeleton.
3. **[HIGH] No virtualization + N+1 item fetches on `/products` and `/storage/:id`** — [MyProducts.tsx:197-227](frontend/src/pages/MyProducts.tsx#L197), [StorageArea.tsx:204-231](frontend/src/pages/StorageArea.tsx#L204). Will jank above ~300 stored items and burn API quota. Either ensure backend always embeds `item` (it partially does) or batch the lookup via a `?ids=…` endpoint, and adopt `react-window`/`@tanstack/react-virtual` for the list.
4. **[HIGH] Silent fetch failures on Dashboard / Shopping / MyProducts / StorageArea** — store errors are stored but never surfaced. At minimum wire a `useEffect(error)` → destructive `toast()` like Recipes does ([Recipes.tsx:59-68](frontend/src/pages/Recipes.tsx#L59)). Long term, render an inline error block with a retry button.
5. **[MED] No real loading skeletons on the most-trafficked pages** — Dashboard, MyProducts, Shopping, StorageArea, ItemMinimums, LoyaltyCards all show plain spinners or "Loading…" text. The `Skeleton` component is already available; the existing `RecipeGridSkeleton` ([Recipes.tsx:313-343](frontend/src/pages/Recipes.tsx#L313)) is the right reference to copy.

### Bonus issues
- **[MED] `/household` has no empty / loading / error UI at all** — empty households array renders a blank `Card`. Add empty state with "Create or join" CTA (the page already has the buttons, just guard the list).
- **[MED] React Query is dead weight** — `QueryClientProvider` is mounted but never used. Either adopt it (would solve refetch-on-focus, dedup, stale-while-revalidate in one swoop) or remove it.
- **[MED] `NotFound` page hard-codes `bg-gray-100` and English copy** — [NotFound.tsx:17-20](frontend/src/pages/NotFound.tsx#L17). Breaks dark mode and i18n.
- **[LOW] Hard-coded fake "Recent Activity" on Dashboard** — [Dashboard.tsx:280-310](frontend/src/pages/Dashboard.tsx#L280). Looks live, isn't. Either wire to real activity or delete.
- **[LOW] `storedItemStore` toasts hard-coded English** — `"Item Added!"`, `"Failed to Add Item"`, etc. ([storedItemStore.ts:233-275](frontend/src/stores/storedItemStore.ts#L233)). Should use `i18n.t`.
