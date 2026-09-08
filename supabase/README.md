# Fonctions serveur Chariow

Ce dossier ne contient que ce que Supabase ne peut pas faire en SQL : recevoir
un appel HTTP public. Tout le reste du backend de ce projet (droits, tarifs,
verrouillage) reste des fonctions Postgres classiques — voir
`schema_verrouillage.sql`. Ce n'est pas une bascule d'architecture, seulement
la brique qui manquait pour parler à un service extérieur.

- `chariow-checkout` — appelée par le navigateur (utilisateur connecté),
  démarre un paiement Chariow.
- `chariow-webhook` — appelée par Chariow, vérifie la signature et accorde
  l'accès.

Détail des deux flux, des règles de sécurité et du schéma de données :
[`CHARIOW_INTEGRATION_SPEC.md`](../CHARIOW_INTEGRATION_SPEC.md) à la racine.

## Avant le premier déploiement

1. **Exécuter la migration** : coller `maj_paiement_chariow.sql` (racine du
   dépôt) dans Supabase → SQL Editor → Run.
2. **Créer les produits Chariow** en type **Licence** (§3 de la spec), puis
   renseigner leur `product_id` :
   ```sql
   update public.subscription_plans set chariow_product_id = 'prd_xxxxxxxx' where id = 'calcul';
   update public.subscription_plans set chariow_product_id = 'prd_xxxxxxxx' where id = 'devis_complet';
   update public.subscription_plans set chariow_product_id = 'prd_xxxxxxxx' where id = 'pro_annuel';
   ```
   Tant qu'une formule n'a pas de `chariow_product_id`, `chariow-checkout` la
   refuse proprement (409) plutôt que d'envoyer un identifiant inventé à
   Chariow.
3. **Installer la CLI Supabase** si ce n'est pas déjà fait, puis se lier au
   projet :
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-du-projet>
   ```
   (`<ref-du-projet>` est dans l'URL du tableau de bord Supabase, ou dans
   `VITE_SUPABASE_URL` — c'est la partie avant `.supabase.co`.)
4. **Poser les secrets** — jamais dans `.env.local`/`.env.example` (ces
   fichiers-là sont lus par Vite et finissent dans le navigateur ; les
   secrets ci-dessous ne doivent jamais y apparaître) :
   ```bash
   npx supabase secrets set CHARIOW_API_KEY=sk_live_xxxxxxxxxxxx
   npx supabase secrets set CHARIOW_PULSE_SECRET=whsec_xxxxxxxxxxxx
   npx supabase secrets set APP_URL=https://devisfacile.example
   ```
   `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont
   déjà fournies automatiquement à toute fonction déployée — ne pas les poser
   à la main. `CHARIOW_API_BASE` est optionnelle (par défaut
   `https://api.chariow.com/v1`).
5. **Déployer** :
   ```bash
   npx supabase functions deploy chariow-checkout
   npx supabase functions deploy chariow-webhook --no-verify-jwt
   ```
   `--no-verify-jwt` est nécessaire sur le webhook : Chariow n'a pas de jeton
   Supabase, et l'authenticité de l'appel est garantie par la signature HMAC
   vérifiée dans le code, pas par le JWT.
6. **Copier l'URL de la fonction webhook** (affichée après le déploiement,
   de la forme `https://<ref>.supabase.co/functions/v1/chariow-webhook`) dans
   Chariow → Automations → Pulses → New Pulse, événement `successful.sale`
   (et `license.revoked` si utilisé) ; copier le secret de signature généré
   là-bas dans `CHARIOW_PULSE_SECRET` (étape 4).

## Ce qui n'est PAS encore fait

Volontairement laissé pour une prochaine passe, une fois le flux principal
vérifié avec un vrai paiement test :

- **Job de réconciliation** (§9 de la spec) — rattrape un webhook manqué en
  interrogeant `GET /v1/sales/{sale_id}`. Peut se faire en `pg_cron` (appelle
  une fonction Postgres qui lit `payment_intents` en `pending` depuis plus de
  15 minutes) ou en tâche planifiée externe.
- **Bouton « Restaurer mon achat »** (§9) — pour l'utilisateur qui a payé
  avec une adresse différente de son compte.
- **Rate limiting** sur `chariow-checkout` (contre le spam d'intentions).
- **Alertes** sur `webhook_deliveries.error` non vide, et sur l'absence de
  livraison depuis 24 h.

## Test local

```bash
npx supabase functions serve chariow-webhook --no-verify-jwt --env-file supabase/.env.local
```

Puis exposer avec ngrok et utiliser « Send test pulse » depuis Chariow — en
sachant que cet événement de test n'a pas de `x-pulse-delivery-id` (traité
comme tel, voir le code). Pour valider la chaîne complète (dédoublonnage
compris), utiliser **Replay** sur une vraie livraison depuis l'onglet
Deliveries de Chariow.
