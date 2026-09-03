import { PARAMETRES } from './parametres.js';

const DECIMALES = 6;
function net(x) {
  return Math.round(x * 10 ** DECIMALES) / 10 ** DECIMALES;
}

export function recouvrement(diametre_mm, nuance) {
  const coef = PARAMETRES.nuancesAcier[nuance]?.coefficientRecouvrement || 40;
  return net((diametre_mm / 1000) * coef);
}

export function poidsAuMetre(diametre_mm) {
  const p = PARAMETRES.aciersPoidsLineique[diametre_mm];
  if (p === undefined) {
    throw new Error(`Le diamètre ${diametre_mm}mm n'existe pas dans la table des poids.`);
  }
  return p;
}

export function nombreBarresCommerciales(longueurDeveloppee, recouvrement, nombreDeFilesTotal, longueurUtile = 11.5, longueurCommerciale = 12) {
  if (longueurDeveloppee <= 0) return null;
  
  if (longueurDeveloppee <= longueurUtile) {
    const piecesParBarre = Math.max(1, Math.floor(longueurUtile / longueurDeveloppee));
    return Math.ceil(nombreDeFilesTotal / piecesParBarre);
  } else {
    const longueurDepassement = longueurDeveloppee + recouvrement - longueurUtile;
    const piecesRaccordParBarre = Math.max(1, Math.floor(longueurUtile / longueurDepassement));
    const barresDeRaccord = Math.ceil(nombreDeFilesTotal / piecesRaccordParBarre);
    return nombreDeFilesTotal + barresDeRaccord;
  }
}

export function poidsArmature(nombreBarresCommerciales, diametre_mm, longueurCommerciale = 12) {
  if (!nombreBarresCommerciales) return 0;
  return net(nombreBarresCommerciales * longueurCommerciale * poidsAuMetre(diametre_mm));
}

export function filDeLigature(poidsTotalDesAciers) {
  if (!poidsTotalDesAciers) return 0;
  return net(poidsTotalDesAciers * PARAMETRES.armatures.filLigaturePct);
}

export function calculerBlocArmature({ designation, diametre, nuance, nombreDeFilesTotal, longueurDeveloppee, espacement, overrides = {} }) {
  // Application des overrides
  let Ld = overrides.Ld != null ? overrides.Ld : longueurDeveloppee;
  let Ls = overrides.Ls != null ? overrides.Ls : recouvrement(diametre, nuance);
  let files = overrides.nombreDeFiles != null ? overrides.nombreDeFiles : nombreDeFilesTotal;

  Ld = net(Ld);
  Ls = net(Ls);

  const nbBarres = nombreBarresCommerciales(Ld, Ls, files, PARAMETRES.armatures.longueurBarreUtile, PARAMETRES.armatures.longueurBarreCommerciale);
  const poids = poidsArmature(nbBarres, diametre, PARAMETRES.armatures.longueurBarreCommerciale);

  const trace = {
    formule: nbBarres != null ? `barres = ceil(${files} files / pieces_par_barre)` : 'Ld <= 0',
    entrees: { diametre, nuance, files, Ld, Ls },
    resultat: poids,
    unite: 'kg',
    avertissements: []
  };

  // Calcul de la chute
  if (Ld > 0 && Ld <= PARAMETRES.armatures.longueurBarreUtile) {
    const piecesParBarre = Math.max(1, Math.floor(PARAMETRES.armatures.longueurBarreUtile / Ld));
    const chute = PARAMETRES.armatures.longueurBarreCommerciale - (piecesParBarre * Ld);
    if (chute > 1 && chute < PARAMETRES.armatures.longueurBarreCommerciale) {
      trace.avertissements.push(`Attention : Chaque barre de 12 m coupée génère une chute de ${net(chute)} m.`);
    }
  } else if (Ld > PARAMETRES.armatures.longueurBarreCommerciale && Ls === 0) {
    trace.avertissements.push(`Impossible : Longueur développée (${Ld}m) supérieure à une barre du commerce sans recouvrement possible.`);
  }

  return {
    designation,
    diametre,
    nuance,
    espacement,
    nombreDeFiles: files,
    longueurDeveloppee: Ld,
    recouvrement: Ls,
    nombreBarres12m: nbBarres,
    poids,
    trace,
    overrides
  };
}
