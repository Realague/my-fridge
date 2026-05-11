# Audit UI/UX — My Fridge

**Date :** 2026-05-10 · **Méthode :** 5 teammates parallèles (flows, design-system, states, a11y, content) en analyse de code statique sur `frontend/src/` + extraction du charter `docs/charte-graphique.html` v3.0, **complété par une passe runtime Playwright + axe-core** (sections "Runtime validation"). Sources détaillées : [audit-flows.md](audit-flows.md), [audit-design-system.md](audit-design-system.md), [audit-states.md](audit-states.md), [audit-a11y.md](audit-a11y.md), [audit-content.md](audit-content.md).

## Runtime validation (Playwright + axe-core, 2026-05-10)

Pages traversées loguées : `/dashboard`, `/products`, `/recipes`, `/shopping`. Viewports : 1440×900 (desktop) et 375×812 (mobile). Axe-core 4.10 injecté sur chaque page (WCAG 2.0/2.1 AA). Mode actif : **dark** (la canonique du charter).

### axe-core — synthèse

| Page | Critical | Serious | Incomplete (color-contrast) | Total nodes en violation |
|------|----------|---------|------------------------------|--------------------------|
| /dashboard | 1 (`meta-viewport`) | 3 (`color-contrast` ×1, `list` ×2, `listitem` ×5) | 24 | 9 |
| /products | 2 (`button-name` ×1, `meta-viewport`) | 3 (`color-contrast` ×1, `list` ×2, `listitem` ×5) | 6 | 10 |
| /recipes | 2 (`button-name` ×7, `meta-viewport`) | 3 (`color-contrast` ×1, `list` ×2, `listitem` ×5) | 6 | 16 |
| /shopping | 2 (`button-name` ×91, `meta-viewport`) | 4 (`color-contrast` ×1, `list` ×2, `listitem` ×5, `nested-interactive` ×7) | 6 | 106 |

**Findings runtime nouveaux ou requalifiés** :

1. **`button-name` (CRITICAL) sur 99 nodes au total** — non détecté par l'analyse statique. /shopping seul a **91 boutons sans nom accessible** (rows ShoppingItemRow). Promu en top-15 (cf. issue #16 ci-dessous).
2. **`list` / `listitem` (SERIOUS) sur toutes les pages** — `<ul data-sidebar="menu">` contient des wrappers Radix (`div[data-radix-scroll-area-content]`) qui cassent la relation parent-enfant ARIA `list/listitem`. Bug structurel sidebar non flagué statiquement. Affecte les screen-readers : la liste des stockages est lue comme N items orphelins.
3. **`nested-interactive` (SERIOUS) sur /shopping** — 7 occurrences de `<header aria-controls="aisle-...-content">` contenant des `<button>` imbriqués. Les `AisleSection` collapsibles ont une interaction imbriquée invalide.
4. **8 erreurs Cloudinary 404** sur /shopping (image URLs cassées : `tomatoPaste2.jpg`, `bacon2.jpg`, `darkChocolate2.jpg`, `burgundy2.jpg`, `groundBeef2.jpg`, etc.) — bug data côté backend ou cache Cloudinary expiré.
5. **3 familles de "vert" sur la MÊME page Dashboard** confirmé runtime : "Activer" = `rgb(5,150,105)` (emerald-600), "Ajouter une zone" / "Gérer" = `rgb(22,163,74)` (green-600). Drift visible côte-à-côte.

### Contrastes WCAG calculés runtime (formule officielle)

| Combo | Ratio | AA normal (4.5) | AA UI/large (3.0) | Charter recommande |
|-------|-------|------|------|--------------------|
| white sur green-600 (`#16A34A`) — *primary actuel `Ajouter zone` / `Gérer`* | **3.30** | ❌ FAIL | ✅ pass | non |
| white sur emerald-600 (`#059669`) — *Activer push notification* | **3.77** | ❌ FAIL | ✅ pass | non |
| white sur pistache (`#22C55E`) | **2.28** | ❌ FAIL | ❌ FAIL | non |
| **encre `#03150A` sur pistache `#22C55E`** | **8.26** | ✅ PASS | ✅ PASS | **OUI (charter §02)** |
| encre `#03150A` sur green-600 | **5.71** | ✅ PASS | ✅ PASS | acceptable |

→ Tous les `text-white` sur boutons verts échouent WCAG AA pour le texte normal ; le fix charter (`color: #03150A`) est strictement supérieur.

### Tokens charter — état actuel runtime

```
--mf-green:        #22C55E   ✓ chargé
--mf-green-deep:   #16A34A   ✓ chargé
--mf-radius-md:    10px      ✓ chargé
--mf-radius-lg:    14px      ✓ chargé
--radius:          0.5rem    ✗ Tailwind bridge → 8px (devrait être 14px sur cards)
--primary:         210 40% 98% ✗ Slate, jamais le pistache (raison structurelle du drift)
```

**Boutons primaires sondés runtime** : tous `height: 36px`, `borderRadius: 6px`, `gap: 8px`, `padding: 0 12px`. Charter prescrit `height: 40px` (controls), `borderRadius: 10px` (`--mf-radius-md`). Drift de 4 px sur les deux dimensions confirmé sur 100 % des CTA observés.

### Métriques runtime par page

| Page | Pointer-divs sans role/tabindex | Total `<button>` | `<button>` < 44 px | Ratio tiny |
|------|---------------------------------|------------------|---------------------|------------|
| /dashboard (desktop) | 68 | 32 | 23 | **72 %** |
| /products | **216** | 62 | 53 | **85 %** |
| /recipes | 83 | 28 | 21 | **75 %** |
| /shopping | 0 (utilise `<button>`) | 118 | **113** | **96 %** |
| /dashboard (375 px) | — | 19 | 18 | **95 %** |

→ L'audit statique listait ~6 cartes "clickable-but-not-focusable" ; le runtime trouve **216 div pointer-cursor sans role/tabIndex sur /products seul**. La gravité réelle est largement plus haute que l'estimation initiale (l'audit statique grepait `<Card onClick>` mais ratait les wrappers internes type `MyProductsItemCard` qui multiplient les zones cliquables visuellement).

### Tab-order — vérif directe sur 5 cartes Dashboard

Toutes les 5 storage area cards (`Réfrigérateur`, `Garde-manger`, `Placard de cuisine`, `Congélateur`, `test`) :
- `role: null`
- `tabIndex: -1` (donc Tab-key les saute)
- `onKeyDown: null`
- `ariaLabel: null`

**Confirmé**. Un keyboard-only user ne peut atteindre aucune zone de stockage depuis le dashboard.

### Bottom navigation mobile (375 px)

- Élément racine = `<div>`, **pas `<nav>`**
- `aria-label` : null
- `aria-current` sur item actif : 0/5
- Hauteur de chaque item : **36 px** (sous les 44 px touch-target WCAG 2.5.5)
- Labels textuels (`<span>`) : **5/5 cachés** par `display:none` à la viewport mobile (les icônes seules restent — viole WCAG 2.5.3 Label in Name)

→ Findings 100 % cohérents avec l'analyse statique. Sur mobile la nav primaire est inutilisable au clavier dans les bonnes pratiques (pas focusable comme un `<nav>`, pas annoncé "Main navigation").

### Captures runtime

- [runtime-mobile-dashboard.png](runtime-mobile-dashboard.png) — Dashboard mobile (dark) : visible directement les boutons "Jeter" 1-clic destructifs sur les items expirés, l'`Activité récente` fake EN ("Sarah added milk", "John completed shopping list"), le titre "Liste de Courses" en title-case français, et le truncate "À consommer rapide..." sur la card heading (overflow non géré).

### Conséquences sur le top 15

| # original | Statut runtime | Note |
|------------|----------------|------|
| #1 ErrorBoundary absent | non vérifié runtime (pas de moyen de provoquer un crash sans risque) | rester en HIGH |
| #2 Delete 1-clic | confirmé visible à l'écran (boutons "Jeter" sur dashboard) | confirmé HIGH |
| #3 Toasts hardcodés EN | non déclenché ce run (pas de mutation testée) | rester en HIGH |
| #4 HouseholdDetails 404 | non visité ce run | rester en HIGH |
| #5 Cards non-focusables | **renforcé** : 216 sur /products, 68 sur /dashboard, 5/5 storage cards confirmés runtime | **escalade : ajouter au #5 que la magnitude réelle est ×10** |
| #6 white-on-pistache | confirmé : 2.28 / 3.30 / 3.77 selon variante ; encre = 8.26 | confirmé HIGH |
| #7 silent fetch | non déclenché ce run | rester en HIGH |
| #8 modal-on-modal | non testé live | rester en MED |
| #12 3 verts | **confirmé runtime sur la même page Dashboard** (emerald + green-600 + variantes) | confirmé HIGH |
| #13 touch targets <44px | **escalade** : 96% des boutons /shopping, 95% sur mobile dashboard, bottom nav primaire à 36px | **HIGH+** |

### Issues nouvelles à ajouter au backlog

| # | Issue | Source | Impact | Effort |
|---|-------|--------|--------|--------|
| 16 | **91 boutons sans nom accessible sur /shopping** (`button-name` axe critical) — ShoppingItemRow expose tous ses icon-buttons sans `aria-label` | runtime axe | HIGH | S |
| 17 | **`<ul data-sidebar="menu">` contient des wrappers Radix ScrollArea** entre `<ul>` et `<li>` → screen readers perdent la relation list/listitem | runtime axe | MED | S |
| 18 | **`nested-interactive` x7 sur /shopping** : `<header aria-controls>` contient des `<button>` imbriqués (`AisleSection`) | runtime axe | MED | S |
| 19 | **8 images Cloudinary 404** sur /shopping (URLs cassées en data backend) — `tomatoPaste2`, `bacon2`, `darkChocolate2`, `burgundy2`, `groundBeef2`, etc. | runtime console | MED | M |
| 20 | **Heading overflow non géré** : "À consommer rapide..." tronqué visuellement sur dashboard mobile (375px) | runtime screenshot | LOW | XS |

## Récapitulatif final (post-runtime)

**Verdict global** : la **fondation** (charter, tokens CSS, primitive shadcn) est saine ; la **couche d'application** ignore les tokens et accumule des dérives systémiques mesurables. **Robustesse** insuffisante (pas d'`ErrorBoundary`, fetch errors silencieuses, React Query monté mais inutilisé). **A11y** : 4 à 6 violations axe-core par page, dont 99 boutons sans nom au total et `meta-viewport` critique. **Data-loss risk** réel : suppression à un clic sans undo, exposée jusque sur le dashboard.

### Numbers that matter (mesurés runtime)

| Métrique | Valeur observée | Verdict |
|----------|-----------------|---------|
| Violations axe-core /shopping | 6 (dont 91 `button-name`, 7 `nested-interactive`) | 🔴 |
| Violations axe-core /dashboard, /products, /recipes | 4–5 chacune (`meta-viewport` critical, `list/listitem` serious) | 🔴 |
| Cards `pointer-cursor` non-focusables (/products) | **216** (vs 6 estimés en static) | 🔴 |
| Boutons < 44 px (/shopping) | **113/118 (96 %)** | 🔴 |
| Boutons < 44 px (/dashboard mobile 375 px) | **18/19 (95 %)** | 🔴 |
| Storage cards Dashboard : `tabIndex=-1, role=null, no kbd handler` | **5/5** | 🔴 |
| Bottom nav mobile : `<nav>`, `aria-label`, `aria-current`, ≥44 px | **0/4** présents | 🔴 |
| Verts coexistant sur la même page Dashboard | **2** runtime (`emerald-600` + `green-600`), **3** dans le code (`+ lime-*`) | 🔴 |
| Hauteur primary CTA réelle | **36 px** (charter prescrit 40) | 🟠 |
| `border-radius` primary CTA réel | **6 px** (charter prescrit 10) | 🟠 |
| Contraste `white on green-600` | **3.30** (AA FAIL normal text) | 🔴 |
| Contraste `encre on pistache` (charter) | **8.26** (AA pass) | ✅ |
| Cloudinary 404 sur /shopping | **8** images | 🔴 |
| Toasts CRUD storedItem hardcodés en anglais | **8** (entité la + utilisée) | 🔴 |
| Locale parity : keys manquantes EN/FR/ES | EN 3798 / FR 3780 / ES 3753 | 🟠 |
| `votre/vos/vous` dans `fr.json` (banni par charter) | **69** occurrences | 🔴 |
| `avec succès` dans success toasts (banni par charter) | **17** | 🔴 |
| `bg-card/80 backdrop-blur-sm border-0 shadow-lg` copy-paste | **44 occurrences** (14 fichiers) | 🟠 |
| `ErrorBoundary` dans le codebase | **0** | 🔴 |
| `useQuery` / `useMutation` dans le code | **0** (React Query monté inutilement) | 🟠 |

### Top 5 actions à fort effet de levier (post-runtime)

1. **Plumber `--mf-*` dans `tailwind.config.ts` + remap `--radius` à 14 px** — débloque le sweep `bg-mf-green` / `rounded-mf-lg` et tarit la racine du drift `green-600 / emerald / lime / rose / red`. Effort : S. Impact : résout simultanément #6 (contrast), #12 (color drift), #5 fondamental, et le radius drift cards/buttons.
2. **Refactor `Button variant="primary"` → encre sur pistache, 40 px, radius 10 px** — fait passer 100 % des CTA primary AA d'un coup (3.30 → 8.26 ratio), aligne charter sur la dimension la plus visible. Effort : S. Impact : visible sur chaque page.
3. **Extraire `<CardButton>` polymorphe** (basé sur shadcn `Card asChild`) avec `role="button"`, `tabIndex={0}`, `onKeyDown` Enter/Space, et la motion charter `translateY(-3px)` — résout les 5 cartes Dashboard, 216 zones non-focusables /products, et le typo silencieux `hover:scale-102`. Effort : M. Impact : a11y + design d'un coup.
4. **Top-level `<ErrorBoundary>` + sweep des silent fetch errors avec ton charter** ("Action interrompue. Réessaie.") — convertit la robustesse de "blanche sur erreur" à "récupère explicitement" et applique le voice charter sur le canal le plus visible. Effort : S. Impact : robustesse + ton.
5. **`Sonner` undo action sur tous les delete + autoFocus + form `onSubmit`** — le triple combo "no undo + no autofocus + no Enter submit" coûte un clic à chaque interaction. Réparer les trois en une seule fois est trivial mais multiplicatif. Effort : S. Impact : tous les flows.

### Issues confirmées vs requalifiées par le runtime

| Issue (top 15) | Statut runtime | Magnitude réelle |
|----------------|----------------|------------------|
| #1 ErrorBoundary absent | inchangé (greppable) | inchangé |
| #2 Delete 1-clic destructif | confirmé visible (boutons "Jeter" sur dashboard) | escaladé : exposé jusqu'à la home |
| #3 Toasts EN hardcodés | inchangé (greppable) | inchangé |
| #4 Faux 404 HouseholdDetails | non testé live (donnée requise) | inchangé |
| #5 Cards non-focusables | confirmé : 5/5 storage cards Dashboard, 216 sur /products | **×10 vs estimation** |
| #6 White-on-pistache contrast fail | confirmé runtime, ratios calculés | identique |
| #7 Silent fetch failures | non déclenché ce run | inchangé |
| #8 Modal-on-modal cook flow | non testé live | inchangé |
| #9 Cook-mode ne marque pas meal-plan | non testé live | inchangé |
| #10 Pas d'autofocus / pas Enter submit | non testé live exhaustivement | inchangé |
| #11 Tu/Vous mixé | confirmé visible (Dashboard mobile : "Choisis…" + "votre foyer") | identique |
| #12 3 verts | confirmé runtime (2 sur même page Dashboard) | identique |
| #13 Touch targets <44 px | **escalade** : 95-96 % sur shopping et mobile | 🔴 |
| #14 Pas de virtualisation /products + N+1 | non stressé ce run | inchangé |
| #15 Deux UIs add-stored-item | non testé live | inchangé |
| **#16 (nouveau)** 91 boutons sans `aria-label` Shopping | runtime axe critical | nouveau |
| **#17 (nouveau)** Sidebar `<ul>/<li>` cassé par ScrollArea | runtime axe serious | nouveau |
| **#18 (nouveau)** `nested-interactive` x7 sur AisleSection | runtime axe serious | nouveau |
| **#19 (nouveau)** 8 images Cloudinary 404 | runtime console | nouveau |
| **#20 (nouveau)** Heading tronqué dashboard mobile | runtime screenshot | nouveau |

→ Aucun finding statique n'a été **invalidé** par le runtime. 5 nouveaux ont été ajoutés. La direction d'effort reste celle du plan en 7 sprints (cf. plus bas).

---

## Résumé exécutif

L'app a une **charte graphique mûre** (Pistache + Encre + Papier, ladder 4 px, motion tokens) mais **la couche React l'ignore presque totalement** : seuls `MealsShoppingPreview.tsx` et `RecipeSelector.tsx` utilisent les tokens — partout ailleurs, Tailwind brut. Conséquences : trois familles de "vert" coexistent, le primary CTA échoue au contraste WCAG AA, 44 cartes copient-collent un même override de 4 propriétés, et la typo charter (28 px H1, JetBrains Mono pour les unités) est invisible. Côté flows, **les actions destructives sont à un clic sans undo** (storedItem delete), **aucune dialog n'autofocus son input ni ne valide à Enter**, et la "fin de cuisson" force toujours une modale-sur-modale. Côté robustesse : **aucun ErrorBoundary** dans toute l'app, React Query monté mais jamais utilisé, virtualisation absente sur `/products` et `/storage/:id` (N+1 fetches en prime), 8 toasts CRUD hardcodés en anglais sur l'entité la plus utilisée. Côté contenu, le voussoiement (charter banni) coexiste avec le tutoiement et **mixe dans les `inviteMessage*` partagés en WhatsApp/SMS**. Le tonus actuel est SaaS 2015 ("Échec de X. Veuillez réessayer.", "Félicitations !") face à un charter qui demande terse, présent simple, action en tête.

---

## Top 15 priorité haute

Légende — **Impact** : HIGH (touche tous les utilisateurs ou bloque), MED (touche un parcours fréquent), LOW (polish). **Effort** : XS (<30 min), S (<2 h), M (<1 j), L (>1 j).

| # | Problème | Source(s) | Fichier(s) clé | Impact | Effort |
|---|----------|-----------|----------------|--------|--------|
| 1 | **Aucun `ErrorBoundary` dans toute l'app** : un render error blanche l'écran complet | states | [App.tsx:45](frontend/src/App.tsx#L45) | HIGH | S |
| 2 | **Suppression d'un article = 1 clic destructif sans undo ni confirm**, à côté de l'icône edit (mis-tap mobile garanti) | flows + a11y | [pages/StorageArea.tsx:716-723](frontend/src/pages/StorageArea.tsx#L716), [stores/storedItemStore.ts:281-308](frontend/src/stores/storedItemStore.ts#L281), [pages/MyProducts.tsx](frontend/src/pages/MyProducts.tsx) | HIGH | S |
| 3 | **8 toasts hardcodés en anglais sur les CRUD storedItem** (entité la + utilisée) — pas d'import i18n | content | [stores/storedItemStore.ts:233-344](frontend/src/stores/storedItemStore.ts#L233) | HIGH | S |
| 4 | **`/household/:id` affiche "Household not found" pendant le loading** : faux 404 à chaque visite | states | [pages/HouseholdDetails.tsx:89-99](frontend/src/pages/HouseholdDetails.tsx#L89) | HIGH | XS |
| 5 | **Cartes cliquables non focusables** : Dashboard quick-actions, Recipes, Storage, MyProducts, LoyaltyCards, ImageUpload — Tab les saute, pas annoncé "button" | a11y | [pages/Dashboard.tsx:212](frontend/src/pages/Dashboard.tsx#L212), [components/StorageAreaCard.tsx:24](frontend/src/components/StorageAreaCard.tsx#L24), [components/MyProductsItemCard.tsx:168](frontend/src/components/MyProductsItemCard.tsx#L168), [pages/Recipes.tsx:234](frontend/src/pages/Recipes.tsx#L234), [pages/LoyaltyCards.tsx:227](frontend/src/pages/LoyaltyCards.tsx#L227), [components/ImageUpload.tsx:230](frontend/src/components/ImageUpload.tsx#L230) | HIGH | M |
| 6 | **Primary button : white sur pistache = ratio 2.28 (WCAG AA fail)** + `variant="green"` pointe `green-600` (= `--mf-green-deep`) au lieu du token charter | a11y + design-system | [components/ui/button.tsx:15](frontend/src/components/ui/button.tsx#L15) | HIGH | S |
| 7 | **Échecs de fetch silencieux** sur Dashboard, Shopping, MyProducts, StorageArea, ItemMinimums, LoyaltyCards, OAuth callback — `console.error` only, page semble vide | states | [pages/Dashboard.tsx](frontend/src/pages/Dashboard.tsx), [pages/Shopping.tsx](frontend/src/pages/Shopping.tsx), [pages/MyProducts.tsx](frontend/src/pages/MyProducts.tsx), [pages/Auth.tsx:35,69](frontend/src/pages/Auth.tsx#L35) | HIGH | M |
| 8 | **Modal-sur-modal dans "marquer cuisiné"** : `LeftoverPortionsDialog` s'ouvre toujours après confirm, même avec 0 portion | flows | [components/ConsumeIngredientsDialog.tsx:194-195](frontend/src/components/ConsumeIngredientsDialog.tsx#L194) | MED | XS |
| 9 | **Cook depuis `/recipes/:id/cook` ne marque jamais le meal-plan comme cuisiné** : `onCookComplete` non passé, meal plan zombie | flows | [pages/RecipeCookingMode.tsx:449-455](frontend/src/pages/RecipeCookingMode.tsx#L449), [pages/Meals.tsx:142](frontend/src/pages/Meals.tsx#L142) | HIGH | S |
| 10 | **Pas d'autofocus + pas de submit Enter dans aucune dialog** (3 dialogs core + AddItemCard) — 1 clic forcé par flow | flows | [components/AddStoredItemDialog.tsx:393](frontend/src/components/AddStoredItemDialog.tsx#L393), [components/StorageAreaDialog.tsx:65](frontend/src/components/StorageAreaDialog.tsx#L65), [components/AddItemCard.tsx:86](frontend/src/components/AddItemCard.tsx#L86) | MED | S |
| 11 | **Tu/Vous mixés**, dont **mix dans la même string** sur `inviteMessage*` partagés via WhatsApp/SMS ("Rejoins / te connecter / **votre** cuisine") | content | [frontend/src/i18n/locales/fr.json:431-432](frontend/src/i18n/locales/fr.json) | HIGH | M |
| 12 | **3 familles de "vert" coexistent** (`green-600`, `emerald-600`, `lime-*`), 2 familles "danger" (`red-*` vs `rose-*`), 2 "warning" (`orange-*` vs `yellow-*`) | design-system | 28 fichiers — voir [audit-design-system.md §5](audit-design-system.md#5-color-drift) | HIGH | L |
| 13 | **Touch targets sous 44 px** : tous les boutons d'action sur les rows mobile (`h-8 w-8` = 32 px, `h-7` = 28 px, checkmark shopping 24 px) | a11y | [components/MyProductsItemCard.tsx:309-340](frontend/src/components/MyProductsItemCard.tsx#L309), [components/ShoppingItemRow.tsx:117-310](frontend/src/components/ShoppingItemRow.tsx#L117), [components/meals/MealRow.tsx](frontend/src/components/meals/MealRow.tsx) | HIGH | M |
| 14 | **Pas de virtualisation + N+1 `getItemById`** sur `/products` et `/storage/:id` : 500 items ⇒ 500 cards + 500 fetches | states | [pages/MyProducts.tsx:197-227](frontend/src/pages/MyProducts.tsx#L197), [pages/StorageArea.tsx:204-231](frontend/src/pages/StorageArea.tsx#L204) | MED | M |
| 15 | **Deux UIs divergentes pour "ajouter au stock"** : modal sur `/products` (autosuggest, cooked-meal tab, View toast) vs form inline `/storage/:id` (rien de tout ça) | flows + design-system | [pages/StorageArea.tsx:780-907](frontend/src/pages/StorageArea.tsx#L780), [components/AddStoredItemDialog.tsx](frontend/src/components/AddStoredItemDialog.tsx) | MED | M |

### Notes de cross-challenge

- **#5 + #12 sont co-résolus** : extraire un `<CardButton>` polymorphe (basé sur shadcn `Card asChild`) qui wire à la fois `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) **et** la motion canonique `translateY(-3px)` du charter (remplaçant le `hover:scale-102` typoé silencieusement ignoré par Tailwind, [StorageAreaCard.tsx:25](frontend/src/components/StorageAreaCard.tsx#L25)).
- **#6 ↔ charter** : la charter prescrit explicitement `.mf-btn-primary { background: var(--mf-green); color: #03150A; }` ([docs/charte-graphique.html](docs/charte-graphique.html)) — la fix d'a11y est exactement la fix de charter-alignment. Aussi exposer `--mf-green` via Tailwind (`tailwind.config.ts`) pour que `bg-mf-green` devienne possible et tarir la racine du drift `green-600 / emerald / lime`.
- **#13 vs design-system #2** : pas de conflit — sur **mobile** les rows utilisent `min-h-[44px]` (la classe `touch-friendly` existe mais n'est appliquée qu'aux CTAs de header) ; sur **desktop** la canonicalisation à `h-10` (40 px) reste valide. `MealsShoppingPreview.tsx:482-493` est l'exemple à généraliser (touch + keyboard + role + aria-pressed).
- **#7 + #11** : le rewrite des toasts d'erreur silencieux est l'opportunité d'appliquer le ton charter ("Action interrompue. Réessaie.") plutôt que le ton actuel ("Échec de X. Veuillez réessayer.").
- **#14 vs design-system motion** : conflit réel — les wrappers `motion.div + scrollReveal*` sur chaque row aggravent la perf au-delà de 100 items. Lors de l'ajout de virtualisation (`@tanstack/react-virtual`), animer uniquement les items qui entrent dans le viewport, pas la totalité de la liste.

---

## Quick wins (< 30 min chacun)

À batcher dans un PR "polish charter" :

| Quick win | Fichier | Effort |
|-----------|---------|--------|
| Supprimer `maximum-scale=1.0, user-scalable=no` du viewport (WCAG 1.4.4) — les inputs sont déjà à 16 px donc l'auto-zoom iOS ne déclenche pas | [frontend/index.html:5](frontend/index.html#L5) | XS |
| Synchroniser `document.documentElement.lang` avec i18n (`useEffect` dans `i18n` setup ou `App.tsx`) | [frontend/src/i18n/](frontend/src/i18n/) | XS |
| Ajouter `aria-current="page"` sur les nav actifs (BottomNavigation, AppSidebar) | [components/BottomNavigation.tsx:31-46](frontend/src/components/BottomNavigation.tsx#L31), [components/layout/AppSidebar.tsx:78-89](frontend/src/components/layout/AppSidebar.tsx#L78) | XS |
| Skipper `LeftoverPortionsDialog` quand `leftovers === 0` ET pas de meal-plan lié (`setShowLeftovers(hasLeftovers \|\| hasMealPlan)`) | [ConsumeIngredientsDialog.tsx:194](frontend/src/components/ConsumeIngredientsDialog.tsx#L194) | XS |
| Désactiver le bouton "Add Storage Area" tant que name est vide (au lieu du silent no-op actuel) | [components/StorageAreaDialog.tsx:65-70](frontend/src/components/StorageAreaDialog.tsx#L65) | XS |
| Corriger les 4 traductions espagnoles dans `fr.json:159-162` : `Congélateur de pecho` → `Congélateur coffre`, `iceBox: "Cave à vin"` → `Glacière`, `Garde-manger de pasillo` → `Cellier`, `Garde-manger de alimentos` → `Réserve alimentaire` | [frontend/src/i18n/locales/fr.json:159-162](frontend/src/i18n/locales/fr.json) | XS |
| Réparer le typo `hover:scale-102` (silently ignoré) en `hover:scale-105` ou retirer + remplacer par `mf-motion-card` | [components/StorageAreaCard.tsx:25](frontend/src/components/StorageAreaCard.tsx#L25) | XS |
| Supprimer la fake "Recent Activity" hardcodée EN sur Dashboard (Sarah/John/Yesterday) ou cacher la section tant qu'il n'y a pas d'API backing | [pages/Dashboard.tsx:280-310](frontend/src/pages/Dashboard.tsx#L280) | XS |
| Unifier `gap-1.5` → `gap-2` sur boutons (Shopping/Meals headers) | [pages/Shopping.tsx:723](frontend/src/pages/Shopping.tsx#L723), [pages/Meals.tsx:221](frontend/src/pages/Meals.tsx#L221) | XS |
| `NotFound.tsx` : retirer `bg-gray-100`, traduire la copy (`Oops! Page not found`) | [pages/NotFound.tsx:17-20](frontend/src/pages/NotFound.tsx#L17) | XS |
| `ItemEditor.tsx:283` Save button = `bg-red-600` (rouge pour Save) → `variant="green"` | [components/ItemEditor.tsx:283](frontend/src/components/ItemEditor.tsx#L283) | XS |
| Décapitaliser titres FR : `Modifier l'Article` → `Modifier l'article`, `Créer un Nouvel Article`, `Modifier la Recette` | [frontend/src/i18n/locales/fr.json:233,234,830](frontend/src/i18n/locales/fr.json) | XS |
| Ajouter `autoFocus` sur le premier input de chaque dialog principale | 3 fichiers (AddStoredItemDialog, StorageAreaDialog, AddItemCard) | XS |
| Wrap `BottomNavigation` dans `<nav aria-label="Main">` | [components/BottomNavigation.tsx](frontend/src/components/BottomNavigation.tsx) | XS |
| Drop l'écran "Félicitations !" en fin de cooking mode (`pages.recipes.cookingMode.congratulations`) — viole "le système ne se félicite pas" | [pages/RecipeCookingMode.tsx](frontend/src/pages/RecipeCookingMode.tsx), [fr.json](frontend/src/i18n/locales/fr.json) | XS |

---

## Backlog priorité moyenne / basse

### Flows (teammate-flows)

- **[MED] Aisle/A-Z toggle, filtres, Bulk Storage button compètent l'attention** sur `/shopping` ; un user qui crée sa première liste doit slalomer avant d'atteindre l'AddItemCard — [Shopping.tsx:670-712](frontend/src/pages/Shopping.tsx#L670).
- **[MED] Pas de path "create from low-stock"** depuis `/shopping` ; il faut passer par ItemMinimums + 2 navigations.
- **[MED] Servings stepper du consume dialog re-fetche le preview à chaque +/-** sans debounce — [ConsumeIngredientsDialog.tsx:136-140](frontend/src/components/ConsumeIngredientsDialog.tsx#L136).
- **[MED] Trash + edit empilés à la même taille** sur la même row item — [StorageArea.tsx:708-723](frontend/src/pages/StorageArea.tsx#L708).
- **[MED] Delete success toast n'écho pas le nom de l'article** — [storedItemStore.ts:293-294](frontend/src/stores/storedItemStore.ts#L293) ; un mis-tap est invisible.
- **[MED] Bouton FAB "+" sur `/products` est `sm:hidden`** — pas d'entry point global "ajouter article" sur desktop sidebar/header — [MyProducts.tsx:686](frontend/src/pages/MyProducts.tsx#L686).
- **[MED] Pas de barcode-scan path depuis l'add dialog** alors que `BarcodeScanner.tsx` existe déjà.
- **[LOW] Empty-name FAB "Add Storage Area" silent no-op** (ce point bascule en quick-win avec l'amélioration "disable submit").
- **[LOW] Pas de raccourci décrément qty** pour items non-cooked-meal : 3 clics pour passer de 2 à 1 (edit → −/qty → save).
- **[LOW] Categories chip toggles** se reset quand le type change — perte silencieuse — [StorageAreaDialog.tsx:51-55](frontend/src/components/StorageAreaDialog.tsx#L51).

### Design-system (teammate-design-system)

- **[HIGH] Tailwind `borderRadius.lg` = 8 px**, charter veut 14 px sur les cards : remap dans [tailwind.config.ts:71-75](frontend/tailwind.config.ts#L71) ou poser `--radius: 14px` ; sweep `rounded-xl` ad-hoc ([AisleSection.tsx:82](frontend/src/components/AisleSection.tsx#L82), [StorageAreaManager.tsx:129](frontend/src/components/StorageAreaManager.tsx#L129), [Onboarding.tsx](frontend/src/pages/Onboarding.tsx) x3, [Index.tsx:138](frontend/src/pages/Index.tsx#L138)).
- **[HIGH] `bg-card/80 backdrop-blur-sm border-0 shadow-lg`** copy-collé 44× → extraire en `<Card variant="elevated">` ou flipper sur les classes charter `mf-card` / `mf-motion-card` ([index.css:210-228](frontend/src/index.css#L210)).
- **[HIGH] Page-title role en 3 tailles** (`text-xl`, `text-2xl`, `text-4xl`) ; aucune n'égale `heading-1` (28 px) — créer un `<PageTitle>` aligné charter et sweep les 16 occurrences.
- **[HIGH] JetBrains Mono chargé mais utilisé 2 fois** dans toute l'app (charter signature pour units/captions/eyebrows) — adopter `.mf-mono`/`.mf-eyebrow`/`.mf-caption` sur les badges quantité, durée, prix.
- **[HIGH] Tokens charter pas exposés à Tailwind** : `--mf-green` etc. existent en CSS mais pas en `colors.mf.*` dans [tailwind.config.ts](frontend/tailwind.config.ts) — root cause du drift `green-600/emerald/lime`. Fix structurel à plumber avant les sweeps.
- **[MED] CTA primary : 5 hauteurs différentes** (`size="sm"` h-9, default h-10, `lg+h-auto py-3`, `touch-friendly` min-h-44, `<Button>` clones) — canonicaliser sur `h-10` desktop / `h-11` mobile via une variant `primary`.
- **[MED] Heights drift** : Settings save = h-10, Recipes add = min-h-44, Household create = h-auto py-3.
- **[MED] `variant="destructive"` ([Settings.tsx:355](frontend/src/pages/Settings.tsx#L355)) rend le rouge shadcn HSL** au lieu de `--mf-danger`/`--mf-danger-soft` ; charter prescrit le pill soft.
- **[MED] LowStockCard / ExpiringSoonCard** utilisent des gradients orange/rose au lieu de `--mf-warning-soft` / `--mf-danger-soft` — visible drift sur Dashboard.
- **[MED] 5 tailles de thumbnail** différentes pour la même fonction (StorageAreaCard 48 px, MyProductsItemCard 64 px, Recipes 160 px) — adopter `.mf-thumb` (44) / `.mf-thumb-lg` (56) du charter.
- **[MED] Tailwind step `1.5/2.5`** (= 6 / 10 px) hors-grille charter (4 px) — ~30 occurrences.
- **[MED] Container padding** alterne `space-y-3` / `space-y-4` / `space-y-6` parfois sur la même page.
- **[LOW] `theme-color` meta = `#000000`** au lieu de `--mf-night` — [index.html:11](frontend/index.html#L11).
- **[LOW] `CardTitle` default `text-2xl font-semibold`** override sur 100 % des consumers → fix le primitive sur `heading-2` (20/600).
- **[LOW] Hex inline** : `#6B7280`, `#1f2937` fallback loyalty-card — [LoyaltyCards.tsx:98,108,224](frontend/src/pages/LoyaltyCards.tsx#L98).

### States (teammate-states)

- **[MED] Pas de skeleton réel sur Dashboard / MyProducts / Shopping / StorageArea / ItemMinimums / LoyaltyCards** — texte "Loading…" ou spinner. Le `Skeleton` primitive existe ; `RecipeGridSkeleton` est la référence à copier — [Recipes.tsx:313-343](frontend/src/pages/Recipes.tsx#L313).
- **[MED] `/household` n'a aucun état empty / loading / error** : array vide rend une `Card` blanche silencieuse — [Household.tsx:88-116](frontend/src/pages/Household.tsx#L88).
- **[MED] React Query monté mais jamais appelé** ([App.tsx:45](frontend/src/App.tsx#L45)) ; tout passe par `useEffect` + Zustand → pas de refetch on focus, pas de dedup, stale data toute la journée. Soit adopter (résout #14 + le silent failure #7), soit retirer.
- **[MED] `apiAuth` toaste 401/timeout par défaut** mais `householdStore` opt-out (`showToast: false`, [householdStore.ts:75](frontend/src/stores/householdStore.ts#L75)) ; les pages ne compensent pas.
- **[MED] Recipes/RecipeDetails : toast destructif sur fetch error** mais "Recipe not found" rendu en parallèle (confond 404 et erreur réseau) — [RecipeDetails.tsx:68-77](frontend/src/pages/RecipeDetails.tsx#L68).
- **[MED] Meals.tsx ordering bug** : `count > 0 ? rows : !loading ? empty : spinner` → empty flash si `count===0` et fetch pas encore lancé — [Meals.tsx:247-258](frontend/src/pages/Meals.tsx#L247).
- **[LOW] More.tsx `StorageAreasRow` lazy-fetch sans spinner** ([More.tsx:210-213](frontend/src/pages/More.tsx#L210)).

### A11y (teammate-a11y)

- **[MED] `<CardTitle>` hard-codé `<h3>`** dans [card.tsx:32-46](frontend/src/components/ui/card.tsx#L32) → la majorité des pages saute h1 → h3 ; ajouter une prop `as`.
- **[MED] Pas de skip-to-content link** : les keyboard users tabent toute la sidebar avant le `<main>`.
- **[MED] `<input type="file">` caché dans ImageUpload** + drop zone non-keyboard → onboarding clavier cassé — [ImageUpload.tsx:230-233](frontend/src/components/ImageUpload.tsx#L230).
- **[MED] `BarcodeScanner.tsx` overlay sans focus trap ni Esc handler documenté** (n'est pas un Dialog Radix).
- **[MED] `text-muted-foreground` (#94A3B8) ratio 2.56 sur fond blanc** — utilisé partout pour les captions ; remplacer par `--mf-text-soft` (#475569, ratio 7.58).
- **[MED] Icon-only `<Button>` sans `aria-label`** : NotificationDrawer mark/remove, ItemEditor remove-unit X, LoyaltyCards back/delete, ImageUpload edit/remove, ShoppingItemRow edit/save/cancel/delete.
- **[MED] `<Label>` sans `htmlFor`** + inputs sans `id` : [AddItemCard.tsx:108-117](frontend/src/components/AddItemCard.tsx#L108), [ImageUpload.tsx:186](frontend/src/components/ImageUpload.tsx#L186), [QuantitySelector.tsx:190-198](frontend/src/components/QuantitySelector.tsx#L190), [ItemMinimumDialog.tsx:183-192](frontend/src/components/ItemMinimumDialog.tsx#L183), [StorageArea.tsx:802-810](frontend/src/pages/StorageArea.tsx#L802).
- **[MED] Bottom nav labels masqués sur mobile** (`<span className="hidden ... sm:block">`) — viole WCAG 2.5.3 (Label in Name) — [BottomNavigation.tsx:44](frontend/src/components/BottomNavigation.tsx#L44).
- **[MED] Aucun `aria-describedby` pour les erreurs de form** — le `FormField` shadcn n'est jamais utilisé ; les toasts ne sont pas tied aux fields qui échouent.
- **[LOW] `mf-toggle-opt`, `mf-stepper-btn`, `mf-icon-btn`, `mf-btn`** sans style `:focus-visible` — outline navigateur seul (peu visible).
- **[LOW] `hover:scale-105` unconditional** ne respecte pas `prefers-reduced-motion` — partout sur Dashboard quick-actions, Recipes cards.
- **[LOW] Notification badge** dans header sans `aria-label="N unread"` — [AppHeader.tsx:43-46](frontend/src/components/layout/AppHeader.tsx#L43).
- **[LOW] `role="alert"` sur le primitive `Alert` static** ([alert.tsx:28](frontend/src/components/ui/alert.tsx#L28)) — devrait être `role="status"` ou rien sauf alerte live.

### Content (teammate-content)

- **[HIGH] 23 / 32 messages d'erreur sont sysadmin-style** ("Échec de X. Veuillez réessayer.", "Erreur lors de…") — directement contraire au charter "Le système constate, il ne se félicite pas". Plan : rewrite des `messages.error.*` + `messages.success.*` en un sweep, drop les `!` (18 occurrences) et "avec succès" (17 occurrences).
- **[HIGH] Locale parity** : 20 keys manquantes en FR, 45 en ES (incluant le bloc `pages.shopping.bulkStorage*` 12 keys — Spanish users voient le path de la clé). 2 keys orphelines en FR (`itemMinimum.minimumDeleted*`).
- **[MED] Raw `error.message` exposé en toast** (4 endroits, leak des Sequelize errors) : [AddStoredItemDialog.tsx:279,331](frontend/src/components/AddStoredItemDialog.tsx#L279), [LeftoverPortionsDialog.tsx:174](frontend/src/components/meals/LeftoverPortionsDialog.tsx#L174), [StorageAreaManager.tsx:109](frontend/src/components/StorageAreaManager.tsx#L109), [storedItemStore.ts:244,273,302,327](frontend/src/stores/storedItemStore.ts#L244).
- **[MED] 3 noms pour "Add storage"** : `Ajouter un stockage` / `Ajouter stockage` / `Ajouter une zone` / `Créer une zone` — pick "espace" (cohérent avec `addStoredItemDialog`).
- **[MED] `pages/Demo.tsx`** = 100 % EN hardcodé (~30 strings) — vérifier si toujours linké en prod ; sinon ajouter `noindex` ou retirer.
- **[MED] `<CardTitle>Instructions</CardTitle>`** hardcodé EN — [RecipeDetails.tsx:437](frontend/src/pages/RecipeDetails.tsx#L437).
- **[MED] `placeholder="Enter quantity"` / `"Qty"` hardcodés EN** — [ItemMinimumDialog.tsx:193](frontend/src/components/ItemMinimumDialog.tsx#L193), [QuantitySelector.tsx:164](frontend/src/components/QuantitySelector.tsx#L164).
- **[MED] Bouton AddStoredItem `toast.error(t('cookedMeal.dishNameLabel'))`** ([AddStoredItemDialog.tsx:289](frontend/src/components/AddStoredItemDialog.tsx#L289)) utilise un *label de form* comme message d'erreur — l'user voit "Nom du plat" en toast sans contexte.
- **[LOW] Shadcn UI defaults EN** : `Previous`, `Next`, `Close`, `More`, `Toggle Sidebar`, `Previous slide` — sr-only mostly mais à plumber pour les 3 locales.
- **[LOW] `messages.error.googleClientIdNotConfigured`** est un dev-error visible user — devrait jamais atteindre la prod UI.

---

## Plan d'attaque suggéré

1. **Sprint 1 (XS quick-wins batchés)** : tous les quick-wins de la table, en un seul PR "polish" (~3 h).
2. **Sprint 2 (robustness)** : #1 ErrorBoundary, #4 HouseholdDetails 404, #7 silent failures (avec rewrite ton charter pour les nouveaux toasts), #9 cook-mode meal-plan link.
3. **Sprint 3 (data-loss prevention)** : #2 storedItem delete (sonner undo + spacing trash/edit), #10 autofocus + Enter submit (S, énorme ROI).
4. **Sprint 4 (charter foundation)** : exposer `--mf-*` à Tailwind config, fix `borderRadius.lg`, refactor `Button variant="green"` ⇒ `variant="primary"` charter-aligné (résout #6 a11y + design simultanément), promouvoir `<CardTitle>` en `heading-2`.
5. **Sprint 5 (polish a11y/UX)** : #5 `<CardButton>` polymorphe (résout 6 cartes en un primitive), #13 touch-friendly sweep mobile, #8 modal-on-modal skip, #11 tu-only migration FR.
6. **Sprint 6 (perf heavy data)** : #14 React Query adoption + virtualisation `@tanstack/react-virtual` + batched item lookup (`?ids=…` côté backend) + animer-on-enter-viewport seulement.
7. **Sprint 7 (consolidation)** : #15 unifier add-stored-item flow, #12 sweep raw color classes ⇒ tokens (le plus gros effort, à faire après que les fondations Tailwind soient en place).
