import { calculerMetre } from '../src/metre.js';
import { calculerRecettes } from '../src/recettes.js';
import { genererResumeChantier } from '../src/resumeChantier.js';
import { genererDevisParticulier } from '../src/valorisation.js';

const toitureConfig = {
  id: Date.now(),
  niveauId: 'toiture',
  Lb: 10.30, L: 9.00, hauteur: 1.40, nbVersants: 2, debordToiture: 0.60, debordTole: 0,
  espFermes: 2.50, espPannes: 0.90, lcBois: 5, ldFerme: 50.35, pertesMadriers: 2, depassementPanne: 0.30, pertesPannes: 2, espChevrons: 1.0,
  toleLong: 3.05, toleLarg: 0.80, recouvL: 0.20, recouvT: 0.10, clousParTole: 9, clousParKg: 58,
  piecesPlafond: [], triplexLong: 2.44, triplexLarg: 1.22, pertesTriplexL: 0.44, pertesTriplexT: 0.12, espChevronsPlafond: 1.0
};

const saisie = {
  niveaux: [{ id: 'toiture', type: 'toiture' }],
  toituresPro: [toitureConfig]
};

const resultMetre = calculerMetre(saisie);
console.log("Metre toiturePro:", resultMetre.blocs.toiturePro ? "OK" : "MISSING");

const recettes = calculerRecettes(resultMetre.blocs);
console.log("Recettes:", Object.keys(recettes));

const resume = genererResumeChantier({ metreParNiveau: [{ niveauId: 'toiture', metre: resultMetre }] }, {});
console.log("Resume Titres Utiles:", resume.titres.map(t => t.titre));

const devis = genererDevisParticulier({ metreParNiveau: [{ niveauId: 'toiture', metre: resultMetre }] }, recettes, { ciment: 5000, bois_charpente: 100000, clous_charpente: 1000, clous_toiture: 1000, toles: 5000 });
console.log("Devis Lots:", devis.lots.toiture);
