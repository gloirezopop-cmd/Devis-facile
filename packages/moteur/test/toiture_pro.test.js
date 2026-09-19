import test from 'node:test';
import assert from 'node:assert';
import { 
  calculateFermes, 
  calculateMadriers, 
  calculateRoofSlope, 
  calculatePannes, 
  calculateCouverture,
  calculateChevronsLD
} from '../src/toiture.js';

test('Calcul du nombre de fermes', (t) => {
  const Lb = 10.30;
  const e = 2.50;
  const resultat = calculateFermes(Lb, e);
  
  assert.strictEqual(resultat.quantite_finale, 6, "Devrait donner 6 fermes");
  assert.strictEqual(resultat.resultat_brut, 5.12, "Le calcul brut devrait être 5.12");
});

test('Calcul des madriers de ferme', (t) => {
  const ldFerme = 50.35;
  const nFermes = 6;
  const lc = 5;
  const pertes = 2; // + 2 pièces forfaitaires
  
  const resultat = calculateMadriers(ldFerme, nFermes, lc, pertes);
  
  assert.strictEqual(resultat.quantite_finale, 63, "Devrait donner 63 madriers");
  assert.strictEqual(Math.round(resultat.ldTotal * 100) / 100, 302.10, "LD total doit être 302.10");
});

test('Calcul du versant', (t) => {
  const demiPortee = 4.00;
  const hauteur = 1.40;
  
  const resultat = calculateRoofSlope(demiPortee, hauteur);
  assert.strictEqual(resultat.resultat_brut.toFixed(2), "4.24", "Versant géométrique doit être environ 4.24");
});

test('Calcul des pannes', (t) => {
  const longueurVersant = 4.93;
  const espacement = 0.90;
  const nbVersants = 2;
  const Lb = 10.30;
  const depassement = 0.30;
  const lc = 5;
  const pertes = 2; // pièces forfaitaires
  
  const resultat = calculatePannes(longueurVersant, espacement, nbVersants, Lb, depassement, lc, pertes);
  
  assert.strictEqual(resultat.pannesParVersant, 7, "Devrait donner 7 pannes par versant");
  assert.strictEqual(resultat.nTotal, 14, "Devrait donner 14 pannes au total");
  assert.strictEqual(Math.round(resultat.ldPanne * 100) / 100, 10.60, "Longueur développée d'une panne doit être 10.60");
  assert.strictEqual(Math.round(resultat.ldTotal * 100) / 100, 148.40, "LD totale pannes doit être 148.40");
  assert.strictEqual(resultat.quantite_finale, 32, "Devrait donner 32 pièces avec les pertes");
});

test('Calcul de la couverture en tôle', (t) => {
  const surface = 92.70;
  const toleL = 3.05;
  const tolel = 0.80;
  const recouvL = 0.20;
  const recouvT = 0.10;
  const clousParTole = 9;
  const clousParKg = 58;
  
  const resultat = calculateCouverture(surface, toleL, tolel, recouvL, recouvT, clousParTole, clousParKg);
  
  assert.strictEqual(resultat.toles.quantite_finale, 47, "Devrait donner 47 tôles");
  assert.strictEqual(resultat.clous.quantite_finale, 8, "Devrait donner 8 kg de clous"); 
});

test('Calcul des chevrons par LD', (t) => {
  const Lb = 10.30;
  const L = 9.00;
  const espacement = 1.00;
  const lc = 5;
  
  const resultat = calculateChevronsLD(Lb, L, espacement, lc);
  
  assert.strictEqual(resultat.nLong, 10, "10 pièces sens longitudinal");
  assert.strictEqual(resultat.nTrans, 12, "12 pièces sens transversal");
  assert.strictEqual(resultat.ldTotal, 10 * 10.30 + 12 * 9.00, "LD total doit être la somme");
  assert.strictEqual(resultat.quantite_finale, 43, "Quantité finale calculée"); // 211 / 5 = 42.2 => 43
});
