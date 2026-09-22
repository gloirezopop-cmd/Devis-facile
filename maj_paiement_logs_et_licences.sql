-- MISE À JOUR : GESTION DES LOGS DE TRANSACTION ET CLÉ DE LICENCE
-- À exécuter dans Supabase : SQL Editor > New query > tout coller > Run.

-- 1. Ajout de la clé de licence dans la table `payments`
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS license_key TEXT;

-- 2. Création de la table de logs de transaction
CREATE TABLE IF NOT EXISTS public.transaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id TEXT,
    intent_id UUID REFERENCES public.payment_intents(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount_expected NUMERIC,
    amount_received NUMERIC,
    currency TEXT,
    status_initial TEXT,
    status_final TEXT,
    error_message TEXT,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Sécurité (RLS) sur les logs de transaction
ALTER TABLE public.transaction_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les administrateurs peuvent lire les logs de transaction
DROP POLICY IF EXISTS "Les logs sont réservés à l'administration" ON public.transaction_logs;
CREATE POLICY "Les logs sont réservés à l'administration" ON public.transaction_logs
    FOR ALL USING (public.est_admin()) WITH CHECK (public.est_admin());
