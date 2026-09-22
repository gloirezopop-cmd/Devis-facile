import { createContext, useContext, useMemo, useEffect } from 'react';
import useLocalStorageState from '../hooks/useLocalStorageState.js';
import { REGLES_DEFAUT } from '@devis-facile/moteur';
import { useAuth } from './AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';

const ProjetContext = createContext();

export function ProjetProvider({ children }) {
  const { session } = useAuth();
  const [ongletActif, setOngletActif] = useLocalStorageState('df_ongletActif_v3', 'saisie');
  const defaultAcierHyp = { 
    poteaux_prin: 12, poteaux_cadre: 8, 
    semelles_prinL: 10, semelles_espL: 0.15, semelles_prinLarg: 10, semelles_espLarg: 0.15,
    amorces_prin1: 10, amorces_nbrePrin1: 4, amorces_prin2: 10, amorces_nbrePrin2: 0, amorces_cadre: 8, amorces_espCadre: 0.15,
    longrines_prin: 10, longrines_cadre: 6 
  };
  const [niveaux, setNiveaux] = useLocalStorageState('df_niveaux_v3', [
    { id: 'terrassement', nom: '1. Terrassement', type: 'terrassement' },
    { id: 'fondation', nom: '2. Fondation', type: 'fondation', acierHyp: { ...defaultAcierHyp } },
    { id: 'elevation_1', nom: '3. Élévation RDC', type: 'elevation', acierHyp: { ...defaultAcierHyp } },
    { id: 'plancher_1', nom: '4. Plancher RDC', type: 'plancher', acierHyp: { ...defaultAcierHyp } },
    { id: 'toiture', nom: '5. Toiture', type: 'toiture' },
    { id: 'finition', nom: '6. Finition', type: 'finition' }
  ]);
  const [niveauActifId, setNiveauActifId] = useLocalStorageState('df_niveauActifId_v3', 'terrassement');

  // Helpers pour gérer les listes
  const [fouilles, setFouilles] = useLocalStorageState('df_fouilles_v3', []);
  const [betonProprete, setBetonProprete] = useLocalStorageState('df_betonProprete_v3', []);
  const [fouilleFilante, setFouilleFilante] = useLocalStorageState('df_fouilleFilante_v3', []);

  const [nivellement, setNivellement] = useLocalStorageState('df_nivellement_v3', []);
  const [terrassementGrandeSurface, setTerrassementGrandeSurface] = useLocalStorageState('df_terrassementGrandeSurface_v3', []);

  const [semelles, setSemelles] = useLocalStorageState('df_semelles_v3', []);
  const [amorces, setAmorces] = useLocalStorageState('df_amorces_v3', []);
  const [longrines, setLongrines] = useLocalStorageState('df_longrines_v3', []);
  const [colonnes, setColonnes] = useLocalStorageState('df_colonnes_v3', []);

  const [maconneries, setMaconneries] = useLocalStorageState('df_maconneries_v3', []);
  const [linteaux, setLinteaux] = useLocalStorageState('df_linteaux_v3', []);
  const [ceintures, setCeintures] = useLocalStorageState('df_ceintures_v3', []);

  const [soubassements, setSoubassements] = useLocalStorageState('df_soubassements_v3', []);

  const [escaliers, setEscaliers] = useLocalStorageState('df_escaliers_v3', []);

  const [moellons, setMoellons] = useLocalStorageState('df_moellons_v3', []);

  const [dallages, setDallages] = useLocalStorageState('df_dallages_v3', []);
  const [remblais, setRemblais] = useLocalStorageState('df_remblais_v3', []);

  const [sousPavements, setSousPavements] = useLocalStorageState('df_sous_pavements_v3', []);

  const [carrelagesC1, setCarrelagesC1] = useLocalStorageState('df_carrelagesC1_v4', []);
  const [carrelagesC2, setCarrelagesC2] = useLocalStorageState('df_carrelagesC2_v4', []);
  const [plinthes, setPlinthes] = useLocalStorageState('df_plinthes_v4', []);

  const [enduits, setEnduits] = useLocalStorageState('df_enduits_v3', []);

  const [peintures, setPeintures] = useLocalStorageState('df_peintures_v3', []);

  const [faiences, setFaiences] = useLocalStorageState('df_faiences_v3', []);

  const [autresOuvrages, setAutresOuvrages] = useLocalStorageState('df_autresOuvrages_v3', []);

  const [dalles, setDalles] = useLocalStorageState('df_dalles_v3', []);

  const [plancherHourdis12, setPlancherHourdis12] = useLocalStorageState('df_plancherHourdis12_v3', []);

  const [plancherHourdis16, setPlancherHourdis16] = useLocalStorageState('df_plancherHourdis16_v3', []);

  const [charpentes, setCharpentes] = useLocalStorageState('df_charpentes_v3', []);

  const [couverturesToles, setCouverturesToles] = useLocalStorageState('df_couverturesToles_v3', []);

  const [terrasses, setTerrasses] = useLocalStorageState('df_terrasses_v3', []);

  const [toituresPro, setToituresPro] = useLocalStorageState('df_toituresPro_v3', []);

  const [taux, setTaux] = useLocalStorageState('df_taux_v3', { ...REGLES_DEFAUT.taux });
  
  const [majorations, setMajorations] = useLocalStorageState('df_majorations_v3', {
    planches: 1.10, chevrons: 1.10, blocs: 1.10, acier: 1.00, sable: 1.00, gravier: 1.00, toles: 1.10, carreaux: 1.10, faience: 1.10,
  });

  const [parametresProjet, setParametresProjet] = useLocalStorageState('df_parametresProjet_v3', {
    maitreOuvrage: '', nomEntreprise: '', localisation: '', reference: '', 
    cimentType: '42.5', 
    cimentTypeBP: '42.5', dosageBP: 150, 
    cimentTypeSemelles: '42.5', dosageSemelles: 350,
    cimentTypeLongrines: '42.5', dosageLongrines: 350,
    cimentTypeColonnes: '42.5', dosageColonnes: 350,
    cimentTypePoutres: '42.5', dosagePoutres: 350,
    cimentTypeDalles: '42.5', dosageDalles: 350,
    cimentTypeEscaliers: '42.5', dosageEscaliers: 350,
    dosageBA: 350, coffrageTerre: false, inclureEau: false, appliquerCoefVente: false,
    plancher164: {
      hourdisL: 0.5, hourdisl: 0.2, hc: 0.04, hh: 0.16,
      entraxe: 0.6,
      pertes: { hourdis: 5, beton: 5, acier: 5 },
      acier: { longueurBarre: 12 }
    }
  });

  const [bibliothequePrix, setBibliothequePrix] = useLocalStorageState('df_bibliothequePrix_v3', {
    ciment: '5500', sable: '15000', gravier: '25000', eau: '1500', moellon: '17000',
    acierHA_16: '10800', acierHA_14: '8200', acierHA_12: '6000', acierHA_10: '4200',
    acierHA_8: '2700', acierHA_6: '1500', acierRL_8: '2250', acierRL_6: '1250',
    filLigature: '1200',
    blocs: '450', blocs_pleins: '600',
    planches: '3000', chevrons: '2200', clous: '1000',
    bois_charpente: '180000', clous_charpente: '1000',
    toles: '7500', faitieres: '8500', clous_toiture: '1000',
    carreauxC1: '5000', carreauxCartonC1: '60000', carreauxC2: '2500', carreauxCartonC2: '30000', faience: '600', faienceCarton: '6000', plinthe: '800', cimentColle: '650', jointCarrelage: '1500',
    peinture_latex: '2800', peinture_classique: '3200', peinture_chaux: '450',
    // Vide a dessein : le prix du terrassement a l'engin varie trop d'un
    // chantier a l'autre pour qu'une valeur par defaut ait un sens. Tant
    // qu'il n'est pas saisi, le devis affiche « Prix manquant ».
    terrassementEnginM3: ''
  });

  const [labelsPrix, setLabelsPrix] = useLocalStorageState('df_labelsPrix_v4', {
    ciment: "Ciment CPJ", sable: "Sable", gravier: "Gravier", eau: "Eau", moellon: "Moellon",
    acierHA_16: "Fer HA 16", acierHA_14: "Fer HA 14", acierHA_12: "Fer HA 12", acierHA_10: "Fer HA 10", acierHA_8: "Fer HA 8", acierHA_6: "Fer HA 6", acierRL_8: "Fer RL 8", acierRL_6: "Fer RL 6", filLigature: "Fil de ligature",
    blocs: "Agglos creux", blocs_pleins: "Agglos pleins", planches: "Planches de coffrage", chevrons: "Chevrons", clous: "Clous de coffrage",
    bois_charpente: "Bois de charpente", clous_charpente: "Clous de charpente",
    toles: "Tôle BG28", faitieres: "Faîtière", clous_toiture: "Pointes à tôle",
    carreauxC1: "Carreau grès cérame 60×60 cm – Premium", carreauxCartonC1: "Carton Carreau Premium", carreauxC2: "Carreau céramique 30×30 cm – Standard", carreauxCartonC2: "Carton Carreau Standard", faience: "Faïence murale 25×40 cm", faienceCarton: "Carton de Faïences", plinthe: "Plinthe", cimentColle: "Ciment-colle", jointCarrelage: "Joint pour carrelage",
    peinture_latex: "Peinture latex", peinture_classique: "Peinture classique", peinture_chaux: "Badigeon de chaux",
    terrassementEnginM3: "Terrassement à l'engin"
  });

  const [devisExcelSnapshot, setDevisExcelSnapshot] = useLocalStorageState('df_devisExcelSnapshot_v4', null);
  // L'empreinte du devis au moment ou la version Excel en a ete tiree : elle
  // permet de dire que la feuille date d'avant la derniere modification du metre.
  const [devisExcelSignature, setDevisExcelSignature] = useLocalStorageState('df_devisExcelSignature_v4', null);

  const bibliothequePrixNumerique = useMemo(() => {
    const biblio = {};
    for (const [key, value] of Object.entries(bibliothequePrix)) {
      biblio[key] = Number(value) || 0;
    }
    return biblio;
  }, [bibliothequePrix]);

  useEffect(() => {
    let hasParens = false;
    const cleaned = {};
    for (const [k, v] of Object.entries(labelsPrix)) {
      if (typeof v === 'string' && v.includes('(')) {
        hasParens = true;
        cleaned[k] = v.replace(/\s*\([^)]*\)/g, '').trim();
      } else {
        cleaned[k] = v;
      }
    }
    if (hasParens) {
      setLabelsPrix(cleaned);
    }
  }, [labelsPrix, setLabelsPrix]);

  const reglesPersonnalisees = useMemo(() => {
    return {
      ...REGLES_DEFAUT,
      taux: { ...taux },
      dosages: { 
        ...REGLES_DEFAUT.dosages, 
        betonProprete: parametresProjet.dosageBP, 
        semelles: parametresProjet.dosageSemelles || 350,
        amorces: parametresProjet.dosageSemelles || 350, // Partage le même dosage que semelles par défaut
        longrines: parametresProjet.dosageLongrines || 350,
        colonnes: parametresProjet.dosageColonnes || 350,
        ceintures: parametresProjet.dosagePoutres || 350,
        poutres: parametresProjet.dosagePoutres || 350,
        dalles: parametresProjet.dosageDalles || 350,
        escalier: parametresProjet.dosageEscaliers || 350,
        betonArme: parametresProjet.dosageBA 
      },
      cimentTypes: {
        betonProprete: parametresProjet.cimentTypeBP || '42.5',
        semelles: parametresProjet.cimentTypeSemelles || '42.5',
        amorces: parametresProjet.cimentTypeSemelles || '42.5', // Partage le même ciment
        longrines: parametresProjet.cimentTypeLongrines || '42.5',
        colonnes: parametresProjet.cimentTypeColonnes || '42.5',
        ceintures: parametresProjet.cimentTypePoutres || '42.5',
        poutres: parametresProjet.cimentTypePoutres || '42.5',
        dalles: parametresProjet.cimentTypeDalles || '42.5',
        escalier: parametresProjet.cimentTypeEscaliers || '42.5',
      },
      coffrage: { ...REGLES_DEFAUT.coffrage, terrePourFondations: parametresProjet.coffrageTerre },
      acier: { ...REGLES_DEFAUT.acier },
      majorations: { ...majorations },
      plancher164: {
        ...(parametresProjet.plancher164 || {
          hourdisL: 0.5, hourdisl: 0.2, hc: 0.04, hh: 0.16,
          entraxe: 0.6,
          pertes: { hourdis: 5, beton: 5, acier: 5 },
          acier: { longueurBarre: 12, treillisHte: 8, treillisBasse: 6, diag: 5, pas: 0.2, Ht: 0.12 }
        }),
        nappe: {
          diametre: parametresProjet.nappeDiametre || 6,
          espacement: (parametresProjet.nappeEspacement || 20) / 100
        },
        poutrelles: {
          nbBarres: parametresProjet.poutrelleNbBarres || 2,
          diametre: parametresProjet.poutrelleDiametre || 8,
          espacement: (parametresProjet.poutrelleEspacement || 20) / 100
        }
      }
    };
  }, [taux, parametresProjet, majorations]);

  const addRow = (state, setState, defaults, prefix) => {
    const nextId = state.length > 0 ? Math.max(...state.map(s => s.id)) + 1 : 1;
    setState([...state, { id: nextId, repere: `${prefix}${nextId}`, ...defaults }]);
  };

  const removeRow = (state, setState, id) => {
    setState(state.filter(s => s.id !== id));
  };

  const updateRow = (state, setState, id, field, value) => {
    setState(state.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // -----------------------------------------------------
  // SUPABASE SYNC LOGIC
  // -----------------------------------------------------
  const gatherProjectData = () => ({
    niveaux, fouilles, betonProprete, fouilleFilante, nivellement, terrassementGrandeSurface,
    semelles, amorces, longrines, colonnes, maconneries, linteaux, ceintures, escaliers, soubassements,
    moellons, dallages, remblais, sousPavements, carrelagesC1, carrelagesC2, plinthes, enduits,
    peintures, faiences, autresOuvrages, dalles, plancherHourdis12,
    plancherHourdis16, charpentes, couverturesToles, terrasses, toituresPro,
    taux, majorations, parametresProjet, bibliothequePrix, labelsPrix, devisExcelSnapshot, devisExcelSignature
  });

  const loadProjectData = (data) => {
    if(data.niveaux) setNiveaux(data.niveaux);
    if(data.fouilles) setFouilles(data.fouilles);
    if(data.betonProprete) setBetonProprete(data.betonProprete);
    if(data.fouilleFilante) setFouilleFilante(data.fouilleFilante);
    if(data.nivellement) setNivellement(data.nivellement);
    if(data.terrassementGrandeSurface) setTerrassementGrandeSurface(data.terrassementGrandeSurface);
    if(data.semelles) setSemelles(data.semelles);
    if(data.amorces) setAmorces(data.amorces);
    if(data.longrines) setLongrines(data.longrines);
    if(data.colonnes) setColonnes(data.colonnes);
    if(data.maconneries) setMaconneries(data.maconneries);
    if(data.linteaux) setLinteaux(data.linteaux);
    if(data.ceintures) setCeintures(data.ceintures);
    if(data.escaliers) setEscaliers(data.escaliers);
    if(data.soubassements) setSoubassements(data.soubassements);
    if(data.moellons) setMoellons(data.moellons);
    if(data.dallages) setDallages(data.dallages);
    if(data.remblais) setRemblais(data.remblais);
    if(data.sousPavements) setSousPavements(data.sousPavements);
    if(data.carrelagesC1) setCarrelagesC1(data.carrelagesC1);
    if(data.carrelagesC2) setCarrelagesC2(data.carrelagesC2);
    if(data.plinthes) setPlinthes(data.plinthes);
    if(data.enduits) setEnduits(data.enduits);
    if(data.peintures) setPeintures(data.peintures);
    if(data.faiences) setFaiences(data.faiences);
    if(data.autresOuvrages) setAutresOuvrages(data.autresOuvrages);
    if(data.dalles) setDalles(data.dalles);
    if(data.plancherHourdis12) setPlancherHourdis12(data.plancherHourdis12);
    if(data.plancherHourdis16) setPlancherHourdis16(data.plancherHourdis16);
    if(data.charpentes) setCharpentes(data.charpentes);
    if(data.couverturesToles) setCouverturesToles(data.couverturesToles);
    if(data.terrasses) setTerrasses(data.terrasses);
    if(data.toituresPro) setToituresPro(data.toituresPro);
    if(data.taux) setTaux(data.taux);
    if(data.majorations) setMajorations(data.majorations);
    if(data.parametresProjet) setParametresProjet(data.parametresProjet);
    if(data.bibliothequePrix) setBibliothequePrix(data.bibliothequePrix);
    if(data.labelsPrix) setLabelsPrix(data.labelsPrix);
    if(data.devisExcelSnapshot !== undefined) setDevisExcelSnapshot(data.devisExcelSnapshot);
    if(data.devisExcelSignature !== undefined) setDevisExcelSignature(data.devisExcelSignature);
  };

  const saveProjectToCloud = async (customName = null) => {
    if (!session?.user) throw new Error("Vous devez être connecté pour sauvegarder dans le cloud.");
    
    const data = gatherProjectData();
    const projectName = customName || parametresProjet.reference || 'Nouveau Projet Devis Facile';

    const { error } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        data: data,
        user_id: session.user.id
      });
      
    if (error) throw error;
  };

  return (
    <ProjetContext.Provider value={{
      ongletActif, setOngletActif, niveaux, setNiveaux, niveauActifId, setNiveauActifId,
      fouilles, setFouilles, betonProprete, setBetonProprete, fouilleFilante, setFouilleFilante,
      nivellement, setNivellement, terrassementGrandeSurface, setTerrassementGrandeSurface, semelles, setSemelles, amorces, setAmorces, longrines, setLongrines,
      colonnes, setColonnes, maconneries, setMaconneries, linteaux, setLinteaux, ceintures, setCeintures, escaliers, setEscaliers,
      soubassements, setSoubassements, moellons, setMoellons, dallages, setDallages, remblais, setRemblais,
      sousPavements, setSousPavements, carrelagesC1, setCarrelagesC1, carrelagesC2, setCarrelagesC2, plinthes, setPlinthes, enduits, setEnduits,
      peintures, setPeintures, faiences, setFaiences, autresOuvrages, setAutresOuvrages,
      dalles, setDalles, plancherHourdis12, setPlancherHourdis12, plancherHourdis16, setPlancherHourdis16,
      charpentes, setCharpentes, couverturesToles, setCouverturesToles, terrasses, setTerrasses,
      toituresPro, setToituresPro,
      taux, setTaux, majorations, setMajorations, parametresProjet, setParametresProjet,
      bibliothequePrix, setBibliothequePrix, labelsPrix, setLabelsPrix, devisExcelSnapshot, setDevisExcelSnapshot,
      devisExcelSignature, setDevisExcelSignature,
      bibliothequePrixNumerique, reglesPersonnalisees,
      addRow, removeRow, updateRow, defaultAcierHyp,
      
      saveProjectToCloud, loadProjectData
    }}>
      {children}
    </ProjetContext.Provider>
  );
}

export function useProjet() {
  return useContext(ProjetContext);
}
