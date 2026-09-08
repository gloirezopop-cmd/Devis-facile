import { test, describe } from 'node:test';
import assert from 'node:assert';
import { calculerMetre } from '../src/metre.js';
import { genererDevisParticulier, genererSousDetailPrix } from '../src/valorisation.js';
import { REGLES_DEFAUT } from '../src/regles.js';

/**
 * Deux exigences du fondateur, verrouillees ici :
 *
 * 1. Le prix unitaire d'un m3 se construit a partir de ce qu'il y a dedans —
 *    ciment, sable, gravier, eau — et non d'un prix pose a la main.
 * 2. Les pourcentages appartiennent a l'utilisateur. Les cinq frais du Devis
 *    Particulier et le coefficient de vente du Devis Entreprise doivent
 *    reellement changer les montants quand il les modifie. Les quatre taux du
 *    coefficient etaient jusqu'ici affiches dans l'ecran Parametres sans etre
 *    lus nulle part : l'entreprise vendait a prix coutant.
 */
describe('Les prix suivent les taux saisis par l utilisateur', () => {
  const prix = {
    ciment: 5500, sable: 15000, gravier: 25000, eau: 500,
    acierHA_12: 8000, filLigature: 1200, planches: 3000, chevrons: 2200, clous: 1000,
  };

  const clesVides = [
    'fouilles', 'fouilleFilante', 'betonProprete', 'semelles', 'amorces', 'longrines',
    'colonnes', 'escalier', 'maconnerie', 'linteaux', 'murSoubassement', 'soubassement',
    'moellon', 'dallage', 'remblai', 'sousPavement', 'nivellement', 'carrelage',
    'enduits', 'peinture', 'faience', 'autresOuvrages', 'dalles',
    'plancherHourdis12', 'plancherHourdis16', 'charpenteBois', 'couvertureToles',
    'acrotere', 'formePente',
  ];
  const saisieComplete = (partielle) => ({
    ...Object.fromEntries(clesVides.map((c) => [c, []])),
    ...partielle,
  });

  const semelle = {
    id: 's1', repere: 'S1', longueur: 1.2, largeur: 1.2, hauteur: 0.3, nombre: 8,
    diametrePrinL: 10, espacementL: 0.15, diametrePrinLarg: 10, espacementLarg: 0.15, enrobage: 0.05,
  };

  function projet(regles) {
    const saisie = saisieComplete({ semelles: [semelle] });
    return [{
      niveauId: 'fondation',
      niveau: { id: 'fondation', nom: '2. Fondation', type: 'fondation' },
      saisie,
      metre: calculerMetre(saisie, regles),
    }];
  }

  test('le prix d un m3 de beton arme se compose de ses materiaux', () => {
    const regles = { ...REGLES_DEFAUT };
    const bloc = { total: 1, lignes: [{ valeur: 1 }] };
    const sd = genererSousDetailPrix('semelles', bloc, regles, prix);

    const ids = sd.composantes.map((c) => c.id);
    for (const attendu of ['ciment', 'sable', 'gravier']) {
      assert.ok(ids.includes(attendu), `le m3 doit contenir ${attendu}, composantes : ${ids.join(', ')}`);
    }

    // Le debourse materiaux est bien la somme des composantes, pas un chiffre pose.
    const sommeComposantes = sd.composantes.reduce((t, c) => t + c.montant, 0);
    assert.ok(Math.abs(sd.debourseMateriaux - sommeComposantes) < 1,
      `debourse ${sd.debourseMateriaux} != somme des composantes ${sommeComposantes}`);
    assert.ok(sd.debourseMateriaux > 0, 'le m3 doit avoir un cout materiaux');
  });

  test('le coefficient de vente saisi par l utilisateur change le prix de vente', () => {
    const bloc = { total: 1, lignes: [{ valeur: 1 }] };

    const sansMarge = genererSousDetailPrix('semelles', bloc,
      { ...REGLES_DEFAUT, taux: { ...REGLES_DEFAUT.taux, fraisChantier: 0, fraisGeneraux: 0, fraisOperation: 0, aleasEtBenefice: 0 } }, prix);
    const avecMarge = genererSousDetailPrix('semelles', bloc,
      { ...REGLES_DEFAUT, taux: { ...REGLES_DEFAUT.taux, fraisChantier: 0.10, fraisGeneraux: 0.10, fraisOperation: 0, aleasEtBenefice: 0.10 } }, prix);

    assert.strictEqual(sansMarge.coefficientVente, 1, 'sans taux, le coefficient vaut 1');
    assert.ok(Math.abs(avecMarge.coefficientVente - 1.30) < 1e-9, `coefficient attendu 1,30 — recu ${avecMarge.coefficientVente}`);
    assert.strictEqual(sansMarge.prixVenteUnitaire, sansMarge.debourseSec,
      'sans marge, le prix de vente est le debourse sec');
    assert.ok(avecMarge.prixVenteUnitaire > sansMarge.prixVenteUnitaire,
      'une marge saisie doit augmenter le prix de vente');
    assert.strictEqual(avecMarge.prixVenteUnitaire, Math.round(avecMarge.debourseSec * 1.30),
      'le prix de vente est le debourse sec multiplie par le coefficient');
  });

  test('les cinq frais du Devis Particulier suivent les taux saisis', () => {
    const tauxUtilisateur = {
      ...REGLES_DEFAUT.taux,
      imprevus: 0.05, transport: 0.05, mainOeuvre: 0.30, honorairesArchi: 0.08, honorairesInge: 0.08,
    };
    const regles = { ...REGLES_DEFAUT, taux: tauxUtilisateur };
    const devis = genererDevisParticulier(projet(regles), regles, prix, {});
    const c = devis.cascade;

    assert.ok(c.totalMateriaux > 0, 'le devis doit etre chiffre');
    assert.strictEqual(c.imprevus, Math.round(c.totalMateriaux * 0.05));
    assert.strictEqual(c.transport, Math.round(c.totalMateriaux * 0.05));
    assert.strictEqual(c.mainOeuvre, Math.round(c.totalMateriaux * 0.30));
    assert.strictEqual(c.honorairesArchi, Math.round(c.totalMateriaux * 0.08),
      'les honoraires portent sur le TOTAL, pas sur le total des travaux');
    assert.strictEqual(c.honorairesInge, Math.round(c.totalMateriaux * 0.08));

    const attendu = c.totalMateriaux + c.imprevus + c.transport + c.mainOeuvre + c.honorairesArchi + c.honorairesInge;
    assert.ok(Math.abs(c.totalGeneral - attendu) <= 3,
      `total general ${c.totalGeneral} != somme attendue ${attendu}`);
  });

  test('changer un taux change le total general', () => {
    const base = { ...REGLES_DEFAUT, taux: { ...REGLES_DEFAUT.taux, mainOeuvre: 0.30 } };
    const releve = { ...REGLES_DEFAUT, taux: { ...REGLES_DEFAUT.taux, mainOeuvre: 0.40 } };

    const a = genererDevisParticulier(projet(base), base, prix, {});
    const b = genererDevisParticulier(projet(releve), releve, prix, {});

    assert.ok(b.cascade.totalGeneral > a.cascade.totalGeneral,
      'monter la main d oeuvre doit monter le total general');
  });
});
