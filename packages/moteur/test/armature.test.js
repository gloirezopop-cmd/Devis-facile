import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  recouvrement, 
  nombreBarresCommerciales, 
  poidsArmature, 
  calculerBlocArmature 
} from '../src/armature.js';
import { calculerMetre, _internes } from '../src/metre.js';
import { calculerRecettes } from '../src/recettes.js';
import { REGLES_DEFAUT } from '../src/regles.js';
import { PARAMETRES } from '../src/parametres.js';

describe('Moteur d\'Armature Centralisé', () => {
  it('recouvrement()', () => {
    assert.equal(recouvrement(12, 'FeE400'), 0.48);
    assert.equal(recouvrement(8, 'FeE235'), 0.40);
    assert.equal(recouvrement(6, 'FeE235'), 0.30);
    assert.equal(recouvrement(10, 'FeE400'), 0.40);
  });

  it('Barre courte', () => {
    const Ld = 0.51;
    const Ls = 0.40;
    const files = 96;
    const diametre = 10;
    
    const barres = nombreBarresCommerciales(Ld, Ls, files);
    assert.equal(barres, 5); // ceil(96 / floor(11.5 / 0.51)) = ceil(96 / 22) = 5
    
    const poids = poidsArmature(barres, diametre);
    assert.equal(poids, 37.02); // 5 * 12 * 0.617
  });

  it('Barre longue', () => {
    const Ld = 60.85;
    const Ls = 0.48;
    const files = 4;
    const diametre = 12;
    
    const barres = nombreBarresCommerciales(Ld, Ls, files);
    assert.equal(barres, 8); // Depassement: 60.85 + 0.48 - 11.5 = 49.83. floor(11.5 / 49.83) = 0 -> max(1, 0) = 1. ceil(4 / 1) = 4. 4 + 4 = 8
    
    const poids = poidsArmature(barres, diametre);
    assert.equal(poids, 84.48); // 8 * 12 * 0.880
  });

  it('Cadre', () => {
    const Ld = 0.84;
    const Ls = 0.30;
    const files = 306;
    const diametre = 6;
    
    const barres = nombreBarresCommerciales(Ld, Ls, files);
    assert.equal(barres, 24); // floor(11.5 / 0.84) = 13. ceil(306 / 13) = 24
    
    const poids = poidsArmature(barres, diametre);
    assert.equal(poids, 63.936); // 24 * 12 * 0.222
  });

  it('Garde-fou (Ld négatif)', () => {
    const barres = nombreBarresCommerciales(-0.04, 0.40, 10);
    assert.equal(barres, null);
  });
});

describe('Intégration du Socle Armé (Semelle + Amorce)', () => {
  it('CAS DE TEST - semelle 0.35x0.35x0.30, amorce 0.15x0.15x0.55, N=12', () => {
    const saisie = {
      semelles: [{
        nombre: 12,
        longueur: 0.35, largeur: 0.35, hauteur: 0.30,
        amorceSectionA: 15, amorceSectionB: 15, amorceHauteur: 0.55,
        diametrePrin: 10, espacement: 0.15,
        amorceDiametrePrin: 10, amorceDiametreCadre: 8,
        amorceNbreBarresPrin: 4, amorceEspacementCadre: 0.15
      }]
    };

    const { blocs } = calculerMetre(saisie, REGLES_DEFAUT);
    
    // Vérification du Métré Béton et Coffrage
    const sem = blocs.semelles;
    assert.equal(sem.total, 0.5895); // 0.441 + 0.1485
    assert.equal(sem.totalCoffrage, 9.00); // 5.04 + 3.96
    
    // Vérification des armatures extraites directement (avant agrégation)
    const armatures = _internes.extractionsArmatures.semelles(saisie.semelles[0], REGLES_DEFAUT);
    
    const nappe = armatures.find(a => a.designation === 'Nappe (Quadrillage)');
    assert.equal(nappe.nombreDeFiles, 96);
    assert.equal(nappe.longueurDeveloppee, 0.51); // 0.35 - 2*0.02 + 2*0.10
    assert.equal(nappe.nombreBarres12m, 5);
    assert.equal(nappe.poids, 37.02);
    
    const amorcePrin = armatures.find(a => a.designation === 'Amorce Principale');
    assert.equal(amorcePrin.nombreDeFiles, 48);
    assert.equal(amorcePrin.longueurDeveloppee, 1.25); // 0.55 + 0.30 + 0.40
    assert.equal(amorcePrin.nombreBarres12m, 6);
    assert.equal(amorcePrin.poids, 44.424);
    
    const cadreAmorce = armatures.find(a => a.designation === 'Cadre Amorce');
    assert.equal(cadreAmorce.nombreDeFiles, 60); // ceil(0.55/0.15 + 1) * 12 = 5 * 12
    assert.equal(cadreAmorce.longueurDeveloppee, 0.44); // (0.11 + 0.11) * 2
    assert.equal(cadreAmorce.nombreBarres12m, 3);
    assert.equal(cadreAmorce.poids, 14.22);
    
    // Vérification des Recettes (Béton, Coffrage)
    const recettes = calculerRecettes(blocs);
    
    // Béton
    assert.equal(recettes.ciment.quantite, 5); // Math.ceil(5)
    assert.equal(recettes.eau.quantite, 103.1625);
    
    // Coffrage
    assert.equal(recettes.planches.quantite, 12);
    assert.equal(recettes.chevrons.quantite, 9);
    assert.equal(recettes.clous.quantite, 1.944);
  });
});
