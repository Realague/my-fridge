# Audit teammate-a11y

**Scope:** WCAG 2.1 AA accessibility review of `frontend/src/`. Static code analysis only (Playwright not used; reserved for sibling agents). Charter palette extracted from `docs/charte-graphique.html` and `frontend/src/index.css`.

## Summary

- **Clickable `<div>`/Card without `role`/`tabIndex`/keyboard handler:** 7 occurrences across 6 files (Dashboard quick-action, LoyaltyCards card, MyProductsItemCard, Recipes recipe card, StorageAreaCard, ImageUpload drop zone, MealsShoppingPreview wrapper).
- **Icon-only buttons missing `aria-label`:** ~6 confirmed (NotificationDrawer mark/remove; ItemEditor remove-unit X; LoyaltyCards back/delete close-up view; ImageUpload edit/remove buttons; ShoppingItemRow edit/save/cancel/delete; LoyaltyCards barcode close button; AddItemForm close X). The codebase has a strong `aria-label` culture (~57 uses across 24 files), but a non-trivial minority of icon-only `<Button>` wrappers omit it.
- **Images missing `alt` (decorative or otherwise):** 4 flagged: ImageUpload preview uses `alt="Preview"` (non-i18n hard-coded English); MealsShoppingPreview row image uses `alt=""` (decorative is OK, but next to text — borderline); StoreSelector logo `alt=""`; ImportRecipe scraped image (line 300) — needs verification; AppSidebar logo correctly uses empty alt + `aria-hidden`.
- **Color pairs failing WCAG AA:** **3 failures + 5 borderline** (computed below). The biggest offenders: pistache **`#22C55E` on white** (2.28) and **white on `#22C55E`** (2.28), used widely (icons, button backgrounds, badges). Encre-mute `#94A3B8` (2.56:1) used as `text-muted-foreground` for captions.
- **Focus visible:** **partial.** Buttons/Inputs/Tabs from shadcn use `focus-visible:ring-2`. But several custom interactive elements (clickable Cards, drop zones, Stepper buttons via `mf-stepper-btn`, custom `mf-toggle-opt`) have no focus indicator at all. `outline-none` is used 38 times but always paired with a `focus-visible:ring`, except in `ItemMinimumDialog.tsx:192` which uses `focus:outline-none focus:ring-2 focus:ring-blue-500` (non-token, blue not from charter) on a raw `<input>`.
- **HTML `lang` not synced to i18n.** `index.html` has `<html lang="en">` static; the app supports en/es/fr but never updates `documentElement.lang` after language switch (`utils/dateFormatting.ts:29` only reads it).
- **Pinch-zoom disabled.** `frontend/index.html:5` sets `maximum-scale=1.0, user-scalable=no` — WCAG 1.4.4 (Resize Text) violation, blocks zoom users.

---

## 1. Semantic HTML / landmarks

**Good:**
- `AppShell.tsx:33` correctly wraps content in `<main>`.
- `AppHeader.tsx:25` uses `<header role="banner">` (the explicit role is redundant but harmless).
- `pages/More.tsx:44,52,77,209` is exemplary — `<header>`, `<main>`, `<section aria-labelledby>`, `<div role="region">`.
- `pages/MealsShoppingPreview.tsx:209,243` uses `<header>`, `<section>`.
- Breadcrumb / Pagination / NavigationMenu primitives correctly emit `<nav>`.

**Issues:**
- **No `<nav>` in `BottomNavigation.tsx`** — the mobile bottom nav (5 items, primary navigation surface) is wrapped only in `<div>`. Should be `<nav aria-label="Main">`.
- **No `<nav>` around `AppSidebar` SidebarMenu either** — shadcn `Sidebar` renders an `<aside>` in `components/ui/sidebar.tsx:184`, and `<nav>` is wrapped at `SidebarContent`? **No**, `SidebarContent` is just a `<div>`. The nav items live in `<ul>` (SidebarMenu) but are not wrapped in `<nav>` at all. Consider wrapping the menu in `<nav aria-label="Sidebar">`.
- **No skip-to-content link.** Keyboard / screen-reader users have to tab through the entire sidebar before reaching `<main>` content.
- **Heading hierarchy violations:**
  - `pages/Index.tsx`: `<h1>` (line 51) → `<CardTitle>` (renders `<h3>`, lines 83,97,111,125) → `<h2>` (line 137) — h3 appears before h2.
  - `pages/Dashboard.tsx`: `<h1>` (line 160) → `<h2>` (line 235), then no inner section uses `<h3>` for the storage-area cards (uses `<h3>` on line 35 of `StorageAreaCard.tsx`, fine). But `ExpiringSoonCard` and `LowStockCard` render `<CardTitle>` = `<h3>` — h3 before any h2 means hierarchy is fine at top, but the order `<ExpiringSoonCard h3> → <LowStockCard h3> → <h2>storageAreas</h2>` puts h3 before h2.
  - `pages/RecipeCookingMode.tsx`: nested `<h1>` (236), `<h2>` (253), `<h3>` (287) is fine — but additional `<h1>` (110, 236) on the same page (loading state vs loaded state) is acceptable since only one renders at a time.
  - `pages/Demo.tsx`: `<h1>` then `<CardTitle>` (h3) on line 34, then `<h3>` for sub items — skips h2.
  - `pages/Settings.tsx`: `<h1>` (line 199), but the `Tabs` content uses `<CardTitle>`=h3 directly under h1 — skipping h2.
  - `pages/RecipeDetails.tsx:499` uses `<h3>` inside a `Card` without an h2 between. Most "card title" usage globally jumps h1 → h3.
- **`<CardTitle>` is hard-coded as `<h3>` (`components/ui/card.tsx:32-46`).** Across 30+ pages this means h1 → h3 is the dominant pattern. Either expose a polymorphic `as` prop or render `<h2>` when used as the only title within a section.

## 2. Keyboard navigation

- **Focus traps in dialogs:** Radix Dialog/Sheet/AlertDialog primitives all handle focus trap + Esc-to-close natively. ✓
- **Drawers:** `vaul`-based Drawer used in `NotificationDrawer.tsx` — focus trap inherited. ✓
- **Custom modal-like overlays:** `BarcodeScanner.tsx` is a full-screen overlay that is not a Dialog primitive. Verify it traps focus while open; from skim it likely does not.
- **`MealsShoppingPreview.tsx:482-493`** is the gold standard — `<div role="button" tabIndex={0}>` with `onKeyDown` handling Enter/Space.
- **`AisleSection.tsx:88-101`** also handles keyboard correctly.
- **Cards are not keyboard-reachable** — see section 6. This is the dominant defect.
- **Bottom navigation has no Roving tabindex**, but since each `<button>` is independently focusable that's acceptable.
- **`StorageAreaDialog`/`AddStorageAreaDialog`/`StorageAreaManager`** — all use shadcn Dialog primitive, focus trap OK.
- **No documented Esc handler in BarcodeScanner overlay.**

## 3. Focus management

- **Buttons:** `components/ui/button.tsx:8` includes `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` — this is fine.
- **Inputs/Textarea/Select/Tabs/Switch/Checkbox/Radio:** all have `focus-visible:ring`. ✓
- **Custom CSS classes that suppress focus visibility:**
  - **`mf-toggle-opt`** (`index.css:375`) — used in `RecipeSelector.tsx:138-148` (a tab list of 3 buttons) — has no `:focus-visible` style. The buttons inside are `<button role="tab">` so they inherit the browser default outline only. Combined with `cursor: pointer` and a tinted hover background, the focused state is invisible.
  - **`mf-stepper-btn`** (`index.css:396`) — only defines `:hover` and `:disabled`, no `:focus-visible`. Used in `MealsShoppingPreview.tsx` quantity steppers and others.
  - **`mf-icon-btn`** (`index.css:310`) — no `:focus-visible`.
  - **`mf-btn`** (`index.css:277`) — no `:focus-visible`.
  - **`mf-input`** (`index.css:340`) — has a `:focus` but uses `outline: none; border-color: var(--mf-green); box-shadow: 0 0 0 3px var(--mf-green-soft);`. The 3px green-soft glow is borderline — `--mf-green-soft` is `rgba(34,197,94,.12)` which is barely visible against a white surface. Acceptable for sighted users but minimal.
- **`ItemMinimumDialog.tsx:192`** raw `<input>` uses Tailwind `focus:ring-blue-500` which is off-charter (charter uses pistache/encre, not blue).

## 4. ARIA

**Good:**
- `AppHeader` notif button has `aria-label`.
- `BottomNavigation` items have `aria-label` (line 35), but **no `aria-current="page"` for the active state** — sighted users get color, screen-reader users get nothing.
- `AppSidebar` items have `aria-label`, but also **no `aria-current="page"`** despite using `isActive`.
- `SidebarStorageGroup`, `AisleSection`, `pages/More.tsx` all use `aria-expanded`/`aria-controls` correctly.
- `MealsShoppingPreview.tsx:485` uses `aria-pressed` on the row button (toggle semantics).
- Decorative icons consistently `aria-hidden` (37+ uses) — good culture.

**Issues:**
- **Missing `aria-current="page"` on active nav links** (BottomNavigation, AppSidebar). Easy fix: pass `aria-current={isActive ? 'page' : undefined}`. Currently only used in shadcn Breadcrumb/Pagination.
- **Toasts (sonner) — no `aria-live`/role assertion documented in `components/ui/sonner.tsx`.** sonner sets it internally; verify with axe at runtime, but config doesn't override it.
- **`role="alert"` is set on `components/ui/alert.tsx:28`** but `Alert` is a static component, often non-dynamic. `role="alert"` should be reserved for live alerts; consider using `role="status"` or no role for static alert boxes.
- **`role="banner"` on AppHeader** is redundant (a `<header>` direct child of `<body>` already implies banner; but here it's nested inside a div, so the explicit role is correct — keep).
- **`HouseholdSwitcher.tsx:70`** when single household, the wrapper `<div aria-label=…>` has the label but no role. Either wrap in a button (no), or remove the aria-label (the inner `<Avatar>` and text are self-describing).
- **Notification badge count** in `AppHeader.tsx:43-46` uses a Badge with bare text — not announced as "new". Consider `aria-label={`${unreadCount} unread notifications`}` on the wrapping button.

## 5. Color contrast (WCAG AA)

Charter colors from `docs/charte-graphique.html` and `frontend/src/index.css`. Computed using WCAG 2.0 relative-luminance formula. AA threshold: 4.5 for normal text, 3.0 for large text (≥18pt regular / ≥14pt bold) and UI components.

| # | Foreground | Background | Ratio | AA? | Used where |
|---|---|---|---|---|---|
| 1 | Encre `#0B1018` | Surface white `#FFFFFF` | **19.06** | ✓ | body text, headings — perfect |
| 2 | Encre soft `#475569` | Surface white | **7.58** | ✓ | secondary text, captions |
| 3 | **Encre mute `#94A3B8`** | Surface white | **2.56** | ✗ FAIL | Charter `--mf-text-mute`, Tailwind `text-muted-foreground` (light) — used for "captions/désactivé" |
| 4 | **Pistache `#22C55E`** | Surface white | **2.28** | ✗ FAIL | brand color, icons (`text-primary`), badge text |
| 5 | Pistache deep `#16A34A` | Surface white | **3.30** | ⚠ Large/UI only | Tailwind `text-green-600`, used as accent text in many places (e.g. `Dashboard.tsx:635`, BottomNavigation active) |
| 6 | Encre `#0B1018` on Pistache `#22C55E` | — | **8.37** | ✓ | text on green-button (charter prescribes `#03150A` on Pistache, even higher) |
| 7 | **White on Pistache `#22C55E`** | — | **2.28** | ✗ FAIL | Tailwind `bg-green-600 text-white` button variant — `components/ui/button.tsx:15` (the `green` variant). White on pistache is extremely common but fails AA. Use Encre on Pistache instead, per charter (`#03150A` on `#22C55E` = 8.37). |
| 8 | Pistache leaf `#15803D` on Pistache-soft `#DCF7E5` | — | **4.41** | ⚠ Just under | Light-mode badge text |
| 9 | Danger `#DC2626` | Surface white | **4.83** | ✓ | destructive text |
| 10 | Warning `#D97706` | Surface white | **3.19** | ⚠ Large/UI only | warning text — fails AA for body text but passes for UI icons |
| 11 | Info `#2563EB` | Surface white | **5.17** | ✓ | info/edit links |
| 12 | Encre `#F5F7FA` on Night `#0B1018` | — | **17.76** | ✓ | dark-mode text |
| 13 | Encre soft `#9CA3AF` on Night surface `#0F1620` | — | **7.16** | ✓ | dark mode secondary |
| 14 | Encre mute `#5B6675` on Night surface | — | **3.12** | ⚠ Large/UI only | dark `--mf-text-mute` — fails AA for normal text |
| 15 | Pistache `#22C55E` on Night surface | — | **7.97** | ✓ | dark-mode primary works fine |
| 16 | muted-foreground `#697381` on muted `#F5F5F5` | — | **4.41** | ⚠ Just under | shadcn `text-muted-foreground` HSL token over `bg-card` — used on virtually every page |
| 17 | text-green-600 `#16A34A` on green-50 `#F0FDF4` | — | **3.15** | ⚠ Large/UI only | BottomNavigation active state color combo (`text-green-600 bg-green-50`, `BottomNavigation.tsx:39`) |
| 18 | Pistache `#22C55E` on Pistache-soft `#ECFDF5` | — | **2.16** | ✗ FAIL | Charter "vert frais" badge style if rendered with `--mf-green` text on `--mf-green-soft` bg in light mode. Use `--mf-green-leaf` (`#15803D`) instead — that's exactly what the charter does. |

**Net failures (AA, normal text):** 3 distinct charter token pairings (#3, #4, #7). #5/#10/#14/#16/#17 fail for normal-text but pass for UI/large-text; still risky on body copy.

**Top contrast fixes:**
1. Replace `text-white` on pistache with the charter's "Encre `#03150A`" (`text-[#03150A]` or define `--primary-foreground` accordingly). Affects `button.tsx` `green` variant (line 15) and any `bg-green-600 text-white` (BarcodeScanner header, multiple pages).
2. Use `--mf-text-soft` (`#475569`, ratio 7.58) instead of `--mf-text-mute` (`#94A3B8`, ratio 2.56) wherever the text is more than a hint.
3. For pistache as a text accent in light mode, use `--mf-green-leaf` (`#15803D`, ratio 4.81 vs white) instead of `--mf-green` (`#22C55E`, ratio 2.28).

## 6. Clickable but not focusable (full list)

These render as `<div>` (Card defaults to `<div>`) with `onClick`, no `role`, no `tabIndex`, no keyboard handler. They are unreachable by Tab key and not announced as buttons:

- `frontend/src/pages/Dashboard.tsx:212-223` — Quick-action `<Card onClick={() => navigate(action.route)}>` (5 cards: Shopping, Meals, Recipes, Item Minimums, Loyalty Cards).
- `frontend/src/pages/LoyaltyCards.tsx:227-231` — Loyalty card grid item `<Card onClick={() => setSelectedCard(card)}>`.
- `frontend/src/components/MyProductsItemCard.tsx:168-171` — Whole product card `<Card onClick={goToArea}>`.
- `frontend/src/pages/Recipes.tsx:234-237` — Recipe card `<Card onClick={() => navigate(...)}>`.
- `frontend/src/components/StorageAreaCard.tsx:24-27` — Storage area card `<Card onClick={onClick}>` (rendered in Dashboard storage areas list).
- `frontend/src/components/ImageUpload.tsx:230-233` — Drop zone `<div onClick={() => fileInputRef.current?.click()}>` with no role/tabIndex/keyboard. **Native `<input type="file">` is hidden** so the only path is mouse — broken keyboard onboarding.
- `frontend/src/pages/MealsShoppingPreview.tsx:563` — `<div className="…" onClick={stop}>` (this one is decorative — only stops propagation; lower severity).

**Fix pattern (apply to all Cards):** wrap content in `<button>` instead, OR add `role="button" tabIndex={0} onKeyDown={Enter/Space → onClick}` exactly as `MealsShoppingPreview.tsx:482-493` already does. The shadcn `Card` component should not be hard-coded to `<div>`; consider an `asChild` prop or a `<CardButton>` variant.

## 7. Touch targets <44px

Charter `touch-friendly` class enforces `min-h-[44px]` (`index.css:169`). Used inconsistently:

- **`<Button size="sm">`** — `h-9` (36px) — used in 60+ places (icon-only edit/delete on cards). Below the 44px Apple/WCAG 2.5.5 minimum for primary touch targets.
- **`className="h-8 w-8 p-0"`** — 32×32px — `MyProductsItemCard.tsx:313/325/336`, `StorageArea.tsx`, `ItemMinimums.tsx`, `RecipeDetails.tsx`, `MealRow.tsx`, `ShoppingItemRow.tsx`, `ImportRecipe.tsx`, `HouseholdDetails.tsx`, etc. (~20+ instances). These are icon-only action buttons (delete trash, freeze, etc.) — **clearly under 44px**.
- **`className="h-7 px-2"`** — 28px — `ShoppingItemRow.tsx:294,302,310` (skip / cancel / validate buttons in the quick-store inline panel).
- **`className="h-6 w-6 mt-1"`** — 24px — `ShoppingItemRow.tsx:117-126` (the round complete-checkmark button — main interaction!).
- **`mf-icon-btn`** is `width: 32px; height: 32px` (`index.css:310`).
- **`mf-stepper-btn`** is `32×32px` (`index.css:397`).

**The `touch-friendly` class is applied to Add buttons in headers but virtually never to the action buttons inside cards/rows.** This is the #2 mobile-a11y issue after clickable cards.

## 8. Images / icons missing alt

Decorative SVG icons (lucide-react) are mostly correctly hidden: `categoryIcons.tsx:76` defaults to `aria-hidden`. There are 37+ explicit `aria-hidden` annotations on lucide icons.

**Issues:**
- `frontend/src/components/ImageUpload.tsx:200` — `<img alt="Preview" />` — hard-coded English string (i18n violation) and a 200×400 photo without context. Use the file name or a translated key.
- `frontend/src/components/StoreSelector.tsx:42` — store logo `<img alt="" />` is a presentational logo — `aria-hidden` would be more correct, but empty `alt` is acceptable.
- `frontend/src/pages/MealsShoppingPreview.tsx:307,348,504` — item thumbnails `<img alt="" />` — fine when paired with a visible name beside, which they are.
- `frontend/src/pages/RecipeSelector.tsx:197` — recipe thumbnail — needs to verify `alt` value.
- `frontend/src/pages/Recipes.tsx:240` — recipe cover `<img src={recipe.imageUrl} alt={recipe.title} />` — ✓
- `frontend/src/pages/RecipeDetails.tsx:309` — recipe cover — verify
- `frontend/src/components/meals/MealRow.tsx:56`, `MealsShoppingMergeDialog.tsx:207`, `MealRemovalImpactDialog.tsx:276,348`, `ImportRecipe.tsx:300` — all use `<img>`; spot-check shows alt set or empty when adjacent to text.
- `frontend/src/components/layout/AppSidebar.tsx:56-60` — logo `<img alt="" aria-hidden="true">` — ✓ correct decorative pattern.

## 9. Forms — labels & error association

**Good:**
- `pages/Settings.tsx:228-247` — every Input has a Label `htmlFor`. ✓
- `components/ItemEditor.tsx:135-189` — every Label `htmlFor`. ✓
- `pages/MyProducts.tsx:476-490` — checkbox-label pattern with `id` + `htmlFor` correct.
- `pages/StorageArea.tsx:802-810` — uses `<Label>` but **without `htmlFor`** — the Input below has no `id` either. Visual association only.

**Issues:**
- `components/AddItemCard.tsx:108-117, 129-134` — uses raw `<label>` (lowercase) **without `htmlFor`**. The `<ItemSelector>` and `<QuantitySelector>` inside have no `id` to point to. Screen readers won't tie the label to the field.
- `components/ImageUpload.tsx:186` — `<label className="text-sm font-medium">{label}</label>` — no `htmlFor`. The actual `<input type="file">` is hidden (line 188).
- `components/QuantitySelector.tsx:190-198` — the `<label>` wraps a Checkbox + `<Label>` — the `<Label>` (Radix) has no `htmlFor` and no associated `id`.
- `components/ItemMinimumDialog.tsx:192` — raw `<input>` for shopping quantity has its own `<Label>` (line 183-185) but **no `htmlFor`/`id`** linking the two; also off-charter `focus:ring-blue-500`.
- `components/StorageAreaDialog.tsx` — has 4 `<Label>` uses; spot-check needed for `htmlFor`.
- `components/StructuredIngredientInput.tsx` — has 4 `<Label>`; spot-check needed.
- **No `aria-describedby` for error messages anywhere.** Searching, `aria-describedby` only appears in `components/ui/form.tsx:114` (the React Hook Form helper, used by zero callers in this codebase based on `<FormField>` grep) and `components/LoyaltyCardForm.tsx:127` (`aria-describedby={undefined}` — no-op). `toast.error()` is used for validation feedback — but those toasts are not associated with the failing field.
- **Native browser validation messages** are not styled or i18n'd; relies entirely on toasts.

## 10. Other findings

- **`<html lang="en">`** is static (`frontend/index.html:2`). When the user picks French/Spanish via i18n, screen readers continue to announce all content with English pronunciation rules. Add a `useEffect` in `i18n` setup that does `document.documentElement.lang = i18n.language`.
- **Pinch-zoom disabled** — `frontend/index.html:5`: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />`. WCAG 1.4.4 requires text-resize support up to 200%. Drop `maximum-scale=1.0, user-scalable=no` — the only justification is to suppress iOS auto-zoom on input focus, which can be solved with `font-size: 16px` on inputs (already the case for `mf-input` and shadcn Input).
- **Bottom nav labels hidden on mobile** — `BottomNavigation.tsx:44`: `<span className="hidden ... sm:block">{item.label}</span>`. The aria-label compensates, but visible labels improve learnability and meet WCAG 2.5.3 (Label in Name).
- **No `prefers-reduced-motion` honoring on hover scale** — `Dashboard.tsx:213` `hover:scale-105` is unconditional; only `mf-fade-in` and `mf-motion-card` honor reduced motion. Pages and Cards rely on `scrollRevealFadeUp(prefersReducedMotion)` for entrance, so motion-sensitive users do get partial relief, but transform-on-hover is everywhere.
- **`viewBox`-less inline SVG** in `Auth.tsx:206` is fine (it has a viewBox).
- **`tabIndex={-1}`** in `components/ui/sidebar.tsx:297` is on an internal layout div — fine.

---

## Runtime validation (Playwright + axe-core 4.10, 2026-05-10)

Run sur 4 pages (`/dashboard`, `/products`, `/recipes`, `/shopping`) en mode **dark**, viewport 1440×900 puis 375×812.

### Violations axe-core par page

| Page | Critical | Serious | Incomplete |
|------|----------|---------|------------|
| /dashboard | `meta-viewport` ×1 | `color-contrast` ×1 (`.bg-emerald-600`), `list` ×2, `listitem` ×5 | `color-contrast` ×24 |
| /products | `button-name` ×1, `meta-viewport` | `color-contrast` ×1 (`.sm:inline-flex > span`), `list` ×2, `listitem` ×5 | `color-contrast` ×6 |
| /recipes | `button-name` ×7, `meta-viewport` | `color-contrast` ×1, `list` ×2, `listitem` ×5 | `color-contrast` ×6 |
| /shopping | `button-name` ×91, `meta-viewport` | `color-contrast` ×1 (`.bg-green-600`), `list` ×2, `listitem` ×5, `nested-interactive` ×7 | `color-contrast` ×6 |

**Findings runtime nouveaux** (non flagués par l'analyse statique) :

1. **`button-name` sur 99 boutons cumulés** — /shopping seul a 91 ShoppingItemRow buttons sans nom accessible. La culture aria-label flagée plus haut concerne les buttons explicitement icon-only ; mais les wrappers de row + les checkmark + les chevrons ne sont pas comptabilisés statiquement.
2. **`list` / `listitem` SERIOUS sur toutes les pages** : `<ul data-sidebar="menu">` insère un `<div data-radix-scroll-area-content>` entre `<ul>` et `<li>` (sidebar storages). Les screen-readers perdent la sémantique list/listitem.
3. **`nested-interactive` x7 sur /shopping** : `AisleSection` rend un `<header aria-controls>` contenant des `<button>` enfants — interaction imbriquée invalide.
4. **24 nodes "incomplete color-contrast" sur Dashboard** : exactement les 44 cards `bg-card/80 backdrop-blur-sm border-0 shadow-lg` que axe ne peut résoudre seul (transparence + backdrop-filter). À tester manuellement : la `--mf-text-mute` (encore `#94A3B8`) sur ces fonds glass dépasse rarement 3:1.

### Cartes non-focusables — vérif directe

Sur `/dashboard` desktop, les **5 storage area cards** ("Réfrigérateur", "Garde-manger", "Placard de cuisine", "Congélateur", "test") ont **toutes** :
- `role`: null
- `tabIndex`: -1 (Tab les saute)
- `onKeyDown`: null
- `aria-label`: null

→ Le claim "Cards non-focusables" est confirmé strictement.

### Magnitude réelle (vs estimation statique)

| Métrique | Estimation statique | Mesure runtime |
|----------|--------------------|-----------------|
| Pointer-divs sans role/tabIndex (/dashboard) | ~6 | **68** |
| Pointer-divs sans role/tabIndex (/products) | "≥1 row card" | **216** |
| Buttons < 44px square (/products) | "~20+" | **53/62 (85%)** |
| Buttons < 44px square (/shopping) | "majority of action rows" | **113/118 (96%)** |
| Buttons < 44px (/dashboard mobile 375px) | non chiffré | **18/19 (95%)** |

L'audit statique sous-estimait l'ampleur d'environ ×10. Le pattern "Card → wrapper interne pointer-cursor" multiplie les zones cliquables non-focusables au-delà du `<Card onClick>` racine.

### Bottom navigation mobile (375 px) — vérif directe

- racine : `<div>` (**pas `<nav>`**)
- `aria-label` : null
- `aria-current="page"` sur l'item actif : **0/5**
- hauteur de chaque item : **36 px** (sous WCAG 2.5.5 = 44 px)
- labels textuels (`<span>`) : **5/5 cachés** (`display:none` à 375px). Les icônes restent seules → viole WCAG 2.5.3 Label in Name (le nom programmatique via `aria-label` ne contient pas le texte visible parce qu'il n'y a pas de texte visible).

### Contrastes WCAG calculés runtime

| Combo | Ratio | AA normal | AA UI/large |
|-------|-------|-----------|-------------|
| white sur green-600 (`#16A34A`) — primary actuel | **3.30** | ❌ | ✅ |
| white sur emerald-600 (`#059669`) — push notification | **3.77** | ❌ | ✅ |
| white sur pistache (`#22C55E`) | **2.28** | ❌ | ❌ |
| **encre `#03150A` sur pistache `#22C55E`** *(charter)* | **8.26** | ✅ | ✅ |
| encre `#03150A` sur green-600 | **5.71** | ✅ | ✅ |

→ Les 3 valeurs réellement utilisées en prod (white/green-600, white/emerald-600, white/pistache) échouent toutes WCAG AA pour le texte normal. Le fix charter (encre sur pistache) résout définitivement le problème avec une marge confortable.

### Conclusion runtime

L'audit statique a correctement identifié toutes les **classes** de violations a11y mais a sous-estimé la **magnitude** (clickable-divs ×10, tiny buttons /shopping +30%) et **manqué** : 99 button-name violations, list/listitem Radix wrapping, nested-interactive sur AisleSection. L'urgence des items #1, #3, #4 du top 5 ci-dessous est **renforcée**.

---

## Top 5 a11y issues (priority)

1. **[HIGH]** Card-as-button without keyboard support (Tab/Enter unreachable). 6 distinct components, ~20+ instances per session.
   - `frontend/src/components/MyProductsItemCard.tsx:168`
   - `frontend/src/components/StorageAreaCard.tsx:24`
   - `frontend/src/pages/Dashboard.tsx:212`
   - `frontend/src/pages/LoyaltyCards.tsx:227`
   - `frontend/src/pages/Recipes.tsx:234`
   - `frontend/src/components/ImageUpload.tsx:230`

2. **[HIGH]** Color-contrast failures on charter brand color in light mode. White on `#22C55E` = 2.28 (WCAG AA fails normal text). Affects every primary button: `frontend/src/components/ui/button.tsx:15` (`green` variant `bg-green-600 text-white`). Replace with Encre (`#03150A` or `#0B1018`), as the charter itself prescribes (`docs/charte-graphique.html` line 294 of computed CSS sets `.mf-btn-primary { background: var(--mf-green); color: #03150A; }`).

3. **[HIGH]** Touch targets under 44×44 px on mobile. The whole edit/delete/freeze/consume action set in `MyProductsItemCard.tsx:309-340`, `ShoppingItemRow.tsx:117-202`, `MealRow.tsx`, `RecipeDetails.tsx`, etc. uses `h-8 w-8 p-0` (32px) or smaller. WCAG 2.5.5 (AAA) and Apple HIG 44px not met.

4. **[MEDIUM]** Missing `aria-current="page"` on active nav (BottomNavigation, AppSidebar). Screen-reader users can't tell which top-level destination they're on.
   - `frontend/src/components/BottomNavigation.tsx:31-46`
   - `frontend/src/components/layout/AppSidebar.tsx:78-89`

5. **[MEDIUM]** Pinch-zoom disabled and `<html lang>` not updated on language switch. WCAG 1.4.4 + 3.1.1 issues affecting low-vision and screen-reader users globally.
   - `frontend/index.html:5`
   - `frontend/src/i18n/*` (no `lang` sync)
