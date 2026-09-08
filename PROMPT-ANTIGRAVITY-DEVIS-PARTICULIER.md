# Devis Particulier — algorithme et annexe technique

Ce document a **deux parties strictement séparées** :

- **PARTIE 1 — ALGORITHME DU FONDATEUR.** C'est la spécification. Elle fait autorité. Elle n'a pas été modifiée : même ordre des 25 sections, même ordre des 10 lots, mêmes pourcentages.
- **PARTIE 2 — ANNEXE TECHNIQUE.** Relevé de l'état réel du code, écrit par Claude. C'est une aide au repérage, **pas** une modification de la spécification. En cas de contradiction, la Partie 1 gagne.

---
---

# PARTIE 1 — ALGORITHME DU FONDATEUR

## 1. OBJECTIF

Dans mon SaaS, une interface Excel est déjà intégrée.

Cette interface contient notamment les onglets : Devis Particulier, Devis Entreprise, Note de Calcul, Métré, Paramètres. Un onglet Résumé est également en cours de développement.

Je veux maintenant connecter le système afin que :

```
RÉSUMÉ
   ↓
MOTEUR DE GÉNÉRATION
   ↓
DEVIS PARTICULIER
   ↓
INTERFACE EXCEL EXISTANTE
   ↓
EXPORT / IMPRESSION
```

Le Devis Particulier doit être généré automatiquement à partir des informations disponibles dans Résumé.

NE PAS créer une nouvelle interface Excel.
NE PAS créer une nouvelle feuille indépendante.
Utiliser l'interface Excel déjà présente dans le SaaS.

### Cet algorithme remplace le Devis Particulier existant

Il ne s'ajoute pas à côté. Le Devis Particulier qui se trouve aujourd'hui dans l'application doit être **transformé** pour suivre cet algorithme. À la fin du travail il ne doit exister qu'**un seul** Devis Particulier dans l'application : celui-ci. Pas d'ancienne version conservée en parallèle, pas de second générateur.

Il en va de même pour le Devis Entreprise, décrit dans son propre document. Les deux devis de l'application sont remplacés par les deux algorithmes.

## 2. RÔLE DE L'ONGLET RÉSUMÉ

### Règle absolue : le Résumé est la seule source

**Les deux devis ne puisent leurs informations que dans le Résumé. Rien d'autre.**

Le Devis Particulier ne lit pas le métré. Il ne lit pas les blocs de saisie. Il ne recalcule aucune quantité. Il lit le Résumé, et uniquement le Résumé.

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

Les deux devis lisent le **même** Résumé, mais n'y prennent pas la même chose :

- le **Devis Particulier** prend les **détails**, c'est-à-dire les matériaux : ciment, sable, gravier, eau, bois, clous, aciers, agglos, moellons ;
- le **Devis Entreprise** prend plutôt les **mètres cubes et les mètres carrés** des ouvrages.

C'est la même information vue de deux façons. Si les deux devis affichent des quantités qui ne concordent pas, c'est un bug : il ne peut y avoir qu'une seule vérité, celle du Résumé.

### Ce que le Résumé doit fournir

Il doit fournir au minimum : Catégorie / Lot, Ordre du lot, Désignation, Unité, Quantité, Informations complémentaires nécessaires.

Exemple :

```
FONDATION
    Ciment, Gravier, Sable, Eau, Bois de coffrage, Clous,
    Armature HA10, Armature HA8, Fil à ligaturer, Moellon

ÉLÉVATION
    Blocs, Ciment, Gravier, Sable, Eau, ...
```

Le moteur récupère ces informations et les transforme automatiquement en lignes du Devis Particulier.

## 3. ORDRE OBLIGATOIRE

Le moteur doit classer les informations provenant de Résumé dans l'ordre chronologique suivant :

```
1  INSTALLATION CHANTIER
2  DÉBLAIS
3  REMBLAIS
4  FONDATION
5  ÉLÉVATION
6  DALLE
7  FINITION
8  CHARPENTE
9  COUVERTURE
10 PIEDS DROIT
```

Puis : **TOTAL**

Puis les frais :

```
11  Imprévue 5%
12  Transport des matériaux 5%
13  Main d'œuvre 30%
14  Honoraire de l'Architecte 8%
15  Honoraire de l'Ingénieur 8%
```

Puis : **TOTAL GÉNÉRAL**

Cet ordre doit être imposé par le moteur, même si les données du Résumé sont enregistrées dans un ordre différent. Utiliser un champ `ordre` pour chaque catégorie.

### Précision du fondateur sur les lots 1, 2 et 3

**Lot 1 — INSTALLATION CHANTIER : c'est un forfait saisi par l'utilisateur.**

Ce n'est pas une quantité calculée à partir du métré. C'est l'utilisateur qui décide du montant de son installation de chantier et qui le saisit lui-même.

- Il doit pouvoir le **paramétrer au départ**, dans les paramètres du SaaS. C'est la façon recommandée.
- Il doit **aussi** pouvoir le modifier ensuite **directement dans Excel**, comme n'importe quel prix unitaire.
- Quand l'utilisateur clique sur « Modifier le devis », il doit être ramené dans l'interface Excel pour y faire cette modification.
- Une fois saisi, ce montant entre dans les prix comme les autres lignes : il compte dans le TOTAL, donc dans les frais et dans le TOTAL GÉNÉRAL.

Forme de la ligne : quantité `1`, unité `forfait`, P.U. = le montant saisi, P.T. = ce même montant.

**Lots 2 et 3 — DÉBLAIS et REMBLAIS : à créer dans le tableau, au niveau du terrassement.**

Les déblais et les remblais doivent apparaître dans le tableau du devis au niveau du terrassement : il faut y créer les lignes et les colonnes correspondantes, comme pour les autres ouvrages.

Les quantités viennent du terrassement déjà calculé (elles sont déjà affichées dans le Résumé). Le prix se saisit comme les autres prix unitaires : paramétrable au départ, modifiable dans Excel.

**L'évacuation des terres se place dans le lot 2 (DÉBLAIS), en deuxième ligne.** Elle est calculée et déjà affichée dans le Résumé. Les trois lignes de terrassement sont donc :

```
2 DÉBLAIS
2.1 Déblais                              m³
2.2 Évacuation des terres excédentaires  m³

3 REMBLAIS
3.1 Remblais                             m³
```

L'évacuation appartient au lot Déblais parce qu'elle en est la suite directe : on creuse, on réutilise ce qu'on peut en remblai, et on évacue l'excédent. C'est une opération de terrassement facturée au m³, pas un lot à part.

## 4. STRUCTURE DU DEVIS PARTICULIER

Le Devis Particulier doit reproduire la structure de la première image de référence.

En-tête : **BORDEREAU QUANTITATIF ET ESTIMATIF DES TRAVAUX D'UN BÂTIMENT**

Puis le tableau :

```
┌─────┬────────────────────────┬────────┬──────────┬──────────┬────────────┐
│ N°  │ DESIGNATION            │ UNITE  │ QTTE     │ P.U.     │ P.T.       │
├─────┼────────────────────────┼────────┼──────────┼──────────┼────────────┤
```

Les colonnes doivent être : N°, DESIGNATION, UNITE, QTTE, P.U., P.T.

## 5. TRANSFORMATION DES DONNÉES DU RÉSUMÉ

Pour chaque élément du Résumé :

```
Résumé
   ↓
Identifier le lot
   ↓
Identifier la position du lot
   ↓
Récupérer désignation
   ↓
Récupérer unité
   ↓
Récupérer quantité
   ↓
Créer la ligne correspondante dans Devis Particulier
```

Exemple. Si Résumé contient : Lot `FONDATION`, Désignation `Ciment`, Unité `sac`, Quantité `68`, le Devis Particulier doit automatiquement produire :

```
4.1 | Ciment  | sac    | 68 | [prix] | [montant]
4.2 | Gravier | tonne  | 20 | [prix] | [montant]
4.3 | Sable   | tonne  | 15 | [prix] | [montant]
```

## 6. NUMÉROTATION AUTOMATIQUE

La numérotation doit être générée automatiquement à partir du numéro du lot.

```
4 FONDATION
4.1 Ciment      4.2 Gravier     4.3 Sable       4.4 Eau        4.5 Bois de coffrage
4.6 Clous       4.7 Armature HA10   4.8 Armature HA8   4.9 Fil à ligaturer   4.10 Moellon

5 ÉLÉVATION
5.1 Blocs       5.2 Ciment      5.3 Gravier     5.4 Sable      ...

6 DALLE
6.1 Ciment      6.2 Gravier     6.3 Sable       ...
```

Ne jamais demander à l'utilisateur de saisir ces numéros.

## 7. LES QUANTITÉS VIENNENT DU RÉSUMÉ

La quantité affichée dans Devis Particulier doit être récupérée automatiquement depuis Résumé.

`Résumé : Ciment → 68 sacs` devient `Devis Particulier : Ciment | sac | 68`.

Si le Résumé change (68 → 75), le Devis Particulier doit pouvoir être actualisé pour afficher 75. Ne pas recopier manuellement les quantités.

## 8. LE PRIX UNITAIRE DOIT ÊTRE MODIFIABLE DANS EXCEL

C'est une exigence très importante.

Dans l'interface Excel existante, l'utilisateur doit pouvoir cliquer sur la cellule **P.U.** et modifier le prix.

Exemple : Ciment, Quantité = 68, P.U. = 5 000. L'utilisateur peut changer P.U. = 5 500. Le système recalcule immédiatement : `P.T. = 68 × 5 500 = 374 000 FCFA`.

## 9. PRIX TOTAL

Pour chaque ligne : `P.T. = QTTE × P.U.`

Le P.T. doit être calculé automatiquement. Si QTTE = 68 et P.U. = 5 000, alors P.T. = 340 000 FCFA. Si l'utilisateur change le P.U. à 5 500, le P.T. devient automatiquement 374 000 FCFA.

## 10. IMPORTANT : DISTINGUER QUANTITÉ CALCULÉE ET PRIX COMMERCIAL

Créer une séparation logique entre :

**Données techniques** — issues du Résumé : Désignation, Unité, Quantité, Lot, Ordre.

**Données commerciales** — modifiables directement dans le Devis Particulier : Prix unitaire.

**Données calculées** — Prix total, Sous-total, Total, Frais, Total général.

Cela permet de conserver l'intégrité des calculs techniques tout en laissant l'utilisateur adapter ses prix.

## 11. SOUS-TOTAL APRÈS CHAQUE LOT

Après chaque catégorie, générer automatiquement **SOUS TOTAL**.

```
4 FONDATION
4.1 Ciment   4.2 Gravier   4.3 Sable   4.4 Eau   4.5 Bois de coffrage   ...
SOUS TOTAL 2
```

Le sous-total doit être la somme de tous les P.T. appartenant au lot.

## 12. TOTAL DES TRAVAUX

Après le dernier lot : **TOTAL**

```
TOTAL = Sous-total Fondation + Sous-total Élévation + Sous-total Dalle
      + Sous-total Finition + Sous-total Charpente + Sous-total Couverture
      + Sous-total Pieds droit + autres lots éventuels
```

Ne jamais additionner deux fois les mêmes lignes.

## 13. FRAIS APRÈS LE TOTAL

Après le TOTAL, générer :

```
11 Imprévue 5%                   = TOTAL × 5%
12 Transport des matériaux 5%    = TOTAL × 5%
13 Main d'œuvre 30%              = TOTAL × 30%
14 Honoraire de l'Architecte 8%  = TOTAL × 8%
15 Honoraire de l'Ingénieur 8%   = TOTAL × 8%
```

**Les pourcentages doivent provenir des paramètres du SaaS afin d'être modifiables.**

### Précision du fondateur sur les frais

Ces pourcentages doivent être **paramétrables dès le départ** : l'utilisateur peut décider de mettre ses propres pourcentages. Les valeurs ci-dessus (5 %, 5 %, 30 %, 8 %, 8 %) sont des valeurs par défaut, pas des constantes.

Dans le **Devis Particulier**, on n'ajoute pas les frais de chantier ni les frais généraux. Ce type de frais (frais de chantier, frais généraux) relève du **Devis Entreprise**, et c'est là qu'il doit être traité. Le Devis Particulier reste la feuille commerciale simple : lots, quantités, prix unitaires, les frais ci-dessus, total général.

## 14. TOTAL GÉNÉRAL

```
TOTAL GÉNÉRAL = TOTAL + Imprévue + Transport + Main d'œuvre + Architecte + Ingénieur
```

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

Le Résumé ne doit pas être une copie du Devis Particulier. Le Devis Particulier est une vue commerciale générée à partir des données du projet.

## 16. ACTUALISATION

Prévoir une fonction « Actualiser le devis », ou un mécanisme automatique permettant de reconstruire le Devis Particulier lorsque les données techniques du Résumé changent.

**À récupérer du Résumé :** Lots, Désignations, Unités, Quantités, Ordre.

**À conserver dans le Devis Particulier :** Prix unitaires personnalisés, si l'utilisateur les a déjà renseignés, lorsque la ligne correspondante existe toujours.

Ainsi, si l'utilisateur avait indiqué `Ciment → 5 500 FCFA`, une simple actualisation des quantités ne doit pas effacer son prix.

## 17. IDENTIFIANT UNIQUE DES LIGNES

Pour éviter de perdre les prix unitaires personnalisés, chaque ligne doit posséder un identifiant stable :

```
FOUNDATION_CIMENT, FOUNDATION_GRAVIER, FOUNDATION_SABLE,
ELEVATION_BLOCS, ELEVATION_CIMENT, DALLE_CIMENT
```

Le numéro visuel (4.1, 4.2, 4.3) peut changer. L'identifiant interne doit rester stable. Ainsi, si une ligne passe de 4.3 à 4.2, son prix personnalisé ne disparaît pas.

## 18. CAS D'UNE NOUVELLE LIGNE

Si Résumé ajoute `FONDATION / Acier HA12 / barre / 25`, le Devis Particulier doit automatiquement ajouter `4.X | Acier HA12 | barre | 25 | [P.U.] | [P.T.]` et recalculer le Sous-total Fondation, le TOTAL et le TOTAL GÉNÉRAL.

## 19. CAS D'UNE SUPPRESSION

Si une ligne disparaît du Résumé (`4.5 Bois de coffrage`), elle doit disparaître du Devis Particulier après synchronisation. La numérotation est ensuite reconstruite (4.1, 4.2, 4.3, 4.4, 4.5…) sans numéro manquant.

## 20. RENDU VISUEL — REPRODUIRE LA PREMIÈRE IMAGE

Le résultat doit respecter la logique visuelle de la première image fournie. Il faut notamment : tableau propre ; bordures visibles ; colonnes correctement dimensionnées ; titres de lots distincts ; sous-totaux clairement visibles ; total mis en évidence ; total général mis en évidence ; nombres correctement alignés ; unités correctement alignées ; prix en FCFA ; désignations lisibles ; aucune colonne inutile ; aucun élément qui déborde.

Le rendu doit être professionnel aussi bien à l'écran, dans Excel, dans l'aperçu avant impression, dans le PDF et sur papier.

## 21. IMPRESSION

L'interface Excel existante doit être configurée pour que le Devis Particulier puisse être imprimé proprement.

Configurer automatiquement : Format A4 ; Orientation selon largeur nécessaire ; Marges adaptées ; Zone d'impression ; Répétition de l'en-tête ; Pagination ; Largeur des colonnes ; Hauteur des lignes.

Si le devis dépasse une page, le tableau doit continuer proprement (PAGE 1, PAGE 2, PAGE 3…). L'en-tête `N° | DESIGNATION | UNITE | QTTE | P.U. | P.T.` doit pouvoir être répété sur les pages suivantes.

## 22. EXPORT

Le même modèle doit servir pour : Aperçu Excel, Export Excel, Export PDF, Impression.

Il ne faut pas créer quatre systèmes de mise en page différents. La source doit être :

```
DATA MODEL
    ↓
TABLE RENDERER
    ↓
Excel / PDF / Print
```

Ainsi, les chiffres et la structure restent identiques partout.

## 23. ARCHITECTURE RECOMMANDÉE

```
PROJECT DATA
     │
     ↓
SUMMARY DATA
     │
     ↓
QUOTE BUILDER
     │
     ├── Sort lots
     ├── Generate numbers
     ├── Generate rows
     ├── Preserve custom prices
     ├── Calculate P.T.
     ├── Calculate subtotals
     ├── Calculate total
     ├── Calculate charges
     └── Calculate grand total
             │
             ↓
      DEVIS PARTICULIER
             │
             ↓
      EXISTING EXCEL UI
             │
       ┌─────┼─────┐
       ↓     ↓     ↓
     XLSX   PDF   PRINT
```

## 24. RÈGLE ABSOLUE

Ne pas hardcoder les valeurs de l'image. L'image sert uniquement de modèle de structure et de présentation. Les données doivent venir du projet réel.

Ne jamais écrire directement dans le code : `Ciment = 68`, `Gravier = 20`, `Sable = 15`.

Le système doit faire : `Résumé → rechercher Ciment → récupérer quantité → générer ligne`.

## 25. CRITÈRE DE RÉUSSITE

Le développement sera considéré comme réussi uniquement si le scénario suivant fonctionne :

1. L'utilisateur crée son projet.
2. Les calculs alimentent l'onglet Résumé.
3. Résumé contient les lots, désignations, unités et quantités.
4. L'utilisateur ouvre « Devis Particulier ».
5. Le système récupère automatiquement les données de Résumé.
6. Les lots sont classés dans l'ordre : Installation → Déblais → Remblai → Fondation → Élévation → Dalle → Finition → Charpente → Couverture → Pieds droit.
7. Les lignes sont automatiquement numérotées.
8. Les quantités apparaissent automatiquement.
9. L'utilisateur saisit/modifie les prix unitaires directement dans Excel.
10. Les prix totaux se recalculent automatiquement.
11. Les sous-totaux se calculent automatiquement.
12. Le total des travaux se calcule.
13. Les frais se calculent.
14. Le total général se calcule.
15. L'utilisateur peut imprimer directement depuis l'interface.
16. L'utilisateur peut exporter en Excel/PDF.
17. Le rendu final doit correspondre à la structure de la première image.

## ARCHITECTURE FINALE À RETENIR

```
                     ┌─────────────────┐
                     │      RÉSUMÉ     │
                     │ Lots            │
                     │ Désignations    │
                     │ Unités          │
                     │ Quantités       │
                     └────────┬────────┘
                              ↓
                  ┌─────────────────────┐
                  │  MOTEUR DE DEVIS    │
                  │ Classement          │
                  │ Numérotation        │
                  │ Calculs             │
                  │ Sous-totaux         │
                  │ Totaux              │
                  └──────────┬──────────┘
                             ↓
              ┌──────────────────────────┐
              │    DEVIS PARTICULIER     │
              │ N° | Désignation | Unité │
              │    | Qté | PU | PT       │
              │ Modifiable dans Excel    │
              └────────────┬─────────────┘
                           ↓
                 ┌──────────────────┐
                 │ EXPORT / PRINT   │
                 │ Excel            │
                 │ PDF              │
                 │ Impression       │
                 └──────────────────┘
```

C'est exactement cette logique qu'il faut implémenter : Résumé → génération automatique du Devis Particulier → modification des prix dans l'interface Excel → calculs → impression.

Antigravity doit travailler sur l'interface Excel existante, au lieu de reconstruire un autre tableau à côté.

---
---

# PARTIE 2 — ANNEXE TECHNIQUE (relevé de l'état du code)

Cette partie n'est **pas** une modification de la Partie 1. C'est un relevé de ce qui existe déjà dans le dépôt, pour éviter de reconstruire un moteur parallèle. La Partie 1 fait autorité.

## A. Ce qui est déjà implémenté

| Point de l'algorithme | Où c'est déjà fait |
|---|---|
| §1, §2, §5 — chaîne Résumé → Moteur → Devis | `packages/moteur/src/valorisation.js` → `genererDevisParticulier(input, regles, bibliothequePrix, bibliothequeLibelles)`, qui appelle déjà `genererResumeFondation / Elevation / Finition / Plancher / Toiture` de `resume.js` |
| Structure de sortie | `{ lots: { <lotId>: { titre, lignes, sousTotal } }, cascade: {...}, total, enToutesLettres }` |
| Structure d'une ligne | `{ id, designation, unite, quantite, pu, pt, avertissements }` |
| §17 — identifiant stable | `ligne.id` (identifiant matériau : `ciment`, `sable`, `acierHA_12`) |
| §16 — prix personnalisés persistants | `bibliothequePrix` / `bibliothequePrixNumerique` dans `packages/app/src/context/ProjetContext.jsx` (clé `df_bibliothequePrix_v3`), indexés par ce même `id` |
| §11 — sous-totaux | `lot.sousTotal` |
| §12, §13, §14 — total, frais, total général | objet `cascade` |
| §13 — pourcentages paramétrables | `taux` dans `ProjetContext` (`df_taux_v3`), issus de `REGLES_DEFAUT.taux` — déjà modifiables par l'utilisateur |
| §6 — numérotation 4.1 / 4.2 | déjà faite dans la vue HTML : `packages/app/src/components/sections/TableauDevis.jsx` |
| §1 — feuille Excel alimentée | `packages/app/src/utils/univerAdapter.js` → `generateWorkbookData()` |
| Interface Excel | `packages/app/src/components/sections/TableurDevis.jsx` (Univer), page `packages/app/src/pages/EditeurAvance.jsx` |
| §22 — exports | `packages/app/src/hooks/useExport.js` → `exporterDevisPDF()`, `exporterDevisExcel()` |
| §7, §18, §19 — régénération automatique | `packages/app/src/hooks/useDevis.js`, mémoïsé sur le métré |

## A-bis. ⚠️ Le Résumé et les devis ne passent pas par le même calcul aujourd'hui

C'est la découverte la plus importante de ce relevé, et elle commande le §2.

Il existe dans le moteur **deux chemins parallèles** pour calculer les matériaux d'un ouvrage :

| Chemin | Fonction | Qui l'utilise |
|---|---|---|
| **A** | `obtenirDecompositionOuvrage()` dans `packages/moteur/src/recettes.js` | `resumeMetre.js` → `genererResumeProjet()` → **le Résumé** (`EtapeResume.jsx`), et **la Note de Calcul** (`noteDeCalcul.js`) |
| **B** | `genererResumeFondation / Elevation / Finition / Plancher / Toiture` dans `packages/moteur/src/resume.js` | `valorisation.js` → **le Devis Particulier** et **le Devis Entreprise** |

Autrement dit : **l'écran Résumé et les deux devis sont calculés par deux codes différents.** Rien ne garantit qu'ils donnent le même chiffre. Le client peut lire une quantité de ciment dans le Résumé et une autre dans son devis, sans qu'aucune erreur ne soit signalée nulle part.

C'est exactement ce que la règle du §2 supprime.

### La cible : `genererResumeProjet()` devient l'entrée unique des deux devis

Cette fonction existe déjà (`packages/moteur/src/resumeMetre.js`) et produit déjà, dans un seul objet, les **deux** lectures demandées au §2 :

```js
{
  levels: [
    {
      id, name, type,
      categories: [               // ← les OUVRAGES → Devis Entreprise
        { id: blocId, name, unite, quantite, materials: [...] }
      ],
      totals: { materials: {...} }
    }
  ],
  totals: {
    materials: {                  // ← les MATÉRIAUX → Devis Particulier
      <id>: { id, nom, categorie, unite, quantite }
    }
  }
}
```

Refonte attendue :

```
AVANT
  metreParNiveau ─→ genererDevisParticulier()   (lit les blocs bruts + rappelle resume.js)
  metreParNiveau ─→ genererDevisEntreprise()    (lit les blocs bruts + rappelle resume.js)

APRÈS
  metreParNiveau ─→ genererResumeProjet() ─→ RÉSUMÉ ─┬─→ genererDevisParticulier(resume, …)
                                                     └─→ genererDevisEntreprise(resume, …)
```

Les deux générateurs de devis ne doivent plus jamais recevoir `metreParNiveau`, ni importer quoi que ce soit de `resume.js` ou de `metre.js`. Leur seule entrée devient l'objet Résumé. C'est cette signature qui rend la règle du §2 vérifiable au lieu d'être une bonne intention.

### Ce qu'il faut d'abord ajouter au Résumé

`genererResumeProjet()` ne transporte aujourd'hui que les ouvrages et les matériaux. Pour devenir la source unique, il doit aussi porter :

1. **les aciers** (aujourd'hui dans `resume*.aciers` : `lignes[].nombreBarres12m`, `diametre`, `nuance`) ;
2. **les volumes de terrassement** : déblais, remblais, évacuation (aujourd'hui produits par `calculerTerrassement()` dans `terrassement.js`, atteints via `genererResumeFondation`) ;
3. **les dosages réellement choisis** par l'utilisateur (`parametresProjet.dosageBP`, `dosageSemelles`, `dosageLongrines`, `dosageColonnes`, `dosageDalles`…), nécessaires aux désignations du Devis Entreprise ;
4. **le lot et l'ordre** de chaque élément (§3), pour que le classement ne soit plus recalculé dans chaque devis.

### Avertissement à ne pas négliger

Basculer les devis sur le chemin A **va changer des montants** partout où les deux chemins divergent aujourd'hui. C'est le but — mais cela doit être **mesuré, pas découvert par un client**.

Marche à suivre : avant la bascule, produire un devis de référence sur un projet complet et enregistrer ses totaux ; après la bascule, comparer ligne à ligne et **expliquer chaque écart**. Un écart non expliqué est un bug, pas un progrès. C'est aussi l'occasion de vérifier que les deux régimes de pertes du projet sont bien respectés : `Q = Q_net / (1 − P)` pour les consommables (ciment, sable, gravier, mortier, béton) et `Q = Q_net × (1 + P)` pour les pièces (agglos, carrelage, plinthes, aciers).

## B. Les 7 manques réels

1. **Le lot Terrassement est ignoré.** `valorisation.js` : `if (cat === 'terrassement' || cat === 'fondation') continue;` puis `if (lot === 'terrassement') continue;`. Conséquence : aucune ligne Installation chantier / Déblais / Remblais n'apparaît aujourd'hui — ce sont les lots 1, 2, 3 du §3.
2. **L'ordre des lots ne correspond pas au §3.** Ordre actuel : `terrassement → fondation → elevation → plancher → charpente → couverture → finition → toiture_terrasse`. Il faut notamment remonter Finition avant Charpente, scinder Terrassement en trois lots, et créer Pieds droit.
3. **Le lot « Pieds droit » n'existe nulle part** dans le moteur — définition à demander au fondateur avant toute implémentation. Ne rien inventer.
4. **La colonne `N°` manque dans la feuille Excel.** `univerAdapter.js` commence à Désignation. En insérant la colonne, décaler la formule du P.T. de `=C{n}*D{n}` vers `=D{n}*E{n}`.
5. **Le P.U. modifié dans Excel ne remonte nulle part** (§8). `TableurDevis.jsx` accepte une prop `onSave` jamais utilisée, et `EditeurAvance.jsx` affiche lui-même : « Les modifications faites ici ne sont pas encore reliées au métré ni sauvegardées automatiquement. »
6. **Aucune configuration d'impression** (§21) nulle part.
7. **Le §22 est déjà violé** : trois rendus indépendants construisent chacun leur mise en page à partir du même devis — `TableauDevis.jsx` (HTML), `univerAdapter.js` (Univer), `useExport.js` (PDF + XLSX).

## C. Comment câbler le §8 sans casser le §16

Architecture recommandée pour rendre le P.U. modifiable dans Excel :

```
Édition de la cellule P.U. dans Univer
        ↓
Retrouver la ligne éditée → récupérer son `id` de ligne devis
        ↓
setBibliothequePrix({ ...bibliothequePrix, [id]: nouvelleValeur })    ← ProjetContext
        ↓
useDevis() régénère le devis (mémoïsation déjà en place)
        ↓
La feuille se met à jour
```

Le prix ne doit pas vivre dans la cellule Excel : la source de vérité est `bibliothequePrix`, déjà persisté. C'est ce choix qui fait tenir le §16 (le prix survit à un changement de quantité) et le §17 (identifiant stable) sans code de fusion supplémentaire.

Pour retrouver l'`id` depuis une cellule éditée, `univerAdapter.js` doit produire, à côté de `cellData`, une table `{ numeroLigneExcel → idLigneDevis }` transmise à `TableurDevis.jsx`. Ne pas deviner l'id à partir du libellé affiché.

Le P.T. doit rester une **formule Excel** (`=D{n}*E{n}`), pas une valeur figée, pour un recalcul immédiat dans la feuille.

## D. Comment satisfaire le §22

Extraire une fonction unique, par exemple `construireLignesDevis(devis, lots)`, produisant la liste ordonnée et numérotée :

```js
[
  { type: 'lot',          numero: '4',   libelle: 'FONDATION' },
  { type: 'ligne',        numero: '4.1', id: 'ciment', designation: 'Ciment',
    unite: 'sac', quantite: 68, pu: 5000, pt: 340000 },
  { type: 'sousTotal',    libelle: 'SOUS TOTAL', montant: 1234567 },
  { type: 'total',        libelle: 'TOTAL', montant: 0 },
  { type: 'frais',        numero: '11', libelle: 'Imprévue 5%', montant: 0 },
  { type: 'totalGeneral', libelle: 'TOTAL GÉNÉRAL', montant: 0 },
]
```

Les quatre sorties (HTML, Univer, PDF, XLSX) consomment cette liste. Elles ne diffèrent alors que par le style, jamais par les chiffres ni par l'ordre.

Le numéro de lot doit venir du champ `ordre` du §3, **pas** de l'index de position parmi les lots affichés — sinon un lot vide masqué décale toute la numérotation (défaut actuel de `TableauDevis.jsx`, qui utilise `index + 1`).

## E. Points à faire trancher par le fondateur

1. **Base de calcul des honoraires.** Le §13 dit : Architecte = TOTAL × 8 %, Ingénieur = TOTAL × 8 %, où TOTAL est le total des lots. Le moteur actuel les calcule sur `totalTravaux` (= matériaux + imprévus + transport + main d'œuvre), et son taux de main d'œuvre par défaut est 28 % au lieu de 30 %. Sur 1 000 000 FCFA de lots : **1 560 000 FCFA selon le §13, contre 1 600 800 FCFA avec le moteur actuel** — 40 800 FCFA d'écart. Le §13 fait foi ; le moteur doit être aligné sur lui, et les cinq taux restent paramétrables (valeurs par défaut modifiables par l'utilisateur).
2. **Lot 10 « Pieds droit »** : définition attendue du fondateur. Ne rien inventer.
3. **Portée des prix unitaires.** Aujourd'hui un prix est attaché au matériau (`ciment`), pas au couple lot+matériau (`fondation_ciment`) comme le suggère le §17. Faut-il pouvoir donner au ciment un prix différent selon le lot ? Si oui, c'est une migration de `bibliothequePrix` à prévoir, sans perdre les prix déjà enregistrés.

## G. Lots 1, 2 et 3 — tranchés par le fondateur (voir §3), et ce que le code fournit déjà

Ces trois lots ne sont plus des questions ouvertes. Voici comment les brancher sur l'existant.

**Lot 1 — Installation chantier (forfait).** Aucune donnée de métré n'est nécessaire. La forme demandée — quantité 1, unité `forfait`, P.U. = montant saisi — se branche telle quelle sur l'architecture existante : stocker le montant dans `bibliothequePrix` sous un identifiant stable (par exemple `installationChantier`), exactement comme un prix de matériau.

Conséquence importante : **aucun mécanisme spécifique n'est à écrire.** Parce que le montant vit dans `bibliothequePrix`, il devient automatiquement (a) paramétrable au départ dans l'écran Paramètres, (b) modifiable dans Excel dès que l'écriture inverse du §8 est en place (point C), (c) persistant d'une session à l'autre, (d) conservé lors d'une actualisation des quantités (§16). Ne pas créer un champ à part pour ce forfait.

Prévoir également le lien inverse demandé : un bouton « Modifier le devis » depuis la vue du devis vers l'éditeur Excel. Le chemin retour existe déjà (`EditeurAvance.jsx` a un bouton « Retour au devis » vers `/metre?etape=4`) ; c'est l'aller qui manque.

**Lots 2 et 3 — Déblais et Remblais.** Les quantités sont **déjà calculées et déjà affichées**, il n'y a rien à recalculer :

| Donnée | Produite par | Déjà affichée dans |
|---|---|---|
| Déblais | `calculerTerrassement()` dans `packages/moteur/src/terrassement.js` → `deblais { volumeNet, volumeFoisonne, tonnes }` | `ResumeFondation.jsx` — StatBox « Déblais totaux » (m³) |
| Remblais | idem → `remblais { volumeTasse, tonnes }` | `ResumeFondation.jsx` — StatBox « Remblais (volume déduit) » (m³) |
| Évacuation des terres | idem → `evacuation { volume, tonnes }` | `ResumeFondation.jsx` — StatBox « Évacuation des terres » (m³) |

Règle à respecter : **la ligne du devis doit afficher exactement la même valeur que la StatBox du Résumé.** Utiliser la même propriété, pas une variante (ne pas prendre `volumeNet` dans un écran et `volumeFoisonne` dans l'autre) — sinon l'écran et le papier se contredisent, ce que le §22 interdit.

Prix : un prix au m³ par ligne, à ajouter à la bibliothèque de prix avec un identifiant stable (`deblais_m3`, `evacuation_m3`, `remblais_m3`), paramétrable au départ et modifiable dans Excel comme les autres.

Placement de l'évacuation : tranché au §3 — lot 2 (DÉBLAIS), ligne 2.2. Note de calcul à connaître : `evacuation = MAX(0, déblais foisonné − remblais tassé)`, donc sa valeur dépend du remblai, calculé au lot 3. Ce n'est pas un problème : le devis présente des quantités, pas un ordre de calcul. Ne pas réordonner les lots pour cette raison.

Rappel du manque n°1 : tant que les deux `continue` sur `terrassement` restent dans `valorisation.js`, aucun de ces lots ne peut apparaître. C'est le premier verrou à lever.

## F. Ordre de travail recommandé

0. **Enrichir `genererResumeProjet()` puis y brancher les deux devis** (point A-bis) — c'est le préalable à tout le reste : tant que les devis calculent par leur propre chemin, chaque correction devra être faite deux fois. Mesurer les écarts avant/après.
1. Table des lots ordonnée (§3) + rattachement des blocs, sans toucher aux calculs.
2. Réintégration du lot Terrassement dans le devis (manque n°1) + lignes Installation chantier, Déblais et Remblais (point G) + tests.
3. `construireLignesDevis()` — le renderer unique (§22), branché d'abord sur la vue HTML.
4. Bascule de la feuille Univer sur ce renderer + colonne `N°` + décalage de la formule P.T.
5. Écriture inverse du P.U. depuis Univer vers `bibliothequePrix` (§8).
6. Bascule des exports PDF/XLSX sur le même renderer.
7. Configuration d'impression (§21).
8. Application des arbitrages du point E.

Après chaque étape : vérifier que les quatre sorties affichent les mêmes montants, et lancer `npm test` dans `packages/moteur`.
