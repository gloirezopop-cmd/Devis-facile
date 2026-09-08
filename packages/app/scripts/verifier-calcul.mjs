/**
 * Vérification du modèle de calcul cumulé.
 *
 *   npm run verifier:calcul      (depuis packages/app)
 *
 * Rejoue les exemples chiffrés du cahier des charges sur la vraie logique de
 * src/utils/estimation.js, et vérifie que la grille de prix livrée dans
 * maj_calcul_cumule.sql correspond.
 */
import { readFileSync } from 'node:fs';
import * as e from '../src/utils/estimation.js';

let ok = true;
function verifier(label, condition) {
  console.log(`${condition ? '  OK   ' : '  ECHEC'} — ${label}`);
  if (!condition) ok = false;
}

// ─── A. La parcelle a disparu du parcours ───────────────────────────────────
//
// L'utilisateur saisit la surface de chaque niveau de son bâtiment, et rien
// d'autre. On ne lui demande ni la surface du terrain, ni la part qu'il y
// bâtit : ce sont des chiffres qu'il n'a souvent pas, et qui l'obligeraient à
// deviner. Ce test échoue si la notion revenait par une porte dérobée.
console.log('\n=== A. AUCUNE QUESTION SUR LA PARCELLE ===');
const sourceCalcul = readFileSync(new URL('../src/utils/estimation.js', import.meta.url), 'utf8');
const sourceSession = readFileSync(new URL('../src/hooks/useEstimationSession.js', import.meta.url), 'utf8');
const sourceParcours = readFileSync(new URL('../src/pages/EstimationBudget.jsx', import.meta.url), 'utf8');

verifier('Plus de calcul de surface de référence', e.calculerSurfaceReference === undefined);
verifier('Plus de surface de terrain dans la logique', !/surfaceTerrain|surface_terrain/.test(sourceCalcul));
verifier('Plus de pourcentage de construction dans la logique',
  !/pourcentageConstruction|pourcentage_construction/.test(sourceCalcul));
verifier('Plus de terrain dans l\'état de l\'assistant',
  !/surfaceTerrain|pourcentage|surfaceReference/.test(sourceSession));
verifier('Plus d\'étape « Terrain » dans le parcours', !/EtapeTerrain|'terrain'/.test(sourceParcours));
verifier('Plus d\'étape « Toiture » dans le parcours', !/EtapeToiture|'toiture'/.test(sourceParcours));
verifier('Plus de type de toiture demandé à l\'utilisateur', !/roofType/.test(sourceSession));

const etapes = [...sourceParcours.matchAll(/\{ id: '([a-z]+)', label: '([^']+)' \}/g)].map((m) => m[1]);
console.log(`  Parcours : ${etapes.join(' → ')}`);
verifier('Sept étapes, de « pays » à « resultat »',
  etapes.join('|') === 'pays|localisation|projet|standing|niveaux|surfaces|resultat');

// ─── B. Nombre de surfaces ──────────────────────────────────────────────────
console.log('\n=== B. NOMBRE DE SURFACES COMPTABILISEES ===');
const attendus = [[0, 3], [1, 4], [2, 5], [3, 6], [4, 7], [10, 13]];
for (const [etages, surfaces] of attendus) {
  verifier(`R+${etages} → ${surfaces} surfaces`, e.compterSurfaces(etages) === surfaces);
}
verifier('Le nombre d\'étages n\'est pas plafonné', e.compterSurfaces(25) === 28);

console.log('\n  Niveaux générés pour un R+3 :');
const n3 = e.genererNiveaux(3);
console.log(`  ${n3.map((n) => n.label).join(' + ')}`);
verifier('R+3 : Fondation, RDC, R+1, R+2, R+3, Toiture ou terrasse',
  n3.map((n) => n.label).join('|') === 'Fondation|RDC|R+1|R+2|R+3|Toiture ou terrasse');
verifier('Le dernier niveau nomme aussi la terrasse',
  n3[n3.length - 1].label === 'Toiture ou terrasse');
verifier('Autant de niveaux que de surfaces comptées', n3.length === e.compterSurfaces(3));
verifier('R+0 donne bien 3 niveaux', e.genererNiveaux(0).length === 3);

// ─── C. L'exemple complet du cahier des charges ─────────────────────────────
console.log('\n=== C. EXEMPLE : R+3 à 350 m² par niveau, standing moyen ===');
// La personne saisit 350 m² sur la fondation, puis reporte sur le reste.
const niveaux = e.reporterSurface(e.genererNiveaux(3), 350);
for (const n of niveaux) console.log(`  ${n.label.padEnd(10)} ${n.surface} m²`);
verifier('Les six niveaux portent 350 m²', niveaux.every((n) => n.surface === 350));
verifier('Le report n\'écrase jamais une surface déjà saisie',
  e.reporterSurface([{ id: 'rdc', surface: 400 }, { id: 'toiture' }], 350)
    .map((n) => n.surface).join('|') === '400|350');

const cumul = e.calculerSurfaceTotale(niveaux);
console.log(`  Surface totale cumulée : ${cumul} m²`);
verifier('350 × 6 = 2 100 m²', cumul === 2100);
verifier('La fondation est comptée', niveaux.some((n) => n.type === 'foundation' && n.surface === 350));
verifier('La toiture est comptée', niveaux.some((n) => n.type === 'roof' && n.surface === 350));

const tarifMoyen = { price_min: 200000, price_reference: 200000, price_max: 200000, currency_code: 'XAF' };
const cout = e.calculerBudget(cumul, tarifMoyen);
console.log(`  Coût estimatif : ${cout.budgetReference} FCFA`);
verifier('2 100 × 200 000 = 420 000 000 FCFA', cout.budgetReference === 420000000);
verifier('Prix unique : un seul montant affiché', e.tarifEstUnique(tarifMoyen) === true);
verifier('Min et max valent le même montant',
  cout.budgetMin === 420000000 && cout.budgetMax === 420000000);

// ─── D. Surfaces différentes par niveau, deux modes de saisie ───────────────
console.log('\n=== D. SURFACES DIFFERENTES ET MODES DE SAISIE ===');
// Fondation, RDC, R+1, R+2, Toiture — cinq surfaces, toutes différentes.
const varies = e.genererNiveaux(2).map((n, i) => ({ ...n, surface: [380, 350, 320, 280, 300][i] }));
console.log(`  ${varies.map((n) => `${n.label} ${n.surface}`).join(' + ')}`);
verifier('380 + 350 + 320 + 280 + 300 = 1 630 m²', e.calculerSurfaceTotale(varies) === 1630);
verifier('Rien n\'oblige les niveaux à avoir la même surface',
  new Set(varies.map((n) => n.surface)).size > 1);

// Deux modes, et rien d'autre : plus de champ « balcons / terrasses ». Ce que
// la personne saisit est exactement ce qui est retenu — aucun ajout caché.
const saisieDirecte = e.calculerSurfaceNiveau({ mode: 'surface', surface: 350 });
console.log(`  Surface saisie 350 m² → ${saisieDirecte.valeur} m²`);
verifier('La surface saisie est retenue telle quelle', saisieDirecte.valeur === 350);
verifier('Longueur × largeur : 12 × 8 = 96',
  e.calculerSurfaceNiveau({ mode: 'dimensions', longueur: 12, largeur: 8 }).valeur === 96);
verifier('Aucun supplément n\'est ajouté derrière le dos de l\'utilisateur',
  e.calculerSurfaceNiveau({ mode: 'surface', surface: 350, balcons: 20 }).valeur === 350);
verifier('Le champ balcons a disparu de l\'écran des surfaces',
  !/balcons/i.test(readFileSync(new URL('../src/components/estimation/EtapeSurfaces.jsx', import.meta.url), 'utf8')));
verifier('Une surface à 0 reste refusée',
  e.calculerSurfaceNiveau({ mode: 'surface', surface: 0 }).erreur === 'Veuillez saisir une surface valide.');

// ─── E. Le cas R+0 ──────────────────────────────────────────────────────────
console.log('\n=== E. PLAIN-PIED (R+0) ===');
const r0 = e.reporterSurface(e.genererNiveaux(0), 120);
console.log(`  ${r0.map((n) => `${n.label} ${n.surface}`).join(' + ')} = ${e.calculerSurfaceTotale(r0)} m²`);
verifier('Fondation + RDC + Toiture, soit 3 × 120 = 360 m²', e.calculerSurfaceTotale(r0) === 360);
verifier('Aucun étage', !r0.some((n) => n.type === 'floor'));

// ─── F. Aucune estimation ne doit rester sans réponse ───────────────────────
console.log('\n=== F. TOUS LES TYPES ET TOUS LES STANDINGS DOIVENT ABOUTIR ===');
const STANDINGS = ['economique', 'moyen_standing', 'haut_standing', 'tres_haut_standing'];
const TYPES = ['maison_individuelle', 'villa', 'immeuble_residentiel', 'bureau', 'commerce', 'ecole', 'hotel', 'autre'];
const PRIORITAIRES = ['cameroun', 'cote_ivoire', 'senegal', 'congo', 'gabon', 'benin', 'niger'];

// Les tarifs nationaux tels que le SQL les crée : un par pays et par standing.
const PRIX = { economique: 150000, moyen_standing: 200000, haut_standing: 250000, tres_haut_standing: 300000 };
const tarifsNationaux = PRIORITAIRES.flatMap((pays) => STANDINGS.map((s) => ({
  country_id: pays, standing_id: s, location_id: null, building_type_id: null,
  roof_type_id: null, level_category: null, active: true,
  price_min: PRIX[s], price_reference: PRIX[s], price_max: PRIX[s],
  currency_code: ['cameroun', 'congo', 'gabon'].includes(pays) ? 'XAF' : 'XOF',
})));

let manquants = [];
for (const pays of PRIORITAIRES) {
  const duPays = tarifsNationaux.filter((t) => t.country_id === pays);
  for (const type of TYPES) {
    for (const standing of STANDINGS) {
      for (const etages of [0, 1, 3, 10]) {
        const t = e.rechercherTarif(duPays, {
          // Plus aucune toiture n'est demandée : la cascade doit aboutir sans.
          locationId: `${pays}_une_ville`, buildingTypeId: type, standingId: standing,
          roofTypeId: null, levelCategory: e.formaterCategorieNiveau(etages),
        });
        if (!t) manquants.push(`${pays}/${type}/${standing}/R+${etages}`);
      }
    }
  }
}
console.log(`  ${PRIORITAIRES.length} pays × ${TYPES.length} types × ${STANDINGS.length} standings × 4 configurations`);
console.log(`  = ${PRIORITAIRES.length * TYPES.length * STANDINGS.length * 4} combinaisons testées`);
if (manquants.length) console.log(`  Sans tarif : ${manquants.slice(0, 5).join(', ')}…`);
verifier('Aucune combinaison ne reste sans tarif', manquants.length === 0);

// Un commerce en luxe, cas cité comme défaillant.
const commerceLuxe = e.rechercherTarif(
  tarifsNationaux.filter((t) => t.country_id === 'cameroun'),
  { locationId: 'cm_bafoussam', buildingTypeId: 'commerce', standingId: 'tres_haut_standing',
    roofTypeId: null, levelCategory: 'R2' },
);
verifier('Un commerce en Luxe à Bafoussam trouve son tarif', !!commerceLuxe);
verifier('Et il est chiffré au prix du Luxe (300 000)', Number(commerceLuxe?.price_reference) === 300000);

// ─── G. La grille livrée dans le SQL ────────────────────────────────────────
console.log('\n=== G. GRILLE LIVREE DANS maj_calcul_cumule.sql ===');
const sql = readFileSync(new URL('../../../maj_calcul_cumule.sql', import.meta.url), 'utf8');
for (const [standing, prix] of Object.entries(PRIX)) {
  const pose = new RegExp(`price_min = ${prix}, price_reference = ${prix}, price_max = ${prix}[\\s\\S]{0,120}standing_id = '${standing}'`);
  verifier(`${standing} à ${prix} FCFA/m² dans le SQL`, pose.test(sql));
}
verifier('Le calcul serveur somme TOUS les niveaux',
  /sum\(\(niveau->>'surface'\)::numeric\)[\s\S]{0,200}where niveau->>'surface' is not null/.test(sql)
  && !/type' in \('ground_floor', 'floor'\)/.test(sql));

console.log(`\n${ok ? '>>> TOUS LES TESTS PASSENT.' : '>>> DES TESTS ONT ECHOUE.'}`);
process.exitCode = ok ? 0 : 1;
