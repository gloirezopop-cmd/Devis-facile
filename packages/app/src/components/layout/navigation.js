/**
 * Source unique de la navigation — Sidebar (ordinateur) et MobileDrawer
 * (mobile) lisent la même liste. Un lien sans page existante pointe vers
 * une route qui affiche un EmptyState honnête, jamais une page inventée.
 */
export const NAVIGATION = [
  {
    titre: 'Principal',
    liens: [
      { to: '/dashboard', label: 'Tableau de bord', icone: 'grid', exact: true },
      { to: '/estimation', label: 'Estimer un budget', icone: 'calculator' },
      { to: '/metre', label: 'Nouveau métré', icone: 'ruler' },
      { to: '/devis', label: 'Nouveau devis', icone: 'file-text' },
      { to: '/projets', label: 'Projets', icone: 'folder' },
    ],
  },
  {
    titre: 'Formation',
    liens: [
      { to: '/apprendre', label: 'Cours de métré', icone: 'book-open' },
      { to: '/sujets', label: 'Sujets Officiels', icone: 'book' },
    ],
  },
  {
    titre: 'Compte',
    liens: [
      { to: '/parametres', label: 'Paramètres', icone: 'settings' },
    ],
  },
];

/**
 * Section d'administration, ajoutée seulement quand la base répond
 * `est_admin() = true`. Un lien masqué n'est pas une protection : la vraie
 * barrière est côté PostgreSQL (RLS et `statistiques_admin()`).
 */
const LIENS_ADMIN = [
  { to: '/admin', label: 'Statistiques', icone: 'bar-chart', exact: true },
];

/**
 * Les tarifs de référence, eux, ne sont pas affaire d'administrateur mais de
 * fondateur : la grille des prix est ce qui fait le produit, et la politique
 * RLS de `construction_rates` exige désormais `est_fondateur()`. Un
 * investisseur qui verrait ce lien n'obtiendrait qu'un tableau vide — autant
 * ne pas le lui montrer.
 */
const LIEN_TARIFS = { to: '/admin/tarifs', label: 'Tarifs de référence', icone: 'credit-card' };

export function sectionAdministration(estFondateur) {
  return {
    titre: 'Administration',
    liens: estFondateur ? [...LIENS_ADMIN, LIEN_TARIFS] : LIENS_ADMIN,
  };
}

/** Routes réellement construites. Les autres passent par EmptyState. */
export const ROUTES_ACTIVES = new Set(['/', '/dashboard', '/estimation', '/metre', '/devis', '/parametres', '/projets', '/apprendre', '/sujets', '/admin', '/admin/tarifs']);
