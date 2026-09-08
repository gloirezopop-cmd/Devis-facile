/**
 * POST /functions/v1/chariow-checkout
 * Body attendu : { plan: "calcul" | "devis_complet" | "pro_annuel" }
 *
 * Remplace le lien de paiement statique de l'ancien ModalePaiementMock.jsx :
 * ici, l'utilisateur est connu (sa session), l'intention est tracée avant même
 * de contacter Chariow, et le pont avec le webhook se fait par
 * `custom_metadata` — jamais par un lien qui ne dit rien de qui paie.
 * Voir §5 de CHARIOW_INTEGRATION_SPEC.md.
 */
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

  // ── 1. Qui demande ? Jamais depuis le corps de la requête. ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return reponse(401, { error: 'Authentification requise' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return reponse(500, { error: 'Configuration serveur incomplète' });

  const clientAppelant = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: erreurUser } = await clientAppelant.auth.getUser();
  if (erreurUser || !user) return reponse(401, { error: 'Authentification requise' });

  // ── 2. Quelle formule ? ──
  let corps: { plan?: unknown };
  try {
    corps = await req.json();
  } catch {
    return reponse(400, { error: 'Corps de requête invalide' });
  }
  const planId = typeof corps.plan === 'string' ? corps.plan : null;
  if (!planId) return reponse(400, { error: 'Plan manquant' });

  const admin = clientAdmin();

  const { data: plan, error: erreurPlan } = await admin
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .eq('active', true)
    .maybeSingle();
  if (erreurPlan || !plan) return reponse(400, { error: 'Formule inconnue' });
  if (!plan.chariow_product_id) {
    return reponse(409, { error: "Cette formule n'est pas encore configurée pour le paiement en ligne." });
  }

  // ── 3. L'intention, tracée avant même de contacter Chariow. ──
  const { data: intent, error: erreurIntent } = await admin
    .from('payment_intents')
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      montant_attendu: plan.price,
      devise_attendue: plan.currency,
      status: 'pending',
    })
    .select('id')
    .single();
  if (erreurIntent || !intent) return reponse(500, { error: 'Impossible de démarrer le paiement, réessayez.' });

  // ── 4. Chariow. ──
  const chariowKey = Deno.env.get('CHARIOW_API_KEY');
  const chariowBase = Deno.env.get('CHARIOW_API_BASE') || 'https://api.chariow.com/v1';
  const appUrl = Deno.env.get('APP_URL') || '';
  if (!chariowKey) return reponse(500, { error: 'Paiement indisponible pour le moment.' });

  let reponseChariow: Response;
  try {
    reponseChariow = await fetch(`${chariowBase}/checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chariowKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: plan.chariow_product_id,
        email: user.email,
        payment_currency: plan.currency,
        redirect_url: `${appUrl}/paiement/succes?intent=${intent.id}`,
        // Le pont avec le webhook : ces trois valeurs reviennent telles
        // quelles dans `sale.custom_metadata` de la notification Chariow.
        custom_metadata: {
          user_id: String(user.id),
          plan: plan.id,
          intent_id: String(intent.id),
        },
      }),
    });
  } catch {
    await admin.from('payment_intents').update({ status: 'error' }).eq('id', intent.id);
    return reponse(502, { error: 'Paiement indisponible, réessayez.' });
  }

  const corpsChariow = await reponseChariow.json().catch(() => null);
  if (!reponseChariow.ok || !corpsChariow) {
    await admin.from('payment_intents').update({ status: 'error' }).eq('id', intent.id);
    return reponse(502, { error: 'Paiement indisponible, réessayez.' });
  }

  const etape = corpsChariow?.data?.step;

  if (etape === 'payment') {
    await admin.from('payment_intents')
      .update({ sale_id: corpsChariow.data.purchase?.id ?? null })
      .eq('id', intent.id);
    return reponse(200, { checkout_url: corpsChariow.data.payment?.checkout_url });
  }

  if (etape === 'completed') {
    // Un produit à 0 FCFA n'existe pas dans la grille actuelle, mais Chariow
    // peut renvoyer cette étape (code promo à 100 %, par exemple) : le
    // traitement est le même que celui du webhook, pour ne pas dupliquer la
    // logique d'activation.
    await activerAcces(admin, {
      userId: user.id,
      plan,
      saleId: corpsChariow.data.purchase?.id ?? null,
      intentId: intent.id,
    });
    return reponse(200, { redirect: '/dashboard' });
  }

  if (etape === 'already_purchased') {
    return reponse(409, { error: 'Offre déjà acquise' });
  }

  await admin.from('payment_intents').update({ status: 'error' }).eq('id', intent.id);
  return reponse(502, { error: 'Réponse de paiement inattendue.' });
});
