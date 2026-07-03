# Ticket — Ajouter la page « Journal des sorties » (stock)

> **Type** : Feature · **Priorité** : Medium · **Portée** : Desktop + Mobile
> **Dépend de** : feature *Sorties de stock* (voir `design_handoff_sorties_stock/`) — réutilise son modèle de données et ses tokens.

---

## 1. Contexte & objectif

La feature *Sorties de stock* écrit déjà une **entrée de journal** (`StockExitLog`) horodatée et attribuée à chaque fois qu'un article est marqué `Consommé` / `Jeté` / `Retiré`. Ces entrées ne sont **affichées nulle part** aujourd'hui.

Ce ticket ajoute la **page Journal des sorties** : l'historique consultable de toutes les sorties de stock, avec le **résumé anti-gaspi du mois** (le cœur métier : ratio consommé vs jeté).

**Point d'entrée existant** : sur la liste de stock desktop, le bouton `Journal des sorties` (icône Lucide `history`) est déjà présent dans l'en-tête de page — il doit désormais router vers cette page. Sur mobile, ajouter un accès depuis la barre de navigation de l'écran Stock (bouton `sliders-horizontal` / entrée « Plus »).

## 2. À propos des fichiers de design

Les fichiers de ce dossier sont des **références de design en HTML/CSS/JS vanilla** — des prototypes qui montrent l'apparence et le comportement attendus, **pas du code de production à copier tel quel**. La tâche est de **recréer ces écrans dans l'environnement existant de l'app Fresh / MonFrigo** (React / React Native / Vue / SwiftUI…) avec ses composants, ses patterns d'état et sa librairie d'icônes déjà en place.

Règles projet à respecter :
- **Aucun emoji** dans l'UI → **icônes Lucide** exclusivement.
- Réutiliser les **tokens de couleur et la typo de la charte Fresh** déjà dans le codebase (les hex ci-dessous sont des valeurs de référence/fallback).

## 3. Fidélité

**Haute fidélité (hifi).** Couleurs, typo, espacements, rayons et interactions sont finaux. Recréer au pixel près avec les composants du codebase. Libertés attendues : adaptation aux conventions du code (nommage, structure de composants, gestion d'état, routing).

---

## 4. Modèle de données

Aucun nouveau type n'est requis : la page **lit** le `StockExitLog[]` déjà produit par la feature Sorties de stock.

```ts
type StockExitLog = {
  itemId: string;
  qty: number;                              // quantité sortie
  action: 'consumed' | 'wasted' | 'removed';
  user: string;                             // "vous", "Sarah", "Léa"…
  at: string;                               // ISO timestamp
  // Champs dénormalisés utiles à l'affichage du journal (à joindre depuis l'item
  // au moment de l'écriture du log, ou à résoudre à la lecture) :
  name: string;                             // "Yaourts nature"
  unit: string;                             // "yaourts", "portion"…
  category: { label: string; icon: LucideIcon; colorKey: string };
  storage: string;                          // "Réfrigérateur", "Garde-manger"…
  note?: string;                            // motif libre : "Moisi", "Donné à un voisin"…
};
```

> **Recommandation** : dénormaliser `name` / `unit` / `category` / `storage` dans le log à l'écriture, pour que le journal reste juste même si l'article est supprimé du stock ensuite.

### Les 3 actions (rappel, identiques à Sorties de stock)
| Code | Libellé FR | Sens | Icône Lucide | Couleur |
|---|---|---|---|---|
| `consumed` | Consommé | Mangé, cuisiné, utilisé | `utensils` | vert |
| `wasted` | Jeté | Périmé, avarié, plus envie | `trash-2` | rouge |
| `removed` | Retiré | Donné, transféré, erreur de saisie | `package-x` | gris (neutre) |

### Agrégats du mois (`MonthStats`)
```ts
type MonthStats = { consumed: number; wasted: number; removed: number };
// Taux anti-gaspi = round( consumed / (consumed + wasted) * 100 )   // removed EXCLU
```
Le taux **exclut** `removed` (sortie neutre, ni consommée ni gaspillée).

---

## 5. Écrans / Vues

### 5.1 Journal — DESKTOP (`Journal des sorties (desktop).html` + `journal-sorties.js`)

**Chrome** : réutilise à l'identique le shell desktop de Sorties de stock — `.screen` 1440 px large, grid `256px 1fr`, sidebar (item « Mes produits » actif), topbar. Fil d'ariane : `Mes produits › Réfrigérateur › Journal des sorties`.

**En-tête de page** :
- `h1` (DM Sans 30/700, letter-spacing -0.025em) avec pastille icône `history` (38×38, radius 12, fond `--green-soft`, couleur `--green-deep`) + titre « Journal des sorties ».
- Sous-titre `--ink-2` 14 px : « N sorties · juin–juillet · Maison Dubois ».
- Actions à droite : boutons ghost `Filtres` (`sliders-horizontal`) et `Exporter` (`download`).

**Bandeau de stats** (`grid-template-columns: repeat(3,1fr) 1.4fr; gap 14px`) — 4 cartes (radius 18, bordure `--rule`, fond `--card`, `padding 18px 20px`, `--shadow-sm`) :
1. **Consommés** — pastille icône 40×40 radius 12 `--green-soft`/`--green-deep`, grand nombre DM Sans 34/800, label 13/700 `--ink-2`, delta « +8 vs mai » (`trending-up`, `--green-deep`).
2. **Jetés** — pastille `--red-soft`/`--red`, delta « −3 vs mai » (`trending-down`).
3. **Retirés** — pastille `--sub`/`--ink-2`, mention « Sortie neutre » `--ink-3`.
4. **Taux anti-gaspi** (carte accent) — fond `linear-gradient(150deg,#e4f6ec 0%, --card 72%)`, bordure `#b9e6cd`. Grand `87%` (DM Sans 40/800, `%` en 22px, `--green-deep`), badge `leaf` 40×40 fond `--green`. **Barre empilée** (hauteur 10, radius 999) : fond `--red`, segment `--green` de largeur `consumed%`. Légende : `● 41 consommés` (vert) · `● 6 jetés` (rouge).

**Barre d'outils** (`.toolbar`, flex, margin-bottom 18) :
- **Filtres par action** (gauche) : pills `Tout / Consommé / Jeté / Retiré`, chacune avec un compteur. Repos : fond `--card`, `--shadow-sm`, texte `--ink-2`, compteur sur fond `--sub`. Actif : `Tout`→fond `--ink`, `Consommé`→`--green`, `Jeté`→`--red`, `Retiré`→`--ink-2`, texte `--bg`, compteur `rgba(255,255,255,.18)`.
- À droite : selects factices `Membre : Tous` (`users`) et `Ce mois-ci` (`calendar`), style `.select-pill`.

**Timeline groupée par jour** :
- **En-tête de jour** (`.day-head`, margin `22px 4px 12px`) : libellé (DM Sans 15/800, ex. « Aujourd'hui »), date `--ink-3` 12.5/600 (« mercredi 2 juillet »), et à droite un résumé `--ink-3` 12/600 (« 3 sorties · 2 consommés · 1 jeté »).
- **Ligne d'entrée** (`.entry`) : `grid-template-columns: 52px minmax(0,1fr) 150px 120px 132px; gap 16; align-items center`. Fond `--card`, bordure `--rule`, radius 15, `padding 12px 18px`, `margin-bottom 9`. **Barre d'accent verticale** à gauche (`::before`, largeur 3, radius 999) colorée par action : vert / rouge / `--ink-3`. Hover : `--shadow-md` + bordure `#ddd2b8`.
  - **col 1** — thumbnail 52×52 radius 14, fond teinté catégorie, icône Lucide catégorie colorée.
  - **col 2** — nom (DM Sans 16/700) ; ligne meta (margin-top 6, gap 10) : chip catégorie `.badge-soft-*` (icône + label), stockage (`--ink-3` 12/600 avec icône `refrigerator`/`archive`/`snowflake`), et **note** optionnelle en italique (icône `corner-down-right` + texte, ex. « Moisi »).
  - **col 3** — **badge d'action** : pill `padding 7px 13px` radius 999, DM Sans 12.5/700, icône + libellé. `consumed`→`--green-soft`/`--green-deep`, `wasted`→`--red-soft`/`#b0323f`, `removed`→`--sub`/`--ink-2`.
  - **col 4** — quantité (DM Sans 16/800, unité 12/600 `--ink-3`), alignée à droite. Ex. « 2 yaourts ».
  - **col 5** — membre (avatar rond 26×26 avec initiales + prénom DM Sans 13/700) et, en dessous, heure (`clock` + `HH:MM`, `--ink-3` 11.5/600), aligné à droite.
- **État vide** (filtre sans résultat) : icône `inbox` + « Aucune sortie de ce type sur la période. » centré, `--ink-3`.
- **Pied** : note `--ink-3` centrée « Les sorties de plus de 30 jours sont archivées automatiquement » (icône `lock`).

### 5.2 Journal — MOBILE (`Journal des sorties (mobile).html` + `journal-sorties-mobile.js`)

**Chrome** : réutilise le shell mobile de Sorties de stock — iPhone 390×844, bezel, status bar 50px, fond `--bg` crème (#fdf8ed), tab bar 5 onglets (Stock actif). **Thème clair/sombre** géré (toggle + `data-theme`, persistance `localStorage`), tokens dark fournis dans le fichier.

- **Nav bar** : retour (`chevron-left`), titre « Journal des sorties » (icône `history` verte, DM Sans 19/700), sous-titre « N sorties · ce mois-ci », bouton `sliders-horizontal`.
- **Hero anti-gaspi** (`.ag-card`) : même carte accent verte qu'en desktop, en pleine largeur — label « Taux anti-gaspi · ce mois-ci », grand `87%`, barre empilée consommé/jeté, légende. Badge `leaf`.
- **Mini-stats** (`.mini-stats`, grid 3 colonnes, gap 8) : 3 cartes compactes (icône + nombre DM Sans 17/800 + label 10/600) — Consommés (vert), Jetés (rouge), Retirés (gris).
- **Chips de filtre** (`#chips`, scroll horizontal) : `Tout / Consommé / Jeté / Retiré` avec compteur ; états actifs colorés comme en desktop (`--ink` / `--green` / `--red` / `--ink-2`).
- **Timeline par jour** :
  - En-tête jour (`.jm-day`) : libellé DM Sans 14/800 + date courte (« mer. 2 juil. ») + compteur à droite.
  - **Carte d'entrée** (`.jm-entry`, flex, radius 16, bordure `--rule`, `padding 12px 13px 12px 15px`) avec barre d'accent verticale gauche (`::before`, couleur par action). Thumb 46×46 radius 13 ; milieu : nom (DM Sans 14.5/700), ligne (badge d'action + quantité `--ink-2` 12/700), pied (avatar 19×19 + prénom · stockage · note italique, `--ink-3` 11/600) ; heure DM Sans 12/700 `--ink-3` alignée à droite.
  - État vide identique (icône `inbox`).

---

## 6. Interactions & comportement

| Élément | Comportement |
|---|---|
| **Filtre par action** (desktop pills / mobile chips) | Filtre la timeline sur `action === filtre` (ou tout). Re-render immédiat ; les en-têtes de jour sans entrée sont masqués ; compteurs figés sur le total (pas recalculés par le filtre courant). |
| **Point d'entrée desktop** | Le bouton `Journal des sorties` de la liste de stock route vers cette page. |
| **Retour mobile** | `chevron-left` → retour à la liste de stock. |
| **Toggle thème (mobile)** | Bascule `data-theme` clair/sombre, persistant en `localStorage`. |
| **Filtres / Membre / Période / Exporter** | Boutons présents dans la maquette mais **non câblés** — au choix de l'implémenteur (panneau de filtres, sélecteur de période réel, export CSV/PDF). À traiter en tickets de suivi si besoin. |

**Regroupement & tri** : entrées triées par `at` décroissant, groupées par jour calendaire ; libellés relatifs « Aujourd'hui » / « Hier » puis date. Résumé de jour = nombre de sorties + décompte consommé/jeté.

---

## 7. State management

- `logs: StockExitLog[]` — source de vérité (lecture ; persistée côté backend par la feature Sorties de stock).
- `monthStats: MonthStats` — agrégats du mois courant (calculés côté serveur ou dérivés des logs).
- `filter: 'all' | 'consumed' | 'wasted' | 'removed'` — état UI local.
- (Extensions futures) `memberFilter`, `periodFilter`.

Sélecteurs dérivés : `counts()` (total par action), regroupement par jour, taux anti-gaspi. Un changement de `filter` re-render la timeline uniquement.

---

## 8. Design tokens (charte Fresh — référence)

> Réutiliser les tokens du codebase. Valeurs de référence :

**Couleurs**
- Desktop : `--bg #f4e8c9`, `--card #fbf4e0`, `--sub #ece0bf`, fond page `#e8e0cf`.
- Mobile : `--bg #fdf8ed`, `--card #ffffff`, `--sub #f6efde`.
- Encre : `--ink #1a1d1a`, `--ink-2 #5e6760`, `--ink-3 #9ba59f`, `--rule #ece4d2`.
- Vert : `--green #2bb673`, `--green-soft #d6f3e3`, `--green-deep #1f9c5e`.
- Rouge : `--red #ef4a5a`, `--red-soft #ffd9de` (texte badge foncé `#b0323f`).
- Orange `#ff7a3a`/soft `#ffe0cc` · Jaune `#ffc839`/soft `#fff1c4` · Bleu `#4f8ef5`/soft `#dae9ff` · Violet `#8c6df0`/soft `#e4dafa` · Rose `#ff6f9c`/soft `#ffd9e6`.
- Accent anti-gaspi : dégradé `#e4f6ec → --card`, bordure `#b9e6cd`.

**Typographie** : Display **DM Sans** (400–800) ; Body **Inter** (400–700). Échelle : h1 30 · stat 34/40 · nom d'entrée desktop 16 / mobile 14.5 · badges 11–12.5 · meta 11–12.

**Rayons** : cartes stat 18 · entrées 15–16 · thumbnails 13–14 · pills 999 · avatars 50%.
**Ombres** : `--shadow-sm 0 4px 10px rgba(0,0,0,.04)`, `--shadow-md 0 6px 16px rgba(0,0,0,.05)`.

**Icônes** (Lucide) : `history`, `utensils`, `trash-2`, `package-x`, `leaf`, `trending-up`, `trending-down`, `clock`, `corner-down-right`, `sliders-horizontal`, `download`, `users`, `calendar`, `inbox`, `lock`, `refrigerator`, `archive`, `snowflake` ; catégories : `milk`, `apple`, `banana`, `salad`, `wheat`, `egg`, `drumstick`, `soup`, `cooking-pot`, `cup-soda`, `fish`, `utensils-crossed`.

## 9. Assets
- `mascot/chef-happy.png` — logo de marque dans la sidebar desktop (déjà présent dans le codebase).
- Icônes : package **Lucide** déjà intégré (CDN `lucide@0.460.0` dans les prototypes).
- Polices : DM Sans + Inter du design system en place.

## 10. Fichiers de référence (dans ce dossier)
- `Journal des sorties (desktop).html` + `journal-sorties.js` — prototype desktop complet (données de démo, render, filtres).
- `Journal des sorties (mobile).html` + `journal-sorties-mobile.js` — prototype mobile complet (thème, hero, chips, timeline).
- `mascot/chef-happy.png` — asset marque.

> La logique de rendu et de filtrage est dans les deux `.js` — s'en inspirer pour la couche présentation, indépendamment du framework cible. Voir aussi `design_handoff_sorties_stock/` pour la feature amont (écriture des logs, tokens partagés).
