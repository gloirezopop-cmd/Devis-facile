import { supabase } from './supabaseClient.js';

/**
 * Le brouillon de travail, rangé dans le profil.
 *
 * Une seule ligne par compte : `user_id` est la clé primaire, l'écriture se
 * fait donc en `upsert`. Deux onglets ouverts ne créent pas deux brouillons
 * concurrents — le dernier enregistrement gagne, ce qui est le comportement
 * attendu d'un brouillon.
 *
 * Aucune de ces fonctions ne fait échouer le parcours : perdre un
 * enregistrement de brouillon est ennuyeux, interrompre quelqu'un en train de
 * travailler l'est davantage.
 */

// L'enregistrement a lieu toutes les 45 secondes. Tant que la table n'existe
// pas — le script n'a pas encore été exécuté — la même erreur se répéterait
// indéfiniment dans la console et noierait tout le reste. On la dit une fois.
const dejaSignale = new Set();
function signaler(ou, error) {
  if (dejaSignale.has(ou)) return;
  dejaSignale.add(ou);
  console.error(`brouillonApi: ${ou} impossible`, error.message);
  if (error.code === 'PGRST205') {
    console.error('brouillonApi: exécutez maj_brouillon.sql dans Supabase.');
  }
}

export async function chargerBrouillon() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('brouillons')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    signaler('lecture', error);
    return null;
  }
  return data;
}

export async function enregistrerBrouillon({ contenu, chemin = null, resume = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('brouillons')
    .upsert({
      user_id: user.id,
      contenu,
      chemin,
      resume,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    signaler('enregistrement', error);
    return false;
  }
  return true;
}

export async function supprimerBrouillon() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('brouillons').delete().eq('user_id', user.id);
  if (error) {
    signaler('suppression', error);
    return false;
  }
  return true;
}
