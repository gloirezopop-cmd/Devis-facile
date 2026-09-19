-- Mise à jour des offres d'abonnement selon les nouveaux tarifs et descriptions.
--
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.

-- 1. Offre : Un seul devis (3500 FCFA)
UPDATE public.subscription_plans
SET 
    name = 'Un seul devis',
    price = 3500,
    tagline = 'Idéal pour chiffrer un projet unique.',
    features = ARRAY[
        'Accès complet pour un seul devis',
        'Export PDF et Excel',
        'Sans engagement'
    ]
WHERE id = 'calcul';

-- 2. Offre : Un mois pour tout le logiciel (5500 FCFA)
UPDATE public.subscription_plans
SET 
    name = 'Mensuel',
    price = 5500,
    tagline = 'Accès illimité à toutes les fonctionnalités pendant un mois.',
    features = ARRAY[
        'Projets et devis illimités',
        'Accès à l''éditeur avancé',
        'Bibliothèque de prix',
        'Support technique'
    ]
WHERE id = 'devis_complet';

-- 3. Offre : Un an (50000 FCFA)
UPDATE public.subscription_plans
SET 
    name = 'Annuel',
    price = 50000,
    tagline = 'La meilleure valeur pour les professionnels du bâtiment.',
    features = ARRAY[
        'Tout de l''offre Mensuelle, plus :',
        'Économie sur l''année',
        'Accès prioritaire aux nouvelles fonctionnalités',
        'Support prioritaire'
    ]
WHERE id = 'pro_annuel';

-- ─── Contrôle ───────────────────────────────────────────────────────────────
SELECT id, name, price FROM public.subscription_plans ORDER BY display_order;
