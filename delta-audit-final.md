# Delta audit final — what's left after 12 fixes

**Date** : 2026-05-10. **Branch** : `152-refonte-de-la-navigation-desktop-header-global-sidebar-verticale`. **Méthode** : 3 agents static-analysis parallèles + cross-check des fichiers individuels. Sources détaillées : [delta-audit-a11y.md](delta-audit-a11y.md), [delta-audit-design-system.md](delta-audit-design-system.md), [delta-audit-rest.md](delta-audit-rest.md).

## TL;DR

- **Les 12 fixes tiennent** (ErrorBoundary, CardButton/Overlay, Button charter, autofocus+form, undo+touch, palette `mf.*`, useStoreErrorToast, HouseholdDetails phase, leftovers checkbox, tu/vous partial). `tsc` clean, locales JSON valides, 0 régression cassante.
- **Le drift mécanique a chuté drastiquement** : 91→~91 axe button-name (à attaquer), 216→0 pointer-divs sur /products, contraste primary 3.30→8.26, `<html lang>` sync toujours TODO.
- **Le drift systémique est INTACT** : Tailwind radius bridge (8px vs 14px), `bg-card/80 backdrop-blur` 46 occurrences, `<CardTitle>` h3 hardcodé, palette catégories raw Tailwind (`itemUtils.ts`), 4 strings espagnoles dans fr.json, fake activity Dashboard, React Query non utilisé.
- **5 régressions/incohérences subtiles** apparues : `touch-friendly` sur 9 boutons green réintroduit le drift de hauteur que Fix #6 voulait éliminer ; `useStoreErrorToast` description en EN brut (charter title + EN description) ; tu/vous mixé encore (fix #11 partial) ; dead `messages.itemMinimum.*` keys ; `hover:scale-105` survit dans Index.tsx.

## Verified-fixed (les 12 fixes en clair)

| Fix | Verdict |
|-----|---------|
| #1 ErrorBoundary | ✅ App.tsx:58,70 + role="alert" sur fallback |
| #2 Delete + undo + touch targets | ✅ storedItemStore L295-336 ; sonner undo confirmé live (cycle "test retiré./test restauré.") |
| #3 8 toasts EN → i18n + double-toast fix | ✅ markAsOpened appelle service direct, plus de double toast |
| #4 HouseholdDetails phase state | ✅ LoadPhase 4-states + Skeleton + retry button |
| #5 CardButton + CardLinkOverlay | ✅ 6 callsites migrés ; pointer-divs /products 216→0 ; focus ring visible |
| #6 Button green charter-aligned | ✅ contraste 8.26 ; rounded 10px ; hover sur green-deep |
| #7 useStoreErrorToast | ✅ 6 pages + Auth OAuth ; toast id partagé pour dédup |
| #8 LeftoverPortions skip when off | ✅ checkbox default OFF, modal-on-modal éliminé |
| #10 autofocus + form onSubmit | ✅ 3 dialogs core + ItemSelector ; submit disabled when empty |
| #11 vous→tu (21 strings) | 🟠 PARTIAL — 22 vous restants ; 16 "avec succès" ; 15 keys avec `!` |
| #12 mf.* Tailwind palette | ✅ palette wired ; 5 surfaces Dashboard migrées (Dashboard/LowStock/ExpiringSoon/NotificationDrawer/AppHeader) |

## Top 15 restant (tri impact × effort)

| # | Issue | Impact | Effort | Fichiers principaux |
|---|-------|--------|--------|---------------------|
| 1 | **Tailwind radius bridge** : `--radius: 0.5rem` (8px) vs charter 14px → toutes les cards sous-rendent ; `!rounded-[10px]` du green variant cause un mismatch côte-à-côte avec outline | HIGH | XS | [tailwind.config.ts:96-99](frontend/tailwind.config.ts#L96), [index.css :root](frontend/src/index.css) |
| 2 | **`<CardTitle>` polymorphique (ou défaut h2)** — 87 usages provoquent h1→h3 sur 22 pages ; charter heading-2 = 20px/600, ce que 90% des consumers overrident déjà | HIGH | S | [components/ui/card.tsx:32-45](frontend/src/components/ui/card.tsx#L32) |
| 3 | **91 boutons sans nom sur /shopping** + checkbox 24×24 sous WCAG 2.5.5 ; le plus gros cluster axe `button-name` | HIGH | S | [components/shopping/ShoppingItemRow.tsx:117-203,290-314](frontend/src/components/shopping/ShoppingItemRow.tsx#L117) |
| 4 | **`maximum-scale=1.0, user-scalable=no` + `<html lang>` statique** — 5 lignes pour fixer WCAG 1.4.4 + 3.1.1 globalement | HIGH | XS | [frontend/index.html:2,5](frontend/index.html#L2), [src/i18n/config.ts](frontend/src/i18n/config.ts) |
| 5 | **`bg-card/80 backdrop-blur-sm border-0 shadow-lg` × 46** — extraire `<Card variant="elevated">` qui bake aussi `mf-motion-card` ; sweep 25 fichiers en un PR | HIGH | S | RecipeDetails (×9), Shopping (×6), RecipeCookingMode (×4), Index (×4 + `hover:scale-105` cassé), AddRecipe (×3) |
| 6 | **4 strings espagnoles dans fr.json** : `Congélateur de pecho`, `Cave à vin` (iceBox), `Garde-manger de pasillo`, `Garde-manger de alimentos` | HIGH | XS | [fr.json:159-162](frontend/src/i18n/locales/fr.json#L159) |
| 7 | **`googleClientIdNotConfigured` dev warning visible utilisateur** — ajouter guard `import.meta.env.DEV` | HIGH | XS | [pages/Auth.tsx:233](frontend/src/pages/Auth.tsx#L233) |
| 8 | **`/recipes/:id/cook` ne propage pas cooked au meal-plan** — `RecipeCookingMode.tsx:450` n'envoie pas `onCookComplete` (Meals.tsx:296 le fait) | HIGH | XS | [pages/RecipeCookingMode.tsx:450-455](frontend/src/pages/RecipeCookingMode.tsx#L450) |
| 9 | **Skip-to-content link + `<nav>` landmarks + `aria-current="page"`** sur BottomNavigation/AppSidebar | HIGH | S | [components/layout/AppShell.tsx](frontend/src/components/layout/AppShell.tsx), [components/BottomNavigation.tsx:23-44](frontend/src/components/BottomNavigation.tsx#L23), [components/layout/AppSidebar.tsx:78-89](frontend/src/components/layout/AppSidebar.tsx#L78) |
| 10 | **BarcodeScanner overlay sans Esc / focus trap / `role=dialog`** — wrap dans Radix Dialog | HIGH | S | [components/BarcodeScanner.tsx:107-143](frontend/src/components/BarcodeScanner.tsx#L107) |
| 11 | **ES locale parity** : 17 keys consommées par le code manquent en ES (`pages.shopping.bulkStorage*` 12 keys + rename household + recipeImported + householdRenamed + 4 autres). Espagnols voient les clés brutes sur /shopping et household rename | HIGH | M | [es.json](frontend/src/i18n/locales/es.json) |
| 12 | **Skeletons charter-aligned** sur Dashboard / MyProducts / Shopping / StorageArea / ItemMinimums / LoyaltyCards (6 pages) — flash blank actuel | HIGH | M | 6 pages |
| 13 | **`shoppingStore.deleteShoppingItem` silent + undo** — répliquer le pattern Fix #2 (snapshot + sonner undo) | HIGH | M | [stores/shoppingStore.ts:264-289](frontend/src/stores/shoppingStore.ts#L264) |
| 14 | **`utils/itemUtils.ts:55-78` palette catégories** : 9 familles raw Tailwind (`bg-{green/red/orange/blue/purple/...}-100 text-{family}-800`) — re-tokenize via `mf-*` ou neutralize | HIGH | M | [utils/itemUtils.ts:55-78](frontend/src/utils/itemUtils.ts#L55) |
| 15 | **`utils/index.css :root`** : Wire `--primary` HSL → pistache `142 71% 45%` → libère `Button variant="default"` comme brand, `bg-primary` partout, débloque `BottomNavigation` qui empile 3 verts | HIGH | XS | [src/index.css :root](frontend/src/index.css) |

## Régressions / incohérences détectées par les 3 agents

| # | Description | Source |
|---|-------------|--------|
| R1 | **`touch-friendly` (min-h-44) sur 9 `variant="green"`** réintroduit le drift de hauteur (40→44px) que Fix #6 voulait régler ([Recipes:123,131](frontend/src/pages/Recipes.tsx), [LoyaltyCards:195](frontend/src/pages/LoyaltyCards.tsx#L195), [MyProducts:423,457,526](frontend/src/pages/MyProducts.tsx), [StorageArea:777,955](frontend/src/pages/StorageArea.tsx), [HouseholdDetails:316,325](frontend/src/pages/HouseholdDetails.tsx)) | design |
| R2 | **`useStoreErrorToast` description = `error` brut** : title `"Action interrompue. Réessaie."` (charter FR) mais description = `"Failed to fetch storage areas"` (EN backend). Title FR + description EN visible utilisateur. À normaliser via i18n key dans le store catch | rest |
| R3 | **Tu/vous mix dans la même surface** : Fix #11 a passé `messages.confirmation.*` en tu mais `addedBy: "Ajouté par vous"` (fr.json:611) reste vous. Cohabitation visible | rest |
| R4 | **Dead i18n keys** : 18 `messages.itemMinimum.*` en EN sans callsite (Fix #11 a touché certains, oublié de nettoyer les non-utilisés) | rest |
| R5 | **`hover:scale-102` typo éliminé** mais `hover:scale-105` survit dans [Index.tsx:78,92,106,120](frontend/src/pages/Index.tsx#L78) (4 sites) — charter motion = translate, pas scale | design |

## Quick wins < 30 min (à batcher dans 1 PR "polish 2")

1. Fix les 4 strings espagnoles dans `fr.json:159-162` (#6 du top 15)
2. Guard `googleClientIdNotConfigured` derrière `import.meta.env.DEV` (#7)
3. Supprimer `maximum-scale=1.0, user-scalable=no` de `frontend/index.html:5` (partie de #4)
4. Ajouter `useEffect` dans `i18n/config.ts` qui sync `document.documentElement.lang = i18n.language` sur `languageChanged` (partie de #4)
5. Ajouter `aria-current={isActive ? 'page' : undefined}` sur BottomNavigation + AppSidebar (partie de #9)
6. Wrapper BottomNavigation racine dans `<nav aria-label={t('navigation.main')}>` (partie de #9)
7. Pass `onCookComplete` dans `RecipeCookingMode.tsx:450` (#8)
8. Décapitaliser `Modifier l'Article`/`Créer un Nouvel Article`/`Modifier la Recette` dans fr.json:233,234,854
9. Hardcodés EN restants : `placeholder="Enter quantity"` ([ItemMinimumDialog:193](frontend/src/components/ItemMinimumDialog.tsx#L193)), `placeholder="Qty"` ([QuantitySelector:164](frontend/src/components/QuantitySelector.tsx#L164)), `<CardTitle>Instructions</CardTitle>` ([RecipeDetails:438](frontend/src/pages/RecipeDetails.tsx#L438))
10. `NotFound.tsx` : retirer `bg-gray-100`, traduire "Oops! Page not found" et "Return to Home"
11. Setter `--radius: 0.875rem` (= 14px charter) dans `index.css :root` + drop le `!rounded-[10px]` du `green` variant (1 ligne dans `tailwind.config.ts` ou `index.css` selon préférence)
12. Wire `--primary: 142 71% 45%` (HSL pistache) dans `index.css :root` (#15)
13. Drop les 4 `hover:scale-105` dans Index.tsx (R5)
14. Retirer les 9 `touch-friendly` redondants sur `variant="green"` (R1)
15. Cacher la fake "Recent Activity" Dashboard tant que pas de feed live (#2 du original ; restait pas migré)

## Estimation budget axe-core post-fixes (par page)

| Violation | Avant 12 fixes | Après 12 fixes | Reste à fixer |
|-----------|----------------|----------------|---------------|
| `meta-viewport` (critical) | 1 | 1 | 1 (quick win) |
| `button-name` (critical) | 91 sur /shopping + 7 /recipes + 1 /products + 1 /dashboard = 100 | ~95 (fix #6 a résolu 1 sur primary CTA, mais ShoppingItemRow intact) | 91 (top 15 #3) |
| `color-contrast` (serious) | 3 nodes /dashboard | 0 ✅ | — |
| `list/listitem` (serious) | 7 sur chaque page (sidebar) | 7 (inchangé — SidebarStorageGroup ScrollArea) | 7 |
| `nested-interactive` (serious) | 7 /shopping (AisleSection) | 7 (inchangé) | 7 |
| `heading-order` (moderate) | ~22 pages | ~22 (inchangé — CardTitle = h3) | 22 (top 15 #2) |

## Recommandé : sprint « polish 2 » (5-8h)

**Phase A — Quick wins batchés** (~3h) : items 1-15 ci-dessus.
**Phase B — `<CardTitle>` polymorphique + sweep h1→h2** (~2h) : top 15 #2.
**Phase C — `<Card variant="elevated">` extract + sweep 46 sites** (~2h) : top 15 #5.
**Phase D — ShoppingItemRow aria-label sweep + bump touch targets MealRow** (~1h) : top 15 #3 + R1.

Phase A+B+C+D résoudraient ~70% du top 15 + toutes les régressions, et ramèneraient le budget axe à ~10 violations (de 100+ aujourd'hui). Reste après : ES locale parity (#11), itemUtils palette (#14), skeletons (#12), shopping undo (#13), unify add-stored-item (audit-flows top 15 #15) → sprint « polish 3 ».

## Hors top 15 mais worth-it

- **React Query adoption** sur 1 page read-heavy (Shopping ou MyProducts) — débloque refetch-on-focus + dedup + stale-while-revalidate ; le provider est déjà mounté
- **Virtualisation `@tanstack/react-virtual`** sur `/products` + `/storage/:id` quand >100 items
- **`MealRow`/`ShoppingItemRow`** action buttons à `h-10 sm:h-8` (parité avec MyProductsItemCard)
- **Debounce `loadPreview`** dans `ConsumeIngredientsDialog.tsx:144` (150ms)
- **`Meals.tsx:247-258`** flip ordre branches (spinner avant empty)
- **18 dead `messages.itemMinimum.*`** keys EN — cleanup
- **Raw `error.message` toasts** dans 4 dialogs — wrap via `messages.error.fetchFailed` style
- **Calendar primitive `bg-green-500`** off-charter — `bg-mf-green text-[#03150A]`
- **`button.tsx:16-17` `delete`/`deleteTrash` variants** raw red → `mf-danger`
- **`StorageAreaCard:45` Badge destructive en orange** (incohérence) → `bg-mf-warning`
- **`utils/itemUtils.ts:71`** `lime-*` cooked-meal indicator → `bg-mf-green-soft`
- **`Onboarding.tsx`** 3 hero tiles `bg-green-500 rounded-2xl` → `bg-mf-green rounded-mf-xl` (après fix #1 du top 15)
- **`StagingEnvBanner.tsx:84`** `bg-amber-500 text-amber-950` — soit on-brand `mf-warning` soit assumé off-brand "scream not prod" (à documenter)

---

**Bottom line** : la majorité du « visible mais facile » est fait. Ce qui reste est soit **systémique** (radius bridge, CardTitle, palette catégories) avec gros effet de levier, soit **mécanique** (sweeps de strings/classes) qui peut s'attaquer en 1 ou 2 PRs polish. Aucune régression cassante, pas de bugfix urgent — l'app est **stable**, le travail restant est de la qualité et de l'a11y de fond.
