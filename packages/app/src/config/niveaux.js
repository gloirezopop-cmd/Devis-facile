/** Source unique : icône par type de niveau, et types que l'on ne peut pas supprimer. */
export const ICONES_TYPE = {
  terrassement: '⛏️',
  fondation:    '🧱',
  elevation:    '🏗️',
  plancher:     '🪟',
  toiture:      '🏠',
  finition:     '🎨',
};

// Terrassement, fondation, toiture et finition sont uniques par projet ;
// seuls les étages (élévation + plancher) se répètent et se suppriment.
export const TYPES_FIXES = ['terrassement', 'fondation', 'toiture', 'finition'];
