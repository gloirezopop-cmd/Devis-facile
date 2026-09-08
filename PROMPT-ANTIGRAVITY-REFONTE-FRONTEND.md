# Refonte front-end — DEVIS Facile BTP

Prompt à coller tel quel à Antigravity. Rédigé et réorganisé à partir du brief du fondateur (structure allégée, doublons supprimés, chiffrage validé intégré, contraintes réelles du dépôt ajoutées).

---

## 1. Rôle et mission

Tu es un ingénieur front-end senior (UI/UX SaaS, mobile-first, conversion, accessibilité) qui reprend une application **déjà codée et fonctionnelle** : DEVIS Facile BTP (métré → devis pour le BTP).

**Mission :** faire passer le front-end d'un état « fonctionnel » à un état « SaaS professionnel » — sérieux, technique, rassurant — sans toucher au moteur de calcul.

Ressenti visé : *« Cet outil a été conçu par des professionnels du BTP pour des professionnels du BTP. »* Pas mignon, pas gadget : professionnel, précis, rapide, élégant.

---

## 2. Règle absolue — le backend est gelé

**Interdit, sans exception :**
- `packages/moteur/**` (formules de métré, de devis, notes de calcul, moteur métier) ;
- le schéma de données Supabase (`schema.sql`, `schema_qcm.sql`) et toute table ;
- la forme des fichiers de contenu (`packages/app/src/data/*.json`, `cours.js`, `qcm.js`) — ce sont des données, pas du code ;
- la logique de `AuthContext.jsx` (signatures `signIn`/`signUp`/`signOut`/`getSession`) ;
- les routes existantes dans `App.jsx` (tu peux réorganiser leur *présentation*, pas les casser).

**Autorisé, c'est tout le sujet de ce prompt :** JSX, CSS/Tailwind, composants de présentation, copywriting, navigation, animations, responsive, onboarding, pages d'abonnement, parcours de conversion, état UI local (React state, `localStorage` pour des préférences d'affichage).

**Si une idée exige vraiment le backend** (nouvelle table, nouvelle colonne, nouvel endpoint) : **ne la code pas**. Ajoute une entrée dans **`FRONTEND_BACKEND_REQUESTS.md`** (déjà créé à la racine avec 3 besoins connus — complète-le, ne le remplace pas).

---

## 3. Contraintes techniques réelles de ce dépôt

À respecter strictement — elles évitent de refaire des erreurs déjà commises dans ce projet.

| Sujet | Règle |
|---|---|
| **Stack** | React 18.3.1 + Vite 8 + Tailwind 3.4 + react-router-dom v6. Aucune librairie d'animation/UI n'est installée (pas de framer-motion, pas de MUI). Ne pas en ajouter sans le signaler — les animations se font en CSS/Tailwind (`transition`, `animate-*`, `@keyframes`). |
| **Icônes** | Un seul système : [`packages/app/src/components/ui/Icone.jsx`](packages/app/src/components/ui/Icone.jsx) (traits fins, style Feather, objet `TRACES`). **Ne jamais utiliser `<span className="material-icons">`** : la police Material Icons n'est chargée nulle part dans `index.html`, donc ces icônes sont **invisibles** en prod. C'est un bug déjà présent dans `ModalePaiementMock.jsx`, `AssimilationListe.jsx`, `AssimilationSession.jsx` — à corriger dans le cadre de cette refonte en migrant vers `Icone`. S'il manque un tracé, l'ajouter dans `TRACES` (même style, ne pas importer une lib d'icônes). |
| **Couleurs** | Réutiliser les tokens Tailwind existants, ne pas en inventer d'autres pour le chrome : `brand.primary #14304D`, `brand.primary-dark #0D2038`, `brand.accent #F2994A` (orange chantier — CTA), `brand.interactive #2F6FDE`, `brand.bg #F6F7F9`, `brand.text #1B1F27`. La palette `devis.*` (`saisie` bleu, `calcule` noir, `herite` vert, `averifier` jaune) est réservée à la **sémantique de donnée** dans le métré/devis (une valeur saisie vs calculée vs héritée vs à vérifier) : ne jamais la réutiliser comme couleur de chrome générique. |
| **Typographie** | `font-sans` = Libre Franklin (titres/UI), `font-serif` = Source Serif 4 (texte courant/pédagogique), `font-mono` = JetBrains Mono (chiffres, formules, quantités). |
| **Auth réelle** | `AuthContext.jsx` + `Login.jsx` ne gèrent que **email + mot de passe** via Supabase. Il n'existe **aucune table `profiles`** : les champs Prénom/Nom/Pays/Indicatif/Numéro du brief d'origine n'ont nulle part où être enregistrés aujourd'hui. Voir §6. |
| **Mot de passe oublié** | Faisable sans toucher au backend : `supabase.auth.resetPasswordForEmail(email)` est un simple appel SDK, disponible depuis le client Supabase déjà configuré. À implémenter pour de vrai, pas en mock. |
| **Paywall existant** | `packages/app/src/components/ui/ModalePaiementMock.jsx` existe déjà (utilisé côté Formation/QCM) avec un ancien tarif (3 500 FCFA/mois, option « à la carte » 500 FCFA) et des icônes `material-icons` cassées. Le **mettre à jour** vers la grille §5, migrer ses icônes vers `Icone` — ne pas créer un second composant de paywall en parallèle. |
| **Icônes de la sidebar** | [`packages/app/src/components/layout/navigation.js`](packages/app/src/components/layout/navigation.js) est déjà la source unique lue par la sidebar desktop et le tiroir mobile — ne pas dupliquer cette liste ailleurs. Un lien vers une route absente de `ROUTES_ACTIVES` doit continuer à afficher un `EmptyState` honnête, jamais une page inventée. |

---

## 4. Identité de marque

- **Nom :** DEVIS Facile BTP
- **Slogan principal :** « Du métré au devis, sans calculs compliqués. »
- **Signature secondaire :** « Ton devis BTP dans ta poche. »
- **Variante possible :** « Calcule, vérifie et prépare tes devis depuis ton téléphone, où que tu sois. »

Choisis la formulation qui teste le mieux sur la page d'accueil et l'écran d'inscription ; note ton choix dans le rapport d'étape (§12), pas besoin d'A/B testing réel s'il n'y a pas d'outil pour ça.

---

## 5. Grille tarifaire — VALIDÉE (ne pas modifier les montants)

| Offre | Prix | Positionnement | CTA |
|---|---|---|---|
| **Gratuit** | 0 FCFA | Découvrir et tester DEVIS Facile BTP | « COMMENCER GRATUITEMENT » |
| **Calcul** | 3 500 FCFA / mois | Métré + notes de calcul (fonctions de calcul disponibles) | « PASSER À CALCUL » |
| **PRO** ⭐ *produit principal* | 5 500 FCFA / mois | Métré + notes de calcul + devis + export PDF/Excel + fonctions pro | « PASSER À PRO » |
| **PRO Annuel** *(offre la plus avantageuse)* | 50 000 FCFA / an | Toutes les fonctions PRO, à l'année | « CHOISIR L'ANNUEL » |

**Économie de l'annuel, à afficher explicitement :**
5 500 × 12 mois = 66 000 FCFA → 50 000 FCFA/an = **16 000 FCFA d'économie** (≈ 24 %).

Règle non négociable (héritée du brief d'origine, §23) : **ce calcul doit être fait dynamiquement à partir du prix mensuel réel** (une constante `PRIX_PRO_MENSUEL = 5500`), jamais un chiffre codé en dur séparément — si le prix change un jour, l'économie affichée doit rester exacte automatiquement.

Le plan PRO est mis en avant visuellement (badge « LE PLUS POPULAIRE »), sans couleurs agressives — rester dans `brand.accent`.

Tableau comparatif attendu sur la page abonnement : `Fonctionnalité | Gratuit | Calcul | PRO | Annuel` avec ✓ / — . Les fonctionnalités listées doivent être **réellement disponibles dans l'app aujourd'hui** — ne rien inventer.

---

## 6. Paiement — intégration Chariow (périmètre cadré)

Chariow expose une API (`api.chariow.com/v1`) et des webhooks (vente réussie, abonnement annulé, paiement échoué). Le flux cible :

```
Utilisateur choisit PRO (5 500)
   → bouton de paiement Chariow
   → paiement effectué
   → Chariow envoie l'événement au serveur (webhook)
   → le backend vérifie l'événement et passe le compte en PRO
   → l'utilisateur retrouve immédiatement ses fonctionnalités
```

**Ce qui est front-end aujourd'hui (à coder) :**
- la page/les cartes d'abonnement (§5) avec un bouton par offre ;
- chaque bouton payant pointe vers un lien de paiement Chariow (URL statique fournie par le fondateur, une par plan — à traiter comme une variable de config, pas une valeur à deviner) ;
- un écran de retour « Paiement en cours de confirmation » après redirection Chariow, en attendant que le statut réel arrive (voir ci-dessous) — ne jamais affirmer côté client que le paiement a réussi et débloquer PRO uniquement en local (c'est exactement le piège que le webhook sert à éviter).

**Ce qui reste backend et est HORS PÉRIMÈTRE de cette refonte** (à consigner dans `FRONTEND_BACKEND_REQUESTS.md`, déjà fait) :
- l'endpoint qui reçoit et vérifie la signature du webhook Chariow ;
- la mise à jour du plan de l'utilisateur en base après un événement validé ;
- l'API/le champ qui permet au front de lire le plan réel de l'utilisateur (`gratuit | calcul | pro | pro_annuel`) et sa date d'expiration.

Tant que ce champ n'existe pas côté backend, l'état « plan actuel » affiché dans la sidebar (§10) doit rester un composant de présentation prêt à recevoir la donnée réelle, pas un mock qui ment (pas de `localStorage.setItem('is_premium', 'true')` présenté comme un vrai paiement confirmé — c'est le anti-pattern déjà présent dans `ModalePaiementMock.jsx`).

---

## 7. Parcours principal (fil rouge de toute la refonte)

```
Inscription gratuite → Nouveau projet → Métré → Résultats
   → Note de calcul → Devis → Export PDF/Excel
```

Chaque étape doit être visuellement claire ; la logique de chaque étape existe déjà, seule sa présentation doit progresser.

---

## 8. Pages et écrans

### 8.1 Accueil (landing)
- Logo + nom en haut.
- Titre : « Du métré au devis, sans calculs compliqués. »
- Sous-titre : « Calcule tes quantités, prépare tes devis professionnels et retrouve tes projets depuis ton téléphone. »
- CTA principal : « ESSAYER GRATUITEMENT ». CTA secondaire : « DÉCOUVRIR DEVIS Facile BTP ».
- Présenter sans surcharger : Métré, Calculs, Notes de calcul, Devis, Export Excel/PDF, Gestion de projets.

### 8.2 Inscription
- Titre : « Bienvenue sur DEVIS Facile BTP » / Sous-titre : « Ton prochain devis commence ici. »
- **Champs réels aujourd'hui : email + mot de passe** (voir §3). Ne pas ajouter Prénom/Nom/Pays/Indicatif/Numéro tant que la table `profiles` n'existe pas côté backend (déjà noté dans `FRONTEND_BACKEND_REQUESTS.md`) — les afficher sans les enregistrer nulle part serait trompeur.
- Ajouter un vrai lien « Mot de passe oublié ? » (faisable, voir §3).
- Présenter la création de compte comme **gratuite**, sans jamais suggérer qu'il faut payer pour s'inscrire.

### 8.3 Première connexion / accueil post-login
- « Bonjour, [prénom si connu, sinon email] » puis « Que voulez-vous faire aujourd'hui ? »
- Actions immédiates : `+ Créer un projet`, `Faire un métré`, `Estimer un projet`, `Mes projets`.
- Bouton principal « + NOUVEAU PROJET » visible immédiatement. Pas de dashboard complexe avant que l'utilisateur ait commencé un projet.

### 8.4 Onboarding
- Très court, pas de tutoriel interminable : « Commençons par votre projet. » → « Quel type de projet voulez-vous calculer ? » → guidage progressif.

### 8.5 Interface de métré
- Améliorer hiérarchie, onglets, cartes, tableaux, titres, boutons, espacement, indicateur de progression — sans jamais sacrifier la lisibilité technique.
- Un technicien doit pouvoir lire d'un coup d'œil : **repère, données de saisie, formule, application numérique, quantité**.

### 8.6 Note de calcul
- Garder les données/calculs tels quels. Améliorer lisibilité, regroupement, ouverture/fermeture des sections, lecture des formules et des applications numériques. Doit se lire comme un document technique professionnel.

### 8.7 Devis
- Présenté comme un document professionnel. Doit permettre visuellement : modifier/ajouter/supprimer une ligne, modifier quantités/prix/désignations, exporter, imprimer — sans toucher au moteur qui produit ces lignes.

### 8.8 Export Excel/PDF
- Rendre le choix explicite une fois le devis prêt : « Votre devis est prêt. » → `[ Exporter en PDF ]` `[ Exporter en Excel ]`. Expliquer que le fichier Excel exporté reste modifiable, dans la mesure où la fonctionnalité existante le permet déjà (ne pas promettre plus que ce que `xlsx`/l'éditeur Univer permettent réellement aujourd'hui).

---

## 9. Stratégie du paywall

**Règle clé : ne jamais demander un abonnement immédiatement après l'inscription.** L'utilisateur doit d'abord voir la valeur :

```
Inscription gratuite → Premier projet → Premier métré → Résultat visible
   → l'utilisateur comprend la valeur → il demande une fonctionnalité premium → PAYWALL
```

Exemple de tonalité : « Votre métré est terminé. » → « Vous pouvez maintenant transformer votre travail en devis professionnel. » → « Cette fonctionnalité est disponible avec PRO. » avec deux boutons : `[ Voir les formules ]` `[ Continuer ]` si une voie gratuite existe. Pas de blocage artificiel.

Le paywall doit toujours dire trois choses : ce que l'utilisateur a déjà fait, ce qu'il veut obtenir, ce que l'abonnement débloque. CTA : « PASSER À PRO », second bouton : « Voir les autres formules ».

---

## 10. Sidebar

Catégories déjà en place dans `navigation.js` — les conserver, seulement améliorer hiérarchie/icônes/espacement/état actif/lisibilité/responsive : **Principal** (Tableau de bord, Nouveau métré, Mes métrés, Nouveau devis, Mes devis, Projets), **Formation**, **Compte**, **Support**.

Le bloc « Plan gratuit » doit devenir un vrai indicateur d'usage quand la donnée existe (ex. « 1/1 métré utilisé »), sinon rester honnête sur ce qui est affiché (voir §6 — pas de compteur inventé tant que le backend ne le fournit pas). Terminer par « Besoin de plus ? » → `[ Passer à PRO ]`.

Sur petit écran : jamais plus de place que nécessaire, sidebar → menu tiroir (le `MobileDrawer` existe déjà, à affiner visuellement).

---

## 11. Animations, micro-interactions, mobile, accessibilité, performance

- **Animations** : discrètes seulement — apparition progressive des cartes, transitions entre étapes, hover des boutons, progression du métré, ouverture des sections, transitions de modales, feedback après sauvegarde/génération/export. En CSS/Tailwind pur (§3). Objectif : premium, pas ludique.
- **Micro-copy de feedback**, courts : « Projet enregistré. », « Votre devis est prêt. », « Export terminé. », « Une erreur est survenue. Vérifiez les informations. »
- **Mobile-first**, cible réelle : Android, petits écrans, tablette, ordinateur. Sidebar → menu sur mobile, boutons assez grands, tableaux scrollables horizontalement dans leur propre conteneur (jamais de scroll horizontal sur `body`), pas de débordement.
- **Breakpoints à tester** : 320, 375, 390, 412, 768, 1024, 1280px+. Rien d'important ne doit être coupé.
- **Accessibilité** : contraste, taille de texte, cible des boutons, focus clavier visible, labels de formulaire, messages d'erreur clairs, navigation au clavier.
- **Performance** : ne pas ajouter de librairie sans le signaler (§3), animations fluides, pas d'images lourdes, éviter les re-renders inutiles, ne pas ralentir le moteur existant.

---

## 12. Règle de précision (non négociable)

L'app est destinée à des professionnels du BTP. Ne jamais : cacher une valeur importante, changer une unité, changer une quantité, changer une formule, arrondir visuellement une valeur de façon trompeuse, ou supprimer une information technique pour gagner de la place. **Le design sert la précision, jamais l'inverse.**

---

## 13. Méthode de travail — par étapes, une à la fois

1. Audit complet du front-end existant (pages, composants réutilisables, écarts avec ce prompt).
2. Accueil + identité visuelle.
3. Inscription + connexion (+ mot de passe oublié).
4. Accueil post-connexion + onboarding.
5. Métré + navigation.
6. Note de calcul.
7. Devis + export.
8. Abonnements (§5) + paywall (§9) + intégration Chariow front (§6).
9. Animations + micro-interactions.
10. Mobile + responsive (tous les breakpoints §11).
11. Tests de non-régression (§14).

Boucle à chaque étape : analyser → modifier → tester → comparer avant/après → corriger → valider → étape suivante. Ne pas tout modifier d'un coup.

---

## 14. Tests de non-régression, à chaque étape

Après **chaque** modification, revérifier : connexion, inscription, navigation, création de projet, métré, résultats, notes de calcul, devis, sauvegarde, export, page abonnement. Toute fonctionnalité existante cassée doit être corrigée immédiatement avant de continuer.

Rappel du principe déjà en vigueur dans ce projet : **toutes les fonctionnalités doivent donner** — aucun bouton ni élément d'UI décoratif qui ne fait rien.

---

## 15. Rapport attendu après chaque étape

```
ÉTAPE :
PROBLÈMES IDENTIFIÉS :
MODIFICATIONS :
PAGES MODIFIÉES :
FONCTIONNALITÉS FRONT-END AJOUTÉES :
ANIMATIONS AJOUTÉES :
TESTS EFFECTUÉS :
RÉSULTAT :
PROBLÈMES RESTANTS :
```

Ne pas toucher au backend. Ne pas toucher aux formules. Ne pas toucher aux algorithmes de calcul.
