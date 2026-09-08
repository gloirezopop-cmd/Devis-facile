import { useEffect, useState } from 'react';
import { estAdministrateur } from '../lib/estimationApi.js';

/**
 * Le compte connecté est-il administrateur ?
 *
 * Volontairement plus léger que `useDroits` : la navigation n'a pas besoin de
 * connaître les formules ni les abonnements pour décider d'afficher un lien.
 *
 * `null` signifie « on ne sait pas encore » — la navigation ne montre donc
 * rien plutôt que de faire apparaître puis disparaître une section
 * d'administration sous les yeux d'un utilisateur ordinaire. C'est la réponse
 * de la base (`est_admin()`) qui tranche, jamais cet écran : masquer un lien
 * n'est pas une protection, la vraie barrière est dans les politiques RLS et
 * dans `statistiques_admin()`.
 */
export function useEstAdmin() {
  const [estAdmin, setEstAdmin] = useState(null);

  useEffect(() => {
    let annule = false;
    estAdministrateur().then((reponse) => {
      if (!annule) setEstAdmin(reponse === true);
    });
    return () => { annule = true; };
  }, []);

  return estAdmin;
}
