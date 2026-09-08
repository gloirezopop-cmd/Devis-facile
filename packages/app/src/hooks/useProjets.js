import { useCallback } from 'react';
import { useProjet } from '../context/ProjetContext.jsx';
import useLocalStorageState from './useLocalStorageState.js';

/**
 * Les clés d'état qui composent un projet — tout ce qu'il faut pour
 * reconstituer un chantier à l'identique. Dérivé directement des champs que
 * ProjetContext expose ; `set` + première lettre en majuscule pour retrouver
 * le setter de chacun (convention déjà suivie partout dans le contexte).
 */
const CLES_PROJET = [
  'niveaux', 'niveauActifId',
  'fouilles', 'betonProprete', 'fouilleFilante', 'nivellement', 'terrassementGrandeSurface',
  'semelles', 'longrines', 'colonnes', 'maconneries', 'escaliers',
  'soubassements', 'moellons', 'chapeEgalisations', 'sousPavements',
  'carrelages', 'enduits', 'peintures', 'faiences', 'autresOuvrages',
  'dalles', 'plancherHourdis12', 'plancherHourdis16',
  'charpentes', 'couverturesToles', 'terrasses',
  'taux', 'majorations', 'parametresProjet', 'bibliothequePrix', 'labelsPrix',
];

const nomSetter = (cle) => `set${cle[0].toUpperCase()}${cle.slice(1)}`;

/**
 * Sauvegarde et rechargement de projets, en local — la première brique
 * de « Mes projets », sans compte ni serveur. Le projet actif (celui que
 * « Enregistrer » met à jour plutôt que dupliquer) est retenu séparément.
 */
export function useProjets() {
  const etat = useProjet();
  const [projets, setProjets] = useLocalStorageState('df_projets', []);
  const [projetActifId, setProjetActifId] = useLocalStorageState('df_projetActifId', null);

  const construireSnapshot = useCallback(() => {
    const snapshot = {};
    for (const cle of CLES_PROJET) snapshot[cle] = etat[cle];
    return snapshot;
  }, [etat]);

  const sauvegarder = useCallback((nom) => {
    const snapshot = construireSnapshot();
    const maintenant = new Date().toISOString();
    const nomFinal = nom || etat.parametresProjet?.reference || 'Projet sans nom';

    const existant = projetActifId && projets.find((p) => p.id === projetActifId);
    if (existant) {
      setProjets(projets.map((p) =>
        p.id === projetActifId ? { ...p, nom: nomFinal, dateModification: maintenant, snapshot } : p,
      ));
      return existant.id;
    }

    const id = `proj_${Date.now()}`;
    setProjets([...projets, { id, nom: nomFinal, dateCreation: maintenant, dateModification: maintenant, snapshot }]);
    setProjetActifId(id);
    return id;
  }, [construireSnapshot, etat.parametresProjet, projetActifId, projets, setProjets, setProjetActifId]);

  // « Enregistrer sous » : toujours un nouveau projet, jamais une mise a jour.
  const sauvegarderSous = useCallback((nom) => {
    const snapshot = construireSnapshot();
    const maintenant = new Date().toISOString();
    const id = `proj_${Date.now()}`;
    setProjets([...projets, { id, nom: nom || 'Copie du projet', dateCreation: maintenant, dateModification: maintenant, snapshot }]);
    setProjetActifId(id);
    return id;
  }, [construireSnapshot, projets, setProjets, setProjetActifId]);

  const charger = useCallback((id) => {
    const projet = projets.find((p) => p.id === id);
    if (!projet) return false;
    for (const cle of CLES_PROJET) {
      const setter = etat[nomSetter(cle)];
      if (typeof setter === 'function' && projet.snapshot[cle] !== undefined) {
        setter(projet.snapshot[cle]);
      }
    }
    setProjetActifId(id);
    return true;
  }, [projets, etat, setProjetActifId]);

  const supprimer = useCallback((id) => {
    setProjets(projets.filter((p) => p.id !== id));
    if (projetActifId === id) setProjetActifId(null);
  }, [projets, setProjets, projetActifId, setProjetActifId]);

  return { projets, projetActifId, sauvegarder, sauvegarderSous, charger, supprimer };
}
