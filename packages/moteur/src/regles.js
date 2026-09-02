/**
 * Jeu de regles propre au projet — Cameroun, 2026.
 *
 * Ces valeurs définissent les hypothèses et données financières spécifiques
 * au devis en cours. Chaque devis emporte une copie du jeu de regles qu'il a 
 * utilise, pour rester reproductible.
 * 
 * Tout ce qui concerne la mécanique des matériaux vit désormais dans parametres.js.
 */

export const REGLES_DEFAUT = {
  version: '2026.08',
  devise: { code: 'XAF', exposant: 0 },

  // Hypothèses par défaut pour éviter la saisie détaillée à chaque fois
  acier: {
    hypotheses: {
      poteaux: { diametrePrin: 12, nbreBarresPrin: 4, diametreCadre: 8, espacementCadre: 0.15 },
      semelles: { diametrePrin: 10, espacement: 0.15 }, // Nappe croisée
      longrines: { diametrePrin: 12, nbreBarresPrin: 4, diametreCadre: 6, espacementCadre: 0.20 },
      chainages: { diametrePrin: 10, nbreBarresPrin: 4, diametreCadre: 6, espacementCadre: 0.20 },
      dallePleine: { diametrePrin: 8, espacement: 0.15 } // Quadrillage
    }
  },

  // Taux financiers. Tous modifiables projet par projet.
  taux: {
    mainOeuvre: 0.35,
    transport: 0.1,
    imprevus: 0.05,
    benefice: 0.1,
    tva: 0, // absente des devis reels examines ; a activer au cas par cas
    fraisChantier: 0.08,
    fraisGeneraux: 0.1,
    fraisOperation: 0.05,
    aleasEtBenefice: 0.05,
  },

  // Le devis reel module la main d'oeuvre par lot ; le classeur applique
  // 35 % partout. C'est le devis reel qui a raison.
  mainOeuvreParLot: {
    fondation: 0.3,
    plancherEtRdc: 0.35,
    etage: 0.37,
    finition: 0.4,
  },
};
