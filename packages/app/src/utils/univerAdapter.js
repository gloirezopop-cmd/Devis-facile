import { TITRES_LOTS_PARTICULIER, TITRES_LOTS_ENTREPRISE } from '@devis-facile/moteur';

export function generateWorkbookData(devisParticulier, devisEntreprise, metre, projet) {
  return {
    id: 'workbook-devis',
    sheetOrder: ['particulier', 'entreprise', 'metre', 'parametres'],
    name: 'Devis Facile BTP',
    appVersion: '0.1.0',
    sheets: {
      'particulier': {
        id: 'particulier',
        name: 'Devis Particulier',
        tabColor: '#14479B',
        rowCount: 150,
        columnCount: 15,
        ...generateDevisSheet(devisParticulier, 'particulier')
      },
      'entreprise': {
        id: 'entreprise',
        name: 'Devis Entreprise',
        tabColor: '#14634A',
        rowCount: 150,
        columnCount: 15,
        ...generateDevisSheet(devisEntreprise, 'entreprise')
      },
      'metre': {
        id: 'metre',
        name: 'Métré',
        rowCount: 500,
        columnCount: 10,
        ...generateMetreSheet(metre)
      },
      'parametres': {
        id: 'parametres',
        name: 'Paramètres',
        rowCount: 200,
        columnCount: 10,
        ...generateParametresSheet(projet)
      }
    },
    definedNames: generateDefinedNames(projet)
  };
}

function generateDefinedNames(projet) {
  const names = [];
  let idCounter = 1;
  
  if (!projet) return names;

  // Taux
  if (projet.taux) {
    Object.entries(projet.taux).forEach(([key, value]) => {
      names.push({
        id: `dn_${idCounter++}`,
        name: `TAUX_${key.toUpperCase()}`,
        formulaOrRefString: value.toString()
      });
    });
  }

  // Parametres Projet (ex: ratios, dosages)
  if (projet.parametresProjet) {
    Object.entries(projet.parametresProjet).forEach(([key, value]) => {
      names.push({
        id: `dn_${idCounter++}`,
        name: key.toUpperCase(), // ex: ENROBAGE, COEF_GRAVIER_VOL
        formulaOrRefString: typeof value === 'number' ? value.toString() : `"${value}"`
      });
    });
  }

  // Prix Unitaires
  if (projet.bibliothequePrix) {
    Object.entries(projet.bibliothequePrix).forEach(([key, value]) => {
      names.push({
        id: `dn_${idCounter++}`,
        name: `PU_${key.toUpperCase()}`,
        formulaOrRefString: value.toString()
      });
    });
  }

  return names;
}

/**
 * `devis` est la sortie reelle de genererDevisParticulier() / genererDevisEntreprise() :
 * `{ lots: {...} }` (Particulier) ou `{ niveaux: {...} }` (Entreprise), chaque
 * groupe etant `{ lignes: [{designation, unite, quantite, pu, pt}], sousTotal }`
 * — pas un tableau `.blocs` avec des champs `.titre`/`.prixUnitaire`/`.montant`.
 * Cette fonction visait cette forme imaginaire depuis le debut : la feuille
 * Excel sortait donc toujours vide, sans la moindre erreur, quel que soit le
 * devis. Meme source d'ordre des lots que TableauDevis.jsx (TITRES_LOTS_*),
 * pour que les deux vues du devis ne divergent jamais.
 */
function generateDevisSheet(devis, type = 'particulier') {
  const cellData = {};
  const columnData = {
    0: { hd: 0, hidden: 0, w: 250 }, // Désignation
    1: { hd: 0, hidden: 0, w: 80 },  // Unité
    2: { hd: 0, hidden: 0, w: 100 }, // Quantité
    3: { hd: 0, hidden: 0, w: 120 }, // Prix U
    4: { hd: 0, hidden: 0, w: 150 }  // Montant
  };

  const estEntreprise = type === 'entreprise';
  const groupes = (estEntreprise ? devis?.niveaux : devis?.lots) || {};
  const titres = estEntreprise ? TITRES_LOTS_ENTREPRISE : TITRES_LOTS_PARTICULIER;
  const ordre = [
    ...Object.keys(titres).filter((id) => groupes[id]),
    ...Object.keys(groupes).filter((id) => !(id in titres)),
  ];

  if (!devis || ordre.length === 0) return { cellData, columnData };

  let row = 0;

  ordre.forEach((lotId) => {
    const lot = groupes[lotId];
    if (!lot?.lignes?.length) return;
    const titre = titres[lotId] || lot.nom || lotId;

    // Titre du lot
    cellData[row] = {
      0: {
        v: titre,
        s: { bl: 1, fs: 14, bg: { rgb: '#f3f4f6' }, cl: { rgb: '#0F151B' } }
      }
    };
    row++;

    // En-têtes
    cellData[row] = {
      0: { v: 'Désignation', s: { bl: 1, cl: { rgb: '#0F151B' } } },
      1: { v: 'Unité', s: { bl: 1, cl: { rgb: '#0F151B' }, ht: 2 } }, // ht 2 = center
      2: { v: 'Quantité', s: { bl: 1, cl: { rgb: '#0F151B' }, ht: 3 } }, // ht 3 = right
      3: { v: 'Prix U (FCFA)', s: { bl: 1, cl: { rgb: '#0F151B' }, ht: 3 } },
      4: { v: 'Montant (FCFA)', s: { bl: 1, cl: { rgb: '#0F151B' }, ht: 3 } }
    };
    row++;

    // Lignes
    lot.lignes.forEach(ligne => {
      // Missing values -> "-"
      const quantiteV = ligne.quantite === 0 || !ligne.quantite ? "-" : ligne.quantite;
      const prixUnitaireV = ligne.pu === 0 || !ligne.pu ? "-" : ligne.pu;
      const montantV = ligne.pt === 0 || !ligne.pt ? "-" : ligne.pt;

      // Type de valeur: 2 is Number, 1 is String
      const qT = quantiteV === "-" ? 1 : 2;
      const puT = prixUnitaireV === "-" ? 1 : 2;
      const mT = montantV === "-" ? 1 : 2;

      cellData[row] = {
        0: { v: ligne.designation || "-", s: { cl: { rgb: '#0F151B' } } },
        1: { v: ligne.unite || "-", s: { cl: { rgb: '#0F151B' }, ht: 2 } },
        2: {
          v: quantiteV,
          t: qT,
          s: { cl: { rgb: '#14479B' }, ff: 'JetBrains Mono', ht: 3 } // Saisie: Bleu
        },
        3: {
          v: prixUnitaireV,
          t: puT,
          s: { cl: { rgb: '#14634A' }, ff: 'JetBrains Mono', ht: 3 } // Hérité: Vert
        },
        4: {
          f: qT === 2 && puT === 2 ? `=C${row + 1}*D${row + 1}` : undefined,
          v: montantV,
          t: mT,
          s: { cl: { rgb: '#0F151B' }, ff: 'JetBrains Mono', ht: 3 } // Calculé: Noir
        }
      };
      row++;
    });

    // Sous-total du lot
    cellData[row] = {
      0: { v: `Sous-total — ${titre}`, s: { bl: 1, cl: { rgb: '#0F151B' } } },
      4: {
        v: lot.sousTotal || 0,
        t: 2,
        s: { bl: 1, cl: { rgb: '#0F151B' }, ff: 'JetBrains Mono', ht: 3, bg: { rgb: '#f3f4f6' } }
      }
    };
    row++;
    row++; // Ligne vide
  });

  return { cellData, columnData };
}




export function generateMetreSheet(metreParNiveau) {
  const cellData = {};
  const columnData = {
    0: { hd: 0, hidden: 0, w: 150 }, // Niveau
    1: { hd: 0, hidden: 0, w: 250 }, // Ouvrage
    2: { hd: 0, hidden: 0, w: 100 }, // Total
    3: { hd: 0, hidden: 0, w: 80 }   // Unité
  };

  cellData[0] = {
    0: { v: 'Niveau', s: { bl: 1, bg: { rgb: '#f3f4f6' }, cl: { rgb: '#0F151B' } } },
    1: { v: 'Ouvrage', s: { bl: 1, bg: { rgb: '#f3f4f6' }, cl: { rgb: '#0F151B' } } },
    2: { v: 'Total Calculé', s: { bl: 1, bg: { rgb: '#f3f4f6' }, cl: { rgb: '#0F151B' } } },
    3: { v: 'Unité', s: { bl: 1, bg: { rgb: '#f3f4f6' }, cl: { rgb: '#0F151B' } } }
  };

  if (!metreParNiveau) return { cellData, columnData };

  let row = 1;
  metreParNiveau.forEach(mn => {
    const niveauId = mn.niveauId;
    const blocs = mn.metre?.blocs || {};

    Object.entries(blocs).forEach(([cleBloc, bloc]) => {
      cellData[row] = {
        0: { v: niveauId },
        1: { v: bloc.libelle || cleBloc },
        2: { 
          v: bloc.total || 0,
          t: 2, 
          s: { cl: { rgb: '#0F151B' }, ff: 'JetBrains Mono' } 
        },
        3: { v: bloc.unite || '-' }
      };
      row++;
    });
  });

  return { cellData, columnData };
}

export function generateParametresSheet(projet) {
  const cellData = {};
  const columnData = {
    0: { hd: 0, hidden: 0, w: 200 }, // Paramètre
    1: { hd: 0, hidden: 0, w: 150 }, // Valeur
    2: { hd: 0, hidden: 0, w: 250 }  // Description
  };

  cellData[0] = {
    0: { v: 'Paramètre (Nom Défini)', s: { bl: 1, bg: { rgb: '#f3f4f6' }, cl: { rgb: '#0F151B' } } },
    1: { v: 'Valeur', s: { bl: 1, bg: { rgb: '#f3f4f6' }, cl: { rgb: '#0F151B' } } },
    2: { v: 'Catégorie', s: { bl: 1, bg: { rgb: '#f3f4f6' }, cl: { rgb: '#0F151B' } } }
  };

  if (!projet) return { cellData, columnData };

  let row = 1;

  if (projet.taux) {
    Object.entries(projet.taux).forEach(([key, value]) => {
      cellData[row] = {
        0: { v: `TAUX_${key.toUpperCase()}`, s: { ff: 'JetBrains Mono' } },
        1: { v: value, t: 2, s: { cl: { rgb: '#14634A' }, ff: 'JetBrains Mono' } },
        2: { v: 'Taux' }
      };
      row++;
    });
  }

  if (projet.parametresProjet) {
    Object.entries(projet.parametresProjet).forEach(([key, value]) => {
      cellData[row] = {
        0: { v: key.toUpperCase(), s: { ff: 'JetBrains Mono' } },
        1: { v: value, t: typeof value === 'number' ? 2 : 1, s: { cl: { rgb: '#14634A' }, ff: 'JetBrains Mono' } },
        2: { v: 'Paramètre Global' }
      };
      row++;
    });
  }

  if (projet.bibliothequePrix) {
    Object.entries(projet.bibliothequePrix).forEach(([key, value]) => {
      cellData[row] = {
        0: { v: `PU_${key.toUpperCase()}`, s: { ff: 'JetBrains Mono' } },
        1: { v: value, t: 2, s: { cl: { rgb: '#14634A' }, ff: 'JetBrains Mono' } },
        2: { v: 'Prix Unitaire' }
      };
      row++;
    });
  }

  return { cellData, columnData };
}
