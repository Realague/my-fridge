# A11y delta audit (post-12-fixes)

Audit date: 2026-05-10. Branch: `152-refonte-de-la-navigation-desktop-header-global-sidebar-verticale`. Static analysis only.

## Verified-fixed (no further action)

- **Fix #1 — ErrorBoundary**: top-level + route-level wrappers in `frontend/src/App.tsx:58,70`; `role="alert"` on the fallback (`ErrorBoundary.tsx:52`). Verified.
- **Fix #5 — Card focusability**: `<CardButton>` (native `<button>`) and `<CardLinkOverlay>` (stretched-link) are exported from `frontend/src/components/ui/card.tsx:84-137`. `StorageAreaCard.tsx:24` uses CardButton; spot-checks of Dashboard quick-actions, Recipes, MyProductsItemCard, LoyaltyCards, ImageUpload dropzone confirm the migration.
- **Fix #6 — green button contrast**: `frontend/src/components/ui/button.tsx:15` is `bg-[var(--mf-green)] hover:bg-[var(--mf-green-deep)] text-[#03150A]` — 8.26:1, AA pass.
- **Fix #10 — autofocus + form onSubmit**: AddItemCard wraps fields in `<form onSubmit={…}>` with `autoFocus` on the ItemSelector (`AddItemCard.tsx:112,122`); same pattern in StorageAreaDialog and AddStoredItemDialog.
- **Fix #2 — undo + larger touch targets**: `MyProductsItemCard` action buttons are now `h-10 sm:h-8` with aria-label/title; sonner undo wired in store.
- **Fix #12 (partial) — `mf-*` palette**: Tailwind exposes `bg-mf-danger`, `bg-mf-warning-soft`, etc. (`AppHeader.tsx:44`, `NotificationDrawer.tsx:142,145,199`, `ExpiringSoonCard`, `LowStockCard`).

## Still pending (severity / file:line / fix)

### HIGH

- **Pinch-zoom disabled (WCAG 1.4.4)** — `frontend/index.html:5` still has `maximum-scale=1.0, user-scalable=no`. Remove those two tokens; rely on `font-size: 16px` on inputs to suppress iOS focus-zoom.
- **`<html lang>` not synced to i18n (WCAG 3.1.1/3.1.2)** — `frontend/index.html:2` is hard-coded `en`; no `documentElement.lang` write anywhere in `frontend/src/i18n/config.ts` or App.tsx. Add a `useEffect` watching `i18n.language` (or an i18next `languageChanged` listener) that sets `document.documentElement.lang`.
- **No skip-to-content link** — neither `frontend/src/App.tsx` nor `frontend/src/components/layout/AppShell.tsx` renders a skip link. Sidebar has many tab stops before `<main>` (`AppShell.tsx:33`). Add `<a href="#main" class="sr-only focus:not-sr-only">` and an `id="main"` on `<main>`.
- **`button-name` violations on /shopping** — `frontend/src/components/shopping/ShoppingItemRow.tsx:117-126` (round complete checkbox), 165-180 (Save / Cancel), 184-203 (Edit / Delete), 290-315 (Skip / Cancel-X / Validate) are icon-only without `aria-label`. Multiplied across rows this still produces ~80–90 axe violations on /shopping. Add `aria-label={t(...)}` to each.
- **`button-name` violations on `NotificationDrawer.tsx` and `ImageUpload.tsx`** — `NotificationDrawer.tsx:91-95` (X close), `191-194` (Check mark-as-read), `195-202` (X remove): all icon-only without `aria-label`. `ImageUpload.tsx:204-212,213-221` (Pencil edit / X remove) likewise.
- **`<CardTitle>` hard-coded as `<h3>`** — `frontend/src/components/ui/card.tsx:32-45` still emits `<h3>`. 87 usages across 22 files (Dashboard, Index, Settings, Demo, AddRecipe, Recipes, Auth, RecipeDetails, etc.) jump h1 → h3. Make it polymorphic: accept `as` prop or a `level` prop and render the matching tag.
- **Touch targets <44px on rows outside StorageArea/MyProducts** — 182 occurrences of `size="sm"`/`h-8 w-8`/`h-7`/`h-6 w-6` across 51 files. Hot spots:
  - `frontend/src/components/shopping/ShoppingItemRow.tsx:117-126,165-203,290-314` (round checkbox is **24×24**)
  - `frontend/src/components/meals/MealRow.tsx:88-134` (5 buttons `h-8 w-8`)
  - `frontend/src/components/NotificationDrawer.tsx:191-202`
  - `frontend/src/components/ImageUpload.tsx:204-221`
  - `frontend/src/pages/RecipeDetails.tsx`, `pages/ItemMinimums.tsx`, `pages/HouseholdDetails.tsx`, `pages/ImportRecipe.tsx` — all use `h-8 w-8` action buttons.
  Fix: bump to `h-10 sm:h-8` like Fix #2 did, or add the `touch-friendly` class.
- **BarcodeScanner not a Dialog primitive** — `frontend/src/components/BarcodeScanner.tsx:107-143` renders a `fixed inset-0 z-[100]` overlay with **no Esc handler, no focus trap, no `role="dialog"`/`aria-modal="true"`**, and no aria-label on the close button. Wrap in Radix `Dialog.Root`/`Dialog.Content` (or implement keydown Esc + initial focus + focus trap manually). Add `aria-label={t('buttons.close')}` on the X button (line 114-116).

### MED

- **`text-muted-foreground` over light surfaces (#94A3B8 / #697381)** — 285 occurrences across 79 files. Charter prescribes `--mf-text-soft` (`#475569`, 7.58:1) instead. Re-token captions on hot pages first: Dashboard, MyProductsItemCard, ShoppingItemRow, MealRow, NotificationDrawer, AppHeader greetings.
- **Custom CSS classes lack `:focus-visible`** — `frontend/src/index.css`:
  - `.mf-btn` (line 277-291) — no focus state
  - `.mf-icon-btn` (line 310-322)
  - `.mf-toggle-opt` (line 375-384)
  - `.mf-stepper-btn` (line 396-410)
  Add a charter-aligned `:focus-visible { outline: 2px solid var(--mf-green); outline-offset: 2px; }` rule.
- **`focus:ring-blue-500` (off-charter) on raw input** — `frontend/src/components/ItemMinimumDialog.tsx:192`. Replace with `focus-visible:ring-2 focus-visible:ring-ring`.
- **Missing `aria-current="page"` on active nav** — `frontend/src/components/BottomNavigation.tsx:31-46` and `frontend/src/components/layout/AppSidebar.tsx:78-89` use `isActive` for color but emit no `aria-current`. Add `aria-current={isActive ? 'page' : undefined}` on the `<button>` / `SidebarMenuButton`.
- **`<nav>` landmark missing on BottomNavigation and AppSidebar nav region** — `BottomNavigation.tsx:23` is a `<div>`. `AppSidebar` uses Radix `Sidebar` (`<aside>`), but the nav menu itself is in `SidebarContent` → `<div>` → `SidebarMenu` → `<ul>` with no `<nav>` wrapper. Wrap `BottomNavigation` root in `<nav aria-label={t('navigation.main')}>` and the SidebarMenu in `<nav aria-label={t('navigation.sidebar')}>`.
- **BottomNavigation labels visually hidden on mobile (WCAG 2.5.3 Label in Name)** — `BottomNavigation.tsx:44`: `<span className="hidden text-xs font-medium sm:block">{item.label}</span>`. Aria-label compensates programmatically but the visible name is empty, so voice control by label is impossible. Reveal labels at all breakpoints (`text-[10px] sm:text-xs`) or use `sr-only` only for redundancy.
- **list/listitem axe violations from ScrollArea between `<ul>` and `<li>`** — `frontend/src/components/layout/SidebarStorageGroup.tsx:192-194` wraps `<SidebarMenuSubItem>` (`<li>`) inside `<ScrollArea>` (`<div>`) inside `<SidebarMenuSub>` (`<ul>`). Same for the desktop sidebar storage list. Move the ScrollArea to wrap a sibling container, or render the items as a `<div role="list">` with `role="listitem"` children.
- **`AisleSection` nested-interactive** — `frontend/src/components/shopping/AisleSection.tsx:87-121`: a `<header role="button" tabIndex={0}>` containing a `<button>` (drag handle) inside it. Move the drag-handle button outside the role="button" wrapper, or change the wrapper to a real `<button>` and move the drag handle to a sibling.
- **NotificationRow is a clickable `<div>`** — `frontend/src/components/NotificationDrawer.tsx:168-174`: `<div onClick={onClick}>` with no role/tabIndex/keyboard. Convert to a `<CardButton>` or add `role="button" tabIndex={0} onKeyDown={Enter/Space}`. (Has nested action buttons → use CardLinkOverlay pattern.)
- **`<Label>` without `htmlFor`** — still present in:
  - `frontend/src/components/AddItemCard.tsx:114-117,136-141` (raw lowercase `<label>` without htmlFor; ItemSelector/QuantitySelector have no id)
  - `frontend/src/components/ImageUpload.tsx:186` (`<label>` without htmlFor; the input is hidden anyway)
  - `frontend/src/components/QuantitySelector.tsx:195-197` (Radix `<Label>` without htmlFor wrapping a Checkbox)
  - `frontend/src/components/ItemMinimumDialog.tsx:183-185` (Label) + `:186-194` (raw `<input>` with no id)
  - `frontend/src/pages/StorageArea.tsx` (Label uses without htmlFor — not re-verified line by line, was flagged in original audit)
  Add explicit `id` on the input + `htmlFor` on the Label.
- **`alt="Preview"` is hard-coded English (i18n violation)** — `frontend/src/components/ImageUpload.tsx:200`. Use `alt={t('imageUpload.previewAlt')}` or the underlying file name.
- **No `aria-describedby` for form errors** — only `aria-describedby={undefined}` (a no-op) at `frontend/src/components/LoyaltyCardForm.tsx:127`. Validation feedback today goes through toasts only — not associated with the failing field. When introducing inline error messages, give them `id="<field>-error"` and add `aria-describedby` + `aria-invalid` on the input.

### LOW

- **44 `bg-card/80 backdrop-blur-sm border-0 shadow-lg` occurrences** — copy-paste pattern in 14 files. Not a hard a11y failure but causes the 24 axe `incomplete color-contrast` flags on Dashboard (transparency over backdrop-blur). Charter prescribes `mf-motion-card` + opaque surface; replace progressively.
- **`role="alert"` on static empty state** — `frontend/src/pages/HouseholdDetails.tsx:172,186` uses `role="alert"` on non-live error fallbacks. Acceptable, but semantically `role="status"` is closer for steady-state messages.
- **`hover:scale-105` not gated by `prefers-reduced-motion`** — Dashboard quick-action cards (`pages/Dashboard.tsx`), several Card hovers. Charter motion tokens are honored only on `mf-motion-card` / `mf-fade-in`.
- **Heading inside `<button>`** — `frontend/src/components/StorageAreaCard.tsx:36` renders `<h3>` inside CardButton. Functionally fine (the `aria-label` on CardButton overrides), but a `<span>` would avoid landmark scanners showing a button-titled heading.

## Estimated remaining axe violations on /shopping, /products, /recipes

- **button-name**: ~95 (91 ShoppingItemRow + ~4 NotificationDrawer when open)
- **list/listitem**: still present (SidebarStorageGroup ScrollArea wrap unchanged) — appears on every page rendering AppSidebar
- **nested-interactive**: 7+ on /shopping (AisleSection unchanged)
- **meta-viewport**: 1 (every page — unfixed)
- **heading-order**: ~22 pages (h1 → h3 from CardTitle)
- **color-contrast** (incomplete): ~24 nodes on Dashboard from `bg-card/80 backdrop-blur` (unchanged); plus white/text-muted-foreground over light surfaces (~6 per page)

## Top 5 remaining a11y priorities

1. **Make ShoppingItemRow icon-only buttons named and finger-sized** — fixes the single largest axe violation cluster (91 `button-name` on /shopping) and the 24×24 round-checkbox WCAG 2.5.5. File: `frontend/src/components/shopping/ShoppingItemRow.tsx:117-203,290-314`.
2. **Polymorphic `<CardTitle>` (or h2 default)** — eliminates h1 → h3 jumps across 22 pages. File: `frontend/src/components/ui/card.tsx:32-45`.
3. **Drop `maximum-scale=1.0, user-scalable=no` and sync `<html lang>`** — global WCAG 1.4.4 + 3.1.1 fixes, ~5 lines of code. Files: `frontend/index.html:2,5` + `frontend/src/i18n/config.ts`.
4. **Wrap BarcodeScanner in a real Dialog (Esc + focus trap + aria-modal)** — closes the only modal-like overlay that escapes Radix focus management. File: `frontend/src/components/BarcodeScanner.tsx:107-143`.
5. **Add skip-to-content + `<nav>` landmarks + `aria-current="page"` on bottom/sidebar nav** — keyboard onboarding parity for the global navigation. Files: `frontend/src/components/layout/AppShell.tsx`, `frontend/src/components/BottomNavigation.tsx:23-44`, `frontend/src/components/layout/AppSidebar.tsx:78-89`.
