/**
 * En-têtes CORS pour les fonctions appelées directement par le navigateur
 * (le checkout). Le webhook, lui, est appelé serveur à serveur par Chariow et
 * n'en a pas besoin — les navigateurs ne l'appellent jamais.
 */
export function corsHeaders() {
  const origine = Deno.env.get('APP_URL');
  return {
    'Access-Control-Allow-Origin': origine || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
