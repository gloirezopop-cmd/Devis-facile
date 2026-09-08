-- MISE EN PLACE DU PAIEMENT CHARIOW
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.
-- À exécuter APRÈS maj_formules.sql (les trois formules doivent déjà exister).
--
-- Ce script ne touche à rien de ce qui existe déjà : il ajoute les colonnes et
-- les deux tables qui manquent pour que le webhook Chariow (voir
-- CHARIOW_INTEGRATION_SPEC.md) puisse identifier un paiement, vérifier son
-- montant et l'accorder une seule fois. Aucune ligne de `subscription_plans`,
-- `subscriptions` ou `payments` n'est supprimée ou renommée.
--
-- Ce script peut être relancé sans risque.

-- ─── 1. Chaque formule pointe vers son produit Chariow ──────────────────────
--
-- NULL tant que le produit correspondant n'a pas été créé côté Chariow (voir
-- §3 de CHARIOW_INTEGRATION_SPEC.md — type Licence obligatoire). Le endpoint
-- de checkout refuse de démarrer un paiement pour une formule qui n'a pas
-- encore de produit renseigné, plutôt que d'envoyer un identifiant inventé.

alter table public.subscription_plans
  add column if not exists chariow_product_id text;

-- Une fois les produits créés dans app.chariow.com, renseigner ici — par
-- exemple :
--   update public.subscription_plans set chariow_product_id = 'prd_xxxxxxxx' where id = 'calcul';
--   update public.subscription_plans set chariow_product_id = 'prd_xxxxxxxx' where id = 'devis_complet';
--   update public.subscription_plans set chariow_product_id = 'prd_xxxxxxxx' where id = 'pro_annuel';

-- ─── 2. Le pont entre une intention de paiement et le webhook ───────────────
--
-- Créée au moment où l'utilisateur clique sur « Choisir/Passer à », avant même
-- de savoir si Chariow répondra. Le webhook la retrouve par `custom_metadata`
-- et y inscrit ce qui s'est passé. Voir §2 et §5 de CHARIOW_INTEGRATION_SPEC.md.

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  montant_attendu numeric not null,
  devise_attendue text not null,
  sale_id text,
  status text not null default 'pending', -- pending | active | error | failed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_intents enable row level security;

drop policy if exists "Chacun lit ses propres intentions de paiement" on public.payment_intents;
create policy "Chacun lit ses propres intentions de paiement" on public.payment_intents
  for select using (auth.uid() = user_id);

-- Aucune politique d'écriture : seule la fonction serveur (clé service_role,
-- qui contourne RLS) crée et met à jour une intention. Le navigateur ne peut
-- ni s'en attribuer une, ni la faire passer à `active` lui-même.

-- ─── 3. Une livraison de webhook par x-pulse-delivery-id ────────────────────
--
-- La clé d'idempotence n'est PAS l'identifiant de la vente : une même vente
-- produit une livraison par Pulse abonné, et Chariow réessaie jusqu'à 5 fois
-- la même livraison si l'endpoint ne répond pas à temps. Voir §6 et §7.3.

create table if not exists public.webhook_deliveries (
  delivery_id text primary key,
  event text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now()
);

alter table public.webhook_deliveries enable row level security;

-- Aucune politique du tout : ni le navigateur ni un compte authentifié ne
-- doit pouvoir lire les livraisons brutes (elles contiennent l'e-mail et les
-- métadonnées du payeur). Seule la fonction serveur y accède.

-- ─── 4. La table `payments` gagne ce qu'il lui manque ───────────────────────
--
-- `payments` existe déjà (RLS déjà vérifiée par verifier-offres.mjs : le
-- navigateur ne peut pas s'y insérer une ligne). On ajoute seulement les
-- colonnes nécessaires à l'identification d'une vente Chariow, sans toucher
-- aux colonnes existantes (`user_id`, `amount`, `status`, ...).

alter table public.payments add column if not exists plan_id text;
alter table public.payments add column if not exists currency text;
alter table public.payments add column if not exists sale_id text;
alter table public.payments add column if not exists intent_id uuid references public.payment_intents(id);

-- Garde-fou métier contre un double traitement (relecture manuelle depuis le
-- tableau de bord Chariow = nouvelle delivery-id, même sale_id) : voir §7.3.
-- Un index partiel plutôt qu'une contrainte unique classique, pour ne pas
-- s'appliquer aux lignes déjà en base sans sale_id.
create unique index if not exists payments_sale_id_key
  on public.payments (sale_id) where sale_id is not null;

-- ─── 5. Contrôle ─────────────────────────────────────────────────────────────

select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'subscription_plans'
      and column_name = 'chariow_product_id') as colonne_chariow_product_id,
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'payment_intents') as table_payment_intents,
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'webhook_deliveries') as table_webhook_deliveries,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'payments'
      and column_name in ('plan_id', 'currency', 'sale_id', 'intent_id')) as colonnes_payments_ajoutees,
  (select string_agg(id, ', ' order by display_order) from public.subscription_plans
    where chariow_product_id is null) as formules_sans_produit_chariow;
