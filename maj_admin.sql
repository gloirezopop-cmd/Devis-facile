-- ADMINISTRATEUR : ACCÈS COMPLET ET TABLEAU DE BORD
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.
-- Ce script peut être relancé sans risque.
--
-- Deux choses :
--   1. le fondateur n'est plus soumis au paywall — il ne peut pas construire
--      l'application en payant son propre produit à chaque essai ;
--   2. une fonction de statistiques réservée à l'administration, calculée
--      par la base (le navigateur ne peut pas lire ces tables lui-même, et
--      c'est très bien ainsi).
--
-- L'accès administrateur n'est PAS un abonnement : aucune ligne n'est écrite
-- dans `subscriptions`, aucun paiement n'est simulé. C'est un contournement
-- explicite du verrou, décidé par `profiles.is_admin`, et rien d'autre.

-- ─── 1. Le compte administrateur ────────────────────────────────────────────
--
-- ⚠️ Remplacez l'adresse ci-dessous si le compte que vous utilisez dans
-- l'application n'est pas celui-là.

update public.profiles
   set is_admin = true
 where lower(email) = lower('gloirezopop@gmail.com');

-- ─── 2. Un administrateur possède tous les droits ───────────────────────────
--
-- La liste n'est pas écrite en dur : elle est reconstruite à partir de toutes
-- les formules existantes. Une formule qui gagnera un nouveau droit demain
-- l'accordera automatiquement à l'administrateur, sans repasser par ici.
--
-- La branche « utilisateur normal » est identique à celle de
-- schema_verrouillage.sql — elle n'est pas touchée.

create or replace function public.droits_utilisateur(p_project_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.est_admin() then
      '{"can_create_project": true, "can_calculate": true, "can_use_metering": true}'::jsonb
      || coalesce(
        (
          select jsonb_object_agg(cle, to_jsonb(true))
          from (
            select distinct e.key as cle
            from public.subscription_plans pl
            cross join lateral jsonb_each(pl.entitlements) as e(key, value)
          ) tous_les_droits
        ),
        '{}'::jsonb
      )
    else
      '{"can_create_project": true, "can_calculate": true, "can_use_metering": true}'::jsonb
      || coalesce(
        (
          select jsonb_object_agg(cle, to_jsonb(accorde))
          from (
            select e.key as cle, bool_or(e.value = to_jsonb(true)) as accorde
            from public.subscriptions s
            join public.subscription_plans pl on pl.id = s.plan_id
            cross join lateral jsonb_each(pl.entitlements) as e(key, value)
            where s.user_id = auth.uid()
              and s.status = 'ACTIVE'
              and (s.end_date is null or s.end_date > now())
              and (
                pl.billing_type = 'ANNUAL'
                or s.project_id is null
                or s.project_id = p_project_id
              )
            group by e.key
          ) acquis
          where acquis.accorde
        ),
        '{}'::jsonb
      )
  end;
$$;

-- ─── 3. Les statistiques, réservées à l'administration ──────────────────────
--
-- Renvoie `null` à un compte ordinaire plutôt qu'une erreur : l'écran
-- d'administration n'existe pas pour lui, il n'a pas à savoir pourquoi.
--
-- « Visiteurs » n'y figure pas : rien dans l'application n'enregistre
-- aujourd'hui le passage d'un visiteur non connecté. Annoncer un chiffre
-- serait l'inventer. `evenements_7j` compte les actions réellement tracées.

create or replace function public.statistiques_admin()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.est_admin() then null::jsonb else jsonb_build_object(

    -- Comptes
    'comptes_total', (select count(*) from auth.users),
    'comptes_7j',    (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'comptes_30j',   (select count(*) from auth.users where created_at > now() - interval '30 days'),

    -- Activité réelle (une action tracée = un utilisateur qui se sert de l'outil)
    'actifs_7j',     (select count(distinct user_id) from public.analytics_events
                       where user_id is not null and created_at > now() - interval '7 days'),
    'actifs_30j',    (select count(distinct user_id) from public.analytics_events
                       where user_id is not null and created_at > now() - interval '30 days'),
    'evenements_7j', (select count(*) from public.analytics_events
                       where created_at > now() - interval '7 days'),

    -- Travail produit
    'projets_total', (select count(*) from public.projects),
    'projets_7j',    (select count(*) from public.projects where created_at > now() - interval '7 days'),

    -- Abonnements
    'abonnes_actifs', (select count(distinct user_id) from public.subscriptions
                        where status = 'ACTIVE' and (end_date is null or end_date > now())),
    'abonnements_par_formule', coalesce((
      select jsonb_object_agg(plan_id, nombre)
      from (
        select plan_id, count(*) as nombre
        from public.subscriptions
        where status = 'ACTIVE' and (end_date is null or end_date > now())
        group by plan_id
      ) repartition
    ), '{}'::jsonb),

    -- Argent réellement encaissé (écrit par le webhook Chariow, jamais par le navigateur)
    'paiements_reussis', (select count(*) from public.payments where status = 'SUCCESS'),
    'recettes_totales',  coalesce((select sum(amount) from public.payments where status = 'SUCCESS'), 0),
    'recettes_30j',      coalesce((select sum(amount) from public.payments
                                    where status = 'SUCCESS' and created_at > now() - interval '30 days'), 0),

    -- Paiements commencés mais jamais confirmés : au-delà de quelques unités,
    -- c'est le signe que le webhook ne reçoit plus rien.
    'intentions_en_attente', (select count(*) from public.payment_intents where status = 'pending'),

    'derniers_comptes', coalesce((
      select jsonb_agg(jsonb_build_object('email', email, 'cree_le', created_at) order by created_at desc)
      from (select email, created_at from auth.users order by created_at desc limit 10) recents
    ), '[]'::jsonb),

    'genere_le', now()
  ) end;
$$;

revoke all on function public.statistiques_admin() from public, anon;
grant execute on function public.statistiques_admin() to authenticated;

-- ─── 4. Contrôle ────────────────────────────────────────────────────────────
--
-- Attendu : une ligne, `is_admin` = true, et un objet de statistiques rempli.

select p.email, p.is_admin, public.est_admin() as reconnu_comme_admin
  from public.profiles p
 where lower(p.email) = lower('gloirezopop@gmail.com');

select public.statistiques_admin() as statistiques;
