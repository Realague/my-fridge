# Handoff : Statistiques du foyer — variante "Chiffre dominant"

## Overview
Nouvelle fonctionnalité MyFridge : des statistiques d'usage du foyer (anti-gaspillage, cuisine, contribution du foyer), en lecture seule, phase 1 (pas d'estimation €/CO₂, pas de gamification, pas de classement entre membres). Deux points d'entrée :
1. Deux cartes résumé sur le tableau de bord (Anti-gaspi + En cuisine).
2. Une page détail complète, organisée en 3 blocs (Anti-gaspillage, Cuisine, Foyer), avec sélecteur de période.

**Scope de ce handoff : uniquement la variante "A — Chiffre dominant"** des cartes du tableau de bord (le gros chiffre + sparkline). Le fichier source contient aussi une variante "B — Jauge" (anneau de progression) construite pour comparaison en atelier de design — elle n'est **pas** dans le scope de cette implémentation ; ignorez les branches `isVariantB` / `variant === "B"` du fichier joint.

## About the Design Files
Le fichier `Statistiques Foyer.dc.html` est un **prototype de référence visuelle**, pas du code à copier tel quel. Il a été produit par un outil de maquettage interne : sa syntaxe (`{{ variable }}`, balises `<sc-if>`/`<sc-for>`, `<x-import>`) est un langage de gabarit propre à cet outil, pas un framework — lisez-le comme du pseudo-code qui documente précisément la structure, les conditions d'affichage et les valeurs calculées.

**À faire** : recréer ce design dans l'environnement réel du produit MyFridge (son stack front actuel — a priori React, à confirmer côté codebase) en utilisant les **vrais composants du design system `myfridge`** (le package npm réel, celui-là même dont ce prototype consomme les tokens CSS) plutôt que de réimplémenter des `<div>` stylées à la main. Le prototype lui-même a délibérément gardé certains éléments de chrome (barre de navigation mobile, sidebar desktop) en HTML/SVG fait main plutôt que de monter les vrais composants `BottomNavigation`/`Sidebar*` du design system — car ceux-ci dépendent du routeur et des stores applicatifs réels (`useNavigate`, auth/household stores), absents d'un mockup statique. **Dans l'app réelle, utilisez la coquille de navigation déjà en place** (elle est déjà branchée au routeur) plutôt que de reproduire le HTML de chrome de ce prototype — seul le contenu "Statistiques" à l'intérieur est nouveau.

## Fidelity
**High-fidelity.** Couleurs, typographie, rayons, espacements et classes du design system sont exacts (voir Design Tokens). Deux exceptions explicites :
- Le mascot "Chef" (image d'accompagnement sur les états vide/récent/équipe) est un **placeholder** (`<image-slot>`) — l'asset réel n'a pas été fourni ; un développeur doit brancher la vraie image du personnage à ces emplacements.
- Le chrome de navigation (bottom nav mobile, sidebar desktop) est une reconstitution simplifiée à but de mockup — ne pas le recréer, cf. section précédente.

## Screens / Views

### 1. Dashboard — carte "Anti-gaspi" (Variante A)
**Purpose** : donner en un coup d'œil le taux d'utilisation du mois et permettre d'accéder au détail.
**Layout** : carte pleine largeur (mobile) / moitié gauche d'une grille 2 colonnes (desktop, `grid-template-columns: minmax(0,1fr) minmax(0,1fr)`, gap 16px). Padding 16-20px, radius `--mf-radius-xl` (24px), fond `--mf-night-surface`, bordure 1px `--mf-night-line`, ombre légère (`0 1px 2px rgba(20,15,5,.05)`). Toute la carte est cliquable (`<button>` plein format) → navigue vers le détail, bloc "Anti-gaspillage".
**Components** :
- Eyebrow (label) : "Anti-gaspi — {mois}" — DM Sans 700, uppercase, tracking large, couleur `--mf-text-mute`, avec un chevron `›` aligné à droite.
- Chiffre dominant : `{taux}%` — DM Sans 700, 46px mobile / 56px desktop, `letter-spacing:-.03em`, couleur `--mf-green-deep`. Le "%" est affiché à 22px/26px.
- Badge de tendance (si période avec historique) : pill `.mf-badge` + `.mf-badge-green` (positif) ou `.mf-badge-danger` (négatif), texte "↑ +4 pts vs juin" / "↓ -2 pts vs …". Masqué si pas de comparaison possible (foyer neuf, ou période "Année en cours").
- Sparkline SVG (104×40, aire dégradée + ligne + point final) sur les 6 derniers points de la série "taux d'utilisation".
- Ligne de légende : "Taux d'utilisation · {consommés} articles consommés, {jetés} jetés".
**Content (données fixes affichées sur le tableau de bord — toujours le mois en cours, indépendamment du sélecteur de période de la page détail)** : voir Design Tokens/Data ci-dessous, jeu "mois" (juillet).

### 2. Dashboard — carte "En cuisine" (Variante A)
Même structure que la carte Anti-gaspi, en rose (`--mf-pink-deep`/`--mf-pink`/`--mf-pink-soft`) : chiffre dominant = `{cuisinées}` recettes, légende "Recettes cuisinées · {différentes} recettes différentes essayées", clique → détail, bloc "Cuisine".

### 3. Page détail — en-tête + sélecteurs
**Layout** : bandeau sticky en haut du contenu scrollable. Titre "Statistiques du foyer" (H2, DM Sans 700, 27px) + sous-titre eyebrow = la plage de dates de la période choisie (ex. "1 – 24 juillet 2026"). Bouton retour (chevron gauche, cercle 36px bordé) → dashboard.
**Sélecteur de période** : `.mf-toggle-group`/`.mf-toggle-opt`, 4 options : "Mois en cours", "Mois précédent", "3 derniers mois", "Année en cours". Change la période recalcule TOUTES les figures de la page détail (mais pas les cartes dashboard, qui restent fixées au mois en cours).
**Navigation de bloc** : 3 onglets/pills "Anti-gaspi" / "Cuisine" / "Foyer" (mêmes classes toggle). Sur desktop, cliquer un onglet fait défiler en douceur (scroll `offsetTop - 10`) vers la section correspondante dans une colonne unique qui contient les 3 blocs empilés ; sur mobile, chaque onglet affiche un seul bloc à la fois (pas de scroll, un seul bloc monté).

### 4. Page détail — Bloc "Anti-gaspillage"
**Components** (grille 4 colonnes desktop `repeat(4, minmax(0,1fr))` / 2 colonnes mobile) :
- Carte "Taux d'utilisation" (pleine largeur du haut) : chiffre 32px vert + badge de tendance.
- Carte "Articles consommés" : chiffre 32px, couleur texte normale.
- Carte "Articles jetés" : chiffre 32px, couleur `--mf-danger`.
- Carte "Sauvés in extremis" (fond `--mf-green-soft`) : chiffre + légende "Consommés dans les 2 jours avant péremption".
- Graphique de tendance (aire + ligne + points, 7 mois, masqué si la période n'a pas d'historique) : "Évolution du taux d'utilisation".
- Barres horizontales "Ce que tu jettes le plus" (top 5 catégories jetées, couleur par catégorie) avec phrase d'insight : "Les {catégorie} arrivent en tête ce mois-ci — {n} articles partis à la poubelle."
- Barres horizontales "Temps moyen de conservation" (6 catégories, en jours, couleur `--mf-info`) avec insight : "Tes yaourts tiennent en moyenne 12 jours dans ton frigo."

### 5. Page détail — Bloc "Cuisine"
Même schéma de grille : "Recettes cuisinées" (rose, + tendance), "Recettes différentes", "Meal plan réalisé" (barre de progression %, rose), "Portions batch cooking". Puis carte "Recette fétiche" (fond `--mf-pink-soft`, icône cœur, nom de la recette + nombre de fois cuisinée sur 3 mois) et barres "Top 3 des catégories cuisinées" (rang, nom, barre verte, compte).

### 6. Page détail — Bloc "Foyer"
Contribution par membre, jamais classée/comparée (texte de disclaimer explicite en bas : "Ces chiffres décrivent la contribution de chacun. Ils ne sont ni classés, ni comparés — juste additionnés."). 3 anneaux de répartition (SVG donut, un par membre, couleur par membre) : "Ajouts au stock", "Cuissons", "Courses cochées", chaque anneau avec total au centre (overlay HTML, pas texte SVG) + légende couleur/nom/valeur. En dessous, deux barres de répartition empilées horizontales (cuissons, courses) avec légende inline.
**Cas "foyer solo"** (1 seul membre) : les 3 anneaux sont remplacés par un simple paragraphe + 3 chiffres ("Ajouts au stock" / "Recettes cuisinées" / "Courses cochées"), pas de comparaison entre membres puisqu'il n'y en a qu'un.
**Nudge "esprit d'équipe"** (bandeau vert clair + mascotte) : apparaît uniquement si un membre dépasse 55% des ajouts au stock sur la période ET qu'il y a plusieurs membres — texte : "C'est sympa de faire équipe, pensez à impliquer les autres membres du foyer !"

## États particuliers du foyer
- **Vide** (aucune donnée) : la page détail affiche un état vide centré (mascotte + titre "Rien à se mettre sous la dent" + CTA "Ajouter un article"), aucune figure affichée.
- **Récent** (< 2 semaines d'historique) : bandeau mascotte "Ton foyer a 9 jours. Reviens dans quelques semaines pour voir tes tendances évoluer !" ; toutes les comparaisons de tendance (badges, delta) sont masquées faute d'historique ; le jeu de données est un sous-ensemble réduit (14 consommés, 2 jetés, etc. au lieu des chiffres "mois" nominaux).
- **Solo** : voir bloc Foyer ci-dessus ; les séries multi-membres (ajouts/cuissons/courses par membre) sont réduites à une seule valeur agrégée.

## Interactions & Behavior
- Clic carte dashboard → page détail, bloc correspondant actif (état `anchor`).
- Clic bouton retour → dashboard.
- Changement de période → recalcule uniquement les données de la page détail (4 jeux de données pré-calculés : mois en cours, mois précédent, 3 derniers mois, année en cours — voir Data ci-dessous).
- Changement d'onglet de bloc (mobile : bascule d'affichage ; desktop : scroll animé vers la section).
- Toutes les cartes/lignes ont un léger fade-in + translateY à l'apparition (`@keyframes mfRise`, 0.45–0.55s ease).
- Pas de formulaire, pas de validation, pas d'états de chargement/erreur dans ce prototype (données mockées synchrones) — à prévoir côté implémentation réelle (skeleton pendant le fetch, état d'erreur réseau).

## State Management
Quatre variables d'état suffisent à piloter tout l'écran :
- `screen`: `"dashboard" | "detail"`
- `period`: `"mois" | "prec" | "trois" | "annee"` (page détail uniquement — les cartes dashboard sont toujours figées sur "mois")
- `anchor`: `"gaspi" | "cuisine" | "foyer"` (bloc actif de la page détail)
- `household` (variable de démonstration du prototype, pas un vrai état produit) : `"nominal" | "recent" | "vide" | "solo"` — dans l'app réelle, ceci vient du statut réel du foyer côté API (ancienneté, nombre de membres, présence de données), pas d'un toggle utilisateur.

## Design Tokens
Palette claire (thème par défaut) — variables CSS du design system `myfridge`, valeurs hex exactes :

**Surfaces** : `--mf-night: #F4E8C9` (fond page) · `--mf-night-surface: #FBF4E0` (cartes) · `--mf-night-elevated: #ECE0BF` · `--mf-night-line: #ECE4D2` (bordures/séparateurs)
**Texte** : `--mf-text: #1A1D1A` · `--mf-text-soft: #5E6760` · `--mf-text-mute: #9BA59F`
**Vert (accent primaire, anti-gaspi)** : `--mf-green: #2BB673` · `--mf-green-deep: #1F9C5E` · `--mf-green-soft: #D6F3E3`
**Rose (cuisine)** : `--mf-pink: #FF6F9C` · `--mf-pink-deep: #D04475` · `--mf-pink-soft: #FFD9E6`
**Danger (jeté)** : `--mf-danger: #EF4A5A` · `--mf-danger-soft: #FFD9DE`
**Info (bleu, temps de conservation)** : `--mf-info: #4F8EF5` · `--mf-info-soft: #DAE9FF`
**Jaune (mascotte/nudges)** : `--mf-yellow-soft` (bandeaux d'information)

**Typographie** : DM Sans 700 (titres, chiffres, eyebrows) — `--mf-font-display` ; Inter 400/500/600 (texte courant) ; JetBrains Mono (barre d'adresse du cadre navigateur du mockup uniquement, non pertinent en prod).
**Rayons** : `--mf-radius-lg: 18px` (petites cartes) · `--mf-radius-xl: 24px` (cartes principales) · `--mf-radius-pill: 999px` (badges, boutons, toggles).
**Classes composants** (charte, définies dans `_ds_bundle.css`) : `.mf-badge` + `.mf-badge-green`/`.mf-badge-danger` (tendances), `.mf-eyebrow` (labels), `.mf-toggle-group`/`.mf-toggle-opt` (sélecteurs période/bloc/écran), `.mf-btn`/`.mf-btn-primary` (CTA état vide).

## Data (structure attendue de l'API)
Pour chaque période (`mois`, `prec`, `trois`, `annee`), la page détail consomme un objet :
```
{
  month, consommes, jetes, sauves, taux, tauxDelta, ref,   // Anti-gaspillage
  waste: [[catégorie, compte, couleur], …],                 // top 5 jetés
  keep: [[catégorie, jours], …],                             // 6 catégories, temps de conservation moyen
  cuisinees, differentes, mealPlan, batch, cuisineesDelta,   // Cuisine
  topCats: [[catégorie, compte], …],                         // top 3 cuisinées
  ajouts: [par membre], cuissons: [par membre], courses: [par membre]  // Foyer, un nombre par membre du foyer
}
```
Le tableau de bord consomme toujours le jeu `mois` (jamais la période sélectionnée dans le détail). `tauxDelta`/`cuisineesDelta` sont `null` quand aucune comparaison n'est possible (période "Année en cours", ou foyer < 2 semaines) → masquer les badges de tendance dans ce cas.
Exemple (jeu "mois", juillet 2026) : `consommes: 118, jetes: 19, sauves: 12, taux: 86, tauxDelta: +4 (vs juin)`, `cuisinees: 23, differentes: 14, mealPlan: 78%, batch: 9, cuisineesDelta: +4`.

## Assets
- Mascotte "Chef" (placeholder `<image-slot>`, cercle 68px) : apparaît sur l'état vide, l'état "foyer récent" et le nudge "esprit d'équipe". **Asset réel à fournir par l'équipe produit/design.**
- `ActivityEntry` : composant du design system `myfridge` déjà utilisé ailleurs dans l'app (section "Activité récente" du tableau de bord, inchangée par cette feature) — le réutiliser tel quel, pas de nouveau composant nécessaire.
- Toutes les icônes sont des traits SVG inline (Lucide-style, `stroke-width` 2–2.4, `stroke-linecap/linejoin: round`) — cohérentes avec le reste de l'app.

## Files
- `Statistiques Foyer.dc.html` — prototype complet (mobile + desktop, variantes A/B, 4 états de foyer, 4 périodes). **Implémenter uniquement les chemins "Variante A".**
