import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchOffres, fetchMesAbonnements } from '../lib/estimationApi.js';
import { calculerDroits, statutDuCompte } from '../utils/offres.js';

/**
 * Les droits du compte connecté, et les formules disponibles.
 *
 * Les deux viennent de la base : les formules parce qu'elles doivent rester
 * modifiables sans toucher au code, les abonnements parce que c'est PostgreSQL
 * qui décide de ce qu'un compte peut lire. Aucun droit n'est déduit d'un nom
 * de formule côté navigateur.
 *
 * `chargement` distingue « pas encore de réponse » de « aucun droit ». Sans
 * cette distinction, chaque écran protégé afficherait brièvement son verrou à
 * un abonné — un clignotement qui donne l'impression d'avoir perdu son accès.
 */
export function useDroits(projectId = null) {
  const [plans, setPlans] = useState([]);
  const [abonnements, setAbonnements] = useState([]);
  const [chargement, setChargement] = useState(true);

  const [rafraichissement, setRafraichissement] = useState(0);

  /**
   * Redemande les droits au serveur. Utile au retour d'un paiement : c'est le
   * serveur qui accorde l'abonnement une fois l'encaissement confirmé, et cette
   * confirmation peut arriver quelques secondes après le retour de
   * l'utilisateur. Rien ici ne décide qu'un paiement a réussi.
   */
  const recharger = useCallback(() => {
    setChargement(true);
    setRafraichissement((n) => n + 1);
  }, []);

  useEffect(() => {
    let annule = false;
    Promise.all([fetchOffres(), fetchMesAbonnements()]).then(([p, a]) => {
      if (annule) return;
      setPlans(p);
      setAbonnements(a);
      setChargement(false);
    });
    return () => { annule = true; };
  }, [rafraichissement]);

  const droits = useMemo(
    () => calculerDroits({ abonnements, plans, projectId }),
    [abonnements, plans, projectId],
  );
  const statut = useMemo(() => statutDuCompte(abonnements, plans), [abonnements, plans]);

  return {
    droits,
    plans,
    abonnements,
    statut,
    chargement,
    recharger,
    peut: (droit) => droits[droit] === true,
  };
}
