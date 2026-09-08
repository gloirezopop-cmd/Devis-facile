import { createContext, useContext, useMemo } from 'react';
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

  const [soubassements, setSoubassements] = useLocalStorageState('df_soubassements_v3', []);

  const [escaliers, setEscaliers] = useLocalStorageState('df_escaliers_v3', []);

  const [moellons, setMoellons] = useLocalStorageState('df_moellons_v3', []);

  const [dallages, setDallages] = useLocalStorageState('df_dallages_v3', []);
  const [remblais, setRemblais] = useLocalStorageState('df_remblais_v3', []);

  const [sousPavements, setSousPavements] = useLocalStorageState('df_sous_pavements_v3', []);

  const [carrelages, setCarrelages] = useLocalStorageState('df_carrelages_v3', []);

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
    dosageBA: 350, coffrageTerre: false, inclureEau: false, appliquerCoefVente: false
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
    carreaux: '500', faience: '600', plinthe: '800', cimentColle: '650',
    peinture_latex: '2800', peinture_classique: '3200', peinture_chaux: '450',
    // Vide a dessein : le prix du terrassement a l'engin varie trop d'un
    // chantier a l'autre pour qu'une valeur par defaut ait un sens. Tant
    // qu'il n'est pas saisi, le devis affiche « Prix manquant ».
    terrassementEnginM3: ''
  });

  const [labelsPrix, setLabelsPrix] = useLocalStorageState('df_labelsPrix_v3', {
    ciment: "Ciment CPJ (sac de 50 kg)", sable: "Sable (tonne)", gravier: "Gravier (tonne)", eau: "Eau (m³)", moellon: "Moellon (tonne)",
    acierHA_16: "Fer HA 16 (barre de 12 m)", acierHA_14: "Fer HA 14 (barre de 12 m)", acierHA_12: "Fer HA 12 (barre de 12 m)", acierHA_10: "Fer HA 10 (barre de 12 m)", acierHA_8: "Fer HA 8 (barre de 12 m)", acierHA_6: "Fer HA 6 (barre de 12 m)", acierRL_8: "Fer RL 8 (barre de 12 m)", acierRL_6: "Fer RL 6 (barre de 12 m)", filLigature: "Fil de ligature (kg)",
    blocs: "Agglos creux (unité)", blocs_pleins: "Agglos pleins (unité)", planches: "Planches de coffrage (unité)", chevrons: "Chevrons (unité)", clous: "Clous de coffrage (kg)",
    bois_charpente: "Bois de charpente (m³)", clous_charpente: "Clous de charpente (kg)",
    toles: "Tôle BG28 (unité)", faitieres: "Faîtière (unité)", clous_toiture: "Pointes à tôle (kg)",
    carreaux: "Carreau 30x30 (unité)", faience: "Faïence (unité)", plinthe: "Plinthe (unité)", cimentColle: "Ciment-colle (kg)",
    peinture_latex: "Peinture latex (kg)", peinture_classique: "Peinture classique (L)", peinture_chaux: "Badigeon de chaux (kg)",
    terrassementEnginM3: "Terrassement à l'engin (m³)"
  });

  const [devisExcelSnapshot, setDevisExcelSnapshot] = useLocalStorageState('df_devisExcelSnapshot_v3', null);

  const bibliothequePrixNumerique = useMemo(() => {
    const biblio = {};
    for (const [key, value] of Object.entries(bibliothequePrix)) {
      biblio[key] = Number(value) || 0;
    }
    return biblio;
  }, [bibliothequePrix]);

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
      majorations: { ...majorations }
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
    semelles, amorces, longrines, colonnes, maconneries, escaliers, soubassements,
    moellons, dallages, remblais, sousPavements, carrelages, enduits,
    peintures, faiences, autresOuvrages, dalles, plancherHourdis12,
    plancherHourdis16, charpentes, couverturesToles, terrasses,
    taux, majorations, parametresProjet, bibliothequePrix, labelsPrix, devisExcelSnapshot
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
    if(data.escaliers) setEscaliers(data.escaliers);
    if(data.soubassements) setSoubassements(data.soubassements);
    if(data.moellons) setMoellons(data.moellons);
    if(data.dallages) setDallages(data.dallages);
    if(data.remblais) setRemblais(data.remblais);
    if(data.sousPavements) setSousPavements(data.sousPavements);
    if(data.carrelages) setCarrelages(data.carrelages);
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
    if(data.taux) setTaux(data.taux);
    if(data.majorations) setMajorations(data.majorations);
    if(data.parametresProjet) setParametresProjet(data.parametresProjet);
    if(data.bibliothequePrix) setBibliothequePrix(data.bibliothequePrix);
    if(data.labelsPrix) setLabelsPrix(data.labelsPrix);
    if(data.devisExcelSnapshot !== undefined) setDevisExcelSnapshot(data.devisExcelSnapshot);
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
      colonnes, setColonnes, maconneries, setMaconneries, linteaux, setLinteaux, escaliers, setEscaliers,
      soubassements, setSoubassements, moellons, setMoellons, dallages, setDallages, remblais, setRemblais,
      sousPavements, setSousPavements, carrelages, setCarrelages, enduits, setEnduits,
      peintures, setPeintures, faiences, setFaiences, autresOuvrages, setAutresOuvrages,
      dalles, setDalles, plancherHourdis12, setPlancherHourdis12, plancherHourdis16, setPlancherHourdis16,
      charpentes, setCharpentes, couverturesToles, setCouverturesToles, terrasses, setTerrasses,
      taux, setTaux, majorations, setMajorations, parametresProjet, setParametresProjet,
      bibliothequePrix, setBibliothequePrix, labelsPrix, setLabelsPrix, devisExcelSnapshot, setDevisExcelSnapshot,
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
