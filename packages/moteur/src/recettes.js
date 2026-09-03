import { _internes as moteurInternes } from './metre.js';
import { PARAMETRES } from './parametres.js';
import { calculerCoffrage as computeCoffrage } from './coffrage.js';

const { net } = moteurInternes;

/** 
 * Ajoute une quantité à un dictionnaire de matériaux. 
 * Les clés sont construites par type de matériau.
 */
function ajouterMateriau(recettes, categorie, materiau, unite, quantiteNette, regles = {}) {
  if (!quantiteNette) return;
  
  if (!recettes[materiau]) {
    recettes[materiau] = { categorie, quantiteNette: 0, quantite: 0, unite };
  }
  recettes[materiau].quantiteNette = net(recettes[materiau].quantiteNette + quantiteNette);
  
  // Majoration (achat uniquement)
  const majoration = regles?.majorations?.[materiau] || PARAMETRES.majorations?.[materiau] || 1.0;
  recettes[materiau].quantite = net(recettes[materiau].quantiteNette * majoration);
}

/** Calcule les recettes de béton pour un bloc donné. */
function calculerRecetteBeton(recettes, blocId, bloc, dosage, regles = {}) {
  if (!bloc || !bloc.total) return;
  
  // Ciment en sacs : arrondi au sac supérieur PAR OUVRAGE (= par ligne), puis
  // somme. C'est la règle du classeur Excel. Un arrondi sur le total du bloc
  // sous-estime la commande de ciment.
  let sacsCiment = 0;
  if (bloc.lignes && bloc.lignes.length > 0) {
    for (const l of bloc.lignes) {
      if (l.valeur > 0) {
        sacsCiment += Math.ceil((l.valeur * dosage) / PARAMETRES.beton.poidsSacCiment);
      }
    }
  } else {
    // Fallback si pas de lignes (blocs synthétiques)
    sacsCiment = Math.ceil((bloc.total * dosage) / PARAMETRES.beton.poidsSacCiment);
  }

  ajouterMateriau(recettes, 'ciment', 'ciment', 'sac', sacsCiment, regles);
  
  const volume = bloc.total;

  // Sable en tonnes
  const volumeSable = volume * PARAMETRES.beton.sableParM3;
  const tonnesSable = volumeSable * PARAMETRES.beton.densiteSable;
  ajouterMateriau(recettes, 'sable', 'sable', 't', tonnesSable, regles);
  
  // Gravier en tonnes
  const volumeGravier = volume * PARAMETRES.beton.gravierParM3;
  const tonnesGravier = volumeGravier * PARAMETRES.beton.densiteGravier;
  ajouterMateriau(recettes, 'gravier', 'gravier', 't', tonnesGravier, regles);

  // Eau en litres (kg ciment / 2) -> Le classeur indique Volume x dosage / 2
  const litresEau = (volume * dosage) / PARAMETRES.beton.eauParDosage;
  ajouterMateriau(recettes, 'eau', 'eau', 'L', litresEau, regles);
}

/** Calcule le coffrage pour un bloc. */
function calculerCoffrage(recettes, blocId, bloc) {
  if (!bloc) return;

  let planchesNet = 0;
  let planches = 0;
  let chevrons = 0;
  let clous = 0;

  if (bloc.lignes && bloc.lignes.length > 0) {
    for (const l of bloc.lignes) {
      if (l.coffrage) {
        planchesNet += l.coffrage.planchesNet || 0;
        planches += l.coffrage.planches || 0;
        chevrons += l.coffrage.chevrons || 0;
        clous += l.coffrage.clous || 0;
      }
    }
  }

  if (planches > 0) {
    // On met à jour directement pour ne pas subir la majoration standard de ajouterMateriau
    if (!recettes['planches']) recettes['planches'] = { categorie: 'bois', quantiteNette: 0, quantite: 0, unite: 'u' };
    recettes['planches'].quantiteNette = net(recettes['planches'].quantiteNette + planchesNet);
    recettes['planches'].quantite += planches;

    if (!recettes['chevrons']) recettes['chevrons'] = { categorie: 'bois', quantiteNette: 0, quantite: 0, unite: 'u' };
    recettes['chevrons'].quantiteNette += chevrons;
    recettes['chevrons'].quantite += chevrons;

    if (!recettes['clous']) recettes['clous'] = { categorie: 'clous', quantiteNette: 0, quantite: 0, unite: 'kg' };
    recettes['clous'].quantiteNette = net(recettes['clous'].quantiteNette + clous);
    recettes['clous'].quantite = net(recettes['clous'].quantite + clous);
  }
}

/** Calcule l'acier pour un bloc (rétrocompatibilité si ratios fixes utilisés, mais on utilise le métré analytique normalement). */
function calculerAcier(recettes, blocId, bloc) {
  if (!bloc || !bloc.total) return;
  
  let poidsAcierTotal = 0;
  if (bloc.lignes) {
    for (const l of bloc.lignes) {
      if (l.poidsAcier) poidsAcierTotal += l.poidsAcier;
    }
  }
  
  if (poidsAcierTotal > 0) {
    // 5% du poids d'acier de CET ouvrage pour le fil de ligature
    // PARAMETRES.armatures.filLigaturePct
    const filLigature = net(poidsAcierTotal * 0.05);
    ajouterMateriau(recettes, 'acier', 'filLigature', 'kg', filLigature, null);
  }
}

/**
 * Calcule toutes les recettes de matériaux à partir d'un métré.
 * 
 * @param {object} blocs  Les blocs issus de calculerMetre()
 * @param {object} regles  Les règles et majorations personnalisées
 * @returns {object} Un dictionnaire des quantités par matériau
 */
export function calculerRecettes(blocs, regles = {}) {
  const recettes = {};

  // 1. Béton de propreté
  if (blocs.betonProprete?.total) {
    calculerRecetteBeton(recettes, 'betonProprete', blocs.betonProprete, PARAMETRES.dosages.betonProprete, regles);
  }

  // 2. Béton armé (semelles, longrines, colonnes, ceintures, linteaux, escalier, poteaux, poutres, dalles, acrotere)
  const blocsBA = ['semelles', 'longrines', 'colonnes', 'ceintures', 'linteaux', 'escalier', 'poteaux', 'poutres', 'dalles', 'acrotere'];
  for (const blocId of blocsBA) {
    if (blocs[blocId]?.total) {
      calculerRecetteBeton(recettes, blocId, blocs[blocId], PARAMETRES.dosages.betonArme, regles);
      calculerAcier(recettes, blocId, blocs[blocId]);
      calculerCoffrage(recettes, blocId, blocs[blocId]);
    }
  }

  // 2b. Autres bétons
  if (blocs.chapeEgalisation?.total) {
    calculerRecetteBeton(recettes, 'chapeEgalisation', blocs.chapeEgalisation, 250, regles);
    calculerCoffrage(recettes, 'chapeEgalisation', blocs.chapeEgalisation);
  }
  if (blocs.sousPavement?.total) {
    calculerRecetteBeton(recettes, 'sousPavement', blocs.sousPavement, 250, regles);
  }

  // 2c. Moellon
  if (blocs.moellon?.total) {
    const volume = blocs.moellon.total;
    const tonnesMoellon = volume * 0.70 * 1.60;
    ajouterMateriau(recettes, 'pierre', 'moellon', 't', tonnesMoellon, regles);
    
    // Mortier
    let sacsCiment = 0;
    let volumeMortier = 0;
    if (blocs.moellon.lignes && blocs.moellon.lignes.length > 0) {
      for (const ligne of blocs.moellon.lignes) {
        if (ligne.valeur > 0) {
          const volMortierLigne = ligne.valeur * 0.30;
          volumeMortier += volMortierLigne;
          sacsCiment += Math.ceil((volMortierLigne * 250) / 50);
        }
      }
    } else {
      volumeMortier = volume * 0.30;
      sacsCiment = (volumeMortier * 250) / 50;
    }
    ajouterMateriau(recettes, 'ciment', 'ciment', 'sac', sacsCiment, regles);
    
    const sableMortier = volumeMortier * 1.0 * 1.50;
    ajouterMateriau(recettes, 'sable', 'sable', 't', sableMortier, regles);
    
    const eauMortier = sacsCiment * 50 * 0.5;
    ajouterMateriau(recettes, 'eau', 'eau', 'L', eauMortier, regles);
  }
  
  // 3. Maçonnerie (agglos creux)
  if (blocs.maconnerie?.lignes) {
    let nbAgglosNet = 0;
    let volumeMortier = 0;
    let sacsCimentMortier = 0;
    
    for (const l of blocs.maconnerie.lignes) {
       if (l.nombreBlocsNet) nbAgglosNet += l.nombreBlocsNet;
       if (l.volumeMortier) {
         volumeMortier += l.volumeMortier;
         sacsCimentMortier += Math.ceil((l.volumeMortier * 300) / 50); // Exactement la formule : ROUNDUP(Volume mortier x 300 / 50)
       }
    }
    
    ajouterMateriau(recettes, 'agglos', 'blocs', 'u', nbAgglosNet, regles);
    ajouterMateriau(recettes, 'ciment', 'ciment', 'sac', sacsCimentMortier, regles);
    
    const tonnesSableMortier = volumeMortier * 1.0 * 1.50; // Sable(t) = Volume mortier x 1.0 x 1.50
    ajouterMateriau(recettes, 'sable', 'sable', 't', tonnesSableMortier, regles);
    
    const eauMortierL = sacsCimentMortier * 50 * 0.5; // Eau(L) = Ciment(kg) x 0.5
    ajouterMateriau(recettes, 'eau', 'eau', 'L', eauMortierL, regles);
  }

  // 3b. Murs de soubassement (agglos pleins). Meme mecanique que la maconnerie,
  // mais sur une ligne de materiau distincte : un agglo plein n'a ni le meme
  // prix ni le meme fournisseur qu'un agglo creux.
  if (blocs.soubassement?.lignes) {
    let nbAgglosNet = 0;
    let volumeMortier = 0;
    let sacsCimentMortier = 0;

    for (const l of blocs.soubassement.lignes) {
       if (l.nombreBlocsNet) nbAgglosNet += l.nombreBlocsNet;
       if (l.volumeMortier) {
         volumeMortier += l.volumeMortier;
         sacsCimentMortier += Math.ceil((l.volumeMortier * 300) / 50);
       }
    }

    ajouterMateriau(recettes, 'agglos_pleins', 'blocs_pleins', 'u', nbAgglosNet, regles);
    ajouterMateriau(recettes, 'ciment', 'ciment', 'sac', sacsCimentMortier, regles);

    const tonnesSableMortier = volumeMortier * 1.0 * 1.50;
    ajouterMateriau(recettes, 'sable', 'sable', 't', tonnesSableMortier, regles);

    const eauMortierL = sacsCimentMortier * 50 * 0.5;
    ajouterMateriau(recettes, 'eau', 'eau', 'L', eauMortierL, regles);
  }

  // 4. Enduits
  if (blocs.enduits) {
    let sacsCimentEnduit = 0;
    if (blocs.enduits.lignes && blocs.enduits.lignes.length > 0) {
      for (const l of blocs.enduits.lignes) {
        if (l.valeur) sacsCimentEnduit += Math.ceil((l.valeur * 8) / 50);
      }
    } else if (blocs.enduits.total > 0) {
      sacsCimentEnduit = Math.ceil((blocs.enduits.total * 8) / 50);
    }
    
    if (sacsCimentEnduit > 0) {
      ajouterMateriau(recettes, 'ciment', 'ciment', 'sac', sacsCimentEnduit, regles);
      
      const cimentReelKg = sacsCimentEnduit * 50;
      // Sable(t) = (Ciment(kg) / 300) x 1.0 x 1.50
      const tonnesSableEnduit = (cimentReelKg / 300) * 1.0 * 1.50;
      ajouterMateriau(recettes, 'sable', 'sable', 't', tonnesSableEnduit, regles);
      
      // Eau(L) = Ciment(kg) x 0.5
      const eauEnduitL = cimentReelKg * 0.5;
      ajouterMateriau(recettes, 'eau', 'eau', 'L', eauEnduitL, regles);
    }
  }
  
  // Peinture (la UI ou metre.js stocke typePeinture)
  if (blocs.peinture?.lignes) {
    for (const p of blocs.peinture.lignes) {
       if (!p.valeur) continue;
       const surface = p.valeur;
       if (p.typePeinture === 'classique') {
          ajouterMateriau(recettes, 'peinture', 'peinture_classique', 'L', (surface / 10) * 2, regles);
       } else if (p.typePeinture === 'chaux') {
          ajouterMateriau(recettes, 'peinture', 'peinture_chaux', 'kg', (surface / 6) * 2, regles);
       } else { // latex
          ajouterMateriau(recettes, 'peinture', 'peinture_latex', 'kg', surface / 4, regles);
       }
    }
  }
  
  // 5. Carrelage et Faïence
  if (blocs.carrelage?.total) {
    const surface = blocs.carrelage.total;
    const epaisseur = blocs.carrelage.epaisseurCarrelage || 0.03;
    
    // Carreaux = ROUNDUP(Surface / 0.09) (net)
    const nbCarreauxNet = Math.ceil(surface / 0.09);
    ajouterMateriau(recettes, 'carrelage', 'carreaux', 'u', nbCarreauxNet, regles);
    
    // Ciment colle(kg) = Surface x 8
    ajouterMateriau(recettes, 'cimentColle', 'cimentColle', 'kg', surface * 8, regles);
    
    // Sable du mortier de pose(t) = Surface x epaisseur_m x 100 * 10 * 1.50 / 1000 = Surface * epaisseur * 1.50
    const ep_cm = epaisseur * 100;
    const sableMortierPose = (surface * ep_cm * 10 * 1.50) / 1000;
    ajouterMateriau(recettes, 'sable', 'sable', 't', sableMortierPose, regles);

    // Ciment du mortier de pose(sacs) = ROUNDUP(Surface x epaisseur_m x 300 / 50)
    const cimentMortierPose = Math.ceil((surface * epaisseur * 300) / 50);
    ajouterMateriau(recettes, 'ciment', 'ciment', 'sac', cimentMortierPose, regles);
  }
  
  if (blocs.carrelage?.perimetreTotal) {
    const piecesPlinthe = blocs.carrelage.perimetreTotal / 0.4; // 0.4m par plinthe
    ajouterMateriau(recettes, 'plinthe', 'plinthe', 'u', piecesPlinthe, regles);
  }
  
  if (blocs.faience?.total) {
    const surface = blocs.faience.total;
    
    // Faïences = ROUNDUP(Surface / 0.10) net
    const nbFaiencesNet = Math.ceil(surface / 0.10);
    ajouterMateriau(recettes, 'carrelage', 'faience', 'u', nbFaiencesNet, regles);
    
    // Ciment colle(kg) = Surface x 8
    ajouterMateriau(recettes, 'cimentColle', 'cimentColle', 'kg', surface * 8, regles);
  }

  // Ajout des armatures calculées (qui viennent de metre.js)
  if (blocs.armatures?.lignes) {
    for (const ligne of blocs.armatures.lignes) {
      ajouterMateriau(recettes, 'acier', ligne.id, ligne.unite, ligne.quantite, regles);
    }
  }

  // 6. Charpente Bois
  if (blocs.charpenteBois?.total) {
    const volumeBois = blocs.charpenteBois.total;
    ajouterMateriau(recettes, 'bois', 'bois_charpente', 'm3', volumeBois, regles);
    
    const clousCharpente = volumeBois * PARAMETRES.clous.charpente;
    ajouterMateriau(recettes, 'clous', 'clous_charpente', 'kg', clousCharpente, regles);
  }

  // 7. Toiture et Plafond
  if (blocs.couvertureToles?.lignes) {
    let surfaceToles = 0;
    for (const l of blocs.couvertureToles.lignes) {
      if (l.valeur) surfaceToles += l.valeur;
    }
    
    // Tôles
    const nbreTolesBase = surfaceToles / (PARAMETRES.couverture.largeurUtileTole * PARAMETRES.couverture.longueurTole);
    ajouterMateriau(recettes, 'toles', 'toles', 'u', nbreTolesBase * 2, regles);
    
    // Faîtières
    if (blocs.couvertureToles.lignes && blocs.couvertureToles.lignes.length > 0) {
      let faitieres = 0;
      for (const l of blocs.couvertureToles.lignes) {
        const longueur = l.trace?.entrees?.longueur;
        if (longueur) {
          faitieres += Math.ceil(longueur / PARAMETRES.couverture.longueurFaitiere) + 1;
        }
      }
      if (faitieres > 0) {
        ajouterMateriau(recettes, 'toles', 'faitieres', 'u', faitieres, regles);
      }
    }
    
    // Clous
    const clousToiture = surfaceToles * 2 * PARAMETRES.clous.couverture;
    ajouterMateriau(recettes, 'clous', 'clous_toiture', 'kg', clousToiture, regles);
  }

  // 8. Maçonnerie d'Acrotère
  if (blocs.acrotere?.totalSurfaceMac) {
    const surfaceMac = blocs.acrotere.totalSurfaceMac;
    // Utiliser la même règle que la maçonnerie classique (12.5 blocs par m2 environ, cf guide. Ici on recrée si nécessaire, ou on utilise le P.U au m2).
    // Si la recette "maconnerie" calculait par ligne, ici on peut simplement s'appuyer sur la surface.
    // D'après le code existant de maconnerie, le moteur le gère soit par l'outil de maconnerie, soit par m2.
    // "maçonnerie 20.16 m2" -> Le test s'attend à quoi pour les matériaux ?
    // Le test dit "maçonnerie 20.16 m2 · enduits 40.32 m2". Cela veut dire qu'il n'y a pas de matériaux spécifiques calculés, ce sont des ouvrages vendus au m2.
    // L'ajout dans les recettes n'est donc pas nécessaire si c'est géré en prestation dans le résumé.
  }

  // Apports de moteur_saas.js : Quantité Commerciale et Brouettes
  for (const m in recettes) {
    const mat = recettes[m];
    mat.quantiteCommande = Math.ceil(mat.quantite);

    if (m === 'sable') {
      const volSableNet = mat.quantiteNette / PARAMETRES.beton.densiteSable;
      const volSable = mat.quantite / PARAMETRES.beton.densiteSable;
      mat.brouettesNette = net(volSableNet / PARAMETRES.beton.volumeBrouette);
      mat.brouettes = net(volSable / PARAMETRES.beton.volumeBrouette);
    }
    if (m === 'gravier') {
      const volGravierNet = mat.quantiteNette / PARAMETRES.beton.densiteGravier;
      const volGravier = mat.quantite / PARAMETRES.beton.densiteGravier;
      mat.brouettesNette = net(volGravierNet / PARAMETRES.beton.volumeBrouette);
      mat.brouettes = net(volGravier / PARAMETRES.beton.volumeBrouette);
    }
  }

  return recettes;
}
