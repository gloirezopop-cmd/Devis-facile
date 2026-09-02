import { useMemo } from 'react';
import { calculerMetre } from '@devis-facile/moteur';
import { useProjet } from '../context/ProjetContext.jsx';

export function useMetre() {
  const {
    niveaux,
    fouilles,
    betonProprete,
    semelles,
    longrines,
    colonnes,
    maconneries,
    soubassements,
    carrelages,
    autresOuvrages,
    reglesPersonnalisees
  } = useProjet();

  const metreParNiveau = useMemo(() => {
    return niveaux.map(niveau => {
      const stateNiveau = {
        niveaux: [niveau], // le moteur attend la config acierHyp dans l'objet niveau
        fouilles: fouilles.filter(f => f.niveauId === niveau.id),
        betonProprete: betonProprete.filter(bp => bp.niveauId === niveau.id),
        semelles: semelles.filter(s => s.niveauId === niveau.id),
        longrines: longrines.filter(l => l.niveauId === niveau.id),
        colonnes: colonnes.filter(c => c.niveauId === niveau.id),
        maconneries: maconneries.filter(m => m.niveauId === niveau.id),
        soubassements: soubassements.filter(ms => ms.niveauId === niveau.id),
        carrelages: carrelages.filter(c => c.niveauId === niveau.id),
        autresOuvrages: autresOuvrages.filter(a => a.niveauId === niveau.id)
      };

      const result = calculerMetre(stateNiveau, reglesPersonnalisees);
      return { niveauId: niveau.id, metre: result };
    });
  }, [
    niveaux,
    fouilles,
    betonProprete,
    semelles,
    longrines,
    colonnes,
    maconneries,
    soubassements,
    carrelages,
    autresOuvrages,
    reglesPersonnalisees
  ]);

  const avertissementsGlobaux = useMemo(() => {
    let warns = [];
    metreParNiveau.forEach(m => {
      if (m.metre.avertissements && m.metre.avertissements.length > 0) {
        warns.push(...m.metre.avertissements.map(a => ({ ...a, niveauId: m.niveauId })));
      }
    });
    return warns;
  }, [metreParNiveau]);

  return {
    metreParNiveau,
    avertissementsGlobaux,
  };
}
