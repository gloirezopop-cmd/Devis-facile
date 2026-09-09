import { calculerRecettes } from './recettes.js';
import { _internes as moteurInternes } from './metre.js';
import { PARAMETRES } from './parametres.js';
import { genererResumeFondation } from './resume.js';
import { genererResumeChantier } from './resumeChantier.js';
import { fournituresParLot, ouvragesParLot } from './devisDepuisResume.js';

const { net } = moteurInternes;

/**
 * Ordre chronologique du chantier impose par la specification du Devis
 * Particulier. Le numero de lot affiche (4.1, 4.2...) vient du champ `ordre`,
 * jamais de la position parmi les lots effectivement remplis : un lot vide
 * masque ne doit pas decaler la numerotation des suivants.
 *
 * `plancher` garde son identifiant interne (BLOCS_PARTICULIER y rattache dalles
 * et plancherHourdis) mais s'intitule DALLE. `pieds_droit` est declare pour
 * tenir sa place au rang 10 ; il reste sans lignes tant que sa definition
 * metier n'a pas ete donnee — un lot sans ligne ne s'affiche pas.
 */
export const LOTS_DEVIS_PARTICULIER = [
  { id: 'installation',     ordre: 1,  titre: 'INSTALLATION CHANTIER' },
  { id: 'deblais',          ordre: 2,  titre: 'DEBLAIS' },
  { id: 'remblais',         ordre: 3,  titre: 'REMBLAIS' },
  { id: 'fondation',        ordre: 4,  titre: 'FONDATION' },
  { id: 'elevation',        ordre: 5,  titre: 'ELEVATION' },
  { id: 'plancher',         ordre: 6,  titre: 'DALLE' },
  { id: 'finition',         ordre: 7,  titre: 'FINITION' },
  { id: 'charpente',        ordre: 8,  titre: 'CHARPENTE' },
  { id: 'couverture',       ordre: 9,  titre: 'COUVERTURE' },
  { id: 'pieds_droit',      ordre: 10, titre: 'PIEDS DROIT' },
];

/**
 * Lots que le moteur sait produire mais qui ne figurent pas dans les dix de la
 * specification. La toiture-terrasse est une variante de la couverture : le
 * generateur fusionne charpente, couverture et terrasse, si bien qu'un seul de
 * ces lots porte des lignes. S'il en restait un, il s'affiche apres les dix,
 * numerote a la suite — jamais avec un numero deja pris par un frais.
 */
export const LOTS_HORS_SPECIFICATION = {
  toiture_terrasse: 'TOITURE-TERRASSE ACCESSIBLE (variante)',
};

export const TITRES_LOTS_PARTICULIER = LOTS_DEVIS_PARTICULIER.reduce((acc, lot) => {
  acc[lot.id] = lot.titre;
  return acc;
}, { ...LOTS_HORS_SPECIFICATION });

/**
 * Les lots du Devis Entreprise, dans l'ordre du chantier — le meme que celui du
 * Resume, dont ils sont tires. `rdc`, `etage1` et `second_oeuvre` sont les
 * anciens identifiants, gardes pour que les projets deja enregistres retrouvent
 * un titre au lieu d'afficher leur cle brute.
 */
export const TITRES_LOTS_ENTREPRISE = {
  terrassement: "TERRASSEMENTS ET PREPARATION DU CHANTIER",
  fondation: "I - FONDATION",
  elevation: "II - ELEVATION",
  plancher: "III - PLANCHER / DALLE",
  toiture: "IV - TOITURE (charpente, couverture ou terrasse)",
  finition: "V - FINITION",
  rdc: "II - RDC",
  etage1: "III - ETAGE 1",
  second_oeuvre: "V - SECOND OEUVRE (forfaits a completer)"
};

const BLOCS_PARTICULIER = {
  fouilles: 'terrassement',
  remblai: 'terrassement',
  betonProprete: 'fondation',
  semelles: 'fondation',
  longrines: 'fondation',
  // `calculerMetre()` produit le soubassement sous DEUX cles : `murSoubassement`,
  // que les recettes ne connaissent pas, et `soubassement`, qui porte reellement
  // les agglos pleins et le mortier. Seule la premiere etait rattachee a la
  // fondation ; la seconde tombait donc dans le lot Finition par defaut, ou le
  // resume des finitions ne regarde pas les agglos — 494 agglos pleins
  // disparaissaient du devis sur un soubassement de 40 m.
  murSoubassement: 'fondation',
  soubassement: 'fondation',
  moellon: 'fondation',
  dallage: 'fondation',
  sousPavement: 'fondation',
  poteaux: 'elevation',
  colonnes: 'elevation',
  poutres: 'elevation',
  ceintures: 'elevation',
  linteaux: 'elevation',
  escalier: 'elevation',
  maconnerie: 'elevation',
  dalles: 'plancher',
  plancherHourdis: 'plancher',
  enduits: 'finition',
  carrelage: 'finition',
  faience: 'finition',
  peinture: 'finition',
  charpenteBois: 'charpente',
  couvertureToles: 'couverture',
  acrotere: 'toiture_terrasse',
  formePente: 'toiture_terrasse',
  armatures: 'armatures'
};

/**
 * Rassemble la saisie de tous les niveaux en une seule.
 *
 * `preparerSaisiePourMoteur()` cote application renvoie TOUTES les cles pour
 * CHAQUE niveau, avec un tableau vide quand les lignes n'appartiennent pas a ce
 * niveau-la. Un `Object.assign` successif faisait donc gagner le dernier niveau
 * traite : les semelles saisies en Fondation etaient ecrasees par le tableau
 * vide de Finition, et le Devis Particulier sortait entierement vide sur tout
 * projet a plusieurs niveaux — c'est-a-dire sur tous les projets reels.
 *
 * On concatene donc les tableaux au lieu de les remplacer.
 */
/**
 * Un projet ou rien n'a encore ete mesure ne doit produire aucun devis — pas
 * meme le forfait d'installation de chantier, dont la quantite vaut 1 par
 * nature. Sans ce garde-fou, ouvrir un projet neuf affichait un devis de
 * 200 000 FCFA sorti de nulle part.
 */
function projetComporteDesOuvrages(niveauxMetre) {
  for (const { metre } of niveauxMetre) {
    if (!metre || !metre.blocs) continue;
    for (const blocDonnees of Object.values(metre.blocs)) {
      if (blocDonnees && blocDonnees.total > 0) return true;
    }
  }
  return false;
}

function fusionnerSaisies(niveauxMetre) {
  const globale = {};
  for (const { saisie } of niveauxMetre) {
    if (!saisie) continue;
    for (const [cle, valeur] of Object.entries(saisie)) {
      if (Array.isArray(valeur)) {
        globale[cle] = (globale[cle] || []).concat(valeur);
      } else if (globale[cle] === undefined) {
        globale[cle] = valeur;
      }
    }
  }
  return globale;
}

// ─── Utilitaire : nombre en lettres (francais, FCFA) ─────────────────────────

const _UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const _DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function _centainesEnLettres(n) {
  if (n === 0) return '';
  let res = '';
  const c = Math.floor(n / 100);
  const reste = n % 100;
  if (c > 0) {
    res += (c > 1 ? _UNITES[c] + ' ' : '') + 'cent';
    if (c > 1 && reste === 0) res += 's';
    if (reste > 0) res += ' ';
  }
  if (reste < 20) {
    res += _UNITES[reste];
  } else {
    const d = Math.floor(reste / 10);
    const u = reste % 10;
    if (d === 7 || d === 9) {
      res += _DIZAINES[d] + '-' + _UNITES[10 + u];
    } else if (d === 8) {
      res += 'quatre-vingts' + (u > 0 ? '-' + _UNITES[u] : '');
    } else {
      res += _DIZAINES[d] + (u === 1 && d !== 8 ? ' et ' : u > 0 ? '-' : '') + (u > 0 ? _UNITES[u] : '');
    }
  }
  return res.trim();
}

export function nombreEnLettres(n) {
  if (!n || n === 0) return 'zero franc CFA';
  const milliards = Math.floor(n / 1000000000);
  const millions  = Math.floor((n % 1000000000) / 1000000);
  const milliers  = Math.floor((n % 1000000) / 1000);
  const reste     = n % 1000;
  const parts = [];
  if (milliards > 0) parts.push(_centainesEnLettres(milliards) + ' milliard' + (milliards > 1 ? 's' : ''));
  if (millions  > 0) parts.push(_centainesEnLettres(millions)  + ' million'  + (millions  > 1 ? 's' : ''));
  if (milliers  > 0) parts.push(milliers === 1 ? 'mille' : _centainesEnLettres(milliers) + ' mille');
  if (reste     > 0) parts.push(_centainesEnLettres(reste));
  const texte = parts.filter(Boolean).join(' ');
  return 'Nous disons en toutes lettres : ' + texte + ' franc' + (n > 1 ? 's' : '') + ' CFA';
}

// ─── Sous-detail de prix ─────────────────────────────────────────────────────

/**
 * Calcule le prix de vente unitaire (tout compris) d'un ouvrage au m3 ou au m2.
 * Formule classeur : Prix tout compris = Debourse materiaux x (1 + taux MO)
 *   Gros oeuvre 28%, finition / charpente / couverture 22%.
 * Pas de coefficient K : la formule du guide s'arrete la.
 *
 * Si l'armature a ete saisie, le ratio reel (poids/volume) est utilise.
 * Sinon, le ratio forfaitaire de 130 kg/m3 s'applique, signale en avertissement.
 *
 * Retourne composantes (detail ligne par ligne) pour affichage dans l'UI.
 */
export function genererSousDetailPrix(blocId, blocDonnees, regles, bibliothequePrix) {
  // Terrassement : PU forfaitaire
  if (['fouilles', 'fouillesPuits', 'remblai', 'fouilleFilante', 'nivellement', 'evacuation', 'deblais', 'terrassementGrandeSurface'].includes(blocId)) {
    // Le terrassement a grande surface a son propre prix, `terrassementEnginM3`,
    // que le metreur renseigne dans sa bibliotheque de prix. Aucune valeur par
    // defaut : un engin ne se facture pas comme la pioche, et inventer un
    // montant dans un devis remis a un client serait pire que de le laisser
    // vide. Tant qu'il n'est pas saisi, la ligne porte « Prix manquant ».
    if (blocId === 'terrassementGrandeSurface') {
      const puEngin = Number(bibliothequePrix.terrassementEnginM3) || 0;
      return {
        debourseMateriaux: 0, tauxMainOeuvre: 0, debourseMainOeuvre: puEngin,
        prixVenteUnitaire: puEngin, composantes: [],
        avertissements: puEngin === 0 ? ['Prix manquant'] : [],
        ratioAcierDefaut: false, ratioCoffrageDefaut: false
      };
    }

    const puKey = (blocId === 'fouilles' || blocId === 'fouillesPuits' || blocId === 'fouilleFilante'
      || blocId === 'deblais')
      ? 'fouilleTrancheeM3'
      : (blocId === 'remblai' || blocId === 'nivellement') ? 'remblaiSousDallageM3' : 'evacuationDeblaisM3';
    const pu = bibliothequePrix[puKey] || PARAMETRES.prixUnitaires[puKey] || 0;
    return {
      debourseMateriaux: 0, tauxMainOeuvre: 0, debourseMainOeuvre: pu,
      prixVenteUnitaire: pu, composantes: [],
      avertissements: pu === 0 ? ['Prix manquant'] : [],
      ratioAcierDefaut: false, ratioCoffrageDefaut: false
    };
  }

  // FauxBloc a 1 unite : une ligne { valeur: 1 } pour que calculerRecetteBeton
  // iterate par ligne (coherent avec l'arrondi-par-ouvrage de recettes.js).
  const fauxBlocs = {};
  if (blocId === 'maconnerie') {
    const nbBlocs = PARAMETRES.majorations && PARAMETRES.majorations.blocs ? (12.5 * PARAMETRES.majorations.blocs) : 12.5;
    fauxBlocs[blocId] = { total: 1, lignes: [{ nombreBlocs: nbBlocs, volumeMortier: nbBlocs * (0.4 + 0.015) * 0.015 * 0.15 }] };
  } else if (blocId === 'carrelage' || blocId === 'faience') {
    fauxBlocs[blocId] = { total: 1, perimetreTotal: 4 };
  } else {
    fauxBlocs[blocId] = { total: 1, lignes: [{ valeur: 1 }] };
  }

  // Ratio acier : reel si saisi, 130 kg/m3 en repli
  let utiliseRatioAcierDefaut    = false;
  let utiliseRatioCoffrageDefaut = false;
  let ratioAcier     = 0;
  let ratioAcierReel = 0;

  const blocsArmables = ['semelles', 'longrines', 'colonnes', 'poteaux', 'ceintures', 'poutres', 'linteaux', 'dalles', 'escalier', 'acrotere'];
  if (blocsArmables.includes(blocId)) {
    let poidsAcierReel = 0;
    const volumeReel   = blocDonnees && blocDonnees.total ? blocDonnees.total : 0;
    const coffrageReel = blocDonnees && blocDonnees.totalCoffrage ? blocDonnees.totalCoffrage : 0;

    if (blocDonnees && blocDonnees.lignes) {
      const extractions = moteurInternes.extractionsArmatures;
      const targetId = blocId === 'poteaux' ? 'colonnes' : blocId === 'poutres' ? 'ceintures' : blocId;
      if (extractions[targetId]) {
        blocDonnees.lignes.forEach(function(l) {
          extractions[targetId](l, regles).forEach(function(a) { poidsAcierReel += (a.poids || 0); });
        });
      }
    }

    if (poidsAcierReel > 0 && volumeReel > 0) {
      ratioAcierReel = poidsAcierReel / volumeReel;
      ratioAcier     = ratioAcierReel;
    } else {
      ratioAcier             = 130;
      utiliseRatioAcierDefaut = true;
    }

    if (coffrageReel > 0 && volumeReel > 0) {
      fauxBlocs[blocId].totalCoffrage = coffrageReel / volumeReel;
    } else {
      fauxBlocs[blocId].totalCoffrage = 0.9;
      utiliseRatioCoffrageDefaut       = true;
    }
  }

  // Recettes pour 1 unite
  const recettesPourUneUnite = calculerRecettes(fauxBlocs);
  let debourseMateriaux = 0;
  const avertissements  = [];
  const composantes     = [];

  for (const [id, mat] of Object.entries(recettesPourUneUnite)) {
    const quantite = mat.quantiteNette;
    if (!quantite || quantite === 0) continue;
    if ((id === 'eau' || id === 'eauM3') && !(regles && regles.parametresProjet && regles.parametresProjet.inclureEau)) continue;

    let puKey = id;
    if (id === 'bois_charpente') puKey = 'chevrons';
    if (id === 'clous_charpente' || id === 'clous_toiture' || id === 'clous') puKey = 'clousKg';
    if (id === 'faitieres') puKey = 'toleFaitierePiece';
    if (id === 'toles')     puKey = 'toleBG28Piece';

    let pu = (bibliothequePrix[puKey] !== undefined ? bibliothequePrix[puKey]
           : bibliothequePrix[id]    !== undefined ? bibliothequePrix[id]
           : PARAMETRES.prixUnitaires[puKey] !== undefined ? PARAMETRES.prixUnitaires[puKey]
           : PARAMETRES.prixUnitaires[id]    !== undefined ? PARAMETRES.prixUnitaires[id]
           : 0);

    if ((puKey === 'eau' || puKey === 'eauM3') && mat.unite === 'L') pu = pu / 1000;
    else if (puKey.startsWith('acier') && mat.unite === 'kg') {
      const match = puKey.match(/(\d+)$/);
      if (match && PARAMETRES.aciersPoidsLineique) {
        const pL = PARAMETRES.aciersPoidsLineique[match[1]] || 0.617;
        pu = pu / (12 * pL);
      }
    }

    if (pu === 0 && quantite > 0) avertissements.push('Prix manquant pour ' + id);
    const montant = quantite * pu;
    debourseMateriaux += montant;
    composantes.push({ id: id, unite: mat.unite || 'u', quantite: quantite, pu: pu, montant: montant });
  }

  // Acier calcule separement
  if (ratioAcier > 0) {
    const puAcier = (bibliothequePrix['acierHA_12'] || PARAMETRES.prixUnitaires['acierHA_12'] || 6000);
    if (puAcier === 0) avertissements.push('Prix manquant pour acierHA_12');
    const poidsBarreHA12 = (Math.PI / 4) * 0.012 * 0.012 * 7850 * 12;
    const puAcierKg    = puAcier / poidsBarreHA12;
    const montantAcier = ratioAcier * puAcierKg;
    debourseMateriaux += montantAcier;
    composantes.push({
      id: 'acierHA_12',
      designation: utiliseRatioAcierDefaut ? 'Acier HA - ratio forfaitaire 130 kg/m3' : ('Acier HA - ratio reel ' + Math.round(ratioAcier) + ' kg/m3'),
      unite: 'kg', quantite: ratioAcier, pu: puAcierKg, montant: montantAcier,
      hypothese: utiliseRatioAcierDefaut
    });

    const puFilLigature = (bibliothequePrix['filLigature'] || PARAMETRES.prixUnitaires['filLigatureKg'] || 1200);
    if (puFilLigature === 0) avertissements.push('Prix manquant pour filLigature');
    const qteFilLigature  = ratioAcier * 0.05;
    const montantFilLig   = qteFilLigature * puFilLigature;
    debourseMateriaux += montantFilLig;
    composantes.push({ id: 'filLigature', designation: 'Fil de ligature (5% du poids acier)', unite: 'kg', quantite: qteFilLigature, pu: puFilLigature, montant: montantFilLig });
  }

  // Taux MO : 28% gros oeuvre, 22% finition/charpente/couverture
  const lotFinition    = ['enduits', 'carrelage', 'faience', 'peinture', 'charpenteBois', 'couvertureToles', 'acrotere', 'formePente'];
  const tauxMainOeuvre = lotFinition.includes(blocId) ? 0.22 : 0.28;

  const debourseMainOeuvre = debourseMateriaux * tauxMainOeuvre;
  const debourseSec        = debourseMateriaux + debourseMainOeuvre;

  // Coefficient de vente de l'entreprise. Ces quatre taux sont saisis par
  // l'utilisateur dans l'ecran Parametres, ou ils sont deja presentes comme
  // « le coefficient de majoration utilise pour le Devis Entreprise » — mais
  // ils n'etaient lus nulle part : les quatre reglages ne changeaient rien, et
  // l'entreprise vendait au prix de revient, sans frais de chantier, sans
  // frais generaux et sans benefice.
  const tauxVente = (regles && regles.taux) ? regles.taux : {};
  const coefficientVente = 1
    + (tauxVente.fraisChantier   || 0)
    + (tauxVente.fraisGeneraux   || 0)
    + (tauxVente.fraisOperation  || 0)
    + (tauxVente.aleasEtBenefice || 0);

  const prixVenteUnitaire = Math.round(debourseSec * coefficientVente);

  if (utiliseRatioAcierDefaut)    avertissements.push('Ratio acier par defaut (130 kg/m3) - saisir le ferraillage pour affiner');
  if (utiliseRatioCoffrageDefaut) avertissements.push('Ratio coffrage par defaut (0,9 m2/m3)');

  return {
    debourseMateriaux: debourseMateriaux,
    tauxMainOeuvre: tauxMainOeuvre,
    debourseMainOeuvre: debourseMainOeuvre,
    debourseSec: Math.round(debourseSec),
    coefficientVente: coefficientVente,
    prixVenteUnitaire: prixVenteUnitaire,
    composantes: composantes,
    ratioAcier: ratioAcier,
    ratioAcierReel: ratioAcierReel,
    avertissements: avertissements,
    ratioAcierDefaut:    utiliseRatioAcierDefaut,
    ratioCoffrageDefaut: utiliseRatioCoffrageDefaut
  };
}

// ─── Devis Particulier ────────────────────────────────────────────────────────

export function genererDevisParticulier(input, regles, bibliothequePrix, bibliothequeLibelles) {
  if (!bibliothequeLibelles) bibliothequeLibelles = {};
  let niveauxMetre = Array.isArray(input) ? input : [{ niveau: { id: 'all', nom: 'Projet' }, saisie: {}, metre: { blocs: input } }];

  const taux = (regles && regles.taux) ? regles.taux : {};
  const tauxImprevus  = taux.imprevus        !== undefined ? taux.imprevus        : 0.05;
  const tauxTransport = taux.transport       !== undefined ? taux.transport       : 0.05;
  const tauxMO        = taux.mainOeuvre      !== undefined ? taux.mainOeuvre      : 0.28;
  const tauxArchi     = taux.honorairesArchi !== undefined ? taux.honorairesArchi : 0.08;
  const tauxInge      = taux.honorairesInge  !== undefined ? taux.honorairesInge  : 0.08;

  const ordreLots = [];

  const blocsParCategorie = {
    terrassement: {}, fondation: {}, elevation: {}, plancher: {}, charpente: {}, couverture: {}, toiture_terrasse: {}, finition: {}
  };

  for (const { metre } of niveauxMetre) {
    if (!metre || !metre.blocs) continue;
    for (const [blocId, blocDonnees] of Object.entries(metre.blocs)) {
      if (!blocDonnees || (!blocDonnees.total && !blocDonnees.lignes)) continue;
      const cat = BLOCS_PARTICULIER[blocId] || 'finition';
      // Le terrassement se chiffre au forfait et au m3, pas en fournitures :
      // il n'a rien a faire dans ce regroupement. La fondation, elle, y entre
      // desormais — son lot doit pouvoir calculer ses recettes sur ses propres
      // blocs plutot que sur ceux du projet entier.
      if (cat === 'terrassement') continue;
      if (!blocsParCategorie[cat]) blocsParCategorie[cat] = {};

      if (blocId === 'autresOuvrages' || blocId === 'armatures') {
        if (!blocsParCategorie[cat][blocId]) blocsParCategorie[cat][blocId] = { lignes: [] };
        blocsParCategorie[cat][blocId].lignes.push(...(blocDonnees.lignes || []));
      } else {
        if (!blocsParCategorie[cat][blocId]) {
          blocsParCategorie[cat][blocId] = Object.assign({}, blocDonnees, { total: 0, totalCoffrage: 0, lignes: [] });
        }
        blocsParCategorie[cat][blocId].total        += (blocDonnees.total || 0);
        blocsParCategorie[cat][blocId].totalCoffrage += (blocDonnees.totalCoffrage || 0);
        if (blocDonnees.lignes) blocsParCategorie[cat][blocId].lignes.push(...blocDonnees.lignes);
      }
    }
  }

  let saisieGlobale = fusionnerSaisies(niveauxMetre);

  let resumeFondation = null;
  if (Object.keys(saisieGlobale).length > 0) {
    resumeFondation = genererResumeFondation(saisieGlobale, regles);
  }

  // Le Resume est la source : c'est lui qui dit quels lots existent, quels
  // ouvrages les composent et quelles fournitures chacun consomme. Le devis ne
  // fait que le lire — il ne redecoupe rien pour son compte.
  const resumeChantier = genererResumeChantier(saisieGlobale, regles);

  const devisParLot    = {};
  let   totalMateriaux = 0;
  const ordreParticulier = LOTS_DEVIS_PARTICULIER.map((l) => l.id);

  /**
   * Lots 1, 2 et 3 — installation, deblais, remblais.
   *
   * Ils ne se chiffrent pas en materiaux mais au forfait (installation) ou au
   * m3 (terres). Les volumes sont ceux que le Resume affiche deja a l'ecran :
   * meme propriete, pas une variante, sinon l'ecran et le papier se
   * contredisent. L'evacuation appartient au lot Deblais, dont elle est la
   * suite directe : on creuse, on reutilise en remblai, on evacue l'excedent.
   *
   * L'identifiant de ligne est la cle de prix : c'est lui qui permet a un prix
   * saisi de survivre a un changement de quantite.
   */
  const chantierChiffre = projetComporteDesOuvrages(niveauxMetre);

  const lignesForfaitaires = {
    installation: [
      { id: 'ameneeEtRepliForfait', designation: 'Installation et repli de chantier', unite: 'forfait', quantite: chantierChiffre ? 1 : 0 },
    ],
    deblais: [
      { id: 'fouilleTrancheeM3',   designation: 'Deblais',                             unite: 'm3', quantite: resumeFondation?.volumes?.deblais    || 0 },
      { id: 'evacuationDeblaisM3', designation: 'Evacuation des terres excedentaires',  unite: 'm3', quantite: resumeFondation?.volumes?.evacuation || 0 },
    ],
    remblais: [
      { id: 'remblaiSousDallageM3', designation: 'Remblais',                            unite: 'm3', quantite: resumeFondation?.volumes?.remblais   || 0 },
    ],
  };

  // Les trois premiers lots ne se chiffrent pas en fournitures : l'installation
  // est un forfait, les deblais et les remblais se paient au m3 de terre. Ils
  // gardent donc leur traitement propre.
  for (const lot of ordreParticulier) {
    if (!lignesForfaitaires[lot]) continue;
    const lignes = [];
    let sousTotal = 0;

    for (const modele of lignesForfaitaires[lot]) {
      if (!modele.quantite) continue;
      const pu = bibliothequePrix[modele.id] !== undefined ? bibliothequePrix[modele.id]
               : PARAMETRES.prixUnitaires[modele.id] !== undefined ? PARAMETRES.prixUnitaires[modele.id] : 0;
      const pt = net(modele.quantite * pu);
      lignes.push({
        id: modele.id,
        designation: bibliothequeLibelles[modele.id] || modele.designation,
        unite: modele.unite, quantite: modele.quantite, pu: pu, pt: pt,
        avertissements: pu === 0 ? ['Prix manquant'] : [],
      });
      sousTotal += pt;
    }

    if (lignes.length > 0) {
      devisParLot[lot] = { titre: TITRES_LOTS_PARTICULIER[lot], lignes: lignes, sousTotal: Math.round(sousTotal) };
      ordreLots.push(lot);
      totalMateriaux  += sousTotal;
    }
  }

  // Tout le reste vient du Resume, lot par lot. Les fournitures d'un lot y sont
  // regroupees et sommees entre elles seulement : le ciment de la fondation ne
  // rejoint jamais celui de l'elevation. C'est la regle que l'ancien code
  // enfreignait, en donnant au lot Fondation les recettes du projet entier.
  const inclureEau = Boolean(regles && regles.parametresProjet && regles.parametresProjet.inclureEau);
  const fournitures = fournituresParLot(resumeChantier, bibliothequePrix, bibliothequeLibelles, inclureEau);

  for (const lotId of fournitures.ordre) {
    devisParLot[lotId] = fournitures.lots[lotId];
    ordreLots.push(lotId);
    totalMateriaux += fournitures.lots[lotId].sousTotal;
  }

  // Les cinq frais se calculent tous sur le TOTAL des lots, conformement a la
  // specification : Imprevus 5 %, Transport 5 %, Main d'oeuvre 30 %,
  // Architecte 8 %, Ingenieur 8 %. Les honoraires portaient auparavant sur le
  // total des travaux (materiaux + imprevus + transport + main d'oeuvre), ce
  // qui gonflait le devis d'environ 2,6 % sans que la feuille l'explique.
  // Les cinq taux restent parametrables : ce ne sont que des valeurs par defaut.
  const imprevus        = totalMateriaux * tauxImprevus;
  const transport       = totalMateriaux * tauxTransport;
  const mainOeuvre      = totalMateriaux * tauxMO;
  const honorairesArchi = totalMateriaux * tauxArchi;
  const honorairesInge  = totalMateriaux * tauxInge;
  const totalTravaux    = totalMateriaux + imprevus + transport + mainOeuvre;
  const totalGeneral    = Math.round(totalMateriaux + imprevus + transport + mainOeuvre + honorairesArchi + honorairesInge);

  return {
    lots: devisParLot,
    // L'ordre du Resume fait foi : les sorties (ecran, PDF, XLSX, tableur) le
    // suivent au lieu de rejouer chacune leur propre classement.
    ordreLots,
    cascade: {
      totalMateriaux:   Math.round(totalMateriaux),
      tauxImprevus:     tauxImprevus,
      imprevus:         Math.round(imprevus),
      tauxTransport:    tauxTransport,
      transport:        Math.round(transport),
      tauxMO:           tauxMO,
      mainOeuvre:       Math.round(mainOeuvre),
      totalTravaux:     Math.round(totalTravaux),
      tauxArchi:        tauxArchi,
      honorairesArchi:  Math.round(honorairesArchi),
      tauxInge:         tauxInge,
      honorairesInge:   Math.round(honorairesInge),
      totalGeneral:     totalGeneral
    },
    total: totalGeneral,
    enToutesLettres: nombreEnLettres(totalGeneral)
  };
}

// ─── Devis Entreprise ─────────────────────────────────────────────────────────

/**
 * Devis Entreprise : les ouvrages elementaires du Resume, lot par lot.
 *
 * Il ne regroupe pas de fournitures et n'en fait jamais des lignes : « Beton
 * arme dose a 350 kg/m3 — 20 m3 » reste un ouvrage, avec son dosage dans la
 * designation et le metre que le Resume affiche. Son ciment, son sable et son
 * fer appartiennent au Devis Particulier, pas ici.
 *
 * Les sept forfaits « second oeuvre a completer » que cette fonction inventait
 * (menuiseries, plomberie, electricite, peinture...) ont disparu : ils
 * n'existaient dans aucun calcul, et faisaient desormais double emploi avec les
 * lots que l'utilisateur ajoute lui-meme et qui, eux, portent de vraies
 * quantites.
 */
export function genererDevisEntreprise(input, regles, bibliothequePrix, bibliothequeLibelles) {
  if (!bibliothequeLibelles) bibliothequeLibelles = {};
  const niveauxMetre = Array.isArray(input) ? input : [{ niveau: { id: 'all', nom: 'Projet' }, saisie: {}, metre: { blocs: input } }];

  const tauxTVA = (regles && regles.taux && regles.taux.tva !== undefined) ? regles.taux.tva : 0.18;

  const saisieGlobale = fusionnerSaisies(niveauxMetre);
  const resumeChantier = genererResumeChantier(saisieGlobale, regles);

  // Les blocs de tout le projet, pour que le sous-detail de prix d'un ouvrage
  // dispose de ses ratios d'acier et de coffrage.
  const blocsGlobaux = {};
  for (const { metre } of niveauxMetre) {
    if (!metre || !metre.blocs) continue;
    for (const [blocId, blocDonnees] of Object.entries(metre.blocs)) {
      if (!blocDonnees) continue;
      if (!blocsGlobaux[blocId]) {
        blocsGlobaux[blocId] = Object.assign({}, blocDonnees, { total: 0, totalCoffrage: 0, lignes: [] });
      }
      blocsGlobaux[blocId].total         += (blocDonnees.total || 0);
      blocsGlobaux[blocId].totalCoffrage += (blocDonnees.totalCoffrage || 0);
      if (blocDonnees.lignes) blocsGlobaux[blocId].lignes.push(...blocDonnees.lignes);
    }
  }

  const ouvrages = ouvragesParLot(resumeChantier, {
    blocs: blocsGlobaux,
    sousDetail: (blocId, blocDonnees) => genererSousDetailPrix(blocId, blocDonnees, regles, bibliothequePrix),
  });

  const devisParNiveau = {};
  let totalGrosOeuvre   = 0;
  let totalSecondOeuvre = 0;

  // Le gros oeuvre s'arrete a la toiture ; finitions et lots ajoutes par
  // l'utilisateur forment le second oeuvre.
  const GROS_OEUVRE = new Set(['terrassement', 'fondation', 'elevation', 'plancher', 'toiture']);

  for (const lotId of ouvrages.ordre) {
    const lot = ouvrages.lots[lotId];
    devisParNiveau[lotId] = lot;
    if (GROS_OEUVRE.has(lotId)) totalGrosOeuvre += lot.sousTotal;
    else totalSecondOeuvre += lot.sousTotal;
  }

  // L'installation de chantier est un forfait, pas un ouvrage mesure : elle ne
  // figure pas au Resume mais doit rester en tete du devis.
  if (ouvrages.ordre.length > 0) {
    const pu = bibliothequePrix['ameneeEtRepliForfait'] !== undefined
      ? Number(bibliothequePrix['ameneeEtRepliForfait']) || 0
      : Number(PARAMETRES.prixUnitaires['ameneeEtRepliForfait']) || 0;
    const ligne = {
      id: 'ameneeEtRepliForfait',
      designation: bibliothequeLibelles['ameneeEtRepliForfait'] || 'Installation et repli de chantier',
      unite: 'ens', quantite: 1, pu, pt: pu,
      avertissements: pu === 0 ? ['Prix manquant'] : [],
    };
    if (devisParNiveau['terrassement']) {
      devisParNiveau['terrassement'].lignes.unshift(ligne);
      devisParNiveau['terrassement'].sousTotal += pu;
    } else {
      devisParNiveau['terrassement'] = {
        nom: TITRES_LOTS_ENTREPRISE.terrassement, titre: TITRES_LOTS_ENTREPRISE.terrassement,
        lignes: [ligne], sousTotal: pu,
      };
      ouvrages.ordre.unshift('terrassement');
    }
    totalGrosOeuvre += pu;
  }

  const totalHT   = totalGrosOeuvre + totalSecondOeuvre;
  const tva       = Math.round(totalHT * tauxTVA);
  const netAPayer = totalHT + tva;

  return {
    niveaux: devisParNiveau,
    // L'ordre du Resume fait foi, jusque dans le PDF et le tableur.
    ordreLots: ouvrages.ordre,
    cascade: {
      totalGrosOeuvre:   Math.round(totalGrosOeuvre),
      totalSecondOeuvre: Math.round(totalSecondOeuvre),
      totalHT:           totalHT,
      tauxTVA:           tauxTVA,
      tva:               tva,
      netAPayer:         netAPayer
    },
    total: netAPayer
  };
}
