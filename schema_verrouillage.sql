-- Exécutez ce script dans l'éditeur SQL de Supabase (SQL Editor > New query),
-- après schema_estimation.sql et schema_offres.sql.
--
-- VERROUILLAGE RÉEL DU RÉSULTAT
--
-- Jusqu'ici le budget était calculé dans le navigateur à partir de tarifs en
-- lecture publique : masquer le résultat à l'écran n'aurait rien protégé, il
-- suffisait de lire les tarifs et de refaire la multiplication.
--
-- Ce script déplace le calcul dans la base :
--   - les tarifs ne sont plus lisibles par le navigateur ;
--   - une fonction serveur calcule l'estimation ;
--   - elle ne renvoie les montants que si les droits de l'utilisateur le
--     permettent, et ne renvoie rien d'autre sinon.
--
-- Il crée aussi le rôle administrateur qui manquait à l'application : sans
-- lui, fermer l'accès aux tarifs rendrait /admin/tarifs inutilisable.
--
-- Ce script peut être relancé sans risque.

-- ─── 1. Profils et rôle administrateur ──────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Chacun lit son profil" on public.profiles;
create policy "Chacun lit son profil" on public.profiles
  for select using (auth.uid() = id);

-- Personne ne peut se déclarer administrateur : aucune politique d'écriture
-- n'est accordée. Le drapeau se pose depuis l'éditeur SQL (voir section 6).

-- Un profil est créé automatiquement à l'inscription.
create or replace function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists creer_profil_a_l_inscription on auth.users;
create trigger creer_profil_a_l_inscription
  after insert on auth.users
  for each row execute function public.creer_profil();

-- Les comptes déjà inscrits avant ce script.
insert into public.profiles (id, email)
select u.id, u.email from auth.users u
on conflict (id) do nothing;

create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- ─── 2. Les tarifs ne sortent plus de la base ───────────────────────────────
--
-- Seul un administrateur peut les lire ou les modifier. L'assistant n'en a
-- plus besoin : c'est la fonction d'estimation, ci-dessous, qui les consulte.

drop policy if exists "Lecture publique des tarifs" on public.construction_rates;
drop policy if exists "Écriture des tarifs par un compte connecté" on public.construction_rates;
drop policy if exists "Les tarifs sont réservés à l'administration" on public.construction_rates;

create policy "Les tarifs sont réservés à l'administration" on public.construction_rates
  for all using (public.est_admin()) with check (public.est_admin());

-- ─── 3. Droits effectifs d'un utilisateur ───────────────────────────────────
--
-- Mêmes règles que côté application, mais c'est CELLE-CI qui fait autorité :
-- les droits gratuits, plus ceux des abonnements actifs. Un achat unique ne
-- vaut que pour le projet auquel il est rattaché ; un abonnement annuel vaut
-- partout.

create or replace function public.droits_utilisateur(p_project_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select
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
    );
$$;

-- ─── 4. L'estimation, calculée par le serveur ───────────────────────────────
--
-- Retourne toujours : le récapitulatif du projet (ce que l'utilisateur a lui
-- même saisi), la surface totale, et si une référence tarifaire existe.
--
-- Retourne les MONTANTS uniquement si `can_view_estimate` est accordé pour ce
-- projet. Sinon la réponse ne contient aucun chiffre de budget : il n'y a rien
-- à déverrouiller dans le navigateur, la donnée n'y est jamais arrivée.
--
-- La cascade de recherche du tarif est la même qu'auparavant, du plus précis
-- au plus général, et ne fabrique jamais de prix : si rien ne correspond, elle
-- le dit.

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
  v_reponse jsonb;
begin
  select * into v_projet
    from public.estimation_projects
   where id = p_project_id and user_id = auth.uid();

  if not found then
    return jsonb_build_object('erreur', 'projet_introuvable');
  end if;

  -- Surface construite : le RDC et les étages, jamais la fondation ni la
  -- toiture, dont le coût est déjà compris dans le prix au m².
  select coalesce(sum((niveau->>'surface')::numeric), 0)
    into v_surface
    from jsonb_array_elements(v_projet.levels) as niveau
   where niveau->>'type' in ('ground_floor', 'floor')
     and niveau->>'surface' is not null;

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
      'configuration', 'R+' || coalesce(v_projet.nombre_etages, 0)::text
    ),
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
        'devise', v_tarif.currency_code
      )
    );
  end if;

  return v_reponse;
end;
$$;

revoke all on function public.estimer_projet(uuid) from public, anon;
grant execute on function public.estimer_projet(uuid) to authenticated;
revoke all on function public.droits_utilisateur(uuid) from public, anon;
grant execute on function public.droits_utilisateur(uuid) to authenticated;

-- ─── 5. Marquer un projet comme calculé ─────────────────────────────────────
--
-- L'utilisateur ne peut pas écrire `status` (le droit lui a été retiré au
-- niveau de la colonne). Cette fonction lui permet de faire passer SON projet
-- de DRAFT à CALCULATED puis LOCKED — mais jamais à UNLOCKED, qui reste la
-- conséquence d'un paiement vérifié.

create or replace function public.marquer_projet_calcule(p_project_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_statut text;
begin
  update public.estimation_projects
     set status = case
           when status in ('DRAFT', 'CALCULATED', 'LOCKED') then
             case when coalesce(public.droits_utilisateur(id)->>'can_view_estimate', 'false') = 'true'
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

-- ─── 6. Se donner le rôle administrateur ────────────────────────────────────
--
-- REMPLACEZ l'adresse ci-dessous par la vôtre, puis exécutez cette ligne.
-- C'est le seul moyen de devenir administrateur : aucune page de
-- l'application ne peut accorder ce droit.

update public.profiles set is_admin = true where email = 'gloirezopop@gmail.com';

-- ─── 7. Contrôle ────────────────────────────────────────────────────────────

select
  (select count(*) from public.profiles) as profils,
  (select count(*) from public.profiles where is_admin) as administrateurs,
  (select count(*) from pg_policies
    where tablename = 'construction_rates' and policyname like '%administration%') as tarifs_proteges,
  (select count(*) from pg_proc where proname in
    ('estimer_projet', 'droits_utilisateur', 'marquer_projet_calcule', 'est_admin')) as fonctions;
