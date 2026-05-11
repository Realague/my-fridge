# Audit R6 — Synthèse (post R1-R5 + Top 15 + quick wins)

5 audits parallèles (flows · design-system · states · a11y · content) — état du frontend après tous les fixes précédents.

## TL;DR

- **Charter design** : il reste **~98 occurrences de couleurs palette Tailwind hardcodées** (text-green-800, bg-red-100…), concentrées dans `itemUtils.ts` (10x), badges difficulté Recipes, freezer health, Demo, ConsumeIngredientsDialog. C'est de loin le plus gros chantier restant.
- **A11y** : 8-10 icon-only buttons sans `aria-label` (timer, servings, reorder zones), 1 checkbox custom 24px sur Shopping (touch target + role + label cassés), contraste disabled potentiellement < AA.
- **Voice EN/ES** : ~50 keys à corriger — "successfully", "!", "Please", "exitosamente", "Your" doivent disparaître. FR est propre depuis R3.
- **States** : double-click vulnerabilities sur CTAs async, ~5 pages sans skeleton, erreurs toast sans retry contextuel.
- **Flows** : 3 bugs concrets (RecipeCookingMode ne marque pas cuit, LeftoverPortionsDialog double-fire onComplete, ConsumeIngredientsDialog state leak sur close pendant sub-dialog).

## Top 15 prioritized (impact × effort)

### P0 — bloquant / haut volume

**1. Palette Tailwind hardcodée — 98 violations (charter)**
`text-green-800`, `bg-red-100`, `bg-amber-50`, etc. au lieu de `--mf-*` tokens.
- `frontend/src/lib/itemUtils.ts` (10 mappings catégorie)
- Badges difficulté: `Recipes.tsx:96-103`, `RecipeDetails.tsx`, `ImportRecipe.tsx`
- Freezer health: `StorageArea.tsx` (red/orange/blue par seuil)
- Demo / MyProducts / ConsumeIngredients (35+)
- **Fix** : nouvelle util `getCategoryTone(cat)` → `{ bg, text }` mappées sur `mf-info-soft/-danger-soft/...`, idem pour difficulté et health.
- **Effort** : M (1 util + replace_all sur ~30 fichiers)

**2. Icon buttons sans aria-label — 8+ violations (WCAG 4.1.2)**
- `cooking/FloatingTimerBar.tsx:100,103,106,114` (timer −60s, +60s, play/pause, reset)
- `ConsumeIngredientsDialog.tsx:373,383` (servings ±)
- `StorageAreaManager.tsx:127,136` (reorder ChevronUp/Down)
- **Fix** : ajouter `aria-label={t('...')}` sur chaque, créer keys i18n manquantes en 3 locales.
- **Effort** : S

**3. Shopping checkbox 24px non-conforme (WCAG 2.5.5 + 4.1.2)**
`components/ShoppingItemRow.tsx:117-126` — raw `<button className="w-6 h-6">` sans `role="checkbox"` ni `aria-checked` ni `aria-label`. Touch target 24px < 44px minimum.
- **Fix** : `role="checkbox" aria-checked={isCompleted} aria-label={...}`, `w-11 h-11`.
- **Effort** : S

**4. Double-click vulnerability sur CTAs async (states)**
`Meals.tsx` handleCook, `Household.tsx` rename, `Recipes.tsx` toggleFavorite — pas de `disabled={loading}` sur boutons mutateurs. Click rapide = double mutation.
- **Fix** : guard `disabled={isPending}` + pendingId par row pour favorites.
- **Effort** : S

**5. EN/ES voice charter violations — ~50 keys**
- "successfully" suffix (EN, 6 keys: itemUpdated, profileUpdated, householdJoinedDescription, itemDeleted, memberRemoved, settingsSaved)
- "!" trailing (EN+ES, 15 keys toasts: recipeAdded!, mealPlanDeleted!, storageAreaCreated!, etc.)
- "Please X" → impératif (EN, 11 keys: pleaseEnterName, addAtLeastOneIngredient, selectDateMealTypeRecipe…)
- "exitosamente" (ES, 15+ keys)
- "Your/Su" → bare (EN+ES, 6-8 keys: Your profile has been updated, etc.)
- "has been [verb]" passive → présent (EN, 2-3 keys)
- **Fix** : sed batch sur en.json + es.json, validation parity post-pass.
- **Effort** : S (mécanique) + M (relecture tonale)

### P1 — impact UX mesurable

**6. Skeletons manquants — 5+ pages**
LoyaltyCards, More, StorageArea, MyProducts, AddRecipe affichent du vide pendant le fetch initial.
- **Fix** : pattern `{loading ? <PageSkeleton /> : <Content />}` aligné sur Dashboard.
- **Effort** : M

**7. RecipeCookingMode ne marque pas le meal cuit**
`pages/RecipeCookingMode.tsx` — flow `/recipes/:id/cook` ne propage pas l'état "cooked" au meal source. Meals.tsx le fait, RecipeCookingMode non.
- **Fix** : appel `markMealAsCooked(mealId)` dans `onCookComplete`.
- **Effort** : XS (1 ligne)

**8. LeftoverPortionsDialog double-fire onComplete**
Skip handler appelle `onComplete()`, le Dialog onClose le rappelle aussi (`submitting=false`). Confuse la suggestion memory.
- **Fix** : guard `if (skipFired) return` ou désactiver onClose pendant skip.
- **Effort** : S

**9. ConsumeIngredientsDialog state leak (modal-on-modal)**
Fermer le dialog parent pendant que LeftoverPortionsDialog est ouvert laisse `showLeftovers`, `deductions` en stale.
- **Fix** : reset effect sur `open === false`.
- **Effort** : S

**10. Shopping refetch storm + état `loadingCompleted` redondant**
`handleQuickStore` déclenche 3+ fetches par action. État séparé `loadingCompleted` crée asymétrie.
- **Fix** : optimistic update + 1 refetch unique, unifier en `loading`.
- **Effort** : M

**11. Radius hardcodés en pixels — 8 occurrences**
`rounded-[8px]`, `rounded-[10px]`, `rounded-[14px]` au lieu de `rounded-sm/md/lg` (qui résolvent au charter depuis le bridge).
- Files : ErrorBoundary, MealRemovalImpactDialog, MealsShoppingMergeDialog, MealsShoppingPreview, RecipeSelector
- **Fix** : replace_all global.
- **Effort** : S

**12. Danger / Warning surfaces non-tokenisées**
- Danger buttons utilisent `bg-red-600 hover:bg-red-700` (StorageAreaManager, ItemEditor, MealRow, ShoppingItemRow, LoyaltyCards, button.tsx deleteTrash variant) → devraient être `bg-mf-danger`.
- Warning cards utilisent `bg-amber-50/orange-100` (AddRecipe, ImportRecipe, StagingEnvBanner, OpenedStatusToggle, Onboarding, NotificationSheet) → devraient être `bg-mf-warning-soft`.
- **Fix** : ajouter variant `destructive` charter dans button.tsx, util `.card-warning` dans index.css.
- **Effort** : S+S

**13. Toast errors sans contexte ni retry**
`toast.error(t('messages.error.somethingWentWrong'))` générique sur ~12 catch blocks. Pas d'action retry.
- **Fix** : pattern centralisé `toastErrorWithRetry(action, retry)` avec sonner `action: { label: 'Réessayer', onClick: retry }`.
- **Effort** : M

### P2 — polish

**14. Disabled button contrast (WCAG 1.4.3)**
`components/ui/button.tsx` utilise `disabled:opacity-50` seul → sur fond charter, contraste ≈ 2:1 (fail AA 4.5:1).
- **Fix** : `disabled:text-mf-text-mute disabled:opacity-100` (token = 6.8:1).
- **Effort** : S

**15. BarcodeScanner sans focus-trap propre**
Overlay fixe — Escape ferme le Dialog parent au lieu du scanner seul.
- **Fix** : envelopper dans `<Dialog>` Radix avec own `onOpenChange`.
- **Effort** : M

## Effort total estimé

| Lot | Effort cumulé |
|---|---|
| P0 (1-5) | ~1-1.5 j |
| P1 (6-13) | ~1.5-2 j |
| P2 (14-15) | ~0.5 j |

**Total** : ~3-4 jours d'ingé focalisée pour ramener le frontend à charter-pure + WCAG AA + voice consistante.

## Quick wins (< 30 min chacun)
- Fix #7 RecipeCookingMode (1 ligne)
- Fix #2 aria-label timer + servings + reorder
- Fix #11 rounded-[Npx] replace_all
- Fix #14 disabled contrast (token swap)

## Rapports détaillés
- `audit-r6-flows.md` (8 findings)
- `audit-r6-design-system.md` (8 findings, 98 violations)
- `audit-r6-states.md` (9 findings)
- `audit-r6-a11y.md` (9 findings, WCAG references)
- Audit content : inline dans la session (l'agent était en read-only)
