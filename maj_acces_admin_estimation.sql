-- ACCÈS ADMINISTRATEUR AU RÉSULTAT DE L'ESTIMATION (SANS PAYWALL)
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.
-- Ce script peut être relancé sans risque.
--
-- RÈGLE :
--   1. Les administrateurs ne doivent jamais payer pour obtenir le résultat.
--      Leur estimation est immédiatement déverrouillée avec le calcul complet du budget.
--   2. Seuls les utilisateurs ordinaires (comptes gratuits) sont soumis au paywall
--      pour déverrouiller leur montant.

-- ─── 1. Droits complets pour l'administrateur ───────────────────────────────

create or replace function public.droits_utilisateur(p_project_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.est_admin() then
      '{"can_create_project": true, "can_calculate": true, "can_use_metering": true, "can_view_estimate": true, "can_view_calculation_note": true, "can_view_summary": true, "can_view_estimated_quantities": true, "can_view_quote": true, "can_view_dqe": true, "can_export_calculation_note": true, "can_export_quote": true, "can_print": true, "can_create_multiple_projects": true, "can_use_professional_calculators": true}'::jsonb
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

revoke all on function public.droits_utilisateur(uuid) from public, anon;
grant execute on function public.droits_utilisateur(uuid) to authenticated;

-- ─── 2. Calcul du budget sans verrou pour l'administrateur ──────────────────

create or replace function public.estimer_projet(p_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_projet public.estimation_projects;
  v_tarif public.construction_rates;
  v_surface numeric := 0;
  v_config text;
  v_droits jsonb;
  v_detail jsonb;
  v_reponse jsonb;
  v_est_admin boolean := false;
  v_acces_autorise boolean := false;
begin
  select * into v_projet
    from public.estimation_projects
   where id = p_project_id and user_id = auth.uid();

  if not found then
    return jsonb_build_object('erreur', 'projet_introuvable');
  end if;

  v_est_admin := public.est_admin();

  -- Surface totale cumulée : TOUS les niveaux, fondation et toiture comprises.
  select coalesce(sum((niveau->>'surface')::numeric), 0)
    into v_surface
    from jsonb_array_elements(v_projet.levels) as niveau
   where niveau->>'surface' is not null;

  -- Le détail par niveau, tel qu'il doit être affiché à l'écran.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', niveau->>'id',
           'label', niveau->>'label',
           'type', niveau->>'type',
           'surface', (niveau->>'surface')::numeric
         )), '[]'::jsonb)
    into v_detail
    from jsonb_array_elements(v_projet.levels) as niveau;

  v_config := 'R' || coalesce(v_projet.nombre_etages, 0)::text;
  v_droits := public.droits_utilisateur(p_project_id);
  v_acces_autorise := v_est_admin or coalesce(v_droits->>'can_view_estimate', 'false') = 'true';

  with candidats as (
    select t.*,
      case
        when t.location_id = v_projet.location_id
         and t.building_type_id = v_projet.building_type_id
         and t.roof_type_id = v_projet.roof_type_id
         and t.level_category = v_config then 1
        when t.location_id = v_projet.location_id
         and t.building_type_id = v_projet.building_type_id
         and t.level_category = v_config then 2
        when t.location_id = v_projet.location_id
         and t.building_type_id = v_projet.building_type_id then 3
        when t.location_id is null
         and t.building_type_id = v_projet.building_type_id then 4
        when t.location_id is null
         and t.building_type_id is null then 5
        else null
      end as rang
    from public.construction_rates t
    where t.active
      and t.country_id = v_projet.country_id
      and t.standing_id = v_projet.standing_id
  )
  select * into v_tarif from candidats
   where rang is not null
   order by rang
   limit 1;

  v_reponse := jsonb_build_object(
    'projet', jsonb_build_object(
      'id', v_projet.id,
      'country_id', v_projet.country_id,
      'location_id', v_projet.location_id,
      'building_type_id', v_projet.building_type_id,
      'standing_id', v_projet.standing_id,
      'roof_type_id', v_projet.roof_type_id,
      'nombre_etages', v_projet.nombre_etages,
      'configuration', 'R+' || coalesce(v_projet.nombre_etages, 0)::text,
      'surface_terrain', v_projet.surface_terrain,
      'pourcentage_construction', v_projet.pourcentage_construction,
      'surface_reference', v_projet.surface_reference
    ),
    'niveaux', v_detail,
    'nombre_surfaces', coalesce(v_projet.nombre_etages, 0) + 3,
    'surface_totale', v_surface,
    'tarif_disponible', v_tarif.id is not null,
    'droits', v_droits,
    'verrouille', not v_acces_autorise
  );

  -- Montants calculés si tarif disponible et accès accordé (ou si compte administrateur).
  if v_tarif.id is not null and v_surface > 0 and v_acces_autorise then
    v_reponse := v_reponse || jsonb_build_object(
      'budget', jsonb_build_object(
        'min', round(v_surface * v_tarif.price_min),
        'reference', round(v_surface * v_tarif.price_reference),
        'max', round(v_surface * v_tarif.price_max),
        'prix_m2', v_tarif.price_reference,
        'devise', v_tarif.currency_code
      )
    );
  end if;

  return v_reponse;
end;
$$;

revoke all on function public.estimer_projet(uuid) from public, anon;
grant execute on function public.estimer_projet(uuid) to authenticated;

-- ─── 3. Statut UNLOCKED automatique pour l'administrateur ───────────────────

create or replace function public.marquer_projet_calcule(p_project_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_statut text;
  v_est_admin boolean := public.est_admin();
begin
  update public.estimation_projects
     set status = case
           when status in ('DRAFT', 'CALCULATED', 'LOCKED') then
             case when v_est_admin or coalesce(public.droits_utilisateur(id)->>'can_view_estimate', 'false') = 'true'
                  then 'UNLOCKED' else 'LOCKED' end
           else status
         end,
         updated_at = now()
   where id = p_project_id and user_id = auth.uid()
   returning status into v_statut;

  return v_statut;
end;
$$;

revoke all on function public.marquer_projet_calcule(uuid) from public, anon;
grant execute on function public.marquer_projet_calcule(uuid) to authenticated;
