import { PARAMETRES } from './parametres.js';

const DECIMALES = 6;
function net(x) {
  return Math.round(x * 10 ** DECIMALES) / 10 ** DECIMALES;
}

export function recouvrement(diametre_mm, nuance) {
  const coef = PARAMETRES.nuancesAcier[nuance]?.coefficientRecouvrement || 40;
  return net((diametre_mm / 1000) * coef);
}

/**
 * Poids au metre : la table du classeur de reference v7
 * (`Parametres!A38`, « ACIERS A HAUTE ADHERENCE - POIDS PAR METRE », guide p.20),
 * et non la formule d'atelier Ø²/162.
 *
 * Les deux coincident presque partout, mais divergent sur le Ø12, le diametre le
 * plus courant en chainage : 144/162 = 0,8889 kg/m contre 0,880 dans la table,
 * soit 1 % d'ecart sur tout l'acier d'un chantier. C'est la table qui fait foi.
 */
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

export function calculerBlocArmature({ designation, diametre, nuance, nombreDeFilesTotal, longueurDeveloppee, espacement, overrides = {}, tracePrefix = '', traceFormule = '' }) {
  // Application des overrides
  let Ld = overrides.Ld != null ? overrides.Ld : longueurDeveloppee;
  let Ls = overrides.Ls != null ? overrides.Ls : recouvrement(diametre, nuance);
  let files = overrides.nombreDeFiles != null ? overrides.nombreDeFiles : nombreDeFilesTotal;

  Ld = net(Ld);
  Ls = net(Ls);

  const nbBarres = nombreBarresCommerciales(Ld, Ls, files, PARAMETRES.armatures.longueurBarreUtile, PARAMETRES.armatures.longueurBarreCommerciale);
  const masseLin = poidsAuMetre(diametre);

  /**
   * On pese ce qu'on achete, pas ce qui finit dans le beton.
   *
   * Le classeur v7 compte des barres entieres de 12 m (`ROUNDUP` sur la colonne
   * « Nbre barres 12m », longueur utile 11,5 m), et les prix de la bibliotheque
   * sont libelles « barre 12m ». Peser la longueur theorique sous-estimait donc
   * l'acier a commander de toute la chute — et c'est precisement pour cela que
   * la majoration acier est ramenee a 1,00 : la chute est deja portee par le
   * debit sur barres entieres. Compter theorique ET sans majoration aurait fait
   * disparaitre la chute deux fois.
   */
  const poids = poidsArmature(nbBarres, diametre, PARAMETRES.armatures.longueurBarreCommerciale);
  const longueurTotale = net(files * Ld);

  const prefix = tracePrefix ? `${tracePrefix}\n` : '';
  const finalFormule = traceFormule || `Poids = Nbre barres 12 m × 12 m × poids au mètre`;

  const trace = {
    formule: finalFormule,
    calculText: `${prefix}LT théorique = ${files} × ${Ld} m = ${longueurTotale} m`
      + `\nDébit = ${nbBarres} barre(s) de 12 m`
      + `\nPoids = ${nbBarres} × 12 m × ${masseLin} kg/m = ${poids} kg`,
    entrees: { diametre, nuance, files, Ld, Ls, masseLin, longueurTotale, nbBarres },
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
