import { test, describe } from 'node:test';
import assert from 'node:assert';
import { calculerMetre, _internes } from '../src/metre.js';
import { REGLES_DEFAUT } from '../src/regles.js';

const { extractionsArmatures } = _internes;

/**
 * Controles issus de la relecture du bloc escalier face aux formules d'origine.
 * Chacun verrouille un ecart constate entre le code livre et la specification.
 */
describe('Escalier — controles de conformite', () => {
  const volee = {
    id: 'V1',
    hauteurAMonter: 1.53,
    nombreContremarches: 9,
    giron: 0.28,
    largeur: 1.20,
    epaisseurPaillasse: 0.15,
    typeEpaisseur: 'perpendiculaire',
    convention: 'arrivee_palier',
  };
  const palier = { id: 'P1', longueur: 1.20, largeur: 1.20, epaisseur: 0.15, ferraillage: { diametre: 10, espacement: 0.15 } };
  const escalier = { mode: 'geometrie', repere: 'ESC1', nombre: 1, volees: [volee], paliers: [palier] };

  const poidsTotal = (ligne) =>
    extractionsArmatures.escalier(ligne, REGLES_DEFAUT).reduce((s, a) => s + (a.poids || 0), 0);

  test('la recette de la specification tombe au chiffre pres', () => {
    const { blocs } = calculerMetre({ escalier: [escalier] }, REGLES_DEFAUT);
    assert.strictEqual(Math.round(blocs.escalier.total * 10000) / 10000, 0.9328);

    // Les six lits, dans l'ordre et au diametre pres. Les principales et la
    // repartition viennent des formules de reference (Ø12/15 et Ø8/20) ;
    // les chapeaux sont poses en Ø10/15, jamais herites des principales.
    const lits = extractionsArmatures.escalier(escalier, REGLES_DEFAUT).map((a) => ({
      diametre: a.diametre,
      files: a.nombreDeFiles,
      barres: a.nombreBarres12m,
      poids: a.poids,
    }));

    assert.deepStrictEqual(lits, [
      { diametre: 12, files: 9, barres: 3, poids: 31.68 },
      { diametre: 8, files: 15, barres: 2, poids: 9.48 },
      { diametre: 10, files: 18, barres: 2, poids: 14.808 },
      { diametre: 8, files: 11, barres: 2, poids: 9.48 },
      { diametre: 10, files: 9, barres: 1, poids: 7.404 },
      { diametre: 10, files: 9, barres: 1, poids: 7.404 },
    ]);

    const poids = lits.reduce((s, a) => s + a.poids, 0);
    assert.strictEqual(Math.round(poids * 1000) / 1000, 80.256);
    assert.strictEqual(Math.round((poids / blocs.escalier.total) * 10) / 10, 86);
  });

  test('un ferraillage saisi partiellement garde les defauts qu il ne precise pas', () => {
    const partiel = { ...escalier, volees: [{ ...volee, ferraillage: { principales: { diametre: 14 } } }] };
    const prin = extractionsArmatures.escalier(partiel, REGLES_DEFAUT)[0];

    assert.strictEqual(prin.diametre, 14, 'le diametre saisi est repris');
    assert.strictEqual(prin.espacement, 0.15, "l'espacement par defaut doit survivre");
    assert.strictEqual(prin.nombreDeFiles, 9, 'ceil(1,20 / 0,15) + 1');
  });

  test('le coffrage compte Ng contremarches, comme le volume compte Ng marches', () => {
    const { blocs } = calculerMetre({ escalier: [escalier] }, REGLES_DEFAUT);
    // fond 1,20 x 2,712656 + joues 2 x 2,712656 x 0,15 + 8 contremarches x 1,20 x 0,17
    // + palier 1,44 + 2 x (1,20 + 1,20) x 0,15
    const attendu = 1.20 * 2.712656 + 2 * 2.712656 * 0.15 + 8 * 1.20 * 0.17 + 1.44 + 2 * 2.40 * 0.15;
    assert.ok(
      Math.abs(blocs.escalier.totalCoffrage - attendu) < 1e-3,
      `coffrage ${blocs.escalier.totalCoffrage} attendu ~${attendu} : compter N contremarches au lieu de Ng ajoute une planche par volee`,
    );
  });

  test('le ferraillage suit le nombre d escaliers identiques', () => {
    const un = poidsTotal(escalier);
    const deux = poidsTotal({ ...escalier, nombre: 2 });

    assert.ok(deux > un, "l'acier de deux escaliers doit depasser celui d'un seul");
    // Sous-lineaire, et c'est voulu : les barres de 12 m se recoupent mieux
    // quand on en debite davantage. Ce qui serait faux, c'est l'egalite.
    assert.ok(deux < 2 * un, 'le debit sur barres entieres rend le poids sous-lineaire');
    assert.notStrictEqual(deux, un, 'deux escaliers ne peuvent pas peser le meme acier qu un seul');
  });

  test('une volee incomplete est signalee, jamais ecartee en silence', () => {
    const sansGiron = { ...escalier, volees: [{ ...volee, giron: undefined }] };
    const { avertissements } = calculerMetre({ escalier: [sansGiron] }, REGLES_DEFAUT);

    const a = avertissements.find((x) => x.type === 'dimension-manquante' && x.bloc === 'escalier');
    assert.ok(a, 'la volee incomplete doit produire un avertissement');
    assert.match(a.message, /giron/);
  });

  test('un escalier conforme ne declenche aucune alerte', () => {
    const { avertissements } = calculerMetre({ escalier: [escalier] }, REGLES_DEFAUT);
    const alertes = avertissements.filter((a) => a.bloc === 'escalier');
    assert.deepStrictEqual(alertes, [], `2h + g = 0,62 m et 93 kg/m3 : rien a signaler`);
  });

  test('la regle de Blondel se declenche sur un plan cote en pouces', () => {
    const enPouces = { ...escalier, volees: [{ ...volee, hauteurAMonter: 1.368, giron: 0.254 }] };
    const { avertissements } = calculerMetre({ escalier: [enPouces] }, REGLES_DEFAUT);

    const blondel = avertissements.find((a) => a.type === 'escalier-inconfortable');
    assert.ok(blondel, 'marche de 6 pouces et giron de 10 pouces donnent 2h + g = 0,558 m');
    assert.match(blondel.message, /0\.558/);
  });

  test('le ratio d acier recoupe le ferraillage et alerte hors de 70-130 kg/m3', () => {
    // Sans chapeaux, la nappe inferieure seule tombe sous le seuil : c'est
    // exactement ce que le controle doit reveler.
    const sansChapeaux = {
      ...escalier,
      volees: [{ ...volee, ferraillage: { chapeaux: { actif: false }, repartitionSup: { actif: false } } }],
    };
    const { avertissements } = calculerMetre({ escalier: [sansChapeaux] }, REGLES_DEFAUT);

    const ratio = avertissements.find((a) => a.type === 'escalier-ratio-acier');
    assert.ok(ratio, 'un ferraillage sans chapeaux doit sortir sous 70 kg/m3 et etre signale');
    assert.match(ratio.message, /kg\/m³/);
  });

  test('l epaisseur cotee verticalement se ramene a la perpendiculaire', () => {
    const vertical = { ...escalier, volees: [{ ...volee, typeEpaisseur: 'verticale' }] };
    const { blocs: bv } = calculerMetre({ escalier: [vertical] }, REGLES_DEFAUT);
    const { blocs: bp } = calculerMetre({ escalier: [escalier] }, REGLES_DEFAUT);

    assert.ok(bv.escalier.total < bp.escalier.total, 'e perpendiculaire = e verticale x Lp / L, donc plus petite');
    // e_perp = 0,15 x 2,24 / 2,712656 = 0,123865 ; V_paillasse = 1,20 x 0,123865 x 2,712656
    const vPaillasse = 1.20 * (0.15 * 2.24 / 2.712656) * 2.712656;
    assert.ok(Math.abs(vPaillasse - 0.4032) < 1e-3);
  });

  test('la convention de girons change le volume des marches', () => {
    const terminale = { ...escalier, paliers: [], volees: [{ ...volee, convention: 'marche_terminale' }] };
    const parDefaut = { ...escalier, paliers: [] };

    const { blocs: bt } = calculerMetre({ escalier: [terminale] }, REGLES_DEFAUT);
    const { blocs: bd } = calculerMetre({ escalier: [parDefaut] }, REGLES_DEFAUT);

    assert.ok(bt.escalier.total > bd.escalier.total, '9 girons donnent plus de beton que 8');
  });

  test('le mode volume historique reste intact', () => {
    const { blocs } = calculerMetre({ escalier: [{ volume: 3.5, nombre: 1 }] }, REGLES_DEFAUT);
    assert.strictEqual(blocs.escalier.total, 3.5);
    const aciers = extractionsArmatures.escalier({ volume: 3.5, nombre: 1 }, REGLES_DEFAUT);
    assert.strictEqual(aciers[0].poids, 350);
  });
});
