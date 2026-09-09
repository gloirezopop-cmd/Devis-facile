import { nombreEnLettres } from '@devis-facile/moteur';

/**
 * Relecture d'un classeur Univer vers la forme « devis ».
 *
 * L'ecran, le PDF et le XLSX consomment tous le meme objet
 * ({ lots | niveaux, cascade, total }). Tant que la version modifiee restait un
 * classeur, elle n'etait affichable que par un second tableur — donc ni
 * imprimable, ni exportable, et l'apercu dependait du bon vouloir d'un canvas.
 * On la ramene ici vers cet objet unique : la feuille redevient un editeur du
 * devis, pas une deuxieme base de donnees.
 *
 * Les montants ne sont jamais recopies tels quels : ils sont recalcules
 * (P.T. = Qte x P.U., sous-total = somme du lot, total = somme des sous-totaux).
 * Une feuille dont l'utilisateur a efface ou casse une formule reste donc juste.
 */

// A N° | B DESIGNATION | C UNITE | D QTTE | E P.U. | F P.T. — l'ordre ecrit par
// generateWorkbookData(). Le lecteur et l'ecrivain doivent bouger ensemble.
const COL_NUMERO = 0;
const COL_DESIGNATION = 1;
const COL_UNITE = 2;
const COL_QUANTITE = 3;
const COL_PU = 4;
const COL_PT = 5;

const normaliser = (texte) =>
  texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Univer range le contenu dans `v`, ou dans un petit document `p` des que la
 * cellule porte du texte riche. Ignorer `p` ferait disparaitre toute ligne que
 * l'utilisateur a mise en forme mot par mot.
 */
function texteCellule(cellule) {
  if (!cellule) return '';
  if (cellule.v !== undefined && cellule.v !== null) return String(cellule.v).trim();
  const flux = cellule.p?.body?.dataStream;
  if (typeof flux === 'string') return flux.replace(/[\r\n\0]/g, '').trim();
  return '';
}

function nombreCellule(cellule) {
  const brut = texteCellule(cellule);
  if (!brut) return null;
  // Espaces des milliers (dont l'insecable et la fine) et virgule decimale :
  // ce que l'utilisateur tape a la main dans une feuille francaise.
  const nettoye = brut.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
  if (!/^-?\d*\.?\d+$/.test(nettoye)) return null;
  const valeur = Number(nettoye);
  return Number.isFinite(valeur) ? valeur : null;
}

/**
 * Les lignes de frais sont ecrites en formule vivante `=ROUND(F42*0,1925;0)`.
 * Relire le taux plutot que le montant permet de reappliquer le pourcentage au
 * nouveau total : changer une quantite doit faire suivre la TVA.
 */
function tauxDepuisFormule(cellule) {
  const formule = cellule?.f;
  if (typeof formule !== 'string') return null;
  const trouve = formule.match(/\*\s*(\d*\.?\d+)\s*[,;)]/);
  if (!trouve) return null;
  const taux = Number(trouve[1]);
  return Number.isFinite(taux) ? taux : null;
}

function trouverFeuille(classeur, cle) {
  const feuilles = classeur?.sheets;
  if (!feuilles || typeof feuilles !== 'object') return null;
  if (feuilles[cle]) return feuilles[cle];
  const parNom = Object.values(feuilles).find((f) => normaliser(f?.name || '').includes(normaliser(cle)));
  if (parNom) return parNom;
  // Dernier recours : la position d'origine du classeur genere.
  const ordre = Array.isArray(classeur.sheetOrder) ? classeur.sheetOrder : Object.keys(feuilles);
  return feuilles[ordre[cle === 'entreprise' ? 1 : 0]] || null;
}

/** Deux frais homonymes ne doivent pas s'ecraser dans le recapitulatif. */
function ajouterAuRecapitulatif(recapitulatif, libelle, montant) {
  let cle = libelle || 'Divers';
  while (Object.prototype.hasOwnProperty.call(recapitulatif, cle)) cle += ' ';
  recapitulatif[cle] = montant;
}

/**
 * @param {object} classeur  instantane rendu par TableurDevis.getSnapshot()
 * @param {'particulier'|'entreprise'} cle  la feuille a relire
 * @returns {object|null} un devis de la meme forme que celui du moteur
 */
export function lireDevisDuClasseur(classeur, cle) {
  const feuille = trouverFeuille(classeur, cle);
  const cellules = feuille?.cellData;
  if (!cellules || typeof cellules !== 'object') return null;

  const rangs = Object.keys(cellules)
    .map(Number)
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b);

  const groupes = [];
  let courant = null;
  let apresTotal = false;
  let libelleTotal = 'TOTAL';
  let libelleFinal = cle === 'entreprise' ? 'NET À PAYER' : 'TOTAL GÉNÉRAL';
  const frais = [];

  for (const rang of rangs) {
    const ligne = cellules[rang];
    if (!ligne) continue;

    const numero = texteCellule(ligne[COL_NUMERO]);
    const designation = texteCellule(ligne[COL_DESIGNATION]);
    const unite = texteCellule(ligne[COL_UNITE]);
    const quantite = nombreCellule(ligne[COL_QUANTITE]);
    const pu = nombreCellule(ligne[COL_PU]);
    const libelle = normaliser(designation);

    // Titre du document, ligne de respiration, lignes videes : rien a lire.
    if (!designation && quantite === null && pu === null) continue;
    if (libelle === 'DESIGNATION') continue; // la ligne d'en-tetes

    // Les rangs de synthese n'ont jamais de numero — un lot nomme « Total
    // provisoire » ne doit pas etre confondu avec le total du devis.
    if (!numero) {
      if (/^SOUS[- ]?TOTAL/.test(libelle)) continue; // recalcule plus bas
      if (/^(TOTAL GENERAL|NET A PAYER)$/.test(libelle)) {
        libelleFinal = designation;
        apresTotal = true;
        continue;
      }
      if (/^TOTAL( HT)?$/.test(libelle)) {
        libelleTotal = designation;
        apresTotal = true;
        continue;
      }
    }

    if (apresTotal) {
      frais.push({
        libelle: designation,
        taux: tauxDepuisFormule(ligne[COL_PT]),
        montant: nombreCellule(ligne[COL_PT]) ?? 0,
      });
      continue;
    }

    const estNumeroLigne = /^\d+(\.\d+)+$/.test(numero);
    const estEnteteDeLot =
      !estNumeroLigne && /^\d+$/.test(numero) && !unite && quantite === null && pu === null;

    if (estEnteteDeLot) {
      courant = { cle: `bloc${groupes.length + 1}`, titre: designation, lignes: [] };
      groupes.push(courant);
      continue;
    }

    // Une ligne ajoutee a la main n'a ni numero ni lot : on la rattache au lot
    // ouvert plutot que de la perdre.
    if (!courant) {
      courant = { cle: 'bloc1', titre: 'Ouvrages', lignes: [] };
      groupes.push(courant);
    }

    const pt =
      quantite !== null && pu !== null
        ? quantite * pu
        : nombreCellule(ligne[COL_PT]) ?? 0;

    courant.lignes.push({
      id: `${feuille.id || cle}_${rang}`,
      designation,
      unite,
      quantite: quantite ?? 0,
      pu: pu ?? 0,
      pt,
      avertissements: [],
    });
  }

  const remplis = groupes.filter((g) => g.lignes.length > 0);
  if (remplis.length === 0) return null;

  const sections = {};
  let totalBase = 0;
  for (const groupe of remplis) {
    const sousTotal = groupe.lignes.reduce((somme, l) => somme + (l.pt || 0), 0);
    totalBase += sousTotal;
    // `titre` sert au PDF/XLSX, `nom` a l'ecran : les deux lisent le meme libelle.
    sections[groupe.cle] = { titre: groupe.titre, nom: groupe.titre, lignes: groupe.lignes, sousTotal };
  }

  const cascade = {};
  ajouterAuRecapitulatif(cascade, libelleTotal, totalBase);

  let totalFinal = totalBase;
  for (const f of frais) {
    const montant = f.taux !== null ? Math.round(totalBase * f.taux) : f.montant;
    totalFinal += montant;
    ajouterAuRecapitulatif(cascade, f.libelle, montant);
  }

  // Cle canonique pour la derniere ligne : l'ecran la retire du recapitulatif
  // (elle y figure deja comme total) et le PDF la souligne.
  cascade[/NET A PAYER/.test(normaliser(libelleFinal)) ? 'netAPayer' : 'totalGeneral'] = totalFinal;

  return {
    [cle === 'entreprise' ? 'niveaux' : 'lots']: sections,
    cascade,
    total: totalFinal,
    enToutesLettres: nombreEnLettres(totalFinal),
  };
}
