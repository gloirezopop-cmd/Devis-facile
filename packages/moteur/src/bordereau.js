import { LOTS_DEVIS_PARTICULIER } from './valorisation.js';

/**
 * Le bordereau : une seule liste ordonnee et numerotee, consommee par les
 * quatre sorties (ecran HTML, feuille Univer, PDF, XLSX).
 *
 * Sans elle, chaque sortie refait sa propre mise en page a partir du meme
 * devis, et rien ne garantit qu'elles affichent les memes chiffres ni le meme
 * ordre. La specification l'interdit explicitement : un seul modele de
 * donnees, un seul rendu, quatre habillages.
 *
 * Chaque entree porte un `type` qui dit comment l'habiller :
 *   lot | ligne | sousTotal | total | frais | totalGeneral
 *
 * Le numero d'un lot vient de son `ordre` declare, jamais de sa position
 * parmi les lots effectivement remplis : un lot vide n'est pas affiche, mais
 * il ne doit pas pour autant decaler la numerotation des suivants.
 */

const FRAIS_PARTICULIER = [
  { cle: 'imprevus',        tauxCle: 'tauxImprevus',  libelle: 'Imprévue' },
  { cle: 'transport',       tauxCle: 'tauxTransport', libelle: 'Transport des matériaux' },
  { cle: 'mainOeuvre',      tauxCle: 'tauxMO',        libelle: "Main d'œuvre" },
  { cle: 'honorairesArchi', tauxCle: 'tauxArchi',     libelle: "Honoraire de l'Architecte" },
  { cle: 'honorairesInge',  tauxCle: 'tauxInge',      libelle: "Honoraire de l'Ingénieur" },
];

function pourcentage(taux) {
  if (taux === undefined || taux === null) return '';
  const valeur = taux * 100;
  const arrondi = Math.round(valeur * 100) / 100;
  return ` ${arrondi}%`;
}

/**
 * Le bordereau du Devis Particulier quand l'ordre des lots est donne — c'est le
 * cas depuis que les deux devis sortent du Resume. Les frais et le total
 * general ferment la liste, comme dans la version historique.
 */
function bordereauSelonOrdre(devis, ordre) {
  const rangs = [];
  let numeroLot = 0;

  for (const lotId of ordre) {
    const contenu = devis.lots[lotId];
    if (!contenu || !contenu.lignes || contenu.lignes.length === 0) continue;

    numeroLot += 1;
    rangs.push({ type: 'lot', numero: String(numeroLot), libelle: contenu.titre || contenu.nom || lotId, lotId });

    contenu.lignes.forEach((ligne, index) => {
      rangs.push({
        type: 'ligne',
        numero: `${numeroLot}.${index + 1}`,
        lotId,
        id: ligne.id,
        designation: ligne.designation,
        unite: ligne.unite,
        quantite: ligne.quantite,
        pu: ligne.pu,
        pt: ligne.pt,
        avertissements: ligne.avertissements || [],
      });
    });

    rangs.push({ type: 'sousTotal', libelle: 'SOUS TOTAL', lotId, montant: contenu.sousTotal });
  }

  if (rangs.length === 0) return rangs;

  const cascade = devis.cascade || {};
  rangs.push({ type: 'total', libelle: 'TOTAL', montant: cascade.totalMateriaux || 0 });

  let numeroFrais = numeroLot;
  for (const frais of FRAIS_PARTICULIER) {
    numeroFrais += 1;
    rangs.push({
      type: 'frais',
      numero: String(numeroFrais),
      libelle: frais.libelle + pourcentage(cascade[frais.tauxCle]),
      taux: cascade[frais.tauxCle],
      montant: cascade[frais.cle] || 0,
    });
  }

  rangs.push({
    type: 'totalGeneral',
    libelle: 'TOTAL GÉNÉRAL',
    montant: cascade.totalGeneral || 0,
    enToutesLettres: devis.enToutesLettres || '',
  });

  return rangs;
}

/**
 * @param {object} devis  sortie de genererDevisParticulier()
 * @returns {Array} lignes pretes a afficher
 */
export function construireBordereauParticulier(devis) {
  const rangs = [];
  if (!devis || !devis.lots) return rangs;

  // Le devis vient du Resume, qui porte deja l'ordre du chantier : le rejouer
  // ici a partir d'une liste locale ferait remonter la fondation avant le
  // terrassement des que les deux listes divergeraient.
  if (Array.isArray(devis.ordreLots) && devis.ordreLots.length > 0) {
    return bordereauSelonOrdre(devis, devis.ordreLots);
  }

  // Les dix lots de la specification, puis tout lot supplementaire que le
  // moteur aurait produit, numerote a la suite. Les frais commencent apres le
  // dernier numero de lot : 11 a 15 dans le cas normal.
  const declares = LOTS_DEVIS_PARTICULIER.map((l) => l.id);
  const supplementaires = Object.keys(devis.lots).filter((id) => !declares.includes(id));
  const sequence = [
    ...LOTS_DEVIS_PARTICULIER,
    ...supplementaires.map((id, i) => ({
      id,
      ordre: LOTS_DEVIS_PARTICULIER.length + i + 1,
      titre: devis.lots[id]?.titre || id,
    })),
  ];

  let dernierNumeroLot = LOTS_DEVIS_PARTICULIER.length;

  for (const lot of sequence) {
    const contenu = devis.lots[lot.id];
    if (!contenu || !contenu.lignes || contenu.lignes.length === 0) continue;

    dernierNumeroLot = Math.max(dernierNumeroLot, lot.ordre);

    rangs.push({
      type: 'lot',
      numero: String(lot.ordre),
      libelle: contenu.titre || lot.titre,
      lotId: lot.id,
    });

    contenu.lignes.forEach((ligne, index) => {
      rangs.push({
        type: 'ligne',
        numero: `${lot.ordre}.${index + 1}`,
        lotId: lot.id,
        id: ligne.id,
        designation: ligne.designation,
        unite: ligne.unite,
        quantite: ligne.quantite,
        pu: ligne.pu,
        pt: ligne.pt,
        avertissements: ligne.avertissements || [],
      });
    });

    rangs.push({
      type: 'sousTotal',
      libelle: 'SOUS TOTAL',
      lotId: lot.id,
      montant: contenu.sousTotal,
    });
  }

  let numeroFrais = dernierNumeroLot;

  if (rangs.length === 0) return rangs;

  const cascade = devis.cascade || {};

  rangs.push({ type: 'total', libelle: 'TOTAL', montant: cascade.totalMateriaux || 0 });

  for (const frais of FRAIS_PARTICULIER) {
    numeroFrais += 1;
    rangs.push({
      type: 'frais',
      numero: String(numeroFrais),
      libelle: frais.libelle + pourcentage(cascade[frais.tauxCle]),
      // Le taux brut permet aux sorties tableur d'ecrire une formule vivante
      // (= TOTAL x taux) au lieu d'un montant fige.
      taux: cascade[frais.tauxCle],
      montant: cascade[frais.cle] || 0,
    });
  }

  rangs.push({
    type: 'totalGeneral',
    libelle: 'TOTAL GÉNÉRAL',
    montant: cascade.totalGeneral || 0,
    enToutesLettres: devis.enToutesLettres || '',
  });

  return rangs;
}

/**
 * Devis Entreprise : memes types de rangs, mais les groupes sont les niveaux
 * du projet et la cascade se termine par TVA puis NET A PAYER. On ne numerote
 * que ce qui existe reellement — un projet de plain-pied n'affiche aucun lot
 * d'etage.
 */
export function construireBordereauEntreprise(devis, ordreNiveaux = []) {
  const rangs = [];
  if (!devis || !devis.niveaux) return rangs;

  // Même raison que pour le Particulier : l'ordre du Résumé prime sur toute
  // liste tenue à part.
  const reference = Array.isArray(devis.ordreLots) && devis.ordreLots.length > 0 ? devis.ordreLots : ordreNiveaux;
  const ids = [
    ...reference.filter((id) => devis.niveaux[id]),
    ...Object.keys(devis.niveaux).filter((id) => !reference.includes(id)),
  ];

  let numeroLot = 0;

  for (const id of ids) {
    const groupe = devis.niveaux[id];
    if (!groupe || !groupe.lignes || groupe.lignes.length === 0) continue;

    numeroLot += 1;
    rangs.push({ type: 'lot', numero: String(numeroLot), libelle: groupe.nom || id, lotId: id });

    groupe.lignes.forEach((ligne, index) => {
      rangs.push({
        type: 'ligne',
        numero: `${numeroLot}.${index + 1}`,
        lotId: id,
        id: ligne.id,
        designation: ligne.designation,
        unite: ligne.unite,
        quantite: ligne.quantite,
        pu: ligne.pu,
        pt: ligne.pt,
        avertissements: ligne.avertissements || [],
      });
    });

    rangs.push({ type: 'sousTotal', libelle: 'SOUS TOTAL', lotId: id, montant: groupe.sousTotal });
  }

  if (rangs.length === 0) return rangs;

  const cascade = devis.cascade || {};
  rangs.push({ type: 'total', libelle: 'TOTAL HT', montant: cascade.totalHT || 0 });
  if (cascade.tva) {
    rangs.push({ type: 'frais', numero: '', libelle: `TVA${pourcentage(cascade.tauxTVA)}`, taux: cascade.tauxTVA, montant: cascade.tva });
  }
  rangs.push({ type: 'totalGeneral', libelle: 'NET À PAYER', montant: cascade.netAPayer || 0 });

  return rangs;
}
