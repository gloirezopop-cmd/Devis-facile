import { test } from 'node:test';
import assert from 'node:assert';

import { calculerMetre } from '../src/metre.js';
import { calculerRecettes } from '../src/recettes.js';
import { genererResumePlancher, genererResumeToiture } from '../src/resume.js';
import { genererDevisParticulier } from '../src/valorisation.js';

test('Bloc 5 - Plancher et Toiture', async (t) => {

  const regles = {
    acier: { hypotheses: {} },
    prix: {}
  };

  await t.test('CAS DE TEST - Dalle pleine', () => {
    const saisie = {
      dalles: [{ longueur: 9.65, largeur: 7.15, epaisseurCm: 10, nombre: 1 }]
    };

    const { blocs, avertissements } = calculerMetre(saisie, regles);
    
    // Volume dalle
    assert.ok(Math.abs(blocs.dalles.total - 6.89975) < 0.001, 'Volume 6.89975 m3');
    
    const resume = genererResumePlancher(blocs, regles);
    
    // Matériaux béton
    assert.strictEqual(resume.materiaux.ciment, 49, '49 sacs');
    assert.ok(Math.abs(resume.materiaux.gravier - 8.83168) < 0.001, '8.83168 t gravier');
    assert.ok(Math.abs(resume.materiaux.sable - 4.13985) < 0.001, '4.13985 t sable');
    assert.ok(Math.abs(resume.materiaux.eau - 1207.45625) < 0.001, '1207.45625 L eau');
    
    // Coffrage
    assert.ok(Math.abs(resume.surfaces.coffrage - 77.2772) < 0.001, '77.2772 m2 coffrage');
    assert.strictEqual(resume.materiaux.planches, 95, '95 planches');
    // Chevrons = ceil(surface)
    assert.strictEqual(resume.materiaux.chevrons, 69, '69 chevrons'); // Test expects 69 chevrons
    // Clous
    // v7 Parametres : clous de coffrage = 0,15 kg/m2 (guide p.32).
    assert.ok(Math.abs(resume.materiaux.clous - 11.59158) < 0.05, 'clous a 0,15 kg/m2');
    
    // Aciers
    const nappeL = resume.aciers.lignes.find(a => a.designation === 'Nappe suivant L');
    assert.strictEqual(nappeL.nombreDeFiles, 49, '49 files L');
    assert.ok(Math.abs(nappeL.longueurDeveloppee - 9.61) < 0.001, 'Ld 9.61 m');
    assert.strictEqual(nappeL.nombreBarres12m, 49, '49 barres de 12 m');
    assert.ok(Math.abs(nappeL.poids - 362.796) < 0.01, '362.796 kg L');

    const nappel = resume.aciers.lignes.find(a => a.designation === 'Nappe suivant l');
    assert.strictEqual(nappel.nombreDeFiles, 66, '66 files l');
    assert.ok(Math.abs(nappel.longueurDeveloppee - 7.11) < 0.001, 'Ld 7.11 m');
    assert.strictEqual(nappel.nombreBarres12m, 66, '66 barres de 12 m');
    assert.ok(Math.abs(nappel.poids - 488.664) < 0.01, '488.664 kg l');
    
    // Acier total et ligature
    assert.ok(Math.abs(resume.aciers.totalPoids - 851.46) < 0.01, 'Total acier 851.46 kg');
    assert.ok(Math.abs(resume.materiaux.filLigature - 42.573) < 0.01, 'Ligature 42.573 kg');
  });

  await t.test('CAS DE TEST - Charpente et Couverture', () => {
    const saisie = {
      charpenteBois: [{
        longueur: 9.65, portee: 7.15, debord: 0.50, faitage: 1.50, ecartement: 2.50, section: 0.08, lignesPannes: 5, nombre: 1
      }],
      couvertureToles: [{
        longueur: 9.65, portee: 7.15, debord: 0.50, nombre: 1
      }]
    };

    const { blocs } = calculerMetre(saisie, regles);
    const resume = genererResumeToiture(blocs, regles);
    
    // Charpente
    assert.ok(Math.abs(resume.volumes.charpente - 1.301114) < 0.001, 'Volume charpente 1.301114 m3');
    assert.ok(Math.abs(resume.materiaux.clous_charpente - 26.022275) < 0.01, 'Clous charpente 26.02 kg');
    
    // Couverture
    assert.ok(Math.abs(resume.surfaces.couverture - 86.7975) < 0.001, 'Surface 86.7975 m2');
    assert.strictEqual(resume.materiaux.toles, 76, '76 tôles');
    assert.strictEqual(resume.materiaux.faitieres, 5, '5 faîtières');
    assert.ok(Math.abs(resume.materiaux.clous_toiture - 17.3595) < 0.001, '17.3595 kg de clous toiture');
  });

  await t.test('CAS DE TEST - Acrotère (Terrasse)', () => {
    const saisie = {
      acrotere: [{ perimetre: 33.60, largeur: 0.15, hauteur: 0.15, nombre: 1 }],
      formePente: [{ longueur: 9.65, largeur: 7.15, nombre: 1 }]
    };

    const { blocs } = calculerMetre(saisie, regles);
    const resume = genererResumeToiture(blocs, regles);
    
    assert.ok(Math.abs(resume.volumes.acrotere - 0.756) < 0.001, 'Volume acrotere 0.756 m3');
    assert.strictEqual(resume.materiaux.ciment, 6, '6 sacs ciment pour acrotere');
    assert.ok(Math.abs(resume.surfaces.acrotereMac - (33.60 * 0.15)) < 0.001, 'Surface Mac'); // 33.60 * 0.15
    assert.ok(Math.abs(resume.surfaces.formePente - 68.9975) < 0.001, 'Forme pente 68.9975 m2');
  });

});
