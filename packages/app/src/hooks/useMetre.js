import { useMemo } from 'react';
import { calculerMetre } from '@devis-facile/moteur';
import { useProjet } from '../context/ProjetContext.jsx';
import { preparerSaisiePourMoteur } from '../utils/sanitize.js';

/**
 * Calcule l'unite d'affichage et le total lisible d'un bloc de metre,
 * pour affichage dans la barre de navigation des etapes.
 *
 * Regles :
 *   - semelles, longrines, poteaux, ceintures, dalles, escalier => m3
 *   - maconnerie, enduits, carrelage, faience => m2
 *   - fouilles, betonProprete => m3
 *   - charpente, couverture, terrasse => surface en m2 (estimee)
 */
function resumeBlocs(blocs) {
  if (!blocs) return null;
  let volumeM3 = 0;
  let surfaceM2 = 0;
  const blocsM3 = ['semelles', 'longrines', 'poteaux', 'colonnes', 'ceintures', 'poutres', 'linteaux', 'dalles', 'plancherHourdis', 'escalier', 'acrotere', 'betonProprete', 'sousPavement', 'chapeEgalisation', 'fouilles', 'fouilleFilante', 'remblai', 'moellon', 'murSoubassement'];
  const blocsM2 = ['maconnerie', 'enduits', 'carrelage', 'faience'];

  for (const [key, val] of Object.entries(blocs)) {
    const t = val && val.total ? val.total : 0;
    if (blocsM3.includes(key)) volumeM3 += t;
    else if (blocsM2.includes(key)) surfaceM2 += t;
    else if (key === 'charpenteBois' || key === 'couvertureToles') surfaceM2 += t;
  }

  if (volumeM3 > 0 && surfaceM2 > 0) return { valeur: volumeM3, unite: 'm\u00B3', extra: `+ ${Math.round(surfaceM2)} m\u00B2` };
  if (volumeM3 > 0) return { valeur: volumeM3, unite: 'm\u00B3' };
  if (surfaceM2 > 0) return { valeur: surfaceM2, unite: 'm\u00B2' };
  return null;
}

export function useMetre() {
  const {
    niveaux,
    fouilles,
    fouilleFilante,
    betonProprete,
    semelles,
    longrines,
    colonnes,
    escaliers,
    maconneries,
    soubassements,
    moellons,
    chapeEgalisations,
    sousPavements,
    nivellement,
    carrelages,
    enduits,
    peintures,
    faiences,
    autresOuvrages,
    dalles,
    plancherHourdis12,
    plancherHourdis16,
    charpentes,
    couverturesToles,
    terrasses,
    reglesPersonnalisees
  } = useProjet();

  const metreParNiveau = useMemo(() => {
    return niveaux.map(niveau => {
      const stateNiveau = preparerSaisiePourMoteur(niveau, {
        fouilles, fouilleFilante, betonProprete, semelles, longrines, colonnes, escaliers, maconneries, soubassements,
        moellons, chapeEgalisations, sousPavements, nivellement, carrelages, enduits, peintures, faiences, autresOuvrages,
        dalles, plancherHourdis12, plancherHourdis16, charpentes, couverturesToles, terrasses
      });
      const result = calculerMetre(stateNiveau, reglesPersonnalisees);
      return { niveauId: niveau.id, niveau, saisie: stateNiveau, metre: result };
    });
  }, [
    niveaux,
    fouilles, fouilleFilante, betonProprete, semelles, longrines, colonnes, escaliers,
    maconneries, soubassements, moellons, chapeEgalisations, sousPavements, nivellement,
    carrelages, enduits, peintures, faiences, autresOuvrages,
    dalles, plancherHourdis12, plancherHourdis16, charpentes, couverturesToles, terrasses,
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

  /**
   * Resume (volume ou surface) par niveau, pour affichage dans la barre de navigation.
   * Cle : niveauId, valeur : { valeur, unite } ou null si aucune donnee.
   */
  const resumeParNiveau = useMemo(() => {
    const map = {};
    for (const { niveauId, metre } of metreParNiveau) {
      map[niveauId] = metre.blocs ? resumeBlocs(metre.blocs) : null;
    }
    return map;
  }, [metreParNiveau]);

  return {
    metreParNiveau,
    avertissementsGlobaux,
    resumeParNiveau,
  };
}
