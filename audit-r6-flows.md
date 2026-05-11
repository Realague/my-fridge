# Audit R6 — Flows & Interactions

## TL;DR

Three bugs de flux critiques et trois patterns de fragmentation détectés, causant dégradation UX claire : state loss / re-renders incontrôlés, modal-nesting ambiguité quand leftovers modal interagit mal, validation client-side manquante côté dialogs. Reste 5-6 jours d'efforts de fixes ciblées (3-5h chacun).

---

## Findings (prioritised, P0/P1/P2)

### P0 — ConsumeIngredientsDialog : modal-on-modal state cascade cassée

- **Where**: `frontend/src/components/ConsumeIngredientsDialog.tsx:350-517` (Dialog + LeftoverPortionsDialog embedded)
- **Symptom**: User opens ConsumeIngredientsDialog (cook page) → confirms deductions → LeftoverPortionsDialog appears BUT si user clique Escape ou clicks-outside parent dialog WHILE LeftoverPortionsDialog is open, both dialogs close AND state (showLeftovers, deductions) n'est PAS nettoyé. Reopening cook flow shows stale state. Focus trap also broken.
- **Why it matters**: Workflow interruption + state pollution = lost work. Test: Cook → confirm → swipe down (mobile) → reopen → state wrong.
- **Fix sketch**: 
  1. Separate dialogs complètement (ne pas nester LeftoverPortionsDialog dans return de ConsumeIngredientsDialog).
  2. Mount LeftoverPortionsDialog en sibling, controlled by parent (Meals.tsx).
  3. Guard dialog close: if (!showLeftovers) onClose() existe L358 mais showLeftovers est interne. Si parent Meals.tsx ferme consume dialog pendant showLeftovers=true, leftovers dialog devient orphaned.
  4. Solution: Passer showLeftovers state up to parent, ou use onCookComplete callback to bubble signal.
- **Effort**: M

### P0 — RecipeCookingMode.tsx : onCookComplete callback not fully wired

- **Where**: `frontend/src/pages/RecipeCookingMode.tsx:462-468` (ConsumeIngredientsDialog prop)
- **Symptom**: User cooks recipe depuis `/recipes/:id/cook` → consumes ingredients → skips leftovers. onCookComplete fires but does NOT call markMealCooked(). Meal reste "pending" in Meals.tsx. Compare to Meals.tsx:139 where markMealCooked() IS called. **Parity bug: deux cooking paths divergent.**
- **Why it matters**: Cooked meals not auto-marked in meal plan; user must manually navigate to Meals. Test: Plan meal → cook from recipe detail → check Meals.tsx; meal should be checked but isn't.
- **Fix sketch**: onCookComplete callback pour mealPlanId est setup mais async chain not awaited properly.
- **Effort**: XS

### P0 — LeftoverPortionsDialog : duplicate onComplete callback fire on skip

- **Where**: `frontend/src/components/meals/LeftoverPortionsDialog.tsx:129-192` (handleSkip + onOpenChange handler)
- **Symptom**: User clique "Skip" → handleSkip() appelle onComplete() ET onOpenChange(false). Dialog's onOpenChange handler (L186-192) défend avec "if (!next && !submitting) onComplete()" mais submitting=false quand skip, so onComplete fires TWICE → duplicate completion callback → recordAreaUsage called twice → confuses suggestion memory.
- **Why it matters**: Duplicate completion events → Meals.tsx handleLeftoverComplete fires twice → inconsistent state in subsequent dialogs.
- **Fix sketch**: setSubmitting(true) in handleSkip() to prevent double-fire in close handler, ou refactor close logic.
- **Effort**: S

### P1 — AddStoredItemDialog + ItemMinimumDialog : missing qty placeholder i18n

- **Where**: `frontend/src/components/ItemMinimumDialog.tsx:193`, `frontend/src/components/QuantitySelector.tsx:164`
- **Symptom**: Hardcoded EN placeholder "Qty" visible to ES/FR users. Not critical but inconsistent avec charter.
- **Why it matters**: Bilingual UX consistency.
- **Fix sketch**: Add i18n key to forms.quantityPlaceholder, update 2 components.
- **Effort**: XS

### P1 — BarcodeScanner : overlay without Esc/focus-trap + modal-on-modal issue

- **Where**: `frontend/src/components/BarcodeScanner.tsx:107-143` (fixed overlay, not Dialog) + `frontend/src/components/LoyaltyCardForm.tsx:124`
- **Symptom**: BarcodeScanner est fixed inset-0 overlay (pas Dialog/Drawer) → no built-in focus trap, Escape closes PARENT dialog au lieu de juste scanner, modal={!showScanner} ne protège pas assez, swipe back (mobile) ferme both au lieu de juste scanner.
- **Why it matters**: A11y violation + modal-nesting UX confusion. Users peuvent accidentally close whole flow par Escape.
- **Fix sketch**: Wrap BarcodeScanner in Radix Dialog ou custom focus-trap. Add onEscapeKeyDown that only closes scanner. Test Esc/swipe behavior.
- **Effort**: M

### P1 — Meals.tsx : race condition on handleCook (rapid re-clicks)

- **Where**: `frontend/src/pages/Meals.tsx:124-127` (handleCook) + `frontend/src/pages/Meals.tsx:282-294` (ConsumeIngredientsDialog)
- **Symptom**: Click "Cook" on meal A → click "Cook" on meal B before A loads → race condition: which meal's recipe loads? Which servings? Component doesn't guard contre rapid re-clicks.
- **Why it matters**: User sees wrong recipe or servings in cook dialog. Test: Click cook on two meals rapidly.
- **Fix sketch**: Add guard: if (cookingMeal || saving) return;
- **Effort**: S

### P1 — StorageAreaDialog : form reset on close not fully wired

- **Where**: `frontend/src/components/StorageAreaDialog.tsx:32-49` (useEffect reset)
- **Symptom**: User opens (add mode) → type name → Escape → dialog unmounts. Reopens → state reset (correct) BUT parent might still hold old initialData. Edit storage area → toggle categories → Cancel → reopen → categories still selected (state leak).
- **Why it matters**: Unexpected state carryover after cancel.
- **Fix sketch**: Ensure when open=false, **all** state cleared and fresh from props on next open. Review reset vs parent ownership.
- **Effort**: S

### P2 — AddStoredItemDialog : area suggestion overwrites user choice on tab switch (edge case)

- **Where**: `frontend/src/components/AddStoredItemDialog.tsx:181-200` (handleArticleTypeChange sets areaWasOverridden=false)
- **Symptom**: User selects category → area suggests "Fridge" → user manually picks "Freezer" (overrides) → user clicks Cooked-meal tab → areaWasOverridden reset to false → suggestion re-fires → area resets to suggestion even though user picked manually.
- **Why it matters**: Subtle state confusion; user's explicit choice overwritten by auto-suggestion after UI interaction.
- **Fix sketch**: Decide: should areaWasOverridden persist through article type changes? If intentional (re-suggest cooked meals), document. If bug, track per-type flag.
- **Effort**: S

### P2 — ItemMinimumDialog : currentStock doesn't refresh on store changes

- **Where**: `frontend/src/components/ItemMinimumDialog.tsx:75-80` (calculateCurrentStock)
- **Symptom**: Opens dialog → sees stock = 5. Another user adds 3 elsewhere. Dialog doesn't refresh (no store subscription). User sets minimum based on stale "5" instead of "8".
- **Why it matters**: Stale data → incorrect shopping amounts. Low severity (multi-user edge case) but real.
- **Fix sketch**: Call calculateCurrentStock() in useEffect when open=true, ou subscribe to store.
- **Effort**: S

---

## Recommendations

**Quick wins < 2h**: 
- P0 RecipeCookingMode: Fix async callback (XS).
- P1 ItemMinimumDialog: Add i18n placeholder (XS).

**Medium fixes 2-5h**:
- P0 ConsumeIngredientsDialog: Decouple modal nesting (M).
- P1 BarcodeScanner: Wrap in Dialog, fix focus trap (M).
- P1 Meals.tsx: Add guard on handleCook (S).
- P1 StorageAreaDialog: Review reset logic (S).

**Test plan**: Cook flow close at each step (Esc/swipe/X). Dialogs opened rapidly. Stock changes on other device. Scan loyalty card → open/close scanner 3× → check focus.

