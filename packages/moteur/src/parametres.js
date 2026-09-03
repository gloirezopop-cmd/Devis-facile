/**
 * PARAMÈTRES GLOBAUX DU PROJET — Source de vérité issue du classeur Excel.
 * Ces valeurs sont éditables depuis l'onglet « Paramètres » de l'app.
 * Aucune de ces valeurs n'est répétée ailleurs dans le code.
 */

export const PARAMETRES = {
  // Majorations par matériau (Achat uniquement)
  majorations: {
    planches: 1.10,
    chevrons: 1.10,
    blocs: 1.05,
    acier: 1.05,
    sable: 1.05,
    gravier: 1.05,
    toles: 1.10,
    carreaux: 1.10,
    faience: 1.10,
  },

  // A. BÉTON — coefficients volumétriques par m3
  beton: {
    poidsSacCiment: 50, // kg
    gravierParM3: 0.80, // m3/m3
    densiteGravier: 1.60, // t/m3
    sableParM3: 0.40, // m3/m3
    densiteSable: 1.50, // t/m3
    volumeBrouette: 0.06, // m3
    eauParDosage: 2, // kg de ciment par litre d'eau
  },

  // B. MORTIER DE HOURDAGE (sans gravier)
  mortier: {
    sableParM3Mortier: 1.0, // m3/m3
    ratioEauCimentMortier: 0.5, // L/kg
    dosageMortierMaconnerie: 300, // kg/m3
    jointMaconnerie: 0.015, // m
  },

  // C. DOSAGES COURANTS (kg de ciment par m3)
  dosages: {
    betonProprete: 150,
    maconnerieCourante: 250, // moellon, sous-pavement, chape, dallage
    mortierRenforce: 300,
    betonArme: 350, // semelles, colonnes, ceinture, dalle
    memoire: [400, 450, 500],
  },

  // D. ACIERS — poids par mètre linéaire, en kg/m (Valeurs exactes du guide)
  aciersPoidsLineique: {
    5: 0.154,
    6: 0.222,
    8: 0.395,
    10: 0.617,
    12: 0.880,
    14: 1.208,
    16: 1.578,
    20: 2.466,
    25: 3.854,
  },

  // E. NUANCES D'ACIER
  nuancesAcier: {
    FeE215: { type: 'RL', coefficientRecouvrement: 60 }, // rond lisse
    FeE235: { type: 'RL', coefficientRecouvrement: 50 }, // rond lisse
    FeE400: { type: 'HA', coefficientRecouvrement: 40 }, // haute adhérence (HA400)
    FeE500: { type: 'HA', coefficientRecouvrement: 50 }, // haute adhérence (HA500)
  },
  nuancePrincipaleParDefaut: 'FeE400',
  nuanceCadresParDefaut: 'FeE235',

  // F. BARRES ET ARMATURES
  armatures: {
    longueurBarreCommerciale: 12, // m
    longueurBarreUtile: 11.5, // m (pertes déduites)
    enrobage: 0.02, // m
    crochet: 0.10, // m
    filLigaturePct: 0.05,
    poidsVolumiqueAcier: 7.85, // t/m3
  },

  // G. COEFFICIENTS GÉNÉRAUX
  coefficients: {
    coefficientTassement: 1.3,
    majorationAchat: 1.10, // planches, blocs, tôles
    majorationCarrelage: 1.10,
    densiteMoellon: 1.60, // t/m3
    moellonPctVolume: 0.70,
    poidsBetonFrais: 2400, // kg/m3
    densiteTerre: 1.50, // t/m3
  },

  // H. BOIS, CHARPENTE ET CLOUS
  bois: {
    plancheStandard: { L: 3.00, l: 0.30, e: 0.05 }, // m
    chevronDeTraverse: 0.0125, // m3/pièce
    traversesPct: 0.20,
  },
  ratiosCoffrage: {
    semelle: 3, // m2 par m3
    colonne: 15, // m2 par m3
    poutre: 11, // m2 par m3 (ceinture incluse)
    longrine: 8, // m2 par m3 (chaînage inclus)
    voile: 17, // m2 par m3
    dalle: 1.12, // m2 par m2 de dalle
    escalier: 12, // m2 par m3
  },

  // I. COUVERTURE
  couverture: {
    largeurUtileTole: 0.84, // m
    longueurTole: 3.00, // m
    longueurFaitiere: 3.00, // m
  },

  clous: {
    coffrage: 0.15, // kg/m2
    charpente: 20, // kg/m3
    couverture: 0.10, // kg/m2 par pan
  },

  // I. ENDUIT, PEINTURE, CARRELAGE
  finitions: {
    enduitCimentKgM2: 8,
    rendementLatex: 4, // m2/kg
    rendementPeintureClassique: 10, // m2/L
    rendementChaux: 6, // m2/kg
    nbCouchesPeinture: 2,
    cimentColleKgM2: 8,
    sableMortierPoseLitresM2ParCm: 10,
    surfaceCarreau: 0.09, // m2 (30x30, 12 par carton)
    surfaceFaience: 0.10, // m2 (25x40, 10 par carton)
  },

  // J. PRIX UNITAIRES par défaut, en FCFA
  prixUnitaires: {
    // Matériaux de base
    ciment: 5500,
    ciment50kg: 5500,
    sable: 15000,
    sableTonne: 15000,
    gravier: 25000,
    gravierTonne: 25000,
    moellon: 17000,
    moellonTonne: 17000,
    eau: 1500,
    eauM3: 1500,
    
    // Aciers HA (barre de 12 m)
    acierHA_6: 1500,
    acierHA_8: 2700,
    acierHA_10: 4200,
    acierHA_12: 6000,
    acierHA_14: 8200,
    acierHA_16: 10800,
    
    // Aciers Ronds Lisses (barre de 12 m)
    acierRL_6: 1250,
    acierRL_8: 2250,
    acierRL_10: 3500,
    acierRL_12: 5000,
    
    // Autres
    filLigature: 1200,
    filLigatureKg: 1200,
    planches: 3000,
    planchePiece: 3000,
    chevrons: 2200,
    chevronPiece: 2200,
    clous: 1000,
    clousKg: 1000,
    agglos: 450,
    blocCreux15Piece: 350,
    blocCreux20Piece: 450,
    toleBG28Piece: 7500,
    toleFaitierePiece: 8500,

    // Prix ranges sous l'identifiant que les recettes emettent reellement.
    // Sans eux, l'ouvrage sortait metre mais a zero franc dans le devis.
    blocs: 450,            // agglo creux, piece
    blocs_pleins: 600,     // agglo plein de soubassement, piece
    toles: 7500,           // tole BG28, piece
    faitieres: 8500,       // faitiere, piece
    clous_charpente: 1000, // kg
    clous_toiture: 1000,   // kg
    peinture_latex: 2800,  // kg
    peinture_classique: 3200, // L
    peinture_chaux: 450,   // kg
    // A confirmer par l'utilisateur : ces trois valeurs sont des ordres de
    // grandeur, pas des prix releves sur le marche.
    carreaux: 500,         // carreau 30x30 (surface / 0,09), piece
    faience: 600,          // carreau de faience (surface / 0,10), piece
    bois_charpente: 180000, // m3 de bois de charpente
    plinthe: 800,          // plinthe de 0,40 m, piece
    peintureBoisL: 3500,
    cimentColle: 650,
    cimentColleKg: 650,
    chauxKg: 450,
    latexKg: 2800,
    peintureClassiqueL: 3200,
    carreauxCarton: 6500,
    faienceCarton: 6000,
    
    // Forfaits chantier
    installationEtRepliForfait: 350000,
    ameneeEtRepliForfait: 200000,
    
    // Prix tout compris
    fouillePuitsM3: 1886,
    fouilleTrancheeM3: 1162,
    remblaiSousDallageM3: 1200,
    remblaiDroitFondationsM3: 1505,
    evacuationDeblaisM3: 1500,
    murSoubassementAgglo15M2: 6045,
    plancherHourdis12_4M2: 9500,
    hourdis16_4M2: 11500,
    scellementHuisseriesMl: 500,
    dressementTableauxMl: 500,
    formePenteTerrasseM2: 3025,
  }
};

/**
 * Retourne le prix d'une barre de 12m en fonction de son diamètre et de sa nuance.
 */
export function prixBarre(diametre, nuance) {
  const type = PARAMETRES.nuancesAcier[nuance]?.type || 'HA';
  const cle = `acier${type}_${diametre}`;
  return PARAMETRES.prixUnitaires[cle] || 0;
}

/**
 * Calcule la longueur de recouvrement pour un diamètre et une nuance donnés.
 * Renvoie une valeur en mètres.
 */
export function calculerRecouvrement(diametre, nuance) {
  const nuanceConfig = PARAMETRES.nuancesAcier[nuance];
  if (!nuanceConfig) return 0;
  return (diametre / 1000) * nuanceConfig.coefficientRecouvrement;
}
