-- FONCTION D'ADMINISTRATION : AVIS ET RETOURS UTILISATEURS
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.
-- Ce script peut être relancé sans risque.
--
-- Permet aux administrateurs de consulter la totalité des avis et suggestions
-- laissés par les utilisateurs depuis la plateforme.

create or replace function public.avis_utilisateurs_admin()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.est_admin() then '[]'::jsonb else coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'nom', coalesce(a.properties->>'nom', 'Utilisateur'),
        'profession', coalesce(a.properties->>'profession', 'Professionnel'),
        'texte', coalesce(a.properties->>'texte', ''),
        'etoiles', coalesce((a.properties->>'etoiles')::numeric, 5),
        'email', a.properties->>'email',
        'date', coalesce(a.properties->>'date', to_char(a.created_at, 'YYYY-MM-DD')),
        'source', 'Serveur (Supabase)'
      )
      order by a.created_at desc
    )
    from public.analytics_events a
    where a.event = 'avis_utilisateur'
  ), '[]'::jsonb) end;
$$;

revoke all on function public.avis_utilisateurs_admin() from public, anon;
grant execute on function public.avis_utilisateurs_admin() to authenticated;
