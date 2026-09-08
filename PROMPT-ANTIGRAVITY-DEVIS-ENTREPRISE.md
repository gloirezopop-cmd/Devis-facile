# Devis Entreprise — algorithme et annexe technique

Document jumeau de `PROMPT-ANTIGRAVITY-DEVIS-PARTICULIER.md`. Même structure, même méthode, même interface Excel. **La différence tient en une phrase : le Devis Particulier vend des matériaux, le Devis Entreprise vend des ouvrages.**

Deux parties strictement séparées :

- **PARTIE 1 — ALGORITHME DU FONDATEUR.** La spécification. Elle fait autorité.
- **PARTIE 2 — ANNEXE TECHNIQUE.** Relevé de l'état réel du code, écrit par Claude. En cas de contradiction, la Partie 1 gagne.

---
---

# PARTIE 1 — ALGORITHME DU FONDATEUR

## 1. OBJECTIF

Générer automatiquement le Devis Entreprise à partir de l'onglet Résumé, dans l'interface Excel déjà intégrée au SaaS :

```
RÉSUMÉ
   ↓
MOTEUR DE GÉNÉRATION
   ↓
DEVIS ENTREPRISE
   ↓
INTERFACE EXCEL EXISTANTE
   ↓
EXPORT / IMPRESSION
```

L'algorithme fait exactement la même chose que celui du Devis Particulier : il lit le Résumé, classe les lots dans l'ordre, numérote, génère les lignes, calcule les P.T., les sous-totaux, le total et le total général, et alimente la feuille Excel existante.

NE PAS créer une nouvelle interface Excel. NE PAS créer une nouvelle feuille indépendante. NE PAS dupliquer le moteur du Devis Particulier : les deux devis partagent la même mécanique et le même rendu, ils ne diffèrent que par ce qu'ils vendent.

### Cet algorithme remplace le Devis Entreprise existant

Il ne s'ajoute pas à côté. Le Devis Entreprise qui se trouve aujourd'hui dans l'application doit être **transformé** pour suivre cet algorithme. À la fin du travail il ne doit exister qu'**un seul** Devis Entreprise dans l'application : celui-ci. Les deux devis de l'application sont remplacés par les deux algorithmes.

### Règle absolue : le Résumé est la seule source

**Les deux devis ne puisent leurs informations que dans le Résumé. Rien d'autre.**

Le Devis Entreprise ne lit pas le métré. Il ne lit pas les blocs de saisie. Il ne recalcule aucune quantité. Il lit le Résumé, et uniquement le Résumé.

```
                    MÉTRÉ
                      ↓
                  RÉSUMÉ            ← une seule fois, un seul calcul
                      ↓
          ┌───────────┴───────────┐
          ↓                       ↓
DEVIS PARTICULIER         DEVIS ENTREPRISE
  (les détails :            (les ouvrages :
   matériaux)                m³ et m²)
```

Les deux devis lisent le **même** Résumé et n'y prennent pas la même chose : le Particulier prend les détails, c'est-à-dire les matériaux ; l'Entreprise prend les mètres cubes et les mètres carrés des ouvrages. C'est la même information vue de deux façons. Deux quantités qui ne concordent pas entre les deux devis, c'est un bug : il n'y a qu'une seule vérité, celle du Résumé.

## 2. LA DIFFÉRENCE FONDAMENTALE : ON VEND DES OUVRAGES, PAS DES MATÉRIAUX

C'est le point le plus important de tout ce document.

| | Devis Particulier | Devis Entreprise |
|---|---|---|
| Ce qu'on vend | des **matériaux** | des **ouvrages élémentaires** |
| Exemples de lignes | Ciment (sac), Sable (t), Gravier (t), Armature HA10 (barre) | Béton armé pour semelles (m³), Longrines (m³), Maçonnerie en agglos (m²) |
| Unités | sac, tonne, kg, barre, litre | **m³ et m²** |
| Le client achète | de la matière | du travail fini |

Le Devis Entreprise prend donc les **volumes en m³ et les surfaces en m² des ouvrages élémentaires**, tels qu'ils figurent dans le Résumé. Le ciment, le sable, le gravier et l'acier n'apparaissent **jamais** comme des lignes du Devis Entreprise : ils sont à l'intérieur du prix unitaire de l'ouvrage (voir §13).

## 3. ORDRE OBLIGATOIRE ET STRUCTURE DES LOTS

L'algorithme part du Résumé et suit l'ordre chronologique du chantier :

```
1  TERRASSEMENT
2  FONDATION
3  ÉLÉVATION (RDC)
4  ÉLÉVATION (ÉTAGE 1, ÉTAGE 2… s'ils existent)
5  PLANCHER / DALLE
6  TOITURE (charpente et couverture, ou terrasse)
7  SECOND ŒUVRE
```

Puis : **TOTAL**, puis les frais et taxes (§13), puis **TOTAL GÉNÉRAL / NET À PAYER**.

Contenu attendu de chaque lot — la désignation porte la caractéristique technique de l'ouvrage :

```
1 TERRASSEMENT
  Installation et repli de chantier              ens (forfait)
  Volume de déblais                              m³
  Volume de remblais                             m³
  Évacuation des terres excédentaires            m³

2 FONDATION
  Béton de propreté dosé à 150 kg/m³             m³
  Béton armé - Semelles et amorces dosé à 350 kg/m³   m³
  Béton armé - Longrines dosé à 350 kg/m³        m³
  Fondation en moellon                           m³
  Dallage                                        m³
  Mur de soubassement en agglos                  m²

3 ÉLÉVATION (RDC)
  Maçonnerie en agglos de 15                     m²
  Béton armé - Poteaux dosé à 350 kg/m³          m³
  Béton armé - Poutres dosé à 300 kg/m³          m³
  Béton armé - Chaînages / linteaux              m³
  Escalier                                       m³

4 ÉLÉVATION (ÉTAGE)   ← uniquement si le projet a un étage
  (mêmes natures d'ouvrages qu'au RDC)

5 PLANCHER / DALLE
  Dalle pleine dosée à 350 kg/m³                 m³
  ou Plancher à hourdis                          m²

6 TOITURE
  Charpente en bois                              (selon l'unité du métré)
  Couverture en tôles                            m²
  ou Toiture-terrasse (acrotère, forme de pente)

7 SECOND ŒUVRE
  Menuiseries, plomberie, électricité, revêtements,
  peinture, aménagement extérieur, étanchéité     ens (forfaits)
```

Et ainsi de suite selon les ouvrages que le projet comporte.

**Les dosages affichés dans les désignations doivent être les dosages réellement choisis par l'utilisateur dans son projet**, pas des valeurs écrites en dur. Si l'utilisateur dose ses semelles à 400 kg/m³, la ligne doit dire 400, pas 350.

## 4. RÈGLE D'ADAPTATION AU PROJET — LE DEVIS NE CONTIENT QUE CE QUI A ÉTÉ CALCULÉ

Deuxième point capital.

Le devis se construit **à partir de ce que l'utilisateur a réellement métré**, et de rien d'autre. Il classe et ordonne uniquement la partie que l'utilisateur a calculée.

- Si le projet a **un étage**, le lot Élévation Étage s'ajoute **automatiquement**, avec ses ouvrages.
- Si le projet est **de plain-pied**, l'utilisateur ne passe jamais par là : aucun lot Étage ne doit apparaître, même vide.
- Il en va de même pour chaque ouvrage : un ouvrage non mesuré ne produit **aucune ligne**. Pas de ligne à zéro, pas de ligne « pour mémoire », pas de lot vide avec un sous-total à 0.
- Un lot dont tous les ouvrages sont absents ne s'affiche pas du tout.

La numérotation se reconstruit alors sur les seuls lots présents, sans trou.

## 5. TRANSFORMATION DES DONNÉES DU RÉSUMÉ

Pour chaque ouvrage du Résumé :

```
Résumé
   ↓
Identifier le lot (et le niveau : RDC, étage…)
   ↓
Identifier la position du lot
   ↓
Récupérer la désignation de l'ouvrage + sa caractéristique (dosage, type d'agglo)
   ↓
Récupérer l'unité (m³ ou m²)
   ↓
Récupérer le volume ou la surface
   ↓
Créer la ligne correspondante dans Devis Entreprise
```

Exemple. Le Résumé contient `Semelles : 4,25 m³`, dosage projet 350 kg/m³ :

```
2.2 | Béton armé - Semelles et amorces dosé à 350 kg/m³ | m³ | 4,25 | [P.U.] | [P.T.]
```

## 6. NUMÉROTATION AUTOMATIQUE

Identique au Devis Particulier : numéro du lot, puis `lot.rang` pour chaque ligne (2.1, 2.2, 2.3…). L'utilisateur ne saisit jamais ces numéros. La numérotation est calculée à l'affichage, jamais stockée, et se reconstruit sans trou après toute suppression (§4).

## 7. LES QUANTITÉS VIENNENT DU RÉSUMÉ

Les volumes et surfaces affichés sont récupérés automatiquement depuis le Résumé. Si le métré change, le devis suit. Aucune recopie manuelle. C'est le même mécanisme que pour le Devis Particulier.

## 8. LE PRIX UNITAIRE DOIT ÊTRE MODIFIABLE DANS EXCEL

Comme pour le Devis Particulier, l'utilisateur doit pouvoir cliquer sur une cellule **P.U.** dans l'interface Excel et fixer son prix — ici, son prix d'ouvrage au m³ ou au m².

Le prix unitaire proposé par défaut est celui calculé par le sous-détail de prix (§13), mais **l'entreprise doit toujours pouvoir imposer son propre prix**, parce qu'un prix de vente se décide, il ne se subit pas. Quand l'utilisateur saisit un prix, c'est le sien qui s'applique.

Le montant saisi doit être conservé lors des actualisations suivantes (§16), et modifiable soit dans les paramètres, soit directement dans Excel.

## 9. PRIX TOTAL

`P.T. = QTTE × P.U.`, calculé automatiquement, recalculé immédiatement dès que le P.U. change.

## 10. DISTINGUER QUANTITÉ CALCULÉE ET PRIX COMMERCIAL

| Nature | Contenu | Modifiable ? |
|---|---|---|
| Technique | Désignation, caractéristique (dosage), unité, volume/surface, lot, niveau, ordre | Non — vient du métré |
| Commerciale | Prix unitaire de l'ouvrage, taux du §13 | **Oui** |
| Calculée | P.T., sous-totaux, total, frais, TVA, net à payer | Non — dérivée |

## 11. SOUS-TOTAL APRÈS CHAQUE LOT

Après chaque lot : **SOUS TOTAL** = somme des P.T. du lot. Un lot absent n'a pas de sous-total (§4).

## 12. TOTAL DES TRAVAUX

`TOTAL = somme des sous-totaux de tous les lots présents.` Ne jamais compter deux fois le même ouvrage — attention particulière à la toiture, où charpente, couverture et terrasse peuvent se recouvrir.

## 13. LA GRANDE DIFFÉRENCE DE PRIX : SOUS-DÉTAIL, FRAIS D'ENTREPRISE, TVA

Là où le Devis Particulier applique cinq frais après le total, le Devis Entreprise fonctionne autrement, parce que c'est une entreprise qui vend un ouvrage fini.

### a) Le prix unitaire d'un ouvrage se construit par sous-détail de prix

Pour chaque ouvrage, le prix unitaire se compose :

```
Déboursé sec de l'ouvrage = matériaux + main d'œuvre + matériel
```

C'est là — et seulement là — que se trouvent le ciment, le sable, le gravier, l'acier et le coffrage. Ils n'apparaissent pas comme des lignes du devis, ils sont dans le prix du m³.

### b) Le prix de vente s'obtient en appliquant les frais d'entreprise

```
Prix de vente unitaire = Déboursé sec × K

K = 1 + frais de chantier % + frais généraux % + bénéfice et aléas %
```

**C'est ici que se placent les frais de chantier et les frais généraux** — ils appartiennent au Devis Entreprise, pas au Devis Particulier.

Une entreprise qui vend au déboursé sec travaille à perte : le coefficient K n'est pas optionnel.

### c) Les pourcentages sont paramétrables

Frais de chantier, frais généraux, bénéfice et aléas, taux de main d'œuvre, TVA : **tous ces taux doivent être paramétrables par l'utilisateur dès le départ**, avec des valeurs par défaut modifiables. Ce sont des valeurs par défaut, pas des constantes.

### d) TVA

Après le TOTAL des travaux :

```
TOTAL HT
+ TVA (taux paramétrable)
= NET À PAYER
```

## 14. TOTAL GÉNÉRAL

```
TOTAL HT      = Total gros œuvre + Total second œuvre
TVA           = TOTAL HT × taux de TVA
NET À PAYER   = TOTAL HT + TVA
```

Le montant doit également pouvoir s'écrire en toutes lettres, comme sur le Devis Particulier.

## 15. SYNCHRONISATION AVEC RÉSUMÉ

```
              RÉSUMÉ
                 │
        données techniques
                 │
                 ↓
          MOTEUR CENTRAL
                 │
        ┌────────┴────────┐
        ↓                 ↓
DEVIS PARTICULIER   DEVIS ENTREPRISE
                          │
                          ↓
                   INTERFACE EXCEL
```

**Un seul Résumé alimente les deux devis.** Le Résumé ne doit jamais être calculé deux fois, ni exister en deux versions. Les deux devis sont deux lectures commerciales du même métré : l'une en matériaux, l'autre en ouvrages. Si les deux devis divergent sur une quantité, c'est un bug.

## 16. ACTUALISATION

Quand le métré change, le devis se reconstruit :

- **repris du Résumé** : lots, niveaux, ouvrages, désignations, dosages, unités, volumes et surfaces, ordre ;
- **conservé** : les prix unitaires que l'entreprise a saisis, tant que l'ouvrage existe encore, et les taux paramétrés.

## 17. IDENTIFIANT UNIQUE DES LIGNES

Chaque ligne porte un identifiant stable, indépendant de son numéro affiché, et qui distingue le niveau : un poteau du RDC et un poteau de l'étage sont deux lignes différentes et peuvent avoir deux prix différents.

Le numéro visuel (3.2 → 3.1) peut changer sans que le prix saisi disparaisse.

## 18. CAS D'UNE NOUVELLE LIGNE

Un ouvrage nouvellement métré apparaît automatiquement dans son lot, et sous-total, TOTAL, TVA et NET À PAYER se recalculent.

## 19. CAS D'UNE SUPPRESSION

Un ouvrage qui disparaît du métré disparaît du devis, et la numérotation se reconstruit sans trou. Si c'était le dernier ouvrage d'un lot, le lot entier disparaît (§4).

## 20. RENDU VISUEL

Même tableau que le Devis Particulier :

```
┌─────┬────────────────────────┬────────┬──────────┬──────────┬────────────┐
│ N°  │ DESIGNATION            │ UNITE  │ QTTE     │ P.U.     │ P.T.       │
└─────┴────────────────────────┴────────┴──────────┴──────────┴────────────┘
```

Tableau propre, bordures visibles, titres de lots distincts, sous-totaux visibles, TOTAL HT, TVA et NET À PAYER mis en évidence, nombres alignés, prix en FCFA, aucun débordement. Professionnel à l'écran, dans Excel, à l'aperçu, en PDF et sur papier.

Les désignations doivent être **écrites en français correct, avec les accents** : « Béton de propreté », « Évacuation des déblais », « Fouilles en tranchée ». Un devis d'entreprise part chez un client.

## 21. IMPRESSION

Format A4, orientation selon la largeur nécessaire, marges adaptées, zone d'impression, répétition de la ligne d'en-tête sur chaque page, pagination, largeurs de colonnes et hauteurs de lignes. Un devis de plusieurs pages doit se poursuivre proprement.

## 22. EXPORT

Une seule source de mise en page pour l'aperçu Excel, l'export Excel, l'export PDF et l'impression :

```
DATA MODEL → TABLE RENDERER → Excel / PDF / Print
```

**Le même renderer que le Devis Particulier.** Les deux devis ont le même tableau à six colonnes : il ne doit exister qu'une seule mise en page pour les deux, paramétrée par le contenu. Ne pas écrire un deuxième système d'affichage.

## 23. ARCHITECTURE RECOMMANDÉE

```
PROJECT DATA
     ↓
SUMMARY DATA (un seul Résumé)
     ↓
QUOTE BUILDER (partagé)
     ├── Sort lots
     ├── Generate numbers
     ├── Generate rows        ← matériaux (Particulier) OU ouvrages (Entreprise)
     ├── Preserve custom prices
     ├── Calculate P.T.
     ├── Calculate subtotals
     ├── Calculate total
     ├── Calculate charges    ← 5 frais (Particulier) OU K + TVA (Entreprise)
     └── Calculate grand total
     ↓
DEVIS ENTREPRISE
     ↓
EXISTING EXCEL UI
  ↓     ↓     ↓
XLSX   PDF   PRINT
```

## 24. RÈGLE ABSOLUE

Aucune valeur en dur. Aucun dosage écrit dans le code alors que l'utilisateur l'a choisi dans son projet. Aucune ligne inventée pour « faire joli ». Aucun ouvrage affiché qui n'a pas été métré.

Un ouvrage dont le prix est inconnu sort à 0 FCFA **avec un avertissement visible**, jamais en silence.

## 25. CRITÈRE DE RÉUSSITE

1. L'utilisateur crée son projet et fait son métré.
2. Le Résumé contient les volumes et surfaces des ouvrages.
3. L'utilisateur ouvre « Devis Entreprise ».
4. Les ouvrages sont récupérés automatiquement depuis le Résumé, en m³ et m².
5. Les lots sont classés dans l'ordre : Terrassement → Fondation → Élévation (RDC puis étages) → Plancher → Toiture → Second œuvre.
6. **Seuls les lots et ouvrages réellement métrés apparaissent** : un projet de plain-pied n'affiche aucun lot Étage.
7. Les désignations portent les dosages réels du projet.
8. Les lignes sont numérotées automatiquement, sans trou.
9. Un prix unitaire par défaut est proposé par le sous-détail de prix, frais d'entreprise compris.
10. L'utilisateur peut imposer son propre prix unitaire dans Excel.
11. P.T., sous-totaux, TOTAL HT, TVA et NET À PAYER se calculent automatiquement.
12. Les taux (frais de chantier, frais généraux, bénéfice, main d'œuvre, TVA) sont paramétrables.
13. Un prix saisi survit à un changement de quantité.
14. Impression et export PDF/Excel donnent exactement les mêmes chiffres que l'écran.

---
---

# PARTIE 2 — ANNEXE TECHNIQUE (relevé de l'état du code)

Relevé écrit par Claude. Pas une modification de la Partie 1.

## A. Ce qui existe déjà

`genererDevisEntreprise(input, regles, bibliothequePrix, bibliothequeLibelles)` dans `packages/moteur/src/valorisation.js` implémente déjà une grande partie de l'algorithme :

| Point | État |
|---|---|
| §2 — vente par ouvrages en m³/m² | **Fait.** Lignes du type `Beton arme - Semelles isolees + Amorces` (m3), `Mur de soubassement (agglos)` (m2) |
| §3 — regroupement par lot et par niveau | **Fait.** `TITRES_LOTS_ENTREPRISE` : terrassement, fondation, rdc, etage1, toiture, second_oeuvre |
| §4 — adaptation au projet | **Fait, et déjà débogué.** `if (item.qte > 0)` et `if (!blocDonnees || !(blocDonnees.total > 0)) continue;` — un commentaire du code raconte le bug corrigé où colonnes, ceintures, linteaux et escaliers apparaissaient à chaque étage sans avoir été mesurés. Un projet de plain-pied n'affiche donc déjà aucun lot Étage. |
| §5, §7 — quantités depuis le Résumé | **Fait.** `resumeFondation.volumes` et `blocDonnees.total` |
| §11, §12 — sous-totaux et totaux | **Fait.** `sousTotal` par niveau, `totalGrosOeuvre`, `totalSecondOeuvre` |
| §13d — TVA | **Fait.** `cascade.tva`, taux par défaut 18 %, lu dans `regles.taux.tva` |
| §14 — net à payer | **Fait.** `cascade.netAPayer` |
| §17 — identifiant stable | **Partiel.** `ligne.id` = identifiant d'ouvrage (`semelles`, `longrines`) — voir manque n°3 |
| Second œuvre en forfaits | **Fait.** 7 forfaits (menuiseries, plomberie, électricité, revêtement, peinture, aménagement extérieur, étanchéité), prix saisi, avertissement « Prix a saisir » si vide |
| Installation et repli de chantier | **Fait.** Ligne forfait `ameneeEtRepliForfait` en tête du terrassement |
| Sous-détail de prix | **Existe.** `genererSousDetailPrix(blocId, blocDonnees, regles, bibliothequePrix)` retourne `{ debourseMateriaux, tauxMainOeuvre, debourseMainOeuvre, prixVenteUnitaire, composantes, ratioAcier, avertissements }` |

## A-bis. ⚠️ Le Devis Entreprise ne lit pas le Résumé aujourd'hui

`genererDevisEntreprise` reçoit `metreParNiveau` (le métré brut) et lit directement `metre.blocs[…].total`, en appelant lui-même `genererResumeFondation` pour la partie fondation. Il ne passe donc **jamais** par le Résumé affiché à l'écran.

Et ce Résumé, lui, est calculé par un **autre code** : `genererResumeProjet()` (`resumeMetre.js`), qui s'appuie sur `obtenirDecompositionOuvrage()` (`recettes.js`) — pas sur `resume.js`.

| Chemin | Fonction | Qui l'utilise |
|---|---|---|
| **A** | `obtenirDecompositionOuvrage()` — `recettes.js` | le **Résumé** (`EtapeResume.jsx`) et la **Note de Calcul** |
| **B** | `genererResumeFondation / Elevation / …` — `resume.js` | le **Devis Entreprise** et le **Devis Particulier** |

Rien ne garantit que A et B donnent le même chiffre. C'est précisément ce que la règle du §1 supprime.

### La cible

`genererResumeProjet()` porte déjà, dans un seul objet, les deux lectures du §2 :

```js
{
  levels: [
    { id, name, type,
      categories: [ { id: blocId, name, unite, quantite, materials: [...] } ],  // ← OUVRAGES → Devis Entreprise
      totals: { materials: {...} } }
  ],
  totals: { materials: { <id>: { id, nom, categorie, unite, quantite } } }      // ← MATÉRIAUX → Devis Particulier
}
```

`categories[].quantite` + `categories[].unite`, c'est exactement le m³ et le m² que vend le Devis Entreprise. La structure existe déjà ; ce sont les devis qui ne s'y branchent pas.

Refonte attendue :

```
AVANT  metreParNiveau ─→ genererDevisEntreprise()   (blocs bruts + resume.js)
APRÈS  metreParNiveau ─→ genererResumeProjet() ─→ RÉSUMÉ ─→ genererDevisEntreprise(resume, …)
```

`genererDevisEntreprise` ne doit plus recevoir `metreParNiveau`, ni importer `resume.js` ou `metre.js`. Sa seule entrée devient le Résumé — c'est cette signature qui rend la règle vérifiable plutôt que déclarative.

### Ce qu'il faut d'abord ajouter au Résumé

`genererResumeProjet()` ne transporte aujourd'hui que les ouvrages et les matériaux. Pour ce devis il lui manque : les **volumes de terrassement** (déblais, remblais, évacuation, via `calculerTerrassement()`), les **aciers**, les **dosages réellement choisis** par l'utilisateur (indispensables aux désignations du §3), et le **lot + ordre** de chaque ouvrage.

### Avertissement

La bascule **changera des montants** partout où les deux chemins divergent. C'est le but, mais il faut le **mesurer** : devis de référence avant, comparaison ligne à ligne après, et chaque écart expliqué. Un écart non expliqué est un bug, pas un progrès.

## B. Les manques réels

### 1. ⚠️ Le prix de vente est en réalité un déboursé sec — l'entreprise vend à perte

C'est le manque le plus grave, et il porte sur l'argent.

Dans `genererSousDetailPrix`, à la fin :

```js
const debourseMainOeuvre = debourseMateriaux * tauxMainOeuvre;   // 28% gros œuvre, 22% finition
const prixVenteUnitaire  = Math.round(debourseMateriaux + debourseMainOeuvre);
```

Le champ s'appelle `prixVenteUnitaire`, mais **il ne contient que matériaux + main d'œuvre**. Il n'y a **ni frais de chantier, ni frais généraux, ni bénéfice, ni aléas** — donc aucun coefficient K (§13b). Une entreprise qui utilise ce devis facture son prix de revient : elle ne gagne rien et perd sur le moindre aléa.

À faire : introduire le coefficient K et renommer les champs pour dire la vérité :

```js
debourseSec        = debourseMateriaux + debourseMainOeuvre (+ matériel)
coefficientK       = 1 + fraisChantier + fraisGeneraux + beneficeEtAleas
prixVenteUnitaire  = debourseSec × coefficientK
```

Les trois taux vont dans `taux` (`ProjetContext`, clé `df_taux_v3`, valeurs par défaut dans `REGLES_DEFAUT.taux`), comme les taux du Devis Particulier, donc paramétrables sans code supplémentaire (§13c).

**Ne pas changer ces montants sans arbitrage du fondateur** : passer d'un déboursé sec à un prix de vente augmente mécaniquement tous les devis entreprise déjà établis. Ce sont les valeurs par défaut des trois taux qu'il faut lui faire valider.

### 2. Les dosages affichés sont écrits en dur, alors que l'utilisateur les choisit

Le code écrit `'Beton de proprete dose 150'` et `'Beton de sous-pavement dose 250'` comme texte fixe, alors que l'utilisateur règle réellement ses dosages dans l'interface (`parametresProjet.dosageBP`, `dosageSemelles`, `dosageLongrines`, `dosageColonnes`, `dosageDalles`…). Un utilisateur qui dose son béton de propreté à 200 kg/m³ voit malgré tout « dosé 150 » sur son devis.

Pire : semelles, longrines et poteaux n'affichent aucun dosage, alors que le §3 en demande un.

À faire : composer la désignation à partir du dosage réel du projet. C'est aussi une exigence du §24 (aucune valeur en dur).

### 3. L'identifiant de ligne ne distingue pas le niveau

`ligne.id` vaut `colonnes`, `maconnerie`… sans le niveau. Or le §17 demande qu'un poteau du RDC et un poteau de l'étage soient deux lignes distinctes, avec deux prix possibles. Aujourd'hui, un prix saisi pour les poteaux s'appliquerait aux deux.

À faire : clé `<niveauId>_<ouvrage>` pour les prix saisis en Devis Entreprise, en préservant les prix déjà enregistrés lors de la migration.

### 4. Libellés sans accents

`Beton`, `proprete`, `tranchee`, `Evacuation`, `Amenagement`, `Electricite`, `Interieure`… Les désignations sont en ASCII non accentué dans tout `genererDevisEntreprise`. Sur un devis imprimé destiné à un client, c'est un défaut visible. Le §20 l'exige explicitement.

### 5. Les manques partagés avec le Devis Particulier

Ils sont décrits en détail dans `PROMPT-ANTIGRAVITY-DEVIS-PARTICULIER.md`, Partie 2, et valent identiquement ici :

- colonne `N°` absente de la feuille Excel (`univerAdapter.js`), et formule du P.T. à décaler ;
- **numérotation automatique inexistante** pour le Devis Entreprise (même la vue HTML ne la fait que pour le Particulier) ;
- le P.U. modifié dans Excel ne remonte nulle part (`TableurDevis.jsx`, prop `onSave` jamais utilisée) ;
- aucune configuration d'impression ;
- trois rendus indépendants du même devis, alors que le §22 en demande un seul.

**Conséquence directe pour ce chantier : traiter les deux devis ensemble.** Le renderer unique du §22, l'écriture inverse du P.U. et la configuration d'impression doivent être écrits une seule fois et servir aux deux. Les faire deux fois serait exactement l'erreur que les §22 des deux documents interdisent.

## C. Ce qui reste à faire trancher par le fondateur

1. **Valeurs par défaut des trois taux d'entreprise** : frais de chantier %, frais généraux %, bénéfice et aléas %. Ils déterminent le coefficient K, donc le prix de vente de chaque ouvrage.
2. **Le matériel** (bétonnière, vibreur, échafaudage) entre-t-il dans le déboursé sec, ou est-il couvert par les frais de chantier ? Le code ne calcule aucun déboursé matériel aujourd'hui.
3. **Taux de main d'œuvre** : le code applique 28 % du déboursé matériaux en gros œuvre et 22 % en finition. À confirmer, et à rendre paramétrable comme les autres.

## D. Ordre de travail recommandé

À faire **après** ou **en même temps** que le chantier Devis Particulier, en partageant tout ce qui peut l'être :

0. **Brancher les deux devis sur `genererResumeProjet()` enrichi** (point A-bis) — préalable commun aux deux devis, à faire une seule fois. Mesurer les écarts avant/après.
1. Coefficient K et renommage des champs du sous-détail (manque n°1) + tests moteur.
2. Désignations composées avec les dosages réels du projet (manque n°2).
3. Numérotation par lot, partagée avec le Devis Particulier (`construireLignesDevis()`).
4. Identifiants de ligne préfixés par le niveau (manque n°3) + migration des prix.
5. Correction des libellés accentués (manque n°4).
6. Colonne `N°`, écriture inverse du P.U., impression, exports — **une seule fois pour les deux devis**.

Après chaque étape : vérifier que le Devis Entreprise et le Devis Particulier ne divergent sur aucune quantité (§15), et lancer `npm test` dans `packages/moteur`.
