# Prompts de vérification — Cours de Métré et Devis

Source : `Cours_Metre_et_Devis_1.docx` (à la racine du dépôt), **recoupé avec le
classeur de référence `DEVIS_FACILE_BTP-7(1).xlsx` (v7)** — j'ai dumpé les feuilles
Fondation, Elevation, Dalle, Charpente_Couverture, Finition et Parametres du v7 pour
trancher chaque écart entre le cours et le code. Le v7 prime sur le cours partout où
ils divergent (règle du projet). Résultat : plusieurs points que le cours seul laissait
penser cassés se sont révélés **exacts** une fois comparés au v7 — c'est marqué partout
ci-dessous.

**Mode d'emploi** : colle le NIVEAU 0 en premier (transversal — sans lui, les
corrections des niveaux 1 à 5 resteront invisibles sur la page Note de Calcul), puis
un seul niveau à la fois. Laisse Antigravity vérifier et corriger, lis son rapport,
passe au suivant.

Étiquettes :
- **[BUG CONFIRMÉ]** — écart vérifié contre le v7 lui-même, pas seulement le cours.
- **[À VÉRIFIER]** — écart réel, chiffré, mais pas encore tranché.
- **[DÉJÀ CONFORME]** — confirmé par calcul contre le v7, aucune correction attendue.

---

## Règles communes — valables pour les 5 prompts ci-dessous

1. Tout l'acier passe par `calculerBlocArmature()` (`packages/moteur/src/armature.js`).
2. Pertes : régime **consommable** `Q = Q_net/(1−P)` pour ciment/sable/gravier/béton ;
   régime **pièce** `Q = Q_net×(1+P)` pour agglos, carreaux, aciers, tôles, planches.
3. `DEVIS_FACILE_BTP-7(1).xlsx` (v7) est la source de vérité. Le cours sert à repérer
   des trous, jamais à écraser le v7 en silence.
4. Ne jamais choisir un dosage/coefficient en silence : dire l'écart, proposer, attendre
   confirmation.
5. Chaque correction porte un test nommé. `npm test` reste vert en entier en fin de
   niveau, sans modifier un test existant pour faire passer une correction.

---

## PROMPT NIVEAU 0 — La Note de Calcul doit refléter le vrai moteur, pas une copie

```
packages/moteur/src/noteDeCalcul.js (fonction genererNoteDeCalcul) est déjà commenté
dans son propre code comme "Source de Vérité Unique" pour le Devis Entreprise et
Particulier, et c'est la page que l'utilisateur voit à l'étape 3 du parcours
(packages/app/src/components/metre/EtapeNoteCalcul.jsx) — celle qui détaille, pour
CHAQUE ouvrage, les données saisies, la formule, l'application numérique, le résultat,
et la décomposition en matériaux réels (sacs de ciment, tonnes de sable/gravier,
nombre d'agglos). C'est exactement la note de calcul détaillée qu'on avait construite
en premier pour ce projet — le format ne change pas, c'est son CONTENU qui doit rester
vrai à mesure que tu corriges le moteur dans les niveaux 1 à 5.

Le problème : `genererNoteDeCalcul()` ne réutilise PAS `calculerRecettes()`
(packages/moteur/src/recettes.js), qui est le calcul réel utilisé pour les matériaux
du devis. Il réimplémente sa propre version simplifiée de la décomposition matériaux
(lignes ~180-250 de noteDeCalcul.js), en dur, et elle est déjà fausse à plusieurs
endroits vérifiés :

1. [BUG CONFIRMÉ] `const dosage = (blocId === 'betonProprete') ? 150 : 350;`
   (noteDeCalcul.js:186) donne un dosage de 350 à `chapeEgalisation` et
   `sousPavement`, alors que recettes.js:144 et :148 utilisent 250 pour les deux
   (confirmé exact contre le v7 au niveau 1/2 de ce document). La note de calcul
   affiche donc plus de ciment que ce que le devis facture réellement pour ces deux
   ouvrages.

2. [BUG CONFIRMÉ] `moellon` a `unite: 'm3'` (metre.js:369-375), donc il tombe dans la
   branche générique "béton dosé 350" de noteDeCalcul.js — qui affiche un faux
   ciment/sable/gravier de béton armé. Le moellon n'est PAS du béton : c'est 70% de
   pierre (1,60 t/m3) + 30% de mortier de hourdage dosé à 250 (voir recettes.js:150-
   177, confirmé exact contre le v7 au niveau 1). La note de calcul de la fondation en
   moellon ment actuellement de bout en bout sur ses matériaux.

3. [BUG CONFIRMÉ] La maçonnerie utilise `nbAgglosParM2 = 12,5` en dur
   (noteDeCalcul.js:235), alors que le vrai calcul (metre.js:1145-1149,
   `sp = (lBloc+joint) x (hBloc+joint)`) donne un ratio différent et dépend de
   l'épaisseur du joint et de la majoration — celle-là même que tu vas corriger au
   niveau 2 point 4. Cette copie en dur ne bougera JAMAIS, même après ta correction :
   les deux vues resteront en désaccord.

4. [BUG CONFIRMÉ] Le `if (volumeBeton...) { ... } else if (surfaceMaconnerie...) { ... }`
   (noteDeCalcul.js:184-250) ne couvre que le béton générique (unite m3) et la
   maçonnerie. Enduits, peinture, carrelage, faïence, tôles, charpente bois n'ont
   AUCUNE entrée dans `decomposition_materiaux` : sur la page Note de Calcul, ces
   ouvrages affichent une formule et un résultat, mais zéro détail de matériaux —
   alors que recettes.js sait déjà les calculer tous (vérifié niveau 5 de ce document,
   au chiffre près contre le v7).

Ce qu'il faut faire : ne crée pas une quatrième implémentation. Fais en sorte que la
décomposition matériaux de `genererNoteDeCalcul()`, ouvrage par ouvrage, appelle la
MÊME logique que `calculerRecettes()` — factorise si besoin une fonction commune dans
recettes.js que les deux consomment, plutôt que de dupliquer des dosages/ratios en
dur ici. Le format de sortie (`decomposition_materiaux: [{ id_materiau, nom, dosage,
donnees, formule, calcul, valeur_brute, valeur_arrondie, unite, motif_arrondi }]`) ne
change pas, seule la source du calcul change.

Ordre de travail conseillé : fais ce chantier EN DERNIER dans les faits (après avoir
corrigé recettes.js aux niveaux 1 à 5, pour ne factoriser qu'une fois les formules
déjà justes) — mais je te le donne en premier dans ce document pour que tu saches, dès
le niveau 1, que chaque correction devra aussi se refléter ici. Pas de sprint séparé
"note de calcul" à la fin qui recommencerait tout à zéro.

Test à écrire : pour chaque bloc non vide, la somme des `decomposition_materiaux` de
`genererNoteDeCalcul(...).indexOuvrages[blocId]` doit correspondre aux quantités que
`calculerRecettes()` calcule pour ce même bloc — les deux vues ne doivent plus jamais
pouvoir diverger. Ne touche à EtapeNoteCalcul.jsx et exports.js que si la forme de
`decomposition_materiaux` change réellement.
```

---

## PROMPT NIVEAU 1 — Terrassement, béton de propreté, fondation en moellon

```
Chapitre I à III du cours + feuille "Fondation" du classeur v7 (§1.2, §1.4, §1.7).

1. [BUG CONFIRMÉ] Terrassement — déblais/remblais : le v7 (Fondation §1.7, et
   Parametres "4. COEFFICIENTS GENERAUX") implémente une vraie cascade que le moteur
   n'a pas du tout aujourd'hui :
   - Coefficient de tassement Ct = 1,30 (déjà présent, MAIS mort :
     `coefficientTassement: 1.3` dans packages/moteur/src/parametres.js n'est
     référencé nulle part ailleurs dans packages/moteur/src — confirmé par grep).
   - Densité déblais/remblais = 1,50 t/m3 (absente du moteur, à ajouter).
   - Déblais (m3) = (volume des fouilles ponctuelles + fouille filante) x Ct ;
     tonnage = déblais(m3) x 1,50.
   - Remblais (m3) = [vide autour des semelles (fouille - béton propreté - colonne) x
     nombre x Ct] + [vide le long de la fondation filante (fouille - propreté -
     moellon) x Ct] + [nivellement de l'emprise (L x l x épaisseur) x Ct]. Protéger
     chaque terme par MAX(0, ...) : un ouvrage qui occupe toute la fouille ne peut pas
     donner un remblai négatif.
   - Évacuation des déblais excédentaires = MAX(0, déblais - remblais).
   Le bloc `fouilles`/`fouilleFilante`/`nivellement`
   (packages/moteur/src/metre.js:84-114) ne rend aujourd'hui QUE le volume géométrique
   brut de l'excavation elle-même — ce qui reste correct pour facturer le poste
   "Fouilles" — mais aucun poste séparé "Déblais"/"Remblais"/"Évacuation" n'existe.
   Implémente cette cascade comme un nouveau calcul dérivé (pas une modification du
   bloc fouilles existant), avec un test nommé par formule, avant de me proposer où
   l'afficher dans le devis.

2. [DÉJÀ CONFORME] Béton de propreté : Q.ciment=(VxDosage)/50, Q.sable=Vx0,4x1,5,
   Q.gravier=Vx0,8x1,6 — vérifié identique dans PARAMETRES.beton ET dans le v7
   (Fondation §1.2 : mêmes coefficients, dosage 150 par défaut). Rien à corriger.
   Note sur l'épaisseur (pas une formule, une convention de saisie) : le cours dit
   "généralement 7 à 10 cm" et retient 10 cm dans son exemple, mais le v7 utilise
   0,05 m (5 cm) aussi bien sous les semelles isolées que sous la fondation filante
   (Fondation §1.2, deux fois). L'épaisseur reste un champ saisi par l'utilisateur
   (pas une constante à corriger dans le moteur) — j'ai juste mis un indice visuel
   "0,05" dans le champ Épaisseur de Béton de propreté côté app
   (packages/app/src/components/sections/Fondation.jsx) pour orienter vers la valeur
   du v7 plutôt que celle du cours. Rien à faire côté moteur ici.

3. [DÉJÀ CONFORME] Fondation en moellon — coefficient pierre : le v7 (Fondation §1.4,
   et Parametres "Part du moellon dans la maçonnerie = 70,0%") calcule
   Moellon(t) = Volume x 0,70 x 1,60 — exactement la formule du code
   (packages/moteur/src/recettes.js:154 : `volume * 0.70 * 1.60`). Le 1,3 du cours
   n'est PAS le bon coefficient pour ce projet : ne le reprends pas, le 0,70 actuel
   est confirmé exact contre le v7 (10,953 m3 -> 12,267 t, vérifié au chiffre près).
   Rien à corriger sur ce point.
```

---

## PROMPT NIVEAU 2 — Longrines, socle de poteaux, chape d'égalisation, élévation

```
Chapitre IV et VI du cours + feuilles "Fondation" §1.3/1.9 et "Elevation" du v7.

1. [DÉJÀ CONFORME] "Fil de recuit" : le cours le calcule à 3‰ du volume de béton,
   mais c'est le v7 qui fait foi et il calcule tout autre chose — "Fil de ligature
   (5%)" = 5% du POIDS D'ACIER de l'ouvrage, sur CHAQUE ouvrage armé (semelle, socle,
   longrine, colonne, ceinture, linteau, dalle, escalier — vérifié ligne par ligne
   dans les feuilles Fondation et Elevation du v7). C'est déjà implémenté dans le
   moteur : `filDeLigature()` (packages/moteur/src/armature.js:40-42) et
   `packages/moteur/src/recettes.js:110-113` (5% générique sur le poids d'acier de
   chaque ouvrage), facturé dans le devis via
   packages/moteur/src/valorisation.js:242-247. Ne touche à rien ici — vérifie juste
   que ce mécanisme générique couvre bien longrines et semelles (il devrait, il est
   appliqué au niveau de l'extraction d'armature, pas ouvrage par ouvrage) et
   confirme-le-moi.

2. [DÉJÀ CONFORME] Socle de poteau : le v7 (Fondation §1.3 "SEMELLE ISOLEE + AMORCE DE
   POTEAU (SOCLE ARME)") modélise le socle exactement comme le moteur — une semelle
   + une amorce de colonne dans le même bloc, dosées à 350. Ça correspond à
   `amorceSectionA/amorceSectionB/amorceHauteur` dans le bloc `semelles`
   (packages/moteur/src/metre.js:116-131). Confirmation seulement, rien à changer.

3. [DÉJÀ CONFORME] Chape d'égalisation : dosage 250 des deux côtés
   (packages/moteur/src/recettes.js:144, v7 Fondation §1.5). Confirme, rien à faire.

4. [À VÉRIFIER] Élévation / blocs — majoration : le v7 (Elevation §2.5) donne pour la
   maçonnerie RDC : surface nette 79,290 m2, Sp=(0,40+0,015)x(0,20+0,015)=0,089225 m2,
   soit 79,290/0,089225 = 888,8 blocs nets. Le v7 affiche 978 blocs achetés — un
   rapport de x1,10, pas x1,05. Or `PARAMETRES.majorations.blocs` dans
   packages/moteur/src/parametres.js vaut **1.05**, alors que la "Majoration standard
   à l'achat (pertes, chutes)" du v7 est **1.10** partout ailleurs où je l'ai vérifiée
   (planches, chevrons, tôles, carreaux/faïence sont déjà à 1.10 dans le moteur — cf.
   packages/moteur/src/parametres.js). Seul `blocs` (et `acier`, `sable`, `gravier`,
   qui sont aussi à 1.05 dans le même objet `majorations` — je ne les ai pas vérifiés
   au chiffre près faute de temps) semble être resté à 1.05. Vérifie ces 4 valeurs une
   par une contre le v7 (Elevation pour blocs, Fondation/Elevation pour acier via le
   poids total des barres achetées, Parametres pour la règle générale) avant de
   changer quoi que ce soit — sable/gravier/ciment sont peut-être volontairement en
   régime "consommable" (Q/(1-P), pas de majoration multiplicative du tout, voir règle
   commune n°2) plutôt qu'à corriger vers 1.10.
```

---

## PROMPT NIVEAU 3 — Poteaux/colonnes, coffrage, poutres et ceinture, plancher

```
Chapitre VII à X du cours + feuilles "Elevation" §2.1/2.2 et "Dalle" du v7.

1. [DÉJÀ CONFORME] Poteaux rectangulaires (V=LxlxhxN, dosage 350) confirmés contre
   Elevation §2.1 du v7. Les poteaux circulaires (V=pi.r².h) ont été ajoutés et testés
   cette session, ne les retouche pas.

2. [DÉJÀ CONFORME] Fil de ligature sur poteaux/ceinture/linteaux : déjà couvert par le
   mécanisme générique du niveau 2 point 1 (5% du poids d'acier de l'ouvrage). Rien de
   spécifique à ajouter ici — si tu avais commencé un ajout "fil de recuit" au niveau
   2 en pensant qu'il manquait, ne le duplique pas.

3. [À VÉRIFIER] Coffrage — ratios : le v7 (Parametres "5. BOIS DE COFFRAGE") donne des
   ratios fixes m2 coffrage / m3 béton par type d'ouvrage : Semelle 3,00 ; Poteau/
   Colonne 15,00 ; Poutre/Ceinture 11,00 ; Chainage/Longrine 8,00 ; Dalle 1,12 (m2/m2
   dalle). Le moteur référence déjà `PARAMETRES.ratiosCoffrage.poutre`
   (packages/moteur/src/metre.js:547) — retrouve l'objet complet
   `PARAMETRES.ratiosCoffrage` dans parametres.js et vérifie que les 5 valeurs
   correspondent exactement à celles du v7 ci-dessus, une par une. C'est un point que
   je n'ai pas eu le temps de vérifier chiffre par chiffre.

4. [DÉJÀ CONFORME] Poutres/ceinture : dosage 350, coffrage/armature partagés avec la
   logique poteaux — confirmé contre Elevation §2.2 du v7. Rien à changer.

5. [DÉJÀ CONFORME, PLUS AVANCÉ] Plancher/dalle : le v7 (Dalle §3.1-3.2) modélise
   exactement le cas `dalles` du moteur (dosage 350, ratio coffrage 1,12) ET propose
   une variante hourdis 12+4/16+4 — le moteur a les deux (`dalles` et
   `plancherHourdis12/16`). Confirme juste que rien n'a régressé.
```

---

## PROMPT NIVEAU 4 — Toiture : charpente, couverture, plafond

```
Chapitre XI du cours + feuille "Charpente_Couverture" du v7 (§5.1-5.2).

1. [DÉJÀ CONFORME] Charpente/fermes et pannes : vérifié au chiffre près contre le v7.
   Longueur développée de ferme = (entrait + 2 arbalétriers) x 1,15 — le v7 l'appelle
   explicitement "méthode simplifiée forfaitaire" (Charpente_Couverture §5.1) et donne
   19,360 m pour entrait=8,15/arbalétrier=4,342, ce qui correspond exactement à
   packages/moteur/src/metre.js:429. Le v7 dit lui-même que c'est un choix délibéré
   ("pour une charpente complexe, faites calculer la note par un bureau d'études") —
   ce n'est PAS le calcul de pente par Pythagore du cours, et c'est normal. Pannes :
   nombre_lignes x 2 (versants) x (longueur bâtiment + 2 débords) x section² donne
   0,682 m3 dans le v7, identique à packages/moteur/src/metre.js:431. Rien à changer,
   confirme juste que ces deux formules sont bien celles-là dans le code actuel.

2. [DÉJÀ CONFORME] Couverture en tôles — le x2 : j'avais d'abord soupçonné un doublon
   dans `nbreTolesBase * 2` (packages/moteur/src/recettes.js:334) et
   `surfaceToles * 2` (ligne 351). Le v7 fait EXACTEMENT la même chose et le documente
   explicitement : "Nombre de toles (2 pans, majoré de 10%)" (Charpente_Couverture
   §5.2) — la surface saisie représente un seul pan/versant, le x2 couvre le
   deuxième pan. Ce n'est pas un bug. Confirme seulement que `surfaceToles` dans le
   moteur est bien saisie comme UN SEUL versant (pas déjà la toiture complète), sinon
   le x2 deviendrait un vrai doublon — vérifie ce point précis d'unité de saisie côté
   formulaire React avant de conclure.

3. [À VÉRIFIER, HORS PÉRIMÈTRE PROBABLE] Plafond (bois de gîtage + triplex + lattes) :
   le cours facture ce poste séparément, mais je ne l'ai trouvé NULLE PART dans le v7
   non plus (aucune section "plafond" dans les 6 feuilles du classeur). Les deux
   sources s'accordent donc : c'est probablement un poste hors périmètre pour ce SaaS,
   pas un oubli. Confirme l'absence dans metre.js puis STOP — ne construis rien sans
   ma confirmation explicite.
```

---

## PROMPT NIVEAU 5 — Enduits, peinture, revêtement du sol (finitions)

```
Chapitre XII, XIII et XV du cours + feuille "Finition" du v7 (§4.1-4.4).

1. [DÉJÀ CONFORME] Enduits — 8 kg/m2 fixe : le cours propose un dosage différent en
   intérieur (250) et extérieur (300), mais le v7 tranche explicitement : "Règle du
   guide (p.12) : 8 kg de ciment par m2 à enduire", SANS distinction intérieur/
   extérieur (Finition §4.1, une seule ligne "Surface totale à enduire (2 faces des
   murs)"). C'est exactement `l.valeur * 8 / 50` dans
   packages/moteur/src/recettes.js:236,239. Ne touche à rien ici, le cours est
   l'exception, pas le code.

2. [DÉJÀ CONFORME] Peinture — rendements : vérifiés au chiffre près contre le v7
   (Finition §4.2, 159 m2) : Latex 39,75 kg (159/4), Classique 31,80 L (159/10 x 2
   couches), Chaux 53,00 kg (159/6 x 2 couches) — identiques à
   `rendementLatex:4, rendementPeintureClassique:10, rendementChaux:6,
   nbCouchesPeinture:2` dans packages/moteur/src/parametres.js. Le v7 n'a pas non plus
   de type "mastic" ni "émail" (seulement latex/classique/chaux) — n'ajoute PAS ces
   deux types que le cours mentionne, ils sont hors périmètre du v7. Rien à corriger.

3. [DÉJÀ CONFORME] Carrelage / faïence : vérifié au chiffre près contre le v7
   (Finition §4.3-4.4, surface 69,05 m2 carrelage + 25 m2 faïence) — 844 carreaux,
   552,40 kg de ciment-colle, 3,107 t de sable de pose, 13 sacs de ciment de pose pour
   le carrelage ; 275 faïences, 200 kg de ciment-colle pour la faïence : tout
   correspond exactement à packages/moteur/src/recettes.js:271-307. C'est plus
   détaillé et plus juste que l'abaque simplifié du cours. Rien à changer, juste
   confirmer que les tests couvrent bien ces formules.
```
