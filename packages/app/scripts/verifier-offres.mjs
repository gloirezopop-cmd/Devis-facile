/**
 * Vérification des formules, des droits et de la hiérarchie.
 *
 *   npm run verifier:offres      (depuis packages/app)
 *
 * Les formules testées sont celles que la base contient réellement — pas une
 * copie recopiée ici. C'est la base qui fait autorité : c'est elle que lit la
 * fonction serveur `droits_utilisateur`, et elle seule. La logique testée est
 * celle de src/utils/offres.js, celle qui tourne dans l'application.
 *
 * Si la base ne répond pas, la partie qui en dépend est annoncée comme non
 * vérifiée plutôt que déclarée bonne.
 */
import { existsSync, readFileSync } from 'node:fs';
import * as offres from '../src/utils/offres.js';

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

// ─── 0. Les formules réellement en base ─────────────────────────────────────
console.log('\n=== 0. LES FORMULES EN BASE ===');
process.env.VITE_SUPABASE_URL = lireEnv('VITE_SUPABASE_URL') ?? '';
process.env.VITE_SUPABASE_ANON_KEY = lireEnv('VITE_SUPABASE_ANON_KEY') ?? '';

let plans = [];
if (!process.env.VITE_SUPABASE_URL) {
  console.log('  .env.local introuvable — formules non vérifiées.');
  ok = false;
} else {
  const { supabase } = await import('../src/lib/supabaseClient.js');
  const { data, error } = await supabase
    .from('subscription_plans').select('*').eq('active', true).order('display_order');

  if (error) {
    console.log(`  Lecture impossible : ${error.message}`);
    console.log('  => Exécutez maj_formules.sql dans Supabase.');
    ok = false;
  } else {
    plans = data;
    for (const p of plans) {
      console.log(`  ${p.display_order}. ${p.name} — ${p.price} ${p.currency} ${offres.libellePeriode(p)}${p.recommended ? '  ★' : ''}`);
    }

    verifier('Trois formules actives', plans.length === 3);
    verifier('Les prix sont 3 500 / 5 500 / 50 000',
      plans.map((p) => Number(p.price)).join('/') === '3500/5500/50000');
    verifier('Calcul et Devis Complet sont mensuels, PRO est annuel',
      plans.map((p) => p.billing_type).join('/') === 'MONTHLY/MONTHLY/ANNUAL');
    verifier('Les mensuelles courent 30 jours, l\'annuelle 365',
      plans.map((p) => p.duration_days).join('/') === '30/30/365');
    verifier('Une seule formule est mise en avant', plans.filter((p) => p.recommended).length === 1);
    verifier('L\'ancienne formule « Résumé » a disparu', !plans.some((p) => p.slug === 'resume'));
    verifier('Chaque formule porte ses droits en base (pas dans le code)',
      plans.every((p) => p.entitlements && Object.keys(p.entitlements).length > 0));
    verifier('Chaque formule porte ses puces d\'affichage',
      plans.every((p) => (p.features || []).length >= 4));

    // Un visiteur non connecté ne doit rien pouvoir lire ni s'attribuer.
    const projets = await supabase.from('estimation_projects').select('*');
    const paiements = await supabase.from('payments').select('*');
    verifier('Aucun projet n\'est lisible sans être le sien', (projets.data?.length ?? 0) === 0);
    verifier('Aucun paiement n\'est lisible sans être le sien', (paiements.data?.length ?? 0) === 0);

    const fraude = await supabase.from('payments').insert({
      user_id: '00000000-0000-0000-0000-000000000000', amount: 0, status: 'SUCCESS',
    });
    verifier('Le navigateur ne peut PAS créer un paiement', !!fraude.error);
    const fraude2 = await supabase.from('subscriptions').insert({
      user_id: '00000000-0000-0000-0000-000000000000', plan_id: 'pro_annuel', status: 'ACTIVE',
    });
    verifier('Le navigateur ne peut PAS s\'accorder un abonnement', !!fraude2.error);
  }
}

// Sans formules lisibles, la suite ne mesurerait rien : on s'arrête ici.
if (plans.length !== 3) {
  console.log('\n>>> DES TESTS ONT ECHOUE (formules illisibles).');
  process.exit(1);
}

const [calcul, complet, pro] = plans;

// ─── A. La hiérarchie ───────────────────────────────────────────────────────
console.log('\n=== A. HIERARCHIE : PRO > DEVIS COMPLET > CALCUL > GRATUIT ===');
const manquements = offres.violationsDeHierarchie(plans);
for (const m of manquements.slice(0, 5)) {
  console.log(`  ${m.superieur} n'accorde pas « ${m.droit} », accordé par ${m.inferieur}`);
}
verifier('Chaque formule contient tous les droits de la précédente', manquements.length === 0);
verifier('Le rang suit l\'ordre d\'affichage',
  offres.rangDuPlan(calcul) < offres.rangDuPlan(complet) && offres.rangDuPlan(complet) < offres.rangDuPlan(pro));

// ─── B. Ce que chaque formule débloque ──────────────────────────────────────
console.log('\n=== B. CE QUE CHAQUE FORMULE DEBLOQUE ===');
const d = (p) => p.entitlements || {};

console.log(`  ${calcul.name} :`);
verifier('Calcul donne le budget', d(calcul).can_view_estimate === true);
verifier('Calcul donne les métrés et les calculs',
  d(calcul).can_use_metering === true && d(calcul).can_calculate === true);
verifier('Calcul donne la note de calcul', d(calcul).can_view_calculation_note === true);
verifier('Calcul donne le résumé', d(calcul).can_view_summary === true);
verifier('Calcul NE donne PAS les quantités estimatives', !d(calcul).can_view_estimated_quantities);
verifier('Calcul NE donne PAS le devis', !d(calcul).can_view_quote);
verifier('Calcul NE donne PAS le DQE', !d(calcul).can_view_dqe);
verifier('Calcul NE donne PAS l\'export du devis', !d(calcul).can_export_quote);
verifier('Calcul NE donne PAS les fonctionnalités PRO',
  !d(calcul).can_create_multiple_projects && !d(calcul).can_use_professional_calculators);

console.log(`  ${complet.name} :`);
verifier('Devis Complet donne les quantités estimatives', d(complet).can_view_estimated_quantities === true);
verifier('Devis Complet donne le devis et le DQE',
  d(complet).can_view_quote === true && d(complet).can_view_dqe === true);
verifier('Devis Complet donne l\'export de la note de calcul et du devis',
  d(complet).can_export_calculation_note === true && d(complet).can_export_quote === true);
verifier('Devis Complet donne l\'impression', d(complet).can_print === true);
verifier('Devis Complet NE donne PAS les fonctionnalités PRO',
  !d(complet).can_create_multiple_projects && !d(complet).can_use_professional_calculators);

console.log(`  ${pro.name} :`);
verifier('PRO donne les projets multiples', d(pro).can_create_multiple_projects === true);
verifier('PRO donne les outils professionnels', d(pro).can_use_professional_calculators === true);
verifier('PRO donne tous les exports',
  d(pro).can_export_quote === true && d(pro).can_export_calculation_note === true && d(pro).can_print === true);

// ─── C. Le compte gratuit ───────────────────────────────────────────────────
console.log('\n=== C. LE COMPTE GRATUIT ===');
const gratuit = offres.calculerDroits({ abonnements: [], plans });
verifier('Il peut créer un projet', gratuit.can_create_project === true);
verifier('Il peut faire son métré', gratuit.can_use_metering === true);
verifier('Il peut lancer les calculs', gratuit.can_calculate === true);
verifier('Il ne voit PAS le budget', gratuit.can_view_estimate === false);
verifier('Il ne voit PAS la note de calcul', gratuit.can_view_calculation_note === false);
verifier('Il ne voit PAS le résumé', gratuit.can_view_summary === false);
verifier('Il ne voit PAS le devis', gratuit.can_view_quote === false);
verifier('Il ne peut PAS exporter', gratuit.can_export_quote === false);
verifier('Il ne peut PAS imprimer', gratuit.can_print === false);
verifier('Son statut est FREE', offres.statutDuCompte([], plans) === 'FREE');

// ─── D. Un abonnement mensuel vaut pour tout le compte ──────────────────────
console.log('\n=== D. ABONNEMENT MENSUEL ===');
const dans20jours = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString();
const hier = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const abonneCalcul = [{ plan_id: calcul.id, project_id: null, status: 'ACTIVE', end_date: dans20jours }];

const droitsCalcul = offres.calculerDroits({ abonnements: abonneCalcul, plans, projectId: 'projet-a' });
const droitsCalculAilleurs = offres.calculerDroits({ abonnements: abonneCalcul, plans, projectId: 'projet-b' });
verifier('Le mensuel vaut sur TOUS les projets, pas sur un seul',
  droitsCalcul.can_view_estimate === true && droitsCalculAilleurs.can_view_estimate === true);
verifier('Il donne la note de calcul et le résumé',
  droitsCalcul.can_view_calculation_note && droitsCalcul.can_view_summary);
verifier('Il ne donne pas le devis', droitsCalcul.can_view_quote === false);
verifier('Statut CALCUL', offres.statutDuCompte(abonneCalcul, plans) === 'CALCUL');

const abonneComplet = [{ plan_id: complet.id, project_id: null, status: 'ACTIVE', end_date: dans20jours }];
const droitsComplet = offres.calculerDroits({ abonnements: abonneComplet, plans });
verifier('Le Devis Complet donne devis, DQE, exports et impression',
  droitsComplet.can_view_quote && droitsComplet.can_view_dqe
  && droitsComplet.can_export_quote && droitsComplet.can_print);
verifier('Il hérite bien de la note de calcul et du résumé',
  droitsComplet.can_view_calculation_note && droitsComplet.can_view_summary);
verifier('Il ne donne pas les projets multiples', droitsComplet.can_create_multiple_projects === false);

// ─── E. Abonnement annuel, et fin d'abonnement ──────────────────────────────
console.log('\n=== E. ABONNEMENT ANNUEL ET ECHEANCE ===');
const dans6mois = new Date(Date.now() + 182 * 24 * 3600 * 1000).toISOString();
const abonnePro = [{ plan_id: pro.id, project_id: null, status: 'ACTIVE', end_date: dans6mois }];
const droitsPro = offres.calculerDroits({ abonnements: abonnePro, plans, projectId: 'nimporte-quel-projet' });
verifier('Le PRO vaut partout', droitsPro.can_view_estimate && droitsPro.can_export_quote);
verifier('Le PRO donne les projets multiples', droitsPro.can_create_multiple_projects === true);
verifier('Statut PRO_ANNUEL', offres.statutDuCompte(abonnePro, plans) === 'PRO_ANNUEL');

const echu = [{ plan_id: complet.id, project_id: null, status: 'ACTIVE', end_date: hier }];
const droitsEchu = offres.calculerDroits({ abonnements: echu, plans });
verifier('Un abonnement échu ne donne plus accès au devis', droitsEchu.can_view_quote === false);
verifier('Mais le compte peut toujours créer, métrer et calculer — rien n\'est supprimé',
  droitsEchu.can_create_project && droitsEchu.can_use_metering && droitsEchu.can_calculate);
verifier('Statut EXPIRED', offres.statutDuCompte(echu, plans) === 'EXPIRED');

// ─── F. Le contrôle d'accès des écrans ──────────────────────────────────────
console.log('\n=== F. CHAQUE ECRAN PROTEGE SAIT CE QU\'IL EXIGE ===');
const attendus = {
  NOTE_CALCUL: 'can_view_calculation_note',
  RESUME: 'can_view_summary',
  DEVIS: 'can_view_quote',
  DQE: 'can_view_dqe',
  EXPORT: 'can_export_quote',
  EXPORT_NOTE: 'can_export_calculation_note',
  IMPRESSION: 'can_print',
  ESTIMATEUR: 'can_view_estimate',
};
for (const [source, droit] of Object.entries(attendus)) {
  verifier(`${source} exige ${droit}`, offres.DROIT_PAR_SOURCE[source] === droit);
}
verifier('Tout droit exigé par un écran existe dans la liste des droits',
  Object.values(offres.DROIT_PAR_SOURCE).every((dr) => offres.DROITS.includes(dr)));
verifier('Tout droit accordé par une formule est un droit connu',
  plans.every((p) => Object.keys(p.entitlements || {}).every((dr) => offres.DROITS.includes(dr))));

console.log('\n  La formule proposée par chaque verrou :');
for (const [source, droit] of Object.entries(attendus)) {
  const p = offres.planQuiDebloque(plans, droit);
  console.log(`  ${source.padEnd(12)} → ${p?.name}`);
}
verifier('Le verrou de la note de calcul propose la formule la moins chère qui l\'accorde',
  offres.planQuiDebloque(plans, 'can_view_calculation_note')?.id === calcul.id);
verifier('Le verrou du devis propose le Devis Complet, pas le PRO',
  offres.planQuiDebloque(plans, 'can_view_quote')?.id === complet.id);
verifier('Le verrou des projets multiples propose le PRO',
  offres.planQuiDebloque(plans, 'can_create_multiple_projects')?.id === pro.id);

// ─── G. Recommandation et montée en gamme ───────────────────────────────────
console.log('\n=== G. RECOMMANDATION ET MONTEE EN GAMME ===');
const depuisEstimateur = offres.getRecommendedOffer({ plans, abonnements: [], source: 'ESTIMATEUR' });
console.log(`  Depuis l'estimateur : ${depuisEstimateur.recommended_plan?.name}`);
verifier('Les trois formules restent proposées', depuisEstimateur.available_plans.length === 3);
verifier('Le besoin détecté est « voir le budget »', depuisEstimateur.besoin === 'can_view_estimate');
verifier('Le besoin n\'est pas encore satisfait', depuisEstimateur.deja_satisfait === false);
verifier('Aucune montée en gamme proposée à qui n\'a rien souscrit',
  depuisEstimateur.upgrade_options.length === 0);

const depuisNote = offres.getRecommendedOffer({ plans, abonnements: [], source: 'NOTE_CALCUL' });
verifier('Pour la note de calcul, la formule Calcul suffit et c\'est elle qui répond',
  depuisNote.available_plans.some((p) => p.id === calcul.id)
  && offres.planQuiDebloque(plans, depuisNote.besoin)?.id === calcul.id);

const depuisExport = offres.getRecommendedOffer({ plans, abonnements: [], source: 'EXPORT' });
verifier('Depuis l\'export, la formule Calcul n\'est pas la réponse (elle n\'exporte pas)',
  offres.planQuiDebloque(plans, depuisExport.besoin)?.id !== calcul.id);

const surCalcul = offres.getRecommendedOffer({ plans, abonnements: abonneCalcul, source: 'DEVIS' });
const versComplet = surCalcul.upgrade_options.find((u) => u.plan.id === complet.id);
const versPro = surCalcul.upgrade_options.find((u) => u.plan.id === pro.id);
console.log(`  Calcul → Devis Complet : ${versComplet?.supplement} FCFA de plus par mois`);
console.log(`  Calcul → PRO : même période ? ${versPro?.memePeriode}`);
verifier('La formule en cours est bien identifiée', surCalcul.current_plan?.id === calcul.id);
verifier('Passer au Devis Complet coûte 2 000 FCFA de plus par mois',
  versComplet?.memePeriode === true && versComplet?.supplement === 2000);
verifier('Vers le PRO, aucune différence n\'est annoncée : ce n\'est pas la même période',
  versPro?.memePeriode === false && versPro?.supplement === null);
verifier('On ne propose jamais de redescendre',
  surCalcul.upgrade_options.every((u) => offres.rangDuPlan(u.plan) > offres.rangDuPlan(calcul)));

const dejaPro = offres.getRecommendedOffer({ plans, abonnements: abonnePro, source: 'ESTIMATEUR' });
verifier('Un abonné PRO n\'a plus rien à débloquer', dejaPro.deja_satisfait === true);
verifier('Et plus aucune montée en gamme ne lui est proposée', dejaPro.upgrade_options.length === 0);

// ─── H. Libellés de période ─────────────────────────────────────────────────
console.log('\n=== H. LIBELLES ===');
verifier('Une formule mensuelle s\'affiche « par mois »', offres.libellePeriode(calcul) === 'par mois');
verifier('Une formule annuelle s\'affiche « par an »', offres.libellePeriode(pro) === 'par an');
verifier('Équivalent mensuel du PRO ≈ 4 167 FCFA', offres.equivalentMensuel(pro) === 4167);
verifier('Aucun équivalent mensuel affiché pour une formule déjà mensuelle',
  offres.equivalentMensuel(calcul) === null);

const eco = offres.economieAnnuelle(pro, plans);
console.log(`  ${pro.name} : ${eco?.surUnAn} FCFA par an en ${eco?.reference.name} mensuel, soit ${eco?.economie} d'économie`);
verifier('La référence de comparaison est la mensuelle la plus complète',
  eco?.reference.id === complet.id);
verifier('12 mois de Devis Complet font 66 000 FCFA', eco?.surUnAn === 66000);
verifier('Le PRO fait économiser 16 000 FCFA par an', eco?.economie === 16000);
verifier('Aucune économie annoncée sur une formule mensuelle',
  offres.economieAnnuelle(calcul, plans) === null);

// ─── I. La progression de l'étude ───────────────────────────────────────────
console.log('\n=== I. LA PROGRESSION DE L\'ETUDE ===');
const chemin = offres.ETAPES_ETUDE.map((e) => e.label).join(' → ');
console.log(`  ${chemin}`);
verifier('Le chemin va des dimensions à l\'export',
  chemin === 'Dimensions → Calcul → Note de calcul → Résumé → Quantités → Devis → DQE → Export');
verifier('Chaque étape verrouillable pointe vers un droit connu',
  offres.ETAPES_ETUDE.every((e) => e.droit === null || offres.DROITS.includes(e.droit)));

const cheminGratuit = offres.avancementDeLEtude(offres.calculerDroits({ abonnements: [], plans }));
console.log(`  Gratuit : ${cheminGratuit.filter((e) => e.acquise).length} étapes sur ${cheminGratuit.length}`);
verifier('Un compte gratuit a franchi les dimensions et le calcul, rien de plus',
  cheminGratuit.filter((e) => e.acquise).map((e) => e.id).join('|') === 'dimensions|calculs');

const cheminCalcul = offres.avancementDeLEtude(offres.calculerDroits({ abonnements: abonneCalcul, plans }));
verifier('Avec Calcul, la note de calcul et le résumé s\'ouvrent',
  cheminCalcul.find((e) => e.id === 'note_calcul').acquise
  && cheminCalcul.find((e) => e.id === 'resume').acquise);
verifier('Mais le devis reste fermé', cheminCalcul.find((e) => e.id === 'devis').acquise === false);

const cheminPro = offres.avancementDeLEtude(offres.calculerDroits({ abonnements: abonnePro, plans }));
verifier('Avec le PRO, tout le chemin est franchi', cheminPro.every((e) => e.acquise));

// ─── J. L'écran des formules ────────────────────────────────────────────────
console.log('\n=== J. L\'ECRAN DES FORMULES ===');
const lire = (chemin_) => readFileSync(new URL(chemin_, import.meta.url), 'utf8');
const sansCommentaires = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const paywall = lire('../src/components/offres/Paywall.jsx');
const carte = lire('../src/components/offres/CarteFormule.jsx');
const progression = lire('../src/components/offres/ProgressionEtude.jsx');

verifier('Le titre est « Votre étude est prête. »', /Votre étude est prête\./.test(paywall));
verifier('L\'ancien titre « estimation de construction » a disparu',
  !/estimation de construction est prête/.test(paywall));
verifier('La progression est affichée au-dessus des formules',
  paywall.indexOf('<ProgressionEtude') !== -1
  && paywall.indexOf('<ProgressionEtude') < paywall.indexOf('<CarteFormule'));
verifier('Une carte par ligne sur mobile', /grid-cols-1/.test(paywall));
verifier('Trois colonnes seulement à partir de xl',
  /xl:grid-cols-3/.test(paywall) && !/\blg:grid-cols-3/.test(paywall));
verifier('Les cartes ont la même hauteur', /items-stretch/.test(paywall) && /h-full/.test(carte));
verifier('Le bouton reste collé en bas de chaque carte', /mt-auto/.test(carte));

for (const [nom, src] of [['Paywall', paywall], ['CarteFormule', carte], ['ProgressionEtude', progression]]) {
  verifier(`${nom} ne contient aucun montant en dur`, !/\b(3500|5500|50000|66000|16000)\b/.test(sansCommentaires(src)));
  verifier(`${nom} ne contient aucune fausse rareté`,
    !/plus que \d|derni[eè]re? chance|offre limitée|il ne reste plus que \d/i.test(sansCommentaires(src)));
}
verifier('Aucun nom de formule écrit en dur dans les cartes',
  !/'Calcul'|'Devis Complet'|'Devis Facile PRO'/.test(carte));
verifier('Le bouton a un état de focus visible', /focus-visible:ring/.test(carte));
verifier('L\'économie annuelle compare à un prix réellement proposé',
  /economieAnnuelle/.test(carte) && /reference\.name/.test(carte));

const pageAssistant = lire('../src/pages/EstimationBudget.jsx');
verifier('L\'écran de résultat n\'est plus enfermé dans la colonne étroite',
  /surResultat \? 'max-w-6xl' : 'max-w-3xl'/.test(pageAssistant));

// ─── K. Aucun prix ni règle de formule dans le code ─────────────────────────
console.log('\n=== K. AUCUN PRIX NI REGLE DE FORMULE DANS LE CODE ===');
const codeMoteur = readFileSync(new URL('../src/utils/offres.js', import.meta.url), 'utf8');
verifier('Aucun montant en dur dans le moteur', !/\b(3500|5500|50000)\b/.test(codeMoteur));
verifier('Aucun identifiant de formule en dur',
  (codeMoteur.match(/'calcul'|'devis_complet'|'pro_annuel'/g) || []).length === 0);

const verrou = readFileSync(new URL('../src/components/offres/EcranVerrou.jsx', import.meta.url), 'utf8');
// Les commentaires expliquent la règle et citent donc les tournures
// interdites. C'est le texte affiché qu'il faut inspecter, pas la prose qui
// dit pourquoi on ne l'écrit pas.
const verrouSansCommentaires = verrou.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
verifier('L\'écran de verrouillage ne contient aucun montant',
  !/\b(3500|5500|50000)\b/.test(verrouSansCommentaires));
verifier('L\'écran de verrouillage promet que rien n\'est supprimé',
  /conserv/i.test(verrouSansCommentaires));
verifier('Aucune fausse rareté dans l\'écran de verrouillage',
  !/plus que \d|derni[eè]re? chance|offre limitée|il ne reste plus/i.test(verrouSansCommentaires));

// ─── L. Les écrans protégés sont réellement branchés ────────────────────────
console.log('\n=== L. LES ECRANS PROTEGES SONT BRANCHES ===');
const parcoursMetre = readFileSync(new URL('../src/pages/Metre.jsx', import.meta.url), 'utf8');
verifier('La note de calcul est protégée', /source="NOTE_CALCUL"/.test(parcoursMetre));
verifier('Le résumé est protégé', /source="RESUME"/.test(parcoursMetre));
verifier('Le devis est protégé', /source="DEVIS"/.test(parcoursMetre));
verifier('Le métré reste ouvert à tous',
  /\{etape === 2 && <EtapeMetre \/>\}/.test(parcoursMetre));

const ecranResume = readFileSync(new URL('../src/components/metre/EtapeResume.jsx', import.meta.url), 'utf8');
verifier('L\'export du résumé dépend du droit d\'exporter la note de calcul',
  /can_export_calculation_note/.test(ecranResume));

// ─── M. Chariow est raccordé, mais rien de sensible ne fuit vers le navigateur ──
//
// L'opérateur choisi est Chariow (voir CHARIOW_INTEGRATION_SPEC.md). Le test
// ne vérifie plus qu'aucun opérateur n'existe : il vérifie que la manière
// dont il est raccordé reste saine — aucun secret côté client, aucun lien de
// checkout statique (qui ne dirait pas qui paie), et la décision reste
// toujours prise par le serveur, jamais par la page de retour.
console.log('\n=== M. CHARIOW EST RACCORDÉ SANS RIEN EXPOSER CÔTÉ NAVIGATEUR ===');
const fichiersOffres = [
  ['Paywall', paywall],
  ['CarteFormule', carte],
  ['EcranVerrou', verrou],
  ['ProgressionEtude', progression],
];
for (const [nom, src] of fichiersOffres) {
  verifier(`${nom} ne contient aucune clé ni aucun secret d'API`,
    !/API_KEY|API_SECRET|SECRET_KEY|sk_live|sk_test|whsec_/.test(sansCommentaires(src)));
  verifier(`${nom} ne contient aucun lien de checkout statique`,
    !/mychariow\.shop|paiement\.chariow\.com\/\w/.test(sansCommentaires(src)));
}
verifier('Le paywall démarre le paiement via la fonction serveur, pas un lien direct',
  /supabase\.functions\.invoke\(\s*['"]chariow-checkout['"]/.test(paywall));
verifier('Aucun module client de paiement ne subsiste', !existsSync(new URL('../src/lib/paiementApi.js', import.meta.url)));

const pageSucces = readFileSync(new URL('../src/pages/PaiementSucces.jsx', import.meta.url), 'utf8');
verifier('La page de retour de paiement n\'accorde aucun droit',
  !/valider_paiement|grant|unlock/i.test(pageSucces) && /useDroits/.test(pageSucces));

// ─── N. La fonction webhook vérifie réellement la signature ─────────────────
//
// Contrôles statiques du code de la fonction serveur, dans l'esprit des
// « erreurs à ne pas commettre » de CHARIOW_INTEGRATION_SPEC.md §6. Ils ne
// remplacent pas un vrai test d'intégration (aucun runtime Deno ici), mais
// empêchent une régression évidente de passer inaperçue.
console.log('\n=== N. LA FONCTION WEBHOOK CHARIOW VÉRIFIE SA SIGNATURE ===');
const webhookPath = new URL('../../../supabase/functions/chariow-webhook/index.ts', import.meta.url);
if (!existsSync(webhookPath)) {
  console.log('  supabase/functions/chariow-webhook introuvable — non vérifié.');
  ok = false;
} else {
  const webhook = readFileSync(webhookPath, 'utf8');
  const partage = readFileSync(
    new URL('../../../supabase/functions/_shared/chariow.ts', import.meta.url), 'utf8',
  );
  verifier('Le corps brut est lu avant tout parsing JSON',
    /req\.text\(\)/.test(webhook) && webhook.indexOf('req.text()') < webhook.indexOf('JSON.parse'));
  verifier('La signature est lue depuis x-chariow-signature', /x-chariow-signature/.test(webhook));
  verifier('La comparaison n\'utilise pas === sur la signature',
    !/signatureRecue\s*===|===\s*signatureRecue/.test(webhook));
  verifier('CHARIOW_PULSE_SECRET sert de clé HMAC, pas CHARIOW_API_KEY',
    /hmacHexSha256\(secret/.test(webhook) && /CHARIOW_PULSE_SECRET/.test(webhook)
    && !/hmacHexSha256\(\s*Deno\.env\.get\(['"]CHARIOW_API_KEY['"]\)/.test(webhook));
  verifier('La déduplication porte sur x-pulse-delivery-id',
    /x-pulse-delivery-id/.test(webhook) && /webhook_deliveries/.test(webhook));
  verifier('Le montant et la devise de la vente sont vérifiés avant activation',
    /sale\.amount/.test(partage + webhook) && /plan\.price/.test(partage)
    && /plan\.currency/.test(partage));
}

console.log(`\n${ok ? '>>> TOUS LES TESTS PASSENT.' : '>>> DES TESTS ONT ECHOUE.'}`);
process.exitCode = ok ? 0 : 1;
