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
    const toNumber = (val) => {
      if (typeof val === 'string') {
        if (val.trim() === '') return undefined;
        const num = Number(val);
        return !isNaN(num) ? num : val;
      }
      return val;
    };

    const sanitize = (arr) => arr.map(item => {
      const sanitized = {};
      for (const [key, value] of Object.entries(item)) {
        if (Array.isArray(value)) {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = toNumber(value);
        }
      }
      return sanitized;
    });

    return niveaux.map(niveau => {
      const stateNiveau = {
        niveaux: [niveau], // le moteur attend la config acierHyp dans l'objet niveau
        fouilles: sanitize(fouilles.filter(f => f.niveauId === niveau.id)),
        betonProprete: sanitize(betonProprete.filter(bp => bp.niveauId === niveau.id)),
        semelles: sanitize(semelles.filter(s => s.niveauId === niveau.id)),
        longrines: sanitize(longrines.filter(l => l.niveauId === niveau.id)),
        colonnes: sanitize(colonnes.filter(c => c.niveauId === niveau.id)),
        maconneries: sanitize(maconneries.filter(m => m.niveauId === niveau.id)),
        soubassements: sanitize(soubassements.filter(ms => ms.niveauId === niveau.id)),
        carrelages: sanitize(carrelages.filter(c => c.niveauId === niveau.id)),
        autresOuvrages: sanitize(autresOuvrages.filter(a => a.niveauId === niveau.id))
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
