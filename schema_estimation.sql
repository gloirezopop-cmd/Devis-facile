-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- (Menu de gauche > SQL Editor > New query).
--
-- Module « Estimer le budget de ma construction ». Cinq listes de référence
-- (pays, localisations, types de bâtiment, standings, toitures) et une table
-- de tarifs. Les prix ne sont jamais écrits dans le code de l'application :
-- ils vivent ici, et l'administrateur les met à jour depuis /admin/tarifs.
--
-- Ce script peut être relancé sans risque :
--   - les tables ne sont créées que si elles manquent ;
--   - les listes de référence sont remises à jour (ce sont nos données) ;
--   - les TARIFS ne sont jamais écrasés — un tarif que vous avez ajouté ou
--     corrigé depuis /admin/tarifs survit à une relance de ce script.

-- ─── 1. Listes de référence ─────────────────────────────────────────────────

create table if not exists public.estimation_countries (
  id text primary key,
  name text not null,
  currency_code text not null default 'XAF',
  "order" int not null default 0,
  active boolean not null default true
);

create table if not exists public.estimation_locations (
  id text primary key,
  country_id text references public.estimation_countries(id) on delete cascade not null,
  name text not null,
  -- 'ville' | 'region' | 'zone' — l'utilisateur peut choisir n'importe lequel
  -- des trois comme localisation ; la recherche de tarif ne distingue pas leur
  -- portée géographique réelle (aucune hiérarchie ville → région n'est modélisée).
  type text not null default 'ville' check (type in ('ville', 'region', 'zone')),
  "order" int not null default 0,
  active boolean not null default true
);

create table if not exists public.estimation_building_types (
  id text primary key,
  name text not null,
  "order" int not null default 0,
  active boolean not null default true
);

create table if not exists public.estimation_standings (
  id text primary key,
  name text not null,
  "order" int not null default 0,
  active boolean not null default true
);

create table if not exists public.estimation_roof_types (
  id text primary key,
  name text not null,
  "order" int not null default 0,
  active boolean not null default true
);

-- ─── 2. Tarifs ──────────────────────────────────────────────────────────────

create table if not exists public.construction_rates (
  id uuid primary key default gen_random_uuid(),
  country_id text references public.estimation_countries(id) on delete cascade not null,
  -- Un tarif sans localisation, sans type ou sans toiture est un tarif plus
  -- general (national, ou valable pour tous les types) : c'est exactement ce
  -- que la recherche en cascade du cote application interroge en dernier.
  location_id text references public.estimation_locations(id) on delete set null,
  building_type_id text references public.estimation_building_types(id) on delete set null,
  standing_id text references public.estimation_standings(id) on delete cascade not null,
  roof_type_id text references public.estimation_roof_types(id) on delete set null,
  -- 'R0', 'R1', 'R2', ... ou null = valable quelle que soit la configuration.
  level_category text,
  -- 'complete' = le prix au m² couvre l'ensemble du chantier, fondation et
  -- toiture comprises. C'est pour cela que la fondation et la toiture ne sont
  -- pas comptées comme des niveaux dans la surface : leur coût est déjà dans
  -- le prix au m² de surface construite.
  scope text not null default 'complete',
  price_min numeric not null check (price_min > 0),
  price_reference numeric not null check (price_reference > 0),
  price_max numeric not null check (price_max > 0),
  currency_code text not null default 'XAF',
  year int not null default extract(year from now()),
  source text,
  source_url text,
  confidence text not null default 'estimation' check (confidence in ('officiel', 'enquete_terrain', 'estimation')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_construction_rates_country on public.construction_rates(country_id) where active;

-- Deux tarifs ne peuvent pas décrire exactement la même situation la même
-- année. Les colonnes facultatives passent par coalesce() : sans cela,
-- PostgreSQL considère deux NULL comme différents et l'unicité ne tiendrait
-- pas sur les tarifs nationaux, justement ceux qui n'ont ni ville ni type.
create unique index if not exists idx_construction_rates_unicite on public.construction_rates (
  country_id,
  standing_id,
  coalesce(location_id, ''),
  coalesce(building_type_id, ''),
  coalesce(roof_type_id, ''),
  coalesce(level_category, ''),
  year
);

-- ─── 3. Sécurité ────────────────────────────────────────────────────────────
--
-- Lecture publique : ces listes ne sont pas des données personnelles, et
-- l'assistant doit pouvoir les charger dès la première étape.
--
-- Écriture : n'importe quel compte connecté peut modifier les tarifs, faute
-- d'un système de rôles dans l'application aujourd'hui. Ce n'est PAS une
-- protection « administrateur » — seulement un login. Tant qu'un vrai rôle
-- admin n'existe pas (une colonne `role` sur un profil, vérifiée ici), ne
-- considérez pas /admin/tarifs comme sécurisé contre un utilisateur normal.

alter table public.estimation_countries enable row level security;
alter table public.estimation_locations enable row level security;
alter table public.estimation_building_types enable row level security;
alter table public.estimation_standings enable row level security;
alter table public.estimation_roof_types enable row level security;
alter table public.construction_rates enable row level security;

drop policy if exists "Lecture publique des pays" on public.estimation_countries;
drop policy if exists "Lecture publique des localisations" on public.estimation_locations;
drop policy if exists "Lecture publique des types de bâtiment" on public.estimation_building_types;
drop policy if exists "Lecture publique des standings" on public.estimation_standings;
drop policy if exists "Lecture publique des toitures" on public.estimation_roof_types;
drop policy if exists "Lecture publique des tarifs" on public.construction_rates;
drop policy if exists "Écriture des tarifs par un compte connecté" on public.construction_rates;

create policy "Lecture publique des pays" on public.estimation_countries for select using (true);
create policy "Lecture publique des localisations" on public.estimation_locations for select using (true);
create policy "Lecture publique des types de bâtiment" on public.estimation_building_types for select using (true);
create policy "Lecture publique des standings" on public.estimation_standings for select using (true);
create policy "Lecture publique des toitures" on public.estimation_roof_types for select using (true);
create policy "Lecture publique des tarifs" on public.construction_rates for select using (true);

create policy "Écriture des tarifs par un compte connecté" on public.construction_rates
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ─── 4. Pays ────────────────────────────────────────────────────────────────
--
-- Les 54 pays d'Afrique, avec leur devise réelle (code ISO 4217). La devise
-- n'est jamais « FCFA » par défaut : XOF pour l'UEMOA, XAF pour la CEMAC, et
-- la monnaie nationale partout ailleurs.
--
-- Ajouter un pays hors d'Afrique demande une seule ligne ici, rien dans le code.

insert into public.estimation_countries (id, name, currency_code, "order") values
  ('afrique_du_sud', 'Afrique du Sud', 'ZAR', 1),
  ('algerie', 'Algérie', 'DZD', 2),
  ('angola', 'Angola', 'AOA', 3),
  ('benin', 'Bénin', 'XOF', 4),
  ('botswana', 'Botswana', 'BWP', 5),
  ('burkina_faso', 'Burkina Faso', 'XOF', 6),
  ('burundi', 'Burundi', 'BIF', 7),
  ('cameroun', 'Cameroun', 'XAF', 8),
  ('cap_vert', 'Cap-Vert', 'CVE', 9),
  ('centrafrique', 'République centrafricaine', 'XAF', 10),
  ('comores', 'Comores', 'KMF', 11),
  ('congo', 'Congo (Brazzaville)', 'XAF', 12),
  ('congo_rdc', 'Congo (RDC)', 'CDF', 13),
  ('cote_ivoire', 'Côte d''Ivoire', 'XOF', 14),
  ('djibouti', 'Djibouti', 'DJF', 15),
  ('egypte', 'Égypte', 'EGP', 16),
  ('erythree', 'Érythrée', 'ERN', 17),
  ('eswatini', 'Eswatini', 'SZL', 18),
  ('ethiopie', 'Éthiopie', 'ETB', 19),
  ('gabon', 'Gabon', 'XAF', 20),
  ('gambie', 'Gambie', 'GMD', 21),
  ('ghana', 'Ghana', 'GHS', 22),
  ('guinee', 'Guinée', 'GNF', 23),
  ('guinee_bissau', 'Guinée-Bissau', 'XOF', 24),
  ('guinee_equatoriale', 'Guinée équatoriale', 'XAF', 25),
  ('kenya', 'Kenya', 'KES', 26),
  ('lesotho', 'Lesotho', 'LSL', 27),
  ('liberia', 'Libéria', 'LRD', 28),
  ('libye', 'Libye', 'LYD', 29),
  ('madagascar', 'Madagascar', 'MGA', 30),
  ('malawi', 'Malawi', 'MWK', 31),
  ('mali', 'Mali', 'XOF', 32),
  ('maroc', 'Maroc', 'MAD', 33),
  ('maurice', 'Maurice', 'MUR', 34),
  ('mauritanie', 'Mauritanie', 'MRU', 35),
  ('mozambique', 'Mozambique', 'MZN', 36),
  ('namibie', 'Namibie', 'NAD', 37),
  ('niger', 'Niger', 'XOF', 38),
  ('nigeria', 'Nigéria', 'NGN', 39),
  ('ouganda', 'Ouganda', 'UGX', 40),
  ('rwanda', 'Rwanda', 'RWF', 41),
  ('sao_tome', 'São Tomé-et-Príncipe', 'STN', 42),
  ('senegal', 'Sénégal', 'XOF', 43),
  ('seychelles', 'Seychelles', 'SCR', 44),
  ('sierra_leone', 'Sierra Leone', 'SLE', 45),
  ('somalie', 'Somalie', 'SOS', 46),
  ('soudan', 'Soudan', 'SDG', 47),
  ('soudan_du_sud', 'Soudan du Sud', 'SSP', 48),
  ('tanzanie', 'Tanzanie', 'TZS', 49),
  ('tchad', 'Tchad', 'XAF', 50),
  ('togo', 'Togo', 'XOF', 51),
  ('tunisie', 'Tunisie', 'TND', 52),
  ('zambie', 'Zambie', 'ZMW', 53),
  ('zimbabwe', 'Zimbabwe', 'ZWG', 54)
on conflict (id) do update set
  name = excluded.name,
  currency_code = excluded.currency_code,
  "order" = excluded."order",
  active = excluded.active;

-- ─── 5. Localisations ───────────────────────────────────────────────────────
--
-- Chaque pays a ses principales villes ET une entrée « Autre localisation » :
-- aucun pays ne doit conduire à une liste vide, sinon l'assistant se bloque à
-- l'étape 2. Cette liste n'a pas vocation à être exhaustive — « Autre
-- localisation » couvre tout ce qui n'y figure pas encore.

insert into public.estimation_locations (id, country_id, name, type, "order") values
  ('za_johannesburg', 'afrique_du_sud', 'Johannesburg', 'ville', 1),
  ('za_le_cap', 'afrique_du_sud', 'Le Cap', 'ville', 2),
  ('za_durban', 'afrique_du_sud', 'Durban', 'ville', 3),
  ('za_pretoria', 'afrique_du_sud', 'Pretoria', 'ville', 4),
  ('za_autre', 'afrique_du_sud', 'Autre localisation', 'zone', 99),

  ('dz_alger', 'algerie', 'Alger', 'ville', 1),
  ('dz_oran', 'algerie', 'Oran', 'ville', 2),
  ('dz_constantine', 'algerie', 'Constantine', 'ville', 3),
  ('dz_annaba', 'algerie', 'Annaba', 'ville', 4),
  ('dz_autre', 'algerie', 'Autre localisation', 'zone', 99),

  ('ao_luanda', 'angola', 'Luanda', 'ville', 1),
  ('ao_huambo', 'angola', 'Huambo', 'ville', 2),
  ('ao_lobito', 'angola', 'Lobito', 'ville', 3),
  ('ao_benguela', 'angola', 'Benguela', 'ville', 4),
  ('ao_autre', 'angola', 'Autre localisation', 'zone', 99),

  ('bj_cotonou', 'benin', 'Cotonou', 'ville', 1),
  ('bj_porto_novo', 'benin', 'Porto-Novo', 'ville', 2),
  ('bj_parakou', 'benin', 'Parakou', 'ville', 3),
  ('bj_abomey_calavi', 'benin', 'Abomey-Calavi', 'ville', 4),
  ('bj_bohicon', 'benin', 'Bohicon', 'ville', 5),
  ('bj_autre', 'benin', 'Autre localisation', 'zone', 99),

  ('bw_gaborone', 'botswana', 'Gaborone', 'ville', 1),
  ('bw_francistown', 'botswana', 'Francistown', 'ville', 2),
  ('bw_maun', 'botswana', 'Maun', 'ville', 3),
  ('bw_autre', 'botswana', 'Autre localisation', 'zone', 99),

  ('bf_ouagadougou', 'burkina_faso', 'Ouagadougou', 'ville', 1),
  ('bf_bobo_dioulasso', 'burkina_faso', 'Bobo-Dioulasso', 'ville', 2),
  ('bf_koudougou', 'burkina_faso', 'Koudougou', 'ville', 3),
  ('bf_banfora', 'burkina_faso', 'Banfora', 'ville', 4),
  ('bf_autre', 'burkina_faso', 'Autre localisation', 'zone', 99),

  ('bi_gitega', 'burundi', 'Gitega', 'ville', 1),
  ('bi_bujumbura', 'burundi', 'Bujumbura', 'ville', 2),
  ('bi_ngozi', 'burundi', 'Ngozi', 'ville', 3),
  ('bi_autre', 'burundi', 'Autre localisation', 'zone', 99),

  ('cm_bafoussam', 'cameroun', 'Bafoussam', 'ville', 1),
  ('cm_douala', 'cameroun', 'Douala', 'ville', 2),
  ('cm_yaounde', 'cameroun', 'Yaoundé', 'ville', 3),
  ('cm_garoua', 'cameroun', 'Garoua', 'ville', 4),
  ('cm_bamenda', 'cameroun', 'Bamenda', 'ville', 5),
  ('cm_maroua', 'cameroun', 'Maroua', 'ville', 6),
  ('cm_ngaoundere', 'cameroun', 'Ngaoundéré', 'ville', 7),
  ('cm_bertoua', 'cameroun', 'Bertoua', 'ville', 8),
  ('cm_ebolowa', 'cameroun', 'Ebolowa', 'ville', 9),
  ('cm_buea', 'cameroun', 'Buéa', 'ville', 10),
  ('cm_limbe', 'cameroun', 'Limbé', 'ville', 11),
  ('cm_kribi', 'cameroun', 'Kribi', 'ville', 12),
  ('cm_edea', 'cameroun', 'Édéa', 'ville', 13),
  ('cm_dschang', 'cameroun', 'Dschang', 'ville', 14),
  ('cm_foumban', 'cameroun', 'Foumban', 'ville', 15),
  ('cm_kumba', 'cameroun', 'Kumba', 'ville', 16),
  ('cm_autre', 'cameroun', 'Autre localisation', 'zone', 99),

  ('cv_praia', 'cap_vert', 'Praia', 'ville', 1),
  ('cv_mindelo', 'cap_vert', 'Mindelo', 'ville', 2),
  ('cv_autre', 'cap_vert', 'Autre localisation', 'zone', 99),

  ('cf_bangui', 'centrafrique', 'Bangui', 'ville', 1),
  ('cf_berberati', 'centrafrique', 'Berbérati', 'ville', 2),
  ('cf_bambari', 'centrafrique', 'Bambari', 'ville', 3),
  ('cf_autre', 'centrafrique', 'Autre localisation', 'zone', 99),

  ('km_moroni', 'comores', 'Moroni', 'ville', 1),
  ('km_mutsamudu', 'comores', 'Mutsamudu', 'ville', 2),
  ('km_autre', 'comores', 'Autre localisation', 'zone', 99),

  ('cg_brazzaville', 'congo', 'Brazzaville', 'ville', 1),
  ('cg_pointe_noire', 'congo', 'Pointe-Noire', 'ville', 2),
  ('cg_dolisie', 'congo', 'Dolisie', 'ville', 3),
  ('cg_autre', 'congo', 'Autre localisation', 'zone', 99),

  ('cd_kinshasa', 'congo_rdc', 'Kinshasa', 'ville', 1),
  ('cd_lubumbashi', 'congo_rdc', 'Lubumbashi', 'ville', 2),
  ('cd_goma', 'congo_rdc', 'Goma', 'ville', 3),
  ('cd_mbuji_mayi', 'congo_rdc', 'Mbuji-Mayi', 'ville', 4),
  ('cd_kisangani', 'congo_rdc', 'Kisangani', 'ville', 5),
  ('cd_bukavu', 'congo_rdc', 'Bukavu', 'ville', 6),
  ('cd_autre', 'congo_rdc', 'Autre localisation', 'zone', 99),

  ('ci_abidjan', 'cote_ivoire', 'Abidjan', 'ville', 1),
  ('ci_yamoussoukro', 'cote_ivoire', 'Yamoussoukro', 'ville', 2),
  ('ci_bouake', 'cote_ivoire', 'Bouaké', 'ville', 3),
  ('ci_san_pedro', 'cote_ivoire', 'San-Pédro', 'ville', 4),
  ('ci_korhogo', 'cote_ivoire', 'Korhogo', 'ville', 5),
  ('ci_daloa', 'cote_ivoire', 'Daloa', 'ville', 6),
  ('ci_autre', 'cote_ivoire', 'Autre localisation', 'zone', 99),

  ('dj_djibouti', 'djibouti', 'Djibouti', 'ville', 1),
  ('dj_ali_sabieh', 'djibouti', 'Ali Sabieh', 'ville', 2),
  ('dj_autre', 'djibouti', 'Autre localisation', 'zone', 99),

  ('eg_le_caire', 'egypte', 'Le Caire', 'ville', 1),
  ('eg_alexandrie', 'egypte', 'Alexandrie', 'ville', 2),
  ('eg_gizeh', 'egypte', 'Gizeh', 'ville', 3),
  ('eg_port_said', 'egypte', 'Port-Saïd', 'ville', 4),
  ('eg_autre', 'egypte', 'Autre localisation', 'zone', 99),

  ('er_asmara', 'erythree', 'Asmara', 'ville', 1),
  ('er_massaoua', 'erythree', 'Massaoua', 'ville', 2),
  ('er_autre', 'erythree', 'Autre localisation', 'zone', 99),

  ('sz_mbabane', 'eswatini', 'Mbabane', 'ville', 1),
  ('sz_manzini', 'eswatini', 'Manzini', 'ville', 2),
  ('sz_autre', 'eswatini', 'Autre localisation', 'zone', 99),

  ('et_addis_abeba', 'ethiopie', 'Addis-Abeba', 'ville', 1),
  ('et_dire_dawa', 'ethiopie', 'Dire Dawa', 'ville', 2),
  ('et_mekele', 'ethiopie', 'Mekele', 'ville', 3),
  ('et_bahir_dar', 'ethiopie', 'Bahir Dar', 'ville', 4),
  ('et_autre', 'ethiopie', 'Autre localisation', 'zone', 99),

  ('ga_libreville', 'gabon', 'Libreville', 'ville', 1),
  ('ga_port_gentil', 'gabon', 'Port-Gentil', 'ville', 2),
  ('ga_franceville', 'gabon', 'Franceville', 'ville', 3),
  ('ga_oyem', 'gabon', 'Oyem', 'ville', 4),
  ('ga_autre', 'gabon', 'Autre localisation', 'zone', 99),

  ('gm_banjul', 'gambie', 'Banjul', 'ville', 1),
  ('gm_serekunda', 'gambie', 'Serekunda', 'ville', 2),
  ('gm_brikama', 'gambie', 'Brikama', 'ville', 3),
  ('gm_autre', 'gambie', 'Autre localisation', 'zone', 99),

  ('gh_accra', 'ghana', 'Accra', 'ville', 1),
  ('gh_kumasi', 'ghana', 'Kumasi', 'ville', 2),
  ('gh_tamale', 'ghana', 'Tamale', 'ville', 3),
  ('gh_takoradi', 'ghana', 'Takoradi', 'ville', 4),
  ('gh_autre', 'ghana', 'Autre localisation', 'zone', 99),

  ('gn_conakry', 'guinee', 'Conakry', 'ville', 1),
  ('gn_kankan', 'guinee', 'Kankan', 'ville', 2),
  ('gn_nzerekore', 'guinee', 'Nzérékoré', 'ville', 3),
  ('gn_kindia', 'guinee', 'Kindia', 'ville', 4),
  ('gn_autre', 'guinee', 'Autre localisation', 'zone', 99),

  ('gw_bissau', 'guinee_bissau', 'Bissau', 'ville', 1),
  ('gw_bafata', 'guinee_bissau', 'Bafatá', 'ville', 2),
  ('gw_autre', 'guinee_bissau', 'Autre localisation', 'zone', 99),

  ('gq_malabo', 'guinee_equatoriale', 'Malabo', 'ville', 1),
  ('gq_bata', 'guinee_equatoriale', 'Bata', 'ville', 2),
  ('gq_autre', 'guinee_equatoriale', 'Autre localisation', 'zone', 99),

  ('ke_nairobi', 'kenya', 'Nairobi', 'ville', 1),
  ('ke_mombasa', 'kenya', 'Mombasa', 'ville', 2),
  ('ke_kisumu', 'kenya', 'Kisumu', 'ville', 3),
  ('ke_nakuru', 'kenya', 'Nakuru', 'ville', 4),
  ('ke_autre', 'kenya', 'Autre localisation', 'zone', 99),

  ('ls_maseru', 'lesotho', 'Maseru', 'ville', 1),
  ('ls_teyateyaneng', 'lesotho', 'Teyateyaneng', 'ville', 2),
  ('ls_autre', 'lesotho', 'Autre localisation', 'zone', 99),

  ('lr_monrovia', 'liberia', 'Monrovia', 'ville', 1),
  ('lr_gbarnga', 'liberia', 'Gbarnga', 'ville', 2),
  ('lr_buchanan', 'liberia', 'Buchanan', 'ville', 3),
  ('lr_autre', 'liberia', 'Autre localisation', 'zone', 99),

  ('ly_tripoli', 'libye', 'Tripoli', 'ville', 1),
  ('ly_benghazi', 'libye', 'Benghazi', 'ville', 2),
  ('ly_misrata', 'libye', 'Misrata', 'ville', 3),
  ('ly_autre', 'libye', 'Autre localisation', 'zone', 99),

  ('mg_antananarivo', 'madagascar', 'Antananarivo', 'ville', 1),
  ('mg_toamasina', 'madagascar', 'Toamasina', 'ville', 2),
  ('mg_antsirabe', 'madagascar', 'Antsirabe', 'ville', 3),
  ('mg_mahajanga', 'madagascar', 'Mahajanga', 'ville', 4),
  ('mg_autre', 'madagascar', 'Autre localisation', 'zone', 99),

  ('mw_lilongwe', 'malawi', 'Lilongwe', 'ville', 1),
  ('mw_blantyre', 'malawi', 'Blantyre', 'ville', 2),
  ('mw_mzuzu', 'malawi', 'Mzuzu', 'ville', 3),
  ('mw_autre', 'malawi', 'Autre localisation', 'zone', 99),

  ('ml_bamako', 'mali', 'Bamako', 'ville', 1),
  ('ml_sikasso', 'mali', 'Sikasso', 'ville', 2),
  ('ml_segou', 'mali', 'Ségou', 'ville', 3),
  ('ml_mopti', 'mali', 'Mopti', 'ville', 4),
  ('ml_kayes', 'mali', 'Kayes', 'ville', 5),
  ('ml_autre', 'mali', 'Autre localisation', 'zone', 99),

  ('ma_casablanca', 'maroc', 'Casablanca', 'ville', 1),
  ('ma_rabat', 'maroc', 'Rabat', 'ville', 2),
  ('ma_marrakech', 'maroc', 'Marrakech', 'ville', 3),
  ('ma_fes', 'maroc', 'Fès', 'ville', 4),
  ('ma_tanger', 'maroc', 'Tanger', 'ville', 5),
  ('ma_agadir', 'maroc', 'Agadir', 'ville', 6),
  ('ma_autre', 'maroc', 'Autre localisation', 'zone', 99),

  ('mu_port_louis', 'maurice', 'Port-Louis', 'ville', 1),
  ('mu_curepipe', 'maurice', 'Curepipe', 'ville', 2),
  ('mu_quatre_bornes', 'maurice', 'Quatre Bornes', 'ville', 3),
  ('mu_autre', 'maurice', 'Autre localisation', 'zone', 99),

  ('mr_nouakchott', 'mauritanie', 'Nouakchott', 'ville', 1),
  ('mr_nouadhibou', 'mauritanie', 'Nouadhibou', 'ville', 2),
  ('mr_rosso', 'mauritanie', 'Rosso', 'ville', 3),
  ('mr_autre', 'mauritanie', 'Autre localisation', 'zone', 99),

  ('mz_maputo', 'mozambique', 'Maputo', 'ville', 1),
  ('mz_matola', 'mozambique', 'Matola', 'ville', 2),
  ('mz_beira', 'mozambique', 'Beira', 'ville', 3),
  ('mz_nampula', 'mozambique', 'Nampula', 'ville', 4),
  ('mz_autre', 'mozambique', 'Autre localisation', 'zone', 99),

  ('na_windhoek', 'namibie', 'Windhoek', 'ville', 1),
  ('na_walvis_bay', 'namibie', 'Walvis Bay', 'ville', 2),
  ('na_swakopmund', 'namibie', 'Swakopmund', 'ville', 3),
  ('na_autre', 'namibie', 'Autre localisation', 'zone', 99),

  ('ne_niamey', 'niger', 'Niamey', 'ville', 1),
  ('ne_zinder', 'niger', 'Zinder', 'ville', 2),
  ('ne_maradi', 'niger', 'Maradi', 'ville', 3),
  ('ne_agadez', 'niger', 'Agadez', 'ville', 4),
  ('ne_autre', 'niger', 'Autre localisation', 'zone', 99),

  ('ng_lagos', 'nigeria', 'Lagos', 'ville', 1),
  ('ng_abuja', 'nigeria', 'Abuja', 'ville', 2),
  ('ng_kano', 'nigeria', 'Kano', 'ville', 3),
  ('ng_port_harcourt', 'nigeria', 'Port Harcourt', 'ville', 4),
  ('ng_ibadan', 'nigeria', 'Ibadan', 'ville', 5),
  ('ng_benin_city', 'nigeria', 'Benin City', 'ville', 6),
  ('ng_autre', 'nigeria', 'Autre localisation', 'zone', 99),

  ('ug_kampala', 'ouganda', 'Kampala', 'ville', 1),
  ('ug_gulu', 'ouganda', 'Gulu', 'ville', 2),
  ('ug_mbarara', 'ouganda', 'Mbarara', 'ville', 3),
  ('ug_jinja', 'ouganda', 'Jinja', 'ville', 4),
  ('ug_autre', 'ouganda', 'Autre localisation', 'zone', 99),

  ('rw_kigali', 'rwanda', 'Kigali', 'ville', 1),
  ('rw_huye', 'rwanda', 'Huye (Butare)', 'ville', 2),
  ('rw_rubavu', 'rwanda', 'Rubavu (Gisenyi)', 'ville', 3),
  ('rw_musanze', 'rwanda', 'Musanze', 'ville', 4),
  ('rw_autre', 'rwanda', 'Autre localisation', 'zone', 99),

  ('st_sao_tome', 'sao_tome', 'São Tomé', 'ville', 1),
  ('st_autre', 'sao_tome', 'Autre localisation', 'zone', 99),

  ('sn_dakar', 'senegal', 'Dakar', 'ville', 1),
  ('sn_thies', 'senegal', 'Thiès', 'ville', 2),
  ('sn_touba', 'senegal', 'Touba', 'ville', 3),
  ('sn_saint_louis', 'senegal', 'Saint-Louis', 'ville', 4),
  ('sn_ziguinchor', 'senegal', 'Ziguinchor', 'ville', 5),
  ('sn_kaolack', 'senegal', 'Kaolack', 'ville', 6),
  ('sn_mbour', 'senegal', 'Mbour', 'ville', 7),
  ('sn_autre', 'senegal', 'Autre localisation', 'zone', 99),

  ('sc_victoria', 'seychelles', 'Victoria', 'ville', 1),
  ('sc_autre', 'seychelles', 'Autre localisation', 'zone', 99),

  ('sl_freetown', 'sierra_leone', 'Freetown', 'ville', 1),
  ('sl_bo', 'sierra_leone', 'Bo', 'ville', 2),
  ('sl_kenema', 'sierra_leone', 'Kenema', 'ville', 3),
  ('sl_autre', 'sierra_leone', 'Autre localisation', 'zone', 99),

  ('so_mogadiscio', 'somalie', 'Mogadiscio', 'ville', 1),
  ('so_hargeisa', 'somalie', 'Hargeisa', 'ville', 2),
  ('so_bosaso', 'somalie', 'Bosaso', 'ville', 3),
  ('so_autre', 'somalie', 'Autre localisation', 'zone', 99),

  ('sd_khartoum', 'soudan', 'Khartoum', 'ville', 1),
  ('sd_omdurman', 'soudan', 'Omdurman', 'ville', 2),
  ('sd_port_soudan', 'soudan', 'Port-Soudan', 'ville', 3),
  ('sd_autre', 'soudan', 'Autre localisation', 'zone', 99),

  ('ss_djouba', 'soudan_du_sud', 'Djouba', 'ville', 1),
  ('ss_wau', 'soudan_du_sud', 'Wau', 'ville', 2),
  ('ss_autre', 'soudan_du_sud', 'Autre localisation', 'zone', 99),

  ('tz_dar_es_salam', 'tanzanie', 'Dar es Salam', 'ville', 1),
  ('tz_dodoma', 'tanzanie', 'Dodoma', 'ville', 2),
  ('tz_mwanza', 'tanzanie', 'Mwanza', 'ville', 3),
  ('tz_arusha', 'tanzanie', 'Arusha', 'ville', 4),
  ('tz_zanzibar', 'tanzanie', 'Zanzibar', 'ville', 5),
  ('tz_autre', 'tanzanie', 'Autre localisation', 'zone', 99),

  ('td_ndjamena', 'tchad', 'N''Djaména', 'ville', 1),
  ('td_moundou', 'tchad', 'Moundou', 'ville', 2),
  ('td_sarh', 'tchad', 'Sarh', 'ville', 3),
  ('td_abeche', 'tchad', 'Abéché', 'ville', 4),
  ('td_autre', 'tchad', 'Autre localisation', 'zone', 99),

  ('tg_lome', 'togo', 'Lomé', 'ville', 1),
  ('tg_sokode', 'togo', 'Sokodé', 'ville', 2),
  ('tg_kara', 'togo', 'Kara', 'ville', 3),
  ('tg_kpalime', 'togo', 'Kpalimé', 'ville', 4),
  ('tg_atakpame', 'togo', 'Atakpamé', 'ville', 5),
  ('tg_autre', 'togo', 'Autre localisation', 'zone', 99),

  ('tn_tunis', 'tunisie', 'Tunis', 'ville', 1),
  ('tn_sfax', 'tunisie', 'Sfax', 'ville', 2),
  ('tn_sousse', 'tunisie', 'Sousse', 'ville', 3),
  ('tn_kairouan', 'tunisie', 'Kairouan', 'ville', 4),
  ('tn_autre', 'tunisie', 'Autre localisation', 'zone', 99),

  ('zm_lusaka', 'zambie', 'Lusaka', 'ville', 1),
  ('zm_kitwe', 'zambie', 'Kitwe', 'ville', 2),
  ('zm_ndola', 'zambie', 'Ndola', 'ville', 3),
  ('zm_autre', 'zambie', 'Autre localisation', 'zone', 99),

  ('zw_harare', 'zimbabwe', 'Harare', 'ville', 1),
  ('zw_bulawayo', 'zimbabwe', 'Bulawayo', 'ville', 2),
  ('zw_mutare', 'zimbabwe', 'Mutare', 'ville', 3),
  ('zw_autre', 'zimbabwe', 'Autre localisation', 'zone', 99)
on conflict (id) do update set
  country_id = excluded.country_id,
  name = excluded.name,
  type = excluded.type,
  "order" = excluded."order",
  active = excluded.active;

-- ─── 6. Types de construction, standings, toitures ──────────────────────────

insert into public.estimation_building_types (id, name, "order") values
  ('maison_individuelle', 'Maison individuelle', 1),
  ('villa', 'Villa', 2),
  ('immeuble_residentiel', 'Immeuble résidentiel / locatif', 3),
  ('bureau', 'Bureau', 4),
  ('commerce', 'Commerce', 5),
  ('ecole', 'École', 6),
  ('hotel', 'Hôtel', 7),
  ('autre', 'Autre', 99)
on conflict (id) do update set name = excluded.name, "order" = excluded."order", active = excluded.active;

-- Quatre niveaux : Économique, Moyen standing, Haut standing, Luxe.
-- « Standard » est désactivé (et non supprimé) : sa fourchette faisait doublon
-- avec « Moyen standing ». Le réactiver ne demande qu'un clic dans
-- /admin/tarifs, et ses anciens tarifs sont conservés en base.
insert into public.estimation_standings (id, name, "order", active) values
  ('economique', 'Économique', 1, true),
  ('moyen_standing', 'Moyen standing', 2, true),
  ('haut_standing', 'Haut standing', 3, true),
  ('tres_haut_standing', 'Luxe', 4, true),
  ('standard', 'Standard', 99, false)
on conflict (id) do update set name = excluded.name, "order" = excluded."order", active = excluded.active;

insert into public.estimation_roof_types (id, name, "order") values
  ('terrasse', 'Toiture-terrasse', 1),
  ('deux_pans', 'Toiture à 2 pans', 2),
  ('quatre_pans', 'Toiture à 4 pans', 3),
  ('complexe', 'Toiture complexe', 4),
  ('autre', 'Autre', 99)
on conflict (id) do update set name = excluded.name, "order" = excluded."order", active = excluded.active;

-- ─── 7. Prix indicatifs au m² — zone franc CFA ──────────────────────────────
--
-- Fourchettes de PLANIFICATION fournies par le fondateur, pas des tarifs
-- officiels. Elles décrivent une construction CLÉ EN MAIN (scope 'complete') :
-- le prix au m² couvre l'ensemble du chantier, fondation et toiture comprises.
-- Ne jamais mélanger ces valeurs avec des prix de gros œuvre seul — un tarif
-- de gros œuvre doit être saisi avec un `scope` différent.
--
--   Économique      150 000 – 200 000 FCFA/m²
--   Moyen standing  200 000 – 300 000 FCFA/m²
--   Haut standing   300 000 – 450 000 FCFA/m²
--   Luxe            450 000 – 700 000 FCFA/m²
--
-- `price_reference` est le milieu de la fourchette : l'assistant affiche un
-- budget minimum, un budget estimatif et un budget maximum, et le budget
-- estimatif correspond au centre de la fourchette annoncée.
--
-- POURQUOI LA ZONE FRANC ET PAS TOUTE L'AFRIQUE
--
-- Ces prix sont en francs CFA. Le XOF (UEMOA) et le XAF (CEMAC) ont la même
-- parité fixe avec l'euro (1 EUR = 655,957) : 300 000 XAF et 300 000 XOF sont
-- exactement la même somme. Les reporter d'un pays de la zone à l'autre est
-- une équivalence exacte, pas une approximation.
--
-- Ailleurs, écrire ces montants ne convertirait rien : au Nigeria, 300 000
-- nairas le m² n'a aucun rapport avec 300 000 FCFA le m². Tant qu'un prix
-- local n'a pas été saisi depuis /admin/tarifs, l'assistant annonce qu'il n'a
-- pas de référence et renvoie l'utilisateur vers le métré détaillé.
--
-- La sélection se fait sur la devise du pays, pas sur une liste de noms : un
-- pays de la zone franc ajouté plus tard héritera automatiquement de la
-- grille, et un tarif ne peut structurellement pas porter une devise
-- différente de celle de son pays.

insert into public.construction_rates
  (country_id, standing_id, price_min, price_reference, price_max, currency_code, year, source, confidence)
select
  pays.id,
  grille.standing_id,
  grille.price_min,
  grille.price_reference,
  grille.price_max,
  pays.currency_code,
  2026,
  'Valeurs de planification initiales Devis Facile — zone franc CFA',
  'estimation'
from public.estimation_countries as pays
cross join (values
  ('economique',         150000, 175000, 200000),
  ('moyen_standing',     200000, 250000, 300000),
  ('haut_standing',      300000, 375000, 450000),
  ('tres_haut_standing', 450000, 550000, 700000)
) as grille (standing_id, price_min, price_reference, price_max)
where pays.currency_code in ('XAF', 'XOF')
on conflict do nothing;

-- ─── 8. Mise à jour des prix déjà enregistrés ───────────────────────────────
--
-- L'insertion ci-dessus ne touche pas aux lignes déjà présentes (`on conflict
-- do nothing`). Ces mises à jour alignent une base déjà remplie sur la grille
-- courante. Elles ne visent que les lignes issues du script : un tarif saisi
-- ou corrigé depuis /admin/tarifs porte une autre source et n'est pas touché.

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

-- « Standard » est retiré de la grille : ses tarifs sont désactivés, pas
-- supprimés, pour qu'un retour en arrière reste possible.
update public.construction_rates
   set active = false, updated_at = now()
 where standing_id = 'standard'
   and source like 'Valeurs de planification initiales%';

-- ─── 9. Contrôle ────────────────────────────────────────────────────────────
--
-- Affiche ce qui est réellement en base à la fin de l'exécution. Attendu :
-- 54 pays, 257 localisations, 4 standings actifs, 56 tarifs actifs sur 14 pays.
-- Des chiffres plus faibles signifient qu'une version plus ancienne du script
-- a été exécutée.

select
  (select count(*) from public.estimation_countries) as pays,
  (select count(*) from public.estimation_locations) as localisations,
  (select count(*) from public.estimation_standings where active) as standings_actifs,
  (select count(*) from public.construction_rates where active) as tarifs_actifs,
  (select count(distinct country_id) from public.construction_rates where active) as pays_chiffrables;
