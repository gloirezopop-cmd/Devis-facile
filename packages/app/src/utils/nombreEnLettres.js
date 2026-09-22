import { formaterNombre } from './format.js';

/**
 * Convertit un nombre entier en toutes lettres (français).
 * Gère jusqu'à 999 999 999 999 (milliards).
 */
export function numberToFrenchWords(montant) {
  if (montant === 0) return 'zéro';
  if (!Number.isInteger(montant) || montant < 0) return montant.toString();

  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const dizaines = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  function convertBelow100(n) {
    if (n < 20) return unites[n];
    let d = Math.floor(n / 10);
    let u = n % 10;
    
    if (d === 7 || d === 9) {
      d--;
      u += 10;
    }
    
    let result = dizaines[d];
    
    if (d === 8 && u === 0) {
      result += 's'; // quatre-vingts
    } else if (u > 0) {
      if (u === 1 || u === 11) {
        if (d === 8) {
          result += '-' + unites[u]; // quatre-vingt-un
        } else {
          result += ' et ' + unites[u]; // vingt et un, soixante et onze
        }
      } else {
        result += '-' + unites[u];
      }
    }
    
    return result;
  }

  function convertBelow1000(n) {
    if (n < 100) return convertBelow100(n);
    
    let c = Math.floor(n / 100);
    let r = n % 100;
    
    let result = '';
    if (c === 1) {
      result = 'cent';
    } else {
      result = unites[c] + ' cent';
      if (r === 0) result += 's'; // deux cents
    }
    
    if (r > 0) {
      result += ' ' + convertBelow100(r);
    }
    
    return result;
  }

  function convertGroup(n, unitName, isPluralizable) {
    if (n === 0) return '';
    if (n === 1 && unitName === 'mille') return 'mille';
    let result = convertBelow1000(n);
    if (unitName) {
      result += ' ' + unitName;
      if (isPluralizable && n > 1) result += 's';
    }
    return result;
  }

  let result = [];
  
  const milliards = Math.floor(montant / 1000000000);
  let remainder = montant % 1000000000;
  
  const millions = Math.floor(remainder / 1000000);
  remainder = remainder % 1000000;
  
  const milliers = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  
  if (milliards > 0) result.push(convertGroup(milliards, 'milliard', true));
  if (millions > 0) result.push(convertGroup(millions, 'million', true));
  if (milliers > 0) result.push(convertGroup(milliers, 'mille', false));
  if (remainder > 0) result.push(convertBelow1000(remainder));

  return result.join(' ').trim();
}

/**
 * Génère le texte final de l'arrêté du devis.
 */
export function generateDevisArrete(montant_total_devis) {
  const montantChiffres = formaterNombre(montant_total_devis, true);
  const montantLettres = numberToFrenchWords(Math.round(montant_total_devis));
  
  return `Arrêté le présent devis à la somme de ${montantChiffres} FCFA, soit ${montantLettres} francs CFA.`;
}
