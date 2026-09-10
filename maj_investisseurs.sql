-- INVESTISSEURS : CO-ADMINISTRATEURS AVEC PART DU CHIFFRE D'AFFAIRES
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ COMMENT L'EXÉCUTER                                                       │
-- │                                                                          │
-- │  1. ouvrez ce fichier, Ctrl+A puis Ctrl+C — TOUT le fichier ;            │
-- │  2. Supabase → SQL Editor → New query → Ctrl+V → Run ;                   │
-- │  3. lisez le tableau qui s'affiche : il dit étape par étape ce qui est   │
-- │     passé et, le cas échéant, le message d'erreur exact.                 │
-- │                                                                          │
-- │ Relançable autant de fois que voulu.                                     │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- POURQUOI CE SCRIPT EST ÉCRIT AINSI
--
-- L'éditeur SQL de Supabase envoie tout le texte d'un coup, dans UNE seule
-- transaction, et n'affiche QUE le résultat de la dernière requête. Une erreur
-- n'importe où — même à la ligne 500 — annule donc les 499 lignes qui ont
-- réussi, et l'on repart avec une base inchangée et un message isolé.
--
-- Chaque étape ci-dessous est donc enfermée dans son propre bloc, avec son
-- propre filet : si elle échoue, elle inscrit son erreur dans un rapport et
-- laisse les suivantes s'exécuter. À la fin, une seule requête affiche le
-- rapport complet. On sait alors exactement ce qui manque, au lieu de deviner.
--
-- CE QU'IL MET EN PLACE
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


-- ─── Le seul réglage de ce fichier ──────────────────────────────────────────

drop table if exists parametre_maj;
create temp table parametre_maj (email_fondateur text);

-- ⚠️ SEULE LIGNE À MODIFIER : l'adresse du compte fondateur.
insert into parametre_maj values ('gloirezopop@gmail.com');


-- ─── Le rapport d'exécution ─────────────────────────────────────────────────

drop table if exists rapport_maj;
create temp table rapport_maj (ordre int, etape text, etat text, detail text);


-- ─── 1. Les prérequis ───────────────────────────────────────────────────────
--
-- Ce bloc ne modifie rien. Il vérifie que ce sur quoi le reste s'appuie existe
-- déjà, et le dit en clair — sans quoi les étapes suivantes échoueraient l'une
-- après l'autre avec des messages qui n'indiquent pas la cause commune.

do $bloc$
declare
  v_manque text[] := '{}';
begin
  if to_regclass('public.profiles')          is null then v_manque := v_manque || 'table profiles'::text;          end if;
  if to_regclass('public.payments')          is null then v_manque := v_manque || 'table payments'::text;          end if;
  if to_regclass('public.payment_intents')   is null then v_manque := v_manque || 'table payment_intents'::text;   end if;
  if to_regclass('public.subscriptions')     is null then v_manque := v_manque || 'table subscriptions'::text;     end if;
  if to_regclass('public.analytics_events')  is null then v_manque := v_manque || 'table analytics_events'::text;  end if;
  if to_regclass('public.projects')          is null then v_manque := v_manque || 'table projects'::text;          end if;

  if to_regclass('public.profiles') is not null
     and not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'profiles'
                        and column_name = 'is_admin') then
    v_manque := v_manque || 'colonne profiles.is_admin'::text;
  end if;

  if to_regprocedure('public.est_admin()') is null then
    v_manque := v_manque || 'fonction est_admin()'::text;
  end if;

  if array_length(v_manque, 1) is null then
    insert into rapport_maj values (1, '1. Prerequis', 'OK', 'tout est en place');
  else
    insert into rapport_maj values (1, '1. Prerequis', 'MANQUE',
      array_to_string(v_manque, ', ') ||
      ' — executez schema_verrouillage.sql puis maj_admin_tableau_de_bord.sql avant celui-ci');
  end if;
end $bloc$;


-- ─── 2. Les colonnes ────────────────────────────────────────────────────────

do $bloc$
begin
  execute $sql$
    alter table public.profiles
      add column if not exists est_fondateur       boolean not null default false,
      add column if not exists part_investissement numeric(5,2) not null default 0,
      add column if not exists admis_le            timestamptz,
      add column if not exists admis_par           uuid
  $sql$;

  -- Une part reste un pourcentage : ni négative, ni supérieure à 100.
  if not exists (select 1 from pg_constraint where conname = 'profiles_part_investissement_valide') then
    execute $sql$
      alter table public.profiles
        add constraint profiles_part_investissement_valide
        check (part_investissement >= 0 and part_investissement <= 100)
    $sql$;
  end if;

  insert into rapport_maj values (2, '2. Colonnes', 'OK', 'est_fondateur, part_investissement, admis_le, admis_par');
exception when others then
  insert into rapport_maj values (2, '2. Colonnes', 'ECHEC', sqlerrm);
end $bloc$;


-- ─── 3. Marquer le fondateur ────────────────────────────────────────────────
--
-- On cherche l'adresse dans `auth.users`, pas dans `profiles`. La colonne
-- `profiles.email` n'est qu'une copie, remplie par le déclencheur d'inscription :
-- elle peut être nulle pour un compte créé avant lui, ou périmée si l'adresse a
-- changé depuis. Chercher dans la copie, c'est risquer de ne rien trouver, de
-- ne rien dire, et de laisser l'écran masquer la section sans explication.

do $bloc$
declare
  v_email text := (select email_fondateur from parametre_maj);
  v_id    uuid;
  v_n     int;
begin
  select u.id into v_id from auth.users u where lower(u.email) = lower(v_email);

  if v_id is null then
    insert into rapport_maj values (3, '3. Le fondateur', 'ECHEC',
      'Aucun compte inscrit avec l''adresse ' || v_email ||
      '. Creez d''abord le compte sur le site, ou corrigez l''adresse en tete de ce script.');
  else
    update public.profiles
       set est_fondateur = true, is_admin = true
     where id = v_id;
    get diagnostics v_n = row_count;

    -- Le compte existe dans `auth.users` mais n'a pas de profil : c'est le cas
    -- des comptes créés avant le déclencheur. On le crée plutôt que de laisser
    -- l'UPDATE ne toucher aucune ligne et se taire.
    if v_n = 0 then
      insert into public.profiles (id, email, is_admin, est_fondateur)
      values (v_id, v_email, true, true)
      on conflict (id) do update set is_admin = true, est_fondateur = true;
      insert into rapport_maj values (3, '3. Le fondateur', 'OK',
        v_email || ' — le profil manquait, il a ete cree');
    else
      insert into rapport_maj values (3, '3. Le fondateur', 'OK', v_email);
    end if;

    -- Tant qu'à faire, on remet toutes les copies d'adresse d'aplomb : elles
    -- servent aux recherches par e-mail dans `nommer_investisseur()`.
    update public.profiles p
       set email = u.email
      from auth.users u
     where u.id = p.id
       and (p.email is null or lower(p.email) is distinct from lower(u.email));
  end if;
exception when others then
  insert into rapport_maj values (3, '3. Le fondateur', 'ECHEC', sqlerrm);
end $bloc$;


-- ─── 4. Qui est le fondateur, et personne ne se nomme soi-même ──────────────
--
-- Aujourd'hui, `profiles` ne porte qu'une politique de LECTURE : personne ne
-- peut écrire dans sa propre ligne, donc personne ne peut se déclarer
-- administrateur. Le déclencheur ci-dessous n'est donc pas une réparation,
-- c'est une seconde serrure.
--
-- Elle a sa raison d'être : le jour où l'on voudra laisser chacun corriger son
-- nom ou son téléphone, il faudra accorder une politique d'écriture sur cette
-- table — et ce jour-là, `is_admin` et `part_investissement` deviendraient
-- modifiables par leur propriétaire sans que rien ne le signale. Le déclencheur
-- tient indépendamment des politiques.
--
-- `auth.uid() is null` = exécution depuis l'éditeur SQL ou une clé de service :
-- c'est vous, dans ce script même. On laisse passer, sinon l'étape 3 ne
-- pourrait pas s'appliquer.

do $bloc$
begin
  execute $sql$
    create or replace function public.est_fondateur()
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
    as $corps$
      select coalesce((select p.est_fondateur from public.profiles p where p.id = auth.uid()), false);
    $corps$
  $sql$;

  execute $sql$ revoke all on function public.est_fondateur() from public, anon $sql$;
  execute $sql$ grant execute on function public.est_fondateur() to authenticated $sql$;

  execute $sql$
    create or replace function public.protege_privileges()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $corps$
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
    $corps$
  $sql$;

  execute $sql$ drop trigger if exists protege_privileges_profiles on public.profiles $sql$;
  execute $sql$
    create trigger protege_privileges_profiles
      before update on public.profiles
      for each row execute function public.protege_privileges()
  $sql$;

  insert into rapport_maj values (4, '4. est_fondateur() + garde-fou', 'OK', 'les privileges ne se posent que par le fondateur');
exception when others then
  insert into rapport_maj values (4, '4. est_fondateur() + garde-fou', 'ECHEC', sqlerrm);
end $bloc$;


-- ─── 5. Nommer et retirer un investisseur ───────────────────────────────────
--
-- Le compte doit déjà exister : on ne crée pas d'utilisateur ici. Pour une
-- personne qui n'a pas encore de compte, voir les invitations (étape 7).
--
-- La somme des parts ne peut pas dépasser 100 % : une répartition impossible
-- doit être refusée au moment où on la saisit, pas découverte au partage.

do $bloc$
begin
  execute $sql$
    create or replace function public.nommer_investisseur(p_email text, p_part numeric)
    returns jsonb
    language plpgsql
    security definer
    set search_path = public
    as $corps$
    declare
      v_profil public.profiles%rowtype;
      v_somme  numeric;
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
        -- Dans un RAISE, un pour-cent seul prend la valeur qui suit ; doubler
        -- le signe l'ecrit tel quel. Autant de valeurs que de signes seuls,
        -- sinon la fonction est refusee des sa creation.
        raise exception 'Total des parts impossible : % %% deja attribues', v_somme;
      end if;

      update public.profiles
         set is_admin            = true,
             part_investissement = p_part,
             admis_le            = coalesce(admis_le, now()),
             admis_par           = auth.uid()
       where id = v_profil.id;

      return jsonb_build_object('email', v_profil.email, 'part', p_part);
    end;
    $corps$
  $sql$;

  execute $sql$ revoke all on function public.nommer_investisseur(text, numeric) from public, anon $sql$;
  execute $sql$ grant execute on function public.nommer_investisseur(text, numeric) to authenticated $sql$;

  execute $sql$
    create or replace function public.retirer_investisseur(p_email text)
    returns jsonb
    language plpgsql
    security definer
    set search_path = public
    as $corps$
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
    $corps$
  $sql$;

  execute $sql$ revoke all on function public.retirer_investisseur(text) from public, anon $sql$;
  execute $sql$ grant execute on function public.retirer_investisseur(text) to authenticated $sql$;

  insert into rapport_maj values (5, '5. Nommer / retirer', 'OK', 'nommer_investisseur(), retirer_investisseur()');
exception when others then
  insert into rapport_maj values (5, '5. Nommer / retirer', 'ECHEC', sqlerrm);
end $bloc$;


-- ─── 6. La liste des investisseurs, pour le fondateur seul ──────────────────

do $bloc$
begin
  execute $sql$
    create or replace function public.investisseurs_admin()
    returns jsonb
    language sql
    stable
    security definer
    set search_path = public
    as $corps$
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
    $corps$
  $sql$;

  execute $sql$ revoke all on function public.investisseurs_admin() from public, anon $sql$;
  execute $sql$ grant execute on function public.investisseurs_admin() to authenticated $sql$;

  insert into rapport_maj values (6, '6. Liste des investisseurs', 'OK', 'investisseurs_admin()');
exception when others then
  insert into rapport_maj values (6, '6. Liste des investisseurs', 'ECHEC', sqlerrm);
end $bloc$;


-- ─── 7. Les invitations ─────────────────────────────────────────────────────
--
-- Pour une personne qui n'a pas encore de compte : on retient son adresse et sa
-- part, et la nomination s'applique toute seule à la création du compte.
-- Rien n'est envoyé par la base — l'e-mail part de l'application.

do $bloc$
begin
  execute $sql$
    create table if not exists public.investisseurs_invites (
      email      text primary key,
      part       numeric(5,2) not null check (part > 0 and part <= 100),
      invite_le  timestamptz not null default now(),
      invite_par uuid
    )
  $sql$;

  -- Aucune politique n'est créée : la table n'est lisible que par les fonctions
  -- ci-dessous, qui sont `security definer`. Le navigateur n'y touche jamais.
  execute $sql$ alter table public.investisseurs_invites enable row level security $sql$;

  execute $sql$
    create or replace function public.inviter_investisseur(p_email text, p_part numeric)
    returns jsonb
    language plpgsql
    security definer
    set search_path = public
    as $corps$
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
    $corps$
  $sql$;

  execute $sql$ revoke all on function public.inviter_investisseur(text, numeric) from public, anon $sql$;
  execute $sql$ grant execute on function public.inviter_investisseur(text, numeric) to authenticated $sql$;

  execute $sql$
    create or replace function public.invitations_admin()
    returns jsonb
    language sql
    stable
    security definer
    set search_path = public
    as $corps$
      select case when not public.est_fondateur() then null::jsonb else coalesce((
        select jsonb_agg(jsonb_build_object('email', email, 'part', part, 'invite_le', invite_le)
                         order by invite_le desc)
        from public.investisseurs_invites
      ), '[]'::jsonb) end;
    $corps$
  $sql$;

  execute $sql$ revoke all on function public.invitations_admin() from public, anon $sql$;
  execute $sql$ grant execute on function public.invitations_admin() to authenticated $sql$;

  execute $sql$
    create or replace function public.annuler_invitation(p_email text)
    returns jsonb
    language plpgsql
    security definer
    set search_path = public
    as $corps$
    begin
      if not public.est_fondateur() then
        raise exception 'Reserve au fondateur';
      end if;
      delete from public.investisseurs_invites where lower(email) = lower(trim(p_email));
      return jsonb_build_object('email', lower(trim(p_email)));
    end;
    $corps$
  $sql$;

  execute $sql$ revoke all on function public.annuler_invitation(text) from public, anon $sql$;
  execute $sql$ grant execute on function public.annuler_invitation(text) to authenticated $sql$;

  -- L'invitation s'applique à la création du profil.
  execute $sql$
    create or replace function public.applique_invitation_investisseur()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $corps$
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
    $corps$
  $sql$;

  execute $sql$ drop trigger if exists applique_invitation_investisseur_profiles on public.profiles $sql$;
  execute $sql$
    create trigger applique_invitation_investisseur_profiles
      before insert on public.profiles
      for each row execute function public.applique_invitation_investisseur()
  $sql$;

  insert into rapport_maj values (7, '7. Invitations', 'OK',
    'inviter_investisseur(), invitations_admin(), annuler_invitation() + application a l''inscription');
exception when others then
  insert into rapport_maj values (7, '7. Invitations', 'ECHEC', sqlerrm);
end $bloc$;


-- ─── 8. Ce que voit un investisseur : SA part, pas le chiffre d'affaires ────
--
-- La fonction ne renvoie jamais le total dont la part est tirée. Un
-- investisseur qui appellerait l'API directement n'obtiendrait rien de plus
-- que ce que son écran affiche.

do $bloc$
begin
  execute $sql$
    create or replace function public.mes_revenus_investisseur()
    returns jsonb
    language sql
    stable
    security definer
    set search_path = public
    as $corps$
      with moi as (
        select part_investissement as part, admis_le
          from public.profiles where id = auth.uid()
      )
      select case when coalesce((select part from moi), 0) <= 0 then null::jsonb else jsonb_build_object(
        'part',     (select part from moi),
        'admis_le', (select admis_le from moi),
        'montant_total', round((select part from moi) / 100
          * coalesce((select sum(amount) from public.payments where status = 'SUCCESS'), 0)),
        'montant_30j',   round((select part from moi) / 100
          * coalesce((select sum(amount) from public.payments
                       where status = 'SUCCESS' and created_at > now() - interval '30 days'), 0)),
        'genere_le', now()
      ) end;
    $corps$
  $sql$;

  execute $sql$ revoke all on function public.mes_revenus_investisseur() from public, anon $sql$;
  execute $sql$ grant execute on function public.mes_revenus_investisseur() to authenticated $sql$;

  insert into rapport_maj values (8, '8. Part de l''investisseur', 'OK', 'mes_revenus_investisseur()');
exception when others then
  insert into rapport_maj values (8, '8. Part de l''investisseur', 'ECHEC', sqlerrm);
end $bloc$;


-- ─── 9. Le chiffre d'affaires redevient privé ───────────────────────────────
--
-- `statistiques_admin()` livrait les recettes à TOUT administrateur. Depuis
-- qu'il peut y avoir plusieurs administrateurs, les clés d'argent ne sortent
-- plus que pour le fondateur. Le reste — comptes, projets, activité — reste
-- partagé : un investisseur a le droit de suivre la marche du produit.

do $bloc$
begin
  execute $sql$
    create or replace function public.statistiques_admin()
    returns jsonb
    language sql
    stable
    security definer
    set search_path = public
    as $corps$
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
        -- Les clés d'argent, pour le fondateur seul.
        || case when public.est_fondateur() then jsonb_build_object(
             'paiements_reussis', (select count(*) from public.payments where status = 'SUCCESS'),
             'recettes_totales',  coalesce((select sum(amount) from public.payments where status = 'SUCCESS'), 0),
             'recettes_30j',      coalesce((select sum(amount) from public.payments
                                             where status = 'SUCCESS' and created_at > now() - interval '30 days'), 0),
             'intentions_en_attente', (select count(*) from public.payment_intents where status = 'pending'),
             'parts_attribuees', coalesce((select sum(part_investissement) from public.profiles), 0)
           ) else '{}'::jsonb end
      end;
    $corps$
  $sql$;

  execute $sql$ revoke all on function public.statistiques_admin() from public, anon $sql$;
  execute $sql$ grant execute on function public.statistiques_admin() to authenticated $sql$;

  insert into rapport_maj values (9, '9. Chiffre d''affaires prive', 'OK', 'statistiques_admin() : est_fondateur + cles d''argent reservees');
exception when others then
  insert into rapport_maj values (9, '9. Chiffre d''affaires prive', 'ECHEC', sqlerrm);
end $bloc$;


-- ─── 10. La liste des comptes reste au fondateur ────────────────────────────
--
-- Elle contient les adresses e-mail et les téléphones de tous les clients : un
-- investisseur n'a pas à en disposer pour suivre son placement.

do $bloc$
begin
  execute $sql$
    create or replace function public.comptes_admin()
    returns jsonb
    language sql
    stable
    security definer
    set search_path = public
    as $corps$
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
    $corps$
  $sql$;

  execute $sql$ revoke all on function public.comptes_admin() from public, anon $sql$;
  execute $sql$ grant execute on function public.comptes_admin() to authenticated $sql$;

  insert into rapport_maj values (10, '10. Liste des comptes', 'OK', 'comptes_admin() reserve au fondateur');
exception when others then
  insert into rapport_maj values (10, '10. Liste des comptes', 'ECHEC', sqlerrm);
end $bloc$;


-- ─── 11. Le verdict ─────────────────────────────────────────────────────────

do $bloc$
declare
  v_email     text := (select email_fondateur from parametre_maj);
  v_fondateur boolean;
  v_admin     boolean;
  v_fonctions int;
begin
  select p.est_fondateur, p.is_admin into v_fondateur, v_admin
    from auth.users u left join public.profiles p on p.id = u.id
   where lower(u.email) = lower(v_email);

  select count(*) into v_fonctions
    from information_schema.routines
   where routine_schema = 'public'
     and routine_name in ('est_fondateur', 'nommer_investisseur', 'retirer_investisseur',
                          'investisseurs_admin', 'inviter_investisseur', 'invitations_admin',
                          'annuler_invitation', 'mes_revenus_investisseur');

  insert into rapport_maj values (98, 'Fonctions installees', v_fonctions || ' / 8',
    case when v_fonctions = 8 then 'complet' else 'incomplet — voir les ECHEC ci-dessus' end);

  insert into rapport_maj values (99, 'VERDICT',
    case when coalesce(v_fondateur, false) and v_fonctions = 8 then 'PRET' else 'A CORRIGER' end,
    case
      when coalesce(v_fondateur, false) and v_fonctions = 8
        then 'Rechargez /admin avec Ctrl+Maj+R : la section Investisseurs doit apparaitre.'
      when not coalesce(v_fondateur, false)
        then v_email || ' n''est pas marque fondateur — lisez la ligne 3 ci-dessus.'
      else 'Des fonctions manquent — lisez les lignes ECHEC ci-dessus et envoyez-les moi.'
    end);
exception when others then
  insert into rapport_maj values (99, 'VERDICT', 'ECHEC', sqlerrm);
end $bloc$;


-- L'éditeur SQL de Supabase n'affiche QUE le résultat de la dernière requête.
-- C'est donc celle-ci, et elle contient tout.

select etape as "Etape", etat as "Etat", detail as "Detail"
  from rapport_maj
 order by ordre;
