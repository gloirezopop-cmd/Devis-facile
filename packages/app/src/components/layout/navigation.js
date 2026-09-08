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
 * Section réservée au fondateur. Ajoutée à la navigation seulement lorsque la
 * base répond `est_admin() = true` — un lien masqué n'est pas une protection,
 * la vraie barrière est côté PostgreSQL (RLS et `statistiques_admin()`).
 */
export const NAVIGATION_ADMIN = {
  titre: 'Administration',
  liens: [
    { to: '/admin', label: 'Statistiques', icone: 'bar-chart', exact: true },
    { to: '/admin/tarifs', label: 'Tarifs de référence', icone: 'credit-card' },
  ],
};

/** Routes réellement construites. Les autres passent par EmptyState. */
export const ROUTES_ACTIVES = new Set(['/', '/dashboard', '/estimation', '/metre', '/devis', '/parametres', '/projets', '/apprendre', '/sujets', '/admin', '/admin/tarifs']);
