/**
 * Vérification des données de référence et du verrouillage.
 *
 *   npm run verifier:estimation      (depuis packages/app)
 *
 * Deux parties :
 *   A. Ce que la base laisse réellement sortir. Les listes de référence
 *      doivent être lisibles — l'assistant en a besoin dès la première étape.
 *      Les tarifs, eux, ne doivent PLUS l'être : le calcul appartient au
 *      serveur, et un prix au m² ne doit jamais atteindre un navigateur.
 *   B. Les données livrées dans schema_estimation.sql, lues depuis le fichier
 *      lui-même pour que le test échoue s'il ne contient plus ce qu'il faut.
 *
 * Le modèle de calcul est vérifié à part : npm run verifier:calcul
 */
import { readFileSync } from 'node:fs';

let ok = true;
function verifier(label, condition) {
  console.log(`${condition ? '  OK   ' : '  ECHEC'} — ${label}`);
  if (!condition) ok = false;
}

function lireEnv(cle) {
  try {
    const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    return env.split('\n').find((l) => l.startsWith(`${cle}=`))?.slice(cle.length + 1).trim() || null;
  } catch {
    return null;
  }
}

// ─── A. Ce que la base laisse sortir ────────────────────────────────────────
console.log('\n=== A. LECTURE REELLE DE LA BASE ===');
process.env.VITE_SUPABASE_URL = lireEnv('VITE_SUPABASE_URL') ?? '';
process.env.VITE_SUPABASE_ANON_KEY = lireEnv('VITE_SUPABASE_ANON_KEY') ?? '';

if (!process.env.VITE_SUPABASE_URL) {
  console.log('  .env.local introuvable — état de la base non vérifié.');
} else {
  // On appelle les VRAIES fonctions de l'application, pas une copie de leurs
  // requêtes : une copie qui dérive finit par tester autre chose que le code livré.
  const api = await import('../src/lib/estimationApi.js');
  const { supabase } = await import('../src/lib/supabaseClient.js');

  const [pays, villes, types, standings, toitures] = await Promise.all([
    api.fetchCountries(), api.fetchLocations('cameroun'), api.fetchBuildingTypes(),
    api.fetchStandings(), api.fetchRoofTypes(),
  ]);

  console.log(`  ${pays.length} pays, ${villes.length} villes au Cameroun, ${types.length} types,`);
  console.log(`  ${standings.length} standings actifs, ${toitures.length} toitures.`);

  verifier('Toute l\'Afrique est couverte (au moins 50 pays)', pays.length >= 50);
  verifier('Les villes du Cameroun sont lisibles', villes.length >= 6);
  verifier('Le tri d\'affichage fonctionne (Bafoussam en premier)', villes[0]?.name === 'Bafoussam');
  verifier('Les 8 types de construction sont lisibles', types.length === 8);
  verifier('Les 5 toitures sont lisibles', toitures.length === 5);

  console.log(`  Standings : ${standings.map((s) => s.name).join(', ')}`);
  verifier('Quatre niveaux de standing', standings.length === 4);
  verifier('« Luxe » est le dernier niveau', standings[standings.length - 1]?.name === 'Luxe');
  verifier('« Standard » n\'apparaît plus', !standings.some((s) => s.name === 'Standard'));

  // Aucun pays ne doit conduire à une étape 2 vide.
  const toutesLesVilles = await api.fetchToutesLesLocalisations();
  const sansVille = pays.filter((p) => !toutesLesVilles.some((v) => v.country_id === p.id));
  if (sansVille.length) console.log(`  Pays sans localisation : ${sansVille.map((p) => p.name).join(', ')}`);
  verifier('Chaque pays a au moins une localisation', sansVille.length === 0);
  verifier('Chaque pays propose « Autre localisation »',
    pays.every((p) => toutesLesVilles.some((v) => v.country_id === p.id && v.name.toLowerCase().includes('autre'))));

  const devises = new Set(pays.map((p) => p.currency_code));
  console.log(`  ${devises.size} devises distinctes sur ${pays.length} pays.`);
  verifier('Une devise propre à chaque zone', devises.size > 10);
  verifier('Le Sénégal est en XOF', pays.find((p) => p.id === 'senegal')?.currency_code === 'XOF');
  verifier('Le Nigéria est en NGN', pays.find((p) => p.id === 'nigeria')?.currency_code === 'NGN');
  verifier('Le Maroc est en MAD', pays.find((p) => p.id === 'maroc')?.currency_code === 'MAD');

  console.log('\n  — Le verrouillage —');
  const tarifs = await supabase.from('construction_rates').select('*');
  verifier('AUCUN tarif ne sort de la base pour un compte ordinaire',
    (tarifs.data?.length ?? 0) === 0);

  const rpc = await supabase.rpc('estimer_projet', { p_project_id: '00000000-0000-0000-0000-000000000000' });
  verifier('La fonction d\'estimation refuse un appel sans compte', !!rpc.error);

  const profils = await supabase.from('profiles').select('*');
  verifier('Les profils ne sont pas lisibles publiquement', (profils.data?.length ?? 0) === 0);

  // Une mise à jour qui ne trouve aucune ligne ne renvoie pas d'erreur : on ne
  // peut donc rien conclure d'un `update`. L'insertion, elle, est bien refusée
  // par la politique — c'est un test qui mesure vraiment quelque chose.
  const fraude = await supabase.from('estimation_projects')
    .insert({ user_id: '00000000-0000-0000-0000-000000000000', status: 'UNLOCKED' });
  verifier('Un projet ne peut pas être créé au nom de quelqu\'un d\'autre', !!fraude.error);

  const lecture = await supabase.from('estimation_projects').select('*');
  verifier('Aucun projet d\'autrui n\'est lisible', (lecture.data?.length ?? 0) === 0);

  // Le droit d'écrire `status` et `unlocked_plan_id` a été retiré au niveau de
  // la colonne pour le rôle `authenticated`. Cela ne se vérifie qu'avec une
  // session ouverte : ce script travaille sans compte et ne peut pas le
  // mesurer ici. C'est PostgreSQL qui l'applique, pas l'application.
}

// ─── B. Les données livrées dans le SQL ─────────────────────────────────────
const sql = readFileSync(new URL('../../../schema_estimation.sql', import.meta.url), 'utf8');

function decouperTuple(texte) {
  const valeurs = [];
  let courant = '';
  let dansChaine = false;
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i];
    if (dansChaine) {
      if (c === "'" && texte[i + 1] === "'") { courant += "'"; i += 1; }
      else if (c === "'") dansChaine = false;
      else courant += c;
    } else if (c === "'") dansChaine = true;
    else if (c === ',') { valeurs.push(courant.trim()); courant = ''; }
    else courant += c;
  }
  valeurs.push(courant.trim());
  return valeurs.map((v) => {
    if (v === 'null') return null;
    if (v === 'true') return true;
    if (v === 'false') return false;
    return /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
  });
}

/**
 * Groupes « ( … ) » de premier niveau. Une expression régulière ne suffit pas :
 * un nom peut contenir des parenthèses (« Congo (RDC) ») ou une apostrophe
 * échappée (« Côte d''Ivoire »). On lit donc caractère par caractère.
 */
function extraireGroupes(texte) {
  const groupes = [];
  let profondeur = 0;
  let debut = 0;
  let dansChaine = false;
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i];
    if (dansChaine) {
      if (c === "'" && texte[i + 1] === "'") i += 1;
      else if (c === "'") dansChaine = false;
    } else if (c === "'") dansChaine = true;
    else if (c === '(') { if (profondeur === 0) debut = i + 1; profondeur += 1; }
    else if (c === ')') {
      profondeur -= 1;
      if (profondeur === 0) groupes.push(texte.slice(debut, i));
    }
  }
  return groupes;
}

function lireInsert(table) {
  const debut = sql.indexOf(`insert into public.${table}`);
  if (debut === -1) return [];
  let bloc = sql.slice(debut, sql.indexOf(';', debut));
  // Les commentaires « -- … » ne sont pas des données, et leurs apostrophes
  // (« d'Afrique ») désynchroniseraient la lecture des chaînes SQL.
  bloc = bloc.replace(/--[^\n]*/g, '');
  const conflit = bloc.toLowerCase().indexOf('on conflict');
  if (conflit !== -1) bloc = bloc.slice(0, conflit);
  const colonnes = bloc.slice(bloc.indexOf('(') + 1, bloc.indexOf(')')).split(',').map((c) => c.trim().replace(/"/g, ''));
  const partieValues = bloc.slice(bloc.toLowerCase().lastIndexOf('values') + 6);
  return extraireGroupes(partieValues).map((groupe) => {
    const valeurs = decouperTuple(groupe);
    const ligne = { active: true };
    colonnes.forEach((col, i) => { ligne[col] = valeurs[i]; });
    return ligne;
  });
}

const countries = lireInsert('estimation_countries');
const locations = lireInsert('estimation_locations');

console.log('\n=== B. DONNEES LIVREES DANS schema_estimation.sql ===');
console.log(`  ${countries.length} pays, ${locations.length} localisations.`);

const paysAttendus = ['Cameroun', 'Sénégal', "Côte d'Ivoire", 'Bénin', 'Burkina Faso', 'Togo', 'Gabon',
  'Congo (Brazzaville)', 'Niger', 'Nigéria', 'Maroc', 'Kenya', 'Afrique du Sud', 'Égypte'];
verifier('Les pays prioritaires sont présents', paysAttendus.every((p) => countries.some((c) => c.name === p)));
verifier('Au moins 50 pays sont livrés', countries.length >= 50);
verifier('Chaque pays livré a au moins une localisation',
  countries.every((c) => locations.some((l) => l.country_id === c.id)));
verifier('Chaque pays livré propose « Autre localisation »',
  countries.every((c) => locations.some((l) => l.country_id === c.id && l.name.toLowerCase().includes('autre'))));
verifier('Chaque localisation pointe vers un pays existant',
  locations.every((l) => countries.some((c) => c.id === l.country_id)));

console.log(`\n${ok ? '>>> TOUS LES TESTS PASSENT.' : '>>> DES TESTS ONT ECHOUE.'}`);
process.exitCode = ok ? 0 : 1;
