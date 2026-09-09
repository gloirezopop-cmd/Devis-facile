import { PARAMETRES } from './parametres.js';

/**
 * Les deux devis, construits depuis le Résumé — lot par lot.
 *
 * Le Résumé est la source de vérité : il porte, pour chaque lot du chantier,
 * ses ouvrages élémentaires (avec leur métré, leur unité et leur dosage) et,
 * sous chacun, les fournitures qu'il consomme. Les deux devis n'en sont que
 * deux lectures :
 *
 *   lot → fournitures, regroupées et sommées  → DEVIS PARTICULIER
 *   lot → ouvrages élémentaires + métrés      → DEVIS ENTREPRISE
 *
 * Deux règles gouvernent tout le fichier :
 *
 *   1. Le regroupement des fournitures ne franchit JAMAIS la frontière d'un
 *      lot. Le ciment de la fondation et celui de l'élévation restent deux
 *      lignes, dans deux lots. C'est la confusion inverse qui faisait
 *      apparaître, dans le lot Fondation, le ciment de tout le projet.
 *
 *   2. Un ouvrage ne se transforme jamais en fournitures dans le Devis
 *      Entreprise, et une fourniture ne devient jamais un ouvrage dans le
 *      Devis Particulier. « Béton armé dosé à 350 kg/m³ — 20 m³ » reste une
 *      ligne d'ouvrage ; son ciment appartient à l'autre devis.
 */

/** Les lots du Résumé, rangés sous les identifiants que porte le Devis Particulier. */
const LOT_PARTICULIER = {
  fondation: 'fondation',
  elevation: 'elevation',
  plancher: 'plancher',
  toiture: 'charpente',
  finition: 'finition',
};

const prixDe = (id, bibliothequePrix) => {
  if (bibliothequePrix && bibliothequePrix[id] !== undefined) return Number(bibliothequePrix[id]) || 0;
  if (PARAMETRES.prixUnitaires[id] !== undefined) return Number(PARAMETRES.prixUnitaires[id]) || 0;
  return 0;
};

const arrondi = (v) => Math.round((v + Number.EPSILON) * 1000) / 1000;

/**
 * Toutes les fournitures d'un lot, regroupées par identifiant de prix et unité,
 * puis sommées. C'est la clé « LOT + DÉSIGNATION + UNITÉ » : deux lignes de
 * ciment du même lot fusionnent, celles de deux lots différents non.
 */
function fournituresDuLot(titre, inclureEau) {
  const parCle = new Map();

  const ajouter = (mat) => {
    if (!mat || !(mat.quantite > 0)) return;
    const id = mat.id || mat.id_materiau;
    if (!id) return;
    if (id === 'eau' && !inclureEau) return;
    const cle = `${id}|${mat.unite || ''}`;
    if (!parCle.has(cle)) {
      parCle.set(cle, { id, nom: mat.nom, unite: mat.unite || 'u', quantite: 0 });
    }
    const entree = parCle.get(cle);
    entree.quantite = arrondi(entree.quantite + mat.quantite);
  };

  for (const poste of titre.postes || []) {
    for (const mat of poste.materiaux || []) ajouter(mat);
  }
  // Planches, chevrons et clous : le moteur les additionne pour tout le lot.
  for (const mat of titre.autresPostes || []) ajouter(mat);

  return [...parCle.values()];
}

/**
 * @param {object} resume            sortie de genererResumeChantier()
 * @param {object} bibliothequePrix  prix par identifiant de fourniture
 * @param {object} libelles          libellés d'affichage par identifiant
 * @param {boolean} inclureEau       l'eau se facture-t-elle ?
 * @returns {{ lots: object, ordre: string[], total: number }}
 */
export function fournituresParLot(resume, bibliothequePrix, libelles = {}, inclureEau = false) {
  const lots = {};
  const ordre = [];
  let total = 0;

  for (const titre of resume?.titres || []) {
    const lotId = LOT_PARTICULIER[titre.id];
    if (!lotId) continue; // le terrassement se chiffre au m3, pas en fournitures

    const lignes = [];
    let sousTotal = 0;

    for (const mat of fournituresDuLot(titre, inclureEau)) {
      const pu = prixDe(mat.id, bibliothequePrix);
      const pt = Math.round(mat.quantite * pu);
      lignes.push({
        id: mat.id,
        designation: libelles[mat.id] || mat.nom || mat.id,
        unite: mat.unite,
        quantite: mat.quantite,
        pu,
        pt,
        avertissements: pu === 0 ? ['Prix manquant'] : [],
      });
      sousTotal += pt;
    }

    if (lignes.length === 0) continue;
    lots[lotId] = { titre: titreDuLot(titre), nom: titreDuLot(titre), lignes, sousTotal: Math.round(sousTotal) };
    ordre.push(lotId);
    total += sousTotal;
  }

  // Les lots que l'utilisateur a ajoutés lui-même ferment le devis, dans
  // l'ordre où il les a créés.
  for (const lot of resume?.lotsLibres || []) {
    const lignes = lot.lignes
      .filter((l) => l.quantite > 0)
      .map((l) => ({
        id: l.id,
        designation: l.designation,
        unite: l.unite,
        quantite: l.quantite,
        pu: l.pu,
        pt: Math.round(l.quantite * l.pu),
        avertissements: l.pu === 0 ? ['Prix manquant'] : [],
      }));
    if (lignes.length === 0) continue;
    const sousTotal = lignes.reduce((s, l) => s + l.pt, 0);
    lots[lot.id] = { titre: lot.titre, nom: lot.titre, lignes, sousTotal };
    ordre.push(lot.id);
    total += sousTotal;
  }

  return { lots, ordre, total };
}

/** « 2. Fondation » → « FONDATION » : la position dit déjà l'ordre. */
const titreDuLot = (titre) => String(titre.titre).replace(/^\s*\d+\.\s*/, '').toUpperCase();

const TITRES_ENTREPRISE_PAR_LOT = {
  terrassement: 'TERRASSEMENTS ET PREPARATION DU CHANTIER',
  fondation: 'I - FONDATION',
  elevation: 'II - ELEVATION',
  plancher: 'III - PLANCHER / DALLE',
  toiture: 'IV - TOITURE (charpente, couverture ou terrasse)',
  finition: 'V - FINITION',
};

/**
 * Les ouvrages élémentaires de chaque lot, avec leur métré tel que le Résumé
 * l'affiche. La désignation garde son dosage : « Béton de propreté 150 kg/m³ »
 * ne doit jamais se réduire à « Béton ».
 *
 * @param {function} sousDetail  (blocId, blocDonnees) → { prixVenteUnitaire, avertissements }
 * @param {object} blocs         les blocs du métré, pour les ratios du sous-détail
 */
export function ouvragesParLot(resume, { sousDetail, blocs = {} } = {}) {
  const lots = {};
  const ordre = [];
  let total = 0;

  for (const titre of resume?.titres || []) {
    const lignes = [];
    let sousTotal = 0;

    for (const poste of titre.postes || []) {
      if (!(poste.volume > 0)) continue;

      const blocFusionne = fusionnerBlocs(poste.blocIds || [], blocs, poste);
      const sd = sousDetail ? sousDetail(poste.blocIds?.[0] || poste.id, blocFusionne) : null;
      const pu = sd?.prixVenteUnitaire || 0;
      const pt = Math.round(poste.volume * pu);

      lignes.push({
        // Le bloc du metre, pas l'identifiant compose du poste : c'est lui qui
        // sert de cle stable pour retrouver un prix unitaire deja saisi.
        id: poste.blocIds?.[0] || poste.id,
        designation: poste.nom,
        unite: poste.unite,
        quantite: poste.volume,
        pu,
        pt,
        sousDetail: sd || undefined,
        avertissements: pu === 0 ? ['Prix manquant'] : (sd?.avertissements || []),
      });
      sousTotal += pt;
    }

    if (lignes.length === 0) continue;
    const nom = TITRES_ENTREPRISE_PAR_LOT[titre.id] || titreDuLot(titre);
    lots[titre.id] = { nom, titre: nom, lignes, sousTotal: Math.round(sousTotal) };
    ordre.push(titre.id);
    total += sousTotal;
  }

  for (const lot of resume?.lotsLibres || []) {
    const lignes = lot.lignes
      .filter((l) => l.quantite > 0)
      .map((l) => ({
        id: l.id,
        designation: l.designation,
        unite: l.unite,
        quantite: l.quantite,
        pu: l.pu,
        pt: Math.round(l.quantite * l.pu),
        avertissements: l.pu === 0 ? ['Prix manquant'] : [],
      }));
    if (lignes.length === 0) continue;
    const sousTotal = lignes.reduce((s, l) => s + l.pt, 0);
    lots[lot.id] = { nom: lot.titre, titre: lot.titre, lignes, sousTotal };
    ordre.push(lot.id);
    total += sousTotal;
  }

  return { lots, ordre, total };
}

/**
 * Un poste peut couvrir plusieurs blocs du métré (semelles + amorces). Le
 * sous-détail de prix a besoin des ratios d'acier et de coffrage de l'ensemble,
 * pas seulement du premier.
 */
function fusionnerBlocs(blocIds, blocs, poste) {
  const presents = blocIds.map((id) => blocs[id]).filter(Boolean);
  if (presents.length === 0) return { total: poste.volume, unite: poste.unite, lignes: [] };
  if (presents.length === 1) return presents[0];

  return presents.reduce(
    (fusion, bloc) => ({
      ...fusion,
      total: (fusion.total || 0) + (bloc.total || 0),
      totalCoffrage: (fusion.totalCoffrage || 0) + (bloc.totalCoffrage || 0),
      lignes: [...(fusion.lignes || []), ...(bloc.lignes || [])],
    }),
    { ...presents[0], total: 0, totalCoffrage: 0, lignes: [] },
  );
}
