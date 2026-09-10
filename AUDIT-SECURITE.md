# Audit de sécurité — Devis Facile BTP

**Date :** 2026-09-10 · **Périmètre :** dépôt complet (`packages/app`, `packages/moteur`, `supabase/`, scripts SQL)
**Méthode :** lecture intégrale, puis parcours de la checklist en 8 sections.

> ⚠️ Ce document décrit des faiblesses d'une application **en production**.
> Il n'a pas vocation à sortir du dépôt.

---

## Passe 1 — Architecture

| | |
|---|---|
| **Type** | SPA React 18 + Vite, monorepo npm workspaces. **Aucun serveur applicatif.** |
| **Hébergement** | Vercel — fichiers statiques + réécriture SPA (`vercel.json`) |
| **Base** | Supabase (PostgreSQL), ref `nrzreoumwmnhvzglffjt`, accès **direct depuis le navigateur** avec la clé anon |
| **Authentification** | Supabase Auth (e-mail + mot de passe), `AuthContext.jsx` |
| **Code serveur** | 3 Edge Functions Deno : `chariow-checkout`, `chariow-webhook`, `envoyer-invitation` |
| **Paiement** | Chariow (Orange Money / MTN / carte), webhook signé |
| **Moteur de calcul** | `packages/moteur`, JavaScript pur, sans I/O — hors périmètre de sécurité |

**Conséquence majeure pour cet audit.** Il n'y a pas de couche API à protéger : le navigateur
parle directement à PostgreSQL. **Le Row Level Security n'est pas une défense parmi d'autres,
c'est la seule.** Tout contrôle écrit en React est de l'ergonomie, jamais de la sécurité — la clé
anon est publique par construction (elle est dans le bundle JS), et n'importe qui peut appeler
l'API avec son propre jeton.

### Points d'entrée

| Point d'entrée | Authentification | Barrière réelle |
|---|---|---|
| Toutes les pages `/*` | `PrivateRoute` (React) | Aucune — cosmétique |
| Lectures/écritures Supabase | JWT dans l'en-tête | **RLS** |
| 17 fonctions RPC `SECURITY DEFINER` | JWT | Garde interne (`auth.uid()`, `est_admin()`, `est_fondateur()`) |
| `POST /functions/v1/chariow-checkout` | JWT vérifié par `getUser()` | Vérification serveur |
| `POST /functions/v1/chariow-webhook` | **Signature HMAC** | Signature + anti-rejeu |
| `POST /functions/v1/envoyer-invitation` | JWT + `est_fondateur()` en base | Vérification serveur |

---

## Passe 2 — Checklist

### Section 1 — Variables d'environnement et secrets

**1.1 Secrets codés en dur — ✅ PASSE**
Recherche des motifs `sk_live_`, `sk_test_`, `pk_live_`, `ghp_`, `gho_`, `github_pat_`, `xoxb-`,
`xoxp-`, `AKIA[0-9A-Z]{16}`, `eyJ…`, `service_role` sur tout le dépôt. Les seules occurrences sont
des **espaces réservés de documentation** : `CHARIOW_INTEGRATION_SPEC.md:106` (`sk_live_xxxxxxxxxxxx`),
`supabase/README.md:43`. Les fichiers `.agents/skills/**` sont la documentation de Claude Code, pas
l'application. Aucun secret réel.

**1.2 Couverture .gitignore — ⚠️ PARTIEL** → *Conclusion #6*
`.env` et `.env.local` sont couverts. `.env.production`, `.env.development.local` et le motif
générique `.env*.local` ne le sont pas. Aucun fichier `.env` n'a jamais été commité — seul
`packages/app/.env.example` l'est, et il ne contient que des espaces réservés.

**1.3 Fuites de préfixe public — ✅ PASSE**
Deux variables `VITE_` seulement : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
(`packages/app/src/lib/supabaseClient.js:8-9`). Les deux sont **publiques par conception**.
`SUPABASE_SERVICE_ROLE_KEY` n'apparaît que dans `supabase/functions/_shared/chariow.ts:45`, lu par
`Deno.env` côté serveur. Aucune clé d'écriture n'a de préfixe public.

**1.4 Fuites console/erreurs — ✅ PASSE**
Deux `console` seulement touchent à la configuration :
`supabaseClient.js:12` (« URL ou Anon Key introuvable » — aucune valeur affichée) et
`brouillonApi.js:25` (nom d'un script SQL). Côté Edge Functions,
`chariow-checkout/index.ts:150,157` journalisent la réponse de Chariow **dans les logs serveur**,
jamais vers le client. Aucune variable d'environnement n'est affichée.

**1.5 Exposition des artefacts de build — ✅ PASSE**
`packages/app/vite.config.js` ne définit pas `build.sourcemap`. Vite ne génère donc pas de
source maps en production. Vérifié : aucun `.map` dans `dist/assets/`.

**1.6 Validation au démarrage — ❌ ÉCHOUE** → *Conclusion #5*

---

### Section 2 — Sécurité de la base de données

**2.1 RLS activée — ⚠️ PARTIEL** → *Conclusion #1 (le plus important de cet audit)*
**15 tables sur 15** créées par les scripts du dépôt ont `enable row level security` :
`brouillons`, `construction_rates`, `estimation_building_types`, `estimation_countries`,
`estimation_locations`, `estimation_roof_types`, `estimation_standings`, `investisseurs_invites`,
`payment_intents`, `profiles`, `projects`, `qcm_questions`, `qcm_results`, `qcm_subjects`,
`webhook_deliveries`.

**Mais quatre tables utilisées par le code ne sont créées nulle part dans le dépôt :**
`payments`, `subscriptions`, `analytics_events`, `subscription_plans`. Elles ont été créées
directement dans l'éditeur SQL de Supabase. Leur RLS est donc **invérifiable depuis le code** —
et ce sont précisément celles qui portent l'argent et les droits d'accès.

**2.2 Les policies existent — ✅ PASSE**
Chaque table lisible par le navigateur porte au moins une policy `select`.
`investisseurs_invites` et `webhook_deliveries` ont la RLS active **sans aucune policy** : c'est
délibéré et correct — elles ne sont atteintes que par des fonctions `security definer` et par la
clé service. Le commentaire de `maj_investisseurs.sql` le dit explicitement.

**2.3 Clauses WITH CHECK — ✅ PASSE**
Toutes les policies `insert`/`update`/`all` en portent une :
`projects` (`schema.sql:24,30`), `brouillons` (`maj_brouillon.sql`),
`construction_rates` (`maj_investisseurs.sql`, bloc 11), `qcm_results` (`schema_qcm.sql:55`).
Aucune écriture ne permet d'usurper un `user_id`.

**2.4 Source d'identité — ✅ PASSE**
Toutes les policies et toutes les fonctions utilisent `auth.uid()`.
**Aucune occurrence** de `auth.jwt()->'user_metadata'` — c'est le bon réflexe, ces métadonnées
sont modifiables par l'utilisateur lui-même.

**2.5 Isolation de service_role — ✅ PASSE**
`clientAdmin()` (`_shared/chariow.ts:43`) est importé par `chariow-checkout` et `chariow-webhook`
uniquement. **Zéro occurrence dans `packages/app`.** L'usage est légitime : le webhook doit écrire
des abonnements pour un utilisateur qui n'est pas l'appelant.

**2.6 Policies des buckets de stockage — ⬚ N/A**
Supabase Storage n'est pas utilisé. Aucun `storage.from(` dans le dépôt. Le seul fichier manipulé
est le logo de projet, converti en data URL et gardé dans `localStorage`.

**2.7 Injection SQL — ✅ PASSE**
Aucun SQL brut côté client. Tous les accès passent par le client Supabase (requêtes paramétrées)
ou par `.rpc('nom_fixe', { params })` — aucun nom de fonction interpolé, aucun `.filter()` ou
`.or()` construit par template. Dans les fonctions PL/pgSQL, les `execute` de `maj_investisseurs.sql`
n'interpolent **aucune donnée utilisateur** : ce sont des chaînes littérales de DDL.

**2.8 Fonctions SECURITY DEFINER — ✅ PASSE**
17 fonctions, toutes gardées :

| Garde | Fonctions |
|---|---|
| `est_fondateur()` | `nommer_investisseur`, `retirer_investisseur`, `investisseurs_admin`, `inviter_investisseur`, `invitations_admin`, `annuler_invitation`, `comptes_admin` |
| `est_admin()` | `statistiques_admin` (clés d'argent en plus derrière `est_fondateur()`) |
| `auth.uid()` | `est_admin`, `est_fondateur`, `droits_utilisateur`, `estimer_projet`, `marquer_projet_calcule`, `mes_revenus_investisseur`, `protege_privileges` |
| Déclencheur | `creer_profil` (insère la ligne du nouvel utilisateur), `applique_invitation_investisseur` |

Vérifié en détail : `droits_utilisateur` (`maj_admin.sql:66`) filtre bien
`where s.user_id = auth.uid()` dans sa branche non-administrateur. `mes_revenus_investisseur`
ne renvoie **jamais** le chiffre d'affaires total, seulement la part de l'appelant. Toutes portent
`set search_path = public` — bonne pratique contre le détournement de schéma.

---

### Section 3 — Authentification et sessions

**3.1 Middleware d'auth — ⬚ N/A (adapté)**
Aucun middleware n'existe et **aucun n'est possible** : l'application est une SPA statique servie
par un CDN. `PrivateRoute` (`App.jsx:33`) n'est qu'un aiguillage d'affichage. Le contrôle réel
est en base. C'est l'architecture correcte pour ce modèle, pas une lacune.

**3.2 Routage par défaut en refus — ⚠️ PARTIEL**
Les routes privées sont regroupées sous
`<Route element={<PrivateRoute><Layout /></PrivateRoute>}>` (`App.jsx:84`), ce qui est bien un
refus par défaut **à l'intérieur du groupe**. Mais une route ajoutée au niveau supérieur (comme
`/accueil` et `/login`) est publique sans que rien ne le signale. Portée réelle : cosmétique — une
page affichée à tort ne montrerait rien, la base refusant de répondre.

**3.3 getUser() vs getSession() — ✅ PASSE**
`getSession()` n'est utilisé qu'une fois (`AuthContext.jsx:13`) pour restaurer l'état d'affichage
au chargement — usage légitime. Toutes les opérations sensibles utilisent `getUser()` :
`brouillonApi.js:30,47,68`, `estimationApi.js:73,149`, et surtout les deux Edge Functions
(`chariow-checkout:66`, `envoyer-invitation:150`), qui valident le JWT auprès de Supabase avant
toute action.

**3.4 Gestionnaire de callback auth — ⬚ N/A**
Pas d'OAuth, pas de route `/auth/callback`. L'authentification est e-mail + mot de passe.

**3.5 Stockage de session — ⚠️ PARTIEL**
Le SDK Supabase place la session dans `localStorage` par défaut, donc lisible par tout JavaScript
de la page. Les cookies `httpOnly` exigeraient un rendu serveur, que cette architecture n'a pas.
**Facteur atténuant décisif :** aucune injection HTML n'est possible dans l'application — voir 4.3
— donc pas de vecteur XSS pour exploiter ce stockage.

**3.6 Routes API protégées — ✅ PASSE**
Les trois Edge Functions vérifient l'appelant avant tout traitement :
`chariow-checkout:56-67` (401 sans en-tête, `getUser()`), `envoyer-invitation:139-158`
(401 sans en-tête, `getUser()`, **puis `est_fondateur()` demandé à la base**),
`chariow-webhook:22-29` (signature HMAC). Aucune n'oublie la vérification.

**3.7 Sécurité OAuth — ⬚ N/A** — pas d'OAuth.

**3.8 Réinitialisation de mot de passe — ✅ PASSE**
`AuthContext.jsx:47` délègue à `supabase.auth.resetPasswordForEmail()`. L'expiration, l'usage
unique et la transmission sont gérés par Supabase Auth, jamais réimplémentés — c'est le bon choix.

---

### Section 4 — Validation côté serveur

**4.1 Validation par schéma — ⚠️ PARTIEL**
Aucune librairie de schéma (Zod, Yup…). La validation est faite à la main mais **elle existe au bon
endroit** :
- en base, dans les fonctions : `p_part is null or p_part <= 0 or p_part > 100`
  (`nommer_investisseur`), plus une contrainte `check (part_investissement >= 0 and <= 100)` ;
- dans les Edge Functions : `envoyer-invitation:161-164` valide l'adresse et la part ;
  `chariow-checkout:88` refuse un plan absent, `:98` un plan inconnu.

Ce qui manque est la rigueur d'un schéma (types, champs inattendus), pas le principe. Sur une
surface de trois endpoints, l'écart est faible.

**4.2 Identité depuis la session — ✅ PASSE**
Aucune écriture ne prend l'identité depuis le corps de la requête. En base, `auth.uid()` fait foi
partout. Dans `chariow-checkout`, l'utilisateur vient de `getUser()` (`:66`), jamais du corps.
Dans `envoyer-invitation`, la qualité de fondateur est **redemandée à la base** avec le jeton de
l'appelant (`:155`) plutôt que déduite dans la fonction — la règle n'existe qu'à un seul endroit.

**4.3 Nettoyage des entrées (XSS) — ✅ PASSE**
**Zéro occurrence** de `dangerouslySetInnerHTML`, `innerHTML =` ou `document.write` dans
`packages/app/src`. React échappe tout par défaut. C'est ce qui neutralise le risque relevé en 3.5.
*(`utils/sanitize.js` ne traite pas le XSS : il convertit des chaînes en nombres pour le moteur de
calcul. Le nom prête à confusion.)*

**4.4 Application des méthodes HTTP — ✅ PASSE**
Les Edge Functions refusent explicitement tout ce qui n'est pas `POST`
(`chariow-checkout:53`, `envoyer-invitation:137`, `chariow-webhook:17` → 405). Les RPC Supabase
sont en `POST` par construction.

**4.5 Fuites d'informations dans les erreurs — ⚠️ PARTIEL**
Les messages d'erreur de la base remontent tels quels à l'écran
(`GestionInvestisseurs.jsx:61`). C'est **délibéré et utile** — « Aucun compte avec cette adresse »
vaut mieux qu'un échec générique — et ces fonctions sont réservées au fondateur.
`envoyer-invitation:189` renvoie le message brut du fournisseur d'e-mail (502) : là encore, seul
le fondateur peut l'atteindre. Aucune trace de pile, aucun chemin de fichier, aucun nom de variable
d'environnement ne fuit.

**4.6 Vérification de signature de webhook — ✅ PASSE (exemplaire)**
`chariow-webhook/index.ts:20-29` : corps lu **en brut avant tout parsing**, HMAC-SHA256,
comparaison en **temps constant** (`egaliteEnTempsConstant`), 401 si écart. S'y ajoute une
protection anti-rejeu par `x-pulse-delivery-id` contre la table `webhook_deliveries` (`:40-45`).
C'est la mise en œuvre correcte, dans le bon ordre.

---

### Section 5 — Dépendances

**5.1 Résultats d'audit — ❌ ÉCHOUE** → *Conclusion #7*
`npm audit --omit=dev` : **33 vulnérabilités (2 moyennes, 31 hautes)**.

**5.2 Packages hallucinés — ✅ PASSE**
Toutes les dépendances sont des paquets établis : React, React Router, Supabase, Univer, jsPDF,
Tailwind, SheetJS. Aucun nom douteux, aucune publication récente inconnue.

**5.3 Lockfile commité — ✅ PASSE**
`package-lock.json` est suivi par git.

**5.4 Packages obsolètes — ⚠️ PARTIEL**
`xlsx` (SheetJS) est la préoccupation réelle : le paquet npm n'est plus maintenu, ses CVE sont
marquées **« no fix available »**, et l'éditeur distribue désormais depuis son propre CDN.
`react-router-dom` 6.30.6 porte une CVE d'hydratation SSR — **non atteignable ici**, l'application
n'a pas de rendu serveur.

**5.5 Dépendances inutilisées — ⚠️ PARTIEL**
`xlsx` est déclaré **deux fois** : à la racine et dans `packages/app`. Celui de la racine ne sert à
rien. `rxjs` et plusieurs `@univerjs/*` sont probablement des dépendances transitives d'Univer
remontées à tort en dépendances directes.

---

### Section 6 — Limitation de débit

**6.1 Opérations coûteuses — ❌ ÉCHOUE** → *Conclusion #3*

**6.2 Endpoints d'authentification — ⚠️ PARTIEL**
Aucune limitation dans le code. Supabase Auth en applique une par défaut côté plateforme
(connexion, inscription, envoi d'e-mail). Elle n'est ni configurée ni vérifiée dans ce projet —
à contrôler dans le tableau de bord Supabase, section Auth → Rate Limits.

**6.3 Vérification de l'implémentation — ⬚ N/A** — rien n'est implémenté.

---

### Section 7 — CORS

**7.1 CORS des routes API — ❌ ÉCHOUE** → *Conclusion #4*

**7.2 Mode credentials — ✅ PASSE**
`Access-Control-Allow-Credentials` n'est **jamais** émis. Le joker de repli est donc bien moins
dangereux qu'il n'y paraît : les navigateurs refusent une requête avec identifiants vers une
origine `*`. L'authentification passe par un en-tête `Authorization`, pas par un cookie.

---

### Section 8 — Téléchargements de fichiers

**8.1 Validation côté serveur — ⬚ N/A**
Aucun fichier n'est envoyé à un serveur. Le seul `<input type="file">`
(`LogoProjet.jsx:66`) lit l'image **dans le navigateur** via `FileReader` et la garde en data URL
dans `localStorage`. Les contrôles présents (`fichier.type.startsWith('image/')`, 800 Ko max)
protègent l'utilisateur de lui-même, pas un serveur.

**8.2 Permissions de stockage — ⬚ N/A** — pas de stockage distant.

**8.3 Prévention d'exécution — ⬚ N/A** — rien n'atteint un système de fichiers serveur.

---

## Conclusions

```
┌─────────────────────────────────────────────────────────┐
│ CONCLUSION #1                                           │
├──────────┬──────────────────────────────────────────────┤
│ Sévérité │ HAUTE (conditionnelle)                       │
│ Catégorie│ Policies RLS héritées non supprimées         │
│ Emplacement│ maj_investisseurs.sql (bloc 11)            │
│          │ schema_estimation.sql:137-141                │
│ CWE      │ CWE-732 (Attribution de permission           │
│          │ incorrecte à une ressource critique)         │
└──────────┴──────────────────────────────────────────────┘
```
**Ce qui ne va pas.** Les policies RLS de PostgreSQL sont **cumulatives** : il suffit qu'une seule
autorise pour que l'accès passe. `schema_estimation.sql` crée deux policies très ouvertes sur
`construction_rates` :

```sql
create policy "Lecture publique des tarifs" on public.construction_rates
  for select using (true);
create policy "Écriture des tarifs par un compte connecté" on public.construction_rates
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

Le bloc 11 de `maj_investisseurs.sql` ne supprime que les deux policies **qu'il connaît**
(« …à l'administration », « …au fondateur »). Il laisse les deux ci-dessus intactes. Elles ont bien
été supprimées par `schema_verrouillage.sql:78-79` — mais rien ne garantit l'ordre d'exécution,
et rejouer `schema_estimation.sql` (un script explicitement « relançable ») les recrée.

**Pourquoi c'est important.** Si l'une des deux subsiste, la grille tarifaire complète est
**lisible sans être connecté** et **modifiable par n'importe quel compte inscrit** — malgré la
nouvelle policy fondateur, qui ne peut rien y faire. C'est la grille des prix : le cœur commercial
du produit. Un concurrent la télécharge ; un utilisateur mécontent la modifie et fausse tous les
devis du système.

**La correction.** Dans le bloc 11 de `maj_investisseurs.sql`, avant le `create policy` :

```sql
execute $sql$ drop policy if exists "Lecture publique des tarifs" on public.construction_rates $sql$;
execute $sql$ drop policy if exists "Écriture des tarifs par un compte connecté" on public.construction_rates $sql$;
```

**Vérification immédiate** (à lancer dans l'éditeur SQL — dit l'état réel) :

```sql
select policyname, cmd, qual::text as condition
  from pg_policies
 where schemaname = 'public' and tablename = 'construction_rates';
```
Attendu : **une seule ligne**, `Les tarifs sont réservés au fondateur`.

**Effort :** ~5 minutes.

---

```
┌─────────────────────────────────────────────────────────┐
│ CONCLUSION #2                                           │
├──────────┬──────────────────────────────────────────────┤
│ Sévérité │ HAUTE                                        │
│ Catégorie│ RLS non vérifiable — tables hors dépôt       │
│ Emplacement│ payments, subscriptions, analytics_events, │
│          │ subscription_plans (créées hors du dépôt)    │
│ CWE      │ CWE-1059 (Documentation insuffisante)        │
│          │ + risque CWE-284 (Contrôle d'accès impropre) │
└──────────┴──────────────────────────────────────────────┘
```
**Ce qui ne va pas.** Quatre tables sont lues et écrites par le code mais n'ont **aucune définition
dans le dépôt** : aucun `create table`, aucun `enable row level security`, aucune policy. Elles ont
été créées à la main dans l'éditeur SQL de Supabase.

**Pourquoi c'est important.** Ce sont exactement les tables qui comptent :
`payments` (montants encaissés), `subscriptions` (qui a payé quoi), `subscription_plans` (les
prix), `analytics_events` (l'activité). Si l'une d'elles n'a pas la RLS activée, **son contenu
entier est lisible par quiconque possède la clé anon** — c'est-à-dire par n'importe quel visiteur,
la clé étant dans le bundle JavaScript. Et si `subscriptions` est écrivable, un utilisateur
s'accorde un abonnement gratuit.

Je ne peux **ni confirmer ni infirmer** depuis le code. Ce n'est pas une faille prouvée : c'est un
angle mort, et il porte sur l'argent.

**La correction.** Vérifier d'abord (une requête, réponse immédiate) :

```sql
select c.relname as table_name,
       c.relrowsecurity as rls_active,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as nb_policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by c.relrowsecurity, c.relname;
```
Toute ligne avec `rls_active = false` est une fuite ouverte. Toute ligne avec
`rls_active = true, nb_policies = 0` est fermée (correct si l'accès passe par des fonctions
`security definer`, ce qui est le cas pour `payments` et `subscriptions`).

Puis écrire un script `schema_paiements.sql` qui recrée ces quatre tables et leurs policies, pour
que le dépôt redevienne la description complète de la base.

**Effort :** ~10 minutes pour la vérification, ~45 minutes pour le script.

---

```
┌─────────────────────────────────────────────────────────┐
│ CONCLUSION #3                                           │
├──────────┬──────────────────────────────────────────────┤
│ Sévérité │ MOYENNE                                      │
│ Catégorie│ Absence de limitation de débit               │
│ Emplacement│ supabase/functions/chariow-checkout/index.ts│
│          │ supabase/functions/envoyer-invitation/index.ts│
│ CWE      │ CWE-770 (Allocation de ressources sans limite)│
└──────────┴──────────────────────────────────────────────┘
```
**Ce qui ne va pas.** Aucune des deux fonctions qui appellent une API **payante** ne limite le
nombre d'appels par utilisateur. Aucune trace de `rate limit`, de compteur ou de Redis dans le
dépôt.

**Pourquoi c'est important.** `chariow-checkout` est ouverte à **tout compte inscrit** — et
l'inscription est libre. Une boucle crée des milliers d'intentions de paiement, pollue
`payment_intents`, et martèle l'API de Chariow avec votre clé : suspension probable du compte
marchand. `envoyer-invitation` est réservée au fondateur, donc peu exposée, mais un envoi en boucle
brûlerait le quota d'e-mails et ferait chuter la réputation du domaine expéditeur.

**La correction.** Un compteur en base, appliqué avant l'appel externe :

```sql
create table if not exists public.appels_fonctions (
  user_id uuid not null,
  fonction text not null,
  appele_le timestamptz not null default now()
);
create index if not exists appels_fonctions_recherche
  on public.appels_fonctions (user_id, fonction, appele_le desc);
alter table public.appels_fonctions enable row level security;
```

```ts
// Dans chariow-checkout, juste après getUser() :
const { count } = await admin
  .from('appels_fonctions')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('fonction', 'chariow-checkout')
  .gt('appele_le', new Date(Date.now() - 3600_000).toISOString());

if ((count ?? 0) >= 10) {
  return reponse(429, { error: 'Trop de tentatives de paiement. Réessayez dans une heure.' });
}
await admin.from('appels_fonctions').insert({ user_id: user.id, fonction: 'chariow-checkout' });
```

Dix paiements par heure et par compte : sans effet pour un client réel, mortel pour une boucle.

**Effort :** ~30 minutes.

---

```
┌─────────────────────────────────────────────────────────┐
│ CONCLUSION #4                                           │
├──────────┬──────────────────────────────────────────────┤
│ Sévérité │ MOYENNE                                      │
│ Catégorie│ Réponses du QCM lisibles publiquement        │
│ Emplacement│ schema_qcm.sql (policy « Lecture publique  │
│          │ des questions »)                             │
│ CWE      │ CWE-200 (Exposition d'informations)          │
└──────────┴──────────────────────────────────────────────┘
```
**Ce qui ne va pas.** La table porte les bonnes réponses, et la policy est ouverte à tous :

```sql
create table public.qcm_questions (
  ...
  options jsonb not null default '[]'::jsonb, -- [{ "id": "A", "isCorrect": true/false }]
  correct_answer text not null,
  explanation text,
  ...
);
create policy "Lecture publique des questions"
  on public.qcm_questions for select using ( true );
```

**Pourquoi c'est important.** Une seule requête avec la clé anon — publique — suffit à récupérer
**la totalité de la banque de questions, leurs bonnes réponses et leurs explications**, sans même
créer de compte. C'est le contenu de formation des « 60 sujets ». Deux conséquences : l'épreuve ne
mesure plus rien, et un contenu qui a de la valeur commerciale est récupérable intégralement par un
concurrent en une requête.

**La correction.** Réserver la lecture aux comptes connectés, puis retirer la réponse de ce que le
navigateur reçoit :

```sql
drop policy if exists "Lecture publique des questions" on public.qcm_questions;
create policy "Questions reservees aux comptes connectes" on public.qcm_questions
  for select using (auth.uid() is not null);
```

Correction complète (l'énoncé sans la réponse, la correction évaluée en base) :

```sql
create or replace function public.questions_du_sujet(p_sujet text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'question_text', q.question_text,
    -- les options, privées de `isCorrect`
    'options', (select jsonb_agg(o - 'isCorrect') from jsonb_array_elements(q.options) o)
  ) order by q."order"), '[]'::jsonb)
  from public.qcm_questions q
  where q.subject_id = p_sujet and auth.uid() is not null;
$$;
```

**Effort :** ~5 minutes pour la première étape, ~1 heure pour la seconde (il faut aussi adapter
`SujetSession.jsx`, qui évalue les réponses dans le navigateur).

---

```
┌─────────────────────────────────────────────────────────┐
│ CONCLUSION #5                                           │
├──────────┬──────────────────────────────────────────────┤
│ Sévérité │ BASSE                                        │
│ Catégorie│ Absence de validation au démarrage           │
│ Emplacement│ packages/app/src/lib/supabaseClient.js:11-16│
│ CWE      │ CWE-1188 (Initialisation à une valeur         │
│          │ non sécurisée par défaut)                    │
└──────────┴──────────────────────────────────────────────┘
```
**Ce qui ne va pas.** Si la configuration manque, l'application écrit un avertissement dans la
console et **continue** avec un client vide :

```js
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL ou Anon Key introuvable. Vérifiez votre fichier .env.local');
}
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
```

**Pourquoi c'est important.** Ce n'est pas une faille exploitable, c'est un piège de
disponibilité — et il s'est **déjà déclenché en production** : un déploiement Vercel sans les
variables a produit une page blanche totale, sans message, difficile à diagnostiquer. Un appel qui
échoue bruyamment au démarrage coûte une minute ; une page blanche silencieuse coûte une journée.

**La correction.**

```js
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configuration Supabase absente : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requises. ' +
    'En local, renseignez packages/app/.env.local ; sur Vercel, Settings → Environment Variables ' +
    '(type Config, jamais Secret — Vercel refuse un préfixe public en Secret).'
  );
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Effort :** ~5 minutes.

---

```
┌─────────────────────────────────────────────────────────┐
│ CONCLUSION #6                                           │
├──────────┬──────────────────────────────────────────────┤
│ Sévérité │ BASSE (préventive)                           │
│ Catégorie│ Couverture .gitignore incomplète             │
│ Emplacement│ .gitignore:4-5                             │
│ CWE      │ CWE-538 (Insertion d'informations sensibles  │
│          │ dans un fichier accessible)                  │
└──────────┴──────────────────────────────────────────────┘
```
**Ce qui ne va pas.** `.env` et `.env.local` sont ignorés, mais pas `.env.production`,
`.env.development.local`, ni le motif générique. Aucun secret n'a fuité à ce jour — c'est une
protection manquante, pas un incident.

**Pourquoi c'est important.** Le jour où un `.env.production` est créé, il sera commité sans
avertissement. Et un secret entré dans l'historique git y reste même après suppression : il faut
alors le **révoquer**, pas seulement l'effacer.

**La correction.**

```gitignore
node_modules/
dist/
build/
.env
.env.*
!.env.example
*.log
.DS_Store
Thumbs.db
```

**Effort :** ~2 minutes.

---

```
┌─────────────────────────────────────────────────────────┐
│ CONCLUSION #7                                           │
├──────────┬──────────────────────────────────────────────┤
│ Sévérité │ BASSE (portée réelle limitée)                │
│ Catégorie│ Dépendances vulnérables                      │
│ Emplacement│ package.json, packages/app/package.json    │
│ CWE      │ CWE-1104 (Composant tiers non maintenu)      │
└──────────┴──────────────────────────────────────────────┘
```
**Ce qui ne va pas.** `npm audit --omit=dev` remonte **33 vulnérabilités (2 moyennes, 31 hautes)**,
réparties sur `xlsx`, `react-router` / `react-router-dom`, `nanoid` et 27 paquets `@univerjs/*`
(transitives).

**Pourquoi c'est important — et pourquoi moins qu'il n'y paraît.** J'ai vérifié l'atteignabilité
des deux principales plutôt que de recopier le score :

- **`xlsx`** — *Prototype Pollution* et *ReDoS*, « no fix available ». Les deux visent l'**analyse**
  de classeurs non fiables. Or `xlsx` n'est utilisé qu'en **écriture** ici : `book_new`,
  `aoa_to_sheet`, `writeFile` (`ApercuDevis.jsx:60-93`, `exports.js:76-104`). **Aucun `XLSX.read()`
  d'un fichier utilisateur.** Non atteignable en l'état.
- **`react-router-dom`** — injection de constructeur via `deserializeErrors()` lors de
  l'**hydratation SSR**. Cette application n'a pas de rendu serveur. Non atteignable.

Le vrai sujet est la dette : `xlsx` sur npm n'est plus maintenu.

**La correction.** Ne pas lancer `npm audit fix --force` : il installerait React Router 7, un
changement de version majeure, pour corriger une faille non atteignable. À faire plutôt :

```bash
npm uninstall xlsx --workspace=.          # doublon à la racine, inutilisé
npm install react-router-dom@^6.30.6      # dernière 6.x, sans rupture
```

Et poser un rappel : si un jour l'application **lit** des classeurs fournis par l'utilisateur,
`xlsx` devra être remplacé (`exceljs`) avant, pas après.

**Effort :** ~15 minutes.

---

```
┌─────────────────────────────────────────────────────────┐
│ CONCLUSION #8                                           │
├──────────┬──────────────────────────────────────────────┤
│ Sévérité │ BASSE                                        │
│ Catégorie│ CORS retombant sur le joker                  │
│ Emplacement│ supabase/functions/_shared/cors.ts:9       │
│ CWE      │ CWE-942 (Politique inter-domaines permissive)│
└──────────┴──────────────────────────────────────────────┘
```
**Ce qui ne va pas.**

```ts
const origine = Deno.env.get('APP_URL');
return { 'Access-Control-Allow-Origin': origine || '*', ... };
```

Si le secret `APP_URL` disparaît, les fonctions acceptent **toutes** les origines, en silence.

**Pourquoi c'est important — et pourquoi la portée est faible.**
`Access-Control-Allow-Credentials` n'est jamais émis, et l'authentification passe par un en-tête
`Authorization`, pas par un cookie : un site tiers ne peut donc pas faire agir un navigateur au nom
de votre utilisateur. Le joker autoriserait un attaquant à appeler les fonctions **avec un jeton
qu'il possède déjà** — c'est-à-dire le sien. Le risque réel est la disparition silencieuse d'une
garantie, pas une prise de contrôle.

**La correction.**

```ts
export function corsHeaders() {
  const origine = Deno.env.get('APP_URL');
  if (!origine) throw new Error('APP_URL manquant : origine CORS impossible à déterminer.');
  return {
    'Access-Control-Allow-Origin': origine,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
```

**Effort :** ~5 minutes.

---

## Rapport final

### 1. Posture de sécurité

# 🟡 ACCEPTABLE

**Aucune exposition de données prouvée, aucun contournement d'authentification.** Le cœur du
modèle est correct, et remarquablement pour du code assisté par IA : `auth.uid()` partout et jamais
`user_metadata` ; `WITH CHECK` sur toutes les écritures ; la clé service confinée à deux fonctions
serveur ; une vérification de signature de webhook exemplaire — corps brut, HMAC, comparaison en
temps constant, anti-rejeu ; zéro `dangerouslySetInnerHTML` ; `getUser()` et non `getSession()` là
où ça compte.

Ce qui empêche une note supérieure tient en deux points, et **aucun des deux n'est un défaut de
code** :

1. **Quatre tables — dont `payments` et `subscriptions` — existent uniquement dans la base, pas
   dans le dépôt.** Leur RLS est invérifiable par lecture. Une requête y répond en dix secondes.
2. **Deux policies très ouvertes sur `construction_rates` peuvent avoir survécu** à
   l'empilement des scripts. Les policies RLS sont cumulatives : une seule qui autorise suffit.

Deux réponses de base à écrire, deux requêtes à lancer. Si elles reviennent propres, la posture
passe à 🟢 SOLIDE. C'est aussi ce qu'il faut faire **avant** d'acheter le domaine et d'ouvrir la
publicité, comme vous le prévoyez : ces vérifications coûtent quinze minutes maintenant et
beaucoup plus une fois qu'il y a de vrais clients dans `payments`.

### 2. Conclusions CRITIQUES et HAUTES

Aucune CRITIQUE.

| # | Sévérité | Sujet | Effort |
|---|---|---|---|
| **#1** | HAUTE | Policies héritées possiblement survivantes sur `construction_rates` | 5 min |
| **#2** | HAUTE | RLS invérifiable sur `payments`, `subscriptions`, `analytics_events`, `subscription_plans` | 10 min (vérif.) |

Les deux se vérifient par une requête avant toute correction. Il est possible qu'aucune ne soit
un problème réel — mais l'ignorer serait supposer, sur les tables qui portent l'argent.

### 3. Victoires rapides (< 10 minutes chacune)

1. **Lancer les deux requêtes de contrôle** (#1 et #2) — la réponse décide de tout le reste. *10 min*
2. **Ajouter les deux `drop policy` manquants** au bloc 11 de `maj_investisseurs.sql`. *5 min*
3. **Restreindre `qcm_questions` aux comptes connectés** — une policy remplacée. *5 min*
4. **Faire échouer `supabaseClient.js`** au lieu de continuer avec un client vide. *5 min*
5. **Compléter `.gitignore`** avec `.env.*` + `!.env.example`. *2 min*
6. **Ôter le repli `|| '*'`** dans `cors.ts`. *5 min*

Six actions, une demi-heure, et la posture passe au vert sur tout ce qui est vérifiable depuis le
code.

### 4. Plan de remédiation priorisé

| Ordre | # | Sévérité | Action | Effort |
|---|---|---|---|---|
| 1 | #2 | HAUTE | Lancer la requête d'inventaire RLS sur les 19 tables | 10 min |
| 2 | #1 | HAUTE | Lancer la requête `pg_policies` sur `construction_rates`, puis ajouter les 2 `drop policy` | 5 min |
| 3 | #4 | MOYENNE | Restreindre `qcm_questions` aux comptes connectés | 5 min |
| 4 | #3 | MOYENNE | Limitation de débit sur `chariow-checkout` | 30 min |
| 5 | #5 | BASSE | Échec au démarrage si la configuration manque | 5 min |
| 6 | #6 | BASSE | Compléter `.gitignore` | 2 min |
| 7 | #8 | BASSE | Retirer le repli CORS `*` | 5 min |
| 8 | #7 | BASSE | Retirer `xlsx` de la racine, monter React Router en 6.x | 15 min |
| 9 | #2 | HAUTE | Écrire `schema_paiements.sql` (les 4 tables + policies dans le dépôt) | 45 min |
| 10 | #4 | MOYENNE | Servir les questions sans leur réponse, corriger en base | 1 h |

**Avant le domaine et la publicité :** lignes 1 à 4. **Total : environ une heure.**

### 5. Ce qui est déjà bien fait — à ne pas casser

- **`auth.uid()` partout, `user_metadata` nulle part.** L'erreur la plus fréquente et la plus grave
  des applications Supabase, évitée intégralement.
- **`WITH CHECK` sur toutes les écritures.** Personne ne peut insérer une ligne au nom d'un autre,
  ni changer le propriétaire d'un projet.
- **La clé `service_role` confinée** aux deux fonctions Chariow. Jamais dans le navigateur.
- **La vérification de signature du webhook**, dans le bon ordre : corps brut lu avant tout parsing,
  HMAC-SHA256, **comparaison en temps constant**, anti-rejeu par `delivery_id`. C'est la référence.
- **`est_fondateur()` redemandé à la base** dans `envoyer-invitation`, au lieu d'être déduit dans la
  fonction. La règle « seul le fondateur » n'existe qu'à un seul endroit — deux copies finissent
  toujours par diverger, et c'est la plus permissive qui gagne.
- **Zéro `dangerouslySetInnerHTML`.** C'est ce qui rend la session en `localStorage` acceptable.
- **`getUser()` et non `getSession()`** partout où la sécurité en dépend, y compris dans les Edge
  Functions.
- **`set search_path = public`** sur les 17 fonctions `security definer`.
- **Les messages d'erreur de la base remontent tels quels.** Contre-intuitif dans un audit, mais
  juste ici : ces fonctions sont réservées au fondateur, et un message précis vaut mieux qu'un échec
  opaque.
- **Aucun secret dans le dépôt, ni dans l'historique git.**

### 6. Résumé de la checklist

| Section 1 | Section 2 | Section 3 | Section 4 |
|---|---|---|---|
| 1.1 ✅ | 2.1 ⚠️ | 3.1 ⬚ | 4.1 ⚠️ |
| 1.2 ⚠️ | 2.2 ✅ | 3.2 ⚠️ | 4.2 ✅ |
| 1.3 ✅ | 2.3 ✅ | 3.3 ✅ | 4.3 ✅ |
| 1.4 ✅ | 2.4 ✅ | 3.4 ⬚ | 4.4 ✅ |
| 1.5 ✅ | 2.5 ✅ | 3.5 ⚠️ | 4.5 ⚠️ |
| 1.6 ❌ | 2.6 ⬚ | 3.6 ✅ | 4.6 ✅ |
| | 2.7 ✅ | 3.7 ⬚ | |
| | 2.8 ✅ | 3.8 ✅ | |

| Section 5 | Section 6 | Section 7 | Section 8 |
|---|---|---|---|
| 5.1 ❌ | 6.1 ❌ | 7.1 ❌ | 8.1 ⬚ |
| 5.2 ✅ | 6.2 ⚠️ | 7.2 ✅ | 8.2 ⬚ |
| 5.3 ✅ | 6.3 ⬚ | | 8.3 ⬚ |
| 5.4 ⚠️ | | | |
| 5.5 ⚠️ | | | |

**Total :** 22 ✅ · 9 ⚠️ · 4 ❌ · 10 ⬚

---

## Les deux requêtes à lancer maintenant

À coller dans Supabase → SQL Editor. Elles ne modifient rien.

```sql
-- 1. Quelles tables sont ouvertes ?
select c.relname as "Table",
       c.relrowsecurity as "RLS active",
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as "Policies",
       case
         when not c.relrowsecurity then 'OUVERTE A TOUS — a corriger'
         when (select count(*) from pg_policies p
                where p.schemaname = 'public' and p.tablename = c.relname) = 0
           then 'fermee (acces par fonctions uniquement)'
         else 'protegee par policies'
       end as "Verdict"
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by c.relrowsecurity, c.relname;
```

```sql
-- 2. Que reste-t-il vraiment sur la grille tarifaire ?
select policyname as "Policy", cmd as "Commande", qual::text as "Condition"
  from pg_policies
 where schemaname = 'public' and tablename = 'construction_rates';
```

**Attendu pour la seconde :** une seule ligne, `Les tarifs sont réservés au fondateur`.
Si « Lecture publique des tarifs » ou « Écriture des tarifs par un compte connecté » y figure
encore, la conclusion #1 est confirmée et à corriger immédiatement.
