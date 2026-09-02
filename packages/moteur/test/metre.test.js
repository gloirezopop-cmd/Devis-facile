import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { calculerMetre } from '../src/metre.js';
import { REGLES_DEFAUT } from '../src/regles.js';

const R = REGLES_DEFAUT;

/** Egalite a 1e-6 pres, la precision du moteur. */
function proche(reel, attendu, message) {
  assert.ok(
    Math.abs(reel - attendu) < 1e-6,
    message ?? `attendu ${attendu}, obtenu ${reel}`,
  );
}

// ---------------------------------------------------------------------------
// Les totaux du classeur, la ou le classeur a raison.
// Toute divergence ici est une regression.
// ---------------------------------------------------------------------------

describe('Totaux reproduits du classeur DEVIS FACILE BTP AUTO', () => {
  test('fouilles : 175,8315 m3', () => {
    const fouilles = [
      { nombre: 2, longueur: 27.45, largeur: 0.4, profondeur: 0.6 },
      { nombre: 2, longueur: 11, largeur: 0.4, profondeur: 0.6 },
      { nombre: 5, longueur: 1.7, largeur: 1.7, profondeur: 1.5 },
      { nombre: 1, longueur: 1.2, largeur: 1.4, profondeur: 1.5 },
      { nombre: 1, longueur: 1.1, largeur: 1.4, profondeur: 1.5 },
      { nombre: 1, longueur: 2.6, largeur: 2.6, profondeur: 1.5 },
      { nombre: 1, longueur: 5.31, largeur: 3.7, profondeur: 1.5 },
      { nombre: 1, longueur: 1.2, largeur: 2.3, profondeur: 1.5 },
      { nombre: 1, longueur: 1.4, largeur: 3.2, profondeur: 1.5 },
      { nombre: 4, longueur: 1.8, largeur: 1.2, profondeur: 1.5 },
      { nombre: 2, longueur: 2.8, largeur: 2.7, profondeur: 1.5 },
      { nombre: 1, longueur: 1.9, largeur: 1.9, profondeur: 1.5 },
      { nombre: 1, longueur: 1.1, largeur: 1.1, profondeur: 1.5 },
      { nombre: 1, longueur: 1, largeur: 0.6, profondeur: 1.5 },
      { nombre: 2, longueur: 1.5, largeur: 1.5, profondeur: 1.5 },
      { nombre: 4, longueur: 1.6, largeur: 1.6, profondeur: 1.5 },
      { nombre: 2, longueur: 2.2, largeur: 2.2, profondeur: 1.5 },
    ];
    const { blocs } = calculerMetre({ fouilles }, R);
    proche(blocs.fouilles.total, 175.8315);
  });

  test('semelles isolees : 54,4232 m3', () => {
    const semelles = [
      { nombre: 5, longueur: 1.7, largeur: 1.7, hauteur: 0.5 },
      { nombre: 1, longueur: 1.2, largeur: 1.4, hauteur: 0.5 },
      { nombre: 1, longueur: 1.1, largeur: 1.4, hauteur: 0.5 },
      { nombre: 1, longueur: 2.6, largeur: 2.6, hauteur: 0.5 },
      { nombre: 1, longueur: 5.31, largeur: 3.7, hauteur: 0.6 },
      { nombre: 1, longueur: 1.2, largeur: 2.3, hauteur: 0.5 },
      { nombre: 1, longueur: 1.4, largeur: 3.2, hauteur: 0.5 },
      { nombre: 4, longueur: 1.8, largeur: 1.2, hauteur: 0.5 },
      { nombre: 2, longueur: 2.8, largeur: 2.7, hauteur: 0.5 },
      { nombre: 1, longueur: 1.9, largeur: 1.9, hauteur: 0.5 },
      { nombre: 1, longueur: 1.1, largeur: 1.1, hauteur: 0.5 },
      { nombre: 1, longueur: 1, largeur: 0.6, hauteur: 0.5 },
      { nombre: 2, longueur: 1.5, largeur: 1.5, hauteur: 0.5 },
      { nombre: 4, longueur: 1.6, largeur: 1.6, hauteur: 0.5 },
      { nombre: 2, longueur: 2.2, largeur: 2.2, hauteur: 0.5 },
    ];
    const { blocs } = calculerMetre({ semelles }, R);
    proche(blocs.semelles.total, 54.4232);
  });

  test('longrines : 15,9672 m3', () => {
    const longrines = [
      { perimetre: 199.59, largeur: 0.2, hauteur: 0.4, nombre: 1 },
    ];
    const { blocs } = calculerMetre({ longrines }, R);
    proche(blocs.longrines.total, 15.9672);
  });

  test('poteaux : 7,83 m3, sections en centimetres', () => {
    const poteaux = [
      { repere: 'P1', nombre: 26, sectionA: 20, sectionB: 40, hauteur: 3 },
      { repere: 'P2', nombre: 2, sectionA: 30, sectionB: 25, hauteur: 3 },
      { repere: 'P3', nombre: 1, sectionA: 15, sectionB: 40, hauteur: 3 },
      { repere: 'P4', nombre: 3, sectionA: 20, sectionB: 30, hauteur: 3 },
      { repere: 'P5', nombre: 2, sectionA: 20, sectionB: 35, hauteur: 3 },
    ];
    const { blocs } = calculerMetre({ poteaux }, R);
    proche(blocs.poteaux.total, 7.83);
    proche(blocs.poteaux.lignes[0].valeur, 6.24);
  });

  test('maconnerie, mur unique sans ouverture : 672,864 m2', () => {
    const maconnerie = [
      { repere: 'MUR', longueur: 210.27, hauteur: 3.2, nombre: 1 },
    ];
    const { blocs } = calculerMetre({ maconnerie }, R);
    proche(blocs.maconnerie.total, 672.864);
  });
});

// ---------------------------------------------------------------------------
// Les defauts du classeur. Chaque test porte le nom du defaut qu'il corrige.
// ---------------------------------------------------------------------------

describe('Defauts corriges', () => {
  test('n1 — beton de proprete : la largeur entre dans le calcul', () => {
    // METRE!H28 ecrivait `D28*E28*G28` et affichait 2,745 m3.
    const { blocs } = calculerMetre(
      {
        betonProprete: [
          { nombre: 2, longueur: 27.45, largeur: 0.2, epaisseur: 0.05 },
        ],
      },
      R,
    );
    proche(blocs.betonProprete.total, 0.549);
    assert.notEqual(blocs.betonProprete.total, 2.745);
  });

  test('n3 — le perimetre des locaux est calcule, les plinthes ne sont plus a zero', () => {
    // METRE!I151:I159 n'avait ni formule ni total.
    const { blocs } = calculerMetre(
      { carrelage: [{ repere: 'Salon', longueur: 5, largeur: 4, nombre: 1 }] },
      R,
    );
    proche(blocs.carrelage.total, 20);
    proche(blocs.carrelage.perimetreTotal, 18);
    assert.notEqual(blocs.carrelage.perimetreTotal, 0);
  });

  test('n3 bis — un perimetre saisi a la main remplace le calcul et se signale', () => {
    const { blocs } = calculerMetre(
      {
        carrelage: [
          { repere: 'Couloir', longueur: 5, largeur: 4, perimetre: 16.4 },
        ],
      },
      R,
    );
    proche(blocs.carrelage.perimetreTotal, 16.4);
    assert.equal(blocs.carrelage.lignes[0].perimetreForce, true);
  });

  test('n5 — tous les murs sont lus, pas seulement les six premiers', () => {
    // MATERIAUX!B43:B48 ne lisait que METRE!125:130.
    const maconnerie = Array.from({ length: 10 }, (_, i) => ({
      repere: `MUR ${i + 1}`,
      longueur: 10,
      hauteur: 3,
      nombre: 1,
    }));
    const { blocs } = calculerMetre({ maconnerie }, R);
    assert.equal(blocs.maconnerie.lignes.length, 10);
    proche(blocs.maconnerie.total, 300);
  });
});

// ---------------------------------------------------------------------------
// Le cas de reference du guide : six deductions, poteaux noyes compris.
// ---------------------------------------------------------------------------

describe('Cas de reference du guide de metre', () => {
  test('surface nette de maconnerie : 143,325 m2', () => {
    const maconnerie = [
      {
        repere: 'Ensemble des murs',
        longueur: 177.855,
        hauteur: 1,
        nombre: 1,
        ouvertures: [
          { type: 'fenetre', nombre: 7, largeur: 1.5, hauteur: 1.0 },
          { type: 'imposte', nombre: 3, largeur: 0.75, hauteur: 0.5 },
          { type: 'porte', nombre: 5, largeur: 0.9, hauteur: 2.1 },
          { type: 'porte', nombre: 3, largeur: 0.85, hauteur: 2.1 },
          { type: 'porte', nombre: 1, largeur: 1.8, hauteur: 2.1 },
          { type: 'poteau noye', nombre: 12, largeur: 2.4, hauteur: 0.15 },
        ],
      },
    ];
    const { blocs } = calculerMetre({ maconnerie }, R);

    proche(blocs.maconnerie.surfaceBrute, 177.855);
    proche(blocs.maconnerie.deductions, 34.53);
    proche(blocs.maconnerie.total, 143.325);
  });

  test('les poteaux noyes sont bien deduits, ce que le classeur ignorait', () => {
    const sansPoteaux = calculerMetre(
      {
        maconnerie: [
          {
            longueur: 100,
            hauteur: 1,
            ouvertures: [{ type: 'fenetre', nombre: 1, largeur: 1.5, hauteur: 1 }],
          },
        ],
      },
      R,
    );
    const avecPoteaux = calculerMetre(
      {
        maconnerie: [
          {
            longueur: 100,
            hauteur: 1,
            ouvertures: [
              { type: 'fenetre', nombre: 1, largeur: 1.5, hauteur: 1 },
              { type: 'poteau noye', nombre: 12, largeur: 2.4, hauteur: 0.15 },
            ],
          },
        ],
      },
      R,
    );
    proche(sansPoteaux.blocs.maconnerie.total, 98.5);
    proche(avecPoteaux.blocs.maconnerie.total, 94.18);
  });
});

// ---------------------------------------------------------------------------
// Le contrat qui separe un logiciel d'un tableur.
// ---------------------------------------------------------------------------

describe('Contrat du moteur', () => {
  test('une dimension manquante rend null, jamais zero', () => {
    const { blocs } = calculerMetre(
      { semelles: [{ nombre: 3, longueur: 1.7, largeur: 1.7 }] },
      R,
    );
    assert.equal(blocs.semelles.lignes[0].valeur, null);
    assert.equal(blocs.semelles.total, null);
  });

  test('une ligne incomplete est signalee avec son repere', () => {
    const { avertissements } = calculerMetre(
      { semelles: [{ repere: 'S3', nombre: 3, longueur: 1.7, largeur: 1.7 }] },
      R,
    );
    const a = avertissements.find((x) => x.type === 'dimension-manquante');
    assert.ok(a, 'un avertissement doit etre emis');
    assert.equal(a.repere, 'S3');
    assert.match(a.message, /hauteur/);
  });

  test('une ligne vide ne declenche aucun avertissement', () => {
    const { avertissements } = calculerMetre({ semelles: [{}, {}, {}] }, R);
    assert.equal(avertissements.length, 0);
  });

  test('une dimension saisie mais inutilisee est signalee, jamais ignoree', () => {
    // C'est exactement le piege du beton de proprete : le classeur acceptait
    // la largeur et ne la mettait dans aucune formule.
    const { avertissements } = calculerMetre(
      { enduits: [{ repere: 'Facade', longueur: 10, hauteur: 3, epaisseur: 0.015 }] },
      R,
    );
    const a = avertissements.find((x) => x.type === 'saisie-inutilisee');
    assert.ok(a, 'la saisie orpheline doit etre signalee');
    assert.match(a.message, /epaisseur/);
  });

  test('chaque ligne porte sa trace : formule, entrees, resultat, unite', () => {
    const { blocs } = calculerMetre(
      { poteaux: [{ nombre: 26, sectionA: 20, sectionB: 40, hauteur: 3 }] },
      R,
    );
    const { trace } = blocs.poteaux.lignes[0];
    assert.equal(trace.formule, 'N x (a/100) x (b/100) x H');
    assert.equal(trace.entrees.sectionA, 20);
    assert.equal(trace.unite, 'm3');
    proche(trace.resultat, 6.24);
  });

  test('le moteur est deterministe : deux appels rendent le meme resultat', () => {
    const saisie = { fouilles: [{ nombre: 2, longueur: 27.45, largeur: 0.4, profondeur: 0.6 }] };
    const a = JSON.stringify(calculerMetre(saisie, R));
    const b = JSON.stringify(calculerMetre(saisie, R));
    assert.equal(a, b);
  });

  test('le nombre absent vaut 1, comme dans le classeur', () => {
    const { blocs } = calculerMetre(
      { semelles: [{ longueur: 2, largeur: 2, hauteur: 0.5 }] },
      R,
    );
    proche(blocs.semelles.total, 2);
  });

  test('fouilleFilante : test du calcul L x l x h', () => {
    const { blocs } = calculerMetre(
      { fouilleFilante: [{ longueur: 10, largeur: 5, profondeur: 1 }] },
      R,
    );
    proche(blocs.fouilleFilante.total, 50);
  });
});
