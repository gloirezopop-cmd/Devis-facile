import { calculerMetre, _internes as metreInternes } from './metre.js';
import { obtenirDecompositionOuvrage } from './recettes.js';
import { calculerTerrassement } from './terrassement.js';
import { filDeLigature } from './armature.js';

const { net } = metreInternes;

/**
 * Le Résumé « ordre du chantier » : les mêmes ouvrages que la Note de Calcul,
 * mais rangés sous six grands titres — Terrassement, Fondation, Élévation,
 * Plancher, Toiture, Finitions — chacun donnant, poste par poste, le volume
 * puis les matériaux qu'il faut vraiment commander : ciment, sable, gravier,
 * eau, et pour le béton armé, le fer regroupé par diamètre plus le fil
 * d'attache.
 *
 * Le découpage en grands titres n'est pas inventé ici : c'est celui déjà
 * retenu pour le Devis Particulier (`BLOCS_PARTICULIER` dans valorisation.js),
 * qui fait autorité sur « quel ouvrage appartient à quelle phase du chantier ».
 * Soubassement et Béton Armé n'y sont pas des phases séparées : les murs de
 * soubassement rejoignent la Fondation, les poteaux rejoignent l'Élévation.
 */
export const GRANDS_TITRES_CHANTIER = {
  terrassement: '1. Terrassement',
  fondation: '2. Fondation',
  elevation: '3. Élévation',
  plancher: '4. Plancher',
  toiture: '5. Toiture',
  finition: '6. Finitions',
};

/**
 * Un poste par ouvrage — sauf les semelles et les amorces, fusionnées en un
 * seul : une amorce est la suite directe de sa semelle, du même béton, et un
 * projet qui n'a jamais utilisé le bloc « amorces » séparé (l'ancien format
 * où l'amorce était intégrée à la semelle) ne doit pas se retrouver avec une
 * ligne « Amorces » à zéro.
 *
 * `arme` dit si le poste doit chercher du fer dans `detailsArmatures` ; les
 * ouvrages non armés (béton de propreté, agglos, coffrage bois) n'en portent
 * jamais, et ne doivent jamais en afficher à zéro par erreur d'inattention.
 */
const POSTES = [
  // ── Fondation ──
  { titre: 'fondation', ids: ['betonProprete'], arme: false,
    nom: (d) => `Béton de propreté${d ? ` ${d} kg/m³` : ''}` },
  { titre: 'fondation', ids: ['semelles', 'amorces'], arme: true,
    nom: (d) => `Béton armé pour semelles et amorces${d ? ` (dosage ${d} kg/m³)` : ''}` },
  { titre: 'fondation', ids: ['longrines'], arme: true,
    nom: (d) => `Béton armé pour longrines${d ? ` (dosage ${d} kg/m³)` : ''}` },
  // La saisie parle de « soubassement » ; c'est aussi le nom du bloc que
  // calculerMetre() produit réellement — `murSoubassement` n'existe pas comme
  // clé de `blocs`, seul son total à zéro y répond, en silence.
  { titre: 'fondation', ids: ['soubassement'], arme: false,
    nom: () => 'Murs de soubassement (agglos)' },
  { titre: 'fondation', ids: ['moellon'], arme: false,
    nom: () => 'Fondation en moellon' },
  { titre: 'fondation', ids: ['dallage'], arme: false,
    nom: () => 'Dallage' },
  { titre: 'fondation', ids: ['sousPavement'], arme: false,
    nom: () => 'Béton de sous-pavement' },

  // ── Élévation ──
  { titre: 'elevation', ids: ['maconnerie'], arme: false,
    nom: () => 'Maçonnerie en agglos' },
  { titre: 'elevation', ids: ['poteaux', 'colonnes'], arme: true,
    nom: (d) => `Béton armé pour poteaux${d ? ` (dosage ${d} kg/m³)` : ''}` },
  { titre: 'elevation', ids: ['poutres'], arme: true,
    nom: (d) => `Béton armé pour poutres${d ? ` (dosage ${d} kg/m³)` : ''}` },
  { titre: 'elevation', ids: ['ceintures'], arme: true,
    nom: (d) => `Béton armé pour ceintures et chaînages${d ? ` (dosage ${d} kg/m³)` : ''}` },
  { titre: 'elevation', ids: ['linteaux'], arme: true,
    nom: (d) => `Béton armé pour linteaux${d ? ` (dosage ${d} kg/m³)` : ''}` },
  { titre: 'elevation', ids: ['escalier'], arme: true,
    nom: (d) => `Béton armé pour escalier${d ? ` (dosage ${d} kg/m³)` : ''}` },

  // ── Plancher ──
  { titre: 'plancher', ids: ['dalles'], arme: true,
    nom: (d) => `Dalles pleines${d ? ` (dosage ${d} kg/m³)` : ''}` },
  { titre: 'plancher', ids: ['plancherHourdis'], arme: false,
    nom: () => 'Plancher hourdis' },

  // ── Toiture ──
  { titre: 'toiture', ids: ['charpenteBois'], arme: false,
    nom: () => 'Charpente bois' },
  { titre: 'toiture', ids: ['couvertureToles'], arme: false,
    nom: () => 'Couverture en tôles' },
  { titre: 'toiture', ids: ['acrotere'], arme: true,
    nom: (d) => `Chaînage acrotère${d ? ` (dosage ${d} kg/m³)` : ''}` },
  { titre: 'toiture', ids: ['formePente'], arme: false,
    nom: () => 'Forme de pente' },

  // ── Finitions ──
  { titre: 'finition', ids: ['enduits'], arme: false, nom: () => 'Enduits' },
  { titre: 'finition', ids: ['carrelage'], arme: false, nom: () => 'Carrelage' },
  { titre: 'finition', ids: ['faience'], arme: false, nom: () => 'Faïence' },
  { titre: 'finition', ids: ['peinture'], arme: false, nom: () => 'Peinture' },
];

/** Noms d'affichage des petites fournitures — sans le repère de ligne (« (S1) »),
 * qui n'a plus de sens une fois les postes additionnés pour tout le grand titre. */
const NOMS_AUTRES_POSTES = {
  planches: 'Planches de coffrage',
  chevrons: 'Chevrons',
  clous: 'Clous / pointes de coffrage',
};

const CATEGORIES_BETON = ['ciment', 'sable', 'gravier', 'eau'];

/** Construit un poste en fusionnant, si besoin, plusieurs blocs du métré (semelles + amorces). */
function construirePoste(spec, blocs, regles) {
  const blocsUtiles = spec.ids
    .map((id) => ({ id, bloc: blocs[id] }))
    .filter(({ bloc }) => bloc && bloc.total > 0);
  if (blocsUtiles.length === 0) return null;

  const volume = net(blocsUtiles.reduce((s, { bloc }) => s + (bloc.total || 0), 0));
  const unite = blocsUtiles[0].bloc.unite;

  const beton = {};
  const agglos = [];
  const autresPostes = [];
  const aciersParDiametre = new Map();
  let poidsAcierTotal = 0;

  for (const { id, bloc } of blocsUtiles) {
    const decomp = obtenirDecompositionOuvrage(id, bloc, regles);
    for (const mat of decomp) {
      if (CATEGORIES_BETON.includes(mat.categorie)) {
        if (!beton[mat.categorie]) {
          beton[mat.categorie] = { nom: mat.nom, unite: mat.unite, quantite: 0, dosage: mat.donnees?.dosage };
        }
        beton[mat.categorie].quantite = net(beton[mat.categorie].quantite + mat.valeur_arrondie);
      } else if (mat.categorie === 'bois' || mat.categorie === 'clous') {
        autresPostes.push(mat);
      } else if (typeof mat.categorie === 'string' && mat.categorie.startsWith('agglos')) {
        agglos.push({ nom: mat.nom, unite: mat.unite, quantite: mat.valeur_arrondie });
      }
    }

    if (spec.arme) {
      for (const ligne of bloc.lignes || []) {
        for (const a of ligne.detailsArmatures || []) {
          if (!aciersParDiametre.has(a.diametre)) {
            aciersParDiametre.set(a.diametre, { diametre: a.diametre, poids: 0, barres12m: 0 });
          }
          const entree = aciersParDiametre.get(a.diametre);
          entree.poids += a.poids || 0;
          entree.barres12m += a.nombreBarres12m || 0;
          poidsAcierTotal += a.poids || 0;
        }
      }
    }
  }

  const dosage = CATEGORIES_BETON.map((c) => beton[c]?.dosage).find(Boolean) || null;

  return {
    id: spec.ids.join('_'),
    nom: spec.nom(dosage),
    volume,
    unite,
    beton: Object.keys(beton).length > 0 ? beton : null,
    agglos,
    aciers: [...aciersParDiametre.values()]
      .sort((a, b) => a.diametre - b.diametre)
      .map((a) => ({ diametre: a.diametre, poids: net(a.poids), barres12m: a.barres12m })),
    filAttache: poidsAcierTotal > 0 ? filDeLigature(poidsAcierTotal) : 0,
    autresPostes,
  };
}

/**
 * Les lots que le métré ne calcule pas : électricité, plomberie, plafond,
 * ouvertures… Il n'existe pas de formule universelle pour eux — le nombre de
 * points lumineux ne se déduit d'aucune dimension. L'utilisateur les saisit
 * donc lui-même, et ils traversent le résumé tels quels, groupés par lot et
 * dans l'ordre où il les a créés.
 */
function grouperLotsLibres(lignes) {
  const parLot = new Map();
  for (const ligne of lignes) {
    if (!ligne) continue;
    const nom = (ligne.lot || 'Autres ouvrages').trim() || 'Autres ouvrages';
    if (!parLot.has(nom)) parLot.set(nom, { id: `libre_${parLot.size + 1}`, titre: nom, lignes: [] });
    parLot.get(nom).lignes.push({
      id: ligne.id,
      designation: ligne.designation,
      unite: ligne.unite,
      quantite: ligne.quantite,
    });
  }
  return [...parLot.values()];
}

/** Additionne les petites fournitures de tous les postes d'un même grand titre. */
function agregerAutresPostes(entrees) {
  const parId = new Map();
  for (const mat of entrees) {
    if (!parId.has(mat.id_materiau)) {
      parId.set(mat.id_materiau, {
        id_materiau: mat.id_materiau,
        nom: NOMS_AUTRES_POSTES[mat.id_materiau] || mat.nom,
        unite: mat.unite,
        quantite: 0,
      });
    }
    const entree = parId.get(mat.id_materiau);
    entree.quantite = net(entree.quantite + mat.valeur_arrondie);
  }
  return [...parId.values()];
}

/**
 * Génère le Résumé dans l'ordre du chantier.
 *
 * @param {object|Array} saisie - Lignes de métré saisies, ou `metreParNiveau`
 *   (`[{ niveau, saisie, metre }]`), comme pour `genererNoteDeCalcul`.
 * @param {object} regles - Règles de calcul (dosages, taux…).
 */
export function genererResumeChantier(saisie = {}, regles = {}) {
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
    saisieGlobale = saisie || {};
  }

  const { blocs, avertissements } = calculerMetre(saisieGlobale, regles);

  // Déblai et remblai ne sont pas une saisie : ce sont les deux seules lignes
  // du Terrassement, et elles se déduisent des fouilles et des ouvrages
  // enterrés — le même calcul que celui affiché dans l'onglet Terrassement et
  // dans la Note de Calcul.
  const terrassement = calculerTerrassement(blocs, saisieGlobale, regles, avertissements);

  const parTitre = {};
  for (const id of Object.keys(GRANDS_TITRES_CHANTIER)) {
    parTitre[id] = { id, titre: GRANDS_TITRES_CHANTIER[id], postes: [], autresPostesBrut: [] };
  }

  if (terrassement.deblais.volumeNet > 0 || terrassement.remblais.volumeTasse > 0) {
    parTitre.terrassement.postes.push(
      { id: 'deblai', nom: 'Déblai', volume: net(terrassement.deblais.volumeFoisonne), unite: 'm³',
        beton: null, agglos: [], aciers: [], filAttache: 0 },
      { id: 'remblai', nom: 'Remblai', volume: net(terrassement.remblais.volumeTasse), unite: 'm³',
        beton: null, agglos: [], aciers: [], filAttache: 0 },
    );
  }

  for (const spec of POSTES) {
    const poste = construirePoste(spec, blocs, regles);
    if (!poste) continue;
    parTitre[spec.titre].autresPostesBrut.push(...poste.autresPostes);
    delete poste.autresPostes;
    parTitre[spec.titre].postes.push(poste);
  }

  const titres = Object.values(parTitre)
    .filter((t) => t.postes.length > 0)
    .map(({ autresPostesBrut, ...t }) => ({ ...t, autresPostes: agregerAutresPostes(autresPostesBrut) }));

  const lotsLibres = grouperLotsLibres(blocs.autresOuvrages?.lignes || []);

  return { titres, lotsLibres, avertissements };
}
