# Audit teammate-content

Auditor: teammate-content (microcopy / i18n / tone)
Scope: `frontend/src/i18n/locales/{en,es,fr}.json` + components/pages
Charter ref: `docs/charte-graphique.html` § 07 — Voix (lines 772-792)

---

## Voice (from charter)

The charter (section "07 — Voix", line 775) is unambiguous:

> "On parle au foyer, pas à l'utilisateur. Phrases courtes, présent simple, verbe d'action en tête. Pas de "votre", pas de "élément", pas d'"opération réussie". Le système constate, il ne se félicite pas."

Charter examples (line 781-789):
- ON DIT: `"Carotte ajoutée à la liste."` / `"3 articles à finir avant samedi."` / `"Tout est rangé."`
- ON ÉVITE: `"L'élément Carotte a été ajouté avec succès à votre liste de courses."` / `"Vous avez actuellement 3 items en attente de validation."` / `"Opération réussie."`

**The current app does almost the exact opposite of the charter for FR.**
- "votre/vos/vous" appears 69 times in `fr.json` — banned by charter.
- "avec succès" appears 17 times across success toasts — banned verbatim ("Pas d'opération réussie").
- French uses formal/sysadmin tone ("Veuillez sélectionner…", "Êtes-vous sûr de vouloir…", "L'article a été…") — opposite of the charter's terse, present-tense, action-first voice.
- The charter's voice is implemented in only ~8 keys (mostly the recent `cookedMeal`, `addStoredItemDialog`, `leftoverPortionsDialog`, `pages.more.*` blocks and a few `pages.dashboard.*` empty states added during this branch). The rest of the locale predates the charter.

---

## 1. Label consistency

| Action | Variants found in `fr.json` | Recommended canonical |
|---|---|---|
| Add (new item / area / etc.) | `Ajouter` (39), `Créer` (8 — `createNewItem`, `createArea`, `createRecipe`, `createNewHousehold`, `createYourHousehold`, `createNew`, `createWithDetails`, `creationFailed`), `Nouveau/Nouvelle` (1 — `newName`), icon-only `+` in JSX (e.g. charter button "+ Tout ranger") | **`Ajouter`** for adding to a list/collection; **`Créer`** only when materializing a new entity (foyer, recette, zone). Document the rule. |
| Add a storage area | `addStorage: "Ajouter un stockage"` (L31), `addArea: "Ajouter une zone"` (L126), `addStorage: "Ajouter stockage"` (L220 — no article), `addStorageArea: "Ajouter une zone de stockage"` (L127), `addNewStorageArea: "Ajouter une nouvelle zone de stockage"` (L221), `createArea: "Créer une zone"` (L136) | Pick one noun: "espace" (used in `addStoredItemDialog`) **or** "zone" **or** "stockage". Currently mixes all three. Charter glossary uses "espace de stockage". |
| Delete / remove | `Supprimer` (18), `Retirer` (4 — `removeMeal`, `Retirer un repas`, `Retirer {{title}}`, `Retirer de la liste`), `Effacer` (1 — `clearFilter`), no "Effacer/Eliminer" otherwise | Keep **`Supprimer`** for destructive (deletes data); use **`Retirer`** for "remove from this list/menu without deleting"; **`Effacer`** only for "clear filter / clear input". This split exists *de facto* but is inconsistent — e.g. `clearAll: "Tout effacer"` for notifications should arguably be "Tout supprimer" since it deletes them. |
| Cancel / back / close | `Annuler` (2 in buttons + `cookedMeal.deleteRecipe.cancel`), `Retour` (5), `Fermer` (1) | Keep three labels but enforce: **`Annuler`** = abort current action in dialog; **`Retour`** = navigate back one level; **`Fermer`** = close a panel/sheet that has no action. Currently OK. |
| Save / confirm | `Enregistrer` (2), `Sauvegarder la recette` (1 — L846), `Valider` (1 — L624), `Confirmer` (3), `Mettre à jour` (1 — `update`) | **`Enregistrer`** for forms; drop `Sauvegarder` (line 846 `recipes.saveRecipe`) — that's an EN→FR direct translation of "save". `Valider` (used only in shopping bulk storage L624) breaks consistency — replace with `Enregistrer` or `Confirmer`. |
| Edit | `Modifier` (8) — but **title-cased "Modifier l'Article" (L233), "Créer un Nouvel Article" (L234), "Modifier la Recette" (L830)** | French does not title-case nouns. Fix to "Modifier l'article", "Créer un nouvel article", "Modifier la recette". |

---

## 2. Error message quality

| Message (fr.json key) | Quality | Why / Rewrite |
|---|---|---|
| `messages.error.somethingWentWrong: "Quelque chose s'est mal passé"` | TECH | Vague, no action. Rewrite per charter: → "Action impossible. Réessaie." |
| `messages.error.requestFailed: "L'opération a échoué. Veuillez réessayer."` | TECH | "L'opération" is exactly what the charter forbids. → "Action interrompue. Réessaie." |
| `messages.error.networkError: "Erreur réseau survenue"` | MIXED | "Erreur survenue" is robotic. → "Pas de connexion. Vérifie le réseau." |
| `messages.error.failedToCreateItem: "Échec de la création d'article"` | TECH | "Échec de la X" pattern is sysadmin-speak. → "Article non créé." |
| `messages.error.failedToUpdateProfile: "Échec de la mise à jour du profil. Veuillez réessayer."` | TECH | Same. → "Profil non mis à jour. Réessaie." |
| `messages.error.invalidQuantity: "Quantité invalide. Veuillez entrer une quantité valide."` | TECH | Tautology + "Veuillez". → "Quantité incorrecte." (the input already shows what's expected) |
| `messages.error.invalidItemName: "Le nom de l'article doit avoir au moins 2 caractères et ne peut contenir que des caractères alphanumériques et des espaces."` | TECH | Wall of text describing regex rules. → "Nom trop court ou avec des caractères spéciaux." |
| `messages.error.duplicateItemName: "Un article avec ce nom existe déjà dans votre foyer"` | MIXED | "votre foyer" banned. → "Cet article existe déjà." |
| `messages.error.deleteFailed: "Échec de la suppression de zone de stockage. Veuillez réessayer."` | TECH | Key is "deleteFailed" but message hardcodes "zone de stockage" — wrong reuse. Fix: `"Suppression impossible. Réessaie."` |
| `messages.error.couldNotCopyToken: "Impossible de copier le jeton dans le presse-papiers."` | TECH | "le jeton dans le presse-papiers" reads like a developer wrote it for himself. → "Copie impossible." |
| `messages.error.missingHouseholdOrUserInformation: "Informations de foyer ou d'utilisateur manquantes."` | TECH | Internal state name leaked. → "Connexion expirée. Reconnecte-toi." |
| `messages.error.invalidRecipeIngredients: "Certains ingrédients font référence à des articles qui n'existent plus. Supprimez-les ou choisissez des articles valides dans la liste."` | MIXED | OK but verbose. → "Certains ingrédients pointent vers un article supprimé. Choisis un autre article." |
| `messages.error.creationFailed: "Échec de la création"` | TECH | Bare. → "Création impossible." (still poor — context-specific would be better) |
| `messages.error.googleClientIdNotConfigured: "⚠️ ID client Google non configuré. Veuillez définir VITE_GOOGLE_CLIENT_ID dans votre fichier .env."` | TECH | This is a developer error message visible to users (line 1065). Should never reach prod UI. |
| `loyaltyCards.messages.deleteFailed: "Erreur lors de la suppression"` | TECH | "Erreur lors de…" sysadmin pattern. → "Suppression impossible." |
| `itemMinimum.minimumSetFailed: "Erreur lors de la définition du minimum"` | TECH | Same. → "Minimum non enregistré." |
| `loyaltyCards.scanner.cameraError: "Impossible d'accéder à la caméra"` | USER | Clear and actionable, kept as-is. |
| `addStoredItemDialog.areaDeleted: "Cet espace n'existe plus. Choisis un autre espace."` | USER | Charter-aligned, present tense, tutoiement. **Use as the model for rewrites.** |
| `storedItemStore.ts:243 toast.error("Failed to Add Item")` (hardcoded) | TECH+i18n bug | English in production. See section 6. |
| `storedItemStore.ts:263 toast.success("Item Updated!", { description: "Item has been updated successfully." })` | TECH+i18n bug | English. Also "successfully" = the exact "succès" the charter forbids. |
| `AddStoredItemDialog.tsx:279, 331` `toast.error(error.message)` | TECH | Surfaces raw API/Sequelize/network error messages directly. Always wrap with `t('messages.error.…')` and only show backend message in a debug build. |
| `LeftoverPortionsDialog.tsx:174 toast.error(message)` | TECH | Same — raw error surfaces to user. |
| `StorageAreaManager.tsx:109 toast.error(message)` | TECH | Same. |
| `AddStoredItemDialog.tsx:289 toast.error(t('cookedMeal.dishNameLabel'))` | TECH | Uses a *form label* ("Nom du plat") as an error toast. User sees a toast saying "Nom du plat" with no context. Add a dedicated key `cookedMeal.dishNameRequired: "Donne un nom au plat."` |

Counted by class on a sample of 32 user-facing error messages: **USER 4 / MIXED 5 / TECH 23**. ~72 % of error messages are sysadmin-style.

---

## 3. Lorem ipsum / placeholders / dummy data

- **`a:\dev\my-fridge\frontend\src\pages\Dashboard.tsx:287-306`** — three hardcoded fake activity items: `"Sarah added milk to the fridge"` / `"Low stock: Bread"` / `"John completed shopping list"` with `"2 hours ago"`, `"4 hours ago"`, `"Yesterday"`. These are fake demo data shipped to production; not translated; not actual data. **Severity HIGH.**
- **`a:\dev\my-fridge\frontend\src\pages\Demo.tsx`** (entire file, lines 17–155) — the entire `/demo` route is hardcoded English, no `t()` calls. Strings include `"Back to Home"`, `"MyFridge Demo"`, `"Storage Areas"`, `"Fridge"`, `"Milk"`, `"Carrots"`, `"Yogurt"`, `"Chicken"`, `"Rice"`, `"Pasta"`, `"Bread"`, `"Tomatoes"`, `"Bought"`, `"Fresh"`, `"Plenty"`, `"Low stock"`, `"Auto-added"`, `"Manual"`. Likely never reviewed for i18n. Verify if `/demo` is still linked from prod.
- **`a:\dev\my-fridge\frontend\src\pages\RecipeDetails.tsx:437`** — `<CardTitle>Instructions</CardTitle>` hardcoded.
- **`a:\dev\my-fridge\frontend\src\pages\Dashboard.tsx:127`** — `// TODO: Re-enable notifications and storage when stores are ready` — internal TODO, but the surrounding code path may show stale UI. (Code-only TODO, not user-facing — flagged for fix-up.)
- **`a:\dev\my-fridge\frontend\src\components\ItemMinimumDialog.tsx:193`** — `placeholder="Enter quantity"` hardcoded English.
- **`a:\dev\my-fridge\frontend\src\components\QuantitySelector.tsx:164`** — `placeholder="Qty"` hardcoded English.
- **`a:\dev\my-fridge\frontend\src\components\ui\pagination.tsx:67,73,83,88,104`** — `aria-label="Go to previous page"`, `<span>Previous</span>`, `<span>Next</span>`, `<span>More pages</span>`. Shadcn defaults left untouched.
- **`a:\dev\my-fridge\frontend\src\components\ui\carousel.tsx:218,247`** — `Previous slide` / `Next slide` hardcoded.
- **`a:\dev\my-fridge\frontend\src\components\ui\dialog.tsx:47`** + **`sheet.tsx:68`** — `<span className="sr-only">Close</span>` hardcoded (screen-reader text in EN only).
- **`a:\dev\my-fridge\frontend\src\components\ui\sidebar.tsx:296`** — `aria-label="Toggle Sidebar"`.
- **Spanish-in-French translations** (machine-translated leftovers, never proofread):
  - `fr.json:159 "chestFreezer": "Congélateur de pecho"` — *pecho* is Spanish for "chest". Should be "Congélateur coffre".
  - `fr.json:160 "iceBox": "Cave à vin"` — wine cellar ≠ ice box. Should be "Glacière".
  - `fr.json:161 "walkInPantry": "Garde-manger de pasillo"` — *pasillo* is Spanish for "corridor". Should be "Cellier" or "Garde-manger walk-in".
  - `fr.json:162 "foodCloset": "Garde-manger de alimentos"` — entirely Spanish words. Should be "Réserve alimentaire".

No `lorem`, `FIXME`, `XXX`, `dummy`, `test text` literal strings detected in user-facing locales.

---

## 4. Tu vs Vous (French)

**Counts in `fr.json`:**
- **Vous / votre / vos**: 69 occurrences (formal, dominant)
- **Tu / te / toi / ton / ta / tes**: ~16 occurrences (informal, recent additions)

**Verdict: BROKEN. Mixed, with one same-string mix.**

### Sample classification (20 strings)

| # | Key / Line | String (truncated) | Classification |
|---|---|---|---|
| 1 | `addStoredItemDialog.description` (L206) | "Choisis l'article puis l'espace où le ranger." | **Tu** |
| 2 | `addStoredItemDialog.noAreaDescription` (L216) | "Crée d'abord un espace pour y ranger tes articles." | **Tu** |
| 3 | `cookedMeal.portionsLeft_one` (L52) | "Il te reste {{count}} portion de {{name}}" | **Tu** |
| 4 | `leftoverPortionsDialog.portionsHelperZero` (L75) | "Rien à garder — appuie sur « Non, rien à garder »." | **Tu** (impératif tutoyé) |
| 5 | `pages.dashboard.recentActivityDescription` (L495) | "Ce qui se passe dans votre foyer" | **Vous** |
| 6 | `pages.dashboard.addFirstStorageArea` (L499) | "Ajoutez votre première zone de stockage" | **Vous** |
| 7 | `messages.confirmation.deleteItem` (L427) | "Êtes-vous sûr de vouloir supprimer cet article ?" | **Vous** |
| 8 | `messages.confirmation.removeMember` (L428) | "Êtes-vous sûr de vouloir supprimer {{name}} du foyer ?" | **Vous** |
| 9 | `pages.profile.…enterFirstName` (L950) | "Entrez votre prénom" | **Vous** |
| 10 | `pages.households.leaveHouseholdDescription` (L990) | "Êtes-vous sûr de vouloir quitter ce foyer ? Vous perdrez l'accès…" | **Vous** |
| 11 | `messages.error.loginRequired` (L392) | "Veuillez vous connecter pour accéder à cette ressource" | **Vous** |
| 12 | `messages.inviteMessage` (L431) | "Rejoins mon foyer …Utilise le code… MyFridge aide à gérer l'inventaire partagé de votre cuisine…" | ⚠️ **MIXED in same string** |
| 13 | `messages.inviteMessageWithLink` (L432) | "Rejoins mon foyer… Clique sur le lien… te connecter… votre cuisine…" | ⚠️ **MIXED in same string** |
| 14 | `pages.more.storageAreas.description` (L450) | "Consulte tes espaces de stockage" | **Tu** |
| 15 | `pages.more.features.profile.description` (L468) | "Ton compte et tes préférences" | **Tu** |
| 16 | `pages.more.features.signOut.description` (L484) | "Te déconnecter de ton compte" | **Tu** |
| 17 | `pages.recipes.empty.description` (L568) | "Commence à ajouter des produits pour suivre ce que tu as en stock." | **Tu** |
| 18 | `pages.shopping.alreadyOnList` (L750) | "Tu as déjà ajouté assez à ta liste pour couvrir le besoin." | **Tu** |
| 19 | `pages.shopping.noItems` (L580) | "Aucun article dans votre liste de courses" | **Vous** |
| 20 | `pages.shopping.completedItemsWillAppear` (L615) | "Les articles que vous marquez comme terminés apparaîtront ici" | **Vous** |

**Pattern**: Recently-touched blocks (`cookedMeal`, `addStoredItemDialog`, `leftoverPortionsDialog`, `pages.more.*`, `pages.recipes.empty`, `pages.shopping.alreadyOnList`/`subtitleEmpty`) use **tu**. Older blocks (most of `messages.*`, `pages.dashboard.*`, `pages.profile.*`, `pages.households.*`) use **vous**. The two coexist on the **same screens** (a Dashboard with `pages.dashboard.*` in vous can show a toast from `cookedMeal` in tu).

### Mixed-in-the-same-string bombs

- `messages.inviteMessage` (L431) — *"Rejoins mon foyer "{{householdName}}" sur MyFridge ! Utilise le code d'invitation : {{inviteCode}}. MyFridge aide à gérer l'inventaire partagé de **votre** cuisine, planifier les repas ensemble et réduire le gaspillage alimentaire. Télécharge l'app et rejoins-nous !"* → opens "tu", then "votre cuisine" mid-sentence.
- `messages.inviteMessageWithLink` (L432) — same issue: "Rejoins / te connecter / **votre** cuisine".

### Recommendation

The charter ("On parle au foyer") implies **tutoiement** (warm, household tone). Pick **tu** and migrate all 69 vous-strings. Action plan:
1. Add a lint rule / one-shot script over `fr.json` that flags `\b(votre|vos|vous|veuillez|êtes-vous|entrez|sélectionnez|cliquez)\b`.
2. Rewrite messages.error.*, messages.success.*, messages.confirmation.* first (highest visibility).
3. Fix the two `inviteMessage*` strings immediately — they are user-shared (WhatsApp/SMS) and currently look unprofessional.

---

## 5. Tone alignment with charter

Charter examples vs current strings:

| Charter "ON DIT" | Current app says (verbose, voussoyé, congratulatory) |
|---|---|
| "Carotte ajoutée à la liste." | `messages.success.itemAdded`: "{{item}} ajouté à la liste." ✅ rare match |
| "Tout est rangé." | `pages.shopping.allItemsCompleted`: "Tous les articles terminés !" — exclamation = félicitation |
| (terse, present) | `messages.success.profileUpdated`: "**Votre** profil a été mis à jour **avec succès**." — both bans |
| (terse, present) | `messages.success.recipeSaved`: "**Votre** nouvelle recette a été sauvegardée dans **votre** collection." |
| (no congrats) | `pages.recipes.cookingMode.congratulations`: "**Félicitations !**" + `congratulationsDescription`: "**Vous avez** terminé de cuisiner {{recipeTitle}} **!**" — exact violation of "le système ne se félicite pas" |
| (no exclamation) | 18 success/event keys end in `!` (`Plan de repas ajouté !`, `Recette ajoutée !`, `Foyer créé !`, `Liste de courses générée !`, …) |
| (no "élément") | OK — app uses "article" not "élément" |
| (no "succès") | 17 strings contain "avec succès" — direct ban |

**Tone diagnosis**: The current French copy is mid-2010s SaaS — formal-administrative ("Veuillez sélectionner", "Êtes-vous sûr"), exclamation-heavy success toasts ("Foyer créé !", "Recette ajoutée !"), congratulatory ("Félicitations !"), boilerplate failures ("Échec de la X", "L'opération a échoué"). This is the exact register the charter rejects.

**Top tone fixes** (highest visibility):
- `messages.success.itemDeleted: "Article supprimé avec succès"` → `"Article retiré."`
- `messages.success.profileUpdated: "Votre profil a été mis à jour avec succès."` → `"Profil à jour."`
- `messages.success.recipeSaved: "Votre nouvelle recette a été sauvegardée dans votre collection."` → `"Recette enregistrée."`
- `pages.recipes.cookingMode.congratulations: "Félicitations !"` → drop the screen, or `"C'est prêt."`
- All `messages.error.failedTo* + Veuillez réessayer.` → `"X impossible. Réessaie."`
- All keys ending in `!` → drop the `!` (charter examples never exclaim)

---

## 6. i18n coverage / hardcoded strings

### Hardcoded strings (top offenders)

| Location | String | Severity |
|---|---|---|
| `frontend/src/stores/storedItemStore.ts:233-344` | `toast.success("Item Added!", …)`, `toast.error("Failed to Add Item", …)`, `toast.success("Item Updated!", …)`, `toast.error("Update Failed")`, `toast.success("Item Removed!")`, `toast.error("Delete Failed")`, `toast.error('Failed to consume portion')`, `toast.success("Item Marked as Opened")`. Plus `description: "Item has been added to storage successfully."` etc. **Eight English-only toasts shown on every CRUD action of the most-used entity.** No `useTranslation`/`i18n` import in this file. | **CRITICAL** |
| `frontend/src/pages/Dashboard.tsx:287-306` | `"Sarah added milk to the fridge"`, `"2 hours ago"`, `"Low stock: Bread"`, `"4 hours ago"`, `"John completed shopping list"`, `"Yesterday"` — fake demo data shipped to prod | HIGH |
| `frontend/src/pages/Demo.tsx:17-155` | Whole page in English (~30 strings) | MED (only on `/demo`) |
| `frontend/src/pages/RecipeDetails.tsx:437` | `<CardTitle>Instructions</CardTitle>` | MED |
| `frontend/src/components/ItemMinimumDialog.tsx:193` | `placeholder="Enter quantity"` | MED |
| `frontend/src/components/QuantitySelector.tsx:164` | `placeholder="Qty"` | LOW |
| `frontend/src/components/ui/pagination.tsx:67,73,83,88,104` | "Go to previous page", "Previous", "Next", "Go to next page", "More pages" | LOW (untouched shadcn) |
| `frontend/src/components/ui/carousel.tsx:218,247` | "Previous slide", "Next slide" | LOW |
| `frontend/src/components/ui/dialog.tsx:47` + `sheet.tsx:68` | `<span className="sr-only">Close</span>` | LOW |
| `frontend/src/components/ui/breadcrumb.tsx:102` | `<span className="sr-only">More</span>` | LOW |
| `frontend/src/components/ui/sidebar.tsx:296` | `aria-label="Toggle Sidebar"` | LOW |

### Raw error.message leaked to user

These display the backend / network / Sequelize error string verbatim if `error instanceof Error`:

- `frontend/src/components/AddStoredItemDialog.tsx:279` — `toast.error(message)` where `message = error.message`
- `frontend/src/components/AddStoredItemDialog.tsx:331` — same
- `frontend/src/components/meals/LeftoverPortionsDialog.tsx:174` — same
- `frontend/src/components/StorageAreaManager.tsx:109` — same
- `frontend/src/stores/storedItemStore.ts:244,273,302,327` — same (passed as `description`)

A user can see a toast saying "duplicate key value violates unique constraint", "fetch failed", or any uncaught backend message. Wrap with `t('messages.error.failedToX')` and route the raw message to `console.error` only.

### Locale parity

- **EN: 3798 keys / FR: 3780 keys / ES: 3753 keys.**
- **20 keys missing in FR** (mostly the new `messages.itemMinimum.*` block + `pages.dashboard.noLowStockItems` + `pages.recipes.uploadImage`):
  - `messages.itemMinimum.{title,description,setMinimum,editMinimum,removeMinimum,minimumQuantity,currentStock,lowStock,belowMinimum,quantityNeeded,noMinimums,noMinimumsDescription,minimumSet,minimumSetDescription,addLowStockToShopping,confirmRemove,minimumFor,manageMinimums}`
  - `pages.dashboard.noLowStockItems`
  - `pages.recipes.uploadImage`
- **45 keys missing in ES**, including everything FR is missing **plus**:
  - `storageArea.{defaultCategories,selectCategories}`
  - `itemSelector.{recipes_one,recipes_other}`
  - `messages.success.{recipeImported,householdRenamed}`
  - `messages.error.failedToAddItem`
  - The **entire `pages.shopping.bulkStorage*` block** (12 keys: `bulkStorage`, `bulkStorageTitle`, `storeAll`, `storeCount`, `itemAddedQuick`, `modify`, `skip`, `validate`, `expirationDate`, `suggestedArea`, `bulkStorageSuccess`, `bulkStorageError`, `noStorageAreas`, `selectAll`) — Spanish users see the i18n key fallback text on the Shopping bulk-storage feature.
- **2 keys in FR not in EN** (orphan): `itemMinimum.minimumDeleted`, `itemMinimum.minimumDeletedFailed`. EN fallback will show the key string.
- **0 ES-only keys, 0 EN-only that were intentional.**

---

## Runtime validation (Playwright, 2026-05-10)

Vérif live sur `/dashboard` mobile (375 px), screenshot enregistré : [runtime-mobile-dashboard.png](runtime-mobile-dashboard.png).

### Findings runtime confirmés

- **Fake "Activité récente" en anglais** visible directement à l'écran : `"Sarah added milk to the fridge"` / `"Low stock: Bread"` / `"John completed shopping list"` / `"2 hours ago"` / `"Yesterday"`. Sur une session FR, c'est cassé.
- **Title-case français** visible : carte quick-action affiche `"Liste de Courses"` (C majuscule) — non orthographique en français.
- **"À consommer rapide..."** tronqué au milieu de l'heading h3 sur dashboard mobile (overflow non géré ; `text-truncate` ou `line-clamp` manquant).
- **"Plus tard" / "Activer"** push-banner — labels alignés avec le ton charter (terse, présent), bon exemple à généraliser.
- **"Jeter"** pour les items expirés — choix de mot fort et univoque, mais c'est un bouton 1-clic destructif sans confirmation (cf. flows #2 du top-15).

### Heading levels live

`/dashboard` (live) : H1 "Chez oime" → H3 "À consommer rapidement" → H3 "Articles en stock faible" → H2 "Zones de stockage" → H3 ×5 (storage cards). Le H1 "Chez oime" est le **nom du foyer**, pas le titre de la page → confusion sémantique pour screen-readers.

### Tu/Vous live — observations directes

- "Recevoir ces alertes même quand l'app est fermée ?" → pas de pronom, neutre ✓
- "Choisis l'article puis l'espace où le ranger." (charter-aligned, tu) ✓
- "Ce qui se passe dans votre foyer" (sous-titre Activité récente) ❌ vous

→ Le mix tu/vous est **observable dans la même page** (Dashboard mobile single screenshot).

---

## Top 5 content issues (priority)

1. **[CRITICAL] Hardcoded English toasts on every stored-item CRUD action** — `frontend/src/stores/storedItemStore.ts:233,243,263,272,292,301,327,342`. Eight raw English strings (`"Item Added!"`, `"Failed to Add Item"`, `"Update Failed"`, `"Item Removed!"`, `"Delete Failed"`, `"Failed to consume portion"`, `"Item Marked as Opened"`) on what is the most-used entity. No `i18n` import. Fix: import `i18n` from `@/i18n` and replace each toast with `t('messages.success.itemAdded', …)` / `t('messages.error.failedToAdd*')`. While doing it, kill "successfully" / "with success" per charter.
2. **[CRITICAL] Tu/Vous mixed throughout, with same-string mixing in `messages.inviteMessage` / `inviteMessageWithLink`** — `fr.json:431-432`. These messages are *shared by users* (WhatsApp / SMS); they currently switch from "Rejoins / te connecter" to "votre cuisine" mid-message. Pick `tu` (charter "on parle au foyer"), do a one-shot rewrite of the 69 vous-strings.
3. **[HIGH] Fake demo data in production Dashboard** — `frontend/src/pages/Dashboard.tsx:287-306`. Hardcoded "Sarah added milk to the fridge / 2 hours ago", "John completed shopping list / Yesterday". Either wire up real activity or hide the section. Currently ships fake EN data even on FR users.
4. **[HIGH] Spanish-language strings inside fr.json** — `fr.json:159-162`. `"Congélateur de pecho"`, `"Garde-manger de pasillo"`, `"Garde-manger de alimentos"`, plus `"Cave à vin"` for `iceBox`. Machine-translated artifacts. Replace with: `"Congélateur coffre"`, `"Cellier"`, `"Réserve alimentaire"`, `"Glacière"`.
5. **[HIGH] 72 % of FR error messages are sysadmin-style "Échec de X. Veuillez réessayer." / "Erreur lors de…"** — directly violates charter's "Le système constate, il ne se félicite pas, Pas d'opération réussie". Combined with the 17 `"avec succès"` success toasts and 18 keys ending in `!`, the entire feedback layer needs a one-shot rewrite per charter examples ("Carotte ajoutée à la liste.", "Tout est rangé."). Also drop `pages.recipes.cookingMode.congratulations: "Félicitations !"` outright.

### Bonus (HIGH but lower than top 5)

- **[HIGH] Locale parity gaps**: 20 keys missing in FR, 45 in ES (including a 12-key block on Shopping bulk storage that breaks for Spanish users).
- **[MED] Raw `error.message` shown in toasts** in 4 components (see section 6) — leaks backend strings.
- **[MED] Title-case in French**: "Modifier l'Article", "Créer un Nouvel Article", "Modifier la Recette" (`fr.json:233,234,830`).
- **[MED] Three competing names for "Add storage"**: `Ajouter un stockage` / `Ajouter stockage` / `Ajouter une zone` / `Créer une zone`. Pick one noun (recommend "espace") and align with charter button "+ Tout ranger".
- **[LOW] Shadcn UI defaults left in EN**: `Previous`, `Next`, `Close`, `More`, `Toggle Sidebar`, `Previous slide` — affects all 3 locales (sr-only mostly).
