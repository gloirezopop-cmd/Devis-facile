# Besoins backend identifiés depuis le front-end

Le backend est gelé pendant la refonte front-end (voir `PROMPT-ANTIGRAVITY-REFONTE-FRONTEND.md`), à l'exception du besoin n°3 ci-dessous, dont le gel a été levé le 2026-09-07 à la demande explicite du fondateur. Ce fichier liste ce qui manque côté serveur/données pour que certains écrans front soient honnêtes plutôt que mockés. Ajouter une entrée ici plutôt que de coder la solution.

---

## 1. Table `profiles` (prénom, nom, pays, indicatif, numéro)

**Besoin front :** l'écran d'inscription voudrait collecter Prénom / Nom / Pays / Indicatif / Numéro, et afficher « Bonjour, [Prénom] » après connexion.

**État actuel :** `AuthContext.jsx` ne gère que email + mot de passe (Supabase Auth standard). Une table `public.profiles` existe déjà (`id`, `email`, `is_admin`, `created_at` — voir `schema_verrouillage.sql`, créée pour le rôle administrateur), mais sans les champs Prénom/Nom/Pays/Indicatif/Numéro.

**Besoin exact :** ajouter à `public.profiles` les colonnes `prenom text`, `nom text`, `pays text`, `indicatif text`, `numero text` (RLS déjà en place : un utilisateur ne lit que sa propre ligne, aucune politique d'écriture ne lui est accordée), plus le câblage `signUp` pour les renseigner à l'inscription.

---

## 2. Plan d'abonnement de l'utilisateur

**Besoin front :** afficher le vrai plan actif (Gratuit / Calcul / Devis Complet / PRO Annuel) dans la sidebar et sur la page abonnement, et débloquer réellement les fonctionnalités payantes.

**État actuel : déjà en place**, plus avancé que ce que cette entrée décrivait à l'origine. Les tables `subscription_plans` (catalogue des trois formules, prix, `entitlements` jsonb) et `subscriptions` (abonnement par utilisateur, `status`, `end_date`) existent (`maj_formules.sql`), avec un moteur de droits testé côté client (`src/utils/offres.js`) et côté serveur (`droits_utilisateur()` dans `schema_verrouillage.sql`, qui fait autorité). RLS déjà vérifiée : le navigateur ne peut ni lire les abonnements d'un autre, ni s'en attribuer un (`verifier-offres.mjs`).

**Point de vigilance découvert le 2026-09-07 :** `npm run verifier:offres` montre que la base de **production** porte encore l'ancienne formule unique (`Résumé`, 3 500 XAF, `ONE_TIME`) — `maj_formules.sql` (les trois formules `calcul`/`devis_complet`/`pro_annuel`, mensuelles + annuelle) a été écrit mais **jamais exécuté** en base. À faire avant toute autre chose touchant les formules ou les paiements.

---

## 3. Webhook Chariow (paiement PRO) — codé le 2026-09-07, pas encore déployé

**Besoin front :** un bouton « Passer à PRO » qui déclenche un vrai paiement Chariow, et un plan qui passe en PRO automatiquement une fois le paiement confirmé — pas juste côté navigateur.

**État actuel :** codé. `Paywall.jsx` appelle désormais `supabase.functions.invoke('chariow-checkout', ...)` au lieu du lien statique que `ModalePaiementMock.jsx` utilise encore ; `supabase/functions/chariow-webhook` vérifie la signature HMAC de Chariow et accorde l'accès. Spécification complète : [`CHARIOW_INTEGRATION_SPEC.md`](CHARIOW_INTEGRATION_SPEC.md). Marche à suivre pour le déploiement : [`supabase/README.md`](supabase/README.md).

**Ce qu'il reste à faire, dans l'ordre, avant que ça fonctionne réellement :**
1. Exécuter `maj_formules.sql` (voir le point de vigilance du besoin n°2 — condition bloquante : sans les trois formules `calcul`/`devis_complet`/`pro_annuel` en base, `chariow-checkout` ne trouve aucune formule par son id).
2. Exécuter `maj_paiement_chariow.sql` (ajoute les tables/colonnes propres à Chariow).
3. Créer les trois produits **Licence** dans Chariow et renseigner `subscription_plans.chariow_product_id`.
4. Déployer les deux fonctions et poser les secrets serveur (`supabase/README.md`).
5. Configurer le Pulse côté Chariow avec l'URL de la fonction webhook déployée.

**Volontairement non fait dans cette passe** (détaillé dans `supabase/README.md`) : job de réconciliation pour un webhook manqué, bouton « Restaurer mon achat », rate limiting sur le endpoint de checkout, alertes de monitoring.

**Point de coordination :** `Paywall.jsx` et `CarteFormule.jsx` ont été modifiés pour appeler la fonction de checkout. Ce sont aussi des fichiers que `PROMPT-ANTIGRAVITY-REFONTE-FRONTEND.md` place sous la responsabilité de la refonte front-end menée en parallèle — à coordonner pour qu'aucun des deux chantiers n'écrase le travail de l'autre.

**Sécurité immédiate, indépendante de la date d'implémentation :** si une clé secrète Chariow a été exposée à un moment (collée dans un chat, un commit, une capture), elle doit être révoquée dans app.chariow.com → Paramètres → Clés API dès que possible, et une nouvelle générée — voir §0 du document lié.

---

*(Ajouter les prochains besoins ci-dessous, même format : Besoin front / État actuel / Besoin exact.)*
