import test from 'node:test';
import assert from 'node:assert/strict';
import { genererResumeChantier } from '../src/resumeChantier.js';

test('Résumé dans l\'ordre du chantier', async (t) => {
  const saisie = {
    fouilles: [{ longueur: 0.65, largeur: 0.65, profondeur: 0.90, nombre: 12 }],
    betonProprete: [{ longueur: 0.55, largeur: 0.55, epaisseur: 0.05, nombre: 12 }],
    fouilleFilante: [{ longueur: 60.85, largeur: 0.60, profondeur: 0.65, nombre: 1 }],
    semelles: [{ repere: 'S1', nombre: 12, longueur: 0.35, largeur: 0.35, hauteur: 0.30 }],
    amorces: [{ repere: 'AM1', nombre: 12, longueur: 0.15, largeur: 0.15, hauteur: 0.55, diametrePrin1: 10, nbreBarresPrin1: 4 }],
    longrines: [{ perimetre: 60.85, largeur: 0.20, hauteur: 0.40, nombre: 1 }],
    soubassement: [{ longueur: 60.85, hauteur: 0.60, epaisseur: 0.20, nombre: 1 }],
    nivellement: [{ longueur: 9.65, largeur: 7.15, epaisseur: 0.30, nombre: 1 }],
    maconnerie: [{ repere: 'M1', longueur: 30, hauteur: 3, nombre: 1 }],
    colonnes: [{ repere: 'C1', forme: 'rectangulaire', longueur: 0.2, largeur: 0.2, hauteur: 3, nombre: 12, diametrePrin: 12, nbreBarresPrin: 4 }],
    dalles: [{ repere: 'D1', longueur: 10, largeur: 8, epaisseurCm: 12, nombre: 1 }],
    enduits: [{ longueur: 30, hauteur: 3, nombre: 1 }],
  };

  const resume = genererResumeChantier(saisie);

  await t.test('les grands titres suivent l\'ordre du chantier, sans trou', () => {
    const noms = resume.titres.map((t) => t.titre);
    assert.deepEqual(noms, ['1. Terrassement', '2. Fondation', '3. Élévation', '4. Plancher', '6. Finitions']);
  });

  await t.test('le Terrassement ne porte que Déblai et Remblai', () => {
    const terrassement = resume.titres.find((t) => t.titre === '1. Terrassement');
    assert.deepEqual(terrassement.postes.map((p) => p.nom), ['Déblai', 'Remblai']);
    assert.ok(terrassement.postes[0].volume > 0);
    assert.equal(terrassement.postes[0].beton, null);
    assert.equal(terrassement.postes[0].aciers.length, 0);
  });

  const fondation = resume.titres.find((t) => t.titre === '2. Fondation');

  await t.test('le béton de propreté porte son dosage, ses matériaux, aucun fer', () => {
    const bp = fondation.postes.find((p) => p.nom.startsWith('Béton de propreté'));
    assert.ok(bp, 'le poste existe');
    assert.match(bp.nom, /kg\/m³/, 'le dosage réel figure dans le nom');
    assert.ok(bp.volume > 0);
    for (const cat of ['ciment', 'sable', 'gravier', 'eau']) {
      assert.ok(bp.beton[cat]?.quantite > 0, `porte du ${cat}`);
    }
    assert.equal(bp.aciers.length, 0, 'un béton non armé ne porte aucun fer');
    assert.equal(bp.filAttache, 0);
  });

  await t.test('semelles et amorces sont fusionnées en un seul poste armé', () => {
    const noms = fondation.postes.map((p) => p.nom);
    assert.ok(noms.some((n) => n.includes('semelles et amorces')));
    assert.ok(!noms.some((n) => /^Amorces/.test(n)), 'aucun poste "Amorces" séparé');

    const poste = fondation.postes.find((p) => p.nom.includes('semelles et amorces'));
    assert.match(poste.nom, /dosage \d+ kg\/m³/);
    for (const cat of ['ciment', 'sable', 'gravier', 'eau']) {
      assert.ok(poste.beton[cat]?.quantite > 0, `porte du ${cat}`);
    }
    assert.ok(poste.aciers.length > 0, 'porte du fer');
    assert.ok(poste.aciers.every((a) => a.poids > 0 && a.barres12m > 0));
    // Croissant par diamètre — pas dans l'ordre où le moteur les a calculés.
    for (let i = 1; i < poste.aciers.length; i += 1) {
      assert.ok(poste.aciers[i].diametre >= poste.aciers[i - 1].diametre);
    }
    assert.ok(poste.filAttache > 0);
    const poidsTotal = poste.aciers.reduce((s, a) => s + a.poids, 0);
    assert.equal(poste.filAttache, Math.round(poidsTotal * 0.05 * 1e6) / 1e6);
  });

  await t.test('les longrines forment leur propre poste armé', () => {
    const poste = fondation.postes.find((p) => p.nom.startsWith('Béton armé pour longrines'));
    assert.ok(poste);
    assert.ok(poste.aciers.length > 0);
  });

  await t.test('les murs de soubassement portent des agglos et du béton, aucun fer', () => {
    const mur = fondation.postes.find((p) => p.nom.includes('soubassement'));
    assert.ok(mur);
    assert.ok(mur.agglos.length > 0, 'les agglos sont comptés');
    assert.equal(mur.aciers.length, 0);
  });

  await t.test('les petites fournitures de la Fondation sont additionnées une seule fois', () => {
    const noms = fondation.autresPostes.map((m) => m.nom);
    assert.ok(noms.includes('Planches de coffrage'));
    assert.ok(noms.includes('Chevrons'));
    // Une seule ligne « Planches de coffrage », pas une par ouvrage (semelles + amorces + longrines).
    assert.equal(fondation.autresPostes.filter((m) => m.nom === 'Planches de coffrage').length, 1);
  });

  const elevation = resume.titres.find((t) => t.titre === '3. Élévation');

  await t.test('la maçonnerie porte ses agglos, du ciment, du sable, de l\'eau — jamais de gravier', () => {
    const mac = elevation.postes.find((p) => p.nom.includes('Maçonnerie'));
    assert.ok(mac);
    assert.ok(mac.agglos.length > 0);
    assert.ok(mac.beton.ciment?.quantite > 0);
    assert.ok(mac.beton.sable?.quantite > 0);
    assert.ok(mac.beton.eau?.quantite > 0);
    assert.equal(mac.beton.gravier, undefined, 'le mortier de hourdage ne contient pas de gravier');
  });

  await t.test('les poteaux (colonnes) forment un poste armé dans l\'Élévation', () => {
    const poteaux = elevation.postes.find((p) => p.nom.startsWith('Béton armé pour poteaux'));
    assert.ok(poteaux);
    assert.ok(poteaux.aciers.length > 0);
  });

  await t.test('les dalles pleines sont dans le Plancher, armées', () => {
    const plancher = resume.titres.find((t) => t.titre === '4. Plancher');
    const dalle = plancher.postes.find((p) => p.nom.startsWith('Dalles pleines'));
    assert.ok(dalle);
    assert.ok(dalle.aciers.length > 0);
  });

  await t.test('les enduits sont dans les Finitions, sans gravier ni fer', () => {
    const finitions = resume.titres.find((t) => t.titre === '6. Finitions');
    const enduit = finitions.postes.find((p) => p.nom === 'Enduits');
    assert.ok(enduit);
    assert.ok(enduit.beton.ciment?.quantite > 0);
    assert.equal(enduit.beton.gravier, undefined);
    assert.equal(enduit.aciers.length, 0);
  });

  await t.test('aucun grand titre vide (Toiture, sans charpente ni couverture ni acrotère) ne s\'affiche', () => {
    assert.ok(!resume.titres.some((t) => t.titre === '5. Toiture'));
  });

  await t.test('aucune trace du bloc technique « armatures », ni des fouilles brutes', () => {
    const idsAffiches = resume.titres.flatMap((t) => t.postes.map((p) => p.id));
    assert.ok(!idsAffiches.includes('armatures'));
    assert.ok(!idsAffiches.includes('fouilles'));
    assert.ok(!idsAffiches.includes('fouilleFilante'));
    assert.ok(!idsAffiches.includes('nivellement'));
  });
});

test('Résumé — un projet vide ne produit aucun grand titre', () => {
  const resume = genererResumeChantier({});
  assert.deepEqual(resume.titres, []);
});

test('Résumé — sans amorces, la fusion ne fait pas apparaître un poste fantôme', () => {
  const resume = genererResumeChantier({
    semelles: [{ repere: 'S1', nombre: 4, longueur: 1, largeur: 1, hauteur: 0.3 }],
  });
  const fondation = resume.titres.find((t) => t.titre === '2. Fondation');
  const poste = fondation.postes.find((p) => p.nom.includes('semelles et amorces'));
  assert.ok(poste, 'le poste existe avec les seules semelles');
  assert.equal(poste.volume, 1.2, '4 x 1 x 1 x 0.3 = 1.2 m3, sans amorce');
});

test('Résumé — accepte metreParNiveau comme genererNoteDeCalcul', () => {
  const metreParNiveau = [
    { niveau: { nom: 'RDC' }, saisie: { maconnerie: [{ repere: 'M1', longueur: 10, hauteur: 3, nombre: 1 }] } },
    { niveau: { nom: 'Étage 1' }, saisie: { maconnerie: [{ repere: 'M2', longueur: 8, hauteur: 3, nombre: 1 }] } },
  ];
  const resume = genererResumeChantier(metreParNiveau);
  const elevation = resume.titres.find((t) => t.titre === '3. Élévation');
  const mac = elevation.postes.find((p) => p.nom.includes('Maçonnerie'));
  assert.equal(mac.volume, 54, 'les deux niveaux sont cumulés : 10x3 + 8x3 = 54 m²');
});
