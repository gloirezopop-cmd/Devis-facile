import { test } from 'node:test';
import assert from 'node:assert';

import { calculerMetre } from '../src/metre.js';
import { genererResumeElevation } from '../src/resume.js';
import { REGLES_DEFAUT } from '../src/regles.js';

test('Bloc 4 - Élévation', async (t) => {

  const regles = {
    acier: { hypotheses: {} }
  };

  await t.test('CAS DE TEST - Colonne 0.20 x 0.20 x 3.00, N=12', () => {
    const saisie = {
      colonnes: [{ longueur: 0.20, largeur: 0.20, hauteur: 3.00, nombre: 12 }]
    };

    const { blocs } = calculerMetre(saisie, regles);
    assert.strictEqual(blocs.colonnes.total, 1.44, 'Volume colonne = 1.44 m3');

    const resume = genererResumeElevation(blocs, regles);
    
    assert.strictEqual(resume.materiaux.ciment, 11, 'Ciment = 11 sacs');
    
    assert.strictEqual(resume.materiaux.gravier, 2, 'Gravier arrondi a 2 t');
    assert.strictEqual(resume.materiaux.sable, 1, 'Sable arrondi a 1 t');
    assert.strictEqual(resume.materiaux.eau, 252, 'Eau = 252 L');
    // Aciers Colonne
    const prin = resume.aciers.lignes.find(l => l.designation.startsWith('Principale'));
    assert.ok(prin, 'Aciers principaux extraits');
    assert.strictEqual(prin.nombreDeFiles, 48, '48 files principales'); 
    assert.ok(Math.abs(prin.longueurDeveloppee - 3.44) < 0.01, 'Ld 3.44m (3 - 0.04 + 0.48)');
    
    const cadres = resume.aciers.lignes.find(l => l.designation.startsWith('Cadre'));
    assert.strictEqual(cadres.nombreDeFiles, 252, '252 cadres');
    assert.ok(Math.abs(cadres.longueurDeveloppee - 0.64) < 0.01, 'Ld cadre 0.64m');

    assert.ok(Math.abs(resume.volumes.coffrage - 28.80) < 0.001, 'Coffrage 28.80 m2');
  });

  await t.test('CAS DE TEST - Ceinture', () => {
    const saisie = {
      ceintures: [{ perimetre: 33.60, largeur: 0.15, hauteur: 0.20, nombre: 1 }]
    };
    const { blocs } = calculerMetre(saisie, regles);
    const resume = genererResumeElevation(blocs, regles);
    
    assert.ok(Math.abs(resume.volumes.ceintures - 1.008) < 0.001, 'Volume ceinture 1.008');
    assert.strictEqual(resume.materiaux.ciment, 8, 'Ciment 8 sacs (1.008 * 350 / 50 = 7.056 -> 8)');
    
    const prin = resume.aciers.lignes.find(l => l.designation.startsWith('Principale'));
    assert.strictEqual(prin.longueurDeveloppee, 33.60, 'Principale = périmètre');
    
    const cadres = resume.aciers.lignes.find(l => l.designation.startsWith('Cadre'));
    assert.strictEqual(cadres.diametre, 6, 'Cadre diametre 6');
  });

  await t.test('CAS DE TEST - Linteaux', () => {
    const saisie = {
      linteaux: [{ longueur: 1.40, largeur: 0.15, hauteur: 0.15, nombre: 9 }]
    };
    const { blocs } = calculerMetre(saisie, regles);
    const resume = genererResumeElevation(blocs, regles);
    
    assert.ok(Math.abs(resume.volumes.linteaux - 0.2835) < 0.001, 'Volume 0.2835');
    
    const prin = resume.aciers.lignes.find(l => l.designation.startsWith('Principale'));
    assert.strictEqual(prin.nombreBarres12m, 3, '3 barres de 12m pour les linteaux');
    
    const cadres = resume.aciers.lignes.find(l => l.designation.startsWith('Cadre'));
    assert.strictEqual(cadres, undefined, 'Pas de cadres pour linteaux');
  });

  await t.test('CAS DE TEST - Escalier ratio', () => {
    const saisie = {
      escalier: [{ volume: 3.5, nombre: 1 }]
    };
    const { blocs } = calculerMetre(saisie, regles);
    const resume = genererResumeElevation(blocs, regles);
    
    assert.strictEqual(resume.volumes.escalier, 3.5, 'Volume 3.5');
    assert.strictEqual(resume.volumes.coffrage, 42, 'Coffrage 42 m2');
    
    const acier = resume.aciers.lignes.find(l => l.designation.includes('Ratio'));
    assert.strictEqual(acier.poids, 350, 'Poids 350kg');
  });

  await t.test('Totaux Élévation combinés (RDC)', () => {
    const saisie = {
      colonnes: [{ longueur: 0.20, largeur: 0.20, hauteur: 3.00, nombre: 12 }],
      ceintures: [{ perimetre: 33.60, largeur: 0.15, hauteur: 0.20, nombre: 1 }],
      linteaux: [{ longueur: 1.40, largeur: 0.15, hauteur: 0.15, nombre: 9 }],
      escalier: [{ volume: 3.5, nombre: 1 }]
    };
    const { blocs } = calculerMetre(saisie, regles);
    const resume = genererResumeElevation(blocs, regles);
    
    assert.ok(resume.aciers.totalPoids > 500, 'Acier total RDC > 500kg');
    // Le fil de ligature passe par filDeLigature(), qui arrondit a 6 decimales
    // comme tout le moteur : on compare donc a la tolerance, pas au bit pres.
    assert.ok(
      Math.abs(resume.materiaux.filLigature - resume.aciers.totalPoids * 0.05) < 1e-6,
      'Fil 5% du poids',
    );
  });

});
