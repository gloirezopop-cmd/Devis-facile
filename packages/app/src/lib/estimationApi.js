import { supabase } from './supabaseClient.js';
import { messageErreurFonction } from './messageErreurFonction.js';

/**
 * Accès Supabase du module « Estimer le budget de ma construction ».
 *
 * Le serveur n'est interrogé QUE sur ces tables — jamais en sortant vers
 * Internet. Une recherche Google ou Facebook au moment de l'estimation
 * romprait la garantie que l'estimation reste disponible même si Internet est
 * lent ou qu'un site externe ne répond pas.
 *
 * LES TARIFS NE SONT PLUS LUS ICI. Ils ne sortent plus de la base : c'est la
 * fonction `estimer_projet`, côté serveur, qui les consulte et qui décide de
 * renvoyer ou non les montants. Un prix au m² ne transite jamais par le
 * navigateur d'un utilisateur.
 *
 * Chaque lecture renvoie un tableau simple ; en cas d'erreur réseau elle
 * renvoie un tableau vide plutôt que de faire planter l'assistant.
 */

async function selectActifs(table, filtres = {}, colonneTri = 'order') {
  let requete = supabase.from(table).select('*').eq('active', true);
  if (colonneTri) requete = requete.order(colonneTri, { ascending: true });
  for (const [colonne, valeur] of Object.entries(filtres)) {
    requete = requete.eq(colonne, valeur);
  }
  const { data, error } = await requete;
  if (error) {
    console.error(`estimationApi: lecture de ${table} impossible`, error);
    return [];
  }
  return data || [];
}

// ─── Listes de référence ────────────────────────────────────────────────────

export const fetchCountries = () => selectActifs('estimation_countries');
export const fetchBuildingTypes = () => selectActifs('estimation_building_types');
export const fetchStandings = () => selectActifs('estimation_standings');
export const fetchRoofTypes = () => selectActifs('estimation_roof_types');
export const fetchLocations = (countryId) =>
  countryId ? selectActifs('estimation_locations', { country_id: countryId }) : Promise.resolve([]);

/** Toutes les localisations, tous pays confondus — pour le tableau d'administration. */
export const fetchToutesLesLocalisations = () => selectActifs('estimation_locations');

// ─── Projets d'estimation ───────────────────────────────────────────────────

/** Les champs du projet que le navigateur a le droit d'écrire. */
function corpsDuProjet(session) {
  return {
    country_id: session.country,
    location_id: session.location,
    building_type_id: session.buildingType,
    standing_id: session.standing,
    // Pas de `roof_type_id` : l'assistant ne demande plus le type de toiture.
    // La cascade tarifaire du serveur le prévoit toujours pour un tarif que
    // l'administrateur aurait posé sur une toiture précise, mais rien ne le
    // renseigne côté utilisateur.
    nombre_etages: session.nombreEtages,
    levels: session.levels || [],
    surface_totale: session.surfaceTotale ?? null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Crée le projet, ou met à jour celui en cours. Le projet existe en base dès
 * qu'il est calculé : c'est lui qu'on verrouille, et c'est la promesse qu'un
 * utilisateur gratuit ne perd jamais son travail.
 */
export async function enregistrerProjet(session, projectId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Vous devez être connecté pour enregistrer votre projet.');

  if (projectId) {
    const { data, error } = await supabase
      .from('estimation_projects')
      .update(corpsDuProjet(session))
      .eq('id', projectId)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  const { data, error } = await supabase
    .from('estimation_projects')
    .insert({ ...corpsDuProjet(session), user_id: user.id })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Demande l'estimation au serveur.
 *
 * La réponse contient toujours le récapitulatif, le détail des niveaux et la
 * surface cumulée. Elle ne contient un `budget` que si l'utilisateur y a
 * droit : sinon le montant n'est pas masqué, il n'existe pas dans la réponse.
 */
export async function estimerProjet(projectId) {
  const { data, error } = await supabase.rpc('estimer_projet', { p_project_id: projectId });
  if (error) throw error;
  return data;
}

/** Fait passer le projet à LOCKED, ou à UNLOCKED si les droits sont acquis. */
export async function marquerProjetCalcule(projectId) {
  const { data, error } = await supabase.rpc('marquer_projet_calcule', { p_project_id: projectId });
  if (error) throw error;
  return data;
}

export async function fetchMesProjets() {
  const { data, error } = await supabase
    .from('estimation_projects')
    .select('*')
    .neq('status', 'ARCHIVED')
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('estimationApi: lecture des projets impossible', error);
    return [];
  }
  return data || [];
}

// ─── Offres et droits ───────────────────────────────────────────────────────

export const fetchOffres = () =>
  selectActifs('subscription_plans', {}, 'display_order');

export async function fetchMesAbonnements() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'ACTIVE');
  if (error) {
    console.error('estimationApi: lecture des abonnements impossible', error);
    return [];
  }
  return data || [];
}

/** Enregistre un événement du tunnel (§44). N'interrompt jamais le parcours. */
export async function tracer(event, properties = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('analytics_events').insert({ user_id: user?.id ?? null, event, properties });
  } catch (err) {
    console.debug('analytics indisponible', err);
  }
}

// ─── Administration des tarifs ──────────────────────────────────────────────
//
// Réservée aux comptes portant `is_admin` dans la table `profiles`. Pour un
// compte ordinaire, la base ne renvoie tout simplement rien : la protection
// est appliquée par PostgreSQL, pas par cet écran.

export async function fetchTousLesTarifs() {
  const { data, error } = await supabase
    .from('construction_rates')
    .select('*')
    .order('country_id', { ascending: true })
    .order('standing_id', { ascending: true });
  if (error) {
    console.error('estimationApi: lecture des tarifs (admin) impossible', error);
    return [];
  }
  return data || [];
}

export async function estAdministrateur() {
  const { data, error } = await supabase.rpc('est_admin');
  if (error) return false;
  return data === true;
}

/**
 * Les chiffres du tableau de bord d'administration.
 *
 * Tout est compté par la base : le navigateur n'a le droit de lire ni
 * `auth.users`, ni les paiements des autres, et cela ne changera pas. Un
 * compte ordinaire reçoit `null` — pas une erreur, il n'a pas à apprendre
 * qu'un écran d'administration existe.
 */
export async function fetchStatistiquesAdmin() {
  const { data, error } = await supabase.rpc('statistiques_admin');
  if (error) throw error;
  return data;
}

/**
 * La liste des comptes, pour l'administration : de quoi reconnaître un client
 * et le contacter. Ni mot de passe ni jeton n'en sortent — la fonction en base
 * choisit exactement les colonnes qu'elle expose, et répond `null` à un compte
 * ordinaire.
 */
export async function fetchComptesAdmin() {
  const { data, error } = await supabase.rpc('comptes_admin');
  if (error) throw error;
  return data;
}

export async function creerTarif(tarif) {
  const { data, error } = await supabase.from('construction_rates').insert(tarif).select().single();
  if (error) throw error;
  return data;
}

export async function modifierTarif(id, patch) {
  const { data, error } = await supabase
    .from('construction_rates')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function desactiverTarif(id) {
  return modifierTarif(id, { active: false });
}

export async function supprimerTarif(id) {
  const { error } = await supabase.from('construction_rates').delete().eq('id', id);
  if (error) throw error;
}

// ─── Investisseurs ───────────────────────────────────────────────────────────
//
// Toutes ces fonctions vivent dans la base et vérifient elles-mêmes que
// l'appelant est le fondateur. Ce fichier ne fait que les appeler : il ne
// décide de rien, et un compte qui appellerait l'API directement se ferait
// refuser au même endroit.

/** La liste des investisseurs et leur part. Renvoie `null` à qui n'est pas le fondateur. */
export async function fetchInvestisseurs() {
  const { data, error } = await supabase.rpc('investisseurs_admin');
  if (error) throw error;
  return data;
}

/** Les invitations envoyées à des personnes qui n'ont pas encore de compte. */
export async function fetchInvitations() {
  const { data, error } = await supabase.rpc('invitations_admin');
  if (error) throw error;
  return data;
}

/**
 * Nomme un compte existant investisseur, avec sa part.
 * La base refuse si le compte n'existe pas, si la part sort de 0-100, ou si le
 * total des parts dépasserait 100 %.
 */
export async function nommerInvestisseur(email, part) {
  const { data, error } = await supabase.rpc('nommer_investisseur', { p_email: email, p_part: part });
  if (error) throw error;
  return data;
}

/** Retire la qualité d'investisseur : plus de part, et l'abonnement redevient dû. */
export async function retirerInvestisseur(email) {
  const { data, error } = await supabase.rpc('retirer_investisseur', { p_email: email });
  if (error) throw error;
  return data;
}

/**
 * Invite une adresse qui n'a pas encore de compte. La part est retenue et
 * s'applique toute seule à l'inscription. Si le compte existe déjà, la
 * nomination est immédiate.
 */
export async function inviterInvestisseur(email, part) {
  const { data, error } = await supabase.rpc('inviter_investisseur', { p_email: email, p_part: part });
  if (error) throw error;
  return data;
}

export async function annulerInvitation(email) {
  const { data, error } = await supabase.rpc('annuler_invitation', { p_email: email });
  if (error) throw error;
  return data;
}

/**
 * Expédie l'invitation par e-mail.
 *
 * L'invitation est déjà enregistrée en base à ce stade : cet appel ne fait
 * qu'envoyer le courrier. S'il échoue, rien n'est perdu — l'invitation reste
 * valable et l'écran propose de copier le message à la main.
 *
 * La fonction serveur redemande à la base si l'appelant est le fondateur : ce
 * n'est pas cet appel qui l'autorise.
 */
export async function envoyerInvitationEmail(email, part) {
  const { data, error } = await supabase.functions.invoke('envoyer-invitation', {
    body: { email, part },
  });
  // `invoke` ne remplit `data` que sur une réponse 2xx ; sur 4xx/5xx le corps
  // part dans `error.context`, d'où ce détour — sans lui, l'écran afficherait
  // « Edge Function returned a non-2xx status code » à la place du motif réel.
  if (error) throw new Error(await messageErreurFonction(error, data));
  return data;
}

/**
 * Ce qu'un investisseur voit de son placement : SA part et SON montant.
 * Jamais le chiffre d'affaires dont ce montant est tiré — la fonction en base
 * ne le renvoie pas, quelle que soit la façon dont on l'appelle.
 */
export async function fetchMesRevenus() {
  const { data, error } = await supabase.rpc('mes_revenus_investisseur');
  if (error) throw error;
  return data;
}
