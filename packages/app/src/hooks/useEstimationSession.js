import { useCallback, useMemo } from 'react';
import useLocalStorageState from './useLocalStorageState.js';
import { genererNiveaux, calculerSurfaceTotale, reporterSurface } from '../utils/estimation.js';

const SESSION_VIDE = {
  country: null,
  location: null,
  buildingType: null,
  standing: null,
  nombreEtages: null,
  levels: [],
  projectId: null,
};

/**
 * État de l'assistant d'estimation, persisté en local pour que revenir en
 * arrière — ou fermer l'onglet par erreur — ne fasse jamais perdre une réponse
 * déjà donnée. Le projet est ensuite enregistré en base au moment du calcul :
 * c'est là qu'il devient durable.
 *
 * `levels` est régénéré à chaque changement de configuration, mais les
 * surfaces déjà saisies sur les niveaux qui existent encore sont conservées :
 * passer de R+2 à R+3 ne doit pas faire ressaisir le RDC.
 */
export function useEstimationSession() {
  const [session, setSession] = useLocalStorageState('df_estimation_session', SESSION_VIDE);

  // Changer de pays invalide tout ce qui suit : localisation, tarifs, niveaux.
  const setCountry = useCallback((country) => {
    setSession({ ...SESSION_VIDE, country });
  }, [setSession]);

  const setLocation = useCallback((location) => {
    setSession((s) => ({ ...s, location }));
  }, [setSession]);

  const setBuildingType = useCallback((buildingType) => {
    setSession((s) => ({ ...s, buildingType }));
  }, [setSession]);

  const setStanding = useCallback((standing) => {
    setSession((s) => ({ ...s, standing }));
  }, [setSession]);

  const setNombreEtages = useCallback((nombreEtages) => {
    setSession((s) => {
      const anciens = new Map(s.levels.map((n) => [n.id, n]));
      // On reprend tout ce que l'ancien niveau portait (surface, mode,
      // longueur/largeur) : revenir de R+2 à R+1 puis rallonger à R+2
      // ne doit pas faire ressaisir une valeur déjà donnée.
      const levels = genererNiveaux(nombreEtages).map((n) => ({ ...anciens.get(n.id), ...n }));
      return { ...s, nombreEtages, levels };
    });
  }, [setSession]);

  /**
   * Reporte une surface sur les niveaux encore vides. Rien n'est écrasé : ce
   * qui a déjà été saisi reste tel quel.
   */
  const reporterSurTous = useCallback((surface) => {
    setSession((s) => ({ ...s, levels: reporterSurface(s.levels, surface) }));
  }, [setSession]);

  const setNiveau = useCallback((levelId, patch) => {
    setSession((s) => ({
      ...s,
      levels: s.levels.map((n) => (n.id === levelId ? { ...n, ...patch } : n)),
    }));
  }, [setSession]);

  const setProjectId = useCallback((projectId) => {
    setSession((s) => ({ ...s, projectId }));
  }, [setSession]);

  const reset = useCallback(() => setSession(SESSION_VIDE), [setSession]);

  /**
   * Les libellés viennent toujours de `genererNiveaux`, jamais de ce que
   * l'ancienne session avait enregistré : un parcours laissé ouvert il y a
   * plusieurs jours afficherait sinon les anciens intitulés. Les surfaces
   * saisies, elles, sont conservées telles quelles.
   */
  const levels = useMemo(() => {
    if (!session.levels?.length) return [];
    const modele = new Map(genererNiveaux(session.nombreEtages).map((n) => [n.id, n]));
    return session.levels.map((n) => ({ ...n, ...(modele.get(n.id) || {}) }));
  }, [session.levels, session.nombreEtages]);

  const surfaceTotale = useMemo(() => calculerSurfaceTotale(levels), [levels]);

  return {
    session: { ...session, levels, surfaceTotale },
    surfaceTotale,
    setCountry,
    setLocation,
    setBuildingType,
    setStanding,
    setNombreEtages,
    setNiveau,
    reporterSurTous,
    setProjectId,
    reset,
  };
}
