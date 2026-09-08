import { test, describe } from 'node:test';
import assert from 'node:assert';
import { calculerMetre } from '../src/metre.js';
import { genererDevisParticulier, genererDevisEntreprise } from '../src/valorisation.js';
import { REGLES_DEFAUT } from '../src/regles.js';

/**
 * L'application envoie aux devis un tableau `[{ niveauId, niveau, saisie, metre }]`
 * ou CHAQUE saisie porte TOUTES les cles du moteur, avec un tableau vide quand
 * les lignes n'appartiennent pas a ce niveau (voir preparerSaisiePourMoteur()).
 *
 * La fusion des saisies se faisait par Object.assign successifs : le dernier
 * niveau traite gagnait, donc les semelles saisies en Fondation etaient
 * ecrasees par le tableau vide de Finition. Les deux devis sortaient sans lot
 * fondation sur tout projet a plusieurs niveaux, c'est-a-dire sur tous les
 * projets reels — sans la moindre erreur affichee.
 */
describe('Devis sur un projet a plusieurs niveaux', () => {
  const regles = { ...REGLES_DEFAUT };
  const prix = {
    ciment: 5000, sable: 15000, gravier: 18000, eau: 500,
    acierHA_10: 6000, acierHA_12: 8000, planches: 3000, clous: 1200, filLigature: 1200,
  };

  /** Reproduit fidelement la forme produite par preparerSaisiePourMoteur(). */
  function saisieComplete(partielle) {
    const clesVides = [
      'fouilles', 'fouilleFilante', 'betonProprete', 'semelles', 'amorces', 'longrines',
      'colonnes', 'escalier', 'maconnerie', 'linteaux', 'murSoubassement', 'soubassement',
      'moellon', 'dallage', 'remblai', 'sousPavement', 'nivellement', 'carrelage',
      'enduits', 'peinture', 'faience', 'autresOuvrages', 'dalles',
      'plancherHourdis12', 'plancherHourdis16', 'charpenteBois', 'couvertureToles',
      'acrotere', 'formePente',
    ];
    const base = {};
    for (const cle of clesVides) base[cle] = [];
    return { ...base, ...partielle };
  }

  function projetDeuxNiveaux() {
    const saisieFondation = saisieComplete({
      semelles: [{
        id: 's1', repere: 'S1', longueur: 1.2, largeur: 1.2, hauteur: 0.3, nombre: 8,
        diametrePrinL: 10, espacementL: 0.15, diametrePrinLarg: 10, espacementLarg: 0.15, enrobage: 0.05,
      }],
      betonProprete: [{ id: 'bp1', repere: 'BP1', longueur: 1.4, largeur: 1.4, epaisseur: 0.05, nombre: 8 }],
    });
    // Niveau vide, traite APRES la fondation : c'est lui qui ecrasait tout.
    const saisieFinition = saisieComplete({});

    return [
      {
        niveauId: 'fondation',
        niveau: { id: 'fondation', nom: '2. Fondation', type: 'fondation' },
        saisie: saisieFondation,
        metre: calculerMetre(saisieFondation, regles),
      },
      {
        niveauId: 'finition',
        niveau: { id: 'finition', nom: '6. Finition', type: 'finition' },
        saisie: saisieFinition,
        metre: calculerMetre(saisieFinition, regles),
      },
    ];
  }

  test('le Devis Particulier garde le lot fondation malgre un niveau vide traite apres', () => {
    const devis = genererDevisParticulier(projetDeuxNiveaux(), regles, prix, {});

    assert.ok(devis.lots.fondation, 'le lot fondation doit exister');
    assert.ok(devis.lots.fondation.lignes.length > 0, 'le lot fondation doit contenir des lignes');
    assert.ok(devis.lots.fondation.sousTotal > 0, 'le sous-total fondation doit etre chiffre');
    assert.ok(devis.total > 0, 'le total du devis ne doit pas etre nul');

    const ciment = devis.lots.fondation.lignes.find((l) => l.id === 'ciment');
    assert.ok(ciment, 'le ciment des semelles doit apparaitre');
    assert.ok(ciment.quantite > 0, 'la quantite de ciment doit etre positive');
  });

  test('le Devis Entreprise garde le lot fondation dans les memes conditions', () => {
    const devis = genererDevisEntreprise(projetDeuxNiveaux(), regles, prix, {});

    assert.ok(devis.niveaux.fondation, 'le lot fondation doit exister');
    assert.ok(devis.niveaux.fondation.lignes.length > 0, 'le lot fondation doit contenir des lignes');

    const semelles = devis.niveaux.fondation.lignes.find((l) => l.id === 'semelles');
    assert.ok(semelles, 'la ligne semelles doit apparaitre');
    assert.ok(Math.abs(semelles.quantite - 3.456) < 0.001, `volume semelles attendu 3,456 m3, recu ${semelles.quantite}`);
  });

  test("l'ordre des niveaux ne change pas le resultat", () => {
    const ordreNormal = projetDeuxNiveaux();
    const ordreInverse = [...projetDeuxNiveaux()].reverse();

    const a = genererDevisParticulier(ordreNormal, regles, prix, {});
    const b = genererDevisParticulier(ordreInverse, regles, prix, {});

    assert.strictEqual(a.total, b.total, 'le total ne doit pas dependre de l ordre des niveaux');
  });
});
