/**
 * Moteur de calcul pour le module Métré de Toiture
 */

function creerResultat(designation, formule, valeurs, resultatBrut, quantiteFinale, unite, extras = {}) {
  return {
    designation,
    formule,
    valeurs,
    resultat_brut: Number(resultatBrut.toFixed(4)),
    quantite_finale: quantiteFinale,
    unite,
    ...extras
  };
}

export function calculateFermes(Lb, espacement) {
  const resultBrut = Lb / espacement + 1;
  const qte = Math.ceil(resultBrut);
  return creerResultat(
    "Fermes",
    "Lb / e + 1",
    `${Lb} / ${espacement} + 1`,
    resultBrut,
    qte,
    "pièces"
  );
}

export function calculateMadriers(ldFerme, nFermes, lc, pertes = 0) {
  const ldTotal = ldFerme * nFermes;
  const resultBrut = ldTotal / lc;
  
  let ajout = pertes;
  if (pertes < 1 && pertes > 0) {
    ajout = resultBrut * pertes;
  }
  
  const totalBrut = resultBrut + ajout;
  const qte = Math.ceil(totalBrut);
  
  return creerResultat(
    "Madriers de ferme",
    "LD_total / LC + Imprévus",
    `(${ldFerme} × ${nFermes}) / ${lc} + ${ajout}`,
    totalBrut,
    qte,
    "pièces",
    { ldTotal }
  );
}

export function calculateRoofSlope(demiPortee, hauteur, debord = 0) {
  const hyp = Math.sqrt(Math.pow(demiPortee, 2) + Math.pow(hauteur, 2));
  const versant = hyp + debord;
  return creerResultat(
    "Longueur versant",
    "√(a² + b²) + débord",
    `√(${demiPortee}² + ${hauteur}²) + ${debord}`,
    versant,
    Number(versant.toFixed(2)),
    "m"
  );
}

export function calculatePannes(longueurVersant, espacement, nbVersants, Lb, depassement, lc, pertes = 0) {
  const brutParVersant = longueurVersant / espacement;
  const pannesParVersant = Math.ceil(brutParVersant) + 1;
  
  const nTotal = pannesParVersant * nbVersants;
  const ldPanne = Lb + depassement;
  const ldTotal = nTotal * ldPanne;
  
  const brutPieces = ldTotal / lc;
  
  let ajout = pertes;
  if (pertes < 1 && pertes > 0) {
    ajout = brutPieces * pertes;
  }
  
  const totalPiecesBrut = brutPieces + ajout;
  const qte = Math.ceil(totalPiecesBrut);

  return creerResultat(
    "Pannes",
    "N_total × LD_panne / LC",
    `${nTotal} × ${ldPanne} / ${lc} + ${ajout}`,
    totalPiecesBrut,
    qte,
    "pièces",
    { nTotal, ldPanne, ldTotal, pannesParVersant }
  );
}

export function calculateChevronsLD(Lb, L, espacement, lc) {
  const nLong = Math.ceil(L / espacement) + 1;
  const ldLong = nLong * Lb;
  
  const nTrans = Math.ceil(Lb / espacement) + 1;
  const ldTrans = nTrans * L;
  
  const ldTotal = ldLong + ldTrans;
  const resultBrut = ldTotal / lc;
  const qte = Math.ceil(resultBrut);
  
  return creerResultat(
    "Chevrons",
    "LD_total / LC",
    `${ldTotal} / ${lc}`,
    resultBrut,
    qte,
    "pièces",
    { ldTotal, nLong, nTrans }
  );
}

export function calculateCouverture(surface, toleL, tolel, recouvL, recouvT, clousParTole, clousParKg) {
  const su = (toleL - recouvL) * (tolel - recouvT);
  const nTolesBrut = surface / su;
  const nToles = Math.ceil(nTolesBrut);
  
  const toles = creerResultat(
    "Tôles",
    "Sc / Su",
    `${surface} / ${su.toFixed(4)}`,
    nTolesBrut,
    nToles,
    "pièces",
    { surface, su }
  );
  
  const nClous = nToles * clousParTole;
  const kgClousBrut = nClous / clousParKg;
  const kgClous = Math.ceil(kgClousBrut);
  
  const clous = creerResultat(
    "Clous de toiture",
    "(N_tôles × clous/tôle) / clous/kg",
    `(${nToles} × ${clousParTole}) / ${clousParKg}`,
    kgClousBrut,
    kgClous,
    "kg",
    { nClous }
  );
  
  return { toles, clous };
}

export function calculatePlafond(pieces, lTriplex, lLargTriplex, pertesL, pertesT) {
  let scTotal = 0;
  pieces.forEach(p => {
    scTotal += (p.longueur * p.largeur);
  });
  
  const su = (lTriplex - pertesL) * (lLargTriplex - pertesT);
  const nBrut = scTotal / su;
  const n = Math.ceil(nBrut);
  
  return creerResultat(
    "Triplex plafond",
    "Sc_total / Su",
    `${scTotal} / ${su.toFixed(4)}`,
    nBrut,
    n,
    "pièces",
    { scTotal, su }
  );
}

export function calculerMetreToitureComplet(donnees) {
  const Lb = Number(donnees.Lb) || 0;
  const L = Number(donnees.L) || 0;
  const hauteur = Number(donnees.hauteur) || 0;
  const demiPortee = L / 2;
  const nbVersants = Number(donnees.nbVersants) || 2;
  const debordToiture = Number(donnees.debordToiture) || 0;
  const debordTole = Number(donnees.debordTole) || 0;
  
  const espFermes = Number(donnees.espFermes) || 2.5;
  const espPannes = Number(donnees.espPannes) || 0.9;
  const lcBois = Number(donnees.lcBois) || 5;
  
  const ldFerme = Number(donnees.ldFerme) || 50.35;
  const pertesMadriers = Number(donnees.pertesMadriers) || 2;
  const depassementPanne = Number(donnees.depassementPanne) || 0.3;
  const pertesPannes = Number(donnees.pertesPannes) || 2;
  
  const toleLong = Number(donnees.toleLong) || 3.05;
  const toleLarg = Number(donnees.toleLarg) || 0.80;
  const recouvL = Number(donnees.recouvL) || 0.20;
  const recouvT = Number(donnees.recouvT) || 0.10;
  const clousParTole = Number(donnees.clousParTole) || 9;
  const clousParKg = Number(donnees.clousParKg) || 58;
  
  const pieces = donnees.piecesPlafond || [];
  const triplexLong = Number(donnees.triplexLong) || 2.44;
  const triplexLarg = Number(donnees.triplexLarg) || 1.22;
  const pertesTriplexL = Number(donnees.pertesTriplexL) || 0.44;
  const pertesTriplexT = Number(donnees.pertesTriplexT) || 0.12;
  
  const resultats = {
    charpente: [],
    couverture: [],
    plafond: []
  };
  
  const fermes = calculateFermes(Lb, espFermes);
  resultats.charpente.push(fermes);
  
  const madriers = calculateMadriers(ldFerme, fermes.quantite_finale, lcBois, pertesMadriers);
  resultats.charpente.push(madriers);
  
  const versantGeometrique = calculateRoofSlope(demiPortee, hauteur, 0);
  const versantAvecDebord = versantGeometrique.quantite_finale + debordToiture;
  
  const pannes = calculatePannes(versantAvecDebord, espPannes, nbVersants, Lb, depassementPanne, lcBois, pertesPannes);
  resultats.charpente.push(pannes);
  
  const chevrons = calculateChevronsLD(Lb, L, Number(donnees.espChevrons || 1), lcBois);
  resultats.charpente.push(chevrons);
  
  if (donnees.kgClousCharpente) {
     resultats.charpente.push(creerResultat("Clous de charpente", "Saisie manuelle", "-", Number(donnees.kgClousCharpente), Number(donnees.kgClousCharpente), "kg"));
  }
  
  const versantTole = versantAvecDebord + debordTole;
  const surfaceCouverture = Lb * versantTole * nbVersants;
  
  const couvertureResult = calculateCouverture(surfaceCouverture, toleLong, toleLarg, recouvL, recouvT, clousParTole, clousParKg);
  resultats.couverture.push(couvertureResult.toles);
  resultats.couverture.push(couvertureResult.clous);
  
  if (pieces.length > 0) {
    const plafondResult = calculatePlafond(pieces, triplexLong, triplexLarg, pertesTriplexL, pertesTriplexT);
    resultats.plafond.push(plafondResult);
    
    let Lb_plaf = 0, L_plaf = 0;
    pieces.forEach(p => {
       Lb_plaf = Math.max(Lb_plaf, p.longueur);
       L_plaf = Math.max(L_plaf, p.largeur);
    });
    const chevronsPlafond = calculateChevronsLD(Lb_plaf, L_plaf, Number(donnees.espChevronsPlafond || 1), lcBois);
    chevronsPlafond.designation = "Chevrons plafond";
    resultats.plafond.push(chevronsPlafond);
  }
  
  return resultats;
}
