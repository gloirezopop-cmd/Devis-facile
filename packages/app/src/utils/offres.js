/**
 * Moteur de droits et de formules.
 *
 * Rien ici ne connaît un prix, un nom de formule ou une durée : tout vient de
 * la table `subscription_plans`. Une règle du type « si formule = calcul alors
 * afficher le budget » serait un tarif codé en dur déguisé — le jour où
 * l'administrateur change ce que débloque une formule, le code ne suivrait
 * pas. Les droits accordés sont donc lus dans `plan.entitlements`.
 *
 * LA HIÉRARCHIE
 *
 *     PRO_ANNUEL  >  DEVIS_COMPLET  >  CALCUL  >  GRATUIT
 *
 * Elle n'est pas écrite ici non plus. Le rang d'une formule est son
 * `display_order`, et l'héritage est porté par les données : les droits d'une
 * formule contiennent ceux de la formule d'en dessous. `violationsDeHierarchie`
 * permet de le vérifier au lieu de l'espérer.
 *
 * Aucun appel réseau, aucun effet de bord : ce fichier se teste seul.
 */

/**
 * Les droits reconnus. Tout droit absent vaut « non accordé » : une formule
 * qui ne mentionne pas un droit ne l'accorde pas, il n'y a pas d'implicite.
 */
export const DROITS = [
  // Ce que tout le monde peut faire, y compris sans payer.
  'can_create_project',
  'can_calculate',
  'can_use_metering',
  // Voir le fruit de ce travail.
  'can_view_estimate',
  'can_view_calculation_note',
  'can_view_summary',
  // Passer du métré au devis.
  'can_view_estimated_quantities',
  'can_view_quote',
  'can_view_dqe',
  'can_export_calculation_note',
  'can_export_quote',
  'can_print',
  // Le professionnel qui enchaîne les chantiers.
  'can_create_multiple_projects',
  'can_use_professional_calculators',
];

/**
 * Ce qu'un compte gratuit peut faire sans rien avoir payé : créer un projet,
 * faire son métré, lancer les calculs et obtenir un résultat. Ce qu'il ne peut
 * pas : voir ce résultat.
 *
 * Le gratuit n'est pas une version amputée, c'est la démonstration que l'outil
 * a réellement travaillé sur son projet.
 */
export const DROITS_GRATUITS = {
  can_create_project: true,
  can_calculate: true,
  can_use_metering: true,
};

function droitsVides() {
  return Object.fromEntries(DROITS.map((d) => [d, false]));
}

/** Rang d'une formule dans la hiérarchie : son ordre d'affichage. */
export function rangDuPlan(plan) {
  return Number(plan?.display_order ?? 0);
}

/**
 * Les manquements à la hiérarchie : une formule supérieure qui n'accorderait
 * pas un droit accordé par une formule inférieure. La liste doit rester vide.
 * C'est la traduction vérifiable de « un niveau supérieur hérite du niveau
 * inférieur ».
 */
export function violationsDeHierarchie(plans = []) {
  const actifs = plans.filter((p) => p.active !== false);
  const manquements = [];
  for (const bas of actifs) {
    for (const haut of actifs) {
      if (rangDuPlan(haut) <= rangDuPlan(bas)) continue;
      for (const [droit, accorde] of Object.entries(bas.entitlements || {})) {
        if (accorde && !haut.entitlements?.[droit]) {
          manquements.push({ inferieur: bas.slug, superieur: haut.slug, droit });
        }
      }
    }
  }
  return manquements;
}

/** true si l'abonnement est actif à la date donnée. */
export function abonnementEstActif(abonnement, maintenant = new Date()) {
  if (!abonnement || abonnement.status !== 'ACTIVE') return false;
  if (!abonnement.end_date) return true; // sans échéance : actif tant qu'il est ACTIVE
  return new Date(abonnement.end_date) > maintenant;
}

/**
 * Statut global du compte.
 *
 * `FREE` tant que rien n'a été souscrit, `EXPIRED` lorsqu'une formule a couru
 * puis s'est arrêtée, sinon le `slug` de la formule active la plus haute. Le
 * statut n'est donc jamais une liste de cas écrite dans le code : il suit ce
 * que la base contient.
 */
export function statutDuCompte(abonnements = [], plans = [], maintenant = new Date()) {
  const planDe = (id) => plans.find((p) => p.id === id);
  const actifs = abonnements.filter((a) => abonnementEstActif(a, maintenant));

  if (actifs.length === 0) {
    return abonnements.length > 0 ? 'EXPIRED' : 'FREE';
  }

  const meilleur = actifs
    .map((a) => planDe(a.plan_id))
    .filter(Boolean)
    .reduce((haut, p) => (rangDuPlan(p) > rangDuPlan(haut) ? p : haut), null);

  return meilleur ? String(meilleur.slug).toUpperCase() : 'FREE';
}

/**
 * Droits effectifs d'un utilisateur, éventuellement pour un projet précis.
 *
 * Un abonnement rattaché à un projet ne vaut que pour celui-là ; les formules
 * mensuelles et annuelles n'en portent aucun et valent donc pour le compte
 * entier. Les droits s'additionnent : un compte qui cumulerait deux formules
 * obtient l'union, jamais l'intersection.
 */
export function calculerDroits({
  abonnements = [], plans = [], projectId = null, maintenant = new Date(), estAdmin = false,
} = {}) {
  const droits = { ...droitsVides(), ...DROITS_GRATUITS };
  const planDe = (id) => plans.find((p) => p.id === id);

  // Un administrateur reçoit l'union de tous les droits que les formules
  // existantes savent accorder — sans abonnement, sans paiement simulé. La
  // liste n'est pas écrite ici : une formule qui gagnera un droit demain le
  // lui accordera aussi. C'est le miroir exact de `droits_utilisateur()` en
  // base, qui reste la seule autorité ; ceci n'ouvre que l'interface.
  if (estAdmin) {
    for (const plan of plans) {
      for (const [droit, accorde] of Object.entries(plan.entitlements || {})) {
        if (accorde) droits[droit] = true;
      }
    }
    return droits;
  }

  for (const abonnement of abonnements) {
    if (!abonnementEstActif(abonnement, maintenant)) continue;
    const plan = planDe(abonnement.plan_id);
    if (!plan) continue;

    // Un abonnement rattaché à un autre projet n'accorde rien ici.
    if (abonnement.project_id && abonnement.project_id !== projectId) continue;

    for (const [droit, accorde] of Object.entries(plan.entitlements || {})) {
      if (accorde) droits[droit] = true;
    }
  }

  return droits;
}

/**
 * Le droit qu'exige chaque endroit protégé de l'application. C'est la table
 * de correspondance entre « d'où vient l'utilisateur » et « ce qu'il lui faut ».
 */
export const DROIT_PAR_SOURCE = {
  ESTIMATEUR: 'can_view_estimate',
  METRAGE: 'can_use_metering',
  CALCUL: 'can_calculate',
  NOTE_CALCUL: 'can_view_calculation_note',
  RESUME: 'can_view_summary',
  QUANTITES: 'can_view_estimated_quantities',
  DEVIS: 'can_view_quote',
  DQE: 'can_view_dqe',
  EXPORT: 'can_export_quote',
  EXPORT_NOTE: 'can_export_calculation_note',
  IMPRESSION: 'can_print',
  PROJETS_MULTIPLES: 'can_create_multiple_projects',
  OUTILS_PRO: 'can_use_professional_calculators',
};

/**
 * La formule la moins chère qui accorde un droit donné. C'est elle qu'un
 * écran de verrouillage doit proposer : on ne fait pas payer l'abonnement
 * annuel à quelqu'un qui veut seulement voir sa note de calcul.
 */
export function planQuiDebloque(plans = [], droit) {
  return plans
    .filter((p) => p.active !== false && p.entitlements?.[droit])
    .sort((a, b) => a.price - b.price)[0] || null;
}

/**
 * La formule à mettre en avant, celles à proposer, et les montées en gamme.
 *
 * `source` dit d'où vient l'utilisateur et sert à recommander ce qui répond à
 * son besoin du moment — pas à pousser systématiquement la plus chère.
 */
export function getRecommendedOffer({
  plans = [],
  abonnements = [],
  source = 'ESTIMATEUR',
  projectId = null,
  maintenant = new Date(),
} = {}) {
  const disponibles = plans
    .filter((p) => p.active !== false)
    .sort((a, b) => rangDuPlan(a) - rangDuPlan(b));

  const droits = calculerDroits({ abonnements, plans, projectId, maintenant });
  const statut = statutDuCompte(abonnements, plans, maintenant);
  const droitRequis = DROIT_PAR_SOURCE[source] || DROIT_PAR_SOURCE.ESTIMATEUR;

  // Parmi les formules qui répondent au besoin, la moins chère.
  const repondent = disponibles.filter((p) => p.entitlements?.[droitRequis]);
  const moinsChere = repondent.slice().sort((a, b) => a.price - b.price)[0] || null;

  // À besoin égal, la formule marquée « recommandée » par l'administration
  // l'emporte si elle répond aussi au besoin.
  const misEnAvant = repondent.find((p) => p.recommended);
  const recommande = misEnAvant || moinsChere;

  // Montées en gamme. On ne promet une différence de prix que si les deux
  // formules se paient sur la même période : passer d'un mensuel à un annuel
  // n'est pas « un complément », c'est un autre engagement, et l'annoncer
  // comme une différence serait mentir sur ce que l'utilisateur va payer.
  const enCours = abonnements
    .filter((a) => abonnementEstActif(a, maintenant))
    .map((a) => plans.find((p) => p.id === a.plan_id))
    .filter(Boolean);
  const actuelle = enCours.reduce((haut, p) => (rangDuPlan(p) > rangDuPlan(haut) ? p : haut), null);

  const upgrades = actuelle
    ? disponibles
      .filter((p) => rangDuPlan(p) > rangDuPlan(actuelle))
      .map((p) => ({
        plan: p,
        depuis: actuelle,
        memePeriode: p.billing_type === actuelle.billing_type,
        supplement: p.billing_type === actuelle.billing_type ? p.price - actuelle.price : null,
      }))
    : [];

  return {
    statut,
    droits,
    recommended_plan: recommande,
    available_plans: disponibles,
    current_plan: actuelle,
    upgrade_options: upgrades,
    besoin: droitRequis,
    deja_satisfait: droits[droitRequis] === true,
  };
}

/** Le message d'accroche affiché au-dessus des formules, selon la provenance. */
export const MESSAGES_PAR_SOURCE = {
  ESTIMATEUR: 'Votre estimation de construction est prête.',
  METRAGE: 'Votre métré est prêt.',
  CALCUL: 'Vos calculs sont prêts.',
  NOTE_CALCUL: 'Votre note de calcul est prête.',
  RESUME: 'Le résumé de votre projet est prêt.',
  QUANTITES: 'Vos quantités estimatives sont prêtes.',
  DEVIS: 'Votre devis est prêt à être débloqué.',
  DQE: 'Votre DQE est prêt.',
  EXPORT: 'Votre document est prêt à être exporté.',
  EXPORT_NOTE: 'Votre note de calcul est prête à être exportée.',
  IMPRESSION: 'Votre document est prêt à être imprimé.',
};

/** La période de facturation, en toutes lettres. */
export function libellePeriode(plan) {
  if (!plan) return '';
  if (plan.billing_type === 'ANNUAL') return 'par an';
  if (plan.billing_type === 'MONTHLY') return 'par mois';
  return '';
}

/** Équivalent mensuel d'une formule annuelle, affiché à titre indicatif. */
export function equivalentMensuel(plan) {
  if (!plan || plan.billing_type !== 'ANNUAL' || !plan.price) return null;
  return Math.round(plan.price / 12);
}

/**
 * Ce qu'une formule annuelle fait économiser sur un an.
 *
 * La comparaison n'est pas inventée : la référence est la formule mensuelle
 * la plus complète, réellement proposée, payée douze mois. Rien n'est
 * « barré » par rapport à un prix qui n'aurait jamais existé — un tel affichage
 * serait une remise fictive.
 *
 * Retourne `null` quand il n'y a rien à économiser : mieux vaut ne rien dire
 * que d'annoncer un gain nul ou négatif.
 */
export function economieAnnuelle(plan, plans = []) {
  if (!plan || plan.billing_type !== 'ANNUAL' || !plan.price) return null;

  const mensuelles = plans.filter((p) => p.active !== false && p.billing_type === 'MONTHLY');
  if (!mensuelles.length) return null;

  const reference = mensuelles.reduce((haut, p) => (rangDuPlan(p) > rangDuPlan(haut) ? p : haut), mensuelles[0]);
  const surUnAn = Number(reference.price) * 12;
  const economie = surUnAn - Number(plan.price);
  if (!(economie > 0)) return null;

  return { reference, surUnAn, economie };
}

/**
 * Les étapes d'une étude, de la saisie au document exporté.
 *
 * Les deux premières sont franchies dès que l'utilisateur a saisi son projet
 * et lancé les calculs — c'est le travail que le gratuit permet réellement de
 * faire. Les suivantes dépendent d'un droit : c'est ce qui rend visible, sans
 * discours, pourquoi la suite est fermée.
 */
export const ETAPES_ETUDE = [
  { id: 'dimensions', label: 'Dimensions', droit: null },
  // `calculs` et non `calcul` : la formule d'entrée porte déjà ce nom, et
  // confondre l'étape avec la formule mènerait tôt ou tard à une règle écrite
  // sur un identifiant plutôt que sur un droit.
  { id: 'calculs', label: 'Calcul', droit: null },
  { id: 'note_calcul', label: 'Note de calcul', droit: 'can_view_calculation_note' },
  { id: 'resume', label: 'Résumé', droit: 'can_view_summary' },
  { id: 'quantites', label: 'Quantités', droit: 'can_view_estimated_quantities' },
  { id: 'devis', label: 'Devis', droit: 'can_view_quote' },
  { id: 'dqe', label: 'DQE', droit: 'can_view_dqe' },
  { id: 'export', label: 'Export', droit: 'can_export_quote' },
];

/** L'avancement réel de l'étude, étape par étape, selon les droits acquis. */
export function avancementDeLEtude(droits = {}) {
  return ETAPES_ETUDE.map((etape) => ({
    ...etape,
    acquise: etape.droit === null || droits[etape.droit] === true,
  }));
}
