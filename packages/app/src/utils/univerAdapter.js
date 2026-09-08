import {
  construireBordereauParticulier,
  construireBordereauEntreprise,
  TITRES_LOTS_ENTREPRISE,
} from '@devis-facile/moteur';

/**
 * Le classeur ne contient que les deux devis. Note de calcul, metre et
 * parametres ont leurs propres ecrans dans l'application : les dupliquer en
 * feuilles Excel obligeait a maintenir deux mises en page pour la meme donnee.
 *
 * Les deux feuilles sont construites a partir du meme bordereau que l'ecran et
 * les exports (`construireBordereau*` du moteur) : les chiffres et l'ordre ne
 * peuvent donc pas diverger entre ce qu'on voit et ce qu'on imprime.
 */
export function generateWorkbookData(devisParticulier, devisEntreprise, projet) {
  const particulier = genererFeuilleDevis(construireBordereauParticulier(devisParticulier), 'particulier');
  const entreprise = genererFeuilleDevis(
    construireBordereauEntreprise(devisEntreprise, Object.keys(TITRES_LOTS_ENTREPRISE)),
    'entreprise',
  );

  return {
    id: 'workbook-devis',
    sheetOrder: ['particulier', 'entreprise'],
    name: 'Devis Facile BTP',
    appVersion: '0.1.0',
    sheets: {
      particulier: {
        id: 'particulier',
        name: 'Devis Particulier',
        tabColor: '#14479B',
        rowCount: Math.max(150, particulier.nbLignes + 20),
        columnCount: 10,
        cellData: particulier.cellData,
        columnData: particulier.columnData,
        mergeData: MERGE_TITRE,
        freeze: { xSplit: 0, ySplit: 3, startRow: 3, startColumn: 0 },
      },
      entreprise: {
        id: 'entreprise',
        name: 'Devis Entreprise',
        tabColor: '#14634A',
        rowCount: Math.max(150, entreprise.nbLignes + 20),
        columnCount: 10,
        cellData: entreprise.cellData,
        columnData: entreprise.columnData,
        mergeData: MERGE_TITRE,
        freeze: { xSplit: 0, ySplit: 3, startRow: 3, startColumn: 0 },
      },
    },
    definedNames: generateDefinedNames(projet),
    /**
     * Correspondance ligne Excel -> identifiant de ligne du devis. C'est elle
     * qui permettra de renvoyer un prix unitaire modifie dans la feuille vers
     * la bibliotheque de prix, sans avoir a deviner l'identifiant a partir du
     * libelle affiche.
     */
    correspondanceLignes: {
      particulier: particulier.correspondance,
      entreprise: entreprise.correspondance,
    },
  };
}

function generateDefinedNames(projet) {
  const names = [];
  let idCounter = 1;

  if (!projet) return names;

  if (projet.taux) {
    Object.entries(projet.taux).forEach(([key, value]) => {
      names.push({ id: `dn_${idCounter++}`, name: `TAUX_${key.toUpperCase()}`, formulaOrRefString: String(value) });
    });
  }

  if (projet.parametresProjet) {
    Object.entries(projet.parametresProjet).forEach(([key, value]) => {
      if (typeof value !== 'number' && typeof value !== 'string') return;
      names.push({
        id: `dn_${idCounter++}`,
        name: key.toUpperCase(),
        formulaOrRefString: typeof value === 'number' ? String(value) : `"${value}"`,
      });
    });
  }

  if (projet.bibliothequePrix) {
    Object.entries(projet.bibliothequePrix).forEach(([key, value]) => {
      names.push({ id: `dn_${idCounter++}`, name: `PU_${key.toUpperCase()}`, formulaOrRefString: String(value) });
    });
  }

  return names;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ENCRE = '#0F151B';
const BORDURE = { s: 1, cl: { rgb: '#C3CCD6' } };
const CADRE = { t: BORDURE, b: BORDURE, l: BORDURE, r: BORDURE };

const CENTRE = 2;
const DROITE = 3;

// Univer ecrit un separateur decimal residuel quand le motif prevoit des
// decimales et que la valeur est entiere (« 25. »). On choisit donc le motif
// d'apres la valeur, plutot que d'imposer le meme partout.
const FORMAT_MONNAIE = { pattern: '#,##0' };
const formatQuantite = (valeur) => (Number.isInteger(valeur) ? { pattern: '#,##0' } : { pattern: '#,##0.00' });

const styleTitreDocument = { bl: 1, fs: 14, cl: { rgb: '#14304D' }, ht: CENTRE };
const styleEnTete = { bl: 1, cl: { rgb: '#FFFFFF' }, bg: { rgb: '#14304D' }, ht: CENTRE, bd: CADRE };
const styleLot = { bl: 1, fs: 12, cl: { rgb: ENCRE }, bg: { rgb: '#E4E9EF' }, bd: CADRE };
const styleTexte = { cl: { rgb: ENCRE }, bd: CADRE };
const styleUnite = { cl: { rgb: ENCRE }, ht: CENTRE, bd: CADRE };
const styleQuantite = (valeur) => ({ cl: { rgb: ENCRE }, ff: 'JetBrains Mono', ht: DROITE, bd: CADRE, n: formatQuantite(valeur) });
// Bleu « saisie » : le prix unitaire est la seule colonne que l'utilisateur modifie.
const stylePrix = { cl: { rgb: '#14479B' }, ff: 'JetBrains Mono', ht: DROITE, bd: CADRE, n: FORMAT_MONNAIE };
const styleMontant = { cl: { rgb: ENCRE }, ff: 'JetBrains Mono', ht: DROITE, bd: CADRE, n: FORMAT_MONNAIE };
const styleSousTotal = { bl: 1, cl: { rgb: ENCRE }, bg: { rgb: '#F2F4F7' }, bd: CADRE };
const styleSousTotalMontant = { ...styleSousTotal, ff: 'JetBrains Mono', ht: DROITE, n: FORMAT_MONNAIE };
const styleTotal = { bl: 1, fs: 12, cl: { rgb: '#14304D' }, bg: { rgb: '#DCE3EC' }, bd: CADRE };
const styleTotalMontant = { ...styleTotal, ff: 'JetBrains Mono', ht: DROITE, n: FORMAT_MONNAIE };
const styleTotalGeneral = { bl: 1, fs: 13, cl: { rgb: '#FFFFFF' }, bg: { rgb: '#14304D' }, bd: CADRE };
const styleTotalGeneralMontant = { ...styleTotalGeneral, ff: 'JetBrains Mono', ht: DROITE, n: FORMAT_MONNAIE };
const styleLettres = { it: 1, cl: { rgb: '#4B5563' } };

const TITRE_DOCUMENT = "BORDEREAU QUANTITATIF ET ESTIMATIF DES TRAVAUX D'UN BÂTIMENT";

/** Le titre court sur les six colonnes du tableau, sinon il deborde de la colonne N°. */
const MERGE_TITRE = [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 5 }];
const EN_TETES = ['N°', 'DESIGNATION', 'UNITE', 'QTTE', 'P.U.', 'P.T.'];

/**
 * Les six colonnes de la maquette de reference, dans cet ordre :
 * A N° | B DESIGNATION | C UNITE | D QTTE | E P.U. | F P.T.
 * Le P.T. reste une formule `=D*E` et non une valeur figee : modifier le prix
 * unitaire dans la feuille recalcule le montant immediatement.
 */
function genererFeuilleDevis(bordereau, type) {
  const cellData = {};
  const correspondance = {};
  const columnData = {
    0: { hd: 0, hidden: 0, w: 60 },
    1: { hd: 0, hidden: 0, w: 300 },
    2: { hd: 0, hidden: 0, w: 70 },
    3: { hd: 0, hidden: 0, w: 90 },
    4: { hd: 0, hidden: 0, w: 110 },
    5: { hd: 0, hidden: 0, w: 130 },
  };

  cellData[0] = { 0: { v: TITRE_DOCUMENT, t: 1, s: styleTitreDocument } };
  let row = 2;

  cellData[row] = {};
  EN_TETES.forEach((libelle, i) => {
    cellData[row][i] = { v: libelle, t: 1, s: styleEnTete };
  });
  row += 1;

  if (!bordereau || bordereau.length === 0) {
    cellData[row] = {
      1: { v: type === 'entreprise'
        ? "Aucun ouvrage chiffré pour le moment — complétez le métré."
        : "Aucun matériau chiffré pour le moment — complétez le métré.", t: 1, s: styleLettres },
    };
    return { cellData, columnData, correspondance, nbLignes: row + 1 };
  }

  // Toute la cascade est ecrite en formules, pas en montants figes : changer un
  // prix unitaire doit faire suivre le P.T., le sous-total, le TOTAL, les frais
  // et le TOTAL GENERAL. Un chiffre fige aurait contredit la ligne du dessus
  // des que l'utilisateur touche un prix.
  let lignesDuLot = [];
  const cellulesSousTotaux = [];
  const cellulesFrais = [];
  let celluleTotal = null;

  for (const rang of bordereau) {
    if (rang.type === 'lot') {
      lignesDuLot = [];
      cellData[row] = {
        0: { v: rang.numero, t: 1, s: styleLot },
        1: { v: rang.libelle, t: 1, s: styleLot },
        2: { v: '', t: 1, s: styleLot },
        3: { v: '', t: 1, s: styleLot },
        4: { v: '', t: 1, s: styleLot },
        5: { v: '', t: 1, s: styleLot },
      };
    } else if (rang.type === 'ligne') {
      const ligneExcel = row + 1; // Univer indexe a 0, les formules a 1
      const quantiteConnue = typeof rang.quantite === 'number' && !Number.isNaN(rang.quantite);
      const prixConnu = typeof rang.pu === 'number' && !Number.isNaN(rang.pu);

      cellData[row] = {
        0: { v: rang.numero, t: 1, s: { ...styleTexte, ht: CENTRE } },
        1: { v: rang.designation ?? '', t: 1, s: styleTexte },
        2: { v: rang.unite ?? '', t: 1, s: styleUnite },
        3: quantiteConnue ? { v: rang.quantite, t: 2, s: styleQuantite(rang.quantite) } : { v: '—', t: 1, s: styleUnite },
        4: prixConnu ? { v: rang.pu, t: 2, s: stylePrix } : { v: '—', t: 1, s: styleUnite },
        5: quantiteConnue && prixConnu
          ? { f: `=D${ligneExcel}*E${ligneExcel}`, v: rang.pt, t: 2, s: styleMontant }
          : { v: '—', t: 1, s: styleUnite },
      };

      if (rang.id) correspondance[row] = rang.id;
      if (quantiteConnue && prixConnu) lignesDuLot.push(ligneExcel);
    } else if (rang.type === 'sousTotal') {
      const formule = lignesDuLot.length > 0
        ? `=SUM(F${lignesDuLot[0]}:F${lignesDuLot[lignesDuLot.length - 1]})`
        : undefined;
      cellData[row] = {
        0: { v: '', t: 1, s: styleSousTotal },
        1: { v: rang.libelle, t: 1, s: styleSousTotal },
        2: { v: '', t: 1, s: styleSousTotal },
        3: { v: '', t: 1, s: styleSousTotal },
        4: { v: '', t: 1, s: styleSousTotal },
        5: { f: formule, v: rang.montant ?? 0, t: 2, s: styleSousTotalMontant },
      };
      cellulesSousTotaux.push(`F${row + 1}`);
    } else if (rang.type === 'total') {
      row += 1; // une respiration avant le total
      const formule = cellulesSousTotaux.length > 0 ? `=${cellulesSousTotaux.join('+')}` : undefined;
      cellData[row] = {
        0: { v: '', t: 1, s: styleTotal },
        1: { v: rang.libelle, t: 1, s: styleTotal },
        2: { v: '', t: 1, s: styleTotal },
        3: { v: '', t: 1, s: styleTotal },
        4: { v: '', t: 1, s: styleTotal },
        5: { f: formule, v: rang.montant ?? 0, t: 2, s: styleTotalMontant },
      };
      celluleTotal = `F${row + 1}`;
    } else if (rang.type === 'frais') {
      const formule = celluleTotal && typeof rang.taux === 'number'
        ? `=ROUND(${celluleTotal}*${rang.taux},0)`
        : undefined;
      cellData[row] = {
        0: { v: rang.numero ?? '', t: 1, s: { ...styleTexte, ht: CENTRE } },
        1: { v: rang.libelle, t: 1, s: styleTexte },
        2: { v: '', t: 1, s: styleTexte },
        3: { v: '', t: 1, s: styleTexte },
        4: { v: '', t: 1, s: styleTexte },
        5: { f: formule, v: rang.montant ?? 0, t: 2, s: styleMontant },
      };
      cellulesFrais.push(`F${row + 1}`);
    } else if (rang.type === 'totalGeneral') {
      const parties = [celluleTotal, ...cellulesFrais].filter(Boolean);
      const formule = parties.length > 0 ? `=${parties.join('+')}` : undefined;
      cellData[row] = {
        0: { v: '', t: 1, s: styleTotalGeneral },
        1: { v: rang.libelle, t: 1, s: styleTotalGeneral },
        2: { v: '', t: 1, s: styleTotalGeneral },
        3: { v: '', t: 1, s: styleTotalGeneral },
        4: { v: '', t: 1, s: styleTotalGeneral },
        5: { f: formule, v: rang.montant ?? 0, t: 2, s: styleTotalGeneralMontant },
      };
      // Pas de montant en toutes lettres ici : la feuille est modifiable, et
      // une phrase figee sous un total vivant se met a mentir des que
      // l'utilisateur change un prix. Elle reste sur le PDF, qui ne bouge plus.
    }
    row += 1;
  }

  return { cellData, columnData, correspondance, nbLignes: row };
}
