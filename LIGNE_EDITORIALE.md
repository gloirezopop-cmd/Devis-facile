# Devis Facile BTP · Revolution BTP · Ligne éditoriale

Bleu, Noir, Vert, Jaune
Votre classeur a déjà une langue. Quatre couleurs y disent, à chaque cellule, d'où vient le chiffre et qui en répond. Le logiciel ne va pas inventer une autre langue : il va parler celle‑là, en mieux — parce qu'un écran peut faire ce qu'une cellule Excel ne peut pas.

Source — DEVIS_FACILE_BTP‑7, feuille Notice, section « CODE COULEUR ».
Texte bleu : cellule de saisie · Texte noir : cellule calculée · Texte vert : reprise d'une autre feuille · Fond jaune : hypothèse clé à vérifier.

## 01 — LE PRINCIPE

**Un seul métré, deux lecteurs**
C'est la décision la plus structurante du classeur v7, et elle doit devenir le cœur du produit. Le même bâtiment, le même métré, les mêmes prix — mais deux documents qui ne se ressemblent pas, parce qu'ils ne s'adressent pas à la même personne.

Le particulier veut voir les sacs de ciment. Il finance un chantier qu'il ne sait pas lire, et le détail des matériaux le rassure. L'entreprise et le bureau d'études veulent des sections en prix tout compris, avec la TVA et des forfaits de second œuvre : c'est ce format qu'ils savent comparer, négocier et signer.

### Modèle particulier
Bordereau par nature de matériaux. Corps d'état par corps d'état. Le lecteur voit ce qu'on achète.

| Désignation | Uté | Qté | P.U. | P.T. |
| :--- | :--- | :--- | :--- | :--- |
| Ciment | sac | 94 | 5 500 | 517 000 |
| Gravier | t | 17,50 | 25 000 | 437 592 |
| Sable | t | 13,13 | 15 000 | 197 006 |
| Moellon | t | 12,27 | 17 000 | 208 545 |
| Armature longrine | barre | 8 | 6 000 | 48 000 |
| **Sous‑total Fondation** | | | | **2 035 617** |

### Modèle entreprise
Bordereau par section, prix tout compris. Issu du sous‑détail de prix. Le lecteur voit ce qu'on livre.

| Désignation | Uté | Qté | P.U. | P.T. |
| :--- | :--- | :--- | :--- | :--- |
| Béton de propreté 150 | m³ | 1,40 | 73 744 | 103 131 |
| BA 350 semelles + amorces | m³ | 0,59 | 273 288 | 161 103 |
| BA 350 longrine | m³ | 3,57 | 273 288 | 975 639 |
| Fondation en moellon | m³ | 10,95 | 43 571 | 477 235 |
| Mur de soubassement | m² | 36,51 | 6 045 | 220 703 |
| **Sous‑total Fondation** | | | | **2 651 436** |

**Une règle que l'interface doit rendre évidente**
Les deux sous‑totaux ne sont pas égaux, et c'est normal — 2 035 617 contre 2 651 436 FCFA sur la même fondation. Le bordereau particulier chiffre des fournitures ; le bordereau entreprise chiffre des ouvrages posés, main d'œuvre et majorations comprises.

Ce ne sont donc pas deux mises en page du même total. Le logiciel doit le dire, à l'écran et sur le document : un utilisateur qui découvre l'écart sans explication perd confiance dans l'outil entier.

## 02 — LA GRAMMAIRE

**Quatre états, et rien d'autre**
Toute valeur affichée par le logiciel est dans exactement un de ces quatre états. C'est une contrainte, pas une palette : si une donnée n'entre dans aucun état, c'est la donnée qu'il faut revoir, pas la couleur qu'il faut ajouter.

- **SAISIE (Ce que vous décidez)**
  Dimensions, dosages, prix, quantités comptées. Vous en répondez.
  Champ bordé, fond clair, curseur texte. Le seul état où l'on peut taper.

- **CALCULÉ (Ce que le moteur déduit)**
  Volumes, poids d'acier, nombre de sacs, sous‑totaux. Le logiciel en répond.
  Sans bordure, non éditable, avec le bouton « Voir le calcul ».

- **HÉRITÉ (Ce qui vient d'ailleurs)**
  Une quantité reprise d'un autre lot, un prix venu de la bibliothèque.
  Discret, cliquable : le clic emmène à la source. Jamais un cul‑de‑sac.

- **À VÉRIFIER (Ce qui mérite un regard)**
  Hypothèse par défaut jamais confirmée, prix vieux de deux mois, ratio hors fourchette.
  Fond ambré. Il avertit, il ne bloque jamais. Un clic le lève.

**Ce que l'écran ajoute au classeur**
Dans Excel, ces quatre états sont une convention : rien n'empêche d'écrire par‑dessus une formule et de casser le classeur en silence. Dans le logiciel, ils deviennent un contrat tenu par la machine.

1. Une cellule calculée ne s'édite pas par accident. Elle s'édite exprès, et elle change alors d'état : elle devient une valeur forcée, marquée, avec sa valeur d'origine conservée.
2. Une cellule héritée dit d'où elle vient et y conduit en un clic.
3. Une hypothèse jaune se confirme une fois et cesse d'être jaune. Le classeur, lui, reste jaune pour toujours.

**Le cinquième état, celui qui n'existe pas**
Il n'y a pas d'état « vide ». Une quantité non calculable s'affiche `-` et non `0`. Un zéro se propage en silence jusqu'au total ; un tiret se voit. C'est la même règle que celle gravée dans le moteur de calcul, portée jusqu'au pixel.

## 03 — LA PALETTE

**Quatre couleurs de sens, trois de fond**
Les quatre premières portent du sens et rien d'autre : on ne les emploie jamais pour décorer un bouton ou animer un en‑tête. Les trois dernières font le papier. Le fond n'est pas un blanc neutre mais un gris légèrement bleuté — assorti au bleu de saisie, qui est la couleur dominante d'un écran de métré.

**Les quatre états**
- **Saisie**: `#14479B` (ce que vous décidez)
- **Calculé**: `#0F151B` (ce que le moteur déduit)
- **Hérité**: `#14634A` (ce qui vient d'ailleurs)
- **À vérifier**: `#8A5D00` (ce qui mérite un regard)

**Le papier**
- **Fond**: `#EDF0F3` (la page)
- **Surface**: `#FBFCFD` (cartes, tableaux)
- **Filet**: `#C3CCD6` (bordures de cellule)

**En mode sombre, le sens ne bouge pas**
Les quatre états s'éclaircissent pour rester lisibles sur fond noir — le bleu passe à `#7FAAF2`, le vert à `#5FBE9A`, l'ambre à `#DCAF57` — mais aucun n'échange son rôle. Le « calculé », qui était l'encre noire, devient l'encre claire : c'est toujours la couleur du texte courant, donc toujours l'état par défaut.

Cette page est elle‑même la démonstration : elle bascule avec le thème de votre appareil, et les quatre états restent reconnaissables.

## 04 — LA TYPOGRAPHIE

L'écran est moderne, le devis est contractuel. Deux mondes typographiques, assumés. L'écran a le droit d'être net et contemporain. Le document qui part chez le client, lui, doit ressembler à ce qu'un maître d'ouvrage d'Afrique centrale attend d'une pièce contractuelle. Confondre les deux ferait passer le logiciel pour un gadget.

- **Titres**: Libre Franklin 600–700 (interlettrage serré). Ex: II — Élévation RDC
- **Texte courant**: Source Serif 4 (explications, aide, notice). Ex: Le volume se calcule pendant la saisie. Une dimension manquante laisse la ligne à « — » plutôt que d'afficher un zéro trompeur.
- **Chiffres et repères**: JetBrains Mono (chasse tabulaire). Ex: 2 651 436 FCFA · 36,51 m² · PU_MUR_SOUBASSEMENT
- **Le devis émis**: Times New Roman 11 pt (réglable, puis figé). Ex: 3 — Béton armé dosé à 350 kg/m³ (longrine) — m³ — 3,57 — 273 288 — 975 639

Tout chiffre en colonne prend `tabular-nums`. Sans cela les montants ne se lisent pas en diagonale, et un chiffreur lit toujours en diagonale.
Le FCFA n'a pas de décimale. Séparateur de milliers : espace fine. Jamais de virgule sur un montant, toujours sur une quantité.
La police du devis appartient à l'entreprise — Times par défaut, Arial, Calibri, Georgia ou Garamond au choix — et elle est figée dans le devis émis, pour qu'une réédition six mois plus tard rende la même page.

## 05 — LE VOCABULAIRE

Les mots du chantier, pas ceux du logiciel. Le classeur v7 a déjà tranché la plupart de ces mots. On les reprend tels quels : un utilisateur qui passe du classeur à l'application ne doit pas avoir à réapprendre son propre métier.

| On dit | Jamais | Pourquoi |
| :--- | :--- | :--- |
| Lot | Catégorie | Le mot du métier, et celui de vos bordereaux. |
| Ouvrage | Tâche, item | Un ouvrage a une unité et un prix ; une tâche n'a rien. |
| Métré | Mesures | Un acte professionnel, pas une opération arithmétique. |
| Ceinture | Poutre de chaînage | C'est le terme de votre feuille Elevation. |
| Colonne | Poteau | Idem — v7 dit « colonne », on ne corrige pas l'usage local. |
| Bibliothèque de prix | Mercuriale | « Mercuriale » reste le mot du code et de la doc ; l'écran parle plus simple. |
| Repère | Nom, libellé | S1, C2, L3 — c'est ainsi qu'on désigne un élément sur un plan. |
| Hypothèse | Paramètre par défaut | Une hypothèse se vérifie et s'assume ; un paramètre s'oublie. |
| Sous‑détail de prix | Décomposition | Terme exact, attendu par tout chiffreur. |

Le domaine du v7 impose aussi son propre lexique, qu'il ne faut ni traduire ni simplifier : moellon, hourdis 12+4, chape d'égalisation, béton de sous‑pavement, acrotère, forme de pente, scellement des huisseries, dressement des tableaux. Ce sont des postes de bordereau, pas du jargon.

## 06 — LE TON

Confrère, jamais vendeur. Le logiciel s'adresse à quelqu'un qui connaît le chantier mieux que lui. Phrases courtes, voix active, aucun point d'exclamation. Un bouton dit ce qu'il fait ; le message qui suit dit ce qui s'est passé.

- **Jamais**: Oups ! Une erreur est survenue.
- **Toujours**: Semelle S3 — hauteur manquante. Le volume ne peut pas être calculé.

- **Jamais**: Êtes‑vous sûr de vouloir continuer ?
- **Toujours**: Ce prix date du 12 juin. Le garder ? · Le mettre à jour

- **Jamais**: Félicitations, votre devis est prêt !
- **Toujours**: Devis calculé. 47 lignes, 5 lots, 3 hypothèses à vérifier.

- **Jamais**: Valider
- **Toujours**: Enregistrer le prix du ciment

**La phrase qui résume tout**
Un chiffreur doit pouvoir défendre sa ligne devant un maître d'ouvrage. Chaque mot de l'interface est écrit pour ce moment‑là. Si une formulation ne l'aide pas à se justifier, elle ne sert à rien.

## 07 — L'INTERFACE

Huit règles, tenues partout :

1. **Le pouce avant la souris**
   Cible tactile de 44 px, clavier numérique sur tout champ de dimension, une seule colonne sous 640 px. Le chantier se chiffre debout.

2. **Une carte par élément**
   Sur téléphone, une carte par semelle, par colonne, par mur, avec son repère. La grille de tableur revient sur ordinateur, où elle est un gain.

3. **Le total ne quitte jamais l'écran**
   Barre basse fixe : total courant, nombre de lignes, nombre d'hypothèses jaunes. Changer un prix doit se voir sans faire défiler.

4. **Tout chiffre s'explique**
   « Voir le calcul » montre l'entrée, la formule, le coefficient, le résultat, le prix retenu et sa date. C'est l'argument de vente du produit.

5. **Avertir, jamais bloquer**
   Un bandeau ambré signale ; il n'interrompt pas. Aucune fenêtre modale ne se met en travers d'une saisie en cours.

6. **La valeur forcée se voit**
   Une quantité calculée puis remplacée à la main garde une marque et son ancienne valeur. Le logiciel obéit, mais il n'oublie pas.

7. **Rien ne se perd**
   Sauvegarde continue, brouillon gardé hors ligne, aucun bouton « Enregistrer » qu'on puisse oublier. Perdre une heure de métré serait pire que le tableur.

8. **Le lien remonte à la source**
   Toute valeur héritée est cliquable et mène à l'endroit où elle est née. Aucun chiffre du logiciel n'est un cul‑de‑sac.

**Ce que le logiciel n'est pas**
Il réalise des métrés, des estimations et des devis. Il ne remplace pas un logiciel de calcul de structure et ne valide aucune résistance. Cette limite s'affiche dans l'interface et sur le PDF — pas seulement dans la documentation. C'est autant une protection juridique qu'une marque de sérieux.

---
Une ligne éditoriale n'est utile que si elle tranche. Celle‑ci tranche sur un point : le logiciel n'invente rien du langage de votre classeur, il le rend tenable. Les quatre couleurs restent, les mots restent, les deux bordereaux restent. Ce qui change, c'est que la machine garantit maintenant ce qui n'était qu'une convention.

*Établie d'après DEVIS_FACILE_BTP‑7 — 11 feuilles, plages nommées relues dans le XML source.*
*Devis Facile BTP · Revolution BTP · Cameroun, FCFA à zéro décimale.*
