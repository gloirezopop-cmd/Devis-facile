import { calculerMetre, _internes as metreInternes } from './metre.js';
import { calculerRecettes } from './recettes.js';
import { PARAMETRES } from './parametres.js';

const { net } = metreInternes;

/**
 * Noms des lots standardisés pour la Note de Calcul.
 */
export const LOTS_NOTE_DE_CALCUL = {
  terrassement: '1. Terrassement et Préparation',
  fondation: '2. Fondations',
  soubassement: '3. Soubassement',
  elevation: '4. Élévation (Murs et Maçonnerie)',
  beton_arme: '5. Béton Armé et Structure',
  plancher: '6. Planchers',
  toiture: '7. Charpente et Toiture',
  finitions: '8. Revêtements et Finitions',
};

/**
 * Association entre identifiants techniques et Lots de la Note de Calcul.
 */
const CATALOGUE_LOTS = {
  fouilles: 'terrassement',
  fouilleFilante: 'terrassement',
  remblai: 'terrassement',
  betonProprete: 'fondation',
  semelles: 'fondation',
  longrines: 'fondation',
  moellon: 'fondation',
  chapeEgalisation: 'fondation',
  sousPavement: 'fondation',
  murSoubassement: 'soubassement',
  soubassement: 'soubassement',
  maconnerie: 'elevation',
  poteaux: 'beton_arme',
  colonnes: 'beton_arme',
  poutres: 'beton_arme',
  ceintures: 'beton_arme',
  linteaux: 'beton_arme',
  escalier: 'beton_arme',
  dalles: 'plancher',
  plancherHourdis: 'plancher',
  charpenteBois: 'toiture',
  couvertureToles: 'toiture',
  acrotere: 'toiture',
  formePente: 'toiture',
  enduits: 'finitions',
  carrelage: 'finitions',
  faience: 'finitions',
  peinture: 'finitions',
};

/**
 * Construit l'application numérique lisible (remplace les variables par les valeurs).
 */
function construireApplication(formule, entrees) {
  if (!formule || !entrees) return '—';
  let expr = formule;

  const mapRemplacements = {
    'N': entrees.nombre,
    'L': entrees.longueur,
    'l': entrees.largeur,
    'h': entrees.hauteur ?? entrees.profondeur,
    'Ep': entrees.epaisseur,
    'S': entrees.surface,
    'H': entrees.hauteur,
  };

  for (const [varName, val] of Object.entries(mapRemplacements)) {
    if (val !== undefined && val !== null) {
      const valFormatee = typeof val === 'number' ? String(net(val)) : String(val);
      expr = expr.replace(new RegExp(`\\b${varName}\\b`, 'g'), valFormatee);
    }
  }

  return expr;
}

/**
 * Génère la Note de Calcul complète à partir de la saisie.
 *
 * Source de vérité unique pour :
 * - La Note de Calcul (explications, formules, décompositions)
 * - Le Devis Entreprise (quantités d'ouvrages)
 * - Le Devis Particulier (décomposition globale et par ouvrage)
 *
 * @param {object} saisie - Lignes de métré saisies.
 * @param {object} regles - Règles de calcul.
 * @returns {object} Structure complète de la note de calcul.
 */
export function genererNoteDeCalcul(saisie = {}, regles = {}) {
  let saisieGlobale = {};
  if (Array.isArray(saisie)) {
    for (const item of saisie) {
      const s = item?.saisie || item;
      if (!s || typeof s !== 'object') continue;
      for (const [k, v] of Object.entries(s)) {
        if (Array.isArray(v)) {
          if (!saisieGlobale[k]) saisieGlobale[k] = [];
          saisieGlobale[k].push(...v);
        }
      }
    }
  } else {
    saisieGlobale = saisie;
  }

  const { blocs, avertissements } = calculerMetre(saisieGlobale, regles);
  const recettes = calculerRecettes(blocs, regles);

  const lots = {};
  for (const key of Object.keys(LOTS_NOTE_DE_CALCUL)) {
    lots[key] = {
      id_lot: key,
      nom: LOTS_NOTE_DE_CALCUL[key],
      ouvrages: [],
    };
  }

  const indexOuvrages = {};

  for (const [blocId, bloc] of Object.entries(blocs)) {
    if (!bloc || typeof bloc !== 'object') continue;
    if (!(bloc.total > 0) && (!bloc.lignes || bloc.lignes.length === 0)) continue;

    const lotKey = CATALOGUE_LOTS[blocId] || 'beton_arme';

    const ouvrage = {
      id_ouvrage: blocId,
      nom: bloc.libelle || blocId,
      lot: LOTS_NOTE_DE_CALCUL[lotKey],
      unite: bloc.unite || 'm³',
      total_brut: bloc.total || 0,
      total_arrondi: bloc.total || 0,
      motif_arrondi: 'Arrondi standard à 2 décimales pour l\'affichage du devis',
      lignes: [],
      decomposition_materiaux: [],
      armatures: null,
    };

    if (bloc.lignes && bloc.lignes.length > 0) {
      let lineIndex = 0;
      for (const l of bloc.lignes) {
        lineIndex++;
        const idLigne = `${blocId}_${lineIndex}`;
        const val = l.valeur ?? l.surface ?? l.volume ?? 0;
        if (val === null || val === undefined) continue;

        const entreesClean = {};
        if (l.nombre !== undefined) entreesClean.nombre = l.nombre;
        if (l.longueur !== undefined) entreesClean.longueur = l.longueur;
        if (l.largeur !== undefined) entreesClean.largeur = l.largeur;
        if (l.hauteur !== undefined) entreesClean.hauteur = l.hauteur;
        if (l.profondeur !== undefined) entreesClean.profondeur = l.profondeur;
        if (l.epaisseur !== undefined) entreesClean.epaisseur = l.epaisseur;
        if (l.surface !== undefined) entreesClean.surface = l.surface;

        const application = l.trace?.calcul 
          ? l.trace.calcul 
          : construireApplication(l.trace?.formule || bloc.formule || 'N × L × l × h', entreesClean);

        ouvrage.lignes.push({
          id_ligne: idLigne,
          repere: l.repere || `Ligne ${lineIndex}`,
          donnees: entreesClean,
          formule: l.trace?.formule || bloc.formule || 'N × L × l × h',
          application,
          valeur_brute: val,
          valeur_arrondie: net(val),
          unite: l.unite || bloc.unite || 'm³',
          armature: l.armature || null,
          coffrage: l.coffrage || null,
        });
      }
    }

    // Décomposition automatique des matériaux pour cet ouvrage
    const volumeBeton = bloc.unite === 'm3' ? bloc.total : null;
    const surfaceMaconnerie = (blocId === 'maconnerie' || blocId === 'murSoubassement') ? bloc.total : null;

    if (volumeBeton && volumeBeton > 0) {
      // Dosage par défaut selon le bloc
      const dosage = (blocId === 'betonProprete') ? 150 : 350;
      const poidsSac = PARAMETRES.beton.poidsSacCiment || 50;

      const sacsCimentBrut = (volumeBeton * dosage) / poidsSac;
      const sacsCimentArrondi = Math.ceil(sacsCimentBrut);

      ouvrage.decomposition_materiaux.push({
        id_materiau: `${blocId}_ciment`,
        nom: 'Ciment (CPJ 35)',
        dosage: `${dosage} kg/m³`,
        donnees: { volume_beton: volumeBeton, dosage, poids_sac: poidsSac },
        formule: 'Nb sacs = (Volume × Dosage) / Poids du sac',
        calcul: `(${volumeBeton} × ${dosage}) / ${poidsSac}`,
        valeur_brute: net(sacsCimentBrut),
        valeur_arrondie: sacsCimentArrondi,
        unite: 'sac',
        motif_arrondi: 'Arrondi au sac supérieur pour garantir l\'approvisionnement du chantier',
      });

      // Sable
      const volSable = net(volumeBeton * PARAMETRES.beton.sableParM3);
      const tonnesSable = net(volSable * PARAMETRES.beton.densiteSable);
      ouvrage.decomposition_materiaux.push({
        id_materiau: `${blocId}_sable`,
        nom: 'Sable de rivière',
        donnees: { volume_beton: volumeBeton, ratio: PARAMETRES.beton.sableParM3, densite: PARAMETRES.beton.densiteSable },
        formule: 'Tonnes = Volume × Ratio Sable × Densité',
        calcul: `${volumeBeton} × ${PARAMETRES.beton.sableParM3} × ${PARAMETRES.beton.densiteSable}`,
        valeur_brute: tonnesSable,
        valeur_arrondie: net(tonnesSable),
        unite: 't',
        motif_arrondi: 'Valeur exacte',
      });

      // Gravier
      const volGravier = net(volumeBeton * PARAMETRES.beton.gravierParM3);
      const tonnesGravier = net(volGravier * PARAMETRES.beton.densiteGravier);
      ouvrage.decomposition_materiaux.push({
        id_materiau: `${blocId}_gravier`,
        nom: 'Gravier 15/25',
        donnees: { volume_beton: volumeBeton, ratio: PARAMETRES.beton.gravierParM3, densite: PARAMETRES.beton.densiteGravier },
        formule: 'Tonnes = Volume × Ratio Gravier × Densité',
        calcul: `${volumeBeton} × ${PARAMETRES.beton.gravierParM3} × ${PARAMETRES.beton.densiteGravier}`,
        valeur_brute: tonnesGravier,
        valeur_arrondie: net(tonnesGravier),
        unite: 't',
        motif_arrondi: 'Valeur exacte',
      });
    } else if (surfaceMaconnerie && surfaceMaconnerie > 0) {
      const nbAgglosParM2 = 12.5;
      const agglosBrut = surfaceMaconnerie * nbAgglosParM2;
      const agglosArrondi = Math.ceil(agglosBrut);

      ouvrage.decomposition_materiaux.push({
        id_materiau: `${blocId}_agglos`,
        nom: 'Agglos (parpaings)',
        donnees: { surface: surfaceMaconnerie, ratio: nbAgglosParM2 },
        formule: 'Quantité = Surface × 12,5 agglos/m²',
        calcul: `${surfaceMaconnerie} × 12,5`,
        valeur_brute: net(agglosBrut),
        valeur_arrondie: agglosArrondi,
        unite: 'u',
        motif_arrondi: 'Arrondi à l\'unité supérieure',
      });
    }

    if (lots[lotKey]) {
      lots[lotKey].ouvrages.push(ouvrage);
    }
    indexOuvrages[blocId] = ouvrage;
  }

  return {
    lots: Object.values(lots).filter((l) => l.ouvrages.length > 0),
    indexOuvrages,
    recettesGlobales: recettes,
    avertissements,
  };
}
