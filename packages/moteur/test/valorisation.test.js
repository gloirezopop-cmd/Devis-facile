import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { calculerMetre } from '../src/metre.js';
import { genererDevisParticulier, genererDevisEntreprise, genererSousDetailPrix } from '../src/valorisation.js';
import { REGLES_DEFAUT } from '../src/regles.js';

describe('Valorisation et Devis', () => {
  // Un projet factice (mais avec des valeurs) pour tester la fondation
  const projet = [
    {
      niveau: { id: 'rdc', nom: 'RDC' },
      saisie: {
        semelles: [{ nombre: 5, longueur: 1.7, largeur: 1.7, hauteur: 0.5 }]
      },
      metre: calculerMetre({ semelles: [{ nombre: 5, longueur: 1.7, largeur: 1.7, hauteur: 0.5 }] }, REGLES_DEFAUT)
    }
  ];

  test('La fondation a deux prix différents selon le lecteur', () => {
    const devisParticulier = genererDevisParticulier(projet, REGLES_DEFAUT, {});
    const devisEntreprise = genererDevisEntreprise(projet, REGLES_DEFAUT, {});
    
    assert.ok(devisParticulier.total > 0, "Le total particulier doit être > 0");
    assert.ok(devisEntreprise.total > 0, "Le total entreprise doit être > 0");
    
    // Les sous-totaux Fondation
    const stParticulier = devisParticulier.lots['fondation']?.sousTotal || 0;
    const stEntreprise = devisEntreprise.niveaux['fondation']?.sousTotal || 0;
    
    assert.ok(stParticulier > 0, "Le sous-total particulier fondation doit être > 0");
    assert.ok(stEntreprise > 0, "Le sous-total entreprise fondation doit être > 0");
    assert.notEqual(stParticulier, stEntreprise, "Les deux montants doivent différer");
  });

  test('genererSousDetailPrix : Beton proprete et beton arme', () => {
    // Béton de propreté
    const sdProprete = genererSousDetailPrix('betonProprete', { total: 1 }, REGLES_DEFAUT, {});
    // Avec la majoration MO de 28%, le prix de 1m3 doit être cohérent
    assert.ok(sdProprete.prixVenteUnitaire > 0);

    // Béton armé (semelles)
    const sdSemelles = genererSousDetailPrix('semelles', { total: 1, totalCoffrage: 3 }, REGLES_DEFAUT, {});
    assert.ok(sdSemelles.prixVenteUnitaire > 0);
    assert.ok(sdSemelles.ratioAcierDefaut, "Devrait utiliser le ratio d'acier par défaut (130) s'il n'y a pas de lignes d'armature");
  });
});
