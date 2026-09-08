-- MISE À JOUR PONCTUELLE — nouvelle grille de prix et niveaux de standing.
--
-- À exécuter une seule fois dans Supabase : SQL Editor > New query >
-- tout coller > Run.
--
-- À n'utiliser que sur une base DÉJÀ remplie par schema_estimation.sql.
-- Pour une base neuve, schema_estimation.sql contient déjà ces valeurs :
-- ce fichier ne sert qu'à aligner l'existant.
--
--   Économique      150 000 – 200 000 FCFA/m²
--   Moyen standing  200 000 – 300 000 FCFA/m²
--   Haut standing   300 000 – 450 000 FCFA/m²
--   Luxe            450 000 – 700 000 FCFA/m²   (ancien « Très haut standing »)
--
-- « Standard » est désactivé, pas supprimé : sa fourchette faisait doublon
-- avec « Moyen standing ». Le réactiver ne demande qu'un clic dans
-- /admin/tarifs, et ses anciens tarifs restent en base.

-- ─── 1. Les quatre niveaux de standing ──────────────────────────────────────

insert into public.estimation_standings (id, name, "order", active) values
  ('economique', 'Économique', 1, true),
  ('moyen_standing', 'Moyen standing', 2, true),
  ('haut_standing', 'Haut standing', 3, true),
  ('tres_haut_standing', 'Luxe', 4, true),
  ('standard', 'Standard', 99, false)
on conflict (id) do update set
  name = excluded.name,
  "order" = excluded."order",
  active = excluded.active;

-- ─── 2. Les prix ────────────────────────────────────────────────────────────
--
-- `price_reference` (le budget estimatif affiché) est le milieu de la
-- fourchette. Ces mises à jour ne visent que les lignes issues du script
-- d'installation : un tarif saisi ou corrigé depuis /admin/tarifs porte une
-- autre source et n'est pas touché.

update public.construction_rates
   set price_min = 150000, price_reference = 175000, price_max = 200000, updated_at = now()
 where standing_id = 'economique'
   and source like 'Valeurs de planification initiales%';

update public.construction_rates
   set price_min = 200000, price_reference = 250000, price_max = 300000, updated_at = now()
 where standing_id = 'moyen_standing'
   and source like 'Valeurs de planification initiales%';

update public.construction_rates
   set price_min = 300000, price_reference = 375000, price_max = 450000, updated_at = now()
 where standing_id = 'haut_standing'
   and source like 'Valeurs de planification initiales%';

-- « Luxe » garde le triplet fourni à l'origine (450 000 / 550 000 / 700 000) :
-- aucune mise à jour n'est nécessaire pour ce niveau.

update public.construction_rates
   set active = false, updated_at = now()
 where standing_id = 'standard'
   and source like 'Valeurs de planification initiales%';

-- ─── 3. Contrôle ────────────────────────────────────────────────────────────
--
-- Attendu : 54 pays, 4 standings actifs, 56 tarifs actifs sur 14 pays.

select
  (select count(*) from public.estimation_countries) as pays,
  (select count(*) from public.estimation_standings where active) as standings_actifs,
  (select count(*) from public.construction_rates where active) as tarifs_actifs,
  (select count(distinct country_id) from public.construction_rates where active) as pays_chiffrables;
