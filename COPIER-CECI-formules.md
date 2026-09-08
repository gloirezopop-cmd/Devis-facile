-- MISE À JOUR — LES TROIS FORMULES DEVIS FACILE BTP
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.
-- À exécuter APRÈS schema_estimation.sql, schema_offres.sql,
-- schema_verrouillage.sql et maj_calcul_cumule.sql.
--
-- CE QUI CHANGE
--
-- 1. Les deux premières formules deviennent MENSUELLES.
--
--      Calcul          3 500 FCFA / mois
--      Devis Complet   5 500 FCFA / mois
--      Devis Facile PRO   50 000 FCFA / an
--
--    Elles étaient des achats uniques rattachés à un seul projet. Un
--    abonnement mensuel vaut pour le compte entier, sur tous les projets,
--    tant qu'il court.
--
-- 2. Ce que chaque formule débloque suit la hiérarchie
--
--      PRO_ANNUEL  >  DEVIS_COMPLET  >  CALCUL  >  GRATUIT
--
--    Un niveau supérieur hérite de tout le niveau inférieur. Ici cet héritage
--    n'est pas recopié à la main : les droits du Devis Complet sont
--    littéralement « ceux du Calcul, plus les siens », et ceux du PRO « ceux
--    du Devis Complet, plus les siens ». Une formule ne peut donc pas perdre
--    en route un droit que la formule d'en dessous accorde.
--
-- 3. Le gratuit garde ce qu'il avait : créer un projet, faire son métré,
--    lancer les calculs. Il ne voit pas les résultats. Rien n'est effacé
--    quand une formule s'arrête — le verrouillage porte sur l'accès à la
--    fonctionnalité, jamais sur les données saisies.
--
-- Ce script peut être relancé sans risque.

-- ─── 1. Autoriser la facturation mensuelle ──────────────────────────────────
--
-- La table n'acceptait que ONE_TIME et ANNUAL. On retire la contrainte
-- existante quel que soit son nom, puis on la repose avec MONTHLY.

do $$
declare c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.subscription_plans'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%billing_type%'
  loop
    execute format('alter table public.subscription_plans drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.subscription_plans
  add constraint subscription_plans_billing_type_check
  check (billing_type in ('ONE_TIME', 'MONTHLY', 'ANNUAL'));

-- ─── 2. Les trois formules ──────────────────────────────────────────────────
--
-- L'héritage est construit ici, pas recopié : `devis_complet` part des droits
-- de `calcul`, et `pro_annuel` de ceux de `devis_complet`.

with droits_calcul as (
  select '{
    "can_create_project": true,
    "can_calculate": true,
    "can_use_metering": true,
    "can_view_estimate": true,
    "can_view_calculation_note": true,
    "can_view_summary": true
  }'::jsonb as d
),
droits_devis as (
  select (select d from droits_calcul) || '{
    "can_view_estimated_quantities": true,
    "can_view_quote": true,
    "can_view_dqe": true,
    "can_export_calculation_note": true,
    "can_export_quote": true,
    "can_print": true
  }'::jsonb as d
),
droits_pro as (
  select (select d from droits_devis) || '{
    "can_create_multiple_projects": true,
    "can_use_professional_calculators": true
  }'::jsonb as d
),
formules (id, name, slug, price, billing_type, duration_days,
          description, tagline, features, entitlements, recommended, display_order) as (
  values
  (
    'calcul', 'Calcul', 'calcul', 3500::numeric, 'MONTHLY', 30,
    'La porte d''entrée : vos calculs et vos résultats.',
    'De vos dimensions à votre note de calcul.',
    array[
      'Dimensions du projet',
      'Estimation du budget',
      'Configuration et localisation',
      'Métrés et calculs',
      'Note de calcul',
      'Résumé des résultats'
    ],
    (select d from droits_calcul), false, 1
  ),
  (
    'devis_complet', 'Devis Complet', 'devis_complet', 5500::numeric, 'MONTHLY', 30,
    'La formule de travail : produire un document remettable.',
    'Transformez votre étude en devis professionnel prêt à exploiter.',
    array[
      'Tout CALCUL',
      'Quantités estimatives',
      'Devis complet',
      'DQE',
      'Export de la note de calcul',
      'Export du devis',
      'Impression'
    ],
    (select d from droits_devis), true, 2
  ),
  (
    'pro_annuel', 'Devis Facile PRO', 'pro_annuel', 50000::numeric, 'ANNUAL', 365,
    'L''abonnement du professionnel qui enchaîne les chantiers.',
    'Toutes les fonctionnalités professionnelles, toute l''année.',
    array[
      'Tout DEVIS COMPLET',
      'Projets multiples',
      'Outils professionnels',
      'Toutes les fonctionnalités PRO',
      'Nouvelles fonctionnalités PRO incluses'
    ],
    (select d from droits_pro), false, 3
  )
)
insert into public.subscription_plans
  (id, name, slug, price, currency, billing_type, duration_days,
   description, tagline, features, entitlements, recommended, active, display_order, updated_at)
select
  f.id, f.name, f.slug, f.price, 'XAF', f.billing_type, f.duration_days,
  f.description, f.tagline, f.features, f.entitlements, f.recommended, true, f.display_order, now()
from formules f
on conflict (id) do update set
  name           = excluded.name,
  slug           = excluded.slug,
  price          = excluded.price,
  currency       = excluded.currency,
  billing_type   = excluded.billing_type,
  duration_days  = excluded.duration_days,
  description    = excluded.description,
  tagline        = excluded.tagline,
  features       = excluded.features,
  entitlements   = excluded.entitlements,
  recommended    = excluded.recommended,
  active         = true,
  display_order  = excluded.display_order,
  updated_at     = now();

-- ─── 3. L'ancienne formule « Résumé » devient « Calcul » ────────────────────
--
-- Elle portait l'identifiant `resume`. Tout abonnement qui la référencerait
-- est d'abord basculé sur `calcul` ; la ligne n'est supprimée qu'ensuite, et
-- uniquement si plus rien ne s'y rattache. Aucun abonnement n'est perdu.

update public.subscriptions set plan_id = 'calcul' where plan_id = 'resume';

delete from public.subscription_plans
 where id = 'resume'
   and not exists (select 1 from public.subscriptions s where s.plan_id = 'resume');

-- ─── 4. Contrôle ────────────────────────────────────────────────────────────
--
-- Attendu : 3 formules actives, prix 3500 / 5500 / 50000,
-- périodes MONTHLY / MONTHLY / ANNUAL, et hierarchie_respectee = true.

select
  (select count(*) from public.subscription_plans where active) as formules_actives,
  (select string_agg(price::int::text, ' / ' order by display_order)
     from public.subscription_plans where active) as prix,
  (select string_agg(billing_type, ' / ' order by display_order)
     from public.subscription_plans where active) as periodes,
  (select count(*) from public.subscription_plans where id = 'resume') as ancienne_formule_restante,
  -- Chaque formule doit contenir tous les droits de celle qui la précède.
  (select bool_and(sup.entitlements @> inf.entitlements)
     from public.subscription_plans inf
     join public.subscription_plans sup on sup.display_order > inf.display_order
    where inf.active and sup.active) as hierarchie_respectee;
