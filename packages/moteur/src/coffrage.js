import { PARAMETRES } from './parametres.js';

const DECIMALES = 6;
function net(x) {
  return Math.round(x * 10 ** DECIMALES) / 10 ** DECIMALES;
}

export function calculerCoffrage({ 
  surface, 
  typeSurface, // 'geometrique' ou 'ratio'
  majoration = PARAMETRES.majorations.planches || 1.10, 
  planche = PARAMETRES.bois.plancheStandard, 
  chevronTraverse = PARAMETRES.bois.chevronDeTraverse, 
  traversesPct = PARAMETRES.bois.traversesPct, 
  clousKgM2 = PARAMETRES.clous.coffrage 
}) {
  if (!surface || surface <= 0) return null;

  // Planches = ROUNDUP(surface / (planche.longueur x planche.largeur) x majoration)
  // On stocke d'abord le net (sans majoration) pour la quantité nette du résumé
  const planchesNet = surface / (planche.L * planche.l);
  const planches = Math.ceil(planchesNet * majoration);

  const volumePlanches = planches * planche.L * planche.l * planche.e;
  const volumeTraverses = volumePlanches * traversesPct;
  const chevrons = Math.ceil(volumeTraverses / chevronTraverse);
  
  const volumeTotalBois = volumePlanches + volumeTraverses;
  const clous = (volumePlanches / planche.e + volumeTraverses / planche.e) * clousKgM2;

  const trace = {
    formule: `planches = ceil((surface / (L x l)) x majoration)\nchevrons = ceil(vol_traverses / vol_unitaire)\nclous = (surf_planches + surf_traverses) x ${clousKgM2} kg/m2`,
    entrees: { surface, typeSurface, majoration, plancheL: planche.L, planchel: planche.l },
    resultat: { planches, chevrons, clous, volumeBois: volumeTotalBois },
    typeSurface // Pour affichage dans le front ("Géométrique" ou "Hypothèse (Ratio)")
  };

  return {
    surface,
    typeSurface,
    planchesNet: net(planchesNet),
    planches,
    chevrons,
    clous: net(clous),
    volumeTotalBois: net(volumeTotalBois),
    trace
  };
}
