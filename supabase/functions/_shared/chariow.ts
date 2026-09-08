/**
 * Ce qui est commun aux deux fonctions Chariow (checkout et webhook) :
 * signature HMAC, comparaison en temps constant, et l'activation d'un accès.
 *
 * Rien ici ne connaît un prix ou une durée en dur — tout vient de la ligne
 * `subscription_plans` lue en base, comme dans `src/utils/offres.js` côté
 * application. Voir CHARIOW_INTEGRATION_SPEC.md pour le détail des règles.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** HMAC-SHA256 en hexadécimal, calculé sur les octets EXACTS du texte donné. */
export async function hmacHexSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cle = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cle, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Comparaison en temps constant. La longueur est vérifiée d'abord (comme dans
 * le contrat Chariow) : comparer des tableaux de longueurs différentes n'a de
 * toute façon aucun sens et lèverait une erreur plus loin.
 */
export function egaliteEnTempsConstant(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aOctets = enc.encode(a);
  const bOctets = enc.encode(b);
  if (aOctets.length !== bOctets.length) return false;
  let diff = 0;
  for (let i = 0; i < aOctets.length; i += 1) diff |= aOctets[i] ^ bOctets[i];
  return diff === 0;
}

/** Client Supabase avec la clé de service : contourne RLS, réservé au serveur. */
export function clientAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const cle = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !cle) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant');
  return createClient(url, cle);
}

/**
 * Accorde ou prolonge l'accès d'un utilisateur à une formule.
 *
 * Cumule l'échéance existante plutôt que de repartir de maintenant (§7.4) :
 * un renouvellement anticipé ne doit pas faire perdre les jours restants.
 * L'abonnement créé n'est jamais rattaché à un projet (`project_id: null`) —
 * un paiement Chariow vaut pour le compte entier, jamais pour un seul projet.
 *
 * Idempotent sur `sale_id` : si la vente a déjà été traitée (relecture
 * manuelle avec une nouvelle delivery-id, ou double appel), ne prolonge pas
 * une deuxième fois.
 */
export async function activerAcces(
  admin: ReturnType<typeof clientAdmin>,
  params: {
    userId: string;
    plan: { id: string; price: number; currency: string; billing_type: string; duration_days: number | null };
    saleId?: string | null;
    intentId?: string | null;
    montant?: number | null;
    devise?: string | null;
  },
) {
  const { userId, plan, saleId, intentId, montant, devise } = params;

  if (saleId) {
    const { data: dejaTraite } = await admin
      .from('payments')
      .select('id')
      .eq('sale_id', saleId)
      .maybeSingle();
    if (dejaTraite) return { deja_traite: true };
  }

  const maintenant = new Date();
  const { data: enCours } = await admin
    .from('subscriptions')
    .select('id, end_date')
    .eq('user_id', userId)
    .eq('plan_id', plan.id)
    .eq('status', 'ACTIVE')
    .is('project_id', null)
    .order('end_date', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const base = enCours?.end_date && new Date(enCours.end_date) > maintenant
    ? new Date(enCours.end_date)
    : maintenant;
  const dureeJours = Number(plan.duration_days) || 0;
  const echeance = dureeJours > 0
    ? new Date(base.getTime() + dureeJours * 24 * 3600 * 1000).toISOString()
    : null; // sans durée : actif tant que ACTIVE (cf. abonnementEstActif côté app)

  if (enCours) {
    await admin.from('subscriptions').update({ end_date: echeance }).eq('id', enCours.id);
  } else {
    await admin.from('subscriptions').insert({
      user_id: userId, plan_id: plan.id, project_id: null, status: 'ACTIVE', end_date: echeance,
    });
  }

  // Une seule ligne par vente : la contrainte unique sur `sale_id` (voir
  // maj_paiement_chariow.sql) transforme une éventuelle course entre deux
  // livraisons concurrentes en simple doublon ignoré, pas en double crédit.
  const { error: erreurPaiement } = await admin.from('payments').insert({
    user_id: userId,
    plan_id: plan.id,
    amount: montant ?? plan.price,
    currency: devise ?? plan.currency,
    status: 'SUCCESS',
    sale_id: saleId ?? null,
    intent_id: intentId ?? null,
  });
  if (erreurPaiement && erreurPaiement.code !== '23505') throw erreurPaiement;

  if (intentId) {
    await admin.from('payment_intents')
      .update({ status: 'active', sale_id: saleId ?? null, updated_at: new Date().toISOString() })
      .eq('id', intentId);
  }

  return { deja_traite: false };
}
