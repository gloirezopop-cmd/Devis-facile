import { _internes as moteurInternes } from './metre.js';
import { PARAMETRES } from './parametres.js';
import { calculerCoffrage } from './coffrage.js';

const { net } = moteurInternes;

/** 
 * Ajoute une quantité à un dictionnaire de matériaux (utilisé par calculerRecettes).
 */
function ajouterMateriau(recettes, categorie, materiau, unite, quantiteNette, regles = {}) {
  if (!quantiteNette) return;
  
  if (!recettes[materiau]) {
    recettes[materiau] = { categorie, quantiteNette: 0, quantite: 0, unite };
  }
  recettes[materiau].quantiteNette = net(recettes[materiau].quantiteNette + quantiteNette);
  
  // Majoration (achat uniquement)
  // Pour le coffrage (bois), on n'applique pas de majoration globale ici si elle a été faite avant, 
  // mais dans l'ancienne logique, planchesNet vs planches gérait ça. 
  // On gérera ça au moment de l'ajout.
  const majoration = regles?.majorations?.[materiau] || PARAMETRES.majorations?.[materiau] || 1.0;
  recettes[materiau].quantite = net(recettes[materiau].quantiteNette * majoration);
}

/**
 * UNIQUE SOURCE DE VÉRITÉ POUR LA DÉCOMPOSITION DES MATÉRIAUX.
 * Retourne un tableau détaillant tous les matériaux nécessaires pour réaliser le bloc donné.
 */
export function obtenirDecompositionOuvrage(blocId, bloc, regles = {}) {
  const decomp = [];
  if (!bloc || (!bloc.total && (!bloc.lignes || bloc.lignes.length === 0))) return decomp;

  const add = (id_materiau, categorie, nom, unite, quantiteNette, formule, calcul, motif_arrondi = 'Valeur exacte', valeur_arrondie = null, donnees = {}) => {
    if (!quantiteNette) return;
    decomp.push({
      id_materiau, categorie, nom, unite,
      quantiteNette, 
      valeur_brute: quantiteNette,
      valeur_arrondie: valeur_arrondie !== null ? valeur_arrondie : net(quantiteNette),
      formule, calcul, motif_arrondi, donnees
    });
  };

  const volume = bloc.total || 0;

  // --- 1. COFFRAGE (Commun aux bétons) ---
  if (bloc.lignes && bloc.lignes.length > 0) {
    for (const l of bloc.lignes) {
      if (l.coffrage) {
        const coffrage = l.coffrage;
        const repereText = l.repere ? ` (${l.repere})` : '';
        add('planches', 'bois', `Planches de coffrage${repereText}`, 'u', coffrage.planchesNet, 'Calcul analytique des planches', coffrage.trace.traceTextPlanches, 'Arrondi supérieur', coffrage.planches, { quantite_majoree: coffrage.planches });
        add('chevrons', 'bois', `Chevrons 5x5${repereText}`, 'u', coffrage.chevrons, 'Calcul analytique des chevrons', coffrage.trace.traceTextChevrons, 'Arrondi supérieur', coffrage.chevrons, { quantite_majoree: coffrage.chevrons });
        add('clous', 'clous', `Clous de coffrage${repereText}`, 'kg', coffrage.clous, 'Calcul analytique des clous', coffrage.trace.traceTextClous, 'Valeur exacte', coffrage.clous, { quantite_majoree: coffrage.clous });
      }
    }
  }

  // --- 1.5 FOISONNEMENT DES DEBLAIS ---
  if (['fouilles', 'fouilleFilante', 'terrassementGrandeSurface'].includes(blocId) && volume > 0) {
    // Meme coefficient que le classeur v7 (CT_TASSEMENT = 1,3, Parametres!C74).
    const cf = PARAMETRES.coefficients.coefficientTassement || 1.30;
    const deblaisFoisonne = volume * cf;
    add(
      'deblais_foisonne',
      'terrassement',
      'Volume foisonné (Déblais)',
      'm³',
      deblaisFoisonne,
      'Volume net × Coefficient de foisonnement',
      `Volume géométrique = ${net(volume, 3)} m³\nCoeff. de foisonnement = ${cf}\nVolume = ${net(volume, 3)} × ${cf} = ${net(deblaisFoisonne, 3)} m³`,
      'Valeur exacte',
      deblaisFoisonne
    );
  }

  // --- 2. ARMATURES (Commun aux bétons armés) ---
  let poidsAcierTotal = 0;
  if (bloc.lignes) {
    for (const l of bloc.lignes) {
      if (l.poidsAcier) poidsAcierTotal += l.poidsAcier;
      
      if (l.detailsArmatures) {
        for (const a of l.detailsArmatures) {
          const repereArmature = l.repere ? ` (${l.repere})` : '';
          add(
            `acier_${a.diametre}`,
            'acier',
            `Fer Ø${a.diametre} (${a.designation})${repereArmature}`,
            'u',
            a.nombreBarres12m,
            a.trace?.formule || 'Calcul ferraillage',
            a.trace?.calculText || `Poids: ${net(a.poids)} kg`,
            'Arrondi par barre de 12m',
            a.nombreBarres12m,
            { diametre: a.diametre }
          );
        }
      }
    }
  }
  if (poidsAcierTotal > 0) {
    add('filLigature', 'acier', 'Fil de ligature', 'kg', poidsAcierTotal * 0.05, '5% du poids d\'acier', `${net(poidsAcierTotal)} × 0.05`);
  }
  // Armatures explicites (issues du bloc 'armatures')
  if (blocId === 'armatures' && bloc.lignes) {
    for (const ligne of bloc.lignes) {
      add(ligne.id, 'acier', ligne.id.toUpperCase(), ligne.unite, ligne.quantite, 'Calcul de ferraillage', 'Poids total des barres');
    }
  }

  // --- 3. BETON ---
  const isBetonArme = ['semelles', 'amorces', 'longrines', 'colonnes', 'ceintures', 'linteaux', 'escalier', 'poteaux', 'poutres', 'dalles', 'acrotere'].includes(blocId);
  const isBetonProprete = blocId === 'betonProprete';
  const isAutresBeton = ['sousPavement', 'chapeEgalisation'].includes(blocId);

  if (isBetonArme || isBetonProprete || isAutresBeton) {
    const fallbackDosage = isBetonProprete ? PARAMETRES.dosages.betonProprete : (isBetonArme ? PARAMETRES.dosages.betonArme : 250);
    const defaultDosage = regles?.dosages?.[blocId] || fallbackDosage;
    const defaultCimentType = regles?.cimentTypes?.[blocId] || '42.5';
    const poidsSac = PARAMETRES.beton.poidsSacCiment || 50;
    
    // Ciment : somme des arrondis par ligne
    let sacsCimentNet = 0;
    if (bloc.lignes && bloc.lignes.length > 0) {
      for (const l of bloc.lignes) {
        if (l.valeur > 0) sacsCimentNet += Math.ceil((l.valeur * defaultDosage) / poidsSac);
      }
      add('ciment', 'ciment', `Ciment (${defaultCimentType})`, 'sac', sacsCimentNet, 'Somme(ArrondiSup(Volume ligne × Dosage / Poids sac))', `Vol. Total = ${net(volume, 3)} m³\nSacs = somme des arrondis par élément = ${sacsCimentNet} sacs`, 'Arrondi supérieur par élément', sacsCimentNet, { dosage: defaultDosage, poidsSac });
    } else if (volume > 0) {
      sacsCimentNet = Math.ceil((volume * defaultDosage) / poidsSac);
      add('ciment', 'ciment', `Ciment (${defaultCimentType})`, 'sac', sacsCimentNet, '(Volume béton × Dosage) / Poids sac', `Vol. Béton = ${net(volume, 3)} m³\nMasse Ciment = ${net(volume, 3)} × ${defaultDosage} = ${net(volume * defaultDosage, 2)} kg\nSacs = ArrondiSup(${net(volume * defaultDosage, 2)} ÷ ${poidsSac}) = ${sacsCimentNet} sacs`, 'Arrondi supérieur', sacsCimentNet, { dosage: defaultDosage, poidsSac });
    }

    // Sable, Gravier, Eau
    if (volume > 0) {
      const volSable = volume * PARAMETRES.beton.sableParM3;
      const litresSable = volSable * 1000;
      const kgSable = volSable * PARAMETRES.beton.densiteSable * 1000;
      const tonnesSable = kgSable / 1000;
      
      const calculSable = `Volume Sable (m³) = ${net(volume, 3)} m³ × ${PARAMETRES.beton.sableParM3} = ${net(volSable, 3)} m³\nVolume Sable (Litres) = ${net(volSable, 3)} m³ × 1000 = ${net(litresSable, 2)} L\nMasse (kg) = ${net(volSable, 3)} m³ × ${PARAMETRES.beton.densiteSable * 1000} kg/m³ = ${net(kgSable, 2)} kg\nMasse (tonnes) = ${net(kgSable, 2)} ÷ 1000 = ${net(tonnesSable, 3)} t`;
      // Le sable et le gravier se commandent, se livrent et se facturent a la
      // TONNE — c'est aussi ce que sort le classeur v7
      // (`Volume x COEF_SABLE_VOL x DENSITE_SABLE`, colonne « tonnes »).
      // Les emettre en m3 tout en les facturant au prix de la tonne sous-comptait
      // le sable de 1,5x et le gravier de 1,6x sur chaque devis ; le calcul des
      // brouettes plus bas, lui, divisait deja par la densite et supposait donc
      // bien des tonnes.
      add('sable', 'sable', 'Sable de rivière', 't', tonnesSable, `Volume béton × ${PARAMETRES.beton.sableParM3} × ${PARAMETRES.beton.densiteSable}`, calculSable, 'Commandé à la tonne', tonnesSable);
      
      const volGravier = volume * PARAMETRES.beton.gravierParM3;
      const litresGravier = volGravier * 1000;
      const kgGravier = volGravier * PARAMETRES.beton.densiteGravier * 1000;
      const tonnesGravier = kgGravier / 1000;
      
      const calculGravier = `Volume Gravier (m³) = ${net(volume, 3)} m³ × ${PARAMETRES.beton.gravierParM3} = ${net(volGravier, 3)} m³\nVolume Gravier (Litres) = ${net(volGravier, 3)} m³ × 1000 = ${net(litresGravier, 2)} L\nMasse (kg) = ${net(volGravier, 3)} m³ × ${PARAMETRES.beton.densiteGravier * 1000} kg/m³ = ${net(kgGravier, 2)} kg\nMasse (tonnes) = ${net(kgGravier, 2)} ÷ 1000 = ${net(tonnesGravier, 3)} t`;
      add('gravier', 'gravier', 'Gravier 15/25', 't', tonnesGravier, `Volume béton × ${PARAMETRES.beton.gravierParM3} × ${PARAMETRES.beton.densiteGravier}`, calculGravier, 'Commandé à la tonne', tonnesGravier);
      
      const eau = (volume * defaultDosage) / PARAMETRES.beton.eauParDosage;
      add('eau', 'eau', 'Eau de gâchage', 'L', eau, '(Volume béton × Dosage) / 2', `Masse Ciment = ${net(volume * defaultDosage, 2)} kg\nEau = ${net(volume * defaultDosage, 2)} ÷ ${PARAMETRES.beton.eauParDosage} = ${net(eau, 2)} L`);
    }
  }


  if ((blocId === 'moellon' || blocId === 'dallage') && bloc.lignes && bloc.lignes.length > 0) {
    for (const l of bloc.lignes) {
      if (l.decomposition_materiaux && l.decomposition_materiaux.length > 0) {
        l.decomposition_materiaux.forEach(mat => {
          add(
            mat.id_materiau,
            mat.categorie,
            mat.nom,
            mat.unite,
            mat.quantiteNette,
            mat.formule,
            mat.calcul,
            mat.motif_arrondi || null,
            mat.valeur_arrondie !== undefined ? mat.valeur_arrondie : mat.quantiteNette,
            { quantite_majoree: mat.quantiteNette }
          );
        });
      }
    }
  }

  // --- 4.5 PLANCHER HOURDIS 16+4 ---
  if (blocId === 'plancherHourdis' && bloc.lignes) {
    for (const l of bloc.lignes) {
      if (l.detailsExtra) {
        const d = l.detailsExtra;
        add('hourdis', 'blocs', 'Hourdis 16 cm', 'u', d.nHourdis, 'Calcul théorique + pertes', 'Calcul basé sur surface nette et dimensions hourdis', 'Valeur avec pertes', d.nHourdis);
        add('poutrelles', 'prefa', 'Poutrelles', 'ml', d.longueurPoutrelles, 'Calcul poutrelles (L/entraxe)', 'Nombre d\'intervalles + 1', 'Valeur exacte', d.longueurPoutrelles);

        
        // Beton plancher (on ajoute le volume pour que la passe beton au-dessus le traite ?
        // Non, la passe beton au-dessus traite le plancherHourdis si isBetonArme est true, 
        // mais isBetonArme ne contient PAS plancherHourdis. On le calcule ici).
        const defaultDosage = regles?.dosages?.[blocId] || 350;
        const defaultCimentType = regles?.cimentTypes?.[blocId] || '42.5';
        const poidsSac = PARAMETRES.beton.poidsSacCiment || 50;
        
        const volBeton = d.volBeton;
        if (volBeton > 0) {
          const sacsCimentNet = Math.ceil((volBeton * defaultDosage) / poidsSac);
          add('ciment', 'ciment', `Ciment (${defaultCimentType})`, 'sac', sacsCimentNet, '(Volume béton × Dosage) / Poids sac', `Vol. Béton = ${net(volBeton, 3)} m³`, 'Arrondi supérieur', sacsCimentNet);
          
          const volSable = volBeton * PARAMETRES.beton.sableParM3;
          const tonnesSable = (volSable * PARAMETRES.beton.densiteSable * 1000) / 1000;
          add('sable', 'sable', 'Sable de rivière', 't', tonnesSable, `Volume béton × ${PARAMETRES.beton.sableParM3} × ${PARAMETRES.beton.densiteSable}`, '', 'Commandé à la tonne', tonnesSable);
          
          const volGravier = volBeton * PARAMETRES.beton.gravierParM3;
          const tonnesGravier = (volGravier * PARAMETRES.beton.densiteGravier * 1000) / 1000;
          add('gravier', 'gravier', 'Gravier 15/25', 't', tonnesGravier, `Volume béton × ${PARAMETRES.beton.gravierParM3} × ${PARAMETRES.beton.densiteGravier}`, '', 'Commandé à la tonne', tonnesGravier);
          
          const eau = (volBeton * defaultDosage) / PARAMETRES.beton.eauParDosage;
          add('eau', 'eau', 'Eau de gâchage', 'L', eau, '(Volume béton × Dosage) / 2', '');
        }
      }
    }
  }



  // --- 5. MAÇONNERIE (AGGLOS CREUX) ---
  const isMaconnerie = blocId === 'maconnerie';
  if (isMaconnerie && bloc.lignes) {
    for (const l of bloc.lignes) {
      if (l.decomposition_materiaux) {
        l.decomposition_materiaux.forEach(mat => {
          const qMajoree = mat.donnees && mat.donnees.quantite_majoree !== undefined ? mat.donnees.quantite_majoree : mat.quantiteNette;
          add(mat.id_materiau, mat.categorie, mat.nom, mat.unite, mat.quantiteNette, mat.formule, mat.calcul, 'Calcul analytique exact', mat.valeur_arrondie !== undefined ? mat.valeur_arrondie : mat.quantiteNette, { quantite_majoree: qMajoree });
        });
      }
    }
  }

  // --- 5 bis. SOUBASSEMENT (AGGLOS PLEINS) ---
  if (blocId === 'soubassement' && bloc.lignes) {
    for (const l of bloc.lignes) {
      if (l.decomposition_materiaux) {
        l.decomposition_materiaux.forEach(mat => {
          const qMajoree = mat.donnees && mat.donnees.quantite_majoree !== undefined ? mat.donnees.quantite_majoree : mat.quantiteNette;
          add(mat.id_materiau, mat.categorie, mat.nom, mat.unite, mat.quantiteNette, mat.formule, mat.calcul, 'Calcul analytique exact', mat.valeur_arrondie !== undefined ? mat.valeur_arrondie : mat.quantiteNette, { quantite_majoree: qMajoree });
        });
      }
    }
  }

  // --- 6. ENDUITS ---
  if (blocId === 'enduits') {
    let sacsCimentEnduit = 0;
    const globalEpaisseur = PARAMETRES.finitions.epaisseurEnduit || 0.02;
    const globalDosage = PARAMETRES.finitions.dosageCimentEnduit || 350;
    const poidsSac = PARAMETRES.beton.poidsSacCiment || 50;
    const globalPertePct = PARAMETRES.finitions.perteEnduitPct || 5;

    let totalSacsAchat = 0;
    let totalSableTonnes = 0;
    let totalEauL = 0;
    let totalVolumeEnduit = 0;

    if (bloc.lignes && bloc.lignes.length > 0) {
      for (const l of bloc.lignes) {
        if (l.valeur) {
          const epaisseur = Number(l.epaisseur) || globalEpaisseur;
          const dosage = Number(l.dosage) || globalDosage;
          const pertePct = Number(l.pertePct) !== undefined && !isNaN(Number(l.pertePct)) ? Number(l.pertePct) : globalPertePct;
          const v = l.valeur * epaisseur;
          totalVolumeEnduit += v;
          
          const sacsParM3 = dosage / poidsSac;
          const sacsTh = v * sacsParM3;
          const sacsAchat = Math.ceil(sacsTh * (1 + pertePct / 100));
          totalSacsAchat += sacsAchat;

          const sableSacsKg = Number(l.sableParSac) || PARAMETRES.finitions.sableParSacKg || 180;
          const coefSable = Number(l.coefSable) || PARAMETRES.finitions.coefficientSable || 1.5;
          totalSableTonnes += (sacsAchat * sableSacsKg * coefSable) / 1000;

          const eauParSacL = Number(l.eauParSac) || PARAMETRES.finitions.eauParSacL || 30;
          totalEauL += sacsAchat * eauParSacL;
        }
      }
    } else if (volume > 0) {
      const v = volume * globalEpaisseur;
      totalVolumeEnduit += v;
      const sacsTh = v * (globalDosage / poidsSac);
      totalSacsAchat = Math.ceil(sacsTh * (1 + globalPertePct / 100));
      
      const sableSacsKg = PARAMETRES.finitions.sableParSacKg || 180;
      const coefSable = PARAMETRES.finitions.coefficientSable || 1.5;
      totalSableTonnes = (totalSacsAchat * sableSacsKg * coefSable) / 1000;
      
      const eauParSacL = PARAMETRES.finitions.eauParSacL || 30;
      totalEauL = totalSacsAchat * eauParSacL;
    }

    if (totalSacsAchat > 0) {
      sacsCimentEnduit = totalSacsAchat;
      add('ciment', 'ciment', 'Ciment (Enduit)', 'sac', totalSacsAchat, `Calcul détaillé par zone (+ pertes)`, `Vol=${net(totalVolumeEnduit, 3)} m³`, 'Arrondi supérieur', totalSacsAchat);
      add('sable', 'sable', 'Sable (Enduit)', 't', totalSableTonnes, `Sacs × Sable/Sac × Foisonnement / 1000`, `Sable = ${net(totalSableTonnes, 3)} t`);
      add('eau', 'eau', 'Eau (Enduit)', 'L', totalEauL, `Sacs × Eau/Sac`, `${totalSacsAchat} sacs = ${totalEauL} L`);
    }
  }

  // --- 7. PEINTURE ---
  if (blocId === 'peinture' && bloc.lignes) {
    let qLatex = 0, qClassique = 0, qChaux = 0;
    const globalCouches = PARAMETRES.finitions.nbCouchesPeinture || 2;
    const globalPertePct = PARAMETRES.finitions.pertePeinturePct || 5;

    for (const p of bloc.lignes) {
      if (!p.valeur) continue;
      const couches = Number(p.couches) || globalCouches;
      const pertePct = Number(p.pertePct) !== undefined && !isNaN(Number(p.pertePct)) ? Number(p.pertePct) : globalPertePct;
      const surfaceTotale = p.valeur * couches;
      let quantite = 0;
      
      if (p.typePeinture === 'classique') {
        const rendement = Number(p.rendement) || PARAMETRES.finitions.rendementPeintureClassique || 10;
        quantite = surfaceTotale / rendement;
        qClassique += quantite * (1 + pertePct / 100);
      } else if (p.typePeinture === 'chaux') {
        const rendement = Number(p.rendement) || PARAMETRES.finitions.rendementChaux || 6;
        quantite = surfaceTotale / rendement;
        qChaux += quantite * (1 + pertePct / 100);
      } else {
        const rendement = Number(p.rendement) || PARAMETRES.finitions.rendementLatex || 4;
        quantite = surfaceTotale / rendement;
        qLatex += quantite * (1 + pertePct / 100);
      }
    }

    if (qLatex > 0) add('peinture_latex', 'peinture', 'Peinture Latex', 'kg', Math.ceil(qLatex), `Détaillé par zone (+ pertes)`, `${net(qLatex, 2)} kg`);
    if (qClassique > 0) add('peinture_classique', 'peinture', 'Peinture Classique', 'L', Math.ceil(qClassique), `Détaillé par zone (+ pertes)`, `${net(qClassique, 2)} L`);
    if (qChaux > 0) add('peinture_chaux', 'peinture', 'Peinture à la Chaux', 'kg', Math.ceil(qChaux), `Détaillé par zone (+ pertes)`, `${net(qChaux, 2)} kg`);
  }

  // --- 8. CARRELAGE C1, C2 & PLINTHES ---
  const traiterCarrelage = (blocObj, idMat, idCarton, libelleMat, libelleCarton) => {
    let totalCarreaux = 0;
    let totalCartons = 0;
    let totalColleKg = 0;
    let totalJointKg = 0;
    
    for (const l of blocObj.lignes) {
      if (!l.surface) continue;
      const L = Number(l.longueurCarreau) || PARAMETRES.finitions.longueurCarreau || 0.3;
      const w = Number(l.largeurCarreau) || PARAMETRES.finitions.largeurCarreau || 0.3;
      const surfaceCarreau = L * w;
      const pertePct = Number(l.pertePct) !== undefined && !isNaN(Number(l.pertePct)) ? Number(l.pertePct) : PARAMETRES.finitions.perteCarrelagePct || 5;
      const carreauxParCarton = Number(l.carreauxParCarton) || PARAMETRES.finitions.carreauxParCarton || 12;

      const nbCarreauxTheorique = l.surface / surfaceCarreau;
      const nbCarreauxAvecPerte = nbCarreauxTheorique * (1 + pertePct / 100);
      const nbCarreaux = Math.ceil(nbCarreauxAvecPerte);
      totalCarreaux += nbCarreaux;
      totalCartons += Math.ceil(nbCarreaux / carreauxParCarton);
      
      const consoColle = Number(l.consoColle) || PARAMETRES.finitions.cimentColleKgM2 || 5;
      const perteColle = Number(l.perteCollePct) !== undefined && !isNaN(Number(l.perteCollePct)) ? Number(l.perteCollePct) : PARAMETRES.finitions.perteCollePct || 5;
      totalColleKg += l.surface * consoColle * (1 + perteColle / 100);
      
      const consoJoint = Number(l.consoJoint) || PARAMETRES.finitions.jointKgM2 || 0.5;
      const perteJoint = Number(l.perteJointPct) !== undefined && !isNaN(Number(l.perteJointPct)) ? Number(l.perteJointPct) : PARAMETRES.finitions.perteJointPct || 5;
      totalJointKg += l.surface * consoJoint * (1 + perteJoint / 100);
    }

    add(idMat, 'carrelage', libelleMat, 'u', totalCarreaux, `Somme des pièces (+ pertes)`, `${totalCarreaux} u`, 'Arrondi supérieur', totalCarreaux);
    add(idCarton, 'carrelage', libelleCarton, 'carton', totalCartons, `Carreaux / Cartons`, `${totalCartons} cartons`);
    add('cimentColle', 'cimentColle', 'Ciment-colle', 'kg', Math.ceil(totalColleKg), `Détaillé par pièce (+ pertes)`, `${net(totalColleKg, 2)} kg`);
    add('jointCarrelage', 'finition', 'Joint pour carrelage', 'kg', Math.ceil(totalJointKg), `Détaillé par pièce (+ pertes)`, `${net(totalJointKg, 2)} kg`);
  };

  if (blocId === 'carrelageC1' && bloc.lignes && volume > 0) { // volume = surface
    traiterCarrelage(bloc, 'carreauxC1', 'carreauxCartonC1', 'Carreaux Cat 1', 'Carreaux (Cartons) Cat 1');
  }

  if (blocId === 'carrelageC2' && bloc.lignes && volume > 0) {
    traiterCarrelage(bloc, 'carreauxC2', 'carreauxCartonC2', 'Carreaux Cat 2', 'Carreaux (Cartons) Cat 2');
  }

  if (blocId === 'plinthes' && bloc.lignes && volume > 0) { // volume = surface
    let totalPlinthes = 0;
    for (const l of bloc.lignes) {
      if (!l.valeur) continue;
      // Perimetre est dans l.perimetre
      const L_defaut = PARAMETRES.finitions.longueurCarreau || 0.3;
      const plinthesPourLigne = Math.ceil(l.perimetre / L_defaut);
      const pertePct = Number(l.pertePct) !== undefined && !isNaN(Number(l.pertePct)) ? Number(l.pertePct) : 5;
      totalPlinthes += Math.ceil(plinthesPourLigne * (1 + pertePct / 100));
    }
    if (totalPlinthes > 0) {
      add('plinthe', 'plinthe', 'Plinthes', 'u', totalPlinthes, `Somme des plinthes (+ pertes)`, `${totalPlinthes} u`, 'Arrondi', totalPlinthes);
    }
  }

  if (blocId === 'faience' && bloc.lignes && volume > 0) { // volume = surface
    let totalFaience = 0;
    let totalCartons = 0;
    let totalColleKg = 0;

    for (const l of bloc.lignes) {
      if (!l.valeur) continue;
      const L = Number(l.longueurCarreau) || PARAMETRES.finitions.longueurFaience || 0.25;
      const w = Number(l.largeurCarreau) || PARAMETRES.finitions.largeurFaience || 0.40;
      const surfaceFaience = L * w;
      const pertePct = Number(l.pertePct) !== undefined && !isNaN(Number(l.pertePct)) ? Number(l.pertePct) : PARAMETRES.finitions.perteFaiencePct || 5;
      const faiencesParCarton = Number(l.faiencesParCarton) || PARAMETRES.finitions.faienceParCarton || 10;

      const nbFaiencesTheorique = l.valeur / surfaceFaience;
      const nbFaiences = Math.ceil(nbFaiencesTheorique * (1 + pertePct / 100));
      totalFaience += nbFaiences;
      totalCartons += Math.ceil(nbFaiences / faiencesParCarton);
      
      const consoColle = Number(l.consoColle) || PARAMETRES.finitions.cimentColleKgM2 || 5;
      const perteColle = Number(l.perteCollePct) !== undefined && !isNaN(Number(l.perteCollePct)) ? Number(l.perteCollePct) : PARAMETRES.finitions.perteCollePct || 5;
      totalColleKg += l.valeur * consoColle * (1 + perteColle / 100);
    }

    add('faience', 'carrelage', 'Faïences', 'u', totalFaience, `Somme des murs (+ pertes)`, `${totalFaience} u`, 'Arrondi supérieur', totalFaience);
    add('faienceCarton', 'carrelage', 'Faïences (Cartons)', 'carton', totalCartons, `Faïences / Cartons`, `${totalCartons} cartons`);
    add('cimentColle', 'cimentColle', 'Ciment-colle (Faïence)', 'kg', Math.ceil(totalColleKg), `Détaillé par mur (+ pertes)`, `${net(totalColleKg, 2)} kg`);
  }

  // --- 9. CHARPENTE ---
  if (blocId === 'charpenteBois' && volume > 0) {
    add('bois_charpente', 'bois', 'Bois de charpente', 'm3', volume, 'Volume total calculé', `${volume} m³`);
    add('clous_charpente', 'clous', 'Clous (Charpente)', 'kg', volume * PARAMETRES.clous.charpente, 'Volume bois × Ratio clous', `${volume} × ${PARAMETRES.clous.charpente}`);
  }

  // --- 10. TOITURE (TÔLES) ---
  if (blocId === 'couvertureToles' && bloc.lignes) {
    let surfaceToles = 0;
    let faitieres = 0;
    for (const l of bloc.lignes) {
      if (l.valeur) surfaceToles += l.valeur;
      if (l.trace?.entrees?.longueur) {
        faitieres += Math.ceil(l.trace.entrees.longueur / PARAMETRES.couverture.longueurFaitiere) + 1;
      }
    }
    if (surfaceToles > 0) {
      const nbreTolesBase = surfaceToles / (PARAMETRES.couverture.largeurUtileTole * PARAMETRES.couverture.longueurTole);
      add('toles', 'toles', 'Tôles', 'u', nbreTolesBase * 2, '(Surface / Surface Tôle) × 2 pans', `(${surfaceToles} / ...) × 2`);
      add('clous_toiture', 'clous', 'Clous de toiture', 'kg', surfaceToles * 2 * PARAMETRES.clous.couverture, 'Surface totale × 2 pans × Ratio clous', `${surfaceToles} × 2 × ${PARAMETRES.clous.couverture}`);
    }
    if (faitieres > 0) {
      add('faitieres', 'toles', 'Tôles faîtières', 'u', faitieres, 'ArrondiSup(Longueur / Longueur Faîtière) + 1', `Arrondi par faîtage`, 'Arrondi', faitieres);
    }
  }
  // --- 11. TOITURE PROFESSIONNELLE (Métré Pro) ---
  if (blocId === 'toiturePro' && bloc.lignes) {
    for (const l of bloc.lignes) {
      const res = l.resultats; // charpente, couverture, plafond (arrays)
      if (res) {
        if (res.charpente) {
          res.charpente.forEach(item => {
            if (item.quantite_finale > 0) {
              if (item.designation.includes('Madriers')) add('madriers', 'bois', item.designation, item.unite, item.quantite_finale, item.formule, item.valeurs);
              else if (item.designation.includes('Pannes')) add('pannes', 'bois', item.designation, item.unite, item.quantite_finale, item.formule, item.valeurs);
              else if (item.designation.includes('Chevrons')) add('chevrons', 'bois', item.designation, item.unite, item.quantite_finale, item.formule, item.valeurs);
              else if (item.designation.includes('Clous')) add('clous_charpente', 'clous', item.designation, item.unite, item.quantite_finale, item.formule, item.valeurs);
              else add('bois_divers', 'bois', item.designation, item.unite, item.quantite_finale, item.formule, item.valeurs);
            }
          });
        }
        if (res.couverture) {
          res.couverture.forEach(item => {
            if (item.quantite_finale > 0) {
              if (item.designation.includes('Tôles')) add('toles', 'toles', item.designation, item.unite, item.quantite_finale, item.formule, item.valeurs);
              else if (item.designation.includes('Clous')) add('clous_toiture', 'clous', item.designation, item.unite, item.quantite_finale, item.formule, item.valeurs);
            }
          });
        }
        if (res.plafond) {
          res.plafond.forEach(item => {
            if (item.quantite_finale > 0) {
              if (item.designation.includes('Triplex')) add('triplex', 'bois', item.designation, item.unite, item.quantite_finale, item.formule, item.valeurs);
              else if (item.designation.includes('Chevrons')) add('chevrons', 'bois', item.designation, item.unite, item.quantite_finale, item.formule, item.valeurs);
            }
          });
        }
      }
    }
  }

  return decomp;
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

  for (const [blocId, bloc] of Object.entries(blocs)) {
    const details = obtenirDecompositionOuvrage(blocId, bloc, regles);
    for (const mat of details) {
      // Cas particulier pour le bois de coffrage : la majoration est calculée lors du métré.
      if (mat.donnees && mat.donnees.quantite_majoree !== undefined) {
        if (!recettes[mat.id_materiau]) {
          recettes[mat.id_materiau] = { categorie: mat.categorie, quantiteNette: 0, quantite: 0, unite: mat.unite };
        }
        recettes[mat.id_materiau].quantiteNette = net(recettes[mat.id_materiau].quantiteNette + mat.quantiteNette);
        recettes[mat.id_materiau].quantite = net(recettes[mat.id_materiau].quantite + mat.donnees.quantite_majoree);
      } else {
        // Mappage de id_materiau -> materiau utilisé dans l'ancienne architecture pour la facturation
        // Par exemple 'blocs_pleins', 'blocs', 'ciment', 'sable', 'gravier'
        // C'est ce nom de clé qui est utilisé dans valorisation.js.
        ajouterMateriau(recettes, mat.categorie, mat.id_materiau, mat.unite, mat.quantiteNette, regles);
      }
    }
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
