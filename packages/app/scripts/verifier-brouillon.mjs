/**
 * Vérification du brouillon de travail.
 *
 *   npm run verifier:brouillon      (depuis packages/app)
 *
 * La logique testée est celle de src/utils/brouillon.js, celle qui tourne dans
 * l'application. Le stockage est simulé — on vérifie le comportement, pas le
 * navigateur.
 *
 * Ce qui compte ici tient en une phrase : « recommencer à zéro » doit vider ce
 * qui est en cours et NE JAMAIS toucher aux projets enregistrés.
 */
import { readFileSync } from 'node:fs';
import * as b from '../src/utils/brouillon.js';

let ok = true;
function verifier(label, condition) {
  console.log(`${condition ? '  OK   ' : '  ECHEC'} — ${label}`);
  if (!condition) ok = false;
}

/** Un `localStorage` de laboratoire : même interface, rien de plus. */
function stockageFactice(depart = {}) {
  const donnees = new Map(Object.entries(depart));
  return {
    get length() { return donnees.size; },
    key: (i) => [...donnees.keys()][i] ?? null,
    getItem: (c) => (donnees.has(c) ? donnees.get(c) : null),
    setItem: (c, v) => donnees.set(c, String(v)),
    removeItem: (c) => donnees.delete(c),
    tout: () => Object.fromEntries(donnees),
  };
}

const PROJETS_ENREGISTRES = JSON.stringify([{ id: 'proj_1', nom: 'Villa Douala' }]);

function stockageDeTravail() {
  return stockageFactice({
    df_projets: PROJETS_ENREGISTRES,
    df_projetActifId: '"proj_1"',
    df_estimation_session: JSON.stringify({ country: 'cameroun', nombreEtages: 2, levels: [{ id: 'rdc' }] }),
    df_parametresProjet_v3: JSON.stringify({ reference: 'DF-2026-014', maitreOuvrage: 'M. Nguema', localisation: 'Douala' }),
    df_semelles_v3: JSON.stringify([{ id: 1, repere: 'S1' }]),
    df_niveaux_v3: JSON.stringify([{ id: 'terrassement' }]),
    df_bibliothequePrix_v3: JSON.stringify({ ciment: '5500' }),
    autre_application: 'ne me touche pas',
  });
}

// ─── A. Ce que le brouillon emporte ─────────────────────────────────────────
console.log('\n=== A. LA PHOTO DU TRAVAIL EN COURS ===');
const stockage = stockageDeTravail();
const photo = b.collecterEtatLocal(stockage);
console.log(`  ${Object.keys(photo).length} clés photographiées`);

verifier('Les saisies de l\'assistant sont emportées', !!photo.df_estimation_session);
verifier('Les saisies du métré sont emportées', !!photo.df_semelles_v3);
verifier('Les paramètres du devis sont emportés', !!photo.df_parametresProjet_v3);
verifier('Les projets enregistrés ne sont PAS emportés', photo.df_projets === undefined);
verifier('Ce qui n\'appartient pas à l\'application est ignoré', photo.autre_application === undefined);

// ─── B. « Commencer un nouveau projet » ─────────────────────────────────────
console.log('\n=== B. RECOMMENCER A ZERO ===');
const apresRaz = stockageDeTravail();
b.effacerEtatLocal(apresRaz);
const restant = apresRaz.tout();
console.log(`  Restant : ${Object.keys(restant).join(', ')}`);

verifier('Les saisies de l\'assistant sont effacées', restant.df_estimation_session === undefined);
verifier('Les saisies du métré sont effacées', restant.df_semelles_v3 === undefined);
verifier('Les paramètres du devis sont effacés', restant.df_parametresProjet_v3 === undefined);
verifier('Le projet actif est oublié', restant.df_projetActifId === undefined);
verifier('LES PROJETS ENREGISTRES SURVIVENT', restant.df_projets === PROJETS_ENREGISTRES);
verifier('Ce qui n\'appartient pas à l\'application survit', restant.autre_application === 'ne me touche pas');
verifier('« df_projets » est bien la seule clé préservée',
  b.CLES_PRESERVEES.length === 1 && b.CLES_PRESERVEES[0] === 'df_projets');

// ─── C. « Continuer ce projet » ─────────────────────────────────────────────
console.log('\n=== C. REPRENDRE LE BROUILLON ===');
const vierge = stockageFactice({ df_projets: PROJETS_ENREGISTRES });
b.restaurerEtatLocal(photo, vierge);
const repris = vierge.tout();

verifier('Les saisies reviennent à l\'identique',
  repris.df_estimation_session === photo.df_estimation_session);
verifier('Le métré revient à l\'identique', repris.df_semelles_v3 === photo.df_semelles_v3);
verifier('Les projets enregistrés sont intacts', repris.df_projets === PROJETS_ENREGISTRES);

// Reprendre un brouillon plus court ne doit pas laisser traîner l'ancien.
const encombre = stockageDeTravail();
b.restaurerEtatLocal({ df_estimation_session: JSON.stringify({ country: 'gabon' }) }, encombre);
const propre = encombre.tout();
verifier('Reprendre efface d\'abord : aucun reste du projet précédent',
  propre.df_semelles_v3 === undefined && propre.df_parametresProjet_v3 === undefined);
verifier('Et le brouillon repris est bien en place',
  JSON.parse(propre.df_estimation_session).country === 'gabon');
verifier('Même là, les projets enregistrés survivent', propre.df_projets === PROJETS_ENREGISTRES);

// ─── D. Quand faut-il poser la question ? ───────────────────────────────────
console.log('\n=== D. NE RIEN DEMANDER QUAND IL N\'Y A RIEN ===');
verifier('Un brouillon absent est vide', b.brouillonEstVide(null));
verifier('Un brouillon sans clé est vide', b.brouillonEstVide({}));

// Ouvrir l'application crée déjà ces clés sans que personne n'ait rien saisi.
const jamaisTouche = {
  df_niveaux_v3: JSON.stringify([{ id: 'terrassement' }, { id: 'fondation' }]),
  df_taux_v3: JSON.stringify({ tva: 19.25 }),
  df_bibliothequePrix_v3: JSON.stringify({ ciment: '5500' }),
  df_labelsPrix_v3: JSON.stringify({ ciment: 'Ciment' }),
  df_parametresProjet_v3: JSON.stringify({ reference: '', maitreOuvrage: '', localisation: '' }),
  df_semelles_v3: '[]',
};
verifier('Une application ouverte mais jamais utilisée ne déclenche rien',
  b.brouillonEstVide(jamaisTouche) === true);

verifier('Un pays choisi compte comme un début de travail',
  b.brouillonEstVide({ df_estimation_session: JSON.stringify({ country: 'cameroun' }) }) === false);
verifier('Une seule ligne de métré compte',
  b.brouillonEstVide({ ...jamaisTouche, df_semelles_v3: JSON.stringify([{ id: 1 }]) }) === false);
verifier('Une référence de devis compte',
  b.brouillonEstVide({ df_parametresProjet_v3: JSON.stringify({ reference: 'DF-2026-014' }) }) === false);
verifier('Une clé illisible ne fait pas croire à du travail',
  b.brouillonEstVide({ ...jamaisTouche, df_casse_v3: '{{{' }) === true);

// ─── E. Ce que l'utilisateur lit avant de choisir ───────────────────────────
console.log('\n=== E. LE RESUME AFFICHE ===');
const resume = b.resumerBrouillon(photo);
console.log(`  « ${resume} »`);
verifier('Le résumé reprend la référence du devis', /DF-2026-014/.test(resume));
verifier('Et le client', /Nguema/.test(resume));
verifier('Un brouillon d\'estimation seule est décrit comme tel',
  b.resumerBrouillon({ df_estimation_session: JSON.stringify({ country: 'cameroun', nombreEtages: 3 }) })
    === 'Estimation en cours — R+3');
verifier('Un brouillon sans repère garde une phrase honnête',
  b.resumerBrouillon({}) === 'Projet en cours');

// ─── F. Les garanties du code livré ─────────────────────────────────────────
console.log('\n=== F. LES GARANTIES DU CODE LIVRE ===');
const hook = readFileSync(new URL('../src/hooks/useBrouillon.js', import.meta.url), 'utf8');
const dialogue = readFileSync(new URL('../src/components/projet/RepriseProjet.jsx', import.meta.url), 'utf8');
const gabarit = readFileSync(new URL('../src/components/layout/Layout.jsx', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../../../maj_brouillon.sql', import.meta.url), 'utf8');

verifier('Le brouillon part au moment où l\'onglet est quitté',
  /visibilitychange/.test(hook) && /pagehide/.test(hook));
verifier('Et régulièrement pendant le travail', /setInterval\(enregistrer/.test(hook));
verifier('Rien n\'est effacé sans que l\'utilisateur l\'ait demandé',
  /effacerEtatLocal\(\)/.test(hook)
  && hook.indexOf('effacerEtatLocal()') > hook.indexOf('const recommencer'));
verifier('La question n\'est posée qu\'une fois par session',
  /dejaRepondu\(\)/.test(hook) && /noterLaReponse\(\)/.test(hook));
verifier('La question est posée partout dans l\'espace connecté',
  /<RepriseProjet \/>/.test(gabarit));
verifier('Les deux réponses sont proposées',
  /Continuer ce projet/.test(dialogue) && /Commencer un nouveau projet/.test(dialogue));
verifier('Le dialogue prévient de ce qu\'il n\'efface pas',
  /ne sont pas touchés/.test(dialogue));

verifier('Un compte ne peut lire que son brouillon',
  /for select using \(auth\.uid\(\) = user_id\)/.test(sql));
verifier('Un compte ne peut pas écrire au nom d\'un autre',
  /for insert with check \(auth\.uid\(\) = user_id\)/.test(sql));
verifier('La mise à jour est protégée des deux côtés',
  /for update using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/.test(sql));
verifier('Un seul brouillon par compte', /user_id\s+uuid primary key/.test(sql));

console.log(`\n${ok ? '>>> TOUS LES TESTS PASSENT.' : '>>> DES TESTS ONT ECHOUE.'}`);
process.exitCode = ok ? 0 : 1;
