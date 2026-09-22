// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { clientAdmin, activerAcces } from '../_shared/chariow.ts';

function reponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
  if (req.method !== 'POST') return reponse(405, { error: 'Méthode non autorisée' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return reponse(401, { error: 'Authentification requise' });

  let corps: { intent_id?: unknown };
  try {
    corps = await req.json();
  } catch {
    return reponse(400, { error: 'Corps de requête invalide' });
  }

  const intentId = typeof corps.intent_id === 'string' ? corps.intent_id : null;
  if (!intentId) return reponse(400, { error: 'intent_id manquant' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return reponse(500, { error: 'Configuration serveur incomplète' });

  const clientAppelant = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: erreurUser } = await clientAppelant.auth.getUser();
  if (erreurUser || !user) return reponse(401, { error: 'Authentification requise' });

  const admin = clientAdmin();

  const { data: intent, error: erreurIntent } = await admin
    .from('payment_intents')
    .select('id, sale_id, plan_id, status, montant_attendu, devise_attendue')
    .eq('id', intentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (erreurIntent || !intent) return reponse(404, { error: 'Intention introuvable' });
  
  if (intent.status === 'active') {
    return reponse(200, { success: true, message: 'Déjà activé' });
  }

  if (!intent.sale_id) {
    return reponse(400, { error: 'Aucun ID de vente associé à cette intention' });
  }

  const { data: plan } = await admin
    .from('subscription_plans')
    .select('*')
    .eq('id', intent.plan_id)
    .maybeSingle();

  if (!plan) return reponse(500, { error: 'Formule introuvable' });

  // Appel de l'API de Chariow (ou Lemon Squeezy) pour récupérer la vente
  const chariowKey = Deno.env.get('CHARIOW_API_KEY');
  const chariowBase = Deno.env.get('CHARIOW_API_BASE') || 'https://api.chariow.com/v1';

  if (!chariowKey) return reponse(500, { error: 'Vérification indisponible.' });

  try {
    const reponseChariow = await fetch(`${chariowBase}/sales/${intent.sale_id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${chariowKey}`,
        'Accept': 'application/json',
      },
    });

    if (!reponseChariow.ok) {
      return reponse(502, { error: `Impossible de joindre le prestataire de paiement (HTTP ${reponseChariow.status})` });
    }

    const payload = await reponseChariow.json();
    const sale = payload.sale ?? payload.data?.attributes ?? payload.data ?? payload;
    
    if (!sale) return reponse(502, { error: 'Payload de vente invalide' });

    const status = String(sale.status ?? sale.state ?? 'unknown').toLowerCase();
    
    if (['completed', 'paid', 'active'].includes(status)) {
        const rawAmount = sale.amount?.value ?? sale.amount ?? sale.total;
        const montant = typeof rawAmount === 'number' && rawAmount > plan.price * 10 ? rawAmount / 100 : Number(rawAmount); 
        const devise = sale.amount?.currency ?? sale.currency ?? 'XAF'; 
        
        if (montant >= Number(plan.price) && devise === plan.currency) {
            const licenseKey = payload.license_key?.key ?? sale.license_key?.key ?? payload.data?.attributes?.license_key ?? null;
            await activerAcces(admin, { 
                userId: user.id, 
                plan, 
                saleId: intent.sale_id, 
                intentId: intent.id, 
                montant, 
                devise, 
                licenseKey 
            });
            return reponse(200, { success: true, message: 'Paiement vérifié et accès débloqué.' });
        } else {
            return reponse(400, { error: 'Montant ou devise incohérent avec la formule.' });
        }
    } else {
        return reponse(400, { error: `Le statut de la vente est : ${status}. Attente de confirmation finale.` });
    }
  } catch (error) {
    return reponse(500, { error: `Erreur interne lors de la vérification : ${error}` });
  }
});
