# Content + States + Flows delta audit

Verification pass over the 12 fixes (`ba7f826` -> `cf4a31b`) plus 27 audit items
from `audit-content.md`, `audit-states.md`, `audit-flows.md`. Static analysis
only -- no browser, no runtime data.

## DONE / verified clean

- **Fix #2** -- sonner undo + `MyProductsItemCard` / `StorageArea` touch
  targets confirmed; restore via `createStoredItem` in
  `frontend/src/stores/storedItemStore.ts:328`.
- **Fix #3** -- 8 stored-item toasts use `i18n.t('messages.storedItem.*')`
  (`storedItemStore.ts:240,247,269,275,301,328,331,340,364,391,395`); no
  remaining hardcoded EN strings in that store.
- **Fix #4** -- `HouseholdDetails.tsx` ships full skeleton tree
  (`Skeleton` x 10, lines 134-156) and recovery UI; phase state is in place.
- **Fix #7** -- `useStoreErrorToast` is wired on Dashboard (6 stores),
  Shopping (2), MyProducts (2), StorageArea (2), ItemMinimums (1),
  LoyaltyCards (1). `pages/Auth.tsx` toasts the 3 OAuth-callback paths
  (lines 36, 75, 82). Key `messages.error.fetchFailed` resolves to
  "Action interrompue. Reessaie." in `fr.json`.
- **Fix #8** -- `ConsumeIngredientsDialog.tsx:91` defaults
  `saveLeftovers` to `false` with a comment matching the audit recipe.
- **Fix #10** -- `AddItemCard.tsx:112` wraps inputs in `<form onSubmit>`;
  `ItemSelector` accepts `autoFocus` and `AddItemCard` passes it
  (line 122). `StorageAreaDialog` and `AddStoredItemDialog` similarly
  refactored (verified by grep). NB: `AddItemCard` does NOT yet add a
  multi-add UX (still resets and waits for next click) -- see flow #27.
- **Fix #11** -- `vous/votre/vos` count now 61 keys (was 69); 21 keys
  rewritten as expected. Counts below are exact.

## STILL PENDING

### Content

- **HIGH** Item #1 -- `frontend/src/pages/Demo.tsx` is still 100% EN
  hardcoded (no `useTranslation`, no `t()` calls; `Back to Home`,
  `MyFridge Demo`, `Storage Areas`, `Smart Shopping Lists`,
  `Sarah added milk`, `Milk`, `Expires in 2 days`, etc., lines 17-178).
  Recipe: replace literals with `t()` keys under `pages.demo.*`, add
  to `en/fr/es.json`.
- **HIGH** Item #8 -- `Dashboard.tsx:299, 308, 317` still hardcodes the
  fake "Recent Activity" cards (`Sarah added milk to the fridge`,
  `Low stock: Bread`, `John completed shopping list`). Either remove
  the section (no real activity store exists) or build an
  `activityStore` and translate strings.
- **HIGH** Item #9 -- Raw `error.message` toasted (no localized title)
  in:
  - `components/AddStoredItemDialog.tsx:279` and `:331`
    (`toast.error(message)` where `message` may be raw backend text).
  - `components/meals/LeftoverPortionsDialog.tsx:174`
    (`toast.error(message)`).
  Recipe: wrap with `toast.error(t('messages.error.failedToAddItem'),
  { description: message })` like `StorageAreaManager.tsx:43-46`.
  (`StorageAreaManager` and `AddStorageAreaDialog` already use the
  title+description pattern -- count drops from 4 to 3 raw cases.)
- **HIGH** Item #6 -- Spanish-in-French still in
  `frontend/src/i18n/locales/fr.json:159-162` (`Congelateur de pecho`,
  `Cave a vin` for `iceBox`, `Garde-manger de pasillo`,
  `Garde-manger de alimentos`). Recipe: rewrite to FR
  (`Congelateur coffre`, `Glaciere`, `Cellier`, `Garde-manger`).
- **MED** Item #2 -- `pages/RecipeDetails.tsx:438`
  `<CardTitle className="text-lg">Instructions</CardTitle>` still
  hardcoded EN. Replace with `t('pages.recipes.instructions')` (key
  exists in en.json).
- **MED** Item #3 -- `components/ItemMinimumDialog.tsx:193`
  `placeholder="Enter quantity"` still EN. Replace with
  `t('forms.enterQuantity')` (key exists).
- **MED** Item #4 -- `components/QuantitySelector.tsx:164`
  `placeholder="Qty"` still EN.
- **MED** Item #5 -- shadcn UI defaults still EN: `pagination.tsx:73`
  (`Previous`), `:88` (`Next`), `:104` (`More pages`);
  `carousel.tsx:218` (`Previous slide`), `:247` (`Next slide`);
  `sidebar.tsx:280, 296, 299` (`Toggle Sidebar`); `dialog.tsx:47`
  (`Close`); `sheet.tsx:68` (`Close`); `breadcrumb.tsx:102` (`More`).
  These are in `sr-only` spans / `aria-label` so SR users hear EN.
  Recipe: feed `t()` from a wrapper or pass label props per usage.
- **MED** Item #7 -- locale parity: 20 keys missing in `fr.json`,
  45 keys missing in `es.json` (out of 3,824). Largest blocks:
  `messages.itemMinimum.*` (16 keys missing in both FR and ES),
  `pages.shopping.bulkStorage*` block (15 keys missing in ES),
  `pages.household.rename*` (4 missing in ES). Recipe: copy keys
  from en.json and translate.
- **MED** Item #10 -- Title-case FR still in `fr.json`:
  `:233 "editItem": "Modifier l'Article"`,
  `:234 "createNewItem": "Creer un Nouvel Article"`,
  `:854 "editRecipeTitle": "Modifier la Recette"`. Should be
  sentence-case ("Modifier l'article", etc.).
- **MED** Item #11 -- `messages.error.googleClientIdNotConfigured`
  still surfaced to the user via `pages/Auth.tsx:233` when env var
  is missing. The string still includes a literal env var name
  (`VITE_GOOGLE_CLIENT_ID`) and emoji. Recipe: gate behind
  `import.meta.env.DEV` or replace with a generic
  "Connexion indisponible" message.
- **LOW** Item #12 -- `vous/votre/vos`: 61 keys still use formal /
  possessive forms in `fr.json`. Notable remainders:
  `storageArea.descriptionPlaceholder` ("ce que vous stockez ici"),
  `storageArea.addItemToInformation` ("etes-vous en train d'ajouter"),
  `storageAreaManager.deleteConfirmation` ("Etes-vous sur"),
  `itemSelector.deleteItemConfirmation` (idem),
  `notifications.allCaughtUp` ("Vous etes a jour"),
  `messages.shoppingListGeneratedDescription_*` ("ajoutes a votre
  liste de courses"),
  `pages.dashboard.expiringSoon.pushOptIn.deniedToast` ("Vous pouvez
  la reactiver"), `pages.shopping.addedBy` ("Ajoute par vous"),
  `pages.recipes.consume.successDescription_*` ("deduits de votre
  stock"), `pages.importRecipe.matchedIngredientsDescription`
  ("Nous avons trouve ces correspondances dans votre base de
  donnees"). Recipe: rewrite confirmations and possessives to
  `tu / ton / tes / ta`.
- **LOW** Item #13 -- `avec succes` count is 16 (was 17). One regress
  fix dropped only one. Notable: `messages.success.recipe
  UpdatedSuccessfully` ("mise a jour avec succes"),
  `messages.success.householdJoinedDescription` ("rejoint le foyer
  avec succes"). Recipe: drop the auxiliary; voice charter prefers
  active phrasing ("Recette mise a jour", "Tu as rejoint le foyer").
- **LOW** Item #14 -- Keys ending with `!` count is 15 (was 18).
  Charter is no exclamation marks. Bulk replace remaining 15.

### States

- **HIGH** Item #15 -- `QueryClientProvider` is mounted in
  `App.tsx:59`, but `grep` finds **0** uses of `useQuery`,
  `useMutation`, `useInfiniteQuery` across `frontend/src`. All
  fetching goes through Zustand stores. Recipe: drop the provider
  or migrate stores to React Query (the latter is a big lift).
- **HIGH** Item #16 -- No `react-window` / `react-virtualized` /
  `@tanstack/react-virtual` import or dep anywhere in
  `frontend/`. `MyProducts.tsx` and `StorageArea.tsx` still render
  every stored item. Lists of 100+ items will jank.
- **HIGH** Item #19 -- `pages/Household.tsx` still has no empty /
  loading / error UI. The list `<Card>` (line 82) renders
  `households.map(...)` with no skeleton, no empty placeholder, no
  error surfacing -- when `households` is `[]` the card shows just a
  header and an empty `<CardContent>`. Recipe: import
  `useStoreErrorToast`, add a `Skeleton` while `loading`, render an
  empty-state message if `households.length === 0` and not loading.
- **HIGH** Item #20 -- `pages/NotFound.tsx` still has
  `bg-gray-100` (line 17) and EN copy
  `"Oops! Page not found"` (line 20). Only the home link is
  translated. Recipe: replace bg with `bg-background`, translate
  title/subtitle (`pages.notFound.title`, `pages.notFound.subtitle`).
- **MED** Item #18 -- Loading still text-only (`{t('common.loading')}`,
  no skeletons) on:
  - `Dashboard.tsx:116, 171`
  - `MyProducts.tsx:593`
  - `StorageArea.tsx:376, 923`
  - `ItemMinimums.tsx:131-133`
  - `LoyaltyCards.tsx:207-210`
  - `Shopping.tsx:662, 872, 881` (some show spinners, none use
    `<Skeleton>`)
  Recipe: import `Skeleton` from `@/components/ui/skeleton` and
  build per-page placeholders (mirror `RecipeDetails.tsx:555` /
  `HouseholdDetails.tsx:134`).
- **MED** Item #21 -- `Meals.tsx:247-258` ordering bug confirmed:
  the empty-state branch is `count > 0 ? meals : !loading ? empty :
  spinner`. Initial render with `loading=true && count===0` falls
  through to spinner (correct), but on a fast resolved fetch with
  count===0 the empty state can flash before content because there
  is no `loading` guard wrapping the outer ternary. Recipe: invert
  to `loading ? <Spinner /> : count>0 ? <List /> : <Empty />`.

### Flows

- **HIGH** Item #22 -- Two divergent UIs for "add stored item":
  - `pages/MyProducts.tsx:697` opens `<AddStoredItemDialog />`
    (modal, has cooked-meal toggle).
  - `pages/StorageArea.tsx:789-840` renders an inline `<Card>` form
    using `<ItemSelector>` + `<QuantitySelector>` directly (no
    cooked-meal flow, different fields).
  Recipe: route both entry points through `AddStoredItemDialog`
  with a `defaultStorageAreaId` prop.
- **HIGH** Item #23 -- `pages/RecipeCookingMode.tsx:450-455` mounts
  `<ConsumeIngredientsDialog />` **without** an `onCookComplete`
  prop (the prop exists, see `ConsumeIngredientsDialog.tsx:53`).
  `Meals.tsx:296` does pass `onCookComplete={handleCookComplete}`,
  so cooking from `/meals` correctly marks the meal. Cooking from
  `/recipes/:id/cook` still does not. Recipe: pass through
  the meal id (when navigating from a meal) and call
  `mealStore.markCooked` from `onCookComplete`.
- **MED** Item #24 -- `shoppingStore.deleteShoppingItem`
  (`stores/shoppingStore.ts:264-290`) sets `error` on failure (so
  `useStoreErrorToast` on Shopping page surfaces it) but never
  shows a success / confirmation toast. Page caller
  `Shopping.tsx:344-347` is also silent. Recipe: add
  `toast.success(t('pages.shopping.itemRemoved'))` after delete
  resolves, ideally with sonner undo.
- **MED** Item #25 -- `ConsumeIngredientsDialog.tsx:141-145`
  servings stepper still calls `loadPreview(newServings)` on every
  click; no debounce, no cache. Each `+`/`-` triggers a
  `/recipes/:id/consume-preview` POST. Recipe: wrap with a 250 ms
  debounce or memoize previews per servings.
- **MED** Item #26 -- Trash + edit buttons in
  `components/meals/MealRow.tsx:88-134` are all `h-8 w-8` (32 px,
  below 44 px touch target). `components/shopping/ShoppingItemRow.
  tsx:189, 199` use the same `h-8 w-8`. Fix #2 only enlarged
  `MyProductsItemCard` and `StorageArea` controls. Recipe: bump to
  `h-11 w-11 p-0` on `<Button>` for these rows.
- **MED** Item #27 -- `components/AddItemCard.tsx:86-89` resets the
  form silently on success. There is no "Add another" continuation
  affordance for shopping-list multi-add. Recipe: keep the
  `ItemSelector` autofocused after add, optionally surface a
  "Encore un ?" inline prompt.

### Runtime / not a code issue

- Item #17 -- 8 Cloudinary 404s on `/shopping` are stale URLs
  in DB rows; not a static-code issue. No code changes possible
  here.

## New regressions detected

- None. All 12 committed fixes do what their messages claim. No
  unintended deletions of `useTranslation` imports or i18n keys.

## Top 10 remaining items by impact / effort

1. **[HIGH/M] Item #1 Demo page** -- `frontend/src/pages/Demo.tsx`,
   ~50 hardcoded EN strings. Recipe: extract to `pages.demo.*` keys
   in 3 locales.
2. **[HIGH/S] Item #8 Dashboard fake activity** --
   `Dashboard.tsx:294-323`. Recipe: remove the placeholder section
   until a real `activityStore` exists.
3. **[HIGH/S] Item #9 Raw error.message toasts** --
   `AddStoredItemDialog.tsx:279, 331` and
   `LeftoverPortionsDialog.tsx:174`. Recipe: wrap in
   `toast.error(localizedTitle, { description })`.
4. **[HIGH/S] Item #6 Spanish-in-French** -- `fr.json:159-162`.
5. **[HIGH/S] Item #20 NotFound** -- `pages/NotFound.tsx`,
   translate + theme tokens.
6. **[HIGH/S] Item #19 Household empty/loading** --
   `pages/Household.tsx`, add `Skeleton` and empty state.
7. **[HIGH/M] Item #23 RecipeCookingMode meal completion** --
   wire `onCookComplete` prop; needs a `mealId` query param or
   route state to know which meal to mark.
8. **[HIGH/M] Item #22 unify add-stored-item UI** -- refactor
   `pages/StorageArea.tsx:789-840` to use `AddStoredItemDialog`.
9. **[MED/S] Item #18 Skeleton loaders** -- replace 9 text-only
   `t('common.loading')` blocks with `<Skeleton>` placeholders.
10. **[MED/S] Item #25 debounce consume preview** --
    `ConsumeIngredientsDialog.tsx:141-145`, add a 250 ms debounce
    on `loadPreview`.
