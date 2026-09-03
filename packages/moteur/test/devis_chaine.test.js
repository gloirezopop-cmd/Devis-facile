import { test, describe } from 'node:test';
import assert from 'node:assert';
import { calculerMetre } from '../src/metre.js';
import {
  genererDevisParticulier,
  genererDevisEntreprise,
  TITRES_LOTS_PARTICULIER,
} from '../src/valorisation.js';
import { REGLES_DEFAUT } from '../src/regles.js';

/**
 * Le devis doit se remplir tout seul a partir du metre. Ces controles verrouillent
 * la chaine metre -> recettes -> devis, la ou elle s'etait rompue en silence :
 * arguments inverses a l'appel, et identifiants de materiaux divergents entre
 * les recettes et la bibliotheque de prix.
 */
describe('Chaine metre -> devis', () => {
  const saisie = {
    fouilles: [{ longueur: 10, largeur: 0.5, profondeur: 0.8, nombre: 1 }],
    betonProprete: [{ longueur: 10, largeur: 0.6, epaisseur: 0.05, nombre: 1 }],
    semelles: [{ longueur: 1.2, largeur: 1.2, hauteur: 0.3, nombre: 4 }],
    longrines: [{ perimetre: 40, largeur: 0.2, hauteur: 0.4, nombre: 1 }],
    soubassement: [{ longueur: 40, hauteur: 0.8, nombre: 1, ouvertures: [] }],
    colonnes: [{ longueur: 0.2, largeur: 0.2, hauteur: 3, nombre: 6 }],
    maconnerie: [{ longueur: 30, hauteur: 3, nombre: 1, ouvertures: [] }],
    dalles: [{ longueur: 10, largeur: 8, epaisseurCm: 15, nombre: 1 }],
    charpenteBois: [{ longueur: 10, portee: 8, debord: 0.5, faitage: 2, ecartement: 2.5, section: 0.08, lignesPannes: 5, nombre: 1 }],
    couvertureToles: [{ longueur: 10, portee: 8, debord: 0.5, nombre: 1 }],
    carrelage: [{ longueur: 10, largeur: 8, nombre: 1 }],
    peinture: [{ longueur: 30, hauteur: 3, nombre: 1 }],
  };

  const construireEntree = () => {
    const metre = calculerMetre(saisie, REGLES_DEFAUT);
    return [{ niveau: { id: 'rdc', nom: 'RDC' }, saisie, metre }];
  };

  test('chaque ouvrage metre ressort chiffre : aucune ligne a zero franc', () => {
    const devis = genererDevisParticulier(construireEntree(), REGLES_DEFAUT, {}, {});

    const sansPrix = [];
    for (const [lotId, lot] of Object.entries(devis.lots)) {
      for (const ligne of lot.lignes) {
        if (!ligne.pu) sansPrix.push(`${lotId}/${ligne.id}`);
      }
    }

    assert.deepStrictEqual(
      sansPrix,
      [],
      `Ces materiaux sont metres mais n'ont pas de prix par defaut : ${sansPrix.join(', ')}. ` +
        "L'identifiant emis par recettes.js doit exister dans PARAMETRES.prixUnitaires.",
    );
  });

  test('les lots suivent l ordre chronologique du classeur', () => {
    const devis = genererDevisParticulier(construireEntree(), REGLES_DEFAUT, {}, {});

    const ordreAttendu = Object.keys(TITRES_LOTS_PARTICULIER);
    const ordreObtenu = Object.keys(devis.lots);
    const rang = (lot) => ordreAttendu.indexOf(lot);

    for (let i = 1; i < ordreObtenu.length; i++) {
      assert.ok(
        rang(ordreObtenu[i - 1]) < rang(ordreObtenu[i]),
        `Le lot « ${ordreObtenu[i]} » sort avant « ${ordreObtenu[i - 1] }», hors de l'ordre du classeur.`,
      );
    }

    // Fondation avant elevation avant plancher avant couverture avant finition.
    assert.ok(rang('fondation') < rang('elevation'), 'fondation avant elevation');
    assert.ok(rang('elevation') < rang('plancher'), 'elevation avant plancher');
    assert.ok(rang('plancher') < rang('finition'), 'plancher avant finition');
  });

  test('le prix saisi par l utilisateur atteint bien la ligne du devis', () => {
    const entree = construireEntree();
    const cimentBonMarche = genererDevisParticulier(entree, REGLES_DEFAUT, { ciment: 1000 }, {});
    const cimentCher = genererDevisParticulier(entree, REGLES_DEFAUT, { ciment: 9000 }, {});

    const ligne = (devis) => devis.lots.fondation.lignes.find((l) => l.id === 'ciment');

    assert.strictEqual(ligne(cimentBonMarche).pu, 1000, 'le prix saisi doit primer sur le defaut');
    assert.strictEqual(ligne(cimentCher).pu, 9000);
    assert.ok(
      cimentCher.total > cimentBonMarche.total,
      "un prix du ciment plus eleve doit faire monter le total : sinon la bibliotheque n'est pas branchee",
    );
  });

  test('le libelle saisi par l utilisateur remplace l identifiant technique', () => {
    const devis = genererDevisParticulier(construireEntree(), REGLES_DEFAUT, {}, { ciment: 'Ciment CPJ 42.5' });
    const ligne = devis.lots.fondation.lignes.find((l) => l.id === 'ciment');
    assert.strictEqual(ligne.designation, 'Ciment CPJ 42.5');
  });

  test('le devis entreprise chiffre le terrassement, que le particulier ne porte pas', () => {
    const entree = construireEntree();
    const entreprise = genererDevisEntreprise(entree, REGLES_DEFAUT, {}, {});
    const particulier = genererDevisParticulier(entree, REGLES_DEFAUT, {}, {});

    assert.ok(entreprise.niveaux.terrassement, 'le devis entreprise porte un lot terrassement');
    assert.ok(entreprise.niveaux.terrassement.lignes.length > 0, 'et ce lot est chiffre');
    assert.ok(
      !particulier.lots.terrassement,
      'le devis particulier est un bordereau de fournitures : le terrassement, sans materiau, n y figure pas',
    );
    assert.ok(entreprise.total > 0, 'le devis entreprise a un total');
  });

  test('un metre vide ne produit pas de devis fantome', () => {
    const metreVide = calculerMetre({}, REGLES_DEFAUT);
    const devis = genererDevisParticulier(
      [{ niveau: { id: 'rdc', nom: 'RDC' }, saisie: {}, metre: metreVide }],
      REGLES_DEFAUT,
      {},
      {},
    );
    assert.deepStrictEqual(Object.keys(devis.lots), []);
    assert.strictEqual(devis.total, 0);
  });
});
