import test from 'node:test';
import assert from 'node:assert/strict';
import { calculerMetre, calculerRecettes } from '../src/index.js';

test('Finition - Maçonnerie, Enduit, Peinture, Carrelage', () => {
  const regles = {
    majorations: {
      blocs: 1.10,
      carreaux: 1.10
    }
  };

  const saisie = {
    niveaux: [{ id: 'niv1', nom: 'RDC', type: 'elevation' }],
    maconnerie: [
      {
        id: 'M1',
        niveauId: 'niv1',
        repere: 'M1',
        longueur: 33.60,
        hauteur: 3.00,
        nombre: 1,
        epaisseur: 0.15,
        longueurBloc: 0.40,
        hauteurBloc: 0.20,
        colonnes: [{ nombre: 6, largeur: 0.20, hauteur: 3.00 }],
        ouvertures: [{ type: 'porte', nombre: 1, largeur: 0.90, hauteur: 2.10 }]
      }
    ],
    enduits: [
      { id: 'E1', niveauId: 'niv1', repere: 'END1', surface: 190.62, nombre: 1 }
    ],
    peinture: [
      { id: 'P1', niveauId: 'niv1', repere: 'PNT1', longueur: 63.54, hauteur: 3.00, type: 'latex', nombre: 1 } // 63.54 * 3 = 190.62
    ],
    carrelage: [
      { id: 'C1', niveauId: 'niv1', repere: 'SDB', longueur: 2.00, largeur: 2.00, nombre: 1 } // surface: 4.00
    ]
  };

  const metre = calculerMetre(saisie, regles);
  
  // Assertions Maçonnerie
  const mac = metre.blocs.maconnerie;
  assert.equal(mac.lignes.length, 1);
  const m1 = mac.lignes[0];
  assert.equal(m1.surfaceBrute, 100.80);
  assert.equal(m1.deductions, 5.49);
  assert.equal(m1.valeur, 95.31);
  assert.equal(m1.nombreBlocsNet, 1069);
  assert.equal(m1.nombreBlocs, 1176); 
  assert.equal(m1.volumeMortier, 1.479229);

  // Assertions Enduit
  const end = metre.blocs.enduits;
  assert.equal(end.total, 190.62);

  // Assertions Peinture
  const pnt = metre.blocs.peinture;
  assert.equal(pnt.total, 190.62);

  // Assertions Carrelage
  const car = metre.blocs.carrelage;
  assert.equal(car.total, 4.00);

  // Recettes
  const recettes = calculerRecettes(metre.blocs, regles);

  // Blocs
  assert.equal(recettes.blocs.quantiteNette, 1069);
  assert.equal(recettes.blocs.quantite, 1175.9);

  // Enduit
  // Ciment enduit = ceil(190.62 * 8 / 50) = 31 sacs
  // Ciment maçonnerie = ceil(1.48 * 300 / 50) = ceil(8.88) = 9 sacs
  // Ciment pose = ceil(4 * 0.03 * 300 / 50) = ceil(0.72) = 1 sac
  // Total ciment attendu = 31 + 9 + 1 = 41 sacs
  assert.equal(recettes.ciment.quantiteNette, 41);

  // Peinture Latex = 190.62 / 4 = 47.655 kg
  assert.equal(recettes.peinture_latex.quantiteNette, 47.655);

  // Carreaux
  assert.equal(recettes.carreaux.quantiteNette, 45); // ceil(4 / 0.09) = 45
  assert.equal(recettes.carreaux.quantite, 49.5); // 45 * 1.1

  // Ciment colle
  assert.equal(recettes.cimentColle.quantiteNette, 32);

  // Sable
  // Mortier maç = 1.48 * 1.0 * 1.50 = 2.22 t
  // Enduit = (31 * 50 / 300) * 1 * 1.50 = 7.75 t
  // Mortier pose = 4 * 0.03 * 1.50 = 0.18 t
  assert.equal(recettes.sable.quantiteNette, 10.148843);
  
  // Eau
  assert.equal(recettes.eau.quantiteNette, 1000);
});
