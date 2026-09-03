# DEVIS FACILE — Refonte front-end et construction du SaaS

Dossier de prompts pour Antigravity. **Ne colle pas ce fichier en entier.** Il contient
huit prompts numérotés, à envoyer un par un, dans l'ordre. Chaque phase se termine sur un
état livrable et testé.

---

## Pourquoi c'est découpé

Deux raisons concrètes, pas de la méthode pour la méthode :

1. **Antigravity a déjà épuisé son quota en plein travail** sur ce projet, laissant le dépôt
   à moitié modifié sur 21 fichiers. Une phase courte qui finit verte vaut mieux qu'une
   grande refonte interrompue au milieu.
2. **La phase 0 doit être validée avant d'écrire une ligne.** Tes deux prompts d'origine
   contiennent cinq hypothèses fausses sur le dépôt (voir ci-dessous). Les corriger coûte
   dix minutes maintenant, une semaine plus tard.

---

## Ce que le dépôt contient réellement — vérifié le 3 septembre 2026

À faire figurer en tête de chaque prompt, car c'est le point de départ que les deux
briefs d'origine décrivaient de travers.

| Sujet | Ce que le brief supposait | La réalité vérifiée |
|---|---|---|
| Base de données | « données provenant de Supabase » | **Aucune.** Zéro occurrence de `supabase` dans le code. |
| Authentification | « système d'authentification en place » | **Aucune.** Pas de login, pas d'utilisateur, pas de session. |
| Paiement | « fonctions de paiement déjà en place » | **Aucune.** Pas de Mobile Money, pas de webhook. |
| QCM / abonnement | implicitement existants | **Aucun.** Zéro occurrence de `qcm`, `abonnement`, `subscription`. |
| Stack | React 19, GSAP 3, react-router | **React 18.3.1**, Tailwind 3.4.19, Vite 8.2.2. **Pas de GSAP, pas de router.** |

**Ce qui existe et qui a de la valeur :**

- Un monorepo npm workspaces : `packages/moteur` et `packages/app`.
- **`packages/moteur`** — moteur de calcul en JavaScript pur, sans dépendance UI :
  métré, recettes matériaux, armatures, valorisation, devis particulier et entreprise.
  **80 tests passent**, calés sur le classeur `DEVIS_FACILE_BTP-7.xlsx`. C'est l'actif
  du projet : il ne se refait pas, il se rhabille.
- **`packages/app`** — une seule page React à trois onglets (`projet` / `saisie` /
  `editeur`), état entièrement en `localStorage` via 33 clés, aucune persistance serveur.
  Le devis quantitatif et estimatif se calcule déjà en direct pendant la saisie.

**Conclusion à énoncer clairement : ce n'est pas une refonte front-end.** C'est la
construction d'un SaaS complet autour d'un moteur de calcul existant. Le design est la
partie visible ; l'authentification, les comptes, les QCM, les droits et le paiement sont
à créer intégralement.

---

## Les cinq contradictions, tranchées

À reprendre telles quelles dans les prompts concernés.

1. **`npm create vite@latest` est interdit.** Le brief landing demandait de scaffolder un
   projet neuf : cela écraserait ou dupliquerait le monorepo. La landing page devient
   `packages/site`, un workspace de plus.
2. **React reste en 18.3.1.** Passer en 19 est une migration à part entière, sans rapport
   avec le design. À faire plus tard, seule, si le besoin apparaît.
3. **GSAP n'est pas installé.** Deux options : l'ajouter dans `packages/site` uniquement
   (landing), et faire l'application avec des transitions CSS. C'est le choix retenu :
   pas de GSAP dans l'app, qui est un outil de saisie, pas une vitrine.
4. **Supabase est à créer, pas à découvrir.** Décision retenue : Supabase pour
   l'authentification, la base Postgres, les politiques RLS et les fonctions edge qui
   recevront les webhooks de paiement. *Si tu préfères rester sans backend, dis-le : les
   phases 3 à 6 changent entièrement.*
5. **Les tarifs des captures d'écran (6 500 / 19 000 / 45 000 FCFA) sont morts.** Seule la
   grille de la phase 6 fait foi : 0 / 3 500 par mois / 35 000 par an / 500 à l'unité.

---

## Règles valables pour toutes les phases

À copier en tête de chaque prompt.

- **Ne touche jamais à `packages/moteur/src`** sans le dire explicitement et sans faire
  passer `npm test`. Les 80 tests sont calés sur un classeur de référence : un test rouge
  signifie un devis faux, pas un test à réécrire.
- **Ne modifie pas un test existant pour faire passer ton code.** Si un test tombe, ou bien
  ton code est faux, ou bien tu as trouvé un vrai défaut — dans ce cas, dis-le et attends.
- **Chaque correction porte un test nommé.** C'est la règle du projet.
- **Aucun zéro muet.** Un ouvrage saisi mais non chiffré, une donnée manquante, un prix
  absent : cela s'affiche, cela ne disparaît jamais en silence.
- `npm test` à la racine et `npm run build` dans `packages/app` doivent passer à la fin de
  chaque phase.
- Mobile d'abord. Aucun défilement horizontal, cibles tactiles de 44 px minimum.

---

# PHASE 0 — Cadrage, sans écrire une ligne de code

> Copie tout ce bloc.

Tu vas travailler sur **DEVIS FACILE**, un monorepo npm workspaces contenant
`packages/moteur` (moteur de calcul BTP en JS pur, 80 tests verts, calé sur un classeur
Excel de référence) et `packages/app` (application React 18 + Vite + Tailwind, état en
localStorage, trois onglets).

**Cette phase ne produit aucun code.** Elle produit un document.

Fais l'inventaire réel du dépôt et rends-moi :

1. **La cartographie du moteur** : chaque fonction exportée par `packages/moteur/src/index.js`,
   ce qu'elle prend, ce qu'elle rend. C'est le contrat que le nouveau front-end devra respecter.
2. **La cartographie de l'app** : chaque composant de `packages/app/src`, ce qu'il affiche,
   quel état il lit dans `ProjetContext`. Signale ceux qui sont importés mais jamais rendus.
3. **La liste des 33 clés localStorage** et ce que chacune stocke.
4. **Ce qui manque** pour le SaaS visé : authentification, comptes, projets persistés, QCM,
   abonnements, droits, paiement. Pour chacun, dis si c'est du front, du back, ou les deux.
5. **Ta proposition d'arborescence** pour le nouveau front-end : dossiers, routes, découpage
   des composants. Justifie les choix structurants en une phrase chacun.

Contraintes de l'inventaire :
- Ne suppose l'existence de rien. Si tu ne trouves pas Supabase, écris qu'il n'y en a pas.
- Ne propose pas de supprimer une fonctionnalité du moteur pour simplifier le design.

**Arrête-toi après ce document et attends ma validation.**

---

# PHASE 1 — Identité visuelle et coquille de l'application

> Prérequis : phase 0 validée.

## Identité

**DEVIS FACILE** s'adresse aux étudiants, techniciens, conducteurs de travaux, métreurs et
ingénieurs du BTP. L'interface doit donner immédiatement l'impression d'un **logiciel
professionnel de Génie Civil**, pas d'une application grand public.

Inspiration : plans architecturaux, plans de coffrage et de ferraillage, quadrillage
technique, lignes de cotation, bureaux d'études.

**Palette** — à poser en variables CSS, une seule fois, jamais recopiée dans les composants :

| Rôle | Valeur |
|---|---|
| Primaire, bleu technique foncé | `#14304D` |
| Accent, orange chantier (CTA, alertes utiles) | `#F2994A` |
| Interactif secondaire, bleu plan | `#2F6FDE` |
| Fond | `#F6F7F9` |
| Texte, graphite | `#1B1F27` |

**Typographie** : titres en `IBM Plex Sans` (interlettrage serré), chiffres et données en
`IBM Plex Mono`. Chargement par balise `<link>` Google Fonts.

**Signature visuelle discrète** : grille millimétrée à 2–4 % d'opacité en fond de certaines
sections, bordures fines de 1 px en primaire à faible opacité, petits repères d'angle en
croix sur les cartes clés, comme des repères de calage sur un plan.

**À éviter** : trop de couleurs, trop d'ombres, trop d'animations, cartes surdimensionnées,
tout ce qui évoque un réseau social. Sobre, technique, lisible.

## Ce qu'il faut construire

**Le squelette**, en réutilisant l'état et le moteur existants sans les modifier :

- `Sidebar` — sur ordinateur, fixe à gauche. Sections : *Principal* (Tableau de bord,
  Nouveau métré, Mes métrés, Nouveau devis, Mes devis, Projets), *Apprendre* (Apprendre le
  devis, Simulations QCM, Mes résultats, Mes corrections), *Compte* (Mon profil, Mon
  abonnement, Paramètres), *Support* (Centre d'aide, Nous contacter). En bas, une carte
  d'état d'abonnement.
- `MobileDrawer` — sur mobile, la sidebar devient un tiroir latéral, fermé au clic à
  l'extérieur et à la navigation.
- `Header` — bouton menu mobile, recherche, notifications, aide, avatar. Compact.
- Les primitives réutilisables : `StatCard`, `DashboardCard`, `ProgressBar`, `EmptyState`,
  `Toast`, `ConfirmationModal`.

**Le tableau de bord** : titre « Bonjour, [Prénom] », sous-titre « Bienvenue sur Devis
Facile. Gérez vos métrés, vos devis et votre progression en apprentissage. » Quatre
`StatCard` (Métrés réalisés, Devis créés, QCM terminés, Score moyen), puis une section
« Que souhaitez-vous faire ? » avec deux grandes cartes : **Apprendre le devis**
(→ simulation) et **Faire un devis** (→ nouveau métré).

## Limites de cette phase

- Les trois onglets actuels (`projet`, `saisie`, `editeur`) sont **rebranchés dans la
  nouvelle coquille**, pas réécrits. Le métré et le devis doivent continuer à fonctionner
  exactement comme avant.
- Les entrées de menu sans page existante affichent un `EmptyState` honnête
  (« Bientôt disponible »), jamais une page fausse ou des chiffres inventés.
- Les chiffres du tableau de bord viennent de l'état réel. S'il n'y a rien, affiche zéro ou
  un tiret — **jamais de données de démonstration**.
- Ajoute `react-router-dom` : la navigation à sept entrées ne tient plus dans un `useState`.

Livrable : `npm run build` passe, l'application est utilisable sur téléphone comme sur
ordinateur, le métré et le devis fonctionnent comme avant.

---

# PHASE 2 — Métré en cinq étapes et page Devis

> Prérequis : phase 1 livrée.

## Le métré

Transforme la saisie actuelle en un parcours à cinq étapes, avec barre de progression
horizontale : **1. Informations du projet → 2. Plans et éléments → 3. Métré → 4. Résultats
→ 5. Devis**.

L'utilisateur saisit ses éléments (désignation, unité, longueur, largeur, hauteur,
quantité) et le moteur calcule les quantités automatiquement. Les composants de saisie
existants (`Terrassement`, `Fondation`, `Elevation`, `Plancher`, `Toiture`, `Finition`)
sont réutilisés, réorganisés dans ce parcours.

`MeasurementTable` : un tableau technique, quadrillé, lisible, qui montre la formule
appliquée et pas seulement le résultat. Le composant `ValeurCalculee` existant sait déjà
afficher la trace du calcul — garde ce comportement, c'est ce qui distingue l'outil d'une
calculatrice.

## La page Devis

En-tête : **Devis N° 0001**, Client, Projet, Localisation, Date, Entreprise.

`QuoteTable` — colonnes : N°, Désignation, Unité, Quantité, Prix unitaire, Montant. Puis
Total HT, TVA, Total TTC. Boutons : Enregistrer, Modifier, Exporter PDF, Exporter Excel.

**Le devis existe déjà et se calcule en direct** : `useDevis()` rend `devisParticulier` et
`devisEntreprise`, et le composant `TableauDevis` les affiche dans l'ordre chronologique du
classeur. Rhabille-le, ne le réécris pas. En particulier, conserve :

- l'ordre des lots issu de `TITRES_LOTS_PARTICULIER` et `TITRES_LOTS_ENTREPRISE` — c'est la
  seule source de l'ordre du classeur, ne recopie jamais cette liste dans un composant ;
- le surlignage ambre des lignes sans prix, avec la mention « prix à saisir » ;
- le pied de devis en cascade jusqu'au total.

## Aspect

Le métré et le devis doivent évoquer un logiciel professionnel du BTP : lignes techniques,
quadrillage, repères, symboles de plans — **avec subtilité**. L'écran reste extrêmement
lisible, jamais chargé.

Les boutons d'export restent actifs à ce stade : leur verrouillage arrive en phase 6.

---

# PHASE 3 — Backend, comptes et persistance

> Prérequis : phase 2 livrée. **C'est la phase qui change la nature du produit.**

Mets en place Supabase :

1. **Authentification** — inscription et connexion par e-mail, plus mot de passe oublié.
2. **Schéma de base**, avec politiques RLS strictes (chacun ne voit que ses données) :
   - `profiles` — prénom, nom, entreprise, téléphone, plan en cours
   - `projects` — nom, client, localisation, statut, dates
   - `measurements` — un métré, rattaché à un projet, contenu en JSON
   - `quotes` — un devis, rattaché à un projet, numéro, montant, statut
3. **Migration depuis localStorage** — au premier login, propose d'importer le travail déjà
   présent dans le navigateur. Ne le supprime pas sans confirmation explicite.

**Le moteur ne change pas.** Il reste une bibliothèque de calcul pure : la base stocke des
saisies et des résultats, elle ne calcule rien.

Pages à livrer : **Mes projets** (cartes : nom, client, localisation, dernière
modification, statut, bouton Ouvrir, plus un bouton Nouveau projet), **Mes métrés**
(tableau : Projet, Type, Date, Statut, Quantité, Actions), **Mes devis** (tableau : Numéro,
Projet, Client, Montant, Date, Statut, Actions).

---

# PHASE 4 — Apprendre le devis et moteur de QCM

> Prérequis : phase 3 livrée.

## Les règles du jeu

- Une simulation contient **30 questions**.
- Bonne réponse : **+1 point**. Mauvaise réponse : **−0,5 point**.
- Pendant le QCM, **on n'indique jamais si la réponse est juste**. Les résultats
  n'apparaissent qu'à la fin.

## Écrans

**Page Apprendre** — accroche « Apprenez en pratiquant », rappel des règles, puis les
sujets en cartes : « Sujet 01 — Métré de maçonnerie, 30 questions, niveau Débutant,
[Commencer] », « Sujet 02 — Métré béton armé, Intermédiaire », « Sujet 03 — Fondations et
terrassement, Intermédiaire », etc.

**Écran de question** — « Question 01 / 30 », barre de progression, énoncé, quatre réponses
en cartes cliquables (A, B, C, D), bouton [Question suivante].

**Écran de résultat** — le calcul doit être montré, pas seulement le score :

> Score : 25 bonnes, 5 mauvaises
> 25 × 1 = 25, puis 5 × (−0,5) = −2,5
> **Score final : 22,5 / 30 — taux de réussite 75 %**
> [Voir la correction]

## Schéma

Tables `quiz_subjects`, `quiz_questions`, `quiz_attempts`, `quiz_answers`. Les bonnes
réponses ne doivent **jamais** partir vers le navigateur avant la fin de la tentative :
la correction se sert depuis le serveur, une fois la tentative close.

## Contenu

Le code ne fait pas les questions. Amorce le schéma et **un seul sujet complet de 30
questions** en exemple, sur le métré de maçonnerie, calculé avec le moteur pour que les
réponses soient justes. Les autres sujets seront écrits ensuite.

---

# PHASE 5 — Droits et états verrouillés

> Prérequis : phase 4 livrée. **Aucun paiement réel dans cette phase.**

## Les rôles

| Rôle | Peut | Ne peut pas |
|---|---|---|
| `USER_FREE` | tableau de bord ; **3 premiers QCM** avec note et correction ; QCM suivants jouables mais résultats verrouillés ; **1 métré** ; **1 devis**, consultable à l'écran | débloquer d'autres corrections ; exporter un devis ; créer plusieurs devis |
| `USER_PRO_MONTHLY` / `USER_PRO_YEARLY` | tout | — |
| `PURCHASED_CORRECTION` | débloque la note et la correction **du seul sujet acheté** | le reste |

## Les trois murs

1. **À partir du 4ᵉ QCM** — l'utilisateur répond aux 30 questions normalement, puis :
   « Votre simulation est terminée. Vos résultats et votre correction sont prêts. » Suivi
   de la zone verrouillée : « 🔒 Résultats verrouillés — [Débloquer ce résultat, 500 FCFA]
   ou [Passer à PRO] ».
2. **À l'export d'un devis** — modale : « Exportation réservée aux abonnés PRO. Votre devis
   est prêt. Passez à PRO pour le télécharger en PDF. » Boutons : [Passer à PRO],
   [Continuer sans exporter].
3. **Au 2ᵉ devis** — « Vous avez utilisé votre devis gratuit. Passez à PRO pour créer
   davantage de devis. » [Passer à PRO]

## Comment verrouiller

Composant `ProFeatureLock`. **Ne te contente jamais de désactiver un bouton.** Un état
verrouillé montre ce qu'on manque et donne envie, sans agresser :

> 🔒 **Fonctionnalité PRO**
> Cette fonctionnalité est disponible avec l'abonnement PRO.
> [Découvrir PRO]

**Les droits se vérifient côté serveur.** Un verrou uniquement visuel se contourne en trois
clics dans la console du navigateur. Les politiques RLS et les fonctions edge sont la vraie
barrière ; le composant n'en est que le reflet.

---

# PHASE 6 — Abonnement et paiement Mobile Money

> Prérequis : phase 5 livrée.

## La grille tarifaire — seule référence valable

Ignore les montants des captures d'écran (6 500 / 19 000 / 45 000 FCFA), qui sont obsolètes.

| Offre | Prix | Contenu |
|---|---|---|
| **Gratuit** | 0 FCFA | 3 simulations QCM avec note et correction · métrés · 1 devis consultable · **pas d'export** |
| **PRO mensuel** | **3 500 FCFA / mois** | QCM illimités avec résultats et corrections · métrés · devis · export PDF · toutes les fonctions professionnelles |
| **PRO annuel** | **35 000 FCFA / an** | tout PRO — **à mettre en avant**, mention « Économisez par rapport au paiement mensuel » |
| **Correction à l'unité** | **500 FCFA** | débloque la note, le score et la correction d'**un seul** sujet |

`PricingCard` : la carte PRO annuelle est visuellement dominante (fond primaire, CTA
accent, légèrement plus grande).

## Le paiement

`PaymentModal` pour Orange Money et MTN MoMo. Le montant, l'objet de l'achat et le numéro
sont affichés avant confirmation.

Impératifs :
- La **confirmation vient du webhook**, jamais du navigateur. Un retour d'interface ne
  débloque rien par lui-même.
- Fonction edge Supabase pour recevoir la notification de l'opérateur, vérifier la
  signature, puis mettre à jour le rôle ou insérer la correction achetée.
- **Idempotence** : un webhook rejoué ne doit ni créer un second abonnement, ni débiter deux
  fois. Clé d'idempotence sur la référence de transaction.
- Trace complète : table `payments` avec statut, opérateur, référence, montant, horodatage.
  Un paiement qui échoue doit rester visible, pas disparaître.

---

# PHASE 7 — Landing page

> Prérequis : indépendant du reste. Peut se faire en parallèle.

## Cadre

Crée **`packages/site`**, un nouveau workspace du monorepo. **N'exécute pas
`npm create vite@latest` à la racine** : cela casserait le monorepo existant. Reprends la
configuration Vite et Tailwind de `packages/app`. GSAP 3 avec ScrollTrigger est autorisé
**ici uniquement**, plus Lucide React pour les icônes.

## Direction artistique — « Trait Précis »

Un bureau d'études qui a numérisé ses planches à dessin : la précision d'un plan de
coffrage, la fluidité d'un instrument numérique. Même palette et même typographie qu'en
phase 1, plus `Fraunces` italique pour les moments dramatiques.

Texture : bruit CSS global via filtre SVG `<feTurbulence>` à 0,05 d'opacité. Rayons
modérés (`rounded-lg` à `rounded-2xl`), jamais de grands arrondis — l'identité reste
technique, pas boutique de luxe.

Animations : `gsap.context()` dans `useEffect`, `ctx.revert()` au démontage. `power3.out`
pour les entrées, décalage de 0,08 pour le texte et 0,15 pour les cartes. Boutons
légèrement magnétiques (`scale(1.03)`), liens en `translateY(-1px)`.

## Sections

**A. Navbar « île flottante »** — pilule fixe et centrée, transparente sur le hero, puis
`bg-[fond]/60 backdrop-blur-xl` au défilement. Logo « DEVIS FACILE », liens Fonctionnalités
/ Tarifs / Apprendre, CTA accent « Commencer gratuitement ».

**B. Hero** — `100dvh`, image de fond plein cadre (Unsplash : plans architecturaux,
chantier, bureau d'études — **de vraies URL, jamais de placeholder**), dégradé primaire
vers noir. Contenu au tiers inférieur gauche.

> « Le métré et le devis BTP, » *(sans-serif gras)*
> « enfin simplifiés. » *(serif italique massif)*

Sous-titre : « Apprenez, mesurez et créez vos devis de construction depuis une seule
plateforme. » CTA : [Commencer gratuitement] (accent plein) et [Découvrir comment ça
marche] (contour).

**C. Fonctionnalités — trois artefacts interactifs**, pas des cartes marketing :

1. *Mélangeur* (Apprendre) — trois cartes superposées qui défilent verticalement toutes
   les 3 secondes, affichant les sujets de QCM.
2. *Machine à écrire* (Métré) — flux monospace tapé caractère par caractère :
   « Maçonnerie : 125,50 m² », « Béton : 18,40 m³ », « Ferraillage : 1 250 kg », curseur
   clignotant accent, label « Calcul en direct » à point pulsant.
3. *Curseur de protocole* (Devis) — un curseur SVG parcourt les cinq étapes du parcours
   (Informations, Plans, Métré, Résultats, Devis), coche chacune, puis se dirige vers
   « Générer le devis » avant de recommencer.

**D. Philosophie** — pleine largeur, fond primaire sombre, texture technique en parallaxe.

> « La plupart des outils de devis se contentent de calculer. » *(neutre, petit)*
> « Nous, on vous apprend d'abord à **maîtriser** le métré. » *(serif italique massif,
> « maîtriser » en accent)*

Révélation mot à mot au ScrollTrigger.

**E. Protocole** — trois cartes plein écran empilées (`pin: true`) ; la carte sortante
passe en `scale(0.9)`, flou 20 px, opacité 0,5. *Apprenez* (cercles concentriques en
rotation lente), *Mesurez* (ligne laser balayant une grille de points), *Devisez* (onde
pulsante en `stroke-dashoffset`).

**F. Tarifs** — la grille exacte de la phase 6, carte annuelle mise en avant.

**G. Pied de page** — fond sombre profond, `rounded-t-[3rem]`, indicateur « Plateforme
opérationnelle » à point vert pulsant, label monospace.

## Exigences

Mobile d'abord : cartes empilées, titre hero réduit, navbar minimale. Chaque animation
câblée, chaque image chargée, aucun défilement horizontal.

---

## Récapitulatif de l'ordre d'envoi

| Phase | Objet | Backend requis |
|---|---|---|
| 0 | Cadrage et inventaire — **aucun code** | non |
| 1 | Identité visuelle et coquille | non |
| 2 | Métré en 5 étapes et page Devis | non |
| 3 | Supabase, comptes, projets | **oui** |
| 4 | Apprendre et moteur de QCM | oui |
| 5 | Droits et états verrouillés | oui |
| 6 | Abonnement et Mobile Money | oui |
| 7 | Landing page (`packages/site`) | non |

Les phases 0 à 2 et la phase 7 se font sans aucun backend : c'est là que se trouve
l'essentiel du travail visuel, et elles peuvent être livrées avant toute décision
d'infrastructure.
