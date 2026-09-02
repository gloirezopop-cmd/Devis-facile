import { useMemo } from 'react';
import { genererDevisParticulier, genererDevisEntreprise } from '@devis-facile/moteur';
import { useProjet } from '../context/ProjetContext.jsx';
import { useMetre } from './useMetre.js';

export function useDevis() {
  const {
    bibliothequePrixNumerique,
    reglesPersonnalisees,
    taux,
    niveaux
  } = useProjet();
  
  const { metreParNiveau } = useMetre();

  // Combine tous les métrés pour l'ensemble du projet
  const metreGlobalCombine = useMemo(() => {
    let globalMetre = { blocs: {}, avertissements: [] };
    
    // Note: Pour générer un devis sur tout le projet, on doit agréger les blocs
    // ou alors le moteur doit générer le devis niveau par niveau et on les somme.
    // L'implémentation actuelle dans App.jsx générait le devis uniquement 
    // sur "currentMetre" (donc le niveau actif), ce qui n'est pas correct pour le devis global.
    // Pour simplifier l'agrégation, on passe les tableaux entiers à un calcul metreGlobal
    // OU on laisse le moteur le gérer s'il y a un `calculerMetreProjet`.
    // Actuellement, le devis est basé sur un seul metre (le niveau actif dans l'ancienne version,
    // ou on doit tout fusionner). 
    // Faisons la fusion ici.
    
    metreParNiveau.forEach(m => {
      Object.entries(m.metre.blocs || {}).forEach(([blocId, blocData]) => {
        if (!globalMetre.blocs[blocId]) {
          globalMetre.blocs[blocId] = { lignes: [], total: 0, unite: blocData.unite };
        }
        globalMetre.blocs[blocId].lignes.push(...(blocData.lignes || []));
        globalMetre.blocs[blocId].total += blocData.total;
      });
    });

    return globalMetre;
  }, [metreParNiveau]);

  const devisParticulier = useMemo(() => {
    return genererDevisParticulier(metreGlobalCombine, bibliothequePrixNumerique);
  }, [metreGlobalCombine, bibliothequePrixNumerique]);

  const devisEntreprise = useMemo(() => {
    return genererDevisEntreprise(metreGlobalCombine, bibliothequePrixNumerique, taux, reglesPersonnalisees);
  }, [metreGlobalCombine, bibliothequePrixNumerique, taux, reglesPersonnalisees]);

  const avertissementsDevis = useMemo(() => {
    const warns = [];
    Object.entries(bibliothequePrixNumerique).forEach(([cle, valeur]) => {
      if (valeur < 0) {
        warns.push({
          bloc: 'bibliotheque',
          ligne: 0,
          repere: cle,
          niveauId: 'GLOBAL',
          type: 'prix-negatif',
          message: `Le prix unitaire du matériau "${cle}" est négatif (${valeur} FCFA).`
        });
      } else if (valeur === 0) {
        warns.push({
          bloc: 'bibliotheque',
          ligne: 0,
          repere: cle,
          niveauId: 'GLOBAL',
          type: 'prix-nul',
          message: `Le prix unitaire du matériau "${cle}" est à 0. (Non chiffré)`
        });
      }
    });
    return warns;
  }, [bibliothequePrixNumerique]);

  return {
    devisParticulier,
    devisEntreprise,
    avertissementsDevis
  };
}
