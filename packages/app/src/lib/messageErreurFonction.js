/**
 * Récupère le message d'erreur qu'une Edge Function a réellement renvoyé.
 *
 * `supabase.functions.invoke()` ne remplit `data` que pour une réponse 2xx :
 * dès que le serveur répond 4xx ou 5xx, `data` vaut `null` et le corps de la
 * réponse part dans `error.context`, qui est un objet `Response` non lu. Sans
 * ce détour, l'interface ne peut afficher qu'un message générique — un
 * « Complétez votre profil » ou un « Offre déjà acquise » écrit côté serveur
 * n'atteindrait jamais l'utilisateur.
 */
export async function messageErreurFonction(error, data) {
  if (data?.error) return data.error;

  const contexte = error?.context;
  if (contexte && typeof contexte.json === 'function') {
    try {
      const corps = await contexte.clone().json();
      if (corps?.error) return corps.error;
    } catch {
      // Corps illisible (HTML d'une passerelle, réponse vide) : on retombe
      // sur le message générique de l'appelant.
    }
  }

  return null;
}
