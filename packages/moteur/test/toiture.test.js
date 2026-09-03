import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerMetre, genererResumePlancher, genererResumeToiture, REGLES_DEFAUT } from '../src/index.js';

test('Plancher et Toiture - Cas de test', (t) => {
  const regles = {
    ...REGLES_DEFAUT,
    taux: { ...REGLES_DEFAUT.taux, chuteAcier: 1.00 }, // Pas de majoration forfaitaire sur acier si Ld utilisé pour le compte exact (ou 1.0)
    majorations: { 
      planches: 1.10, chevrons: 1.10, blocs: 1.10, acier: 1.00, sable: 1.00, gravier: 1.00, ciment: 1.00, eau: 1.00, toles: 1.10, bois_charpente: 1.15
    }
  };

  const saisiePlancher = {
    dalles: [{ longueur: 9.65, largeur: 7.15, epaisseurCm: 10, nombre: 1 }],
    plancherHourdis: [{ longueur: 9.65, largeur: 7.15, nombre: 1 }],
  };

  const saisieToiture = {
    charpenteBois: [{ longueur: 9.65, portee: 7.15, debord: 0.50, faitage: 1.50, ecartement: 2.50, section: 0.08, lignesPannes: 5, nombre: 1 }],
    couvertureToles: [{ longueur: 9.65, portee: 7.15, debord: 0.50, nombre: 1 }],
    acrotere: [{ perimetre: 33.60, largeurChainage: 0.15, hauteurChainage: 0.15, hauteurAcrotere: 0.60, nombre: 1 }],
    formePente: [{ longueur: 9.65, largeur: 7.15, nombre: 1 }]
  };

  const metrePlancher = calculerMetre(saisiePlancher, regles);
  
  // Plancher
  const resumePlancher = genererResumePlancher(metrePlancher.blocs, regles);
  assert.equal(resumePlancher.volumes.dalles, 6.89975);
  assert.equal(resumePlancher.materiaux.ciment, 49);
  assert.equal(resumePlancher.materiaux.gravier, 8.83168);
  assert.equal(resumePlancher.materiaux.sable, 4.13985);
  assert.equal(resumePlancher.materiaux.eau, 1207.45625);
  assert.equal(resumePlancher.aciers.lignes[0].nombreDeFiles, 49);
  assert.equal(resumePlancher.aciers.lignes[0].longueurDeveloppee, 9.61);
  assert.equal(resumePlancher.aciers.lignes[0].nombreBarres12m, 49);
  assert.equal(resumePlancher.aciers.lignes[0].poids, 362.796);
  assert.equal(resumePlancher.aciers.lignes[1].nombreDeFiles, 66);
  assert.equal(resumePlancher.aciers.lignes[1].longueurDeveloppee, 7.11);
  assert.equal(resumePlancher.aciers.lignes[1].nombreBarres12m, 66);
  assert.equal(resumePlancher.aciers.lignes[1].poids, 488.664);
  assert.equal(Math.round(resumePlancher.materiaux.filLigature * 1000) / 1000, 42.573);
  assert.equal(resumePlancher.surfaces.coffrage, 77.2772);
  assert.equal(resumePlancher.materiaux.planches, 95);
  assert.equal(resumePlancher.materiaux.chevrons, 69);
  assert.equal(resumePlancher.materiaux.clous, 15.39); // 15.39 -> wait, is it? We'll check

  // Hourdis
  assert.equal(resumePlancher.surfaces.hourdis, 68.9975);

  // Toiture
  const metreToiture = calculerMetre(saisieToiture, regles);
  const resumeToiture = genererResumeToiture(metreToiture.blocs, regles);
  assert.equal(Math.round(resumeToiture.volumes.charpente * 1000000) / 1000000, 1.301114);
  assert.equal(Math.round(resumeToiture.materiaux.clous_charpente * 100000) / 100000, 26.02228);

  // Couverture
  assert.equal(resumeToiture.surfaces.couverture, 86.7975);
  assert.equal(resumeToiture.materiaux.toles, 76);
  assert.equal(resumeToiture.materiaux.faitieres, 5);
  assert.equal(resumeToiture.materiaux.clous_toiture, 17.3595);

  // Acrotère
  assert.equal(resumeToiture.volumes.acrotere, 0.756);
  assert.equal(resumeToiture.materiaux.ciment, 6); // Juste le béton de l'acrotère ? (0.756 * 350 / 50 = 5.292 => 6 sacs)
  assert.equal(resumeToiture.surfaces.acrotereMac, 20.16); // 33.60 * 0.60 = 20.16
});
