import { PARAMETRES } from './parametres.js';

const DECIMALES = 6;
function net(x) {
  return Math.round(x * 10 ** DECIMALES) / 10 ** DECIMALES;
}

export function calculerCoffrage({ 
  surface, 
  typeSurface, // 'geometrique' ou 'ratio'
  traceSurfaceText, // Explication détaillée du calcul de la surface
  dalleOptions, // Options spécifiques pour le coffrage de dalle (panneaux)
  majoration = PARAMETRES.majorations.planches || 1.10, 
  planche = PARAMETRES.bois.plancheStandard, 
  chevronTraverse = PARAMETRES.bois.chevronDeTraverse, 
  traversesPct = PARAMETRES.bois.traversesPct, 
  clousKgM2 = PARAMETRES.clous.coffrage 
}) {
  if (dalleOptions && dalleOptions.methode === 'panneaux') {
    return calculerCoffrageDalleManuelle(dalleOptions, planche);
  }

  if (!surface || surface <= 0) return null;

  // L'algorithme exact de la méthode manuelle du guide:

  // ÉTAPE 3 (Surface de coffrage déjà passée en argument : `surface`)
  
  // ÉTAPE 2 & 3: Surface d'une planche et Volume d'une planche
  const surfaceUnePlanche = planche.L * planche.l;
  const volumeUnePlanche = planche.L * planche.l * planche.e;

  // ÉTAPE 4: CALCUL DU NOMBRE DE PLANCHES
  const nombrePlanchesTheorique = surface / surfaceUnePlanche;
  const nombrePlanchesMajore = nombrePlanchesTheorique * majoration; // majoration = 1.10 par défaut
  const planches = Math.ceil(nombrePlanchesMajore);
  
  // ÉTAPE 5: CALCUL DU VOLUME DE BOIS DE COFFRAGE
  const volumePlanches = planches * volumeUnePlanche;
  
  // ÉTAPE 6: CALCUL DES TRAVERSES (CHEVRONS)
  const volumeTraverses = volumePlanches * traversesPct; // traversesPct = 0.20 par défaut
  
  // ÉTAPE 7: CALCUL DU NOMBRE DE TRAVERSES
  const volumeUnChevron = chevronTraverse; // 3.00 * 0.05 * 0.05 = 0.0075 m3
  const chevrons = Math.ceil(volumeTraverses / volumeUnChevron);
  
  // ÉTAPE 8: VOLUME TOTAL DE BOIS
  const volumeTotalBois = volumePlanches + volumeTraverses;
  
  // ÉTAPE 9: CALCUL DES CLOUS
  const clous = surface * clousKgM2; // clousKgM2 = 0.15 par défaut

  const texteBase = traceSurfaceText ? `${traceSurfaceText}\n` : '';
  const traceTextPlanches = `${texteBase}Surface_une_planche = ${planche.L} × ${planche.l} = ${net(surfaceUnePlanche)} m²\nNombre_planches_theorique = ${net(surface)} ÷ ${net(surfaceUnePlanche)} = ${net(nombrePlanchesTheorique)}\nNombre_planches = ceil(${net(nombrePlanchesTheorique)} × ${majoration}) = ${planches} planches\nVolume_une_planche = ${planche.L} × ${planche.l} × ${planche.e} = ${net(volumeUnePlanche)} m³\nVolume_planches = ${planches} × ${net(volumeUnePlanche)} = ${net(volumePlanches)} m³`;
  
  const traceTextChevrons = `Volume_traverses = ${net(volumePlanches)} × ${traversesPct} = ${net(volumeTraverses)} m³\nVolume_une_traverse = ${net(volumeUnChevron)} m³\nNombre_traverses = ceil(${net(volumeTraverses)} ÷ ${net(volumeUnChevron)}) = ${chevrons} traverses`;

  const traceTextClous = `Quantité_clous = ${net(surface)} × ${clousKgM2} = ${net(clous)} kg`;

  const trace = {
    formule: `Méthode manuelle du guide`,
    entrees: { surface, typeSurface, majoration, plancheL: planche.L, planchel: planche.l },
    resultat: { planches, chevrons, clous, volumeBois: volumeTotalBois },
    typeSurface,
    traceTextPlanches,
    traceTextChevrons,
    traceTextClous
  };

  return {
    surface,
    typeSurface,
    planchesNet: net(nombrePlanchesTheorique),
    planches,
    chevrons,
    clous: net(clous),
    volumeTotalBois: net(volumeTotalBois),
    trace
  };
}

function calculerCoffrageDalleManuelle(dalleOptions, planche) {
  const { longueur, largeur, epaisseurCm, panneaux, traceSurfaceText } = dalleOptions;
  const surfaceDalle = longueur * largeur;
  const eDalle = (epaisseurCm || 10) / 100;
  const vBeton = surfaceDalle * eDalle;
  
  // ÉTAPE 3: PLANCHES
  const surfacePlan = surfaceDalle / 1.50;
  const planches = Math.ceil(surfacePlan);
  const volumePlanches = planches * planche.L * planche.l * planche.e;

  // ÉTAPE 4: CHEVRONS 7/7
  // Somme pour tous les panneaux de ceil(L/0.8) * ceil(l/0.8)
  const pList = panneaux && panneaux.length > 0 ? panneaux : [{ longueur, largeur }];
  let chevrons77QteTheorique = 0;
  let trace77 = '';
  
  pList.forEach((p, idx) => {
    const qL = Math.ceil(p.longueur / 0.80);
    const ql = Math.ceil(p.largeur / 0.80);
    const q = qL * ql;
    chevrons77QteTheorique += q;
    trace77 += `Panneau ${idx + 1} (${p.longueur}m × ${p.largeur}m) : ceil(${p.longueur}/0.8) × ceil(${p.largeur}/0.8) = ${qL} × ${ql} = ${q} appuis\n`;
  });
  
  const chevrons77Majore = chevrons77QteTheorique * 1.40;
  const chevrons77Pieces = Math.ceil(chevrons77Majore);
  const volumeChevrons77 = chevrons77Pieces * 5.0 * 0.07 * 0.07; // longueur 5m
  
  // ÉTAPE 5 & 6: GITAGE CHEVRONS 5/5
  const lignesLong = Math.ceil(largeur / 1.0) + 1;
  const devL = lignesLong * longueur;
  const lignesTrans = Math.ceil(longueur / 1.0) + 1;
  const devT = lignesTrans * largeur;
  const developpe55 = devL + devT;
  const pieces55 = Math.ceil(developpe55 / 5.00); // Pièces de 5m
  const volumeChevrons55 = pieces55 * 5.00 * 0.05 * 0.05;

  // BILAN
  const volumeTotalBois = volumePlanches + volumeChevrons77 + volumeChevrons55;
  const chevronsTotalPieces = chevrons77Pieces + pieces55; // On additionne les pièces pour le devis
  const clous = surfaceDalle * 0.15; // kg
  
  const texteBase = traceSurfaceText ? `${traceSurfaceText}\n` : '';
  const traceTextPlanches = `${texteBase}Surface_dalle = ${longueur} × ${largeur} = ${net(surfaceDalle)} m²
Nombre_planches = ceil(${net(surfaceDalle)} / 1.50) = ${planches} planches
Volume_planches = ${planches} × ${planche.L} × ${planche.l} × ${planche.e} = ${net(volumePlanches)} m³`;

  const traceTextChevrons = `${trace77}Total appuis théoriques (7/7) = ${chevrons77QteTheorique}
Nombre_chevrons_7x7 (majoré à 40%) = ceil(${chevrons77QteTheorique} × 1.40) = ${chevrons77Pieces} pièces
Volume_chevrons_7x7 = ${chevrons77Pieces} × 5.00 × 0.07 × 0.07 = ${net(volumeChevrons77)} m³

Gitage chevrons (5/5) :
Lignes longitudinales = ceil(${largeur} / 1.0) + 1 = ${lignesLong} -> Développé = ${lignesLong} × ${longueur} = ${net(devL)} m
Lignes transversales = ceil(${longueur} / 1.0) + 1 = ${lignesTrans} -> Développé = ${lignesTrans} × ${largeur} = ${net(devT)} m
Développé_total_5x5 = ${net(developpe55)} m
Nombre_pieces_5x5 (5m) = ceil(${net(developpe55)} / 5.00) = ${pieces55} pièces
Volume_chevrons_5x5 = ${pieces55} × 5.00 × 0.05 × 0.05 = ${net(volumeChevrons55)} m³`;

  const traceTextClous = `Quantité_clous = ${net(surfaceDalle)} × 0.15 = ${net(clous)} kg`;

  const trace = {
    formule: `Méthode manuelle DALLE par panneaux (Planches + Chevrons 7/7 + Gitage 5/5)`,
    entrees: { longueur, largeur, epaisseurCm, panneaux },
    resultat: { planches, chevrons: chevronsTotalPieces, clous, volumeBois: volumeTotalBois },
    typeSurface: 'dalle',
    traceTextPlanches,
    traceTextChevrons,
    traceTextClous
  };

  return {
    surface: surfaceDalle,
    typeSurface: 'dalle',
    planchesNet: net(surfaceDalle / 1.50),
    planches,
    chevrons: chevronsTotalPieces,
    clous: net(clous),
    volumeTotalBois: net(volumeTotalBois),
    trace
  };
}
