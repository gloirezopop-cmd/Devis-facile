import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculerMetre, _internes } from '../src/metre.js';
const { extractionsArmatures } = _internes;
import { calculerRecettes } from '../src/recettes.js';
import { REGLES_DEFAUT } from '../src/regles.js';

describe('Bloc 3 - Fondations', () => {
  it('CAS DE TEST - perimetre 60.85 m, 12 amorces 0.15 x 0.15', () => {
    const saisie = {
      semelles: [
        { nombre: 12, longueur: 0.35, largeur: 0.35, hauteur: 0.30, amorceSectionA: 15, amorceSectionB: 15, amorceHauteur: 0.55 }
      ],
      longrines: [
        { perimetre: 60.85, largeur: 0.20, hauteur: 0.30, nombre: 1 }
      ],
      murSoubassement: [
        { perimetre: 60.85, hauteur: 0.60, nombre: 1 }
      ],
      chapeEgalisation: [
        { perimetre: 60.85, largeur: 0.40, epaisseur: 0.05, nombre: 1 }
      ],
      sousPavement: [
        { longueur: 9.65, largeur: 7.15, epaisseur: 0.10, nombre: 1 }
      ]
    };

    const result = calculerMetre(saisie, REGLES_DEFAUT);
    const blocs = result.blocs;
    const recettes = calculerRecettes(blocs);

    // 1. Longrine
    const l = blocs.longrines.lignes[0];
    assert.equal(l.volumeBrut.toFixed(4), '3.6510');
    assert.equal(l.valeur.toFixed(4), '3.5700'); // net = 3.651 - (12 * 0.15 * 0.15 * 0.30) = 3.651 - 0.081 = 3.570

    // Beton Longrines (on va tester les valeurs nettes, pas celles de la recette globale pour isoler)
    const blocsLongrinesSeulement = {
      longrines: blocs.longrines
    };
    const recettesLongrines = calculerRecettes(blocsLongrinesSeulement);
    
    // Coffrage Longrines
    assert.equal(blocs.longrines.totalCoffrage.toFixed(2), '36.51');
    
    // Armatures Longrines
    const armaturesL = extractionsArmatures.longrines(saisie.longrines[0], REGLES_DEFAUT);
    // Principale
    const main = armaturesL[0];
    assert.equal(main.longueurDeveloppee, 60.85);
    assert.equal(main.recouvrement, 0.48); // Ls = 0.48 m (12 mm * 40)
    assert.equal(main.nombreDeFiles, 4);
    assert.equal(main.nombreBarres12m, 8); 
    assert.equal(main.poids, 84.48);

    // Cadres
    const cadres = armaturesL[1];
    assert.equal(cadres.nombreDeFiles, 306); // 306 cadres
    assert.equal(cadres.longueurDeveloppee, 0.84); // ((0.20-0.04) + (0.30-0.04)) * 2 = (0.16 + 0.26) * 2 = 0.84
    assert.equal(cadres.recouvrement, 0.30); // Ls = 0.30 m
    assert.equal(cadres.nombreBarres12m, 24);
    assert.equal(cadres.poids, 63.936); // 24 * 12 * 0.222 = 63.936

    // Mur de soubassement
    const mur = blocs.murSoubassement.lignes[0];
    assert.equal(mur.valeur.toFixed(2), '36.51');

    // Chape
    const blocsChape = { chapeEgalisation: blocs.chapeEgalisation };
    const rChape = calculerRecettes(blocsChape);
    assert.equal(blocs.chapeEgalisation.lignes[0].valeur.toFixed(3), '1.217');
    assert.equal(rChape.gravier.quantiteNette.toFixed(5), '1.55776');
    assert.equal(rChape.sable.quantiteNette.toFixed(4), '0.7302');
    assert.equal(rChape.eau.quantite.toFixed(3), '152.125');
    
    // Sous-pavement
    const blocsSous = { sousPavement: blocs.sousPavement };
    const rSous = calculerRecettes(blocsSous);
    assert.equal(blocs.sousPavement.lignes[0].valeur.toFixed(5), '6.89975');
    assert.equal(rSous.gravier.quantiteNette.toFixed(5), '8.83168');
    assert.equal(rSous.sable.quantiteNette.toFixed(5), '4.13985');
    assert.equal(rSous.eau.quantite.toFixed(5), '862.46875');
  });

  it('Exclusion mutuelle Moellon', () => {
    const saisie = {
      moellon: [{ perimetre: 60.85, largeurBase: 0.30, hauteur: 0.60, nombre: 1 }],
      longrines: [{ perimetre: 60.85, largeur: 0.20, hauteur: 0.30, nombre: 1 }]
    };
    const result = calculerMetre(saisie, REGLES_DEFAUT);
    assert.equal(result.blocs.moellon.total, 0); // Neutralisé
    assert.equal(result.avertissements.some(a => a.type === 'exclusion-mutuelle'), true);
  });
  
  it('Moellon seul', () => {
    const saisie = {
      moellon: [{ perimetre: 60.85, largeurBase: 0.30, hauteur: 0.60, nombre: 1 }]
    };
    const result = calculerMetre(saisie, REGLES_DEFAUT);
    assert.equal(result.blocs.moellon.lignes[0].valeur.toFixed(3), '10.953');
    const recettes = calculerRecettes(result.blocs);
    assert.equal(recettes.moellon.quantiteNette.toFixed(5), '12.26736');
    assert.equal(recettes.sable.quantiteNette.toFixed(5), '4.92885');
  });
});
