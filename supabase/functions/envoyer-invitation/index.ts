/**
 * POST /functions/v1/envoyer-invitation
 * Body attendu : { email: string, part: number }
 *
 * Envoie à un futur investisseur le message qui l'invite à créer son compte.
 * L'invitation elle-même est déjà enregistrée en base par
 * `inviter_investisseur()` : cette fonction ne fait qu'expédier le courrier.
 * Si elle échoue, l'invitation reste valable et l'écran propose de copier le
 * message — on ne perd rien.
 *
 * ── Qui a le droit ──
 * Cette fonction ne décide pas elle-même que l'appelant est le fondateur : elle
 * pose la question à la base, avec le jeton de l'appelant. La règle « seul le
 * fondateur » n'existe qu'à un seul endroit, et c'est `est_fondateur()`. Un
 * second contrôle écrit ici pourrait diverger du premier sans que rien ne le
 * signale — et c'est toujours le plus permissif des deux qui l'emporterait.
 *
 * ── Quel service d'envoi ──
 * Trois sont acceptés. On prend celui dont la clé est posée dans les secrets,
 * dans cet ordre : Resend, SendGrid, Brevo. Aucun n'est privilégié — c'est
 * simplement l'ordre de lecture. Poser une seule clé suffit ; en poser deux
 * n'est pas une erreur, la première trouvée sert.
 *
 * Secrets à poser (Supabase → Edge Functions → Secrets) :
 *   RESEND_API_KEY   ou   SENDGRID_API_KEY   ou   BREVO_API_KEY
 *   EMAIL_EXPEDITEUR   l'adresse d'expédition, vérifiée chez le service
 *   APP_URL            l'adresse du site, pour le lien d'inscription
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function reponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

/** Le message, en texte simple. C'est lui qui fait foi ; le HTML n'en est que la mise en forme. */
function messageTexte(part: number, siteUrl: string, adresse: string) {
  return [
    'Bonjour,',
    '',
    `Je vous associe à Devis Facile BTP à hauteur de ${part} % du chiffre d'affaires.`,
    '',
    `Créez votre compte avec cette adresse (${adresse}) sur ${siteUrl} : votre part`,
    "s'appliquera automatiquement, et l'application vous sera ouverte sans abonnement.",
    '',
    'À bientôt.',
  ].join('\n');
}

function messageHtml(part: number, siteUrl: string, adresse: string) {
  const lien = `<a href="${siteUrl}/login?mode=register" style="color:#15619f">${siteUrl}</a>`;
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.6;color:#13202d">
  <p>Bonjour,</p>
  <p>Je vous associe à <strong>Devis Facile BTP</strong> à hauteur de
     <strong>${part}&nbsp;%</strong> du chiffre d'affaires.</p>
  <p>Créez votre compte avec cette adresse (<strong>${adresse}</strong>) sur ${lien} :
     votre part s'appliquera automatiquement, et l'application vous sera ouverte
     sans abonnement.</p>
  <p>À bientôt.</p>
</div>`;
}

type Envoi = { destinataire: string; sujet: string; texte: string; html: string; expediteur: string };

/**
 * Chaque service a sa propre forme de requête, mais la même réponse pour nous :
 * ou bien c'est parti, ou bien on renvoie ce que le service a répondu — jamais
 * un « échec » générique qui obligerait à aller fouiller ses journaux.
 */
async function envoyer(envoi: Envoi): Promise<{ fournisseur: string }> {
  const resend = Deno.env.get('RESEND_API_KEY');
  const sendgrid = Deno.env.get('SENDGRID_API_KEY');
  const brevo = Deno.env.get('BREVO_API_KEY');

  if (resend) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: envoi.expediteur,
        to: [envoi.destinataire],
        subject: envoi.sujet,
        text: envoi.texte,
        html: envoi.html,
      }),
    });
    if (!r.ok) throw new Error(`Resend a refusé l'envoi : ${await r.text()}`);
    return { fournisseur: 'Resend' };
  }

  if (sendgrid) {
    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sendgrid}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: envoi.destinataire }] }],
        from: { email: envoi.expediteur, name: 'Devis Facile BTP' },
        subject: envoi.sujet,
        content: [
          { type: 'text/plain', value: envoi.texte },
          { type: 'text/html', value: envoi.html },
        ],
      }),
    });
    // SendGrid répond 202 avec un corps vide quand tout va bien.
    if (!r.ok) throw new Error(`SendGrid a refusé l'envoi : ${await r.text()}`);
    return { fournisseur: 'SendGrid' };
  }

  if (brevo) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevo, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: envoi.expediteur, name: 'Devis Facile BTP' },
        to: [{ email: envoi.destinataire }],
        subject: envoi.sujet,
        textContent: envoi.texte,
        htmlContent: envoi.html,
      }),
    });
    if (!r.ok) throw new Error(`Brevo a refusé l'envoi : ${await r.text()}`);
    return { fournisseur: 'Brevo' };
  }

  throw new Error(
    "Aucun service d'envoi n'est configuré. Posez RESEND_API_KEY, SENDGRID_API_KEY " +
      'ou BREVO_API_KEY dans Supabase → Edge Functions → Secrets.',
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
  if (req.method !== 'POST') return reponse(405, { error: 'Méthode non autorisée' });

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

  // C'est la base qui tranche, avec le jeton de l'appelant.
  const { data: estFondateur, error: erreurRole } = await clientAppelant.rpc('est_fondateur');
  if (erreurRole) return reponse(500, { error: "Impossible de verifier le role de l'appelant" });
  if (estFondateur !== true) return reponse(403, { error: 'Reserve au fondateur' });

  let corps: { email?: unknown; part?: unknown };
  try {
    corps = await req.json();
  } catch {
    return reponse(400, { error: 'Corps de requête invalide' });
  }

  const destinataire = typeof corps.email === 'string' ? corps.email.trim().toLowerCase() : '';
  const part = Number(corps.part);
  if (!destinataire.includes('@')) return reponse(400, { error: 'Adresse e-mail invalide' });
  if (!(part > 0 && part <= 100)) return reponse(400, { error: 'La part doit être comprise entre 0 et 100 %' });

  const siteUrl = Deno.env.get('APP_URL') || 'https://app-one-alpha-wfx7fnsesa.vercel.app';
  const expediteur = Deno.env.get('EMAIL_EXPEDITEUR');
  if (!expediteur) {
    return reponse(500, {
      error: "L'adresse d'expédition n'est pas configurée (secret EMAIL_EXPEDITEUR).",
    });
  }

  try {
    const { fournisseur } = await envoyer({
      destinataire,
      expediteur,
      sujet: 'Votre part dans Devis Facile BTP',
      texte: messageTexte(part, siteUrl, destinataire),
      html: messageHtml(part, siteUrl, destinataire),
    });
    return reponse(200, { envoye: true, email: destinataire, fournisseur });
  } catch (e) {
    // Le message du service, tel quel : « domaine non vérifié », « clé
    // expirée »… Il est toujours plus utile que ce qu'on pourrait résumer.
    return reponse(502, { error: e instanceof Error ? e.message : "L'envoi a échoué" });
  }
});
