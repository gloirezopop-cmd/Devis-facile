/**
 * Source unique de la navigation — Sidebar (ordinateur) et MobileDrawer
 * (mobile) lisent la même liste. Un lien sans page existante pointe vers
 * une route qui affiche un EmptyState honnête, jamais une page inventée.
 */
export const NAVIGATION = [
  {
    titre: 'Principal',
    liens: [
      { to: '/', label: 'Tableau de bord', icone: 'grid', exact: true },
      { to: '/metre', label: 'Nouveau métré', icone: 'ruler' },
      { to: '/mes-metres', label: 'Mes métrés', icone: 'list' },
      { to: '/devis', label: 'Nouveau devis', icone: 'file-text' },
      { to: '/mes-devis', label: 'Mes devis', icone: 'files' },
      { to: '/projets', label: 'Projets', icone: 'folder' },
    ],
  },
  {
    titre: 'Apprendre',
    liens: [
      { to: '/apprendre', label: 'Apprendre le devis', icone: 'book' },
      { to: '/qcm', label: 'Simulations QCM', icone: 'check-square' },
      { to: '/resultats', label: 'Mes résultats', icone: 'bar-chart' },
      { to: '/corrections', label: 'Mes corrections', icone: 'edit' },
    ],
  },
  {
    titre: 'Compte',
    liens: [
      { to: '/profil', label: 'Mon profil', icone: 'user' },
      { to: '/abonnement', label: 'Mon abonnement', icone: 'star' },
      { to: '/parametres', label: 'Paramètres', icone: 'settings' },
    ],
  },
  {
    titre: 'Support',
    liens: [
      { to: '/aide', label: "Centre d'aide", icone: 'help-circle' },
      { to: '/contact', label: 'Nous contacter', icone: 'mail' },
    ],
  },
];

/** Routes réellement construites. Les autres passent par EmptyState. */
export const ROUTES_ACTIVES = new Set(['/', '/metre', '/devis', '/parametres']);
