import { test, describe } from 'node:test';
import assert from 'node:assert';
import { calculerMetre, _internes } from '../src/metre.js';
import { REGLES_DEFAUT } from '../src/regles.js';

const { extractionsArmatures } = _internes;

/**
 * Poteau circulaire : V = pi x r^2 x H x N. Meme bloc `colonnes` que le
 * rectangulaire, distingue par `forme`.
 */
describe('Colonnes circulaires', () => {
  const poteauRond = {
    forme: 'circulaire', diametre: 0.30, hauteur: 3, nombre: 4,
    diametrePrin: 12, diametreCadre: 8, nbreBarresPrin: 6, espacementCadre: 0.15,
  };

  test('V = pi x r^2 x H x N', () => {
    const { blocs } = calculerMetre({ colonnes: [poteauRond] }, REGLES_DEFAUT);
    const attendu = Math.PI * (0.30 / 2) ** 2 * 3 * 4;
    assert.ok(Math.abs(blocs.colonnes.total - attendu) < 1e-6, `${blocs.colonnes.total} !== ${attendu}`);
    // 4 poteaux de 30 cm de diametre, 3 m de haut : ~0,848 m3
    assert.strictEqual(Math.round(blocs.colonnes.total * 1000) / 1000, 0.848);
  });

  test('le coffrage est la surface laterale du cylindre : pi x d x H x N', () => {
    const { blocs } = calculerMetre({ colonnes: [poteauRond] }, REGLES_DEFAUT);
    const attendu = Math.PI * 0.30 * 3 * 4;
    assert.ok(Math.abs(blocs.colonnes.totalCoffrage - attendu) < 1e-6);
  });

  test("le cadre d'un poteau rond est une frette : circonference au nu des aciers", () => {
    const aciers = extractionsArmatures.colonnes(poteauRond, REGLES_DEFAUT);
    const frette = aciers.find((a) => a.designation === 'Frette (spirale)');
    assert.ok(frette, 'le lit de frette doit exister');
    const enrobage = 0.02;
    const attendu = Math.PI * (0.30 - 2 * enrobage);
    assert.ok(Math.abs(frette.longueurDeveloppee - attendu) < 1e-6);
  });

  test('un poteau rond incomplet (diametre saisi, hauteur pas encore) reclame « hauteur », pas « longueur, largeur »', () => {
    const { avertissements } = calculerMetre(
      { colonnes: [{ forme: 'circulaire', diametre: 0.30 }] },
      REGLES_DEFAUT,
    );
    const a = avertissements.find((x) => x.bloc === 'colonnes' && x.type === 'dimension-manquante');
    assert.ok(a, 'un avertissement doit exister');
    assert.match(a.message, /hauteur/);
    assert.doesNotMatch(a.message, /longueur/);
  });

  test('les colonnes rectangulaires existantes ne changent pas de comportement', () => {
    const { blocs } = calculerMetre(
      { colonnes: [{ forme: 'rectangulaire', longueur: 0.20, largeur: 0.20, hauteur: 3, nombre: 6 }] },
      REGLES_DEFAUT,
    );
    assert.strictEqual(Math.round(blocs.colonnes.total * 1000) / 1000, 0.72);
  });
});
