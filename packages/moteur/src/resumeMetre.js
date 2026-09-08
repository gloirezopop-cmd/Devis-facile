import { obtenirDecompositionOuvrage } from './recettes.js';

const NOMS_MATERIAUX_STANDARDS = {
  ciment: 'Ciment',
  sable: 'Sable',
  gravier: 'Gravier',
  eau: 'Eau',
  planches: 'Planches de coffrage',
  chevrons: 'Chevrons',
  clous: 'Clous',
  filLigature: 'Fil à ligature',
  blocs: 'Agglos creux',
  blocs_pleins: 'Agglos pleins',
  moellon: 'Moellons',
  cimentColle: 'Ciment-colle',
  carreaux: 'Carreaux',
  faience: 'Faïences',
  plinthe: 'Plinthes',
  peinture_latex: 'Peinture Latex',
  peinture_classique: 'Peinture Classique',
  peinture_chaux: 'Peinture à la Chaux',
  bois_charpente: 'Bois de charpente',
  clous_charpente: 'Clous de charpente',
  toles: 'Tôles',
  faitieres: 'Faîtières',
  clous_toiture: 'Pointes à tôle',
  deblais_foisonne: 'Déblais foisonnés'
};

export function genererResumeProjet(metreParNiveau, regles = {}) {
  const summary = {
    levels: [],
    totals: {
      materials: {}
    }
  };

  if (!metreParNiveau || !Array.isArray(metreParNiveau)) return summary;

  metreParNiveau.forEach(({ niveauId, niveau, metre }) => {
    const levelData = {
      id: niveauId,
      name: niveau?.nom || niveauId,
      type: niveau?.type || 'inconnu',
      categories: [],
      totals: {
        materials: {}
      }
    };

    if (metre && metre.blocs) {
      for (const [blocId, bloc] of Object.entries(metre.blocs)) {
        // Un bloc n'est inclus que s'il a un total ou des lignes de saisie
        if (!(bloc.total > 0) && (!bloc.lignes || bloc.lignes.length === 0)) continue;

        // Récupérer la décomposition des matériaux pour cet ouvrage/bloc
        const materials = obtenirDecompositionOuvrage(blocId, bloc, regles);

        const categoryData = {
          id: blocId,
          name: bloc.libelle || blocId,
          unite: bloc.unite || '-',
          quantite: bloc.total || 0,
          materials: materials
        };

        levelData.categories.push(categoryData);

        // Aggrégation des matériaux pour le niveau et pour le projet global
        materials.forEach(mat => {
          const key = mat.id_materiau;
          
          // Nom normalisé pour les totaux (ex: "Sable" au lieu de "Sable (Semelles S1)")
          let nomStandard = NOMS_MATERIAUX_STANDARDS[key] || mat.nom;
          // Si c'est un acier (ex: acier_10), on le normalise
          if (key.startsWith('acier_')) {
            const diametre = key.split('_')[1];
            nomStandard = `Fer Ø${diametre}`;
          }

          // Total Niveau
          if (!levelData.totals.materials[key]) {
            levelData.totals.materials[key] = {
              id: key,
              nom: nomStandard,
              categorie: mat.categorie,
              unite: mat.unite,
              quantite: 0
            };
          }
          levelData.totals.materials[key].quantite += mat.valeur_arrondie;

          // Total Projet
          if (!summary.totals.materials[key]) {
            summary.totals.materials[key] = {
              id: key,
              nom: nomStandard,
              categorie: mat.categorie,
              unite: mat.unite,
              quantite: 0
            };
          }
          summary.totals.materials[key].quantite += mat.valeur_arrondie;
        });
      }
    }

    if (levelData.categories.length > 0) {
      summary.levels.push(levelData);
    }
  });

  return summary;
}
