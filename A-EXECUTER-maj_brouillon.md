# À exécuter dans Supabase — brouillon de travail

⚠️ **Ne copie QUE le bloc gris ci-dessous** (entre les lignes ```sql et ```).
Ne colle jamais un message de discussion dans l'éditeur SQL — c'est ce qui
a causé l'erreur `syntax error at or near "npm"` : le texte collé n'était
pas du SQL, c'était ma réponse dans le chat.

## Étapes

1. Ouvre Supabase → **SQL Editor** → **New query**.
2. Clique dans le bloc de code ci-dessous, sélectionne tout (Ctrl+A à
   l'intérieur du bloc, ou le bouton de copie s'il existe), copie.
3. Colle dans l'éditeur SQL, en effaçant ce qu'il y avait avant.
4. Clique **Run**.
5. Une ligne de résultat doit s'afficher en bas : `table_creee = 1`,
   `rls_active = true`, `politiques = 4`.

## Le script

```sql
-- BROUILLON DE TRAVAIL — REPRENDRE UN PROJET INACHEVÉ
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.
--
-- LE PROBLÈME
--
-- Un utilisateur commence un devis, saisit ses dimensions, puis ferme
-- l'onglet. Aujourd'hui son travail reste dans le navigateur : il le perd
-- s'il change de machine, et il le retrouve sans explication s'il revient.
--
-- CE QUE FAIT CE SCRIPT
--
-- Il crée un brouillon par compte : la photo de ce qui a été saisi, déposée
-- dans le profil. À la connexion suivante, l'application peut demander s'il
-- faut reprendre ce travail ou repartir de zéro.
--
-- Une seule ligne par utilisateur : c'est un brouillon en cours, pas un
-- historique. Les projets terminés, eux, sont enregistrés ailleurs et ne
-- sont jamais touchés par ce mécanisme.
--
-- Ce script peut être relancé sans risque.

create table if not exists public.brouillons (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  contenu     jsonb not null default '{}'::jsonb,
  chemin      text,
  resume      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.brouillons is
  'Travail en cours, non terminé, d''un utilisateur. Une ligne par compte.';
comment on column public.brouillons.contenu is
  'Photo des formulaires en cours, telle que le navigateur la conserve.';
comment on column public.brouillons.chemin is
  'L''écran où l''utilisateur s''est arrêté, pour l''y ramener.';
comment on column public.brouillons.resume is
  'Une phrase lisible décrivant le brouillon, affichée au moment de reprendre.';

alter table public.brouillons enable row level security;

-- Chacun son brouillon, et rien que le sien. Les quatre opérations sont
-- déclarées séparément : une politique « for all » laisserait passer une
-- écriture au nom d'autrui si le `with check` venait à être oublié.

drop policy if exists "Chacun lit son brouillon" on public.brouillons;
create policy "Chacun lit son brouillon" on public.brouillons
  for select using (auth.uid() = user_id);

drop policy if exists "Chacun crée son brouillon" on public.brouillons;
create policy "Chacun crée son brouillon" on public.brouillons
  for insert with check (auth.uid() = user_id);

drop policy if exists "Chacun met à jour son brouillon" on public.brouillons;
create policy "Chacun met à jour son brouillon" on public.brouillons
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Chacun supprime son brouillon" on public.brouillons;
create policy "Chacun supprime son brouillon" on public.brouillons
  for delete using (auth.uid() = user_id);

-- `user_id` est la clé primaire : un compte ne peut pas se retrouver avec
-- deux brouillons concurrents, et l'enregistrement se fait en `upsert`.

-- ─── Contrôle ───────────────────────────────────────────────────────────────
--
-- Attendu : table présente, RLS active, 4 politiques.

select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'brouillons') as table_creee,
  (select relrowsecurity from pg_class where oid = 'public.brouillons'::regclass) as rls_active,
  (select count(*) from pg_policies where tablename = 'brouillons') as politiques;
```

## Après le Run

Le résultat attendu, une seule ligne :

| table_creee | rls_active | politiques |
|---|---|---|
| 1 | true | 4 |

Si tu vois autre chose, dis-le-moi avec le message d'erreur exact.
