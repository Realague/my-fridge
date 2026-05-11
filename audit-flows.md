# Audit teammate-flows

Scope: code-only audit (no Playwright, shared with 4 other agents). Counts assume the user starts from the relevant landing page already loaded, with at least one storage area already created (except in flow 5).

## Flow 1: Add item to stock

- **Entry point**: there are *three* concurrent entry points to the same action:
  1. FAB on `/products` (`MyProducts.tsx:681-689`) opens `AddStoredItemDialog`.
  2. "Add area" button + "Manage" on `/dashboard` lead to a per-area page `/storage/:id` whose top-right "+" button (`pages/StorageArea.tsx:766-774`) toggles a *separate inline form* (not the dialog).
  3. Bottom-nav "Storage" goes to `/products` (FAB), not to a generic add screen.
- **Clicks (golden path) — FAB on /products**: 4 clicks
  1. Tap "+" FAB
  2. Tap item in `ItemSelector` results
  3. Optionally adjust qty/unit/area — not counted, defaults are pre-suggested (`AddStoredItemDialog.tsx:123` `suggestAreaId`)
  4. Tap "Add to {area}"
  5. Implicit close
- **Clicks — per-area page**: 4 clicks (Plus → search/select item → "Add to {area}").
- **Feedback**:
  - Dialog flow shows a `sonner` toast with a "View" action linking to `/storage/{areaId}` (`MyProducts.tsx:156-161`). Excellent.
  - In-page flow on `/storage/:id` shows a toast (`StorageArea.tsx:273`) but **no "View" action** — inconsistent with dialog.
  - Submit button shows "Adding…" label (`AddStoredItemDialog.tsx:642`); no spinner icon.
  - Optimistic UI: yes (item appended client-side immediately on success: `AddStoredItemDialog.tsx:267`).
- **Undo/cancel**: Cancel button + close-on-overlay both available; **no undo toast** after creation.
- **Error states**: `try/catch` shows `toast.error` with backend message (`AddStoredItemDialog.tsx:276-280`). Quantity validation is gated (`tsx:241-244`). On a deleted area mid-flow, an inline message appears (`tsx:248-251`). Network drop -> generic toast only.
- **Friction points**:
  - [HIGH] **Two divergent UIs for the same action** — modal at `/products` vs inline form at `/storage/:id` (`pages/StorageArea.tsx:780-907`). The inline form lacks the storage-area suggestion sparkle, the cooked-meal toggle, and the "View" toast action. Maintenance and UX inconsistency.
  - [HIGH] **No autofocus** on any dialog input. After clicking "+", users must click again into the search box. — `components/AddStoredItemDialog.tsx:393-398`, `components/ItemSelector.tsx`.
  - [MED] No keyboard submit. Pressing Enter inside the dialog does nothing (no `<form onSubmit>`). — `AddStoredItemDialog.tsx:342-650`.
  - [MED] FAB is `sm:hidden` (`MyProducts.tsx:686`). On desktop the only entry path is via `/storage/:id` per-area flow or "Add area" (no global "+ item" CTA in the sidebar/header).
  - [MED] No barcode-scan path from the add dialog despite `BarcodeScanner.tsx` existing.
  - [LOW] Dialog conditionally hides quantity/area sections until an item is selected (`tsx:506-624`), causing the dialog to grow. Acceptable but jumpy.
  - [LOW] Cooked-meal toggle is mounted as a tab on top of the same dialog — fine, but tab labels are full sentences, looks heavy.

## Flow 2: Mark item as consumed

- **Entry point**: `/storage/:id` (or `/products`); each item card has a trash icon. For cooked meals, additionally a "Consume portion" `Utensils` button.
- **Clicks (golden path)**: **1 click** (just the trash button) for full deletion.
  - For cooked meals, also 1 click to consume a single portion (decrement) — `pages/StorageArea.tsx:683-694`.
- **Feedback**:
  - Delete: toast.success "Item Removed!" (`stores/storedItemStore.ts:292-294`). No item name, no area. Generic.
  - Consume portion: toast.success with remaining count if any (`pages/StorageArea.tsx:434-440`).
- **Undo/cancel**:
  - **No confirmation dialog** before deletion (`pages/StorageArea.tsx:716-723`, `handleDelete` at `pages/StorageArea.tsx:416-424`).
  - **No undo action** in the toast.
  - Closing the swipe/clicking elsewhere doesn't help — single click destroys data.
- **Error states**: `try/catch` in store -> toast.error "Delete Failed" with description (`storedItemStore.ts:299-303`). On network failure same flow.
- **Friction points**:
  - [HIGH] **One-click destructive delete with no undo and no confirmation** — `pages/StorageArea.tsx:716-723`. This is the single biggest data-loss risk in the app: a misclick on the trash icon (which sits next to the edit pencil) instantly drops the stored item and only shows a confirmation-style toast that lacks an "Undo" action. Same pattern in `MyProducts.tsx`.
  - [HIGH] **"Mark as consumed" is conceptually the same as "delete"**. There is no semantic action separating "I ate it" from "I'm throwing it out". Cooked meals get a portion-decrement button (`Utensils`); ingredient items don't. A user finishing a yogurt has to either edit-quantity-down or trash it.
  - [MED] Delete success toast says "Item has been removed from storage" but doesn't echo the item name (`stores/storedItemStore.ts:293-294`), so an accidental delete of the wrong row is invisible.
  - [MED] The trash button uses the same size/affordance as the edit button (`size="sm"`, both 8x8) and they sit stacked (`StorageArea.tsx:708-723`); easy to mis-tap on mobile.
  - [LOW] No quantity-decrement shortcut for non-cooked-meal items: editing requires entering edit mode (3 clicks: edit → −/qty → save).

## Flow 3: Shopping list from scratch

- **Entry point**: `/shopping` (bottom nav "Shopping" or dashboard quick action).
- **Clicks (golden path) — add ONE item**: 3 clicks
  1. Tap search box in `AddItemCard` (`pages/Shopping.tsx:646-651`, `components/AddItemCard.tsx`)
  2. Tap result item
  3. Tap "Add" (qty defaults to 1, unit auto-fills)
- **Repeat**: each subsequent item is the same 3-click cycle. There is **no "add another"** continuation; after submit the form resets but the search input is **not auto-refocused** (`AddItemCard.tsx:86-89`).
- **Feedback**:
  - `toast.success` with "{item} {qty}{unit}" (`AddItemCard.tsx:81-84`).
  - Optimistic: the new item appears in "To buy" list (`shoppingStore.ts:209-220`).
  - **No toast inside `shoppingStore.createShoppingItem`** itself — relies entirely on AddItemCard. If another caller (future code) added a shopping item, it would be silent.
  - "Adding…" spinner inside the button while in flight (`AddItemCard.tsx:151-157`).
- **Undo/cancel**: No undo on add. Delete on a row also gives no toast at all (silent: `shoppingStore.ts:264-289`).
- **Error states**: `toast.error('Failed to add')` (`AddItemCard.tsx:91-92`). Quantity zod-validated client-side (`AddItemCard.tsx:61-72`). Backend-merging items into existing rows is handled (`shoppingStore.ts:212-219`).
- **Friction points**:
  - [HIGH] **"From scratch" is the slowest path** — 3 clicks + a click to refocus per item, with no "+/Add another" multi-add UX. For a typical 15-item list that's ~60 clicks.
  - [HIGH] **Search box is not autofocused** when the page loads, nor after a successful add. A list-building user re-clicks the search box every time. — `AddItemCard.tsx`.
  - [MED] **No "create from low-stock"** path is surfaced on this page. Low-stock items live on the dashboard card; nothing on `/shopping` says "you're out of X — add it". (The "Item Minimums" page has a "Generate shopping list" affordance but it's two more navigations away.)
  - [MED] **Silent delete** in `shoppingStore.deleteShoppingItem` (`stores/shoppingStore.ts:264-290`); destructive action with no toast at all. Worse than Flow 2 because at least Flow 2 toasts.
  - [MED] Aisle / A-Z toggle, category filter, bulk-storage button compete for attention on top of the page; a brand-new list user has to skip past `Filter by category`, `View mode toggle`, and a "Bulk Storage" button before they reach the "Add" card. — `pages/Shopping.tsx:670-712`.
  - [LOW] When a user toggles the checkbox on a pending item, it pops a "Quick store" prompt with a date picker (`Shopping.tsx:181-191, 193-241`). Useful but adds friction during the actual checkout sweep — there's no "skip all" while the prompt is per-item.

## Flow 4: Mark recipe cooked

- **Entry point**: `/recipes/:id` (RecipeDetails) → "Consume ingredients" button (`pages/RecipeDetails.tsx:376-379`). Also from `/recipes/:id/cook` end-of-cook screen, and from `/meals` cook button.
- **Clicks (golden path, from recipe details)**: **5 clicks minimum**
  1. Tap "Consume ingredients" button → opens `ConsumeIngredientsDialog`
  2. Adjust servings if needed (skip)
  3. Tap "Confirm" — server deducts from stock (`ConsumeIngredientsDialog.tsx:184-201`)
  4. `LeftoverPortionsDialog` opens (one extra modal, even if 0 leftovers)
  5. Tap "Save portions" or "Skip"
- If launched from `/meals`, an extra `markMealCooked` API call also runs (`pages/Meals.tsx:142`).
- If launched from `/recipes/:id/cook`, the user must first tick every step's checkbox to reach the completion card (`RecipeCookingMode.tsx:430-447`) — full cook mode is **not counted in the click budget** because it's a feature, not a friction.
- **Feedback**:
  - Consume preview returns counts of ingredients to deduct (`ConsumeIngredientsDialog.tsx:140-153`, badges per ingredient).
  - On confirm: `toast({ title: success, description: 'Deducted N items' })` (`ConsumeIngredientsDialog.tsx:186-193`). Loading state is `consumeLoading`.
  - Leftover saved: `toast.success('cookedSavedTitle', { count, dish, area })` with action "View" (`pages/Meals.tsx:154-168`); from RecipeDetails the toast skips the "view" action.
  - Optimistic store updates for stored items.
- **Undo/cancel**:
  - `Cancel` button on consume dialog. After confirming consumption, **no undo** — backend deductions are final.
  - Leftover dialog: closing it via X = `outcome: 'skipped'` (`LeftoverPortionsDialog.tsx:185-191`). Reasonable.
  - But: **once `consumeIngredients` succeeds, you cannot back out**. There's no rollback to restore the deducted stored items.
- **Error states**:
  - Preview-fetch error: handled silently in store; UI just keeps loading. — `ConsumeIngredientsDialog.tsx:88-97`.
  - Confirm error: toast.error('Cook failed') (`tsx:196-202`). Leftovers step is *skipped on consume failure*, so meal won't be marked cooked.
  - Per-ingredient `incompatibleUnits` / `notInStock` / `partial` badges (`tsx:216-246`) — good.
- **Friction points**:
  - [HIGH] **Modal-on-modal**: `LeftoverPortionsDialog` always opens after `ConsumeIngredientsDialog` confirms, even when there are zero portions to save (`ConsumeIngredientsDialog.tsx:194-195` always sets `setShowLeftovers(true)`). The user has to tap "Skip" or close it before the toast fires. Two confirmations to mark cooked.
  - [HIGH] **From `/recipes/:id/cook`, finishing a recipe doesn't mark a meal-plan entry as cooked** — `RecipeCookingMode.tsx:449-455` doesn't pass `onCookComplete`. Users who plan a meal in `/meals` and cook from the cook-mode page leave a dangling meal plan.
  - [MED] Inconsistent terminology: "Consume ingredients" (button) vs "I cooked it" (mental model). The label does not signal that this is the "I just cooked this" action. — `pages/RecipeDetails.tsx:378`.
  - [MED] Servings stepper inside the consume dialog re-fetches the preview on every +/- (`tsx:136-140`). Spammy on flaky networks; no debounce.
  - [MED] If preview returns 0 ingredients in stock, the user sees a page of "Not in stock" badges and the confirm button label switches to "confirmNoDeductions" (`tsx:457-458`). The flow still works but the UI gives the impression of a failure state.
  - [LOW] No keyboard nav inside the deduction list (each ingredient row is `Collapsible`). Screen-reader announcement of badges is OK; tabbing is not.

## Flow 5: Add a new storage area

- **Entry point**: `/dashboard` "+ Add area" inline button (`Dashboard.tsx:237`), or empty-state "Add first storage area" button (`Dashboard.tsx:253-259`). Both render `AddStorageAreaDialog`.
- **Clicks (golden path)**: 3 clicks
  1. Tap "+ Add area"
  2. Type name (mandatory)
  3. Tap "Add Storage Area"
  - Defaults: emoji `📦`, type `OTHER`, default categories computed from type (`StorageAreaDialog.tsx:51-55`).
- **Feedback**:
  - `toast.success` with name (`AddStorageAreaDialog.tsx:39-41`).
  - No spinner inside the submit button despite the store managing a `loading` flag.
  - List refreshes via `fetchStorageAreas` (`storageAreaStore.ts:135`).
- **Undo/cancel**: Cancel button, close-on-overlay. **No undo toast.** Reasonable: creating an empty area is low-impact.
- **Error states**: Catch block toasts `creationFailed` with backend message (`AddStorageAreaDialog.tsx:44-50`). Empty-name silently does nothing (`StorageAreaDialog.tsx:65-70`) — submit button is *not* disabled when name is empty, just silently no-ops.
- **Friction points**:
  - [HIGH] **Empty-name validation is silent** — clicking "Add Storage Area" with no name does nothing, no toast, no inline error, no aria-live. Users get stuck thinking the button is broken. — `components/StorageAreaDialog.tsx:65-70`.
  - [MED] **Emoji input is a free-text field** (`StorageAreaDialog.tsx:106-110`). No emoji picker, no validation that the input is one emoji. Users will paste the bell character instead of an emoji. Also no autofocus on name field.
  - [MED] Type select uses a raw `<select>` element (`StorageAreaDialog.tsx:113-123`) — different look from all other selects in the app (which use shadcn `Select`); breaks visual consistency.
  - [LOW] Default categories chip toggles are reset every time the type changes (`StorageAreaDialog.tsx:51-55`), so a user who customizes categories then changes type loses their selections without warning.
  - [LOW] No spinner / disabled state on submit during the create round-trip. Double-tapping the button could enqueue two creates (server probably dedupes by name, but client doesn't guard).

## Cross-flow patterns

1. **Destructive actions with no undo**: storedItem delete, recipe delete (has confirm modal but no undo), shopping item delete (silent), meal removal. None of them produce an "Undo" toast action. `sonner` supports `action: { label, onClick }` and is already used for non-destructive "View" links (`MyProducts.tsx:156-161`, `Meals.tsx:155-168`) — adding undo would be cheap.
2. **No autofocus anywhere**: searched the three core dialogs and `AddItemCard` for `autoFocus` — zero hits. Every modal forces an extra click before typing.
3. **No keyboard submit**: dialogs use `<DialogContent>` without a wrapping `<form onSubmit>`. Pressing Enter while typing the dish name / area name / qty does nothing. Only the recipe-cook step checkboxes use keyboard interactions naturally.
4. **Two parallel "add stored item" UIs**: `AddStoredItemDialog` (modal, suggested area, cooked-meal tab) vs the inline form on `/storage/:id` (`pages/StorageArea.tsx:780-907`). They diverge in features and toasts; pick one.
5. **Toast inconsistency at the store layer**: `storedItemStore` toasts on every CRUD (sometimes redundantly with caller toasts), `shoppingStore` toasts on none, `storageAreaStore` toasts on none — UX is consistent only because each caller compensates. New callers will be silent by default in shopping/storage-area.
6. **Spinner inconsistency**: `AddItemCard` shows an in-button spinner; `AddStoredItemDialog` only swaps text "Adding…"; `StorageAreaDialog` shows nothing.
7. **Modal-on-modal**: cook-flow chains ConsumeIngredients → LeftoverPortions even when leftovers = 0. Add-stored-item flow opens a `noAreaPromptOpen` AlertDialog from the FAB if no areas exist (`MyProducts.tsx:702`).
8. **Validation gaps**: empty-name on storage area silently no-ops; quantity 0/NaN on stored item triggers toast.error after submit (no inline message).

## Runtime validation (Playwright, 2026-05-10)

Sondage runtime `/dashboard` mobile 375 px (screenshot : [runtime-mobile-dashboard.png](runtime-mobile-dashboard.png)).

### Confirmé live

- **"Jeter"** rendu directement sur les items "À consommer rapidement" — bouton primaire rouge, **un seul clic, pas de confirmation, pas d'undo toast** (vérifié sur 5 items expirés sur le dashboard). Le pattern de data-loss du flow #2 est non seulement présent dans `/storage/:id` mais **également exposé sur la home**, ce qui amplifie le risque (probabilité de mis-tap × tous les jours).
- **Bottom navigation 5 items** : 36 px de hauteur, **tous les labels textuels cachés** sur mobile (`<span class="hidden ... sm:block">` confirmé runtime → display:none à 375px). Les icônes seules restent. La nav primaire :
  - n'est pas un `<nav>` (juste un `<div>`),
  - pas de `aria-label`,
  - pas de `aria-current="page"` sur l'item actif,
  - sous le seuil 44 px touch.
- **5 storage cards** sur le dashboard sont des `<div>` `pointer-cursor` avec `tabIndex: -1, role: null, no onKeyDown, no aria-label`. **Tab les saute** (vérif directe). Seul moyen d'y accéder = clic souris ou navigation depuis la sidebar.
- **Titre carte quick-action `"Liste de Courses"`** est en title-case français incorrect (visible sur le screenshot mobile).

### Magnitude réelle

| Page | Total `<button>` | < 44 px | Ratio |
|------|------------------|---------|-------|
| /dashboard mobile (375 px) | 19 | 18 | 95 % |
| /shopping desktop (1440 px) | 118 | 113 | 96 % |
| /products desktop | 62 | 53 | 85 % |
| /recipes desktop | 28 | 21 | 75 % |

→ Sur mobile les rows sont quasi-systématiquement sous touch-target. La friction "mis-tap" est constante sur **tous les flows destructifs** (jeter, supprimer, marquer consommé).

### Pas testés ce run

- Compte exact des clics du flux "ajouter à la liste de courses" (la page /shopping a 8 erreurs Cloudinary 404 qui ralentissent le rendering ; comptage statique reste référence).
- Modal-on-modal LeftoverPortions : pas déclenché (pas de cuisine simulée).
- Empty-name validation StorageAreaDialog : pas testé (pour ne pas polluer les données).

---

## Top 5 friction items (priority)

1. **Storage item delete is a one-click data-loss action** — `pages/StorageArea.tsx:716-723`, `pages/MyProducts.tsx`, `stores/storedItemStore.ts:281-308`. Add either a confirm AlertDialog OR an "Undo" action on the success toast (sonner supports it natively). High frequency × high cost.
2. **Modal-on-modal in the "mark cooked" flow** — `components/ConsumeIngredientsDialog.tsx:194-195` always opens `LeftoverPortionsDialog` post-confirm. Skip when no leftovers and no meal-plan link. High frequency × medium cost (extra tap × every cook).
3. **No autofocus + no Enter-to-submit anywhere** — Affects every flow, every dialog. Single low-effort fix: add `autoFocus` to the primary input and wrap each dialog body in `<form onSubmit>`. High frequency × low individual cost but compounds.
4. **Two divergent "add stored item" UIs** — `pages/StorageArea.tsx:780-907` inline form vs `components/AddStoredItemDialog.tsx`. Inline form lacks the suggestion sparkle, cooked-meal toggle, and the "View" toast action. Replace the inline form with the dialog or merge them. Medium frequency × medium cost (UX inconsistency, dev maintenance).
5. **Silent failures**: empty-name storage area submit (`StorageAreaDialog.tsx:65-70`) and silent shopping-item delete (`shoppingStore.ts:264-290`). Either disable the submit button when name is empty (and show inline error on focus-out) or always toast success/error from the store. Medium frequency × medium cost.
