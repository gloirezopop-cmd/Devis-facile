import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { preparerSaisiePourMoteur } from '../../app/src/utils/sanitize.js';
import { calculerMetre } from '../src/metre.js';
import { REGLES_DEFAUT } from '../src/regles.js';

describe('Intégration Interface <-> Moteur', () => {
  const niveau = { id: 'test_1', nom: 'Test Niv 1', type: 'elevation', acierHyp: {} };
  
  const mockState = {
    fouilles: [],
    betonProprete: [],
    semelles: [],
    longrines: [],
    colonnes: [],
    maconneries: [],
    soubassements: [],
    carrelages: [],
    autresOuvrages: []
  };

  test('Une semelle saisie au clavier (chaînes) donne 1.728 m3, pas null', () => {
    const state = {
      ...mockState,
      semelles: [{
        id: 's1', niveauId: 'test_1',
        longueur: '1.2', largeur: '1.2', hauteur: '0.3', nombre: '4'
      }]
    };
    
    const saisiePreparee = preparerSaisiePourMoteur(niveau, state);
    const { blocs } = calculerMetre(saisiePreparee, REGLES_DEFAUT);
    
    assert.equal(blocs.semelles.total, 1.728);
  });

  test('Un mur avec trois types d\'ouvertures donne 100.80 brut, 19.59 déduit, 81.21 net', () => {
    const state = {
      ...mockState,
      maconneries: [{
        id: 'm1', niveauId: 'test_1',
        longueur: '33.60', hauteur: '3.00', nombre: '1',
        ouvertures: [
          { type: 'Porte', largeur: '0.90', hauteur: '2.10', nombre: '3' },
          { type: 'Fenêtre', largeur: '1.20', hauteur: '1.20', nombre: '6' },
          { type: 'Baie', largeur: '2.40', hauteur: '2.20', nombre: '1' }
        ]
      }]
    };
    
    const saisiePreparee = preparerSaisiePourMoteur(niveau, state);
    const { blocs } = calculerMetre(saisiePreparee, REGLES_DEFAUT);
    
    assert.equal(blocs.maconnerie.lignes[0].surfaceBrute, 100.8);
    assert.equal(blocs.maconnerie.lignes[0].deductions, 19.59);
    assert.equal(blocs.maconnerie.total, 81.21);
  });

  test('Une longrine saisie donne un volume non nul', () => {
    const state = {
      ...mockState,
      longrines: [{
        id: 'l1', niveauId: 'test_1',
        perimetre: '10', largeur: '0.2', hauteur: '0.4'
      }]
    };
    const saisiePreparee = preparerSaisiePourMoteur(niveau, state);
    const { blocs } = calculerMetre(saisiePreparee, REGLES_DEFAUT);
    assert.equal(blocs.longrines.total, 0.8);
  });

  test('Une colonne saisie donne un volume non nul', () => {
    // sanitize.js envoie desormais ces lignes sous `colonnes` (longueur/largeur
    // en metres), pas sous l'ancien `poteaux` (sectionA/sectionB en cm) : le
    // formulaire Elevation.jsx saisit longueur/largeur directement, en accord
    // avec la formule a x b x H x N du bloc `colonnes`.
    const state = {
      ...mockState,
      colonnes: [{
        id: 'c1', niveauId: 'test_1',
        longueur: '0.40', largeur: '0.20', hauteur: '3.4', nombre: '5'
      }]
    };
    const saisiePreparee = preparerSaisiePourMoteur(niveau, state);
    const { blocs } = calculerMetre(saisiePreparee, REGLES_DEFAUT);
    // 0.40m x 0.20m x 3.4m x 5 = 1.36
    assert.equal(blocs.colonnes.total, 1.36);
  });

  test('Un carrelage saisi donne une surface non nulle', () => {
    const state = {
      ...mockState,
      carrelages: [{
        id: 'c1', niveauId: 'test_1',
        longueur: '5', largeur: '4', nombre: '1'
      }]
    };
    const saisiePreparee = preparerSaisiePourMoteur(niveau, state);
    const { blocs } = calculerMetre(saisiePreparee, REGLES_DEFAUT);
    assert.equal(blocs.carrelage.total, 20);
  });

  test('La trace d\'une valeur calculée contient formule, entrees, resultat et unite', () => {
    const state = {
      ...mockState,
      semelles: [{
        id: 's1', niveauId: 'test_1',
        longueur: '1.2', largeur: '1.2', hauteur: '0.3', nombre: '4'
      }]
    };
    const saisiePreparee = preparerSaisiePourMoteur(niveau, state);
    const { blocs } = calculerMetre(saisiePreparee, REGLES_DEFAUT);
    const trace = blocs.semelles.lignes[0].trace;
    
    assert.ok(trace.formule);
    assert.ok(trace.entrees);
    assert.ok(trace.resultat !== undefined);
    assert.ok(trace.unite);
  });

  test('Une clé de saisie inconnue produit un avertissement « saisie ignorée »', () => {
    const state = {
      ...mockState,
      cleInconnue: [{ truc: 'test' }]
    };
    // Simulation du comportement où une clé inconnue arrive au moteur
    const saisiePreparee = { ...preparerSaisiePourMoteur(niveau, state), unknownKey: [{ val: 1 }] };
    const { avertissements } = calculerMetre(saisiePreparee, REGLES_DEFAUT);
    
    const hasIgnored = avertissements.some(a => a.type === 'saisie-ignoree' && a.bloc === 'unknownKey');
    assert.ok(hasIgnored, "Devrait signaler que unknownKey est ignorée");
  });
});
