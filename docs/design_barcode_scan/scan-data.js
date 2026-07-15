# Handoff : Scan de code-barres dans la liste de courses

## Overview
Cette feature ajoute le **scan de code-barres** à la page *Liste de courses* de Fresh (« MonFrigo »).
Objectif : accélérer le flow courses → rangement. En magasin ou au déballage, l'utilisateur
scanne un article et l'app agit selon l'état de la liste :

- Article présent dans **« À acheter »** → bascule automatique vers **« À ranger »** (équivalent d'un tap sur la case).
- Article déjà dans **« À ranger »** → ouverture de **l'assistant de rangement guidé** (lieu + péremption).
- Article **hors-liste mais au catalogue** → modale « L'ajouter directement à À ranger ? ».
- Article **absent du catalogue** → formulaire pré-rempli depuis **Open Food Facts**, création + ajout, et sauvegarde du mapping.
- **Code non reconnu** → fallback saisie manuelle.

Le scan fonctionne en **mode continu** (la caméra reste active, on enchaîne les scans, bouton « Terminé » pour sortir).

Périmètre V1 : scan **uniquement depuis la page liste de courses**. Hors périmètre : scan depuis « Mes produits »,
scan depuis le formulaire d'ajout stock, OCR de la péremption, rangement express batch.

---

## About the Design Files
Les fichiers de ce bundle sont des **références de design réalisées en HTML/CSS/JS vanilla** — des
prototypes montrant l'apparence et le comportement attendus, **pas du code de production à copier tel quel**.

La tâche consiste à **recréer ces designs dans l'environnement du codebase cible** (React/Vue/Svelte/SwiftUI…)
en suivant ses patterns et sa librairie de composants existants. S'il n'y a pas encore d'environnement,
choisir le framework le plus adapté au projet et y implémenter les écrans.

La caméra des maquettes est **simulée** : les « scans » sont déclenchés par un simulateur (rangée de produits
en bas du viseur). En production, remplacer ce simulateur par un vrai décodeur de code-barres —
recommandation du ticket : **`@zxing/browser`** (formats EAN-13, EAN-8, UPC-A, UPC-E), alternative `html5-qrcode`.

## Fidelity
**High-fidelity (hifi).** Couleurs, typographie, espacements, rayons, ombres et interactions sont définitifs.
Recréer l'UI au pixel près avec les composants du codebase. Les valeurs exactes sont listées dans **Design Tokens**.

---

## Screens / Views

Le flow s'appuie sur la page liste de courses existante (deux sections *À acheter* / *À ranger*).
Les éléments NOUVEAUX de cette feature :

### 0. Point d'entrée — bouton Scan
- **Desktop** : bouton `btn btn-ghost` « Scanner » (icône Lucide `scan-barcode`) dans `.pg-actions`,
  entre « Depuis mes recettes » et le bouton primaire « Ajouter un article ».
- **Mobile** : bouton icône circulaire (52×52) à droite d'« Ajouter un article » dans une `.action-row`
  (flex, gap 9px, l'add-btn prend `flex:1`). Icône Lucide `scan-barcode`, 22px.
- Toujours accessible, que « À ranger » soit vide ou non (le bouton est aussi présent dans l'état vide et l'état « tout rangé »).

### 1. Écran de permission caméra (première ouverture)
- **Purpose** : expliquer l'usage de la caméra AVANT le prompt système, pour éviter le refus réflexe.
- **Layout** : carte centrée.
  - Desktop : carte claire `var(--bg)`, largeur 460px, `border-radius:26px`, padding `44px 44px 38px`, centrée sur un scrim `rgba(12,14,13,.55)`.
  - Mobile : plein écran dans le device, fond sombre `radial-gradient(120% 80% at 50% 20%, #22262a, #131517 75%)`, texte blanc.
- **Components** :
  - Icône dans pastille 66–72px, `border-radius:20–22px`, fond `var(--green-soft)` (desktop) / `rgba(43,182,115,.18)` (mobile), icône Lucide `camera`.
  - Titre `h2` : « Scanner tes articles » (DM Sans 800, 20–23px, letter-spacing -0.02em).
  - Paragraphe : « Fresh utilise la caméra pour scanner les codes-barres et gagner du temps pendant tes courses. Aucune photo n'est conservée. »
  - Bouton primaire pleine largeur (max 320px) : `camera` + « Activer la caméra » — fond `var(--green)`, texte #fff, radius 999px, padding 15px.
  - Bouton ghost « Plus tard » (ferme le scanner).
  - Lien discret « Simuler un refus » → écran refus (en prod : correspond au refus système).
  - Pied : `shield-check` + « Aucune image enregistrée ».

### 2. Écran caméra (mode scan continu)
- **Purpose** : viser et scanner en continu.
- **Layout** :
  - Desktop : carte sombre centrée 760px, `border-radius:26px`, `overflow:hidden`, fond `radial-gradient(120% 90% at 50% 15%, #2b2f33, #16191c 70%, #0c0e0f)`.
  - Mobile : plein écran device, même dégradé radial (variante 50% 30%).
- **Components** :
  - **Barre haute** (`.scan-top`, flex space-between) : bouton torche (rond 40–42px, fond `rgba(255,255,255,.14)` ; état actif fond `var(--yellow)` icône `#3a2e00`, Lucide `flashlight`/`flashlight-off`), titre « Scanner un code-barres » (DM Sans 700, 14–16px, blanc), bouton « Terminé » (pill `rgba(255,255,255,.16)`, blanc).
  - **Viseur** (`.scan-frame`) : rectangle 250×158 (mobile) / 340×190 (desktop), 4 coins verts (`border:3px solid var(--green)`, coins arrondis 14–16px), masque sombre autour via `box-shadow:0 0 0 2000px rgba(10,11,13,.34)`.
  - **Ligne de scan** (`.scan-line`) : barre 2px `linear-gradient(90deg,transparent,var(--green),transparent)`, `box-shadow:0 0 12px var(--green)`, animation verticale aller-retour `scanmove` 2.2s ease-in-out infinite.
  - **Indice** (`.scan-hint`) : pill sombre « Vise un code-barres… » → passe à « Code détecté ✓ » 1.4s après un scan.
  - **Simulateur** (`.scan-sim`, remplacé en prod par le flux caméra) : entête (icône `sparkles` + libellé + toggle réseau) et rangée/grille de produits scannables (`.scan-chip`). Chaque chip = vignette couleur + nom + hint du cas attendu. Desktop : grid 4 colonnes. Mobile : flex scroll horizontal, chips 132px.
  - **Toggle réseau** (`.scan-net`) : « En ligne » (Wifi) ↔ « Hors ligne » (WifiOff, fond `var(--orange)`).
  - **Flash** (`.scan-flash`) : overlay vert `opacity:.28→0` sur 0.5s au moment du scan.
  - **Toast de scan** (`.scan-toast`) : confirmation discrète en bas du viseur (fond `rgba(20,22,20,.94)`, pastille verte `check`), auto-dismiss 2.4s. Utilisé pour les cas 1, 3, 4.

### 3. Écran refus caméra
- Même gabarit que l'écran permission, accent rouge.
- Icône `camera-off` sur pastille `var(--red-soft)` / `rgba(239,74,90,.18)`.
- Titre « Scan indisponible », texte « Le scan n'est pas disponible sans accès caméra. Autorise la caméra dans les réglages de l'app… ».
- Bouton primaire `settings` + « Activer la caméra » (en prod : deep-link vers les réglages OS), bouton ghost « Fermer ».

### 4. Modale « Hors liste / déjà au catalogue » (Cas 3)
- **Purpose** : proposer l'ajout d'un article scanné non prévu mais connu du catalogue.
- Sheet (mobile, bottom-sheet) / modale centrée (desktop, 520px).
- Eyebrow bleu (`var(--blue-soft)` / `#1d4dab`) : `package-search` + « Hors liste · déjà au catalogue ».
- Titre `h3` « Tu n'avais pas prévu cet article », texte « Ce produit n'était pas dans ta liste. L'ajouter directement à « À ranger » ? ».
- Aperçu produit (`.scan-prev`) : vignette + nom + `qty · catégorie`.
- Actions : « Annuler » (secondaire) / « Ajouter à « À ranger » » (primaire, `package-plus`).

### 5. Formulaire Open Food Facts (Cas 4)
- **Purpose** : créer un article inconnu du catalogue à partir des données OFF.
- Eyebrow jaune (`var(--yellow-soft)` / `#8a6500`) : `globe` + « Nouveau · Open Food Facts ».
- Titre « Créer cet article » + texte explicatif.
- Aperçu produit avec, à droite, une vignette **image OFF informative** (`.off-img`, fond `var(--sub)`, icône `image` + label « OFF ») — image **non modifiable**.
- Champs :
  - **Nom du produit** — input texte pré-rempli (modifiable).
  - **Catégorie** — chips (`.scan-pick`) des 5 rayons Fresh, pré-sélection = mapping catégorie OFF → rayon (modifiable).
  - **Unité par défaut** — chips `['pièce','paquet','g','kg','L','x4']`, pré-sélection selon la catégorie (modifiable).
- Bandeau vert (`.scan-map-note`) : `users` + « Le mapping code-barres ↔ article sera partagé avec tous les foyers ».
- Actions : « Annuler » / « Créer et ajouter » (`check`). À la validation : création de l'article (state `stow`), ajout au mapping global.

### 6. Modale « Non identifié » (Cas 5)
- Eyebrow neutre (`var(--sub)` / `var(--ink-2)`) : `search-x` + « Non identifié ».
- « Produit non identifié » + « Le code {barcode} n'est pas reconnu par Open Food Facts. Tu peux l'ajouter manuellement. »
- Actions : « Continuer les scans » (ferme la modale, reste en scan) / « Ajouter manuellement » (`pen-line`, ouvre le formulaire d'ajout classique).

### 7. Modale « Hors ligne »
- Eyebrow orange (`var(--orange-soft)` / `#d65a1f`) : `wifi-off` + « Hors ligne ».
- « Connexion requise » + « Ce nouveau code-barres n'est pas dans le cache local. Connecte-toi… ou ajoute-le manuellement. »
- Actions : « Fermer » / « Ajouter manuellement ».

---

## Interactions & Behavior

**Ouverture du scan** : tap bouton scan → si permission jamais accordée, écran permission ; sinon écran caméra.

**Déroulé d'un scan** (`doScan(barcode)`) :
1. Flash vert + `scan-hint` « Code détecté ✓ » (revient à l'état neutre après 1.4s).
2. Résolution `resolveScan(barcode, { items, online })` → un des cas ci-dessous.

**Cas 1 — dans « À acheter »** : l'article passe `state:'buy' → 'stow'`, `save()`, re-render, toast discret « {nom} ajouté à « À ranger » ». On **reste dans le scanner** (continu). Sur la liste sous-jacente, l'article joue l'animation d'entrée dans « À ranger » (voir animations).

**Cas 2 — déjà dans « À ranger »** : fermeture du scanner + ouverture de l'**assistant de rangement guidé** pour cet article uniquement (flow existant : étape 1 lieu, étape 2 péremption optionnelle, bouton « Ranger au stock »).

**Cas 3 — hors-liste, au catalogue** : modale d'ajout. « Ajouter » → push de l'article catalogue en `state:'stow'`, toast, on reste en scan.

**Cas 4 — absent du catalogue** : appel OFF (simulé). Si produit trouvé → formulaire pré-rempli. « Créer et ajouter » → nouvel article `state:'stow'` créé dans le catalogue perso + **écriture du mapping global** `barcode → itemId`, toast « {nom} créé · mapping partagé ». On reste en scan.

**Cas 5 — code inconnu d'OFF** : modale non-identifié, fallback manuel.

**Hors ligne** : si le code n'est pas dans la table de mapping (cache local) et `online === false` → modale « Connexion requise ». Les codes déjà mappés (cache) continuent de fonctionner hors ligne (cas 1/2/3).

**Sortie** : bouton « Terminé » → fermeture, libération de la caméra (en prod : `stop()` sur les tracks du MediaStream).

**Code-barres illisible / non détecté** (à implémenter côté décodeur réel) : après quelques secondes sans détection, message NON bloquant « Code-barres non détecté, ajuste la position ».

### Animations & transitions
- `scanmove` : ligne de scan, 2.2s ease-in-out infinite (top 14–16px ↔ 142–172px).
- `flashfade` : flash vert, 0.5s ease (opacity .28→0).
- Toast de scan : translate Y 12px→0 + opacity, 0.25s ; auto-dismiss 2.4s.
- Modale/sheet résultat : desktop opacity + `translate(-50%,-46%)→(-50%,-50%)` 0.22s ; mobile bottom-sheet `translateY(110%)→0` 0.32s `cubic-bezier(.32,1.1,.4,1)`.
- Bascule d'un article (liste sous-jacente, flow existant) : ligne `.leaving` (translateX + opacity, 0.26s) puis `.entering`/`dropin` (0.42s `cubic-bezier(.34,1.4,.5,1)`).
- Overlay scanner : opacity 0.28s.

### Responsive
Deux implémentations distinctes fournies (mobile plein écran vs desktop carte centrée). Adapter selon les breakpoints du codebase ; la logique (`resolveScan`, actions par cas) est identique et partagée.

---

## State Management

État nouveau introduit par la feature :
- `camState` : `'prompt' | 'granted' | 'refused'` — état de la permission caméra (session).
- `scanOnline` : `bool` — simulation en ligne/hors ligne (en prod : `navigator.onLine`).
- `torchOn` : `bool` — état de la torche.
- `offSel` : `{ rayon, unit }` — sélection courante dans le formulaire OFF.

État existant de la liste (réutilisé) :
- `items[]` : chaque item `{ id, name, qty, emoji, bg, rayon, by, perish?, state:'buy'|'stow', _checked? }`, persisté en `localStorage`.
- `lastEntered:Set` : ids à animer à l'entrée dans « À ranger ».

Data / backend requis (voir ticket) :
- **Table de mapping globale partagée** : `{ id, barcode, item_id, confidence(0–1), created_at, validated_count }`.
  Résolution de conflit : au scan, prendre le mapping au `validated_count` le plus élevé ; incrémenter à chaque validation.
- **Table de surcharge par foyer** (override local) : consultée AVANT le mapping global.
- **Open Food Facts** : `GET https://world.openfoodfacts.org/api/v3/product/{barcode}.json`
  (gratuit, sans clé). Champs utilisés : `product_name_fr` / `product_name`, `image_front_url`,
  `categories_tags`, `quantity`. Requête **non bloquante, timeout 5s + fallback**.
- **Mapping catégories OFF → rayons Fresh** (maintenu backend) : ex. `en:dairies*→cremerie`,
  `en:meats*→boucherie`, `en:fresh-vegetables*→legumes`, `en:snacks/chips→boissons`, `en:groceries→epicerie`.

Fonction cœur (voir `scan-data.js`) :
```
resolveScan(barcode, { items, online }) → { kase, ... }
  kase 1 : { item }             // dans À acheter
  kase 2 : { item }             // dans À ranger
  kase 3 : { catalog }          // hors liste, au catalogue
  kase 4 : { off, rayon }       // trouvé sur Open Food Facts
  kase 5 : {}                   // inconnu OFF
  kase 'offline' : {}           // pas de cache + hors ligne
```

---

## Design Tokens

### Couleurs (thème clair)
| Token | Hex |
|---|---|
| `--bg` (mobile) | `#fdf8ed` |
| `--bg` (desktop) | `#f4e8c9` |
| `--card` (mobile) | `#ffffff` |
| `--card` (desktop) | `#fbf4e0` |
| `--sub` | `#f6efde` / `#ece0bf` |
| `--ink` | `#1a1d1a` |
| `--ink-2` | `#5e6760` |
| `--ink-3` | `#9ba59f` |
| `--rule` | `#ece4d2` |
| `--green` | `#2bb673` |
| `--green-soft` | `#d6f3e3` |
| `--green-deep` | `#1f9c5e` |
| `--orange` / `--orange-soft` | `#ff7a3a` / `#ffe0cc` |
| `--red` / `--red-soft` | `#ef4a5a` / `#ffd9de` |
| `--yellow` / `--yellow-soft` | `#ffc839` / `#fff1c4` |
| `--blue` / `--blue-soft` | `#4f8ef5` / `#dae9ff` |
| `--purple` / `--purple-soft` | `#8c6df0` / `#e4dafa` |
| `--pink` / `--pink-soft` | `#ff6f9c` / `#ffd9e6` |

Couleurs de texte des pills par rayon : green `#1f9c5e`, red `#b2333f`, blue `#1d4dab`, yellow `#8a6500`, purple `#5536c7`.
Fonds sombres caméra : dégradés `#2b2f33 → #141618/#16191c → #0b0c0d/#0c0e0f`. Un thème sombre complet existe (`[data-theme="dark"]`) sur le desktop.

### Typographie
- Display : **DM Sans** (400/500/600/700/800) — titres, boutons, labels.
- Corps : **Inter** (400/500/600/700).
- Échelle : titres modale 19–23px/800, h1 page 21–30px, corps 13.5–15px, labels 12–12.5px/700, hints 10.5–13px.

### Rayons & ombres
- Radius : boutons/pills `999px` ; cartes/inputs `12–16px` ; grandes surfaces `20–26px` ; device screen `38px`.
- Ombres : `--shadow-sm 0 4px 10px rgba(0,0,0,.04)`, `--shadow-md 0 6px 16px rgba(0,0,0,.05)`, `--shadow-lg 0 14px 32px rgba(0,0,0,.07)` ; modales `0 40px 90px rgba(0,0,0,.35)`.

### Espacement
Grille implicite 4px. Gaps courants : 7–14px (interne), 18–22px (sections), padding cartes 12–16px, padding modales 26–28px.

---

## Assets
- **Icônes : Lucide** (aucun emoji — règle projet). Icônes utilisées par la feature :
  `scan-barcode, camera, camera-off, settings, flashlight, flashlight-off, wifi, wifi-off, sparkles,
  shield-check, check, info, triangle-alert, package-search, package-plus, globe, image, users, search-x, pen-line`.
  Icônes catégories/rayons : `salad, beef, milk, wheat, wine, carrot, apple, drumstick, cookie` + lieux
  `refrigerator, snowflake, archive, shopping-basket`.
  Version Lucide utilisée dans les prototypes : `0.460.0`. En prod, utiliser le paquet d'icônes du codebase.
- **Image produit OFF** : `image_front_url` d'Open Food Facts, affichée en informatif (non modifiable). Placeholder dans les mocks.
- Aucune image bitmap propriétaire n'est requise pour la feature (le logo mascotte du header est existant).

---

## Files
Dans ce bundle :
- `Liste de Courses - Scan (Mobile).html` — maquette mobile complète (device 390×844).
- `Liste de Courses - Scan (Desktop).html` — maquette desktop complète (app 1440×900, thème clair + sombre).
- `scan-data.js` — module partagé : rayons, catalogue, catalogue étendu, table de mapping globale (`BARCODE_MAP`),
  mapping catégories OFF (`OFF_CATEGORY_MAP`), base OFF simulée (`OFF_DB`), produits du simulateur (`DEMO_SHELF`),
  et **`resolveScan()`** (logique cœur à porter en prod).

Pour tester : ouvrir un des HTML, cliquer « Scanner », accorder la caméra, puis toucher un produit du
simulateur (chaque produit indique le cas qu'il déclenche). Le toggle « En ligne / Hors ligne » permet de
tester le comportement hors-ligne.
