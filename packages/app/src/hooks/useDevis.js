import { useMemo } from 'react';
import { genererDevisParticulier, genererDevisEntreprise } from '@devis-facile/moteur';
import { useProjet } from '../context/ProjetContext.jsx';
import { useMetre } from './useMetre.js';

/**
 * Le devis suit le metre pas a pas : chaque frappe recalcule le metre, et les
 * deux devis en decoulent par memoisation. Il n'y a donc rien a « lancer ».
 *
 * Les deux generateurs prennent la liste des niveaux telle quelle
 * (`[{ niveau, saisie, metre }]`) : ils s'en servent pour rattacher chaque
 * ouvrage a son lot. Leur signature est (input, regles, prix, libelles) —
 * l'ordre compte, une inversion sort un devis entier a zero franc.
 */
export function useDevis() {
  const {
    bibliothequePrixNumerique,
    labelsPrix,
    reglesPersonnalisees,
  } = useProjet();

  const { metreParNiveau } = useMetre();

  const devisParticulier = useMemo(
    () => genererDevisParticulier(metreParNiveau, reglesPersonnalisees, bibliothequePrixNumerique, labelsPrix),
    [metreParNiveau, reglesPersonnalisees, bibliothequePrixNumerique, labelsPrix],
  );

  const devisEntreprise = useMemo(
    () => genererDevisEntreprise(metreParNiveau, reglesPersonnalisees, bibliothequePrixNumerique, labelsPrix),
    [metreParNiveau, reglesPersonnalisees, bibliothequePrixNumerique, labelsPrix],
  );

  const avertissementsDevis = useMemo(() => {
    const warns = [];

    Object.entries(bibliothequePrixNumerique).forEach(([cle, valeur]) => {
      if (valeur < 0) {
        warns.push({
          bloc: 'bibliotheque', ligne: 0, repere: cle, niveauId: 'GLOBAL',
          type: 'prix-negatif',
          message: `Le prix unitaire du matériau « ${cle} » est négatif (${valeur} FCFA).`,
        });
      } else if (valeur === 0) {
        warns.push({
          bloc: 'bibliotheque', ligne: 0, repere: cle, niveauId: 'GLOBAL',
          type: 'prix-nul',
          message: `Le prix unitaire du matériau « ${cle} » est à 0. (Non chiffré)`,
        });
      }
    });

    // Un ouvrage metre mais sans prix connu ne doit pas disparaitre en silence :
    // il sort a zero franc dans le devis, et c'est au chiffreur de le voir.
    const lots = devisParticulier?.lots || {};
    for (const [lotId, lot] of Object.entries(lots)) {
      for (const ligne of lot.lignes || []) {
        if (ligne.avertissements?.length) {
          warns.push({
            bloc: lotId, ligne: 0, repere: ligne.designation, niveauId: 'GLOBAL',
            type: 'prix-manquant',
            message: `${ligne.designation} : ${ligne.avertissements.join(', ')}.`,
          });
        }
      }
    }

    return warns;
  }, [bibliothequePrixNumerique, devisParticulier]);

  return { devisParticulier, devisEntreprise, avertissementsDevis };
}
