-- TABLEAU DE BORD ADMINISTRATEUR — DONNÉES COMPLÈTES
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.
-- Ce script peut être relancé sans risque.
--
-- Il complète `maj_admin.sql` (à exécuter en premier) et NE TOUCHE PAS à la
-- désignation de l'administrateur : rien ici ne modifie `profiles.is_admin`.
--
-- Ajoute :
--   1. le prénom du fondateur et la courbe des inscriptions sur 30 jours,
--      pour l'en-tête et le graphique du tableau de bord ;
--   2. `comptes_admin()` : la liste complète des comptes avec leur adresse
--      e-mail, leur formule et leur dernière activité — de quoi écrire à ses
--      clients. Réservée à l'administration, comme le reste.

-- ─── 1. Statistiques enrichies ──────────────────────────────────────────────

create or replace function public.statistiques_admin()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.est_admin() then null::jsonb else jsonb_build_object(

    -- Pour l'en-tête : à qui l'on s'adresse.
    'mon_prenom', (select u.raw_user_meta_data->>'first_name' from auth.users u where u.id = auth.uid()),

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

    -- La courbe des inscriptions. Les jours sans inscription sont produits par
    -- `generate_series` et valent zéro : sans cela le graphique tasserait les
    -- jours creux et ferait croire à une activité continue.
    'inscriptions_par_jour', coalesce((
      select jsonb_agg(jsonb_build_object('jour', calendrier.jour, 'nombre', coalesce(compte.nombre, 0))
                       order by calendrier.jour)
      from generate_series((current_date - interval '29 days')::date, current_date, interval '1 day') as calendrier(jour)
      left join (
        select created_at::date as jour, count(*) as nombre
        from auth.users
        where created_at >= current_date - interval '29 days'
        group by 1
      ) compte on compte.jour = calendrier.jour::date
    ), '[]'::jsonb),

    'genere_le', now()
  ) end;
$$;

revoke all on function public.statistiques_admin() from public, anon;
grant execute on function public.statistiques_admin() to authenticated;

-- ─── 2. La liste des comptes ────────────────────────────────────────────────
--
-- Ce que le fondateur peut légitimement voir de ses propres clients : de quoi
-- les reconnaître et les contacter. Ni mot de passe, ni jeton, ni rien qui
-- permettrait d'agir à leur place — ces colonnes ne sortent pas de `auth`.
--
-- Réservée à l'administration : un compte ordinaire reçoit `null`.

create or replace function public.comptes_admin()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.est_admin() then null::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'prenom', u.raw_user_meta_data->>'first_name',
      'nom', u.raw_user_meta_data->>'last_name',
      'telephone', u.raw_user_meta_data->>'phone',
      'cree_le', u.created_at,
      'formule', abonnement.plan_id,
      'derniere_activite', activite.dernier
    ) order by u.created_at desc)
    from auth.users u
    left join lateral (
      select s.plan_id
        from public.subscriptions s
       where s.user_id = u.id
         and s.status = 'ACTIVE'
         and (s.end_date is null or s.end_date > now())
       order by s.end_date desc nulls first
       limit 1
    ) abonnement on true
    left join lateral (
      select max(a.created_at) as dernier
        from public.analytics_events a
       where a.user_id = u.id
    ) activite on true
  ), '[]'::jsonb) end;
$$;

revoke all on function public.comptes_admin() from public, anon;
grant execute on function public.comptes_admin() to authenticated;

-- ─── 3. Contrôle ────────────────────────────────────────────────────────────
--
-- ⚠️ Ces deux fonctions répondent `null` DANS CET ÉDITEUR, et c'est normal :
-- l'éditeur SQL n'est connecté à aucun compte (`auth.uid()` y est vide), donc
-- `est_admin()` y répond toujours « non ». Le vrai test se fait dans
-- l'application, connecté avec le compte administrateur.
--
-- Ce contrôle-ci vérifie seulement que les deux fonctions existent.

select routine_name
  from information_schema.routines
 where routine_schema = 'public'
   and routine_name in ('statistiques_admin', 'comptes_admin')
 order by routine_name;
