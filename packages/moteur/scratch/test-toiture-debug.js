import { calculerMetre } from '../src/metre.js';
import { genererResumeChantier } from '../src/resumeChantier.js';

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
console.log("blocs.toiturePro:", resultMetre.blocs.toiturePro);

const resume = genererResumeChantier(saisie, {});
console.log("titres.toiture in parTitre:", JSON.stringify(resume, null, 2));
