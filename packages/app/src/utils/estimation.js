/**
 * Logique pure du module « Estimer le budget de ma construction ».
 *
 * Rien ici ne touche au réseau ni à Supabase : génération des niveaux,
 * validation et cumul des surfaces, recherche du tarif et calcul du coût.
 * C'est ce qui rend la règle « ne jamais inventer un tarif » vérifiable — la
 * cascade est une liste explicite, pas une déduction.
 *
 * MODÈLE DE CALCUL
 *
 *   L'utilisateur saisit la surface de chaque niveau de son bâtiment :
 *   fondation, rez-de-chaussée, chaque étage, toiture.
 *
 *   Surface totale cumulée = somme des surfaces saisies
 *   Coût estimatif         = surface totale cumulée × prix au m² du standing
 *
 * Il n'est jamais question de la parcelle. On ne demande pas la surface du
 * terrain, ni la part qu'on y bâtit : ce sont des informations que beaucoup
 * n'ont pas sous la main, et qui obligeraient à deviner. On demande ce que la
 * personne connaît réellement — la surface de ce qu'elle veut construire.
 *
 * La fondation et la toiture SONT comptabilisées. Une formule qui ne
 * retiendrait que le RDC et les étages sous-estimerait le chantier : la
 * fondation et la couverture représentent un vrai volume de travaux.
 */

/**
 * Fondation → RDC → R+1 → ... → R+N → Toiture.
 *
 * Pour R+0 (`nombreEtages = 0`), la boucle des étages n'ajoute rien :
 * Fondation → RDC → Toiture, soit trois surfaces.
 */
export function genererNiveaux(nombreEtages) {
  const n = Math.max(0, Math.floor(Number(nombreEtages) || 0));

  const niveaux = [
    { id: 'fondation', type: 'foundation', label: 'Fondation' },
    { id: 'rdc', type: 'ground_floor', label: 'RDC' },
  ];

  for (let i = 1; i <= n; i += 1) {
    niveaux.push({ id: `r${i}`, type: 'floor', label: `R+${i}` });
  }

  // « Toiture ou terrasse » : une couverture plate se saisit exactement de la
  // même façon, et le libellé évite d'avoir à se demander où la mettre.
  niveaux.push({ id: 'toiture', type: 'roof', label: 'Toiture ou terrasse' });

  return niveaux;
}

/**
 * Nombre de surfaces comptabilisées : 1 fondation + 1 RDC + N étages + 1
 * toiture. R+0 → 3, R+1 → 4, R+3 → 6. Aucun plafond : R+10 donne 13.
 */
export function compterSurfaces(nombreEtages) {
  return Math.max(0, Math.floor(Number(nombreEtages) || 0)) + 3;
}

/** Libellé d'affichage de la configuration : « R+3 ». */
export function formaterConfiguration(nombreEtages) {
  return `R+${Math.max(0, Math.floor(Number(nombreEtages) || 0))}`;
}

/**
 * Clé de configuration utilisée pour la recherche de tarif (`level_category`
 * en base, ex. « R1 »). Distincte de `formaterConfiguration` (« R+1 »), qui
 * reste réservée à l'affichage : les confondre ferait échouer la comparaison
 * en base pour rien.
 */
export function formaterCategorieNiveau(nombreEtages) {
  return `R${Math.max(0, Math.floor(Number(nombreEtages) || 0))}`;
}

/** Libellé de devise affiché — la donnée reste `currency_code`, jamais « FCFA » codé en dur. */
export const LIBELLES_DEVISE = { XAF: 'FCFA', XOF: 'FCFA' };

/**
 * Surface d'un niveau. Deux modes de saisie, et rien d'autre : une surface
 * donnée directement, ou une longueur et une largeur dont la surface se
 * déduit. Ce que la personne veut ajouter — un débord, une avancée — elle
 * l'inclut dans la surface qu'elle saisit ; un champ séparé de plus n'aurait
 * fait qu'alourdir la saisie.
 *
 * Retourne { valeur, erreur } — jamais les deux à la fois, pour que
 * l'appelant n'ait qu'un seul champ à tester.
 */
export function calculerSurfaceNiveau({ mode, surface, longueur, largeur }) {
  if (mode === 'dimensions') {
    const l = Number(longueur);
    const larg = Number(largeur);
    if (!Number.isFinite(l) || !Number.isFinite(larg) || l <= 0 || larg <= 0) {
      return { valeur: null, erreur: 'Veuillez renseigner une longueur et une largeur valides.' };
    }
    return { valeur: Math.round(l * larg * 100) / 100, erreur: null };
  }

  const s = Number(surface);
  if (!Number.isFinite(s) || s <= 0) {
    return { valeur: null, erreur: 'Veuillez saisir une surface valide.' };
  }
  return { valeur: Math.round(s * 100) / 100, erreur: null };
}

/**
 * Surface totale cumulée : la somme de TOUS les niveaux — fondation et
 * toiture comprises. C'est la base du chiffrage.
 */
export function calculerSurfaceTotale(niveaux) {
  if (!Array.isArray(niveaux)) return 0;
  return Math.round(
    niveaux.reduce((total, n) => total + (Number(n?.surface) > 0 ? Number(n.surface) : 0), 0) * 100,
  ) / 100;
}

/**
 * Reporte une surface déjà saisie sur les niveaux encore vides.
 *
 * Beaucoup de bâtiments ont la même emprise à tous les niveaux : saisir la
 * fondation puis répéter le même nombre cinq fois est une corvée inutile. Ce
 * report ne touche JAMAIS un niveau déjà renseigné — corriger la toiture pour
 * une terrasse plus petite reste possible, et rien n'est écrasé derrière le
 * dos de l'utilisateur.
 */
export function reporterSurface(niveaux, surface) {
  const valeur = Number(surface);
  if (!Array.isArray(niveaux) || !Number.isFinite(valeur) || valeur <= 0) return niveaux;
  return niveaux.map((n) => (
    Number(n.surface) > 0
      ? n
      : { ...n, surface: valeur, surfaceSaisie: String(valeur), mode: n.mode || 'surface' }
  ));
}

/**
 * Recherche en cascade, du plus précis au plus général — jamais l'inverse, et
 * jamais de valeur fabriquée : si rien ne correspond, la fonction rend `null`
 * et l'appelant doit l'afficher comme tel, pas comme un prix à 0.
 *
 * 1. Localisation + type + standing + toiture + configuration exacts
 * 2. Localisation + type + standing + configuration (toiture ignorée)
 * 3. Localisation + type + standing (configuration ignorée)
 * 4. Pays + type + standing (aucune localisation)
 * 5. Pays + standing seul — le tarif national général
 *
 * Le dernier niveau est celui qui garantit qu'une estimation aboutit toujours
 * dès qu'un tarif national existe pour le standing, quel que soit le type de
 * bâtiment ou la ville choisie.
 *
 * `tarifs` est la liste déjà filtrée sur le pays et sur `active = true`.
 */
export function rechercherTarif(tarifs, criteres) {
  const { locationId, buildingTypeId, standingId, roofTypeId, levelCategory } = criteres;
  if (!Array.isArray(tarifs) || !standingId) return null;

  const actifs = tarifs.filter((t) => t.active !== false && t.standing_id === standingId);

  const niveaux = [
    (t) =>
      t.location_id === locationId &&
      t.building_type_id === buildingTypeId &&
      t.roof_type_id === roofTypeId &&
      t.level_category === levelCategory,
    (t) =>
      t.location_id === locationId &&
      t.building_type_id === buildingTypeId &&
      t.level_category === levelCategory,
    (t) => t.location_id === locationId && t.building_type_id === buildingTypeId,
    (t) => !t.location_id && t.building_type_id === buildingTypeId,
    (t) => !t.location_id && !t.building_type_id,
  ];

  for (const critere of niveaux) {
    const trouve = actifs.find(critere);
    if (trouve) return trouve;
  }

  return null;
}

/**
 * Coût estimatif = surface totale cumulée × prix au m².
 *
 * Le tarif porte trois prix. Lorsqu'ils sont identiques — un prix unique par
 * standing — les trois montants le sont aussi, et l'affichage ne montre qu'un
 * seul chiffre. Retourne `null` s'il n'y a pas de tarif : jamais un budget à
 * zéro, qui se lirait comme une construction gratuite.
 */
export function calculerBudget(surfaceTotale, tarif) {
  if (!tarif || !(surfaceTotale > 0)) return null;
  return {
    budgetMin: Math.round(surfaceTotale * Number(tarif.price_min)),
    budgetReference: Math.round(surfaceTotale * Number(tarif.price_reference)),
    budgetMax: Math.round(surfaceTotale * Number(tarif.price_max)),
  };
}

/** true si le tarif ne porte qu'un prix unique, sans fourchette. */
export function tarifEstUnique(tarif) {
  if (!tarif) return false;
  return Number(tarif.price_min) === Number(tarif.price_max);
}
