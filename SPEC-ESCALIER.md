# Spécification — Bloc « Escalier » du moteur Devis Facile

Document à coller dans Antigravity. Il décrit **quoi construire**, **où**, et **comment
vérifier**. Il remplace le bloc `escalier` actuel, qui demande un volume déjà calculé à la
main et estime l'acier par un ratio forfaitaire.

---

## 0. Ce qui existe déjà — à réutiliser, pas à réécrire

Avant d'écrire une ligne, lire ces quatre points. La moitié du travail est déjà faite
ailleurs dans le moteur et l'escalier doit s'y brancher, pas s'en écarter.

| Ce qui existe | Où | Ce que ça fait |
|---|---|---|
| `calculerBlocArmature()` | `packages/moteur/src/armature.js:44` | Prend `{diamètre, nuance, nombre de files, longueur développée, espacement}` et rend le nombre de **barres commerciales de 12 m**, le poids, la trace et les avertissements de chute. |
| `poidsAuMetre()` | `packages/moteur/src/armature.js:15` | Table `PARAMETRES.aciersPoidsLineique`, valeurs exactes du guide. |
| `extractionsArmatures.dalles` | `packages/moteur/src/metre.js:655` | Nappe croisée sur un rectangle. C'est le **modèle exact** du palier et de la paillasse. |
| `extractionsArmatures.semelles` | `packages/moteur/src/metre.js:386` | Même logique, avec crochets et cas carré. |

Bloc `escalier` actuel : définition en `packages/moteur/src/metre.js:153` (`requis: ['volume']`),
armatures en `metre.js:587` (ratio 100 kg/m³), coffrage par ratio 12 m²/m³ en `metre.js:334`,
rattachement au devis en `valorisation.js:49` et `:79`, résumé en `resume.js:183`.

### Les six règles non négociables

1. **Tout l'acier passe par `calculerBlocArmature()`.** Ne pas écrire un second calcul de
   poids dans le bloc escalier. Le moteur facture des **barres entières de 12 m**, pas du
   mètre linéaire net ; si l'escalier comptait en net, il ne serait pas comparable au reste
   du devis.
2. **Ne pas remplacer `poidsAuMetre()` par φ²/162.** La formule φ²/162 est juste
   (Ø12 → 0,8889 kg/m) mais la table du guide dit 0,880. La table fait foi partout dans le
   projet ; deux sources de vérité pour le même chiffre, c'est un bug qui arrive plus tard.
3. **Ne pas ajouter le recouvrement dans la longueur développée.** `calculerBlocArmature()`
   gère déjà les recouvrements quand une barre dépasse 11,5 m. L'ajouter à `Ld` le compte
   deux fois. La longueur développée ne contient que : géométrie − enrobages + crochets
   (+ ancrage dans l'appui).
4. **Ne pas inventer une nouvelle règle de comptage de files.** Le moteur utilise
   `ceil(dimension / espacement) + 1` partout (semelles, dalles). C'est légèrement
   sécuritaire. Garder la même formule pour l'escalier — la cohérence prime sur l'optimisation.
5. **Les pertes sur acier sont du régime « pièce » : `Q × (1 + P)`**, jamais `Q / (1 − P)`.
   Ce dernier est réservé aux consommables (ciment, sable, gravier, béton).
6. **Le logiciel ne choisit jamais un diamètre tout seul en silence.** Voir §7.

---

## 1. Niveau 1 — Géométrie

### Données saisies par volée

| Symbole | Champ | Unité | Sens |
|---|---|---|---|
| H | `hauteurAMonter` | m | Différence de niveau franchie par la volée |
| N | `nombreContremarches` | u | Nombre de contremarches |
| g | `giron` | m | Profondeur d'une marche |
| b | `largeur` | m | Emmarchement |
| e | `epaisseurPaillasse` | m | Épaisseur **mesurée perpendiculairement à la pente** |

### Formules

```
h  = H / N                    hauteur d'une marche
Ng = N - 1                    nombre de girons  (convention par défaut)
Lp = Ng × g                   projection horizontale
L  = √(H² + Lp²)              longueur inclinée de la paillasse
```

### Le point qui fait basculer tout le reste : N ou N − 1 ?

C'est l'ambiguïté centrale du document d'origine, et il faut la trancher, pas la contourner.

Une volée qui part d'un niveau et arrive sur un palier a **N contremarches et N − 1 girons** :
la dernière contremarche débouche sur le palier, qui tient lieu de dernière marche. C'est la
convention par défaut. Une volée qui se termine par une marche saillante en a N.

Donc : champ `convention` avec deux valeurs, `'arrivee_palier'` (défaut, `Ng = N - 1`) et
`'marche_terminale'` (`Ng = N`). Ce champ est affiché dans l'interface, pas caché dans le
code : un écart d'un giron sur une volée de 9 marches, c'est 12 % du volume des marches.

### L'épaisseur : perpendiculaire ou verticale ?

`V = b × e × L` n'est vrai que si **e est mesurée perpendiculairement à la pente**. Beaucoup
de plans cotent l'épaisseur verticalement. La conversion :

```
e_perpendiculaire = e_verticale × cos α = e_verticale × Lp / L
```

Étiqueter le champ « Épaisseur paillasse (⊥ à la pente) » et proposer un sélecteur
`typeEpaisseur: 'perpendiculaire' | 'verticale'`. Sur l'exemple du §8, confondre les deux
donne 0,488 m³ au lieu de 0,403 m³ : 21 % d'erreur sur le béton de la paillasse.

### Contrôles à émettre (avertissements, jamais des blocages)

| Contrôle | Seuil | Message |
|---|---|---|
| Règle de Blondel | `0,60 ≤ 2h + g ≤ 0,65` | « Escalier inconfortable : 2h + g = X m, hors de la plage 0,60–0,65 m. » |
| Hauteur de marche | `0,16 ≤ h ≤ 0,19` | « Hauteur de marche inhabituelle. » |
| Giron | `0,25 ≤ g ≤ 0,32` | « Giron inhabituel. » |
| Élancement | `e ≥ L / 30` | « Paillasse probablement trop mince pour sa portée — à faire vérifier. » |

Ce sont des avertissements. Un plan repris d'une cotation en pouces (marche de 6″ = 0,152 m,
giron de 10″ = 0,254 m) donne 2h + g = 0,558 m et déclenchera Blondel légitimement. On informe,
on n'empêche pas de saisir.

---

## 2. Niveau 2 — Béton

```
V_paillasse = b × e × L
V_marches   = ½ × g × h × b × Ng
V_volée     = V_paillasse + V_marches

V_palier    = L_palier × l_palier × e_palier
V_bloc      = L × l × e                    (massif, marche de départ, etc.)

V_escalier  = Σ V_volée,i + Σ V_palier,j + Σ V_bloc,k
```

La marche est un prisme triangulaire posé sur la paillasse : sa section est le triangle de
côtés g et h, d'où le facteur ½. Le nombre de marches est `Ng`, pas `N` — même convention
qu'au §1, une seule source.

Un escalier n'est donc **pas** une ligne de saisie mais un arbre : `escaliers[] → volées[] +
paliers[] + blocs[]`. Le total d'un escalier est la somme de ses enfants, et il n'y a pas de
limite au nombre de volées — 1, 2, 3 ou plus, c'est la même boucle.

---

## 3. Niveau 2 bis — Coffrage

Aujourd'hui : `volume × 12` m²/m³ (`metre.js:334`). Avec la géométrie réelle, on calcule :

```
S_sous_face     = b × L
S_joues         = 2 × e × L
S_contremarches = Ng × h × b
S_paillasse     = S_sous_face + S_joues + S_contremarches

S_palier        = L_palier × l_palier + 2 × (L_palier + l_palier) × e_palier
```

Le ratio de 12 m²/m³ reste en **repli** quand la géométrie n'est pas saisie, et en
**contrôle** : si le coffrage géométrique s'écarte de plus de 30 % du ratio, émettre un
avertissement plutôt que de choisir en silence.

---

## 4. Niveau 3 — Ferraillage

C'est ici que la remarque de départ est juste : **la paillasse et le palier sont des
rectangles, donc la logique des semelles et des dalles se transpose telle quelle**. Une
paillasse, c'est une dalle inclinée de dimensions `L × b`. Un palier, c'est une dalle de
dimensions `L_palier × l_palier`. Il n'y a rien de neuf à écrire pour le comptage.

### Le principe, en une ligne

> Des barres qui courent dans une direction se comptent sur la dimension **perpendiculaire**.

C'est la seule chose qui prête à confusion dans ce calcul. Les armatures principales suivent
la pente (longueur `L`) mais se comptent sur la largeur `b`. Les répartitions traversent la
largeur (longueur `b`) mais se comptent sur `L`.

### Les quatre lits de la paillasse

| Lit | Direction | Nombre de files | Longueur développée `Ld` | Défaut |
|---|---|---|---|---|
| Principales (inférieures) | pente | `ceil(b / s₁) + 1` | `L − 2·enrobage + 2·crochet` | Ø12 / 15 |
| Répartition (inférieure) | transversale | `ceil(L / s₂) + 1` | `b − 2·enrobage + 2·crochet` | Ø8 / 20 |
| Chapeaux sur appuis *(option)* | pente | `(ceil(b / s₃) + 1) × 2` | `L/5 + ancrage` | Ø10 / 15 |
| Répartition supérieure *(option)* | transversale | `ceil(2·L_chapeau / s₄) + 1` | `b − 2·enrobage + 2·crochet` | Ø8 / 20 |

Constantes déjà présentes : `PARAMETRES.armatures.enrobage` = 0,02 m et
`PARAMETRES.armatures.crochet` = 0,10 m.

### Le palier

Appel direct à la logique de `extractionsArmatures.dalles` : nappe croisée, `Ld = dimension −
2 × enrobage`, files `ceil(dimension_perpendiculaire / s) + 1`. Ne pas dupliquer le code —
extraire une fonction `nappeCroisee({longueur, largeur, diametre, espacement, nombre})` dans
`metre.js` et l'appeler depuis `dalles` **et** depuis `escalier`. Les tests existants de dalles
doivent continuer à passer à l'identique.

### Le poids

`calculerBlocArmature()` s'en charge. Pour mémoire, ce qu'il fait :

```
si Ld ≤ 11,5 :  pièces/barre = floor(11,5 / Ld)
                barres       = ceil(files / pièces_par_barre)
sinon        :  barres       = files + barres_de_raccord   (avec recouvrement)

poids = barres × 12 × poidsAuMetre(Ø)
```

Le poids rendu est donc un **poids acheté**, chutes comprises. Sur l'exemple du §8, les
principales pèsent 22,751 kg en linéaire net mais 31,680 kg en barres commerciales. L'écart est
la chute — c'est voulu, c'est ce qu'on paie. Si un poids net est affiché quelque part, il doit
être **étiqueté « net »** et ne jamais alimenter le devis.

### Le garde-fou qui rend le tout fiable

Après calcul, comparer le ratio obtenu au ratio historique de 100 kg/m³ :

```
ratio = poids_total / volume_beton_total
si ratio < 70 ou ratio > 130 → avertissement
```

Ce contrôle a de la valeur : sur l'exemple du §8, la nappe inférieure seule donne
**60 kg/m³**, sous le seuil — ce qui révèle correctement qu'on a oublié les chapeaux d'appui.
Avec chapeaux et répartition supérieure, on remonte à **86 kg/m³**, dans la plage. L'ancien
ratio forfaitaire ne devient donc pas inutile : il cesse d'être la méthode de calcul pour
devenir le contrôle de la méthode de calcul.

---

## 5. Modèle de données

```js
{
  id: 'esc-1',
  repere: 'ESC 1',
  niveauId: 'rdc',
  mode: 'geometrie',          // 'geometrie' | 'volume' (rétrocompatibilité)
  nombre: 1,                  // escaliers identiques

  volees: [{
    id: 'v1',
    hauteurAMonter: 1.53,
    nombreContremarches: 9,
    giron: 0.28,
    largeur: 1.20,
    epaisseurPaillasse: 0.15,
    typeEpaisseur: 'perpendiculaire',    // | 'verticale'
    convention: 'arrivee_palier',        // | 'marche_terminale'

    ferraillage: {
      principales:    { diametre: 12, espacement: 0.15 },
      repartition:    { diametre: 8,  espacement: 0.20 },
      chapeaux:       { actif: true, diametre: 10, espacement: 0.15, longueurAppui: null },
      repartitionSup: { actif: true, diametre: 8,  espacement: 0.20 }
    },
    overrides_prin: {}, overrides_rep: {}, overrides_chapeaux: {}
  }],

  paliers: [{
    id: 'p1', longueur: 1.20, largeur: 1.20, epaisseur: 0.15,
    ferraillage: { diametre: 10, espacement: 0.15 }
  }],

  blocs: [{ id: 'b1', designation: 'Massif de départ',
            longueur: 0.61, largeur: 0.91, epaisseur: 0.15 }]
}
```

`longueurAppui: null` ⇒ défaut `L/5 + 0,40 m` d'ancrage. Les `overrides_*` suivent la
convention déjà en place dans `calculerBlocArmature()` : `{ Ld, Ls, nombreDeFiles }`.

---

## 6. Où écrire le code

| Fichier | Intervention |
|---|---|
| `packages/moteur/src/metre.js:153` | Réécrire `BLOCS.escalier` : `requis` devient conditionnel au `mode`. `calcul` somme volées + paliers + blocs. Ajouter `calculCoffrage` (§3) pour sortir du repli par ratio de `metre.js:334`. |
| `packages/moteur/src/metre.js:587` | Réécrire `extractionsArmatures.escalier` : boucle sur volées et paliers, un `calculerBlocArmature()` par lit. Conserver la branche ratio si `mode === 'volume'`. |
| `packages/moteur/src/metre.js:655` | Extraire `nappeCroisee()` de `dalles`, la partager avec l'escalier. |
| `packages/moteur/src/regles.js:16` | Ajouter `acier.hypotheses.escalier = { diametrePrin: 12, espacement: 0.15, diametreRepartition: 8, espacementRepartition: 0.20, diametreChapeaux: 10, espacementChapeaux: 0.15 }` — le diametre des chapeaux est pose explicitement et **jamais herite des principales**, sans quoi ils sortent en Ø12 et alourdissent l escalier de 6,3 kg et l'exposer dans `acierHyp()` (`metre.js:696`). |
| `packages/moteur/src/resume.js:217` | Remplacer `e.volume × 12` par la surface de coffrage géométrique. |
| `packages/app/src/components/sections/Elevation.jsx` | Nouvelle `CarteBloc` « Escalier », sous-cartes volées / paliers / blocs, sur le modèle des colonnes (`Elevation.jsx:33`). |
| `packages/moteur/src/valorisation.js:49` | Rien à changer : `escalier → elevation / rdc` reste juste. |

Le dosage béton (350 kg/m³, `recettes.js:138`) et le rattachement au devis fonctionnent déjà.

---

## 7. Ce que ce bloc ne fait pas — et pourquoi c'est délibéré

Le métré des aciers se calcule **à partir** d'un diamètre et d'un espacement. Il ne les
détermine pas. Les déterminer suppose un calcul de structure :

```
M_Ed → A_s = M_Ed / (f_yd × z),  avec z ≈ 0,9 d → puis A_s ≥ A_s,min,
       puis vérifications d'espacement, d'ancrage, de recouvrement, d'effort tranchant, de flèche
```

qui dépend du règlement retenu (BAEL ou Eurocode 2 — à fixer, les valeurs diffèrent), des
charges d'exploitation, de la classe d'exposition et du type d'appui.

**Devis Facile est un logiciel de métré et de prix, pas une note de calcul.** Trois modes,
donc, dans cet ordre de priorité :

1. **Mode plan** *(défaut)* — l'utilisateur saisit Ø et l'espacement lus sur son plan
   d'exécution. Le moteur ne fait que du métré. C'est la position honnête.
2. **Mode ratio** — `kg/m³`, pour un chiffrage rapide en avant-projet. Affiché comme estimation.
3. **Mode pré-dimensionnement** *(plus tard, si jamais)* — le moteur propose Ø et espacement.
   Toute valeur ainsi produite est marquée **« hypothèse — à faire valider par un bureau
   d'études »**, en jaune, dans le devis comme à l'écran.

Un devis qui sort un ferraillage sans le dire engage la responsabilité de celui qui le signe.
Le code couleur du classeur v7 prévoit déjà le fond jaune pour « hypothèse à vérifier » :
c'est exactement cet usage.

---

## 8. Recette chiffrée

Ces valeurs ont été calculées avec le moteur réel (`armature.js`, `parametres.js`), pas à la
main. Elles doivent tomber au chiffre près.

**Entrées** — 1 volée : `H = 1,53 · N = 9 · g = 0,28 · b = 1,20 · e = 0,15 · convention =
arrivee_palier`. 1 palier : `1,20 × 1,20 × 0,15`.

### Géométrie

| Grandeur | Attendu |
|---|---|
| h | 0,17 m |
| Ng | 8 |
| Lp | 2,24 m |
| L | 2,712656 m |
| Blondel 2h + g | 0,62 m — conforme, aucun avertissement |

### Béton

| Grandeur | Attendu |
|---|---|
| V_paillasse | 0,4883 m³ |
| V_marches | 0,2285 m³ |
| V_volée | 0,7168 m³ |
| V_palier | 0,2160 m³ |
| **V_total** | **0,9328 m³** |

### Ferraillage — nappe inférieure seule

| Lit | Files | Ld (m) | Barres 12 m | Poids |
|---|---|---|---|---|
| Principales Ø12/15 | 9 | 2,872656 | 3 | 31,680 kg |
| Répartition Ø8/20 | 15 | 1,360000 | 2 | 9,480 kg |
| Palier nappe sens L Ø10/15 | 9 | 1,160000 | 1 | 7,404 kg |
| Palier nappe sens l Ø10/15 | 9 | 1,160000 | 1 | 7,404 kg |
| **Total** | | | | **55,968 kg** |

Ratio : **60,0 kg/m³** → l'avertissement du §4 doit se déclencher (seuil bas 70).

### Ferraillage — avec chapeaux

`L_chapeau = L/5 + 0,40 = 0,9425 m`

| Lit | Files | Ld (m) | Barres 12 m | Poids |
|---|---|---|---|---|
| Chapeaux Ø10/15, 2 appuis | 18 | 0,9425 | 2 | 14,808 kg |
| Répartition sup. Ø8/20 | 11 | 1,3600 | 2 | 9,480 kg |
| **Total escalier** | | | | **80,256 kg** |

Ratio : **86,0 kg/m³** → aucun avertissement.

### Contrôles unitaires à écrire

- `poidsAuMetre(12) === 0.880` — et non 0,8889. Verrouille la règle n° 2.
- Poids net des principales = `9 × 2,872656 × 0,880 = 22,751 kg` ≠ 31,680 kg facturés.
  Verrouille la règle n° 1 : le devis compte des barres, pas des mètres.
- `convention: 'marche_terminale'` sur les mêmes entrées ⇒ `Ng = 9`, `Lp = 2,52`,
  `V_marches = 0,2570 m³`. Verrouille le §1.
- `typeEpaisseur: 'verticale'` avec `e = 0,15` ⇒ `e⊥ = 0,15 × 2,24 / 2,712656 = 0,1239 m`,
  `V_paillasse = 0,4032 m³`. Verrouille la conversion de pente.
- **Non-régression** : le cas `{ volume: 3.5, nombre: 1 }` de
  `packages/moteur/test/elevation.test.js:75` doit continuer à rendre 3,5 m³ et 350 kg d'acier
  par le ratio. Le mode `volume` ne disparaît pas.

---

## 9. Ordre de travail conseillé

1. Géométrie pure + tests (§1, §8) — aucune dépendance, tout est vérifiable immédiatement.
2. Volumes béton + tests (§2).
3. Extraction de `nappeCroisee()` depuis `dalles`, tests de dalles inchangés (§4).
4. Ferraillage escalier branché sur `calculerBlocArmature()` + tests (§4, §8).
5. Coffrage géométrique et contrôle contre le ratio (§3).
6. Interface (§6), en dernier — le moteur doit être vert avant.

Chaque correction porte un test nommé. C'est la règle du projet.
