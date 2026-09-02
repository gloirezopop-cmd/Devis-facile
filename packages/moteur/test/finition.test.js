import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculerMetre } from '../src/metre.js';
import { calculerRecettes } from '../src/recettes.js';
import { genererResumeFinition } from '../src/resume.js';
import { REGLES_DEFAUT } from '../src/regles.js';

describe('Bloc 5 - Finition', () => {
  it('CAS DE TEST - Maçonnerie, Enduit, Peinture, Carrelage, Faïence', () => {
    const saisie = {
      maconnerie: [
        {
          longueur: 33.60, hauteur: 3.00, epaisseur: 0.15,
          ouvertures: [
            { type: 'porte', nombre: 3, largeur: 0.90, hauteur: 2.10 },
            { type: 'fenetre', nombre: 6, largeur: 1.20, hauteur: 1.20 }
          ],
          colonnes: [
            { nombre: 12, largeur: 0.20, hauteur: 3.00 }
          ]
        }
      ],
      enduits: [
        { longueur: 159, hauteur: 1, nombre: 1 } // Surface directe
      ],
      peinture: [
        { longueur: 159, hauteur: 1, nombre: 1, type: 'latex' }
      ],
      carrelage: [
        { longueur: 69.05, largeur: 1, nombre: 1, epaisseur: 0.03 } // epaisseur mortier 3cm
      ],
      faience: [
        { longueur: 25, hauteur: 1, nombre: 1 }
      ]
    };

    const { blocs } = calculerMetre(saisie, REGLES_DEFAUT);
    
    // 1. Maçonnerie isolée
    const m = blocs.maconnerie.lignes[0];
    assert.ok(Math.abs(m.surfaceBrute - 100.80) < 0.01, 'Brute 100.80 m2');
    assert.ok(Math.abs(m.deductions - 21.51) < 0.01, 'Déductions 5.67+8.64+7.20 = 21.51');
    const sp = (0.40 + 0.015) * (0.20 + 0.015); // 0.089225
  const surfaceNette = 75.76;
  const majoration = 1.10;
  const blocsAchat = Math.ceil((surfaceNette / sp) * majoration);

  assert.strictEqual(
    m.nombreBlocs,
    blocsAchat,
    `${blocsAchat} blocs majorés`,
  );
    assert.ok(Math.abs(m.volumeMortier - 1.230280) < 0.001, 'Mortier 1.23 m3');

    const recMac = calculerRecettes({ maconnerie: blocs.maconnerie });
    assert.strictEqual(recMac.ciment.quantite, 8, '8 sacs ciment maconnerie');
    assert.ok(recMac.sable.quantite > 0, 'Sable maconnerie present');
    assert.strictEqual(recMac.eau.quantite, 200, 'Eau 200 L maconnerie');
    assert.strictEqual(Math.ceil(m.valeur / 0.089225 * 1.10), 978, 'Vérification des blocs');

    // 2. Enduit
    const recEnd = calculerRecettes({ enduits: blocs.enduits });
    assert.strictEqual(recEnd.ciment.quantite, 26, '26 sacs ciment enduit');
    assert.ok(recEnd.sable.quantite > 0, 'Sable enduit present');
    assert.strictEqual(recEnd.eau.quantite, 650, 'Eau 650 L enduit');

    // 3. Peinture Latex
    const recPein = calculerRecettes({ peinture: blocs.peinture });
    assert.strictEqual(recPein.peinture_latex.quantite, 39.75, 'Latex 39.75 kg');

    // 4. Carrelage
    const recCar = calculerRecettes({ carrelage: blocs.carrelage });
    assert.strictEqual(Math.ceil(recCar.carreaux.quantite), 844, '844 carreaux');
    assert.strictEqual(Math.ceil(recCar.carreaux.quantite / 12), 71, '71 cartons carrelage');
    assert.strictEqual(recCar.cimentColle.quantite, 552.4, '552.4 kg ciment colle carrelage');
    assert.ok(recCar.sable.quantite > 0, 'Sable carrelage present');
    assert.strictEqual(recCar.ciment.quantite, 13, '13 sacs ciment mortier carrelage');

    // 5. Faïence
    const recFai = calculerRecettes({ faience: blocs.faience });
    assert.strictEqual(Math.ceil(recFai.faience.quantite), 275, '275 pièces faïence');
    assert.strictEqual(Math.ceil(recFai.faience.quantite / 10), 28, '28 cartons faïence');
    assert.strictEqual(recFai.cimentColle.quantite, 200, '200 kg ciment colle faience');
  });
});
