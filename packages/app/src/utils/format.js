/**
 * Formate un nombre pour l'affichage selon les règles de la ligne éditoriale.
 * 
 * - Affiche un tiret (-) au lieu de 0 pour les valeurs manquantes.
 * - Utilise l'espace fine insécable (\u202F) comme séparateur de milliers.
 * - Arrondit les montants monétaires (FCFA) à l'entier.
 * - Les quantités peuvent avoir des décimales (2 par défaut).
 * 
 * @param {number|string|null|undefined} valeur - La valeur à formater
 * @param {boolean} estMonetaire - Si vrai, arrondit à l'entier.
 * @returns {string} La chaîne formatée
 */
export function formaterNombre(valeur, estMonetaire = false) {
  if (valeur === null || valeur === undefined || valeur === '' || Number.isNaN(Number(valeur))) {
    return '-';
  }

  const nombre = Number(valeur);
  
  if (nombre === 0) {
    return '-';
  }

  if (estMonetaire) {
    // Les montants sont des entiers, séparateur espace fine (\u202F)
    return Math.round(nombre).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  }

  // Pour les quantités, on autorise jusqu'à 2 décimales, et on enlève les zéros superflus
  const stringVal = (Math.round(nombre * 100) / 100).toString();
  // On ajoute le séparateur de milliers sur la partie entière seulement
  const parties = stringVal.split('.');
  parties[0] = parties[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  return parties.join('.');
}
