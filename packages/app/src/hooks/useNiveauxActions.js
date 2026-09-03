import { useProjet } from '../context/ProjetContext.jsx';
import { TYPES_FIXES } from '../config/niveaux.js';

/**
 * Ajouter / supprimer / renommer un niveau. Extrait de l'ancien AppContent
 * pour que l'étape « Structure » du parcours et la barre de niveaux du
 * métré partagent la même logique — une seule source, aucun risque de
 * divergence entre les deux endroits qui en avaient besoin.
 */
export function useNiveauxActions() {
  const { niveaux, setNiveaux, niveauActifId, setNiveauActifId, defaultAcierHyp } = useProjet();

  const ajouterNiveau = () => {
    const nextNum = niveaux.filter((n) => n.type === 'elevation').length + 1;
    const toitureIndex = niveaux.findIndex((n) => n.type === 'toiture');

    const newElevation = {
      id: `elevation_${nextNum}`,
      nom: `Élévation Niv. ${nextNum}`,
      type: 'elevation',
      acierHyp: { ...defaultAcierHyp },
    };
    const newPlancher = {
      id: `plancher_${nextNum}`,
      nom: `Plancher Niv. ${nextNum}`,
      type: 'plancher',
      acierHyp: { ...defaultAcierHyp },
    };

    const newNiveaux = [...niveaux];
    newNiveaux.splice(toitureIndex, 0, newElevation, newPlancher);
    setNiveaux(newNiveaux);
    setNiveauActifId(newElevation.id);
    return newElevation.id;
  };

  const supprimerNiveau = (niveauId) => {
    const niveau = niveaux.find((n) => n.id === niveauId);
    if (!niveau || TYPES_FIXES.includes(niveau.type)) return;

    // Supprimer la paire : si c'est une élévation, chercher le plancher suivant et vice versa.
    let idsASupprimer = [niveauId];
    const i = niveaux.findIndex((n) => n.id === niveauId);
    if (niveau.type === 'elevation') {
      const suivant = niveaux[i + 1];
      if (suivant && suivant.type === 'plancher') idsASupprimer.push(suivant.id);
    } else if (niveau.type === 'plancher') {
      const precedent = niveaux[i - 1];
      if (precedent && precedent.type === 'elevation') idsASupprimer.push(precedent.id);
    }

    const newNiveaux = niveaux.filter((n) => !idsASupprimer.includes(n.id));
    setNiveaux(newNiveaux);

    if (idsASupprimer.includes(niveauActifId)) {
      setNiveauActifId(newNiveaux[Math.max(0, i - 1)]?.id || newNiveaux[0]?.id);
    }
  };

  const renommerNiveau = (niveauId, nouveauNom) => {
    if (!nouveauNom || !nouveauNom.trim()) return;
    setNiveaux(niveaux.map((n) => (n.id === niveauId ? { ...n, nom: nouveauNom.trim() } : n)));
  };

  return { niveaux, niveauActifId, setNiveauActifId, ajouterNiveau, supprimerNiveau, renommerNiveau };
}
