# Audit R6 — Design System & Charter Compliance

## TL;DR
98 occurrences of palette violations found across 35+ components. Key drift:
- Tailwind semantic colors (text-green-*, bg-red-*, text-blue-*) hardcoded instead of bridged --mf-* tokens
- Rounded pixel values hardcoded (rounded-[8px], rounded-[14px], rounded-[10px]) instead of charter scale
- Utility shadows and colors in component contexts

---

## Findings (P0/P1/P2)

### P0 — Hardcoded Tailwind semantic colors in status badges (98 total)

**Where**: 
- frontend/src/utils/itemUtils.ts:57–77 (10 occurrences)
- frontend/src/pages/Recipes.tsx:98–101 (4 occurrences)
- frontend/src/pages/StorageArea.tsx:75–85 (6 occurrences)
- frontend/src/pages/ImportRecipe.tsx:175–190 (6 occurrences)
- Plus 35+ more across Demo, MyProducts, RecipeDetails, ConsumeIngredientsDialog, etc.

**Charter says**: Palette uses 4 semantic channels: --mf-green, --mf-danger, --mf-warning, --mf-info. Never raw Tailwind green-100, red-800, blue-100.

**Current**: 
```tsx
// itemUtils.ts
'vegetables': 'bg-green-100 text-green-800',
'dairy': 'bg-blue-100 text-blue-800',

// Recipes.tsx
case 'Easy': return 'bg-green-100 text-green-800';
case 'Hard': return 'bg-red-100 text-red-800';
```

**Fix sketch**: Create semantic maps (difficultyMap, categoryColorMap) that resolve to --mf-* tokens. Sweeping find-replace in all .tsx files.

**Effort**: M (map-based refactor, 5 central utilities + 30 component updates)

---

### P1 — Rounded corners hardcoded in bracket notation

**Where**: 8 files, ~8 total occurrences
- frontend/src/components/ErrorBoundary.tsx:48 — rounded-[14px]
- frontend/src/components/meals/MealRemovalImpactDialog.tsx:70,72 — rounded-[8px]
- frontend/src/pages/MealsShoppingPreview.tsx:180,182,188 — rounded-[10px]

**Charter says**: Scale is xs:4px sm:6px md:10px lg:14px xl:20px. No pixel brackets.

**Fix sketch**: Global find-replace: rounded-[8px] → rounded-xs, rounded-[10px] → rounded-md, rounded-[14px] → rounded-lg

**Effort**: S (global find-replace)

---

### P1 — Danger buttons use red-* instead of --mf-danger

**Where**: 6 components
- frontend/src/components/ui/button.tsx:16 — delete variant
- frontend/src/components/ItemEditor.tsx:283 — bg-red-600
- frontend/src/components/StorageAreaManager.tsx:182 — bg-red-600
- frontend/src/components/meals/MealRow.tsx:130 — text-red-500
- Plus LoyaltyCards, ShoppingItemRow

**Charter says**: Must use --mf-danger (#EF4444 dark, #DC2626 light).

**Fix sketch**: Replace text-red-* → text-mf-danger, bg-red-* → bg-mf-danger or bg-mf-danger-soft

**Effort**: S (6 button/component updates)

---

### P1 — Warning cards use amber instead of --mf-warning

**Where**: 10 files, ~10 occurrences
- frontend/src/pages/AddRecipe.tsx:489 — bg-amber-50
- frontend/src/pages/ImportRecipe.tsx:348 — bg-orange-50
- frontend/src/components/StagingEnvBanner.tsx:84–116
- frontend/src/pages/Onboarding.tsx:128,180,226 — bg-green-500

**Charter says**: Use --mf-warning-soft for backgrounds, never amber-50, orange-50, or green-500.

**Fix sketch**: Replace bg-amber-* → bg-mf-warning-soft, border-amber-* → border-mf-warning/30

**Effort**: S (10 global replacements + new .card-warning utility)

---

### P2 — Frozen storage health colors (getFreezerColorClass)

**Where**: frontend/src/pages/StorageArea.tsx:75–85

**Current**: Uses text-red-600, text-orange-600, text-blue-600

**Fix sketch**: Replace with text-mf-danger, text-mf-warning, text-mf-info

**Effort**: S (2 function updates)

---

### P2 — Shopping checked items use green instead of primary

**Where**: frontend/src/components/shopping/ShoppingItemRow.tsx:113,121,248

**Fix sketch**: Replace bg-green-* → bg-primary, border-green-* → border-primary

**Effort**: S (1 component)

---

### P2 — Calendar range selection uses green-500

**Where**: frontend/src/components/ui/calendar.tsx:49–50

**Fix sketch**: Replace bg-green-500 → bg-primary

**Effort**: S (2 lines)

---

### P2 — Demo page hardcoded colors (15+ occurrences)

**Where**: frontend/src/pages/Demo.tsx:55–147

**Fix sketch**: Reuse color maps from P0 fix

**Effort**: S (refactor + map reuse)

---

### P2 — Heart icon uses red-500, Household badge uses green-600

**Where**: 
- Recipes.tsx:267, RecipeDetails.tsx:276
- Household.tsx:96

**Fix sketch**: Replace fill-red-500 → fill-mf-danger, bg-green-600 → bg-primary

**Effort**: S (3 lines)

---

## Summary by Effort

| Effort | Finding | Count |
|--------|---------|-------|
| S | Rounded brackets | 8 occurrences |
| S | Danger buttons | 6 buttons |
| S | Warning cards | 10 occurrences |
| S | Storage health colors | 1 function |
| S | Shopping primary | 3 lines |
| S | Calendar primary | 2 lines |
| S | Demo refactor | 15+ occurrences |
| S | Heart/Badge fixes | 3 lines |
| **M** | **Badge color maps (P0)** | **98 violations** |

---

## Verification Checklist

- [ ] All text-{green,red,blue,yellow,orange,amber}-* → --mf-* maps
- [ ] All bg-{color}-* → tokens or removed
- [ ] rounded-[Xpx] → charter scale
- [ ] All semantic danger/warning/info states correct
- [ ] Card variant="elevated" covers 46+ sites
- [ ] Button variant="green" used where needed
- [ ] Dark mode colors match charter
- [ ] No new Tailwind color hardcodes introduced
