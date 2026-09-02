# Règles de l'Agent pour DEVIS FACILE BTP

Ce fichier définit les règles, le vocabulaire et les contraintes que l'IA doit respecter **strictement** lorsqu'elle génère du code, de l'interface ou du texte pour ce projet. Il est directement inspiré de la LIGNE_EDITORIALE.md.

## 1. Vocabulaire Obligatoire (Glossaire)
N'inventez pas de mots. Utilisez toujours les termes suivants dans le code, l'UI et les explications :
- **Lot** (JAMAIS Catégorie)
- **Ouvrage** (JAMAIS Tâche ou item)
- **Métré** (JAMAIS Mesures)
- **Ceinture** (JAMAIS Poutre de chaînage)
- **Colonne** (JAMAIS Poteau, même si le code legacy utilise encore `poteaux`)
- **Repère** (JAMAIS Nom ou Libellé, ex: "S1", "C2")
- **Hypothèse** (JAMAIS Paramètre par défaut)
- **Sous-détail de prix** (JAMAIS Décomposition)

## 2. États de Données et Couleurs (Règles UI)
Toute valeur affichée appartient à l'un de ces 4 états contractuels :
- **Saisie** (Ce que l'utilisateur décide, ex: dimensions) : `#14479B` (Bleu).
- **Calculé** (Ce que le moteur déduit, ex: volumes) : `#0F151B` (Noir / par défaut).
- **Hérité** (Ce qui vient d'ailleurs, ex: prix bibliothèque) : `#14634A` (Vert).
- **À vérifier** (Ce qui mérite un regard, ex: hypothèse par défaut) : `#8A5D00` (Ambre).
*Note : Il n'y a pas d'état "vide". Une valeur manquante affiche un tiret `-` (et jamais un `0` trompeur).*

## 3. Ton et Communication
- **Confrère, jamais vendeur** : S'adresser à un professionnel du chantier.
- **Concis et direct** : Phrases courtes, voix active, AUCUN point d'exclamation (!).
- **Avertir, ne jamais bloquer** : Signalez les valeurs manquantes (ex: "Semelle S3 — hauteur manquante. Le volume ne peut pas être calculé."), mais ne mettez pas d'alertes bloquantes ("Êtes-vous sûr ?").

## 4. Règles Métier Structurantes
- **Un seul métré, deux lecteurs** : 
  - **Modèle Particulier** : Bordereau affichant le détail des quantités de matériaux (ex: sacs de ciment, sable) par lot (Fondation, etc.).
  - **Modèle Entreprise** : Bordereau affichant les ouvrages terminés par section, prix tout compris (fourniture + pose + frais) calculés via un "sous-détail de prix".
- Toujours arrondir les unités monétaires (FCFA) à l'entier. Le séparateur de milliers est l'espace fine (pas de virgule). Les quantités peuvent avoir des décimales.

## 5. Typographie et Interface
- Les nombres et montants en colonne doivent TOUJOURS utiliser des polices à chasse tabulaire (`tabular-nums`, ex: JetBrains Mono).
- Assurer que les totaux ne quittent jamais l'écran (barre basse fixe dans l'UI) et prioriser le tactile (cibles > 44px).
