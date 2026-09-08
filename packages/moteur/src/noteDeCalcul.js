import { calculerMetre, _internes as metreInternes } from './metre.js';
import { calculerRecettes, obtenirDecompositionOuvrage } from './recettes.js';
import { calculerTerrassement } from './terrassement.js';
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
  amorces: 'fondation',
  longrines: 'fondation',
  moellon: 'fondation',
  dallage: 'fondation',
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
    'a': entrees.longueur,
    'b': entrees.largeur,
    'd': entrees.diametre,
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

  // Le remblai ne se saisit plus : il se déduit des fouilles, des semelles,
  // des longrines et des murs de soubassement — le même calcul que celui
  // affiché dans l'onglet Terrassement. La note de calcul le montre ici,
  // juste à côté du déblai, plutôt que de laisser croire qu'il faudrait le
  // mesurer soi-même.
  const terrassement = calculerTerrassement(blocs, saisieGlobale, regles, avertissements);

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
      label_resultat: ['fouilles', 'fouilleFilante', 'terrassementGrandeSurface'].includes(blocId)
        ? 'Quantité de déblais'
        : 'Résultat',
      lignes: [],
      decomposition_materiaux: [],
      armatures: null,
    };

    if (bloc.lignes && bloc.lignes.length > 0) {
      let lineIndex = 0;
      for (const l of bloc.lignes) {
        lineIndex++;
        const idLigne = `${blocId}_${lineIndex}`;
        const val = l.valeur ?? l.surface ?? l.volume;
        if (val === null || val === undefined || val === 0 || isNaN(val)) continue;

        const entreesClean = {};
        if (l.nombre !== undefined) entreesClean.nombre = l.nombre;
        if (l.longueur !== undefined) entreesClean.longueur = l.longueur;
        if (l.largeur !== undefined) entreesClean.largeur = l.largeur;
        if (l.hauteur !== undefined) entreesClean.hauteur = l.hauteur;
        if (l.profondeur !== undefined) entreesClean.profondeur = l.profondeur;
        if (l.epaisseur !== undefined) entreesClean.epaisseur = l.epaisseur;
        if (l.surface !== undefined) entreesClean.surface = l.surface;

        let application = l.trace?.calcul 
          ? String(l.trace.calcul) 
          : construireApplication(l.trace?.formule || bloc.formule || 'N × L × l × h', entreesClean);

        if (l.trace?.deductions && l.trace.deductions.length > 0) {
          const deductText = l.trace.deductions.map(d => `${d.nombre} ${d.type} (${d.largeur}x${d.hauteur} = ${d.surface}m²)`).join(', ');
          application += ` - [Déductions : ${deductText}]`;
        }

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
    const detailsMateriaux = obtenirDecompositionOuvrage(blocId, bloc, regles);
    for (const mat of detailsMateriaux) {
      // On préfixe l'id_materiau par le blocId pour garantir l'unicité dans la vue UI
      mat.id_materiau = `${blocId}_${mat.id_materiau}`;
      ouvrage.decomposition_materiaux.push(mat);
    }
    
    // Ignorer si l'ouvrage est vide de toute saisie et matériaux (0 valeurs)
    if (ouvrage.lignes.length === 0 && ouvrage.decomposition_materiaux.length === 0) continue;

    if (lots[lotKey]) {
      lots[lotKey].ouvrages.push(ouvrage);
    }
    indexOuvrages[blocId] = ouvrage;
  }

  // Déblais et remblai, côte à côte, dans le lot Terrassement.
  //
  // Ce ne sont pas des ouvrages saisis : `deblais` totalise les fouilles,
  // `remblai` est le volume que les fouilles, une fois les ouvrages enterrés
  // en place, laissent à reboucher. Un remblai laissé à la saisie manuelle
  // aurait pu diverger de ce que le chantier remue réellement.
  if (terrassement.deblais.volumeNet > 0 || terrassement.remblais.volumeTasse > 0) {
    const Ct = PARAMETRES.coefficients.coefficientTassement || 1.3;
    const d = terrassement.details;

    const ouvrageDeblais = {
      id_ouvrage: 'deblais_auto',
      nom: 'Déblais (total)',
      lot: LOTS_NOTE_DE_CALCUL.terrassement,
      unite: 'm³',
      total_brut: terrassement.deblais.volumeFoisonne,
      total_arrondi: net(terrassement.deblais.volumeFoisonne),
      motif_arrondi: 'Arrondi standard à 2 décimales pour l\'affichage du devis',
      label_resultat: 'Volume foisonné',
      lignes: [{
        id_ligne: 'deblais_auto_1',
        repere: 'Automatique',
        donnees: { fouillesPuits: net(d.fouillesPuits), fouilleFilante: net(d.fouilleFilante) },
        formule: '(Fouilles puits + Fouilles filantes) × Ct',
        application: `(${net(d.fouillesPuits, 3)} + ${net(d.fouilleFilante, 3)}) × ${Ct} = ${net(terrassement.deblais.volumeFoisonne, 3)} m³`,
        valeur_brute: terrassement.deblais.volumeFoisonne,
        valeur_arrondie: net(terrassement.deblais.volumeFoisonne),
        unite: 'm³',
      }],
      decomposition_materiaux: [],
      armatures: null,
    };

    const ouvrageRemblai = {
      id_ouvrage: 'remblai_auto',
      nom: 'Remblai (calcul automatique)',
      lot: LOTS_NOTE_DE_CALCUL.terrassement,
      unite: 'm³',
      total_brut: terrassement.remblais.volumeTasse,
      total_arrondi: net(terrassement.remblais.volumeTasse),
      motif_arrondi: 'Arrondi standard à 2 décimales pour l\'affichage du devis',
      label_resultat: 'Volume à remblayer',
      lignes: [{
        id_ligne: 'remblai_auto_1',
        repere: 'Automatique',
        donnees: {
          videSemelles: net(d.videSemelles),
          videFilant: net(d.videFilant),
          nivellement: net(d.nivellement),
        },
        formule: 'Vide autour des semelles + vide autour des fouilles filantes + nivellement (chacun majoré du tassement, Ct = ' + Ct + ')',
        application: `${net(d.videSemelles, 3)} + ${net(d.videFilant, 3)} + ${net(d.nivellement, 3)} = ${net(terrassement.remblais.volumeTasse, 3)} m³`,
        valeur_brute: terrassement.remblais.volumeTasse,
        valeur_arrondie: net(terrassement.remblais.volumeTasse),
        unite: 'm³',
      }],
      decomposition_materiaux: [],
      armatures: null,
    };

    lots.terrassement.ouvrages.push(ouvrageDeblais, ouvrageRemblai);
    indexOuvrages.deblais_auto = ouvrageDeblais;
    indexOuvrages.remblai_auto = ouvrageRemblai;
  }

  return {
    lots: Object.values(lots).filter((l) => l.ouvrages.length > 0),
    indexOuvrages,
    recettesGlobales: recettes,
    avertissements,
  };
}
