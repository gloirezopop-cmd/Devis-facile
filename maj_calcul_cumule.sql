-- MISE À JOUR — SURFACE TOTALE CUMULÉE ET NOUVEAUX PRIX AU m²
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.
-- À exécuter APRÈS schema_estimation.sql, schema_offres.sql et
-- schema_verrouillage.sql.
--
-- DEUX CHANGEMENTS DE FOND
--
-- 1. La fondation et la toiture comptent désormais dans la surface.
--
--    Surface totale cumulée = fondation + RDC + étages + toiture
--
--    R+0 → 3 surfaces    R+1 → 4    R+2 → 5    R+3 → 6    R+10 → 13
--
--    L'ancienne formule ne retenait que le RDC et les étages ; elle
--    sous-estimait le chantier en ignorant deux ouvrages bien réels.
--
-- 2. Les prix au m² baissent en conséquence.
--
--    Économique       150 000 FCFA/m²
--    Moyen standing   200 000 FCFA/m²
--    Haut standing    250 000 FCFA/m²
--    Luxe             300 000 FCFA/m²
--
--    Un prix unique par standing, et non plus une fourchette : c'est ce qui
--    est demandé. Les trois colonnes de prix reçoivent donc la même valeur,
--    ce qui fait afficher un seul montant. L'administrateur pourra rouvrir
--    une fourchette plus tard en donnant un minimum et un maximum différents.
--
-- Ce script peut être relancé sans risque.

-- ─── 1. Le terrain et le taux de construction ───────────────────────────────

alter table public.estimation_projects add column if not exists surface_terrain numeric;
alter table public.estimation_projects add column if not exists pourcentage_construction numeric;
alter table public.estimation_projects add column if not exists surface_reference numeric;

-- Le droit d'écriture est accordé colonne par colonne (voir schema_offres.sql) :
-- les nouvelles colonnes doivent y être ajoutées, sinon la saisie échoue.
grant update (
  label, country_id, location_id, building_type_id, standing_id, roof_type_id,
  nombre_etages, levels, surface_totale, updated_at,
  surface_terrain, pourcentage_construction, surface_reference
) on public.estimation_projects to authenticated;

-- ─── 2. Les prix au m² ──────────────────────────────────────────────────────
--
-- Ne visent que les lignes issues des scripts d'installation : un tarif saisi
-- ou corrigé depuis /admin/tarifs porte une autre source et n'est pas touché.

update public.construction_rates
   set price_min = 150000, price_reference = 150000, price_max = 150000, updated_at = now()
 where standing_id = 'economique' and source like 'Valeurs de planification initiales%';

update public.construction_rates
   set price_min = 200000, price_reference = 200000, price_max = 200000, updated_at = now()
 where standing_id = 'moyen_standing' and source like 'Valeurs de planification initiales%';

update public.construction_rates
   set price_min = 250000, price_reference = 250000, price_max = 250000, updated_at = now()
 where standing_id = 'haut_standing' and source like 'Valeurs de planification initiales%';

update public.construction_rates
   set price_min = 300000, price_reference = 300000, price_max = 300000, updated_at = now()
 where standing_id = 'tres_haut_standing' and source like 'Valeurs de planification initiales%';

-- ─── 3. Tous les standings actifs, pour tous les pays prioritaires ──────────
--
-- Une estimation doit aboutir quel que soit le type de bâtiment et quel que
-- soit le standing. Les tarifs nationaux (sans ville ni type de bâtiment)
-- sont le dernier recours de la cascade : c'est eux qui garantissent qu'un
-- commerce en luxe à Bafoussam trouve un prix.
--
-- Cette insertion complète ce qui manquerait : chaque standing actif, pour
-- chaque pays de la zone franc, dans la devise du pays.

insert into public.construction_rates
  (country_id, standing_id, price_min, price_reference, price_max, currency_code, year, source, confidence)
select
  pays.id,
  grille.standing_id,
  grille.prix,
  grille.prix,
  grille.prix,
  pays.currency_code,
  2026,
  'Valeurs de planification initiales Devis Facile — zone franc CFA',
  'estimation'
from public.estimation_countries as pays
cross join (values
  ('economique',         150000),
  ('moyen_standing',     200000),
  ('haut_standing',      250000),
  ('tres_haut_standing', 300000)
) as grille (standing_id, prix)
where pays.currency_code in ('XAF', 'XOF')
on conflict do nothing;

-- ─── 4. Le calcul serveur ───────────────────────────────────────────────────
--
-- Remplace la version qui ne sommait que le RDC et les étages.

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
begin
  select * into v_projet
    from public.estimation_projects
   where id = p_project_id and user_id = auth.uid();

  if not found then
    return jsonb_build_object('erreur', 'projet_introuvable');
  end if;

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
    'verrouille', coalesce(v_droits->>'can_view_estimate', 'false') <> 'true'
  );

  -- Les montants, et seulement s'ils sont dus.
  if v_tarif.id is not null and v_surface > 0
     and coalesce(v_droits->>'can_view_estimate', 'false') = 'true' then
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

-- ─── 5. Contrôle ────────────────────────────────────────────────────────────
--
-- Attendu : 4 standings actifs, 56 tarifs actifs sur 14 pays,
-- prix 150000 / 200000 / 250000 / 300000.

select
  (select count(*) from public.estimation_standings where active) as standings_actifs,
  (select count(*) from public.construction_rates where active) as tarifs_actifs,
  (select count(distinct country_id) from public.construction_rates where active) as pays_chiffrables,
  (select string_agg(distinct price_reference::int::text, ' / ' order by price_reference::int::text)
     from public.construction_rates r
     join public.estimation_standings s on s.id = r.standing_id
    where r.active and s.active) as prix_au_m2;
