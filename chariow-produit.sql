-- RELIE LES PRODUITS CHARIOW AUX TROIS FORMULES
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.
-- Ce script peut être relancé sans risque.

update public.subscription_plans set chariow_product_id = 'prd_nr2xml6o' where id = 'calcul';
update public.subscription_plans set chariow_product_id = 'prd_2padnel5' where id = 'devis_complet';
update public.subscription_plans set chariow_product_id = 'prd_rft4jpvt' where id = 'pro_annuel';

-- ─── Contrôle ───────────────────────────────────────────────────────────────
--
-- Attendu : les trois lignes montrent chacune leur id Chariow, aucune à NULL.

select id, name, chariow_product_id
  from public.subscription_plans
 order by display_order;
