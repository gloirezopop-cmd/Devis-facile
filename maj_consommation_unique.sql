-- CONSOMMATION DES ABONNEMENTS "UN SEUL DEVIS"
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.
--
-- Cette fonction permet de lier un abonnement 'ONE_TIME' (3500 FCFA) à un
-- projet spécifique dès que l'utilisateur exporte son devis, et de définir
-- son expiration à 24h après cet export.
-- Ainsi, l'offre s'arrête (ne peut plus être utilisée sur d'autres projets) 
-- mais l'utilisateur a 24h pour corriger son document.

create or replace function public.consommer_abonnement_unique()
returns jsonb
language plpgsql
security definer
set search_path = public
as $corps$
declare
  v_subscription_id uuid;
  v_plan_id text;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non connecté';
  end if;

  -- 1. Chercher un abonnement ONE_TIME actif et non consommé (project_id null et end_date null)
  select s.id, s.plan_id into v_subscription_id, v_plan_id
    from public.subscriptions s
    join public.subscription_plans p on p.id = s.plan_id
   where s.user_id = auth.uid()
     and s.status = 'ACTIVE'
     and p.billing_type = 'ONE_TIME'
     and s.end_date is null
   order by s.created_at asc
   limit 1;

  if not found then
    -- Si aucun abonnement vierge n'est trouvé, c'est que l'utilisateur 
    -- n'en a pas, ou qu'il utilise un abonnement mensuel/annuel (qui n'est pas ONE_TIME),
    -- ou qu'il a déjà consommé le sien. Dans ce cas, on ne fait rien et on retourne false.
    return jsonb_build_object('consomme', false, 'message', 'Aucun abonnement unique vierge trouvé');
  end if;

  -- 2. Marquer comme consommé en fixant la fin dans 24h
  update public.subscriptions
     set end_date = now() + interval '24 hours'
   where id = v_subscription_id;

  return jsonb_build_object(
    'consomme', true, 
    'plan_id', v_plan_id, 
    'expire_le', now() + interval '24 hours'
  );
end;
$corps$;

revoke all on function public.consommer_abonnement_unique() from public, anon;
grant execute on function public.consommer_abonnement_unique() to authenticated;
