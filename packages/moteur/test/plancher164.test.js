import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genererNoteDeCalcul } from '../src/noteDeCalcul.js';


test('Module Plancher Hourdis 16+4 calcule correctement les quantités et les étapes pour un plancher 10x8', () => {
  const saisie = {
    plancherHourdis16: [
      { longueur: 10, largeur: 8, nombre: 1, tremies: [{ longueur: 2, largeur: 1 }] } // 80m² brut, 2m² trémie -> 78m² net
    ]
  };

  const note = genererNoteDeCalcul(saisie);
  
  const plancherLot = note.lots.find(l => l.id_lot === 'plancher');
  assert.ok(plancherLot, 'Le lot plancher doit exister');

  const ouvrage = plancherLot.ouvrages.find(o => o.id_ouvrage === 'plancherHourdis');
  assert.ok(ouvrage, 'L\'ouvrage plancherHourdis doit exister');

    // Vérifier les étapes dans l'application
    const ligne = ouvrage.lignes[0];
    assert.ok(ligne.application.includes('ÉTAPE 1 : Surface brute de plancher'));
    assert.ok(ligne.application.includes('S_brute = L × l = 10 × 8 = 80 m²'));
    assert.ok(ligne.application.includes('ÉTAPE 3 : Surface nette de plancher'));
    assert.ok(ligne.application.includes('S_nette = S_brute - S_tremies = 80 - 2 = 78 m²'));
    assert.ok(ligne.application.includes('ÉTAPE 16 : Poids de la nappe de compression'));

    // Vérifier les décompositions de matériaux
    const mat = ouvrage.decomposition_materiaux;
    
    // Hourdis
    const hourdis = mat.find(m => m.id_materiau === 'plancherHourdis_hourdis');
    assert.ok(hourdis, 'Hourdis doit exister');
    assert.equal(hourdis.unite, 'u');

    // Poutrelles
    const poutrelles = mat.find(m => m.id_materiau === 'plancherHourdis_poutrelles');
    assert.ok(poutrelles, 'Poutrelles doit exister');
    assert.equal(poutrelles.unite, 'ml');

    // Ciment
    const ciment = mat.find(m => m.id_materiau === 'plancherHourdis_ciment');
    assert.ok(ciment, 'Ciment doit exister');
    assert.equal(ciment.unite, 'sac');
    
});
