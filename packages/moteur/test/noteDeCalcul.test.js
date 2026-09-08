import test from 'node:test';
import assert from 'node:assert/strict';
import { genererNoteDeCalcul } from '../src/noteDeCalcul.js';
import { calculerMetre } from '../src/metre.js';
import { calculerRecettes } from '../src/recettes.js';

test('Note de Calcul — Source de vérité unique', async (t) => {
  await t.test('génère la note de calcul pour un métré de semelles isolées', () => {
    const saisie = {
      semelles: [
        { repere: 'S1', nombre: 10, longueur: 1.5, largeur: 1.5, hauteur: 0.3 }
      ]
    };

    const note = genererNoteDeCalcul(saisie);

    assert.ok(note.lots.length > 0, 'La note contient au moins un lot');
    assert.ok(note.indexOuvrages['semelles'], 'L\'ouvrage semelles est indexé');

    const semelles = note.indexOuvrages['semelles'];
    assert.equal(semelles.total_brut, 6.75);
    assert.equal(semelles.total_arrondi, 6.75);
    assert.equal(semelles.unite, 'm3');
    assert.equal(semelles.lignes.length, 1);
    assert.equal(semelles.lignes[0].repere, 'S1');

    // Vérification de la décomposition automatique des matériaux
    const ciment = semelles.decomposition_materiaux.find((m) => m.nom.includes('Ciment'));
    assert.ok(ciment, 'La décomposition en ciment est présente');
    assert.equal(ciment.valeur_arrondie, 48, '47.25 sacs arrondis à 48 sacs');
    assert.ok(ciment.motif_arrondi.includes('Arrondi'), 'Un motif d\'arrondi explicite est fourni');
  });

  await t.test('génère les explications et formules pour la maçonnerie', () => {
    const saisie = {
      maconnerie: [
        { repere: 'M1', nombre: 1, longueur: 10, hauteur: 3 }
      ]
    };

    const note = genererNoteDeCalcul(saisie);
    const maconnerie = note.indexOuvrages['maconnerie'];
    assert.ok(maconnerie);
    assert.equal(maconnerie.total_brut, 30); // 10 x 3 = 30 m²

    const agglos = maconnerie.decomposition_materiaux.find((m) => m.nom.includes('Agglos'));
    assert.ok(agglos);
    assert.equal(agglos.valeur_arrondie, 337); // The accurate engine calculation (not the old 12.5 hardcoded rule)
  });

  await t.test('décomposition matériaux correspond exactement aux recettes (source unique)', () => {
    // Saisie complète pour couvrir un grand nombre de cas (béton, maçonnerie, enduits, etc)
    const saisie = {
      betonProprete: [{ longueur: 10, largeur: 1, epaisseur: 0.05, nombre: 1 }],
      semelles: [{ longueur: 1.2, largeur: 1.2, hauteur: 0.3, nombre: 4 }],
      moellon: [{ longueur: 10, largeur: 0.5, hauteur: 0.8, nombre: 1 }],
      maconnerie: [{ longueur: 30, hauteur: 3, nombre: 1 }],
      enduits: [{ longueur: 30, hauteur: 3, nombre: 1 }],
      carrelage: [{ longueur: 10, largeur: 8, nombre: 1 }],
      charpenteBois: [{ longueur: 10, portee: 8, nombre: 1 }]
    };

    const { blocs } = calculerMetre(saisie);
    const note = genererNoteDeCalcul(saisie);

    // Pour chaque bloc, calculer les recettes isolément et les comparer à la décomposition
    for (const blocId of Object.keys(saisie)) {
      if (!blocs[blocId] || !note.indexOuvrages[blocId]) continue;

      const recettesIsolees = calculerRecettes({ [blocId]: blocs[blocId] });
      const decomposition = note.indexOuvrages[blocId].decomposition_materiaux;

      // On aggrège la décomposition par `id_materiau` (en enlevant le préfixe blocId_)
      const agregationDecomp = {};
      for (const mat of decomposition) {
        // Le prefixe est `${blocId}_${id_materiau}`
        const originalId = mat.id_materiau.replace(`${blocId}_`, '');
        agregationDecomp[originalId] = (agregationDecomp[originalId] || 0) + mat.quantiteNette;
      }

      // On vérifie que chaque matériau calculé dans les recettes est bien dans la décomposition avec la même quantité
      for (const [idMat, recette] of Object.entries(recettesIsolees)) {
        // Certains matériaux comme 'bois_charpente' peuvent être nommés différemment dans recettes (clé de facturation)
        // Mais la refactorisation garantit que l'ID produit par obtenirDecompositionOuvrage correspond.
        const decompQuantite = agregationDecomp[idMat] || 0;
        
        // Tolérance pour les arrondis flottants
        assert.ok(
          Math.abs(recette.quantiteNette - decompQuantite) < 0.001,
          `Divergence sur ${blocId} / ${idMat}: recettes=${recette.quantiteNette}, decomp=${decompQuantite}`
        );
      }
    }
  });

  await t.test('le remblai n\'est jamais saisi : il apparaît calculé, à côté du déblai', () => {
    // Même chantier que le test de référence du terrassement (36,78 m³ de
    // déblais foisonnés, 46,87 m³ de remblai tassé) — on vérifie ici que ces
    // deux chiffres, et eux seuls, arrivent bien dans la Note de Calcul.
    const saisie = {
      fouilles: [{ longueur: 0.65, largeur: 0.65, profondeur: 0.90, nombre: 12 }],
      betonProprete: [{ longueur: 0.55, largeur: 0.55, epaisseur: 0.05, nombre: 12 }],
      fouilleFilante: [{ longueur: 60.85, largeur: 0.60, profondeur: 0.65, nombre: 1 }],
      semelles: [{ nombre: 12, longueur: 0.35, largeur: 0.35, hauteur: 0.30, amorceSectionA: 15, amorceSectionB: 15, amorceHauteur: 0.55 }],
      longrines: [{ perimetre: 60.85, largeur: 0.20, hauteur: 0.40, nombre: 1 }],
      soubassement: [{ longueur: 60.85, hauteur: 0.60, epaisseur: 0.20, nombre: 1 }],
      nivellement: [{ longueur: 9.65, largeur: 7.15, epaisseur: 0.30, nombre: 1 }],
    };

    const note = genererNoteDeCalcul(saisie);
    const lotTerrassement = note.lots.find((l) => l.id_lot === 'terrassement');
    assert.ok(lotTerrassement, 'Le lot Terrassement existe');

    const noms = lotTerrassement.ouvrages.map((o) => o.nom);
    assert.ok(noms.includes('Déblais (total)'), 'Le déblai total apparaît');
    assert.ok(noms.includes('Remblai (calcul automatique)'), 'Le remblai apparaît, marqué automatique');
    assert.ok(!noms.some((n) => n === 'Remblai'), 'Aucune saisie manuelle de remblai ne subsiste');

    const deblais = note.indexOuvrages['deblais_auto'];
    const remblai = note.indexOuvrages['remblai_auto'];
    assert.equal(deblais.total_arrondi.toFixed(5), '36.78285');
    assert.equal(remblai.total_arrondi.toFixed(6), '46.868575');

    // Le remblai est bien dans le même lot que le déblai, juste après lui —
    // « à côté » n'a de sens que si l'ordre le respecte.
    const iDeblais = lotTerrassement.ouvrages.findIndex((o) => o.id_ouvrage === 'deblais_auto');
    const iRemblai = lotTerrassement.ouvrages.findIndex((o) => o.id_ouvrage === 'remblai_auto');
    assert.equal(iRemblai, iDeblais + 1);

    // Chaque ligne porte une formule et une application numérique lisibles —
    // pas seulement un total, comme pour tout le reste de la note de calcul.
    assert.ok(remblai.lignes[0].formule.length > 0);
    assert.ok(remblai.lignes[0].application.includes('m³'));
  });

  await t.test('sans aucune fouille, ni déblai ni remblai ne s\'invitent dans la note', () => {
    const note = genererNoteDeCalcul({ semelles: [{ nombre: 1, longueur: 1, largeur: 1, hauteur: 0.3 }] });
    const lotTerrassement = note.lots.find((l) => l.id_lot === 'terrassement');
    assert.ok(!lotTerrassement, 'Aucun ouvrage de terrassement à afficher quand rien n\'a été creusé');
  });
});
