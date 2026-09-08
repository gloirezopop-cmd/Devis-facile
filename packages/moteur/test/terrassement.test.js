import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculerMetre } from '../src/metre.js';
import { genererResumeFondation } from '../src/resume.js';
import { REGLES_DEFAUT } from '../src/regles.js';

describe('Terrassement et Résumé Fondation', () => {
  it('CAS DE TEST - Déblais, Remblais, Résumé complet', () => {
    const saisie = {
      fouilles: [
        { longueur: 0.65, largeur: 0.65, profondeur: 0.90, nombre: 12 }
      ],
      betonProprete: [
        { longueur: 0.55, largeur: 0.55, epaisseur: 0.05, nombre: 12 }
      ],
      fouilleFilante: [
        { longueur: 60.85, largeur: 0.60, profondeur: 0.65, nombre: 1 }
      ],
      semelles: [
        { nombre: 12, longueur: 0.35, largeur: 0.35, hauteur: 0.30, amorceSectionA: 15, amorceSectionB: 15, amorceHauteur: 0.55 }
      ],
      longrines: [
        { perimetre: 60.85, largeur: 0.20, hauteur: 0.40, nombre: 1 } // Note: largeur 0.20, hauteur 0.40 pour correspondre à 0.08 m2
      ],
      soubassement: [
        { longueur: 60.85, hauteur: 0.60, epaisseur: 0.20, nombre: 1 } // Note: largeur 0.20 pour correspondre à 0.12 m2 (total = 0.20m2 = 12.17m3)
      ],
      nivellement: [
        { longueur: 9.65, largeur: 7.15, epaisseur: 0.30, nombre: 1 }
      ]
    };

    const resume = genererResumeFondation(saisie, REGLES_DEFAUT);
    
    // Déblais et Remblais
    assert.equal(resume.volumes.fouillesPuits.toFixed(3), '4.563');
    assert.equal(resume.volumes.fouilleFilante.toFixed(4), '23.7315');
    assert.equal(resume.volumes.deblais.toFixed(5), '36.78285'); // 4.563 + 23.7315 = 28.2945 * 1.3 = 36.78285
    
    assert.equal(resume.volumes.videSemelles.toFixed(4), '4.9296');
    assert.equal(resume.volumes.videFilant.toFixed(5), '15.02995'); // 15.02995 = (23.7315 - 12.17) * 1.3
    assert.equal(resume.volumes.nivellement.toFixed(6), '26.909025'); // 9.65 * 7.15 * 0.30 * 1.3
    assert.equal(resume.volumes.remblais.toFixed(6), '46.868575'); 
    assert.equal(resume.volumes.evacuation, 0);

    // Résumé Matériaux
    // 59 et non 45 : le mur de soubassement se calcule en AGGLOS BOURRES —
    // agglos pleins, mortier de pose ET beton de remplissage des alveoles.
    // La decomposition sort donc deux postes de ciment distincts,
    // « Ciment (Mortier) » et « Ciment (Béton Alvéoles) ». C'est la formule
    // retenue pour le produit ; l'ancienne attente ne comptait que le mortier.
    assert.equal(resume.materiaux.ciment, 59);
    // Gravier du beton (semelles + proprete + longrines) plus celui du beton de
    // remplissage des alveoles du mur bourre, le tout en tonnes.
    assert.equal(resume.materiaux.gravier.toFixed(5), '11.39440');
    // Le mortier se calcule sur le nombre entier de blocs reellement poses, et
    // le sable est converti en tonnes comme le reste (x1,5) : le mur bourre
    // apporte en plus son sable de mortier ET son sable de beton d'alveoles.
    assert.equal(resume.materiaux.sable.toFixed(6), '7.257900');
    // Le mur de soubassement apporte desormais son eau de gachage : celle du
    // mortier de pose ET celle du beton de remplissage des alveoles, qui
    // n'etait comptee nulle part.
    assert.equal(resume.materiaux.eau.toFixed(6), '1405.068125');

    // Aciers
    // 262,14 kg : nappes de semelle 44,42 + amorces 58,64 + longrine 84,48
    // + etriers de longrine 74,59. Ces etriers pesaient zero avant correction —
    // le moteur lisait un parametre LcCadre inexistant, la longueur d'etrier
    // partait en NaN et le poids tombait a 0 sans rien signaler.
    assert.equal(resume.aciers.totalPoids.toFixed(2), '262.14');
  });
});
