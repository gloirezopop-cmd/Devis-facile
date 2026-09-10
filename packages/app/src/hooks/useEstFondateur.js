import { useEffect, useState } from 'react';
import { estFondateurCompte } from '../lib/estimationApi.js';

/**
 * Le compte connecté est-il LE fondateur ?
 *
 * Il a fallu séparer cette question de « est-il administrateur ». Tant que le
 * fondateur était le seul administrateur, les deux se confondaient ; depuis
 * qu'un investisseur est administrateur lui aussi, elles ne disent plus la même
 * chose — et c'est la seconde qui décide de la grille tarifaire.
 *
 * `null` signifie « on ne sait pas encore » : la navigation ne montre alors
 * rien, plutôt que de faire apparaître puis disparaître un lien réservé sous
 * les yeux de quelqu'un qui n'y a pas droit.
 *
 * Masquer un lien n'est pas une protection. La vraie barrière est la politique
 * RLS de `construction_rates`, qui exige `est_fondateur()` : forcer l'adresse
 * ne donne accès à rien.
 */
export function useEstFondateur() {
  const [estFondateur, setEstFondateur] = useState(null);

  useEffect(() => {
    let annule = false;
    estFondateurCompte().then((reponse) => {
      if (!annule) setEstFondateur(reponse === true);
    });
    return () => { annule = true; };
  }, []);

  return estFondateur;
}
