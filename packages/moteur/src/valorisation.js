import { calculerRecettes } from './recettes.js';
import { _internes as moteurInternes } from './metre.js';
import { PARAMETRES } from './parametres.js';
import { 
  genererResumeFondation, 
  genererResumeElevation, 
  genererResumeFinition, 
  genererResumePlancher, 
  genererResumeToiture 
} from './resume.js';

const { net } = moteurInternes;

export const TITRES_LOTS_PARTICULIER = {
  terrassement: "TERRASSEMENT ET INSTALLATION DE CHANTIER",
  fondation: "FONDATION",
  elevation: "ELEVATION (RDC + ETAGE)",
  plancher: "PLANCHER (DALLE)",
  charpente: "CHARPENTE",
  couverture: "COUVERTURE",
  finition: "FINITION",
  toiture_terrasse: "TOITURE-TERRASSE ACCESSIBLE (variante)"
};

export const TITRES_LOTS_ENTREPRISE = {
  terrassement: "TERRASSEMENTS ET PREPARATION DU CHANTIER",
  fondation: "I - FONDATION",
  rdc: "II - RDC",
  etage1: "III - ETAGE 1",
  toiture: "IV - TOITURE (charpente-couverture ou terrasse accessible)",
  second_oeuvre: "V - SECOND OEUVRE (forfaits a completer)"
};

const BLOCS_PARTICULIER = {
  fouilles: 'terrassement',
  remblai: 'terrassement',
  betonProprete: 'fondation',
  semelles: 'fondation',
  longrines: 'fondation',
  soubassement: 'fondation',
  moellon: 'fondation',
  poteaux: 'elevation',
  colonnes: 'elevation',
  poutres: 'elevation',
  ceintures: 'elevation',
  linteaux: 'elevation',
  escalier: 'elevation',
  maconnerie: 'elevation',
  dalles: 'plancher',
  plancherHourdis: 'plancher',
  enduits: 'finition',
  carrelage: 'finition',
  faience: 'finition',
  peinture: 'finition',
  charpenteBois: 'charpente',
  couvertureToles: 'couverture',
  acrotere: 'toiture_terrasse',
  formePente: 'toiture_terrasse',
  armatures: 'armatures'
};

const BLOCS_ENTREPRISE_DEFAUT = {
  fouilles: 'terrassement',
  remblai: 'terrassement',
  betonProprete: 'fondation',
  semelles: 'fondation',
  longrines: 'fondation',
  soubassement: 'fondation',
  moellon: 'fondation',
  poteaux: 'rdc',
  colonnes: 'rdc',
  poutres: 'rdc',
  ceintures: 'rdc',
  linteaux: 'rdc',
  escalier: 'rdc',
  dalles: 'rdc',
  plancherHourdis: 'rdc',
  maconnerie: 'rdc',
  enduits: 'rdc',
  carrelage: 'second_oeuvre',
  faience: 'second_oeuvre',
  peinture: 'second_oeuvre',
  charpenteBois: 'toiture',
  couvertureToles: 'toiture',
  acrotere: 'toiture',
  formePente: 'toiture',
};

// Fonction simpliste pour les nombres en lettres (peut être améliorée ou déléguée au frontend)
function nombreEnLettres(num) {
  return `Le montant total s'élève à la somme de ${num} FCFA`; 
}

export function genererSousDetailPrix(blocId, blocDonnees, regles, bibliothequePrix) {
  if (['fouilles', 'remblai', 'fouilleFilante', 'nivellement', 'evacuation'].includes(blocId)) {
    let puKey = blocId === 'fouilles' || blocId === 'fouilleFilante' ? 'fouilleTrancheeM3' : 
                blocId === 'remblai' || blocId === 'nivellement' ? 'remblaiSousDallageM3' : 'evacuationDeblaisM3';
    const pu = bibliothequePrix[puKey] || PARAMETRES.prixUnitaires[puKey] || 0;
    return {
      debourseMateriaux: 0, tauxMainOeuvre: 0, debourseMainOeuvre: pu, prixVenteUnitaire: pu,
      avertissements: pu === 0 ? ["Prix manquant"] : []
    };
  }

  const fauxBlocs = {};
  if (blocId === 'maconnerie') fauxBlocs[blocId] = { total: 1, lignes: [{ nombreBlocs: PARAMETRES.majorations?.blocs ? (12.5 * PARAMETRES.majorations.blocs) : 12.5, volumeMortier: 12.5 * (0.4 + 0.015) * 0.015 * 0.15 }] };
  else if (blocId === 'carrelage' || blocId === 'faience') fauxBlocs[blocId] = { total: 1, perimetreTotal: 4 };
  else fauxBlocs[blocId] = { total: 1 };

  let utiliseRatioAcierDefaut = false;
  let utiliseRatioCoffrageDefaut = false;
  let ratioAcier = 0;

  if (['semelles', 'longrines', 'colonnes', 'poteaux', 'ceintures', 'poutres', 'linteaux', 'dalles', 'escalier', 'acrotere'].includes(blocId)) {
    let poidsAcierReel = 0;
    let volumeReel = blocDonnees?.total || 0;
    let coffrageReel = blocDonnees?.totalCoffrage || 0;
    
    if (blocDonnees?.lignes) {
      const extractions = moteurInternes.extractionsArmatures;
      const targetId = blocId === 'poteaux' ? 'colonnes' : blocId === 'poutres' ? 'ceintures' : blocId;
      if (extractions[targetId]) {
        blocDonnees.lignes.forEach(l => {
          const armatures = extractions[targetId](l, regles);
          armatures.forEach(a => { poidsAcierReel += (a.poids || 0); });
        });
      }
    }
    
    if (poidsAcierReel > 0 && volumeReel > 0) {
      ratioAcier = poidsAcierReel / volumeReel;
    } else {
      ratioAcier = 130;
      utiliseRatioAcierDefaut = true;
    }
    
    if (coffrageReel > 0 && volumeReel > 0) {
      fauxBlocs[blocId].totalCoffrage = coffrageReel / volumeReel;
    } else {
      fauxBlocs[blocId].totalCoffrage = 0.9;
      utiliseRatioCoffrageDefaut = true;
    }
  }

  // Injecter l'armature par défaut dans fauxBlocs si nécessaire, pour que recettes.js la compte
  if (utiliseRatioAcierDefaut && ratioAcier > 0) {
    if (!fauxBlocs['armatures']) fauxBlocs['armatures'] = { lignes: [] };
    fauxBlocs['armatures'].lignes.push({ id: 'acierHA_10', unite: 'kg', quantite: ratioAcier, poids: ratioAcier });
  }

  const recettesPourUneUnite = calculerRecettes(fauxBlocs);
  
  let debourseMateriaux = 0;
  let avertissements = [];

  for (const [id, mat] of Object.entries(recettesPourUneUnite)) {
    // Ne jamais utiliser quantiteCommande pour le sous-détail de prix
    // On utilise la quantité nette (sans majoration d'achat) pour retomber exactement sur les prix cibles forfaitaires (la majoration d'achat étant réservée au devis matériel, ou incluse via les frais d'entreprise)
    const quantite = mat.quantiteNette;
    
    let puKey = id;
    if (id === 'bois_charpente') puKey = 'chevrons';
    if (id === 'clous_charpente' || id === 'clous_toiture' || id === 'clous') puKey = 'clousKg';
    if (id === 'faitieres') puKey = 'toleFaitierePiece';
    if (id === 'toles') puKey = 'toleBG28Piece';

    let pu = bibliothequePrix[puKey] ?? bibliothequePrix[id] ?? PARAMETRES.prixUnitaires[puKey] ?? PARAMETRES.prixUnitaires[id] ?? 0;
    
    if (['eau', 'eauM3'].includes(puKey) && mat.unite === 'L') {
      pu = pu / 1000;
    } else if (puKey.startsWith('acier') && mat.unite === 'kg') {
      const match = puKey.match(/_(\d+)$/);
      if (match) {
        const diam = match[1];
        const pL = PARAMETRES.aciersPoidsLineique[diam] || 0.617;
        pu = pu / (12 * pL); // le PU est pour une barre de 12m, on cherche le prix au kg
      }
    }

    if (pu === 0 && quantite > 0) avertissements.push(`Prix manquant pour ${id}`);
    debourseMateriaux += quantite * pu;
  }
  
  if (ratioAcier > 0) {
    const puAcier = bibliothequePrix['acierHA_12'] || PARAMETRES.prixUnitaires['acierHA_12'] || 6000; 
    if (puAcier === 0) avertissements.push(`Prix manquant pour acierHA_12`);
    const poidsBarreHA12 = (12 * 12 * 12 * 0.006165); // 10.65 kg environ
    const puAcierKg = puAcier / poidsBarreHA12;
    debourseMateriaux += ratioAcier * puAcierKg;
    
    const puLigature = bibliothequePrix['filLigature'] || PARAMETRES.prixUnitaires['filLigatureKg'] || 1200;
    if (puLigature === 0) avertissements.push(`Prix manquant pour filLigature`);
    debourseMateriaux += (ratioAcier * 0.05) * puLigature;
  }
  
  let tauxMainOeuvre = 0.28; 
  if (['enduits', 'carrelage', 'faience', 'peinture', 'charpenteBois', 'couvertureToles', 'acrotere', 'formePente'].includes(blocId)) {
    tauxMainOeuvre = 0.22;
  }
  
  const debourseMainOeuvre = debourseMateriaux * tauxMainOeuvre;
  const prixVenteUnitaire = Math.round(debourseMateriaux + debourseMainOeuvre);
  
  if (utiliseRatioAcierDefaut || utiliseRatioCoffrageDefaut) avertissements.push("Ratio par défaut");

  return {
    debourseMateriaux, tauxMainOeuvre, debourseMainOeuvre, prixVenteUnitaire, avertissements,
    ratioAcierDefaut: utiliseRatioAcierDefaut, ratioCoffrageDefaut: utiliseRatioCoffrageDefaut
  };
}

export function genererDevisParticulier(input, regles, bibliothequePrix, bibliothequeLibelles = {}) {
  let niveauxMetre = Array.isArray(input) ? input : [{ niveau: { id: 'all', nom: 'Projet' }, saisie: {}, metre: { blocs: input } }];
  
  const blocsParCategorie = {
    terrassement: {}, fondation: {}, elevation: {}, plancher: {}, charpente: {}, couverture: {}, toiture_terrasse: {}, finition: {}
  };

  for (const { metre } of niveauxMetre) {
    if (!metre || !metre.blocs) continue;
    for (const [blocId, blocDonnees] of Object.entries(metre.blocs)) {
      if (!blocDonnees || (!blocDonnees.total && !blocDonnees.lignes)) continue;
      
      const cat = BLOCS_PARTICULIER[blocId] || 'finition'; 
      if (cat === 'terrassement' || cat === 'fondation') continue;
      
      if (!blocsParCategorie[cat]) blocsParCategorie[cat] = {};
      
      if (blocId === 'autresOuvrages' || blocId === 'armatures') {
        if (!blocsParCategorie[cat][blocId]) blocsParCategorie[cat][blocId] = { lignes: [] };
        blocsParCategorie[cat][blocId].lignes.push(...(blocDonnees.lignes || []));
      } else {
        if (!blocsParCategorie[cat][blocId]) {
          blocsParCategorie[cat][blocId] = { ...blocDonnees, total: 0, totalCoffrage: 0, lignes: [] };
        }
        blocsParCategorie[cat][blocId].total += (blocDonnees.total || 0);
        blocsParCategorie[cat][blocId].totalCoffrage += (blocDonnees.totalCoffrage || 0);
        if (blocDonnees.lignes) blocsParCategorie[cat][blocId].lignes.push(...blocDonnees.lignes);
      }
    }
  }

  let saisieGlobale = {};
  for (const { saisie } of niveauxMetre) {
    if (saisie) Object.assign(saisieGlobale, saisie);
  }
  
  let resumeFondation = null;
  if (Object.keys(saisieGlobale).length > 0) {
    resumeFondation = genererResumeFondation(saisieGlobale, regles);
  }

  const devisParLot = {};
  let totalMateriaux = 0;
  
  const ordreParticulier = Object.keys(TITRES_LOTS_PARTICULIER);

  for (const lot of ordreParticulier) {
    let lignes = [];
    let sousTotal = 0;

    let materiauxDuLot = {};
    let aciersDuLot = null;

    if (lot === 'terrassement') continue;

    if (lot === 'fondation' && resumeFondation) {
      materiauxDuLot = resumeFondation.materiaux;
      aciersDuLot = resumeFondation.aciers;
    } else {
      const blocsDuLot = blocsParCategorie[lot];
      if (!blocsDuLot) continue;
      
      if (lot === 'elevation') {
        const resumeElev = genererResumeElevation(blocsDuLot, regles);
        materiauxDuLot = resumeElev.materiaux;
        aciersDuLot = resumeElev.aciers;
      } else if (lot === 'finition') {
        const resumeFin = genererResumeFinition(blocsDuLot, regles);
        materiauxDuLot = resumeFin.materiaux;
      } else if (lot === 'plancher') {
        const resumePlancher = genererResumePlancher(blocsDuLot, regles);
        materiauxDuLot = resumePlancher.materiaux;
        aciersDuLot = resumePlancher.aciers;
      } else if (lot === 'charpente' || lot === 'couverture' || lot === 'toiture_terrasse') {
        const resumeToiture = genererResumeToiture(blocsDuLot, regles);
        materiauxDuLot = resumeToiture.materiaux;
        aciersDuLot = resumeToiture.aciers;
      }
    }

    for (const [id, m] of Object.entries(materiauxDuLot)) {
      let quantite = (m.quantiteCommande !== undefined) ? m.quantiteCommande : (m.quantite !== undefined ? m.quantite : m);
      if (!quantite || quantite === 0) continue;
      if (id === 'volumeBois') continue; 
      
      let unite = m.unite || 'u';
      if (typeof m !== 'object') {
        if (id === 'ciment') unite = 'sac';
        else if (id === 'eau') { unite = 'm3'; quantite = quantite / 1000; }
        else if (id === 'sable' || id === 'gravier') unite = 't';
        else if (id === 'clous') unite = 'kg';
        else if (id === 'filLigature') unite = 'kg';
        else if (id === 'cimentColle' || id === 'peinture_latex' || id === 'peinture_chaux') unite = 'kg';
        else if (id === 'peinture_classique') unite = 'L';
        else unite = 'u';
      }
      
      let pu = bibliothequePrix[id] || PARAMETRES.prixUnitaires[id] || 0;
      if (['eau', 'eauM3'].includes(id) && unite === 'L') pu = pu / 1000;
      
      const pt = net(quantite * pu);
      const avertissements = pu === 0 ? ["Prix manquant"] : [];
      
      lignes.push({ id, designation: bibliothequeLibelles[id] || id, unite, quantite, pu, pt, avertissements });
      sousTotal += pt;
    }
    
    if (aciersDuLot && aciersDuLot.lignes && aciersDuLot.lignes.length > 0) {
      for (const acierLigne of aciersDuLot.lignes) {
        if (!acierLigne.nombreBarres12m) continue;
        const quantite = acierLigne.nombreBarres12m;
        const type = PARAMETRES.nuancesAcier[acierLigne.nuance]?.type || 'HA';
        const idAcier = `acier${type}_${acierLigne.diametre}`;
        const pu = bibliothequePrix[idAcier] || PARAMETRES.prixUnitaires[idAcier] || 0;
        const pt = net(quantite * pu);
        const avertissements = pu === 0 ? ["Prix manquant"] : [];
        
        lignes.push({ 
          id: idAcier, 
          designation: `Armature — ${acierLigne.repere || acierLigne.designation}`, 
          unite: 'barre 12 m', 
          quantite, pu, pt, avertissements 
        });
        sousTotal += pt;
      }
    }

    if (lignes.length > 0) {
      devisParLot[lot] = { lignes, sousTotal: Math.round(sousTotal) };
      totalMateriaux += sousTotal;
    }
  }

  const imprevus = totalMateriaux * 0.05;
  const transport = totalMateriaux * 0.05;
  const mo = totalMateriaux * 0.28;
  const totalTravaux = totalMateriaux + imprevus + transport + mo;
  
  const honorairesArchi = totalTravaux * 0.08;
  const honorairesInge = totalTravaux * 0.08;
  const totalGeneral = Math.round(totalTravaux + honorairesArchi + honorairesInge);

  return { 
    lots: devisParLot, 
    cascade: {
      totalMateriaux: Math.round(totalMateriaux),
      imprevus: Math.round(imprevus),
      transport: Math.round(transport),
      mainOeuvre: Math.round(mo),
      totalTravaux: Math.round(totalTravaux),
      honorairesArchi: Math.round(honorairesArchi),
      honorairesInge: Math.round(honorairesInge),
      totalGeneral
    },
    total: totalGeneral,
    enToutesLettres: nombreEnLettres(totalGeneral)
  };
}

export function genererDevisEntreprise(input, regles, bibliothequePrix, bibliothequeLibelles = {}) {
  let niveauxMetre = Array.isArray(input) ? input : [{ niveau: { id: 'all', nom: 'Projet' }, saisie: {}, metre: { blocs: input } }];
  
  const devisParNiveau = {};
  let totalGrosOeuvre = 0;
  let totalSecondOeuvre = 0;

  let saisieGlobale = {};
  for (const { saisie } of niveauxMetre) {
    if (saisie) Object.assign(saisieGlobale, saisie);
  }
  
  let resumeFondation = null;
  if (Object.keys(saisieGlobale).length > 0) {
    resumeFondation = genererResumeFondation(saisieGlobale, regles);
  }

  for (const { niveau, metre } of niveauxMetre) {
    if (!metre || !metre.blocs) continue;
    
    let niveauKey = 'rdc';
    if (niveau.id === 'all') niveauKey = 'rdc'; 
    else niveauKey = niveau.id;
    
    if (!devisParNiveau[niveauKey]) {
      devisParNiveau[niveauKey] = { nom: niveau.nom, lignes: [], sousTotal: 0 };
    }
    
    if (!devisParNiveau['fondation']) {
      devisParNiveau['terrassement'] = { nom: 'TERRASSEMENTS ET PREPARATION DU CHANTIER', lignes: [], sousTotal: 0 };
      devisParNiveau['fondation'] = { nom: 'I - FONDATION', lignes: [], sousTotal: 0 };
      
      if (resumeFondation) {
        const v = resumeFondation.volumes;
        
        const terrassements = [
          { id: 'fouilles', nom: 'Fouilles (Puits & Tranchées)', qte: v.fouillesPuits + (v.fouilleFilante || 0), unite: 'm3' },
          { id: 'remblai', nom: 'Remblais', qte: v.remblais, unite: 'm3' },
          { id: 'evacuation', nom: 'Evacuation', qte: v.evacuation, unite: 'm3' }
        ];
        for (const item of terrassements) {
          if (item.qte > 0) {
            const sousDetail = genererSousDetailPrix(item.id, null, regles, bibliothequePrix);
            const pt = Math.round(item.qte * sousDetail.prixVenteUnitaire);
            devisParNiveau['terrassement'].lignes.push({
              id: item.id, designation: item.nom, unite: item.unite,
              quantite: item.qte, pu: sousDetail.prixVenteUnitaire, pt, sousDetail, avertissements: sousDetail.avertissements
            });
            devisParNiveau['terrassement'].sousTotal += pt;
            totalGrosOeuvre += pt;
          }
        }

        const fondations = [
          { id: 'betonProprete', nom: 'Béton de propreté', qte: v.betonProprete, unite: 'm3' },
          { id: 'semelles', nom: 'Béton Armé Semelles + Amorces', qte: v.semelles, unite: 'm3' },
          { id: 'longrines', nom: 'Béton Armé Longrines', qte: v.longrines, unite: 'm3' },
          { id: 'soubassement', nom: 'Mur de soubassement', qte: v.murSoubassement, unite: 'm2' },
          { id: 'moellon', nom: 'Fondation en moellon', qte: v.moellon, unite: 'm3' }
        ];
        
        for (const item of fondations) {
          if (item.qte > 0) {
            const blocDonnees = metre.blocs[item.id] || null; 
            const sousDetail = genererSousDetailPrix(item.id, blocDonnees, regles, bibliothequePrix);
            const pt = Math.round(item.qte * sousDetail.prixVenteUnitaire);
            devisParNiveau['fondation'].lignes.push({
              id: item.id, designation: item.nom, unite: item.unite,
              quantite: item.qte, pu: sousDetail.prixVenteUnitaire, pt, sousDetail, avertissements: sousDetail.avertissements
            });
            devisParNiveau['fondation'].sousTotal += pt;
            totalGrosOeuvre += pt;
          }
        }
      }
    }

    for (const [blocId, blocDonnees] of Object.entries(metre.blocs)) {
      if (!blocDonnees || (!blocDonnees.total && !blocDonnees.lignes)) continue;
      
      const catGlobal = BLOCS_PARTICULIER[blocId];
      if (catGlobal === 'terrassement' || catGlobal === 'fondation') continue; 
      if (blocId === 'autresOuvrages' || blocId === 'armatures') continue;

      const sousDetail = genererSousDetailPrix(blocId, blocDonnees, regles, bibliothequePrix);
      if (sousDetail.prixVenteUnitaire > 0 || sousDetail.avertissements.length > 0) {
        const quantite = blocDonnees.total;
        const pt = Math.round(quantite * sousDetail.prixVenteUnitaire);
        
        devisParNiveau[niveauKey].lignes.push({
          id: blocId, designation: bibliothequeLibelles[blocId] || blocDonnees.libelle || blocId,
          unite: blocDonnees.unite, quantite, pu: sousDetail.prixVenteUnitaire, pt, sousDetail, avertissements: sousDetail.avertissements
        });
        devisParNiveau[niveauKey].sousTotal += pt;
        totalGrosOeuvre += pt;
      }
    }
  }

  devisParNiveau['second_oeuvre'] = { nom: 'V - SECOND OEUVRE', lignes: [], sousTotal: 0 };
  const forfaits = ['menuiseries', 'plomberie', 'electricite', 'revetement', 'peinture_forfait', 'etancheite'];
  for (const f of forfaits) {
    const pu = bibliothequePrix[f] || 0; 
    devisParNiveau['second_oeuvre'].lignes.push({
      id: f, designation: bibliothequeLibelles[f] || f.toUpperCase(), unite: 'ens', quantite: 1, pu, pt: pu, avertissements: pu === 0 ? ["Prix à saisir"] : []
    });
    devisParNiveau['second_oeuvre'].sousTotal += pu;
    totalSecondOeuvre += pu;
  }

  const totalHT = totalGrosOeuvre + totalSecondOeuvre;
  const tva = Math.round(totalHT * 0.18);
  const netAPayer = totalHT + tva;

  return { 
    niveaux: devisParNiveau, 
    cascade: {
      totalGrosOeuvre: Math.round(totalGrosOeuvre),
      totalSecondOeuvre: Math.round(totalSecondOeuvre),
      totalHT,
      tva,
      netAPayer
    },
    total: netAPayer 
  };
}
