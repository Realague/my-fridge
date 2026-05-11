# Audit R6 — States & Async UX

## TL;DR
9 findings across loading states, error messaging, and async UX patterns. Primary issues: inconsistent loading guards on CTAs (double-click vulnerability), skeleton/spinner coverage gaps (5+ pages), generic error messages lacking actionable context, and refetch storms on async operations.

---

## Findings (P0/P1/P2)

### P0 — Double-click vulnerability on async CTAs
- **Where**: frontend/src/pages/Meals.tsx:64-77 (adjust), Household.tsx:42-58 (handleSwitch), Recipes.tsx:78-94 (handleToggleFavorite)
- **Symptom**: CTAs missing disabled={loading} guard. User can rapid-click "+" servings, "Switch Household", or "Favorite" before first request completes, spawning duplicate requests.
- **User impact**: Unintended duplicate mutations (overfilled shopping lists, multiple household switches, double favorites).
- **Fix sketch**: Add disabled={saving|switching|loading} to buttons; wrap handlers with debounce or optimistic-update check.
- **Effort**: S

### P1 — Refetch storm on Shopping quick-store
- **Where**: frontend/src/pages/Shopping.tsx:215-245 (handleQuickStore)
- **Symptom**: Line 237 calls refreshShoppingItems() which calls fetchShoppingItems(false) + fetchCompletedItems(). Meanwhile, store's updateShoppingItem may trigger implicit refetches. Net: 3+ fetches per action.
- **User impact**: Slow perceived responsiveness, jank on slower networks, UI flicker.
- **Fix sketch**: Use store's optimistic update + single refresh. Remove redundant refreshShoppingItems() calls.
- **Effort**: M

### P1 — Missing loading skeleton on 5+ pages during async init
- **Where**: LoyaltyCards.tsx, More.tsx, StorageArea.tsx (loading tracked but not rendered), MyProducts.tsx, AddRecipe.tsx
- **Symptom**: Page renders empty, then content appears. No visual feedback during useEffect fetch. User sees blank space for 200–800ms.
- **User impact**: Appears broken on slow networks; "is it loading or empty?" confusion.
- **Fix sketch**: Add conditional skeleton during loading. Reference: ItemMinimums, HouseholdDetails, Recipes have proper patterns.
- **Effort**: M

### P1 — Generic error messages without retry or actionable context
- **Where**: Shopping.tsx:241, 297, 322; Meals.tsx:73–75; ItemMinimums.tsx:79–84
- **Symptom**: toast.error('somethingWentWrong') lacks: what failed, why, retry button (HouseholdDetails has handleRetry()).
- **User impact**: User confused; creates support tickets.
- **Fix sketch**: Include item name + action + Retry: toast.error(t('messages.error.failedAction'), {action: {label: 'Retry', onClick: retry}})
- **Effort**: M

### P1 — Completed shopping items use redundant loadingCompleted state
- **Where**: Shopping.tsx:98–99, 117–129, 869–882
- **Symptom**: Separate loadingCompleted state creates asymmetry. Pending items show spinner seamlessly, completed items show spinner + text label. Tab-switching flickers.
- **User impact**: Inconsistent UX; confusing loading placement.
- **Fix sketch**: Unify to single loading boolean. Store manages two fetches internally; UI sees one state.
- **Effort**: M

### P2 — Household Details: loading phase logic trusts state over data
- **Where**: frontend/src/pages/HouseholdDetails.tsx:126–167
- **Symptom**: phase === 'loading' checks coexist with phase === 'ready' && !householdDetails. Skeleton flashes when phase='ready' but data=null.
- **User impact**: Visual flicker on navigation.
- **Fix sketch**: Strict FSM: phase='loading' → Skeleton. phase='ready' && householdDetails → content.
- **Effort**: S

### P2 — Dashboard storage areas: no loading indicator during fetch
- **Where**: frontend/src/pages/Dashboard.tsx:262–283
- **Symptom**: Checks storageAreasWithStats.length === 0 for empty state. But during fetch, length is also 0. No visual difference.
- **User impact**: New users see empty prompt while data loads.
- **Fix sketch**: Check storageAreaLoading boolean. Show spinner during fetch.
- **Effort**: S

### P2 — LowStockCard missing double-click guard
- **Where**: frontend/src/components/LowStockCard.tsx:113–122 vs ExpiringSoonCard.tsx:69, 94
- **Symptom**: ExpiringSoonCard guards with if (pendingId) return. LowStockCard "Add" button lacks disabled guard. Duplicate shopping items on rapid click.
- **User impact**: Duplicate entries from accidental double-clicks.
- **Fix sketch**: Add disabled={pendingId !== null} to match ExpiringSoonCard.
- **Effort**: S

### P2 — Success toast messages lack i18n consistency and brevity
- **Where**: Shopping.tsx:225, 254, 316, 333; Meals.tsx:90, 109
- **Symptom**: Mix of generic (itemAddedToStorage) and contextual (itemAddedQuick). Spans 2+ lines, violates charter's "terse."
- **User impact**: Visual hierarchy inconsistency; verbose toasts clutter mobile.
- **Fix sketch**: Pattern: t('messages.success.action', {noun}). Max 1 line.
- **Effort**: S

### P2 — StorageArea page: loading state tracked but not rendered
- **Where**: frontend/src/pages/StorageArea.tsx:~200–350
- **Symptom**: storedItemsLoading hooked but never rendered. Page shows empty list with no spinner during fetch.
- **User impact**: Unclear if data will appear.
- **Fix sketch**: Add {storedItemsLoading ? <CardSkeleton /> : <ItemGrid />}
- **Effort**: S

---

## Summary Stats
- **P0 (critical UX hazard)**: 1 finding
- **P1 (immediate impact)**: 4 findings
- **P2 (polish + consistency)**: 4 findings
- **Total effort**: 1S + 3M + 5S ~ 7–9 hours

**Patterns to adopt**:
1. Always add disabled={loading|saving|pending} to async CTAs
2. Show skeleton/spinner during all data fetches
3. Use contextual error messages with Retry action
4. Centralize refetch logic; avoid multiple fetches per handler
5. Use pendingId or disabled to guard double-clicks universally

**Quick wins**: LowStockCard guard, HouseholdDetails FSM, StorageArea skeleton, unified toast pattern.
