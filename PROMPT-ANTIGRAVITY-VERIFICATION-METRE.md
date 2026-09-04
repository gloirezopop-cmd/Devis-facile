# Prompts de vérification — Cours de Métré et Devis

Source : `Cours_Metre_et_Devis_1.docx` (à la racine du dépôt). J'ai lu le document en
entier et croisé chacune de ses formules avec le code actuel du moteur
(`packages/moteur/src`) avant d'écrire ces prompts — chaque bloc ci-dessous cite déjà
les chiffres du cours **et** l'endroit exact du code à comparer, donc Antigravity n'a
pas besoin de rouvrir le `.docx` lui-même.

**Mode d'emploi** : colle un seul niveau à la fois dans Antigravity (section « PROMPT
NIVEAU N » incluse). Laisse-le vérifier et corriger ce niveau, lis son rapport, puis
passe au suivant. Les niveaux suivent l'ordre du cours : bases d'abord, cas les plus
élaborés (toiture, finitions) en dernier.

Chaque bloc porte une étiquette :
- **[BUG CONFIRMÉ]** — j'ai déjà vérifié l'écart dans le code, quasi sûr.
- **[À VÉRIFIER]** — écart réel mais l'explication peut être légitime, à trancher avant
  de toucher au code.
- **[DÉJÀ CONFORME]** — juste une confirmation à faire, aucune correction attendue.

---

## Règles communes — valables pour les 5 prompts ci-dessous

Rappelle-les à Antigravity en tête de chaque niveau si besoin :

1. Tout l'acier passe par `calculerBlocArmature()` (`packages/moteur/src/armature.js`).
   Pas de second calcul de poids ailleurs.
2. Pertes : régime **consommable** `Q = Q_net/(1−P)` pour ciment/sable/gravier/béton ;
   régime **pièce** `Q = Q_net×(1+P)` pour agglos, carreaux, aciers, tôles.
3. Le classeur de référence `DEVIS_FACILE_BTP-7(1).xlsx` (v7) reste la source de vérité
   quand il contredit ce cours — le cours sert à repérer des trous, pas à écraser le
   classeur en silence. En cas de contradiction entre les deux, le signaler et demander.
4. Ne jamais choisir un dosage/coefficient en silence quand le cours et le code
   divergent : le dire, proposer, attendre confirmation avant de trancher.
5. Chaque correction porte un test nommé. `npm test` doit rester vert en entier à la
   fin du niveau, sans modifier un test existant pour faire passer une correction.

---

## PROMPT NIVEAU 1 — Terrassement, béton de propreté, fondation en moellon

```
Tu travailles sur packages/moteur. Vérifie ces trois points du chapitre I à III du
cours de métré (chiffres ci-dessous), contre le code actuel.

1. [BUG CONFIRMÉ] Terrassement (I) : le cours calcule les déblais par
   V_deblai = V_fouille x CF (coefficient de foisonnement, CF=1,2) et les remblais par
   V_remblai = V_brut x CT (coefficient de tassement, CT≈1,15-1,20). Le bloc `fouilles`
   et `fouilleFilante` (packages/moteur/src/metre.js:84-108) rendent le volume
   géométrique brut, sans aucun de ces deux coefficients. Pire :
   `coefficientTassement: 1.3` existe dans packages/moteur/src/parametres.js:84 mais
   n'est référencé nulle part ailleurs dans le moteur (grep "coefficientTassement" ne
   remonte qu'une seule ligne). Décide avec moi si on ajoute réellement le foisonnement
   et le tassement (et où : à la saisie ou en aval), ou si c'est un choix délibéré de
   ne compter que le volume net — dans ce cas, retire le paramètre mort au lieu de le
   laisser trompeur. Un test nommé quel que soit le choix.

2. [DÉJÀ CONFORME] Béton de propreté (II) : le cours donne Q.ciment=(VxDosage)/50,
   Q.sable=Vx0,4x1,5, Q.gravier=Vx0,8x1,6. Ça correspond à
   PARAMETRES.beton (sableParM3:0.40, densiteSable:1.50, gravierParM3:0.80,
   densiteGravier:1.60, poidsSacCiment:50) dans parametres.js. Confirme juste que rien
   n'a dérivé, pas de correction attendue ici.

3. [BUG CONFIRMÉ] Fondation en moellon (III) : le cours donne pour la pierre
   Q.moellon = V x 1,3 x 1,6 (1,3 = coefficient propre au moellon, 1,6 = densité).
   Le code (packages/moteur/src/recettes.js:154) calcule
   `tonnesMoellon = volume * 0.70 * 1.60` — 0,70 au lieu de 1,3, presque la moitié.
   Le reste du bloc moellon (mortier à 30% du volume, dosé à 250) est un modèle plus
   détaillé que celui du cours et ne doit pas être simplifié — ne touche QUE le
   coefficient 0,70/1,3, et seulement après m'avoir dit lequel te semble juste (ou si
   le classeur v7 tranche différemment).
```

---

## PROMPT NIVEAU 2 — Longrines, socle de poteaux, chape d'égalisation, élévation

```
Chapitre IV et VI du cours de métré.

1. [BUG CONFIRMÉ] Fil de recuit (IV.1, IV.2, et VII plus tard) : le cours calcule pour
   CHAQUE ouvrage en béton armé (longrine, socle de poteau, poteau) une quantité de fil
   de recuit : Q.fil = 3‰ x V (en kg, V = volume béton de l'ouvrage). J'ai grep
   "recuit" dans tout packages/moteur/src : zéro résultat. Cette ligne n'existe nulle
   part dans le moteur, sur aucun ouvrage. Ajoute-la comme poste de matériau (kg) pour
   longrines et pour colonnes/semelles (leur socle), avec un test nommé par bloc.
   Vérifie d'abord si le classeur v7 a un prix unitaire pour "fil de recuit" avant de
   l'ajouter au devis, sinon demande-moi.

2. [À VÉRIFIER] Socle de poteau (IV.2) : le cours traite le socle comme un bloc à part
   (1,00 x 1,00 x 0,40, dosé à 350). Le moteur actuel n'a pas de bloc "socle" distinct
   — il modélise ça via `amorceSectionA/amorceSectionB/amorceHauteur` DANS le bloc
   `semelles` (packages/moteur/src/metre.js:116-131). Confirme que c'est bien la même
   idée sous un autre nom (le "socle" du cours = l'"amorce" du moteur), pas un concept
   perdu. Rapport seulement, pas de code à changer si ça se confirme.

3. [DÉJÀ CONFORME] Chape d'égalisation (V) : dosage 250 kg/m³ des deux côtés
   (packages/moteur/src/recettes.js:144). Confirme, rien à corriger.

4. [DÉJÀ CONFORME, PLUS PRÉCIS] Élévation/blocs (VI) : le cours compte
   Nb_blocs = (Surface_utile x 13) x 1,05, où 13 = 1/(0,40x0,20). Le moteur
   (packages/moteur/src/metre.js:1145-1149) calcule
   `sp = (lBloc+joint) x (hBloc+joint)` puis `ceil(valeur/sp)` — il compte le joint de
   mortier (0,015 m) que le cours ignore, donc un chiffre légèrement différent mais
   plus juste. La majoration 1,05 vient de PARAMETRES.majorations.blocs. Confirme
   seulement que la majoration est bien appliquée, ne reviens pas à la formule plus
   simple du cours.
```

---

## PROMPT NIVEAU 3 — Poteaux/colonnes, coffrage, poutres et ceinture, plancher

```
Chapitre VII à X du cours de métré.

1. [DÉJÀ CONFORME] Poteaux rectangulaires (VII) : V=LxlxhxN, déjà en place. Les poteaux
   circulaires (V=pi.r².h) ont été ajoutés et testés cette session — ne les retouche
   pas, confirme juste qu'ils sont toujours corrects.

2. [BUG CONFIRMÉ] Fil de recuit sur poteaux : même trou qu'au niveau 2, troisième
   ouvrage concerné par Q.fil = 3‰ x V. Si tu as déjà traité le fil de recuit au
   niveau 2 pour longrines/semelles, ajoute juste le troisième poste ici (colonnes) au
   lieu de dupliquer la logique — factorise en une seule fonction appelée trois fois.

3. [À VÉRIFIER] Coffrage (VIII) : le cours mentionne "le coffrage se fait souvent en
   étage ou partie en prenant le 1/3 de la longueur appliquée pour des raisons
   économiques" — c'est une note de pratique, pas une formule chiffrée précise même
   dans le cours. Lis packages/moteur/src/coffrage.js et dis-moi si cette règle du 1/3
   est déjà reflétée quelque part ou pas du tout ; ne l'implémente PAS toi-même sur la
   base de cette seule phrase trop vague, remonte-moi la question.

4. [DÉJÀ CONFORME] Poutres/ceinture (IX) : le cours dit "coffrage et armature = cfr
   poteaux", dosage béton armé attendu 350. Vérifie que les blocs `poutres` et
   `ceintures` (packages/moteur/src/metre.js:181,394) utilisent bien
   PARAMETRES.dosages.betonArme (350) et partagent la même logique d'armature/coffrage
   que les poteaux. Rapport seulement.

5. [DÉJÀ CONFORME, PLUS AVANCÉ] Plancher/dalle (X) : le cours reste à une dalle pleine
   simple (V=SurfacexEpaisseur). Le moteur a en plus `dalles` et
   `plancherHourdis12/16`, plus avancés que le cours sur ce point. Confirme juste que
   rien n'a régressé, aucune simplification à faire.
```

---

## PROMPT NIVEAU 4 — Toiture : charpente, couverture, plafond

```
Chapitre XI du cours de métré — le plus technique, prends le temps de comparer
formule par formule avant de coder quoi que ce soit.

1. [À VÉRIFIER] Charpente/fermes (XI.1) : N.ferme = Longueur_bâtiment/écartement + 1
   correspond déjà à packages/moteur/src/metre.js:426
   (`Math.ceil(l.longueur / l.ecartement + 1)`). Mais pour la longueur des pannes, le
   cours passe par Pythagore sur la pente du toit : C = racine(a² + b²) + débordement
   de tôle, puis N.panne = longueur_du_versant/espacement + 1. Le code actuel
   (metre.js:431) calcule
   `pannes = l.lignesPannes * 2 * (l.longueur + 2*l.debord) * l.section * l.section`
   — ça ne ressemble pas à un calcul de pente. Lis tout le bloc `charpentes`
   (metre.js ~403-435, tous les champs `requis`) et dis-moi si `lignesPannes` est déjà
   une saisie utilisateur qui remplace le calcul de pente (auquel cas c'est cohérent),
   ou si une vraie longueur de versant manque. Rapport d'abord, correction seulement
   après mon accord — c'est une formule structurelle, pas une simplification anodine.

2. [BUG CONFIRMÉ, PRIORITAIRE] Couverture en tôles (XI.2) : dans
   packages/moteur/src/recettes.js:334 et :351 :
   `ajouterMateriau(recettes, 'toles', 'toles', 'u', nbreTolesBase * 2, regles)` et
   `clousToiture = surfaceToles * 2 * PARAMETRES.clous.couverture`
   — les deux multiplient par 2 sans commentaire ni justification visible. L'exemple
   chiffré du cours (92,7 m² de toiture, tôle 3,05x0,80 utile 2,85x0,70=1,995 m²) donne
   ~47 tôles SANS doubler. Cherche une raison métier à ce x2 (par exemple : la surface
   d'entrée compte-t-elle déjà un seul versant et pas les deux ?) ; si tu n'en trouves
   pas, c'est un doublon qui fait payer deux fois trop de tôles et de clous sur CHAQUE
   devis avec toiture — corrige avec un test qui aurait détecté le doublon.

3. [À VÉRIFIER, PEUT-ÊTRE HORS PÉRIMÈTRE] Plafond (XI.3) : le cours facture le plafond
   comme poste à part (bois de gîtage + triplex + lattes + clous, avec ses propres
   formules). Je n'ai trouvé aucun bloc "plafond" dédié dans metre.js. Confirme s'il
   est vraiment absent puis STOP — ne construis rien tant que je n'ai pas confirmé
   qu'on veut ce poste dans le SaaS (ça peut être volontairement hors périmètre).
```

---

## PROMPT NIVEAU 5 — Enduits, peinture, revêtement du sol (finitions)

```
Chapitre XII, XIII et XV du cours de métré.

1. [BUG CONFIRMÉ, PRIORITAIRE] Enduits (XII) : le cours distingue enduit intérieur
   (dosé 250 kg/m³) et extérieur (dosé 300 kg/m³), épaisseur 0,02 m — donc
   5 kg ciment/m² en intérieur, 6 kg/m² en extérieur (dosage x épaisseur). Le code
   (packages/moteur/src/recettes.js:236 et :239) calcule
   `sacsCimentEnduit += Math.ceil((l.valeur * 8) / 50)` — 8 kg/m² fixe, sans distinguer
   intérieur/extérieur et sans coller à aucun des deux dosages. Vérifie d'abord dans le
   classeur v7 (`DEVIS_FACILE_BTP-7(1).xlsx`, onglet Finition) si 8 kg/m² est SA valeur
   volontaire (auquel cas le classeur prime, ne touche à rien de plus qu'ajouter un
   test qui fige ce choix) ; sinon aligne sur les dosages 250/300 avec un champ
   intérieur/extérieur, test nommé.

2. [BUG CONFIRMÉ] Peinture (XIII) : abaques du cours — 1 kg de latex sur 5 m²,
   1 kg de chaux sur 8 m², 1 kg de mastic sur 5 m², 1 kg d'émail sur 6 m² (par couche,
   x2 couches dans l'exemple). Le code (packages/moteur/src/parametres.js:125-128)
   utilise `rendementLatex: 4` (m²/kg, soit 0,25 kg/m² au lieu de 0,20), `rendementChaux: 6`
   (soit 0,167 kg/m² au lieu de 0,125), et n'a NI mastic NI émail comme types de
   peinture du tout. Comme pour le point 1 : regarde d'abord si le classeur v7 donne
   ses propres rendements avant de recopier ceux du cours — les deux sources peuvent
   légitimement différer (qualité de peinture différente), mais l'écart doit être
   tranché consciemment, pas laissé au hasard d'un ancien copier-coller.

3. [DÉJÀ CONFORME, PLUS DÉTAILLÉ] Revêtement du sol / carrelage / faïence (XV) :
   le cours utilise un abaque simple (ciment ≈ 9 kg/m² carrelage, 5 kg/m² faïence). Le
   code (packages/moteur/src/recettes.js:271-307) sépare ciment-colle (8 kg/m²) ET
   mortier de pose (ciment/sable calculés depuis l'épaisseur réelle du carrelage) —
   plus détaillé que le cours. Compare plutôt avec le classeur v7 qu'avec le cours ici ;
   si le v7 confirme, rapport seulement, pas de changement.
```
