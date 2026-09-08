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
  if (['fouilles', 'fouilleFilante'].includes(blocId) && volume > 0) {
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
  const isAutresBeton = ['sousPavement'].includes(blocId);

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


  // --- 4. MOELLON — consommation de la décomposition analytique ---
  // calculerMoellon() porte la décomposition complète dans chaque ligne.
  // On agrège ici pour la fiche récapitulative (comme pour le soubassement).
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



  // --- 5. MAÇONNERIE (AGGLOS CREUX) ---
  const isMaconnerie = blocId === 'maconnerie';
  if (isMaconnerie && bloc.lignes) {
    for (const l of bloc.lignes) {
      if (l.decomposition_materiaux) {
        l.decomposition_materiaux.forEach(mat => {
          add(mat.id_materiau, mat.categorie, mat.nom, mat.unite, mat.quantiteNette, mat.formule, mat.calcul, 'Calcul analytique exact', mat.quantiteNette, { quantite_majoree: mat.quantiteNette });
        });
      }
    }
  }

  // --- 5 bis. SOUBASSEMENT (AGGLOS PLEINS) ---
  if (blocId === 'soubassement' && bloc.lignes) {
    for (const l of bloc.lignes) {
      if (l.decomposition_materiaux) {
        l.decomposition_materiaux.forEach(mat => {
          add(mat.id_materiau, mat.categorie, mat.nom, mat.unite, mat.quantiteNette, mat.formule, mat.calcul, 'Calcul analytique exact', mat.quantiteNette, { quantite_majoree: mat.quantiteNette });
        });
      }
    }
  }

  // --- 6. ENDUITS ---
  if (blocId === 'enduits') {
    let sacsCimentEnduit = 0;
    if (bloc.lignes && bloc.lignes.length > 0) {
      for (const l of bloc.lignes) {
        if (l.valeur) sacsCimentEnduit += Math.ceil((l.valeur * 8) / 50);
      }
      add('ciment', 'ciment', 'Ciment (Enduit)', 'sac', sacsCimentEnduit, 'Somme(ArrondiSup(Surface ligne × 8 kg / 50))', `Dosage 8 kg/m²`, 'Arrondi par pan', sacsCimentEnduit);
    } else if (volume > 0) {
      sacsCimentEnduit = Math.ceil((volume * 8) / 50);
      add('ciment', 'ciment', 'Ciment (Enduit)', 'sac', sacsCimentEnduit, '(Surface × 8 kg) / 50', `(${volume} × 8) / 50`, 'Arrondi supérieur', sacsCimentEnduit);
    }
    if (sacsCimentEnduit > 0) {
      const cimentReelKg = sacsCimentEnduit * 50;
      const volSableEnduit = (cimentReelKg / 300) * 1.0;
      add('sable', 'sable', 'Sable (Enduit)', 't', volSableEnduit * PARAMETRES.beton.densiteSable, 'Ciment(kg) / 300', `Vol. Sable (m³) = ${cimentReelKg} / 300 = ${net(volSableEnduit, 3)} m³\nVolume Sable (Litres) = ${net(volSableEnduit, 3)} m³ × 1000 = ${net(volSableEnduit * 1000, 2)} L\nMasse (kg) = ${net(volSableEnduit, 3)} m³ × 1500 kg/m³ = ${net(volSableEnduit * 1500, 2)} kg\nMasse (tonnes) = ${net(volSableEnduit * 1500, 2)} ÷ 1000 = ${net(volSableEnduit * 1.50, 3)} t`);
      add('eau', 'eau', 'Eau (Enduit)', 'L', cimentReelKg * 0.5, 'Ciment(kg) × 0.5', `${cimentReelKg} × 0.5`);
    }
  }

  // --- 7. PEINTURE ---
  if (blocId === 'peinture' && bloc.lignes) {
    let qLatex = 0, qClassique = 0, qChaux = 0;
    for (const p of bloc.lignes) {
      if (!p.valeur) continue;
      const surface = p.valeur;
      if (p.typePeinture === 'classique') qClassique += (surface / 10) * 2;
      else if (p.typePeinture === 'chaux') qChaux += (surface / 6) * 2;
      else qLatex += surface / 4;
    }
    add('peinture_latex', 'peinture', 'Peinture Latex', 'kg', qLatex, 'Surface / 4', `${qLatex} kg`);
    add('peinture_classique', 'peinture', 'Peinture Classique', 'L', qClassique, '(Surface / 10) × 2 couches', `${qClassique} L`);
    add('peinture_chaux', 'peinture', 'Peinture à la Chaux', 'kg', qChaux, '(Surface / 6) × 2 couches', `${qChaux} kg`);
  }

  // --- 8. CARRELAGE & FAÏENCE ---
  if (blocId === 'carrelage' && volume > 0) {
    const epaisseur = bloc.epaisseurCarrelage || 0.03;
    const nbCarreaux = Math.ceil(volume / 0.09);
    add('carreaux', 'carrelage', 'Carreaux', 'u', nbCarreaux, 'Surface / 0.09', `${volume} / 0.09`, 'Arrondi supérieur', nbCarreaux);
    add('cimentColle', 'cimentColle', 'Ciment-colle', 'kg', volume * 8, 'Surface × 8 kg', `${volume} × 8`);
    const ep_cm = epaisseur * 100;
    const volSablePose = volume * epaisseur;
    add('sable', 'sable', 'Sable de pose', 't', volSablePose * PARAMETRES.beton.densiteSable, 'Surface × Épaisseur', `Vol. Sable (m³) = ${net(volume, 3)} m² × ${epaisseur} m = ${net(volSablePose, 3)} m³\nVolume Sable (Litres) = ${net(volSablePose, 3)} m³ × 1000 = ${net(volSablePose * 1000, 2)} L\nMasse (kg) = ${net(volSablePose, 3)} m³ × 1500 kg/m³ = ${net(volSablePose * 1500, 2)} kg\nMasse (tonnes) = ${net(volSablePose * 1500, 2)} ÷ 1000 = ${net(volSablePose * 1.50, 3)} t`);
    const cimentPose = Math.ceil((volume * epaisseur * 300) / 50);
    add('ciment', 'ciment', 'Ciment de pose', 'sac', cimentPose, 'ArrondiSup(Surface × Épaisseur × 300 / 50)', `(${volume} × ${epaisseur} × 300) / 50`, 'Arrondi supérieur', cimentPose);
    if (bloc.perimetreTotal) {
      const plinthes = Math.ceil(bloc.perimetreTotal / 0.4);
      add('plinthe', 'plinthe', 'Plinthes', 'u', bloc.perimetreTotal / 0.4, 'Périmètre / 0.4', `${bloc.perimetreTotal} / 0.4`, 'Arrondi', plinthes);
    }
  }
  if (blocId === 'faience' && volume > 0) {
    const nbFaiences = Math.ceil(volume / 0.10);
    add('faience', 'carrelage', 'Faïences', 'u', nbFaiences, 'Surface / 0.10', `${volume} / 0.10`, 'Arrondi supérieur', nbFaiences);
    add('cimentColle', 'cimentColle', 'Ciment-colle (Faïence)', 'kg', volume * 8, 'Surface × 8 kg', `${volume} × 8`);
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
