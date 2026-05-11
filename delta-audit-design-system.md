# Design-system delta audit

_Source state: branch `152-refonte-de-la-navigation-desktop-header-global-sidebar-verticale`, after the 12 fixes (Fix #5, #6, #12 verified). Generated 2026-05-10._

## Verified-fixed

- **Fix #6 — `Button variant="green"`** : `frontend/src/components/ui/button.tsx:15` reads `bg-[var(--mf-green)] hover:bg-[var(--mf-green-deep)] text-[#03150A] !rounded-[10px]`. CTA color and radius now charter-compliant. Drift removed: `RecipeDetails.tsx`/`StorageAreaManager.tsx`/`PushOptInBanner.tsx` no longer hold `bg-emerald-600` / `bg-green-600` button clones (only badge / pill remnants remain — see below).
- **Fix #5 — `<CardButton>` + `<CardLinkOverlay>`** : present in `frontend/src/components/ui/card.tsx:84-137`, with `mf-motion-card` and proper focus ring. Adopted by 6 files (`Dashboard.tsx`, `LoyaltyCards.tsx`, `Recipes.tsx`, `MyProductsItemCard.tsx`, `StorageAreaCard.tsx`). The `hover:scale-102` typo no longer appears anywhere in `frontend/src/`.
- **Fix #12 — Charter palette in Tailwind** : `tailwind.config.ts:74-94` exposes the full `mf.*` namespace (`mf-green`, `mf-green-deep`, `mf-green-soft`, `mf-danger`, `mf-danger-soft`, `mf-warning`, `mf-warning-soft`, `mf-info`, `mf-text*`, `mf-night*`). Adopted by `Dashboard.tsx`, `LowStockCard.tsx`, `ExpiringSoonCard.tsx`, `NotificationDrawer.tsx`, `AppHeader.tsx` (20 occurrences, no malformed `bg-mf-*` classes detected).

## Color drift remaining (counts + files)

| Family | Occurrences (excl. ui/ primitives) | Top files |
| --- | --- | --- |
| `bg-(green\|emerald\|lime)-[0-9]` | **31** total — only 4 lines in `ui/calendar.tsx` are inside primitives, the rest are app code | `Onboarding.tsx` (3 hero tiles `bg-green-500`), `RecipeDetails.tsx:448`/`AddRecipe.tsx:552`/`ImportRecipe.tsx:335` (step-bullet `bg-green-600`), `Household.tsx:96` (`Badge … bg-green-600`), `ItemMinimums.tsx:189`, `Demo.tsx:147`, `MyProductsItemCard.tsx:157` (status badge), `Recipes.tsx:99`, `RecipeDetails.tsx:124,472`, `StorageArea.tsx:323`, `ShoppingItemRow.tsx:113,121,248`, `BulkStorageDialog.tsx:156`, `MealRow.tsx:118` (icon hover), `ConsumeIngredientsDialog.tsx:256`, `RecipeSelector.tsx:118`, `BottomNavigation.tsx:39`, `MyProductsItemCard.tsx:265` (`lime-*` cooked-meal indicator), `itemUtils.ts:71` (`lime-*`), `PushOptInBanner.tsx:96,99` (`emerald-50/100`), `NotificationDrawer.tsx:181` + `NotificationSheet.tsx:193` (unread dot `bg-emerald-500`) |
| `bg-(rose\|red)-[0-9]` | **17** (excl. `ui/button.tsx:16-17` `delete`/`deleteTrash` variants) | `ItemEditor.tsx:283` (Save button — wrong semantic, hardcoded `bg-red-600`), `StorageAreaManager.tsx:188` (`bg-red-600`), `ShoppingItemRow.tsx:199` (icon hover), `MealRow.tsx:130`, `RecipeDetails.tsx:126`, `Recipes.tsx:101`, `ImportRecipe.tsx:190`, `StorageArea.tsx:83`, `ConsumeIngredientsDialog.tsx:249`, `RecipeSelector.tsx:120`, `itemUtils.ts:59` (`bg-red-100`), `itemUtils.ts:72` (`bg-rose-100`), `NotificationSheet.tsx:145,218` (rose-50/100 still present despite Fix #12) |
| `bg-(orange\|yellow\|amber)-[0-9]` | **24** | `LowStockCard` *no longer* drifts (Fix #12 ✓), but `ExpiringSoonCard` is now on `mf-danger`, not warning. Remaining: `MyProductsItemCard.tsx:148,213` (orange badges), `OpenedStatusToggle.tsx:87,89`, `StorageArea.tsx:84,322,488`, `StorageAreaCard.tsx:45` (`Badge … bg-orange-500 hover:bg-orange-600`), `Recipes.tsx:100`, `RecipeDetails.tsx:125`, `ImportRecipe.tsx:176,177,348,367,417,517` (orange/yellow), `AddRecipe.tsx:490` (`amber-50` warning card), `ConsumeIngredientsDialog.tsx:263`, `NotificationSheet.tsx:146`, `RecipeSelector.tsx:119`, `Demo.tsx:142`, `StagingEnvBanner.tsx:84`, `itemUtils.ts:58,63,70,74` |
| `bg-(blue\|sky\|cyan\|indigo\|purple)-[0-9]` (info channel) | **10** | `MyProductsItemCard.tsx:223` (frozen badge), `StorageArea.tsx:77,85`, `Demo.tsx:137,152`, `itemUtils.ts:60,62,64,65,67,68` (category palette built entirely from raw Tailwind families) |
| `text-(green\|emerald\|red\|rose\|orange\|amber\|yellow\|lime)-[567]00` | **40+** | Same families, used as foreground (icons / inline text). Heavy in `Demo.tsx`, `StorageArea.tsx:75-77`, `MealRow.tsx:118,130`, `ShoppingItemRow.tsx:199,251`, `OpenedStatusToggle.tsx:55,95`, `AvailabilitySummaryCard.tsx:55,71,76`, `MyProductsItemCard.tsx:269,287`, `BulkStorageDialog.tsx:129`, `BottomNavigation.tsx:39`, `ImportRecipe.tsx:354,362`, `AddRecipe.tsx:495,503`, `Meals.tsx:201`, `Shopping.tsx:640`, `RecipeDetails.tsx:390,396` |

**Recommended canonical replacements** (now that Fix #12 wired the tokens):

- `bg-green-{50,100}` / `text-green-{600,700,800}` (badge fresh / available / Easy / "good") → `bg-mf-green-soft text-mf-green-leaf` (charter "soft pill" pattern, charter:237).
- `bg-green-{500,600}` (hero tile, step bullet, badge) → `bg-mf-green text-[#03150A]` (charter primary surface). Same hover signature as Button: `hover:bg-mf-green-deep`.
- `bg-emerald-*` / `text-emerald-*` / `lime-*` (PushOptInBanner, NotificationDrawer/Sheet unread dot, MyProductsItemCard cooked-meal, itemUtils) → same `mf-green*` family. Eradicate the secondary "green" hues — they are the visible drift the runtime audit flagged on `/dashboard`.
- `bg-rose-*` / `text-rose-*` / `bg-red-{100,500,600,700}` for danger → `bg-mf-danger-soft text-mf-danger` for pills, `bg-mf-danger text-white` for solid. The `red-*` `delete` variant in `button.tsx:16-17` should also migrate to `mf-danger`.
- `bg-orange-*` / `bg-yellow-*` / `bg-amber-*` for warning → `bg-mf-warning-soft text-mf-warning` (badge) and `bg-mf-warning` (solid). One family only.
- `bg-blue-*` / `bg-sky-*` / `bg-cyan-*` / `bg-indigo-*` / `bg-purple-*` for info → `bg-mf-info-soft text-mf-info`. The category palette in `utils/itemUtils.ts:55-78` is the single biggest offender — it hardcodes 9 raw Tailwind families and should be re-authored to mix `mf-*` tokens (or, if the charter says "no decorative color", reduce to `mf-night-line` neutrals + a single accent).

## Card surface `bg-card/80 backdrop-blur-sm border-0 shadow-lg`

- **Count: 46** literal occurrences (vs. 44 before — count is now slightly higher because `Index.tsx:78,92,106,120` and `Recipes.tsx:239,321` were each separate paste sites; Fix #5 only swapped 6 callsites to `CardButton`/`CardLinkOverlay`, leaving the literal string copy-pasted on 25 files).
- **Files (top offenders)** : `RecipeDetails.tsx` (×9), `Shopping.tsx` (×6), `RecipeCookingMode.tsx` (×4), `AddRecipe.tsx` (×3), `Index.tsx` (×4 — also keeps the broken `hover:scale-105`), `ImportRecipe.tsx` (×3), `Recipes.tsx` (×3), `Dashboard.tsx` (×2), `MyProducts.tsx` (×2), `StorageArea.tsx` (×2), `AvailabilitySummaryCard.tsx` (×2), `Meals.tsx`, `AddItemCard.tsx`, `StorageAreaCard.tsx`.
- **Recipe** : extract a `<Card variant="elevated">` (or a `mf-card` utility class in `index.css`) carrying `bg-card/80 backdrop-blur-sm border-0 shadow-lg rounded-[var(--mf-radius-lg)]` and replace the literal across all 25 files in one sweep. Ideally the same primitive opts into `mf-motion-card` so the charter `translateY(-3px)` is enforced.
- **Bonus** : `Index.tsx:78,92,106,120` adds `hover:scale-105` next to the `bg-card/80…` literal — once the variant exists, kill `hover:scale-*` everywhere (charter motion = translate, not scale; 21 occurrences across 9 files still use `rounded-xl`/`rounded-2xl` ad-hoc, several of them paired with `hover:scale-105`).

## Heights / radius drift on CTA

- **`Button` size variants still mismatched** (`button.tsx:23-28`): `default h-10`, `sm h-9 rounded-md`, `lg h-11 rounded-md px-8`, `icon h-10 w-10`. Three height steps for the same primary role.
- **`!rounded-[10px]`** is forced **only** on the `green` variant — `default`, `secondary`, `outline`, `delete`, `lg`, `sm` keep `rounded-md` (≈ 6 px because of the unchanged `--radius: 0.5rem` bridge in `tailwind.config.ts:96-99`). Side-by-side `<Button variant="green">` and `<Button variant="outline">` therefore render with **different corner radii** (10 px vs 6 px). Drift moved, not eliminated.
- **`touch-friendly` (= `min-h-[44px] text-base`)** still applied to 9 buttons — `Recipes.tsx:123,131`, `LoyaltyCards.tsx:195`, `MyProducts.tsx:423,457,526`, `StorageArea.tsx:777,955`, `HouseholdDetails.tsx:316,325`. Each one bumps a `variant="green"` from 40 px to 44 px and re-introduces the height drift Fix #6 targeted.
- **Inline button-shaped clones still using raw greens** (excluding step bullets): zero `bg-green-600 hover:bg-green-700` button replicas remain in `frontend/src/` — Fix #6's sweep was complete on this axis. The `bg-green-600` survivors are 4 step-bullet circles (`AddRecipe.tsx:552`, `ImportRecipe.tsx:335`, `RecipeDetails.tsx:448`) and 1 badge (`Household.tsx:96`). Charter recipe: replace with `bg-mf-green text-[#03150A]`.
- **`tailwind.config.ts:96-99`** still maps `borderRadius.lg → var(--radius)` (= `0.5rem` = 8 px). Charter wants 14 px for cards. Every `Card` / `CardButton` / `<Card className="rounded-lg">` under-renders by 6 px. This is the single highest-impact unfixed item.
- **`--primary` HSL token** is still slate (`hsl(var(--primary))` resolves to a near-black) — `tailwind.config.ts:32-35` and `index.css` `:root`. So `bg-primary` / `Button variant="default"` is unusable as the brand button; devs keep reaching for `variant="green"`. Wiring `--primary` to the pistache HSL would let `default` finally be the brand.

## Typography drift

- **Page-title `text-xl font-bold`** : **16** files, exact same string `<h1 className="text-xl font-bold text-foreground">`. None reach charter `heading-1` (28 px). Files: `AddRecipe.tsx:343`, `Household.tsx:73`, `EditRecipe.tsx:308`, `ImportRecipe.tsx:227`, `Dashboard.tsx:171,247`, `ItemMinimums.tsx:109`, `LoyaltyCards.tsx:192`, `Meals.tsx:185`, `More.tsx:46`, `MyProducts.tsx:412`, `Recipes.tsx:115`, `Settings.tsx:199`, `Shopping.tsx:628`, `StorageArea.tsx:768`, `ErrorBoundary.tsx:59`. Plus 6 outlier `text-2xl`/`text-3xl`/`text-4xl` page titles (`RecipeDetails.tsx:112`, `RecipeCookingMode.tsx:110,236,434`, `EditRecipe.tsx:133`, `HouseholdDetails.tsx:263`, `Index.tsx:137`, `Demo.tsx:21`, `NotFound.tsx:19`). **No `<PageTitle>` primitive exists**.
- **`CardTitle` primitive default** still `text-2xl font-semibold leading-none tracking-tight` (`card.tsx:39`). 100 % of consumers override it (most often to `text-lg`). Charter `heading-2` = 20 px / 600 → primitive should default to `text-lg font-semibold` (or expose a `size` prop).
- **JetBrains Mono / mono utilities** : `font-mono` total = 11 occurrences across 5 files (`index.css`, `LoyaltyCards.tsx`, `CircularTimer.tsx`, `StagingEnvBanner.tsx`, `chart.tsx`). `mf-mono` / `mf-eyebrow` / `mf-caption` only used in `MealsShoppingPreview.tsx`, `RecipeSelector.tsx`, plus 5 dialog / preview helpers. The charter "voice" mono captions / unit tags / eyebrow remain invisible on the bulk of pages — Fix #12 didn't touch this.
- **`text-2xl font-bold` paired with raw color** : `Meals.tsx:201` (`text-green-600`), `Shopping.tsx:640` (`text-green-600`), `RecipeDetails.tsx:390,396` (`text-green-600`/`text-orange-600`), `AvailabilitySummaryCard.tsx:55-56` (`text-green-600 / text-yellow-600`). Big "stat numbers" reuse the deprecated raw greens — should swap to `text-mf-green-leaf` / `text-mf-warning`.

**Recommended fix order**:
1. Add a `<PageTitle>` component in `frontend/src/components/ui/` rendering `text-[28px] leading-[1.15] font-bold tracking-[-0.02em]` (charter heading-1) → sweep the 16 `text-xl font-bold` sites.
2. Re-default `CardTitle` to `text-lg font-semibold` (matches 90 % of consumers) and delete redundant `className="text-lg"` overrides.
3. Add `text-eyebrow` / `text-caption` Tailwind plugins (mono / uppercase / 0.08em letter-spacing) backed by the existing `.mf-eyebrow` / `.mf-caption` helpers — make charter typography reachable from utility soup.

## Spacing / 4-px-grid drift

- **Off-grid steps (`-1.5` = 6 px, `-2.5` = 10 px)** : 46 occurrences across 25 files (was ~30 in the original audit; trending up). Big offenders: `MealRow.tsx`, `ShoppingItemRow.tsx`, `Shopping.tsx`, `RecipeDetails.tsx`, `MealsShoppingPreview.tsx`, `LoyaltyCardForm.tsx`. Charter ladder is 4/8/12/16/24/32/48/64/96 only.
- **`rounded-xl` / `rounded-2xl`** ad-hoc usage : 21 occurrences across 9 files (`HouseholdDetails`, `Demo`, `Onboarding` ×4, `Index` ×6, `StorageAreaManager`, `StorageAreaCard`, `StoreSelector`, `AisleSection`, `sidebar.tsx`). None match `--mf-radius-lg`/`--mf-radius-xl` because the Tailwind bridge is unchanged.

## Top 5 remaining design-system priorities

1. **Fix the Tailwind radius bridge once** — `tailwind.config.ts:96-99`. Either set `--radius: 14px` in `index.css :root` or remap `borderRadius.lg → var(--mf-radius-lg)` and add `borderRadius.{ 'mf-md': 'var(--mf-radius-md)', 'mf-lg': 'var(--mf-radius-lg)', 'mf-xl': 'var(--mf-radius-xl)' }`. Then drop `!rounded-[10px]` from `button.tsx:15` (no longer needed) so all variants share a radius scale, and sweep `rounded-xl` / `rounded-2xl` (21 sites) onto `rounded-mf-lg`/`-xl`. **Single highest-leverage drift fix; everything else is downstream.**

2. **Extract `<Card variant="elevated">` (or `mf-card` class) and sweep the 46-occurrence literal**. Replace `bg-card/80 backdrop-blur-sm border-0 shadow-lg` everywhere with the variant; bake `mf-motion-card` into it; delete `hover:scale-10[0-9]` from `Index.tsx:78,92,106,120` (4 sites still use `hover:scale-105`).

3. **Tokenize `utils/itemUtils.ts:55-78` (category palette)**. It's the densest pocket of raw Tailwind families in the app — 9 categories × `bg-{family}-100 text-{family}-800`. Either compress to two semantic levels (`mf-night-line-soft` neutral + `mf-green-soft` for "in-stock") or redefine the palette through `mf-*` tokens with explicit hue mapping. Until this file is fixed, the cards rendered by `MyProductsItemCard`, `StorageArea`, recipe ingredient lists will keep showing 9 different hues.

4. **Wire `--primary → --mf-green` in `index.css :root`** (HSL form: `--primary: 142 71% 45%;` for `#22C55E`, plus its dark variant). This makes shadcn `Button variant="default"` finally the brand button, eliminates the need for the bespoke `green` variant, and lets `bg-primary` / `text-primary` / `ring-primary` work as a charter shortcut. Side benefit: the `BottomNavigation.tsx:39` mistake (`text-green-600 bg-green-50 bg-primary/10` — three colors stacked) becomes `text-primary bg-primary/10`.

5. **Promote a charter typography ladder + sweep page titles**. Add `<PageTitle>` and re-default `CardTitle` to `text-lg font-semibold`. Sweep the 16 copies of `<h1 className="text-xl font-bold text-foreground">` in one pass. Same PR can re-author `text-eyebrow`/`text-caption` Tailwind utilities so JetBrains Mono captions/unit-tags become available beyond the two demo pages currently using them — making the charter "voice" finally visible on the production app.

### Honourable mentions (not in top-5 but still drifting)

- `components/ui/calendar.tsx:49-55` — `day_selected: bg-green-500 hover:bg-green-700`, `day_range_middle: bg-green-200`. Off-charter; should be `bg-mf-green text-[#03150A]` and `bg-mf-green-soft text-mf-green-leaf` for the range middle.
- `components/ui/button.tsx:16-17` — `delete` and `deleteTrash` variants still hardcode `red-600/700` and `red-500`. Migrate to `mf-danger` / `mf-danger-soft`.
- `StorageAreaCard.tsx:45` — `<Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">` mixes the destructive variant (red) with an orange override. Should be `bg-mf-warning text-[#1A0F00]` (or whatever the charter "warning solid" foreground is).
- `Onboarding.tsx:128,180,226` — three hero tiles `bg-green-500 rounded-2xl`. With the radius bridge fixed, these become `bg-mf-green rounded-mf-xl`.
- `StagingEnvBanner.tsx:84` — `bg-amber-500 text-amber-950`. If the staging banner is meant to be on-brand, switch to `bg-mf-warning text-[#1A0F00]`. If it's intentionally off-brand (to scream "not prod"), document that in the file.
- `theme-color` meta in `index.html` (charter audit flagged `#000000`, not verified post-fix here — worth checking).
