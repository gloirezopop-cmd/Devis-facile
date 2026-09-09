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

  /**
   * L'ordre des lots vient desormais du Resume, qui suit le chantier :
   * installation, terres, fondation, elevation, plancher, toiture, finition.
   *
   * Ce test verifiait l'ordre de `LOTS_DEVIS_PARTICULIER`, ou la finition
   * precede la charpente — un heritage de la liste du classeur, contraire a
   * l'ordre reel des travaux : on couvre avant d'enduire. C'est le Resume qui
   * fait foi, et `devis.ordreLots` le transporte jusqu'aux sorties.
   */
  test('les lots suivent l ordre du chantier, celui du Resume', () => {
    const devis = genererDevisParticulier(construireEntree(), REGLES_DEFAUT, {}, {});

    assert.ok(Array.isArray(devis.ordreLots), 'le devis doit porter son ordre de lots');
    assert.deepStrictEqual(
      Object.keys(devis.lots),
      devis.ordreLots,
      "les lots doivent sortir dans l'ordre que le devis annonce",
    );

    const rang = (lot) => devis.ordreLots.indexOf(lot);
    const presents = devis.ordreLots.filter((id) => ['fondation', 'elevation', 'plancher', 'charpente', 'finition'].includes(id));

    for (let i = 1; i < presents.length; i++) {
      const attendu = ['fondation', 'elevation', 'plancher', 'charpente', 'finition'];
      assert.ok(
        attendu.indexOf(presents[i - 1]) < attendu.indexOf(presents[i]),
        `Le lot « ${presents[i]} » sort avant « ${presents[i - 1]} », hors de l'ordre du chantier.`,
      );
    }

    if (devis.lots.fondation && devis.lots.elevation) {
      assert.ok(rang('fondation') < rang('elevation'), 'fondation avant elevation');
    }
    // Tous les lots annonces existent bien.
    for (const id of devis.ordreLots) {
      assert.ok(devis.lots[id], `le lot annonce « ${id} » doit exister`);
      assert.ok(TITRES_LOTS_PARTICULIER[id] || devis.lots[id].titre, `le lot « ${id} » doit porter un titre`);
    }
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

  test('un ouvrage jamais saisi ne produit pas de ligne fantome dans le devis entreprise', () => {
    // calculerMetre() rend un objet pour CHAQUE bloc connu (colonnes, ceintures,
    // linteaux, escalier...), lignes: [] compris, meme quand rien n'est saisi
    // pour ce niveau. Un garde qui teste seulement la verite de `lignes` ne
    // filtre jamais rien : [] est veridique en JS. La regression concrete :
    // un devis Entreprise pour un simple RDC (semelles + colonnes) affichait
    // aussi des lignes "Ceintures et Chainages", "Linteaux et Appuis",
    // "Escalier" a prix unitaire non nul mais quantite nulle.
    const saisieRdc = {
      fouilles: [{ longueur: 10, largeur: 0.5, profondeur: 0.8, nombre: 1 }],
      semelles: [{ longueur: 1.2, largeur: 1.2, hauteur: 0.3, nombre: 4 }],
      colonnes: [{ longueur: 0.2, largeur: 0.2, hauteur: 3, nombre: 6 }],
      // Ni ceintures, ni linteaux, ni escalier : ces blocs ne doivent
      // apparaitre nulle part dans le devis.
    };
    const metre = calculerMetre(saisieRdc, REGLES_DEFAUT);
    const entreprise = genererDevisEntreprise(
      [{ niveau: { id: 'rdc', nom: 'RDC' }, saisie: saisieRdc, metre }],
      REGLES_DEFAUT,
      {},
      {},
    );

    const idsAbsents = ['ceintures', 'linteaux', 'escalier', 'poutres', 'dalles', 'acrotere'];
    for (const lot of Object.values(entreprise.niveaux)) {
      for (const ligne of lot.lignes) {
        assert.ok(
          !idsAbsents.includes(ligne.id),
          `« ${ligne.designation} » (id=${ligne.id}) ne devrait pas figurer : rien n'a ete saisi pour cet ouvrage.`,
        );
        assert.ok(
          ligne.quantite > 0,
          `« ${ligne.designation} » figure avec une quantite de ${ligne.quantite} : aucune ligne du devis ne doit porter une quantite nulle.`,
        );
      }
    }
  });

  test('le terrassement entreprise porte le forfait installation/repli, aligne sur le classeur de reference', () => {
    // Devis_Entreprise!A8 du classeur : "Amenee et repli de materiel", poste
    // fixe n 1 du terrassement, jamais emis avant que PARAMETRES.prixUnitaires
    // .ameneeEtRepliForfait — deja present — ne soit jamais lu nulle part.
    const entreprise = genererDevisEntreprise(construireEntree(), REGLES_DEFAUT, {}, {});
    const forfait = entreprise.niveaux.terrassement.lignes.find((l) => l.id === 'ameneeEtRepliForfait');
    assert.ok(forfait, 'le forfait installation/repli doit figurer dans le terrassement');
    assert.strictEqual(forfait.quantite, 1);
    assert.ok(forfait.pu > 0);
  });

  test('la fondation entreprise suit la chronologie du classeur : le mur de soubassement cloture la section', () => {
    // Devis_Entreprise!A15:A22 : beton de proprete, semelles, longrines,
    // moellon, chape, sous-pavement, PUIS mur de soubassement en dernier.
    const entreprise = genererDevisEntreprise(construireEntree(), REGLES_DEFAUT, {}, {});
    const idsPresents = entreprise.niveaux.fondation.lignes.map((l) => l.id);
    if (idsPresents.includes('murSoubassement') && idsPresents.length > 1) {
      assert.strictEqual(
        idsPresents.indexOf('murSoubassement'),
        idsPresents.length - 1,
        `le mur de soubassement doit etre le dernier poste de la fondation, trouve a l'index ${idsPresents.indexOf('murSoubassement')} sur ${idsPresents.length}`,
      );
    }
  });
});
