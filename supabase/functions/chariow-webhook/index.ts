/**
 * POST /functions/v1/chariow-webhook
 *
 * Reçoit les notifications Chariow (Pulse). Voir §6 et §7 de
 * CHARIOW_INTEGRATION_SPEC.md — en particulier les erreurs à ne pas commettre
 * listées là-bas ; ce fichier existe pour ne pas avoir à les redécouvrir.
 *
 * Point d'attention pour la suite : Chariow tolère jusqu'à 30 s par tentative.
 * Le traitement ci-dessous ne fait que quelques écritures Postgres, sans
 * aucun appel réseau sortant — largement sous cette limite — et est donc fait
 * avant la réponse plutôt que via une vraie file d'attente asynchrone. Si un
 * traitement plus lourd s'ajoute un jour à `traiterVente`, revoir ce choix.
 */
import { hmacHexSha256, egaliteEnTempsConstant, clientAdmin, activerAcces } from '../_shared/chariow.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // ── 1. Le corps BRUT, avant toute tentative de le parser. ──
  const corpsBrut = await req.text();

  const secret = Deno.env.get('CHARIOW_PULSE_SECRET');
  if (!secret) return new Response('Webhook non configuré', { status: 500 });

  const signatureRecue = req.headers.get('x-chariow-signature') ?? '';
  const signatureAttendue = `sha256=${await hmacHexSha256(secret, corpsBrut)}`;
  if (!egaliteEnTempsConstant(signatureRecue, signatureAttendue)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const deliveryId = req.headers.get('x-pulse-delivery-id');
  const evenement = req.headers.get('x-pulse-event') ?? 'unknown';

  // Événement de test envoyé depuis le tableau de bord Chariow : signé comme
  // un vrai, mais sans delivery-id. On le confirme sans rien enregistrer.
  if (!deliveryId) return new Response('OK (test)', { status: 200 });

  const admin = clientAdmin();

  const { data: dejaRecu } = await admin
    .from('webhook_deliveries')
    .select('delivery_id')
    .eq('delivery_id', deliveryId)
    .maybeSingle();
  if (dejaRecu) return new Response('OK (duplicate)', { status: 200 });

  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(corpsBrut);
  } catch {
    payload = null;
  }

  await admin.from('webhook_deliveries').insert({
    delivery_id: deliveryId,
    event: evenement,
    payload: payload ?? {},
  });

  try {
    if (payload && evenement === 'successful.sale') {
      await traiterVente(admin, payload);
    } else if (payload && evenement === 'license.revoked') {
      await traiterRevocation(admin, payload);
    }
    // `license.expired`, `failed.sale`, `abandoned.sale` : rien à écrire ici.
    // L'échéance vit déjà dans `subscriptions.end_date`, et `abonnementEstActif`
    // (src/utils/offres.js) la vérifie directement — un abonnement échu se
    // ferme tout seul sans qu'aucun webhook n'ait besoin de le confirmer.
    await admin.from('webhook_deliveries')
      .update({ processed_at: new Date().toISOString() })
      .eq('delivery_id', deliveryId);
  } catch (err) {
    // La réponse est déjà 200 : Chariow a livré l'événement avec succès, la
    // vérification a simplement refusé d'accorder l'accès. Un paiement
    // encaissé sans accès accordé doit apparaître ici, pas provoquer un
    // nouvel essai en boucle qui échouerait de la même façon.
    await admin.from('webhook_deliveries')
      .update({ error: String((err as Error)?.message ?? err) })
      .eq('delivery_id', deliveryId);
  }

  return new Response('OK', { status: 200 });
});

/** Toutes les vérifications de §7.2 avant d'accorder quoi que ce soit. */
async function traiterVente(admin: ReturnType<typeof clientAdmin>, payload: Record<string, any>) {
  const sale = payload.sale ?? payload.data?.sale;
  const product = payload.product ?? payload.data?.product;
  if (!sale) throw new Error('payload sans `sale`');

  const meta = sale.custom_metadata ?? {};
  const userId = meta.user_id;
  const planId = meta.plan;
  const intentId = meta.intent_id ?? null;
  if (!userId || !planId) throw new Error('custom_metadata absent ou incomplet — traitement manuel requis');

  if (sale.status !== 'completed') throw new Error(`statut de vente non complété : ${sale.status}`);

  const { data: plan } = await admin
    .from('subscription_plans')
    .select('id, price, currency, billing_type, duration_days, chariow_product_id')
    .eq('id', planId)
    .maybeSingle();
  if (!plan) throw new Error(`formule inconnue : ${planId}`);

  if (product?.id && plan.chariow_product_id && product.id !== plan.chariow_product_id) {
    throw new Error(`produit Chariow incohérent avec la formule annoncée (${product.id} != ${plan.chariow_product_id})`);
  }

  const montant = Number(sale.amount?.value ?? sale.amount);
  const devise = sale.amount?.currency ?? sale.currency;
  if (!(montant >= Number(plan.price))) throw new Error(`montant insuffisant : ${montant} < ${plan.price}`);
  if (devise !== plan.currency) throw new Error(`devise inattendue : ${devise} != ${plan.currency}`);

  await activerAcces(admin, { userId, plan, saleId: sale.id, intentId, montant, devise });
}

/** Remboursement / révocation : coupe l'accès accordé par cette vente. */
async function traiterRevocation(admin: ReturnType<typeof clientAdmin>, payload: Record<string, any>) {
  const sale = payload.sale ?? payload.data?.sale;
  const saleId = sale?.id;
  if (!saleId) return;

  const { data: paiement } = await admin
    .from('payments')
    .select('user_id, plan_id')
    .eq('sale_id', saleId)
    .maybeSingle();
  if (!paiement) return; // rien à révoquer : cette vente n'a jamais été activée ici

  await admin.from('subscriptions')
    .update({ status: 'REVOKED' })
    .eq('user_id', paiement.user_id)
    .eq('plan_id', paiement.plan_id)
    .eq('status', 'ACTIVE');
}
