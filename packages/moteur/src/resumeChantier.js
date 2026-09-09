import { calculerMetre, _internes as metreInternes } from './metre.js';
import { obtenirDecompositionOuvrage } from './recettes.js';
import { calculerTerrassement } from './terrassement.js';
import { filDeLigature } from './armature.js';
import { PARAMETRES } from './parametres.js';

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

/** L'ordre du classeur : le sable et le gravier d'abord, le ciment ensuite. */
const ORDRE_BETON = ['sable', 'gravier', 'ciment', 'eau'];

/**
 * Les recettes nomment les agglos `agglos_creux` / `agglos_pleins`, la
 * bibliothèque de prix les connaît sous `blocs` / `blocs_pleins`. Le Résumé
 * porte l'identifiant de prix pour que le devis puisse chiffrer la ligne.
 */
const PRIX_DES_AGGLOS = { agglos_creux: 'blocs', agglos_pleins: 'blocs_pleins' };

/** L'identifiant sous lequel la bibliothèque de prix connaît une barre d'acier. */
function idPrixAcier(nuance, diametre) {
  const type = PARAMETRES.nuancesAcier?.[nuance]?.type || 'HA';
  return `acier${type}_${diametre}`;
}

/**
 * La liste ordonnée des fournitures d'un poste, chacune avec l'identifiant qui
 * permet de la chiffrer.
 *
 * C'est cette liste que lisent l'écran Résumé ET le Devis Particulier : une
 * seule définition de « quels matériaux pour cet ouvrage », donc aucun moyen
 * que les deux se contredisent.
 */
function materiauxDuPoste({ beton, agglos, autres, aciers, filAttache }) {
  const lignes = [];

  for (const categorie of ORDRE_BETON) {
    const mat = beton[categorie];
    if (mat && mat.quantite > 0) {
      lignes.push({ id: mat.id, nom: mat.nom, unite: mat.unite, quantite: mat.quantite });
    }
  }

  for (const agglo of agglos) {
    if (agglo.quantite > 0) lignes.push({ ...agglo });
  }

  for (const autre of autres) {
    if (autre.quantite > 0) lignes.push({ ...autre });
  }

  for (const acier of aciers) {
    if (!(acier.barres12m > 0)) continue;
    lignes.push({
      id: acier.idPrix,
      nom: `Fers de ${acier.diametre}`,
      unite: 'barre 12 m',
      quantite: acier.barres12m,
      precision: `${acier.poids} kg`,
    });
  }

  if (filAttache > 0) {
    lignes.push({ id: 'filLigature', nom: "Fil d'attache", unite: 'kg', quantite: filAttache });
  }

  return lignes;
}

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
  const autres = [];
  const autresPostes = [];
  const aciersParDiametre = new Map();
  let poidsAcierTotal = 0;

  for (const { id, bloc } of blocsUtiles) {
    const decomp = obtenirDecompositionOuvrage(id, bloc, regles);
    for (const mat of decomp) {
      if (CATEGORIES_BETON.includes(mat.categorie)) {
        if (!beton[mat.categorie]) {
          beton[mat.categorie] = {
            id: mat.id_materiau, nom: mat.nom, unite: mat.unite, quantite: 0, dosage: mat.donnees?.dosage,
          };
        }
        beton[mat.categorie].quantite = net(beton[mat.categorie].quantite + mat.valeur_arrondie);
      } else if (mat.categorie === 'bois' || mat.categorie === 'clous') {
        autresPostes.push(mat);
      } else if (typeof mat.categorie === 'string' && mat.categorie.startsWith('agglos')) {
        agglos.push({
          id: PRIX_DES_AGGLOS[mat.id_materiau] || mat.id_materiau,
          nom: mat.nom, unite: mat.unite, quantite: mat.valeur_arrondie,
        });
      } else if (mat.categorie !== 'acier') {
        // Carrelage, faïence, peinture, tôles, plinthes… Ces fournitures
        // n'entraient dans aucune des trois familles ci-dessus et étaient donc
        // simplement perdues : ni au Résumé, ni au devis.
        //
        // L'acier reste exclu : il arrive déjà par `detailsArmatures`, regroupé
        // par diamètre et compté en barres de 12 m. Le laisser passer ici le
        // ferait figurer deux fois — une fois par nappe, une fois par barre —
        // et doublerait le fil de ligature.
        autres.push({ id: mat.id_materiau, nom: mat.nom, unite: mat.unite, quantite: mat.valeur_arrondie });
      }
    }

    if (spec.arme) {
      for (const ligne of bloc.lignes || []) {
        for (const a of ligne.detailsArmatures || []) {
          if (!aciersParDiametre.has(a.diametre)) {
            aciersParDiametre.set(a.diametre, {
              diametre: a.diametre, idPrix: idPrixAcier(a.nuance, a.diametre), poids: 0, barres12m: 0,
            });
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
  const aciers = [...aciersParDiametre.values()]
    .sort((a, b) => a.diametre - b.diametre)
    .map((a) => ({ diametre: a.diametre, idPrix: a.idPrix, poids: net(a.poids), barres12m: a.barres12m }));
  const filAttache = poidsAcierTotal > 0 ? filDeLigature(poidsAcierTotal) : 0;

  return {
    id: spec.ids.join('_'),
    // Les blocs d'origine : c'est par eux que le Devis Entreprise retrouve le
    // sous-detail de prix de l'ouvrage.
    blocIds: blocsUtiles.map(({ id }) => id),
    nom: spec.nom(dosage),
    dosage,
    volume,
    unite,
    materiaux: materiauxDuPoste({ beton, agglos, autres, aciers, filAttache }),
    beton: Object.keys(beton).length > 0 ? beton : null,
    agglos,
    aciers,
    filAttache,
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
    // Une ligne sans désignation est un lot qu'on vient d'ouvrir et qu'on n'a
    // pas encore rempli. La montrer comme « Tâche sans nom — 1 u » salit le
    // résumé et, pire, le devis. Elle attend sagement dans le métré.
    if (!ligne.designation || ligne.designation === 'Tâche sans nom') continue;
    const nom = (ligne.lot || 'Autres ouvrages').trim() || 'Autres ouvrages';
    if (!parLot.has(nom)) parLot.set(nom, { id: `libre_${parLot.size + 1}`, titre: nom, lignes: [] });
    parLot.get(nom).lignes.push({
      id: ligne.id,
      designation: ligne.designation,
      unite: ligne.unite,
      quantite: ligne.quantite,
      // Le prix vient de l'utilisateur : aucune bibliothèque ne peut le
      // connaître pour un ouvrage qu'il vient d'inventer.
      pu: ligne.pu || 0,
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
        id: mat.id_materiau,
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
      { id: 'deblai', blocIds: ['fouilleTrancheeM3'], nom: 'Déblai', dosage: null,
        volume: net(terrassement.deblais.volumeFoisonne), unite: 'm³',
        materiaux: [], beton: null, agglos: [], aciers: [], filAttache: 0 },
      { id: 'remblai', blocIds: ['remblaiSousDallageM3'], nom: 'Remblai', dosage: null,
        volume: net(terrassement.remblais.volumeTasse), unite: 'm³',
        materiaux: [], beton: null, agglos: [], aciers: [], filAttache: 0 },
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

  return { titres, lotsLibres, recapitulatifGlobal: recapituler(titres), avertissements };
}

/**
 * Le bon de commande : ce qu'il faut acheter en tout, tous lots confondus.
 *
 * Il additionne exactement les mêmes lignes que celles affichées sous chaque
 * ouvrage — donc plus moyen qu'il annonce un tonnage que le détail ne montre
 * pas. Le regroupement se fait par identifiant ET par unité : le sable en
 * tonnes et le sable en m³ ne s'additionnent pas, parce qu'ils ne s'additionnent
 * pas dans la réalité non plus.
 */
function recapituler(titres) {
  const parCle = new Map();

  const ajouter = (mat) => {
    if (!mat || !(mat.quantite > 0)) return;
    const id = mat.id || mat.id_materiau;
    if (!id) return;
    const cle = `${id}|${mat.unite || ''}`;
    if (!parCle.has(cle)) parCle.set(cle, { id, nom: mat.nom, unite: mat.unite || 'u', quantite: 0 });
    const entree = parCle.get(cle);
    entree.quantite = net(entree.quantite + mat.quantite);
  };

  for (const titre of titres) {
    for (const poste of titre.postes) for (const mat of poste.materiaux || []) ajouter(mat);
    for (const mat of titre.autresPostes || []) ajouter(mat);
  }

  return [...parCle.values()];
}
