# Audit teammate-design-system

## Charter reference (extracted)

Source of truth: [`docs/charte-graphique.html`](docs/charte-graphique.html) (v3.0, "Mode nuit canonique"). Tokens are duplicated for light mode in [`frontend/src/index.css`](frontend/src/index.css) under `:root` with the same `--mf-*` prefix.

### Palette
- Surfaces (light/day): `--mf-night #F8FAFC` (page) / `--mf-night-surface #FFFFFF` (cards) / `--mf-night-elevated #F1F5F9` (hover) / `--mf-night-line #E2E8F0` (borders).
- Surfaces (dark/night, canonical): `#0B1018 / #0F1620 / #141C28 / #1E2A3B`.
- Encre: `--mf-text`, `--mf-text-soft`, `--mf-text-mute`.
- Accent unique = pistache `--mf-green #22C55E`, `--mf-green-deep #16A34A`, `--mf-green-leaf` (text on dark), `--mf-green-soft` (rgba 12 %).
- Sémantique: `--mf-danger #EF4444`, `--mf-info #3B82F6` (edit), `--mf-warning #F59E0B` (expire bientôt). Each has a `-soft` rgba variant.
- Charter rule (chapter 02): "Le vert pistache fait tout… Les autres couleurs sont des outils sémantiques, pas des décorations."

### Typography
- Single family **Inter** (display + body), **JetBrains Mono** for unités, captions, eyebrows. Loaded in `index.html:34` and aliased in `tailwind.config.ts:22-24` (`font-display`, `font-sans`, `font-mono`).
- Type ladder: `display-1 64/800/-.04em`, `display-2 40/700/-.025em`, `heading-1 28/700/-.02em`, `heading-2 20/600`, `body-lg 18`, `body 16`, `body-sm 14 (soft)`, `caption-text 12/mono/uppercase/.08em`.
- Helpers exposed in `index.css`: `.mf-display`, `.mf-mono`, `.mf-eyebrow`, `.mf-caption`, `.mf-section-title`.

### Radii / shadows
- Radii: `--mf-radius-xs 4`, `sm 6`, `md 10` (controls), `lg 14` (cards), `xl 20` (identities), `pill 999`.
- Shadows: `--mf-shadow-1` flat; `-2` cards; `-3` hero/modals; `-glow` focus pistache.
- Tailwind `borderRadius.lg` is wired to `var(--radius)` = `0.5rem` (8 px) — does **not** match the charter's 14 px, so any use of `rounded-lg` is off-spec.

### Motion tokens
- Duration: `--mf-dur-fast 120ms`, `--mf-dur 240ms`, `--mf-dur-slow 400ms`.
- Easing: `--mf-ease-out cubic-bezier(.16, 1, .3, 1)` (signature), `--mf-ease cubic-bezier(.25,.1,.25,1)`.
- Hover signature = `translateY(-3px)` + `--mf-shadow-2` + border-color, see `.mf-motion-card` (`index.css:220-228`).

---

## 1. Primary buttons across pages

The shadcn `Button` (`frontend/src/components/ui/button.tsx`) defines the variants. The de-facto primary CTA across the app is `variant="green"`, which hardcodes Tailwind `bg-green-600 hover:bg-green-700 text-white` — it does NOT reference `--mf-green` (`button.tsx:15`). The shadcn `default` variant is `bg-primary` (slate, near-black) which the codebase actively avoids.

| Page | Component | className/variant | Icon | Drift? |
|------|-----------|-------------------|------|--------|
| Dashboard (manage storage areas) | `Button` | `variant="green" size="sm"` | `<List className="h-4 w-4 sm:mr-2"/>` | OK (variant green, sm). `Dashboard.tsx:239-246` |
| Dashboard (empty-state CTA "add first storage area") | `Button` | `variant="green"` (default size = h-10) | none | Inconsistent size: this CTA jumps to default height while sibling above is `sm`. `Dashboard.tsx:255` |
| Recipes (Add recipe) | `Button` | `variant="green" className="touch-friendly"` | `<Plus h-4 w-4 sm:mr-2/>` | Adds `touch-friendly` (`min-h-[44px]`) override → bumps height to ~44 px, taller than other primaries. `Recipes.tsx:129-135` |
| Shopping (Bulk storage) | `Button` | `variant="green" size="sm" className="gap-1.5"` | `<PackageCheck h-4 w-4/>` | `gap-1.5` overrides shadcn's default `gap-2` (button.tsx:8). `Shopping.tsx:719-727` and again `:806-813` |
| Shopping (Add to storage dialog) | `Button` | `variant="green" className="flex-1"` | none | Uses default size in a paired layout with `outline`. OK shape, but spec says identity dialogs should use rxl; here it inherits `rounded-md`. `Shopping.tsx:594-601` |
| Settings (Sign out — destructive primary) | `Button` | `variant="destructive" className="w-full"` | none | Maps to shadcn `bg-destructive`, not `--mf-danger`. `Settings.tsx:355` |
| Settings (Save / primary) | `Button` | `variant="green"` | none | OK. `Settings.tsx:250-252` |
| Meals (Add recipe) | `Button` | `variant="green" size="sm" className="gap-1.5"` | `<Plus/>` | Same `gap-1.5` override. `Meals.tsx:217-225` |
| ItemMinimums (Add minimum) | `Button` | `variant="green"` (default size) | none | OK (height 40). `ItemMinimums.tsx:117, 141` |
| LoyaltyCards (Add card) | `Button` | `variant="green"` | none | OK. `LoyaltyCards.tsx:190, 215` |
| HouseholdDetails (Rename submit) | `Button` | `variant="green"` (default) | none | OK. `HouseholdDetails.tsx:203` |
| Household (Create new) | `Button` | `size="lg" variant="green" className="h-auto py-3"` | none | Custom `h-auto py-3` overrides `size=lg` (which is `h-11`). Drift. `Household.tsx:125` |
| RecipeDetails (Cook now / primary) | raw `<Button>` | `className="w-full bg-green-600 hover:bg-green-700 text-white"` | none | **Hardcoded color tokens** — bypasses both `variant="green"` and the charter token. `RecipeDetails.tsx:365` |
| RecipeCookingMode (Done) | `Button` | `variant="green"` | none | OK. `RecipeCookingMode.tsx:441` |
| MyProducts header CTA | `Button` | `variant="green"` | (see file) | OK. `MyProducts.tsx:417` |
| Onboarding (continue, x4 steps) | `Button` | `variant="green"` x4 | none | OK shape; sizes vary (default vs full-width via parent flex). `Onboarding.tsx:139, 211, 251, 297` |
| StorageAreaManager (Add area) | raw `<Button>` | `className="bg-green-600 hover:bg-green-700 text-white shrink-0"` | none | Hardcoded. `StorageAreaManager.tsx:119` |
| ItemEditor (Save) | raw `<Button>` | `className="bg-red-600 hover:bg-red-700 text-white"` | none | Wrong semantic color (red for save). `ItemEditor.tsx:283` |
| PushOptInBanner (Enable) | raw `<Button>` | `className="bg-emerald-600 hover:bg-emerald-700 text-white"` | none | Yet another green shade (emerald instead of green/pistache). `PushOptInBanner.tsx:119` |

Findings:
- **[HIGH]** Three different ways to render the "primary action": (a) `variant="green"` (most pages), (b) inline `bg-green-600 hover:bg-green-700` (RecipeDetails:365, StorageAreaManager:119, AddRecipe:552 etc), (c) `bg-emerald-600` (PushOptInBanner.tsx:119). Result: side-by-side primaries can read as different greens because emerald-600 ≠ green-600 ≠ `--mf-green`.
- **[HIGH]** `variant="green"` is itself off-charter — it points at Tailwind's `green-600 (#16A34A)` which equals `--mf-green-deep`, not `--mf-green (#22C55E)`. The hover state `green-700 (#15803D)` has no token at all. `button.tsx:15`.
- **[MED]** Heights drift across the same role: `size="sm"` (h-9, Dashboard:239, Shopping:719, Meals:218), default (h-10, Settings:250), `size="lg"+h-auto py-3` (Household:125), `touch-friendly` (min-h-44, Recipes:131). Five primary CTAs ought to have one canonical height.
- **[MED]** Icon spacing is inconsistent: shadcn Button gives `gap-2`, but Shopping/Meals add `className="gap-1.5"` (Shopping.tsx:723, Meals.tsx:221) while RecipeDetails:365 uses no icon at all. Pick one.
- **[MED]** `variant="destructive"` (Settings.tsx:355) renders shadcn red HSL, not `--mf-danger`/`--mf-danger-soft`. Charter spec for the danger button is the soft-danger pill (charter:237-238).
- **[LOW]** Round corners: `Button` defaults to `rounded-md` (Tailwind = `calc(var(--radius)-2px)` = 6 px). Charter says controls = 10 px (`--mf-radius-md`). Every button is sub-spec by 4 px.

---

## 2. Cards consistency

The shadcn primitive (`frontend/src/components/ui/card.tsx`) gives `rounded-lg border bg-card text-card-foreground shadow-sm`. With Tailwind's `rounded-lg` re-mapped to `var(--radius) = 0.5rem` (8 px), this is already off-spec (charter wants 14 px for cards).

However, virtually no card in the app uses `Card` "stock" — almost every site adds the **same string of overrides**: `bg-card/80 backdrop-blur-sm border-0 shadow-lg`. This appears 44 times across 14 files (grep pattern verified).

| Card | File | Radius | Shadow | Padding | Header | Footer |
|------|------|--------|--------|---------|--------|--------|
| `StorageAreaCard` | `StorageAreaCard.tsx:23-52` | shadcn `rounded-lg` (8 px) | `shadow-lg hover:shadow-xl` + `hover:scale-102` | `CardContent p-4` | none | none |
| `MyProductsItemCard` | `MyProductsItemCard.tsx:167-345` | `rounded-lg` (8 px) | `shadow-lg hover:shadow-xl` (no `hover:scale-`) | `CardContent p-4` | inline `h3 + 3 badges` | inline trash/edit btn column |
| Recipe card (in `Recipes.tsx`) | `Recipes.tsx:234-307` | `rounded-lg` (8 px) | `shadow-lg hover:shadow-xl hover:scale-105` | `CardHeader pb-3 + CardContent pt-0` | `CardTitle` + heart Button | inline badges flex |
| `LowStockCard` | `LowStockCard.tsx:58-146` | shadcn `rounded-lg` | no `shadow-lg`; uses gradient bg | `CardHeader px-4 sm:px-6` + `CardContent px-4 sm:px-6` | yes | none |
| `ExpiringSoonCard` | `ExpiringSoonCard.tsx` | `rounded-lg` | varies | `CardHeader/CardContent` standard | yes | none |
| `ShoppingItem` row | `ShoppingItemRow.tsx:108-117` | `rounded-lg` | none | `p-2.5 sm:p-3` (NOT a Card — a `<div>`) | none | inline |
| `AisleSection` (shopping aisle wrapper) | `AisleSection.tsx:82` | `rounded-xl` | `shadow-sm` | varies | yes | – |
| Storage areas in `StorageAreaManager` | `StorageAreaManager.tsx:129` | `rounded-xl` | `shadow-sm` | `p-4` | – | – |
| Recipe step container | `RecipeDetails.tsx:447`, `AddRecipe.tsx:552` | – | – | `bg-green-600 …rounded-full` (number bullet) | – | – |
| Loyalty card (selected) | `LoyaltyCards.tsx:111` | – | – | `min-h-screen` style with arbitrary inline `backgroundColor` | inline `<h2>` | none |
| Recent activity row (Dashboard) | `Dashboard.tsx:282-309` | `rounded-lg` | none | `p-3` | – | – |
| `MealRow` | `MealRow.tsx:48` | `rounded-lg` | none | `p-2.5 sm:p-3` | – | inline qty/edit |

Findings:
- **[HIGH]** Three radius scales coexist for "card" surfaces: `rounded-lg` (8 px in this codebase, the default for shadcn `Card`), `rounded-xl` (`AisleSection.tsx:82`, `StorageAreaManager.tsx:129`, hero icon tiles `Onboarding.tsx:128`), `rounded-2xl` (`Index.tsx:138`). Charter wants `--mf-radius-lg = 14 px` for all cards. None of the runtime values match.
- **[HIGH]** Two cards with the same role render with different motion: `StorageAreaCard.tsx:25` adds `hover:scale-102` (typo — Tailwind only supports `scale-105`/`110`; `102` is silently ignored), recipe cards (`Recipes.tsx:235`) use `hover:scale-105`, `MyProductsItemCard.tsx:169` has no scale at all. Charter specifies `translateY(-3px)` only (`.mf-motion-card`, `index.css:225-228`).
- **[HIGH]** The "almost-but-not-quite-the-charter" wrapper `bg-card/80 backdrop-blur-sm border-0 shadow-lg` (44 occurrences) overrides four shadcn defaults at once, and it's repeated as a string literal — not extracted into a class. Any tweak requires editing 44 sites.
- **[MED]** `MyProductsItemCard.tsx:102` and `:168` use `bg-card backdrop-blur-sm border-0 shadow-lg` (no `/80` opacity) while sibling cards on the same screen use `bg-card/80`. Visible drift.
- **[MED]** `LowStockCard.tsx:59` and `ExpiringSoonCard` opt into custom orange/rose gradients (`from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-orange-200`) — they look distinctly different from every other card and don't reuse `--mf-warning-soft` / `--mf-danger-soft`.
- **[MED]** `MyProductsItemCard.tsx:177` uses an inner thumbnail with `containerClassName="w-16 h-16 rounded-lg"`, while the charter signature thumb is 44 px (`mf-thumb`, index.css:252) or 56 px (`mf-thumb-lg`). Recipe card image is 160 px tall with no defined size token. Storage card thumb is 48 px (`StorageAreaCard.tsx:31`). Five different thumb sizes, no token.
- **[LOW]** `Card` primitive's `CardHeader` is `p-6`, `CardContent` is `p-6 pt-0`. Real usage almost always reduces it (`pb-3`, `px-4 sm:px-6`, `p-4`) — the default is unused, signaling the primitive is mis-set.

---

## 3. Spacing

Tailwind values used for "card padding", "row padding", "section gap":

- **Card content padding**: `p-4` (StorageAreaCard, MyProductsItemCard), `p-3` (Dashboard recent activity), `p-6` (CardHeader default), `px-4 sm:px-6` (LowStockCard, ExpiringSoonCard), `p-8` (empty states), `p-2.5 sm:p-3` (MealRow, ShoppingItemRow). Six discrete values for one concept.
- **Section vertical rhythm**: `space-y-3`, `space-y-4`, `space-y-6` are all in active use on the same screens (Dashboard `space-y-6` outer, `space-y-4` for storage list, `space-y-3` for storage list rows; Shopping uses `space-y-3` *and* `space-y-6`).
- **Gap between primary buttons in a group**: `gap-1` (Dashboard:185), `gap-1.5` (Shopping:723, Meals:221), `gap-2` (button.tsx:8 default, Dashboard:158, RecipeDetails:362), `gap-3` (Dashboard:42, MyProductsItemCard:173), `gap-4` (AddRecipe:684).
- **Half-step values**: `gap-1.5`, `p-2.5`, `pt-0.5`, `mb-0.5` appear regularly. Charter spec is the 4-px grid (`× 4 px`, charter:604-619); 1.5 (= 6 px) and 2.5 (= 10 px) are off-grid.

Findings:
- **[HIGH]** No spacing scale is enforced. Tailwind step `1.5/2.5` (= 6 px / 10 px) breaks the charter's 4-px grid (4/8/12/16/24/32/48/64/96 only, charter:609-618). Roughly 30 occurrences across `MealRow.tsx:48`, `ShoppingItemRow.tsx:109`, `Dashboard.tsx:185`, `Shopping.tsx:723`, `Meals.tsx:221`, etc.
- **[MED]** Same-semantic spacing differs by page: list-row internal padding is `p-2.5` (MealRow), `p-3` (Dashboard recent activity), `p-4` (StorageAreaCard) and the charter's `mf-list-row` (14/20 px = `padding: 14px 20px`, index.css:242-249) is used in **zero** TSX file outside of the experimental `MealsShoppingPreview.tsx` and `RecipeSelector.tsx`.
- **[LOW]** Container padding alternates `container mx-auto px-4 py-6 space-y-6` (Dashboard:207, Shopping, Recipes) with isolated overrides. This one is mostly consistent — the violations are inside the sections.

---

## 4. Typography drift

- **Page title (h1)**: 12+ pages use `text-xl font-bold text-foreground` (Dashboard:160, 235; Recipes:115; Shopping:623; Settings:199; Meals:185; ImportRecipe:227; LoyaltyCards:188; ItemMinimums:105; AddRecipe:343; EditRecipe:308; Household:73; MyProducts:407; More:46). HouseholdDetails:163 instead uses `text-2xl font-bold`. RecipeDetails:112 / RecipeCookingMode:236 use `text-2xl font-bold`. Index.tsx:51 uses `text-4xl md:text-6xl font-bold`. Charter's heading-1 is 28 px / 700 — none of the values land on 28. `text-xl` = 20 px (matches `heading-2`), `text-2xl` = 24 px (no charter step), `text-4xl` = 36 px (no charter step). **Three different choices for "page title" on top-level pages.**
- **Sub-section title (h2/h3)**: `text-lg font-semibold` (StorageArea:1017, LoyaltyCards:212), `text-lg font-medium` (MyProducts:598, ItemMinimums:135), `font-semibold` (Recipes card title via `CardTitle` = `text-2xl font-semibold`), `font-medium` (StorageArea:477, ItemMinimums:176, MyProductsItemCard:184). Same role, four variants.
- **Card title**: shadcn `CardTitle` = `text-2xl font-semibold leading-none tracking-tight` (card.tsx:39). Almost every consumer overrides it: `<CardTitle className="text-lg">` (Dashboard:277, Meals:213, Shopping:796). The default is never used. The override-to-default ratio means the primitive is mis-defaulted.
- **Body / meta / caption**: very loose. `text-sm text-muted-foreground` is the de-facto body-soft (used 100+ times). `text-xs text-muted-foreground` is the de-facto caption (60+). The charter's `caption-text` (mono / uppercase / .08em letter-spacing) appears only in `MealsShoppingPreview.tsx`, `RecipeSelector.tsx` (the "v3" pages). The `.mf-caption`/`.mf-eyebrow` helpers exist but are unused everywhere else.
- **Inline arbitrary sizes** (`text-[Xpx]`): all 22 occurrences are concentrated in `MealsShoppingPreview.tsx` (`text-[10px]`, `text-[12px]`, `text-[13px]`, `text-[14px]`, `text-[15px]`, `text-[20px]`) plus `Dashboard.tsx:194` (`text-[10px]` on the notification badge). The MealsShoppingPreview hard-codes the charter's pixel ladder — the rest of the app uses Tailwind steps that don't match. Either way, two systems live side by side.
- **Font family**: nothing in `frontend/src/**.tsx` ever applies `font-display`, `font-mono`, or `.mf-display` outside of `MealsShoppingPreview.tsx` / `RecipeSelector.tsx`. Inter is loaded; JetBrains Mono is loaded; JetBrains Mono is **invoked exactly twice in the entire app** (`mf-mono` in those two pages). The charter's caption / eyebrow / unit-tag identity is invisible.

Findings:
- **[HIGH]** Page-title role has 3 sizes (`text-xl`, `text-2xl`, `text-4xl`); none equal the charter's `heading-1` (28 px) — `Dashboard.tsx:160`, `RecipeDetails.tsx:112`, `Index.tsx:51`.
- **[HIGH]** JetBrains Mono is loaded but used in 2 files. The charter's "voice signature" via mono captions / eyebrows / unit tags is missing app-wide.
- **[MED]** `CardTitle` primitive default (`text-2xl font-semibold`) is overridden on every consumer. Either fix the primitive or codify a `<CardTitle size="lg">` variant.
- **[MED]** `font-medium` vs `font-semibold` for sub-titles toggles randomly (`MyProductsItemCard.tsx:184` vs `LoyaltyCards.tsx:239` — both are item cards on related screens).
- **[LOW]** `MealsShoppingPreview.tsx` and `RecipeSelector.tsx` are the only pages on-charter; all other pages use Tailwind steps. They look like an unfinished migration.

---

## 5. Color drift

`grep` for `bg-(orange|yellow|red|blue|green|rose|lime|sky|amber|emerald|cyan|violet|purple|pink|teal|indigo|fuchsia)-(50–950)` returned **80+ hits** across 28 files (head_limit truncated). Highlights:

- `green-{500,600,700}` literal in **20+ sites** (button.tsx:15, calendar.tsx:49-55, MyProductsItemCard:157, RecipeDetails:447 / 471 / 365, ImportRecipe:335, AddRecipe:552, Onboarding:128/180/226, Recipes:99, ConsumeIngredientsDialog:234, ShoppingItemRow:121/248, BulkStorageDialog:156, ItemMinimums:185, Household:96, StorageAreaManager:119). Charter says "Le vert pistache fait tout" via `--mf-green` — the literal `green-600` is not equal to `--mf-green` (it equals `--mf-green-deep`), and the hover `green-700` has no charter equivalent.
- `emerald-{100,500,600,700,950}` for the same "green" role (PushOptInBanner.tsx:96, 99, 119; NotificationDrawer.tsx:181). Inconsistent with `green-600` used elsewhere; visible color shift between adjacent UI surfaces.
- `lime-{100,400,700,800}` (MyProductsItemCard:265 cooked-meal indicator, itemUtils.ts:71). A **third** green family.
- `orange-{50…900}` instead of `--mf-warning-soft` / `--mf-warning` (LowStockCard:59, ExpiringSoonCard:?, StorageArea:83/317/483, MyProductsItemCard:148/209, OpenedStatusToggle:87/89, ImportRecipe:348/367/417/517, BarcodeDisplay note, ItemMinimums…).
- `rose-{50,100,300,500,600,700,950}` for danger (Dashboard:194, AppHeader:44, NotificationSheet:145/218, NotificationDrawer:142/199, ExpiringSoonCard:164/192). Charter has `--mf-danger #EF4444` and `--mf-danger-soft`. `rose-500` ≠ `--mf-danger` (hue shift toward pink).
- `red-{100,500,600,700,800}` ALSO for danger (button.tsx:16-17, ItemEditor:283, ShoppingItemRow:199, MealRow:130, RecipeDetails:125, ConsumeIngredientsDialog:227, ItemMinimums:180). Two danger families (rose vs red) coexist.
- `yellow-{100,800,900,200}` (RecipeDetails:125, Recipes:100, ImportRecipe:176/189, ConsumeIngredientsDialog:241). A second warning family next to orange.
- `blue-{100,200,400,700,800,900}` (MyProductsItemCard:219, Demo:137, Index:159, StorageArea:84). Used for "frozen" / informational. Charter `--mf-info #3B82F6` is `blue-500`-ish, but the badges use `blue-100/blue-800` shading instead of `--mf-info-soft`.
- **Hex / inline CSS** outside of vendor SVGs:
  - `#6B7280`, `#1f2937` fallbacks for loyalty-card colors (`LoyaltyCards.tsx:98, 108, 224`). These are fixed neutrals.
  - `#ffffff`, `#000000` (`BarcodeDisplay.tsx:97-98`, intentional for barcode contrast).
  - SVG paths in `Auth.tsx:207-210` (Google logo — acceptable).
- **Arbitrary Tailwind**: Only `MealsShoppingPreview.tsx` uses `text-[color:var(--mf-text)]` style, and that's actually correct — it bridges to the charter token. Elsewhere there are no `bg-[#abc]` overrides, which is the one bright spot.

Findings:
- **[CRITICAL]** Three "green" families coexist: Tailwind `green-600`, `emerald-600`, `lime-{}`. The charter mandates a single accent. `PushOptInBanner.tsx:119` and any nearby `variant="green"` button render two visibly different greens.
- **[CRITICAL]** Two "danger/error" families coexist: Tailwind `red-*` and `rose-*`. `MealRow.tsx:130` (red-500) sits next to `Dashboard.tsx:194`'s notification badge (`bg-rose-500`).
- **[HIGH]** Two "warning" families coexist: `orange-*` and `yellow-*`. Used for low-stock/expiring/difficulty indicators interchangeably (`Recipes.tsx:100` yellow vs `LowStockCard.tsx:59` orange-50).
- **[HIGH]** Tailwind `green-600` is **not** `--mf-green` — it's `--mf-green-deep`. Every primary CTA renders the hover-state pistache as the rest state, and there's no longer a "deeper" press color (because hover hops to `green-700` which has no token).
- **[MED]** Theme tokens (`--mf-green`, `--mf-warning`, `--mf-info`, `--mf-danger`) are wired in CSS but **not exposed in `tailwind.config.ts`**. There's no `bg-mf-green` utility to use, so devs reach for `bg-green-600`. Tailwind config exposes only the shadcn HSL bridge.
- **[MED]** The shadcn HSL bridge in `index.css:57-91` (light) and `:122-156` (dark) does **not** map `--primary` to `--mf-green`. `--primary` is slate (`222.2 47.4% 11.2%`). So `bg-primary` would render near-black, which is why the codebase avoids it and reaches for `bg-green-600` directly.
- **[LOW]** `theme-color` meta in `index.html:11` is `#000000`, not `--mf-night`.

---

## Runtime validation (Playwright, 2026-05-10)

Sondage runtime sur `/dashboard` (mode dark actif), boutons primaires détectés à `bg in [rgb(22,163,74), rgb(34,197,94), rgb(5,150,105), rgb(16,185,129)]`.

### Tokens chargés en CSS

```
--mf-green:        #22C55E   ✓ (charter)
--mf-green-deep:   #16A34A   ✓
--mf-text:         #F5F7FA   ✓
--mf-night:        #0B1018   ✓
--mf-radius-md:    10px      ✓
--mf-radius-lg:    14px      ✓
--radius:          0.5rem    ✗ Tailwind bridge → 8px (charter prescrit 14px sur cards)
--primary:         210 40% 98%   ✗ Slate, jamais le pistache → root cause du `bg-green-600` partout
```

### Boutons primaires sondés sur `/dashboard` (3 trouvés sur la même page)

| Texte | `background-color` | Token | `height` | `border-radius` | `gap` | `padding` |
|-------|--------------------|-------|----------|-----------------|-------|-----------|
| "Activer" | `rgb(5, 150, 105)` | **emerald-600** | 36 px | 6 px | 8 px | 0 12px |
| "Ajouter une zone" | `rgb(22, 163, 74)` | **green-600** (= `--mf-green-deep`) | 36 px | 6 px | 8 px | 0 12px |
| "Gérer" | `rgb(22, 163, 74)` | green-600 | 36 px | 6 px | 8 px | 0 12px |

**Confirmation runtime** :
- **2 familles de "vert" coexistent visuellement** sur la même page (emerald-600 et green-600). `color-contrast` axe critical sur `.bg-emerald-600` (Activer) la flagge.
- **Tous les CTA mesurent 36 px** = `h-9` = `size="sm"` shadcn. Charter prescrit 40 px contrôles. Drift -4 px.
- **`borderRadius: 6px`** = Tailwind `rounded-md` (= `calc(var(--radius)-2px)` avec `--radius: 0.5rem`). Charter prescrit `--mf-radius-md: 10px`. Drift -4 px.
- **`color: rgb(255, 255, 255)`** : ratio sur green-600 = **3.30** (FAIL AA normal text).

### Card surface — vérif "44 occurrences de bg-card/80"

axe-core retourne **24 nodes "incomplete color-contrast"** sur Dashboard, **6** sur les autres pages — exactement les cards avec backdrop-filter + transparence que l'algo axe ne sait pas évaluer. Cela correspond au pattern copy-paste flagué statiquement (`bg-card/80 backdrop-blur-sm border-0 shadow-lg`). Confirmé runtime par effet de bord.

### Comparaison écart charter / prod

| Spec | Charter | Code actuel runtime | Drift |
|------|---------|---------------------|-------|
| Primary CTA hauteur | 40 px (`h-10`) | 36 px (`h-9`) | -4 px |
| Primary CTA radius | 10 px (`--mf-radius-md`) | 6 px (`rounded-md` shadcn) | -4 px |
| Primary CTA texte | encre `#03150A` | white | contraste -2.96 ratio |
| Card radius | 14 px (`--mf-radius-lg`) | 8 px (`rounded-lg` shadcn = `var(--radius)`) | -6 px |
| Tailwind `--primary` token | pistache `#22C55E` | slate `210 40% 98%` | mauvaise couleur |

→ La structure du drift est **systémique** : `tailwind.config.ts` n'est pas wired aux tokens `--mf-*`. C'est la racine #1 à fixer avant tout sweep des classNames.

---

## Top 5 design-system issues (priority)

1. **Wire the charter tokens into Tailwind, then ban raw color classes.** Add `colors.mf.{night,green,greenDeep,greenLeaf,greenSoft,danger,info,warning,…}` in `tailwind.config.ts`, and replace every `bg-green-600 / bg-emerald-* / bg-lime-* / bg-orange-* / bg-rose-* / bg-red-*` with the corresponding `bg-mf-*`. Also expose `--mf-green` to shadcn's `--primary` so `Button` `default` finally becomes the brand. Files most affected: `button.tsx:15-17`, `calendar.tsx:49-55`, every `*Card.tsx`, `RecipeDetails.tsx:365 / 447`, `LowStockCard.tsx:59-75`, `ExpiringSoonCard.tsx:164-192`, `Dashboard.tsx:194`, `PushOptInBanner.tsx:119`, `StorageAreaManager.tsx:119`, `ItemEditor.tsx:283`, `MealRow.tsx:118-130`.

2. **Canonicalize the primary CTA.** Decide once: height (charter implies 40 px = `h-10`, padding `px-4 py-2` matches charter `padding: 10px 16px`), `--mf-radius-md` (10 px), icon `gap: 8px`, color `--mf-green`. Re-author `Button` `variant="green"` to use the tokens; delete the `touch-friendly` override, the `gap-1.5` overrides (`Shopping.tsx:723`, `Meals.tsx:221`), the `h-auto py-3` override (`Household.tsx:125`), and replace inline `bg-green-600 …` button clones (`RecipeDetails.tsx:365`, `StorageAreaManager.tsx:119`, `PushOptInBanner.tsx:119`) with the variant.

3. **Fix Tailwind's radius bridge.** `tailwind.config.ts:71-75` maps `borderRadius.lg` to `var(--radius)` (= 8 px), so every `rounded-lg` card under-renders by 6 px. Either set `--radius: 14px`, or remap `borderRadius.lg → var(--mf-radius-lg)` and add `borderRadius.mf-md/lg/xl` directly. Then sweep `rounded-xl`/`rounded-2xl` ad-hoc usage (`AisleSection.tsx:82`, `StorageAreaManager.tsx:129`, `Onboarding.tsx:128/180/226`, `Index.tsx:138`).

4. **Promote the charter typography ladder.** Make `<CardTitle>` (`card.tsx:32-45`) match `heading-2` (20 px / 600) — that's what 90 % of consumers already override to. Add `text-page` / `text-heading-1` / `text-heading-2` / `text-body` / `text-body-sm` / `text-caption` Tailwind plugins backed by the charter mono+caption rules. Then sweep `text-xl font-bold` page titles (16 occurrences) into a single `<PageTitle>` component, and start using `font-mono` for unit / count badges (currently zero usages outside two pages).

5. **Unify the card surface.** The 44 occurrences of `bg-card/80 backdrop-blur-sm border-0 shadow-lg` are a copy-paste design system. Either (a) flip them to `mf-card` / `mf-motion-card` (which already exist in `index.css:210-228` and match the charter), or (b) extract them into a real shadcn variant (`<Card variant="elevated">`). While doing that, kill the broken `hover:scale-102` (`StorageAreaCard.tsx:25` — Tailwind silently ignores it), align card padding on `p-6` per the primitive or on the 4-px grid, and align hover motion on the charter's `translateY(-3px) + shadow-2`.
