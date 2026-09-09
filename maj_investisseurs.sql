-- INVESTISSEURS : CO-ADMINISTRATEURS AVEC PART DU CHIFFRE D'AFFAIRES
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.
-- Ce script peut être relancé sans risque.
--
-- Ce qu'il met en place :
--   1. une distinction entre LE FONDATEUR et les INVESTISSEURS. Les deux sont
--      administrateurs — donc dispensés d'abonnement — mais seul le fondateur
--      voit le chiffre d'affaires et peut nommer quelqu'un ;
--   2. une part d'investissement par investisseur, en pourcentage ;
--   3. pour l'investisseur, SA part en francs — jamais le chiffre d'affaires
--      dont elle est tirée.
--
-- ⚠️ Le point important : « seul le fondateur » doit être vrai DANS LA BASE.
-- Un contrôle écrit uniquement dans le navigateur ne protège rien — n'importe
-- qui peut appeler l'API directement avec son propre jeton. Tout ce qui suit
-- est donc verrouillé côté serveur, et l'écran ne fait que refléter ce que la
-- base accepte de dire.

-- ─── 1. Les colonnes ────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists est_fondateur      boolean not null default false,
  add column if not exists part_investissement numeric(5,2) not null default 0,
  add column if not exists admis_le           timestamptz,
  add column if not exists admis_par          uuid;

-- Une part reste un pourcentage : ni négative, ni supérieure à 100.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_part_investissement_valide') then
    alter table public.profiles
      add constraint profiles_part_investissement_valide
      check (part_investissement >= 0 and part_investissement <= 100);
  end if;
end $$;

-- ⚠️ Remplacez l'adresse si le compte fondateur n'est pas celui-là.
update public.profiles
   set est_fondateur = true,
       is_admin      = true
 where lower(email) = lower('gloirezopop@gmail.com');

-- ─── 2. Qui est le fondateur ────────────────────────────────────────────────

create or replace function public.est_fondateur()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.est_fondateur from public.profiles p where p.id = auth.uid()), false);
$$;

revoke all on function public.est_fondateur() from public, anon;
grant execute on function public.est_fondateur() to authenticated;

-- ─── 3. Personne ne se nomme soi-même ───────────────────────────────────────
--
-- `profiles` autorise chaque compte à modifier SA ligne (nom, téléphone…).
-- Sans ce garde-fou, n'importe qui pourrait donc s'écrire `is_admin = true` et
-- se donner l'application gratuitement, voire une part du chiffre d'affaires.
-- Ce déclencheur refuse toute modification d'un privilège qui ne vient pas du
-- fondateur.
--
-- `auth.uid() is null` = exécution depuis l'éditeur SQL ou une clé de service :
-- c'est vous, dans ce même script. On laisse passer, sinon la ligne 4 de ce
-- fichier ne pourrait pas s'appliquer.

create or replace function public.protege_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.is_admin            is distinct from old.is_admin
   or new.est_fondateur       is distinct from old.est_fondateur
   or new.part_investissement is distinct from old.part_investissement)
     and auth.uid() is not null
     and not public.est_fondateur() then
    raise exception 'Seul le fondateur peut modifier les privileges d''un compte';
  end if;
  return new;
end;
$$;

drop trigger if exists protege_privileges_profiles on public.profiles;
create trigger protege_privileges_profiles
  before update on public.profiles
  for each row execute function public.protege_privileges();

-- ─── 4. Nommer un investisseur ──────────────────────────────────────────────
--
-- Le compte doit déjà exister : on ne crée pas d'utilisateur ici. Pour une
-- personne qui n'a pas encore de compte, voir les invitations (section 7).
--
-- La somme des parts ne peut pas dépasser 100 % : une répartition impossible
-- doit être refusée au moment où on la saisit, pas découverte au partage.

create or replace function public.nommer_investisseur(p_email text, p_part numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profil  public.profiles%rowtype;
  v_somme   numeric;
begin
  if not public.est_fondateur() then
    raise exception 'Reserve au fondateur';
  end if;

  if p_part is null or p_part <= 0 or p_part > 100 then
    raise exception 'La part doit etre comprise entre 0 et 100 %%';
  end if;

  select * into v_profil from public.profiles where lower(email) = lower(trim(p_email));
  if not found then
    raise exception 'Aucun compte avec cette adresse. La personne doit d''abord creer son compte.';
  end if;

  if v_profil.est_fondateur then
    raise exception 'Le fondateur n''est pas un investisseur';
  end if;

  select coalesce(sum(part_investissement), 0) into v_somme
    from public.profiles
   where part_investissement > 0 and id <> v_profil.id;

  if v_somme + p_part > 100 then
    raise exception 'Total des parts impossible : % %% deja attribues, il reste % %%', v_somme, 100 - v_somme;
  end if;

  update public.profiles
     set is_admin            = true,
         part_investissement = p_part,
         admis_le            = coalesce(admis_le, now()),
         admis_par           = auth.uid()
   where id = v_profil.id;

  return jsonb_build_object('email', v_profil.email, 'part', p_part);
end;
$$;

revoke all on function public.nommer_investisseur(text, numeric) from public, anon;
grant execute on function public.nommer_investisseur(text, numeric) to authenticated;

-- ─── 5. Retirer un investisseur ─────────────────────────────────────────────

create or replace function public.retirer_investisseur(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profil public.profiles%rowtype;
begin
  if not public.est_fondateur() then
    raise exception 'Reserve au fondateur';
  end if;

  select * into v_profil from public.profiles where lower(email) = lower(trim(p_email));
  if not found then
    raise exception 'Aucun compte avec cette adresse';
  end if;

  if v_profil.est_fondateur then
    raise exception 'Le fondateur ne peut pas se retirer lui-meme';
  end if;

  update public.profiles
     set is_admin            = false,
         part_investissement = 0,
         admis_le            = null,
         admis_par           = null
   where id = v_profil.id;

  return jsonb_build_object('email', v_profil.email);
end;
$$;

revoke all on function public.retirer_investisseur(text) from public, anon;
grant execute on function public.retirer_investisseur(text) to authenticated;

-- ─── 6. La liste des investisseurs, pour le fondateur seul ──────────────────

create or replace function public.investisseurs_admin()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.est_fondateur() then null::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object(
      'email',    p.email,
      'prenom',   u.raw_user_meta_data->>'first_name',
      'nom',      u.raw_user_meta_data->>'last_name',
      'part',     p.part_investissement,
      'admis_le', p.admis_le,
      'montant',  round(p.part_investissement / 100
                        * coalesce((select sum(amount) from public.payments where status = 'SUCCESS'), 0))
    ) order by p.part_investissement desc)
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.part_investissement > 0
  ), '[]'::jsonb) end;
$$;

revoke all on function public.investisseurs_admin() from public, anon;
grant execute on function public.investisseurs_admin() to authenticated;

-- ─── 7. Les invitations ─────────────────────────────────────────────────────
--
-- Pour une personne qui n'a pas encore de compte : on retient son adresse et
-- sa part, et la nomination s'applique toute seule à la creation du compte.
-- Rien n'est envoye par la base — l'e-mail part de l'application.

create table if not exists public.investisseurs_invites (
  email       text primary key,
  part        numeric(5,2) not null check (part > 0 and part <= 100),
  invite_le   timestamptz not null default now(),
  invite_par  uuid
);

alter table public.investisseurs_invites enable row level security;
-- Aucune politique : la table n'est lisible que par les fonctions ci-dessous,
-- qui sont `security definer`. Le navigateur n'y touche jamais directement.

create or replace function public.inviter_investisseur(p_email text, p_part numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existe boolean;
begin
  if not public.est_fondateur() then
    raise exception 'Reserve au fondateur';
  end if;
  if p_part is null or p_part <= 0 or p_part > 100 then
    raise exception 'La part doit etre comprise entre 0 et 100 %%';
  end if;

  select exists(select 1 from public.profiles where lower(email) = lower(trim(p_email))) into v_existe;
  if v_existe then
    -- Le compte existe deja : autant le nommer tout de suite.
    return public.nommer_investisseur(p_email, p_part);
  end if;

  insert into public.investisseurs_invites (email, part, invite_par)
  values (lower(trim(p_email)), p_part, auth.uid())
  on conflict (email) do update set part = excluded.part, invite_le = now();

  return jsonb_build_object('email', lower(trim(p_email)), 'part', p_part, 'en_attente', true);
end;
$$;

revoke all on function public.inviter_investisseur(text, numeric) from public, anon;
grant execute on function public.inviter_investisseur(text, numeric) to authenticated;

create or replace function public.invitations_admin()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.est_fondateur() then null::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('email', email, 'part', part, 'invite_le', invite_le)
                     order by invite_le desc)
    from public.investisseurs_invites
  ), '[]'::jsonb) end;
$$;

revoke all on function public.invitations_admin() from public, anon;
grant execute on function public.invitations_admin() to authenticated;

create or replace function public.annuler_invitation(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_fondateur() then
    raise exception 'Reserve au fondateur';
  end if;
  delete from public.investisseurs_invites where lower(email) = lower(trim(p_email));
  return jsonb_build_object('email', lower(trim(p_email)));
end;
$$;

revoke all on function public.annuler_invitation(text) from public, anon;
grant execute on function public.annuler_invitation(text) to authenticated;

-- L'invitation s'applique a la creation du profil.
create or replace function public.applique_invitation_investisseur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_part numeric;
begin
  select part into v_part
    from public.investisseurs_invites
   where lower(email) = lower(new.email);

  if found then
    new.is_admin            := true;
    new.part_investissement := v_part;
    new.admis_le            := now();
    delete from public.investisseurs_invites where lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

drop trigger if exists applique_invitation_investisseur_profiles on public.profiles;
create trigger applique_invitation_investisseur_profiles
  before insert on public.profiles
  for each row execute function public.applique_invitation_investisseur();

-- ─── 8. Ce que voit un investisseur : SA part, pas le chiffre d'affaires ────
--
-- La fonction ne renvoie jamais le total dont la part est tirée. Un
-- investisseur qui appellerait l'API directement n'obtiendrait rien de plus
-- que ce que son écran affiche.

create or replace function public.mes_revenus_investisseur()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with moi as (
    select part_investissement as part, admis_le
      from public.profiles where id = auth.uid()
  )
  select case when (select part from moi) <= 0 then null::jsonb else jsonb_build_object(
    'part',     (select part from moi),
    'admis_le', (select admis_le from moi),
    'montant_total', round((select part from moi) / 100
      * coalesce((select sum(amount) from public.payments where status = 'SUCCESS'), 0)),
    'montant_30j',   round((select part from moi) / 100
      * coalesce((select sum(amount) from public.payments
                   where status = 'SUCCESS' and created_at > now() - interval '30 days'), 0)),
    'genere_le', now()
  ) end;
$$;

revoke all on function public.mes_revenus_investisseur() from public, anon;
grant execute on function public.mes_revenus_investisseur() to authenticated;

-- ─── 9. Le chiffre d'affaires redevient privé ───────────────────────────────
--
-- `statistiques_admin()` livrait les recettes à TOUT administrateur. Depuis
-- qu'il peut y avoir plusieurs administrateurs, les trois clés d'argent ne
-- sortent plus que pour le fondateur. Le reste — comptes, projets, activité —
-- reste partagé : un investisseur a le droit de suivre la marche du produit.

create or replace function public.statistiques_admin()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.est_admin() then null::jsonb else
    jsonb_build_object(
      'est_fondateur', public.est_fondateur(),
      'mon_prenom', (select u.raw_user_meta_data->>'first_name' from auth.users u where u.id = auth.uid()),

      'comptes_total', (select count(*) from auth.users),
      'comptes_7j',    (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'comptes_30j',   (select count(*) from auth.users where created_at > now() - interval '30 days'),

      'actifs_7j',     (select count(distinct user_id) from public.analytics_events
                          where user_id is not null and created_at > now() - interval '7 days'),
      'actifs_30j',    (select count(distinct user_id) from public.analytics_events
                          where user_id is not null and created_at > now() - interval '30 days'),
      'evenements_7j', (select count(*) from public.analytics_events
                          where created_at > now() - interval '7 days'),

      'projets_total', (select count(*) from public.projects),
      'projets_7j',    (select count(*) from public.projects where created_at > now() - interval '7 days'),

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

      'inscriptions_par_jour', coalesce((
        select jsonb_agg(jsonb_build_object('jour', jour, 'nombre', nombre) order by jour)
        from (
          select d::date as jour,
                 (select count(*) from auth.users u where u.created_at::date = d::date) as nombre
          from generate_series(now()::date - interval '29 days', now()::date, interval '1 day') d
        ) serie
      ), '[]'::jsonb),

      'genere_le', now()
    )
    -- Les trois clés d'argent, pour le fondateur seul.
    || case when public.est_fondateur() then jsonb_build_object(
         'paiements_reussis', (select count(*) from public.payments where status = 'SUCCESS'),
         'recettes_totales',  coalesce((select sum(amount) from public.payments where status = 'SUCCESS'), 0),
         'recettes_30j',      coalesce((select sum(amount) from public.payments
                                         where status = 'SUCCESS' and created_at > now() - interval '30 days'), 0),
         'intentions_en_attente', (select count(*) from public.payment_intents where status = 'pending'),
         'parts_attribuees', coalesce((select sum(part_investissement) from public.profiles), 0)
       ) else '{}'::jsonb end
  end;
$$;

revoke all on function public.statistiques_admin() from public, anon;
grant execute on function public.statistiques_admin() to authenticated;

-- ─── 10. La liste des comptes reste au fondateur ────────────────────────────
--
-- Elle contient les adresses e-mail et les téléphones de tous les clients :
-- un investisseur n'a pas à en disposer pour suivre son placement.

create or replace function public.comptes_admin()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.est_fondateur() then null::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object(
      'email',     u.email,
      'prenom',    u.raw_user_meta_data->>'first_name',
      'nom',       u.raw_user_meta_data->>'last_name',
      'telephone', u.raw_user_meta_data->>'phone',
      'cree_le',   u.created_at,
      'formule',   (select s.plan_id from public.subscriptions s
                     where s.user_id = u.id and s.status = 'ACTIVE'
                       and (s.end_date is null or s.end_date > now())
                     order by s.created_at desc limit 1),
      'derniere_activite', (select max(a.created_at) from public.analytics_events a where a.user_id = u.id)
    ) order by u.created_at desc)
    from auth.users u
  ), '[]'::jsonb) end;
$$;

revoke all on function public.comptes_admin() from public, anon;
grant execute on function public.comptes_admin() to authenticated;

-- ─── 11. Contrôle ───────────────────────────────────────────────────────────
--
-- Attendu : votre ligne avec `est_fondateur` à true, et les huit fonctions.

select p.email, p.is_admin, p.est_fondateur, p.part_investissement
  from public.profiles p
 where lower(p.email) = lower('gloirezopop@gmail.com');

select routine_name
  from information_schema.routines
 where routine_schema = 'public'
   and routine_name in ('est_fondateur', 'nommer_investisseur', 'retirer_investisseur',
                        'investisseurs_admin', 'inviter_investisseur', 'invitations_admin',
                        'annuler_invitation', 'mes_revenus_investisseur')
 order by routine_name;
