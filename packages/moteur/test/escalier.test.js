import test from 'node:test';
import assert from 'node:assert';
import { calculerMetre, _internes } from '../src/metre.js';

test('Escalier - Géométrie et Volumes', async (t) => {

  await t.test('Cas de test §8 : Géométrie et volume avec arrivee_palier', () => {
    const saisie = {
      escalier: [{
        id: 'esc-1',
        mode: 'geometrie',
        nombre: 1,
        volees: [{
          hauteurAMonter: 1.53,
          nombreContremarches: 9,
          giron: 0.28,
          largeur: 1.20,
          epaisseurPaillasse: 0.15,
          typeEpaisseur: 'perpendiculaire',
          convention: 'arrivee_palier'
        }],
        paliers: [{
          longueur: 1.20,
          largeur: 1.20,
          epaisseur: 0.15
        }]
      }]
    };

    const { blocs } = calculerMetre(saisie, {});
    const vol = blocs.escalier.total;

    // V_paillasse = 1.20 * 0.15 * L
    // Lp = 8 * 0.28 = 2.24
    // L = sqrt(1.53^2 + 2.24^2) = 2.7126555
    // V_paillasse = 0.488278
    // V_marches = 0.5 * 0.28 * (1.53/9) * 1.20 * 8 = 0.22848
    // V_volee = 0.716758
    // V_palier = 1.2 * 1.2 * 0.15 = 0.216
    // V_total = 0.716758 + 0.216 = 0.932758 ~ 0.9328 m³
    
    assert.ok(Math.abs(vol - 0.9328) < 0.001, `Le volume total doit être de 0.9328 m³, obtenu: ${vol}`);
  });

  await t.test('Cas de test §8 : convention marche_terminale', () => {
    const saisie = {
      escalier: [{
        mode: 'geometrie',
        nombre: 1,
        volees: [{
          hauteurAMonter: 1.53,
          nombreContremarches: 9,
          giron: 0.28,
          largeur: 1.20,
          epaisseurPaillasse: 0.15,
          typeEpaisseur: 'perpendiculaire',
          convention: 'marche_terminale'
        }]
      }]
    };

    const { blocs } = calculerMetre(saisie, {});
    
    // Ng = 9
    // Lp = 9 * 0.28 = 2.52
    // L = sqrt(1.53^2 + 2.52^2) = 2.9481
    // V_marches = 0.5 * 0.28 * 0.17 * 1.2 * 9 = 0.25704
    // Le volume des marches doit être ~0.2570
    // V_paillasse = 1.2 * 0.15 * 2.9481 = 0.53065
    // V_total = 0.7877
    assert.ok(Math.abs(blocs.escalier.total - 0.7877) < 0.001, `V_total = 0.7877, obtenu: ${blocs.escalier.total}`);
  });

  await t.test('Cas de test §8 : typeEpaisseur verticale', () => {
    const saisie = {
      escalier: [{
        mode: 'geometrie',
        nombre: 1,
        volees: [{
          hauteurAMonter: 1.53,
          nombreContremarches: 9,
          giron: 0.28,
          largeur: 1.20,
          epaisseurPaillasse: 0.15,
          typeEpaisseur: 'verticale',
          convention: 'arrivee_palier'
        }]
      }]
    };

    const { blocs } = calculerMetre(saisie, {});
    
    // V_paillasse = 0.4032
    // V_marches = 0.22848
    // V_total = 0.63168
    assert.ok(Math.abs(blocs.escalier.total - 0.6317) < 0.001, `V_total = 0.6317, obtenu: ${blocs.escalier.total}`);
  });

});

test('Escalier - Ferraillage (Extractions)', async (t) => {
  const regles = {
    acier: { hypotheses: {} } // Will use defaults
  };

  await t.test('Cas de test §8 : Ferraillage complet (Principale + Répartition + Palier)', () => {
    const saisie = {
      escalier: [{
        id: 'esc-1',
        mode: 'geometrie',
        nombre: 1,
        volees: [{
          hauteurAMonter: 1.53,
          nombreContremarches: 9,
          giron: 0.28,
          largeur: 1.20,
          epaisseurPaillasse: 0.15,
          convention: 'arrivee_palier',
          ferraillage: {
            principales: { diametre: 12, espacement: 0.15 },
            repartition: { diametre: 8, espacement: 0.20 },
            chapeaux: { actif: false },
            repartitionSup: { actif: false }
          }
        }],
        paliers: [{
          longueur: 1.20,
          largeur: 1.20,
          ferraillage: { diametre: 10, espacement: 0.15 }
        }]
      }]
    };

    const armatures = _internes.extractionsArmatures.escalier(saisie.escalier[0], regles);
    
    const prin = armatures.find(a => a.designation.includes('Principales inf.'));
    assert.strictEqual(prin.nombreDeFiles, 9, '9 files pour les principales');
    // L_inclinee = 2.7126555
    // Ld = 2.7126555 - 2 * 0.02 + 2 * 0.10 = 2.8726555
    assert.ok(Math.abs(prin.longueurDeveloppee - 2.8726555) < 0.001, `Ld = 2.8726555, obtenu ${prin.longueurDeveloppee}`);
    assert.strictEqual(prin.nombreBarres12m, 3, '3 barres de 12m');
    assert.ok(Math.abs(prin.poids - 31.680) < 0.001, `Poids = 31.680, obtenu ${prin.poids}`);

    const rep = armatures.find(a => a.designation.includes('Répartition inf.'));
    assert.strictEqual(rep.nombreDeFiles, 15, '15 files pour la repartition');
    assert.ok(Math.abs(rep.longueurDeveloppee - 1.36) < 0.001, 'Ld repartition = 1.36m');
    assert.strictEqual(rep.nombreBarres12m, 2, '2 barres de 12m pour rep');
    assert.ok(Math.abs(rep.poids - 9.480) < 0.001, 'Poids rep = 9.480');

    const palierL = armatures.find(a => a.designation.includes('Nappe sens L'));
    const palierl = armatures.find(a => a.designation.includes('Nappe sens l'));
    assert.ok(Math.abs(palierL.poids - 7.404) < 0.001, 'Poids palier L = 7.404');
    assert.ok(Math.abs(palierl.poids - 7.404) < 0.001, 'Poids palier l = 7.404');

    const totalPoids = armatures.reduce((acc, a) => acc + a.poids, 0);
    assert.ok(Math.abs(totalPoids - 55.968) < 0.001, `Poids total = 55.968 kg, obtenu ${totalPoids}`);
  });

  await t.test('Cas de test §8 : Ferraillage complet avec chapeaux', () => {
    const saisie = {
      escalier: [{
        id: 'esc-1',
        mode: 'geometrie',
        nombre: 1,
        volees: [{
          hauteurAMonter: 1.53,
          nombreContremarches: 9,
          giron: 0.28,
          largeur: 1.20,
          epaisseurPaillasse: 0.15,
          convention: 'arrivee_palier',
          ferraillage: {
            principales: { diametre: 12, espacement: 0.15 },
            repartition: { diametre: 8, espacement: 0.20 },
            chapeaux: { actif: true, diametre: 10, espacement: 0.15 },
            repartitionSup: { actif: true, diametre: 8, espacement: 0.20 }
          }
        }],
        paliers: [{
          longueur: 1.20,
          largeur: 1.20,
          ferraillage: { diametre: 10, espacement: 0.15 }
        }]
      }]
    };

    const armatures = _internes.extractionsArmatures.escalier(saisie.escalier[0], regles);

    const chap = armatures.find(a => a.designation.includes('Chapeaux appuis'));
    assert.strictEqual(chap.nombreDeFiles, 18, '18 files de chapeaux (2 appuis)');
    // L_inclinee = 2.7126555, L_chapeau = 2.7126555/5 + 0.40 = 0.94253
    assert.ok(Math.abs(chap.longueurDeveloppee - 0.9425) < 0.001, 'Ld chapeau = 0.9425');
    assert.strictEqual(chap.nombreBarres12m, 2, '2 barres de 12m pour les chapeaux');
    assert.ok(Math.abs(chap.poids - 14.808) < 0.001, `Poids chapeau = 14.808, obtenu ${chap.poids}`);

    const repSup = armatures.find(a => a.designation.includes('Répartition sup.'));
    assert.strictEqual(repSup.nombreDeFiles, 11, '11 files pour la repartition superieure');
    assert.ok(Math.abs(repSup.poids - 9.480) < 0.001, `Poids repartition superieure = 9.480, obtenu ${repSup.poids}`);

    const totalPoids = armatures.reduce((acc, a) => acc + a.poids, 0);
    assert.ok(Math.abs(totalPoids - 80.256) < 0.001, `Poids total = 80.256 kg, obtenu ${totalPoids}`);
  });

  await t.test('Garde-fou Ratio < 70 kg/m3', async () => {
    const saisie = {
      escalier: [{
        id: 'esc-1',
        mode: 'geometrie',
        nombre: 1,
        volees: [{
          hauteurAMonter: 1.53,
          nombreContremarches: 9,
          giron: 0.28,
          largeur: 1.20,
          epaisseurPaillasse: 0.15,
          convention: 'arrivee_palier',
          ferraillage: { // Ferraillage ridicule pour déclencher le garde-fou
            principales: { diametre: 6, espacement: 0.30 },
            repartition: { diametre: 6, espacement: 0.30 },
            chapeaux: { actif: false },
            repartitionSup: { actif: false }
          }
        }]
      }]
    };

    const { genererResumeElevation } = await import('../src/resume.js');
    const { calculerMetre } = await import('../src/metre.js');
    
    const { blocs } = calculerMetre(saisie, regles);
    const resume = genererResumeElevation(blocs, regles);
    
    assert.ok(resume.avertissements.some(msg => msg.includes('kg/m³ (attendu entre 70 et 130)')), 'Un avertissement doit être émis pour le ratio armature');
  });

  await t.test('Garde-fou Coffrage < 9.6 m2/m3', async () => {
    const saisie = {
      escalier: [{
        id: 'esc-1',
        mode: 'geometrie',
        nombre: 1,
        // Une épaisseur de paillasse géante fait chuter le ratio m2/m3
        volees: [{
          hauteurAMonter: 1.53,
          nombreContremarches: 9,
          giron: 0.28,
          largeur: 1.20,
          epaisseurPaillasse: 1.00,
          convention: 'arrivee_palier'
        }]
      }]
    };

    const { genererResumeElevation } = await import('../src/resume.js');
    const { calculerMetre } = await import('../src/metre.js');
    
    const { blocs } = calculerMetre(saisie, regles);
    const resume = genererResumeElevation(blocs, regles);
    
    assert.ok(resume.avertissements.some(msg => msg.includes('m²/m³ (attendu ~12)')), 'Un avertissement doit être émis pour le ratio coffrage');
  });
});
