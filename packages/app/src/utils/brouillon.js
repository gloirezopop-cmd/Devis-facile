/**
 * Photographier, restaurer et effacer le travail en cours.
 *
 * Tout ce que l'utilisateur saisit — l'assistant d'estimation comme le métré —
 * vit déjà dans le stockage local du navigateur, sous des clés préfixées
 * « df_ ». Le brouillon est exactement cette photo : on ne réinvente pas un
 * second format de sauvegarde qui dériverait du premier à la première
 * évolution d'un formulaire.
 *
 * Une seule clé échappe à ce mécanisme : la bibliothèque des projets
 * enregistrés. Ce sont des projets terminés, volontairement conservés ;
 * « recommencer à zéro » ne doit jamais les effacer.
 */

const PREFIXE = 'df_';

/** Ce qu'un « nouveau projet » ne doit surtout pas emporter. */
export const CLES_PRESERVEES = ['df_projets'];

/** Les clés de travail présentes dans un stockage donné. */
export function clesDeTravail(stockage) {
  const cles = [];
  for (let i = 0; i < stockage.length; i += 1) {
    const cle = stockage.key(i);
    if (cle && cle.startsWith(PREFIXE) && !CLES_PRESERVEES.includes(cle)) cles.push(cle);
  }
  return cles;
}

/** La photo du travail en cours. */
export function collecterEtatLocal(stockage = window.localStorage) {
  const contenu = {};
  for (const cle of clesDeTravail(stockage)) {
    const valeur = stockage.getItem(cle);
    if (valeur !== null) contenu[cle] = valeur;
  }
  return contenu;
}

/**
 * Repose la photo. Le travail local est d'abord effacé : sans cela, un
 * brouillon plus court laisserait derrière lui des restes du projet
 * précédent, et l'utilisateur reprendrait un mélange des deux.
 */
export function restaurerEtatLocal(contenu, stockage = window.localStorage) {
  effacerEtatLocal(stockage);
  for (const [cle, valeur] of Object.entries(contenu || {})) {
    if (!cle.startsWith(PREFIXE) || CLES_PRESERVEES.includes(cle)) continue;
    stockage.setItem(cle, valeur);
  }
}

/** Efface le travail en cours, et lui seul. */
export function effacerEtatLocal(stockage = window.localStorage) {
  for (const cle of clesDeTravail(stockage)) stockage.removeItem(cle);
}

function lire(contenu, cle) {
  try {
    return contenu?.[cle] ? JSON.parse(contenu[cle]) : null;
  } catch {
    return null;
  }
}

/**
 * Un brouillon est vide tant que rien n'a réellement été saisi.
 *
 * Ouvrir l'application crée déjà des clés — les niveaux par défaut du métré,
 * les prix de la bibliothèque — sans que personne n'ait rien fait. Proposer
 * de « reprendre » ce néant serait absurde. On cherche donc une trace de
 * saisie : un pays choisi, une ligne de métré posée, une référence de devis.
 */
export function brouillonEstVide(contenu) {
  if (!contenu || Object.keys(contenu).length === 0) return true;

  const estimation = lire(contenu, 'df_estimation_session');
  if (estimation?.country || estimation?.levels?.length) return false;

  const parametres = lire(contenu, 'df_parametresProjet_v3');
  if (parametres?.reference || parametres?.maitreOuvrage || parametres?.localisation) return false;

  // Les listes d'ouvrages : dès qu'une seule porte une ligne, il y a du
  // travail. Les listes de réglages (taux, prix) ne comptent pas — elles
  // existent d'office.
  for (const [cle, brut] of Object.entries(contenu)) {
    if (!cle.endsWith('_v3')) continue;
    if (['df_niveaux_v3', 'df_taux_v3', 'df_majorations_v3', 'df_bibliothequePrix_v3',
      'df_labelsPrix_v3', 'df_parametresProjet_v3'].includes(cle)) continue;
    try {
      const valeur = JSON.parse(brut);
      if (Array.isArray(valeur) && valeur.length > 0) return false;
    } catch { /* clé illisible : elle ne prouve aucun travail */ }
  }

  return true;
}

/**
 * Une phrase qui dit à l'utilisateur ce qu'il s'apprête à reprendre. Elle ne
 * décrit que ce qui a été réellement saisi : jamais un intitulé inventé pour
 * faire joli.
 */
export function resumerBrouillon(contenu) {
  const morceaux = [];

  const parametres = lire(contenu, 'df_parametresProjet_v3');
  if (parametres?.reference) morceaux.push(`Devis ${parametres.reference}`);
  if (parametres?.maitreOuvrage) morceaux.push(parametres.maitreOuvrage);
  if (parametres?.localisation) morceaux.push(parametres.localisation);

  const estimation = lire(contenu, 'df_estimation_session');
  if (estimation?.country && morceaux.length === 0) {
    morceaux.push('Estimation en cours');
    if (Number.isInteger(estimation.nombreEtages)) morceaux.push(`R+${estimation.nombreEtages}`);
  }

  return morceaux.length ? morceaux.join(' — ') : 'Projet en cours';
}
