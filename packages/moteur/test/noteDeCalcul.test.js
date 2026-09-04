import test from 'node:test';
import assert from 'node:assert/strict';
import { genererNoteDeCalcul } from '../src/noteDeCalcul.js';

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
    assert.equal(agglos.valeur_arrondie, 375); // 30 * 12.5 = 375
  });
});
