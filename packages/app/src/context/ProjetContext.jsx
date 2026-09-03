import { createContext, useContext, useMemo } from 'react';
import useLocalStorageState from '../hooks/useLocalStorageState.js';
import { REGLES_DEFAUT } from '@devis-facile/moteur';

const ProjetContext = createContext();

export function ProjetProvider({ children }) {
  const [ongletActif, setOngletActif] = useLocalStorageState('df_ongletActif', 'saisie');

  const defaultAcierHyp = { poteaux_prin: 12, poteaux_cadre: 8, semelles_prin: 10, longrines_prin: 10, longrines_cadre: 6 };

  const [niveaux, setNiveaux] = useLocalStorageState('df_niveaux_v2', [
    { id: 'terrassement', nom: '1. Terrassement', type: 'terrassement' },
    { id: 'fondation', nom: '2. Fondation', type: 'fondation', acierHyp: { ...defaultAcierHyp } },
    { id: 'elevation_1', nom: '3. Élévation RDC', type: 'elevation', acierHyp: { ...defaultAcierHyp } },
    { id: 'plancher_1', nom: '4. Plancher RDC', type: 'plancher', acierHyp: { ...defaultAcierHyp } },
    { id: 'toiture', nom: '5. Toiture', type: 'toiture' },
    { id: 'finition', nom: '6. Finition', type: 'finition' }
  ]);
  const [niveauActifId, setNiveauActifId] = useLocalStorageState('df_niveauActifId_v2', 'terrassement');

  // Helpers pour gérer les listes
  const [fouilles, setFouilles] = useLocalStorageState('df_fouilles', [{ id: 1, niveauId: 'fondation', repere: 'F1', longueur: '10', largeur: '0.5', profondeur: '0.8', nombre: '1' }]);
  const [betonProprete, setBetonProprete] = useLocalStorageState('df_betonProprete', [{ id: 1, niveauId: 'fondation', repere: 'BP1', longueur: '10', largeur: '0.6', epaisseur: '0.05', nombre: '1' }]);
  const [fouilleFilante, setFouilleFilante] = useLocalStorageState('df_fouilleFilante', [{
    id: 1, niveauId: 'terrassement', repere: 'FF1', longueur: '60.85', largeur: '0.6', profondeur: '0.65', nombre: '1'
  }]);

  const [nivellement, setNivellement] = useLocalStorageState('df_nivellement', [{
    id: 1, niveauId: 'terrassement', repere: 'NIV1', longueur: '9.65', largeur: '7.15', epaisseur: '0.3', nombre: '1'
  }]);

  const [semelles, setSemelles] = useLocalStorageState('df_semelles', [{ id: 1, niveauId: 'fondation', repere: 'S1', longueur: '1.2', largeur: '1.2', hauteur: '0.3', nombre: '4', diametrePrin: 10, espacement: 0.15 }]);
  const [longrines, setLongrines] = useLocalStorageState('df_longrines', [{ id: 1, niveauId: 'fondation', repere: 'L1', perimetre: '20', largeur: '0.2', hauteur: '0.4', nombre: '1', diametrePrin: 12, diametreCadre: 6, nbreBarresPrin: 4, espacementCadre: 0.20 }]);
  const [colonnes, setColonnes] = useLocalStorageState('df_colonnes', [{ id: 1, niveauId: 'elevation_1', repere: 'C1', sectionA: '20', sectionB: '20', hauteur: '3.2', nombre: '6', diametrePrin: 12, diametreCadre: 8, nbreBarresPrin: 4, espacementCadre: 0.15 }]);

  const [maconneries, setMaconneries] = useLocalStorageState('df_maconneries', [{
    id: 1, niveauId: 'elevation_1', repere: 'M1', longueur: '30', hauteur: '3.2', nombre: '1',
    ouvertures: [{ id: 1, repere: 'P1', type: 'Porte', largeur: '0.9', hauteur: '2.1', nombre: '2' }]
  }]);

  const [soubassements, setSoubassements] = useLocalStorageState('df_soubassements', [{
    id: 1, niveauId: 'fondation', repere: 'MS1', perimetre: '40', hauteur: '0.8', nombre: '1', ouvertures: []
  }]);

  const [escaliers, setEscaliers] = useLocalStorageState('df_escaliers', [{
    id: 1, niveauId: 'elevation_1', repere: 'ESC1', mode: 'geometrie', nombre: '1',
    volees: [{
      id: 1,
      hauteurAMonter: '1.53', nombreContremarches: '9', giron: '0.28', largeur: '1.20',
      epaisseurPaillasse: '0.15', typeEpaisseur: 'perpendiculaire', convention: 'arrivee_palier',
      ferraillage: {
        principales: { diametre: 12, espacement: 0.15 },
        repartition: { diametre: 8, espacement: 0.20 },
        chapeaux: { actif: true, diametre: 10, espacement: 0.15, longueurAppui: '' },
        repartitionSup: { actif: true, diametre: 8, espacement: 0.20 }
      }
    }],
    paliers: [{
      id: 1, longueur: '1.20', largeur: '1.20', epaisseur: '0.15',
      ferraillage: { diametre: 10, espacement: 0.15 }
    }]
  }]);

  const [moellons, setMoellons] = useLocalStorageState('df_moellons', [{
    id: 1, niveauId: 'fondation', repere: 'MO1', perimetre: '40', largeurBase: '0.3', hauteur: '0.6', nombre: '1'
  }]);

  const [chapeEgalisations, setChapeEgalisations] = useLocalStorageState('df_chapes', [{
    id: 1, niveauId: 'fondation', repere: 'CH1', perimetre: '40', largeur: '0.4', epaisseur: '0.05', nombre: '1'
  }]);

  const [sousPavements, setSousPavements] = useLocalStorageState('df_sous_pavements', [{
    id: 1, niveauId: 'fondation', repere: 'SP1', longueur: '10', largeur: '8', epaisseur: '0.1', nombre: '1'
  }]);

  const [carrelages, setCarrelages] = useLocalStorageState('df_carrelages', [{
    id: 1, niveauId: 'finition', repere: 'SDB1', longueur: '4.2', largeur: '3.5', nombre: '1', perimetre: ''
  }]);

  const [enduits, setEnduits] = useLocalStorageState('df_enduits', [{
    id: 1, niveauId: 'finition', repere: 'END1', surface: '', nombre: '1' // Si surface est vide, utilise la logique par défaut (2 * maçonnerie)
  }]);

  const [peintures, setPeintures] = useLocalStorageState('df_peintures', [{
    id: 1, niveauId: 'finition', repere: 'PNT1', longueur: '12', hauteur: '3', type: 'latex', nombre: '1'
  }]);

  const [faiences, setFaiences] = useLocalStorageState('df_faiences', [{
    id: 1, niveauId: 'finition', repere: 'FA1', longueur: '3', hauteur: '2', nombre: '1'
  }]);

  const [autresOuvrages, setAutresOuvrages] = useLocalStorageState('df_autresOuvrages', [{
    id: 1, niveauId: 'finition', materiauKey: 'fouilles', unite: 'ff', quantite: '1'
  }]);

  const [dalles, setDalles] = useLocalStorageState('df_dalles', [{
    id: 1, niveauId: 'plancher_1', repere: 'D1', longueur: '9.65', largeur: '7.15', epaisseurCm: '10', nombre: '1'
  }]);

  const [plancherHourdis12, setPlancherHourdis12] = useLocalStorageState('df_plancherHourdis12', [{
    id: 1, niveauId: 'plancher_1', repere: 'PH12', longueur: '9.65', largeur: '7.15', nombre: '1'
  }]);

  const [plancherHourdis16, setPlancherHourdis16] = useLocalStorageState('df_plancherHourdis16', [{
    id: 1, niveauId: 'plancher_1', repere: 'PH16', longueur: '9.65', largeur: '7.15', nombre: '1'
  }]);

  const [charpentes, setCharpentes] = useLocalStorageState('df_charpentes', [{
    id: 1, niveauId: 'toiture', repere: 'CH1', longueur: '9.65', portee: '7.15', debord: '0.50', faitage: '1.50', ecartement: '2.50', section: '0.08', lignesPannes: '5', nombre: '1'
  }]);

  const [couverturesToles, setCouverturesToles] = useLocalStorageState('df_couverturesToles', [{
    id: 1, niveauId: 'toiture', repere: 'CV1', longueur: '9.65', portee: '7.15', debord: '0.50', nombre: '1'
  }]);

  const [terrasses, setTerrasses] = useLocalStorageState('df_terrasses', [{
    id: 1, niveauId: 'toiture', repere: 'T1', longueur: '9.65', largeur: '7.15', perimetre: '33.60', largeurChainage: '0.15', hauteurChainage: '0.15', hauteurAcrotere: '0.60', nombre: '1'
  }]);

  const [taux, setTaux] = useLocalStorageState('df_taux', { ...REGLES_DEFAUT.taux });
  
  const [majorations, setMajorations] = useLocalStorageState('df_majorations', {
    planches: 1.10,
    chevrons: 1.10,
    blocs: 1.10,
    acier: 1.00,
    sable: 1.00,
    gravier: 1.00,
    ciment: 1.00,
    eau: 1.00,
    moellon: 1.00,
    toles: 1.10,
    carreaux: 1.10,
    faience: 1.10,
  });

  const [parametresProjet, setParametresProjet] = useLocalStorageState('df_parametresProjet', {
    maitreOuvrage: '',
    localisation: '',
    reference: '',
    cimentType: '42.5',
    acierType: 'FeE500',
    dosageBP: 150,
    dosageBA: 350,
    coffrageTerre: false,
    inclureEau: false,
    appliquerCoefVente: false
  });

  // ATTENTION : les cles sont les identifiants de materiaux que les recettes
  // emettent (voir recettes.js). Renommer une cle ici la debranche du devis :
  // le prix saisi n'est plus retrouve et la ligne ressort a zero franc.
  const [bibliothequePrix, setBibliothequePrix] = useLocalStorageState('df_bibliothequePrix_v2', {
    ciment: '5500', sable: '15000', gravier: '25000', eau: '1500', moellon: '17000',
    acierHA_16: '10800', acierHA_14: '8200', acierHA_12: '6000', acierHA_10: '4200',
    acierHA_8: '2700', acierHA_6: '1500', acierRL_8: '2250', acierRL_6: '1250',
    filLigature: '1200',
    blocs: '450', blocs_pleins: '600',
    planches: '3000', chevrons: '2200', clous: '1000',
    bois_charpente: '180000', clous_charpente: '1000',
    toles: '7500', faitieres: '8500', clous_toiture: '1000',
    carreaux: '500', faience: '600', plinthe: '800', cimentColle: '650',
    peinture_latex: '2800', peinture_classique: '3200', peinture_chaux: '450'
  });

  // Memes cles que bibliothequePrix : ce sont les designations qui apparaissent
  // dans le devis. Une cle sans libelle s'affiche sous son identifiant brut.
  const [labelsPrix, setLabelsPrix] = useLocalStorageState('df_labelsPrix_v2', {
    ciment: "Ciment CPJ (sac de 50 kg)", sable: "Sable (tonne)", gravier: "Gravier (tonne)",
    eau: "Eau (m³)", moellon: "Moellon (tonne)",
    acierHA_16: "Fer HA 16 (barre de 12 m)", acierHA_14: "Fer HA 14 (barre de 12 m)",
    acierHA_12: "Fer HA 12 (barre de 12 m)", acierHA_10: "Fer HA 10 (barre de 12 m)",
    acierHA_8: "Fer HA 8 (barre de 12 m)", acierHA_6: "Fer HA 6 (barre de 12 m)",
    acierRL_8: "Fer RL 8 (barre de 12 m)", acierRL_6: "Fer RL 6 (barre de 12 m)",
    filLigature: "Fil de ligature (kg)",
    blocs: "Agglos creux (unité)", blocs_pleins: "Agglos pleins (unité)",
    planches: "Planches de coffrage (unité)", chevrons: "Chevrons (unité)", clous: "Clous de coffrage (kg)",
    bois_charpente: "Bois de charpente (m³)", clous_charpente: "Clous de charpente (kg)",
    toles: "Tôle BG28 (unité)", faitieres: "Faîtière (unité)", clous_toiture: "Pointes à tôle (kg)",
    carreaux: "Carreau 30x30 (unité)", faience: "Faïence (unité)", plinthe: "Plinthe (unité)",
    cimentColle: "Ciment-colle (kg)",
    peinture_latex: "Peinture latex (kg)", peinture_classique: "Peinture classique (L)",
    peinture_chaux: "Badigeon de chaux (kg)"
  });

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
        betonArme: parametresProjet.dosageBA
      },
      coffrage: {
        ...REGLES_DEFAUT.coffrage,
        terrePourFondations: parametresProjet.coffrageTerre
      },
      acier: {
        ...REGLES_DEFAUT.acier
      },
      majorations: {
        ...majorations
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

  return (
    <ProjetContext.Provider value={{
      ongletActif, setOngletActif,
      niveaux, setNiveaux,
      niveauActifId, setNiveauActifId,
      fouilles, setFouilles,
      betonProprete, setBetonProprete,
      fouilleFilante, setFouilleFilante,
      nivellement, setNivellement,
      semelles, setSemelles,
      longrines, setLongrines,
      colonnes, setColonnes,
      maconneries, setMaconneries,
      escaliers, setEscaliers,
      soubassements, setSoubassements,
      moellons, setMoellons,
      chapeEgalisations, setChapeEgalisations,
      sousPavements, setSousPavements,
      carrelages, setCarrelages,
      enduits, setEnduits,
      peintures, setPeintures,
      faiences, setFaiences,
      autresOuvrages, setAutresOuvrages,
      dalles, setDalles,
      plancherHourdis12, setPlancherHourdis12,
      plancherHourdis16, setPlancherHourdis16,
      charpentes, setCharpentes,
      couverturesToles, setCouverturesToles,
      terrasses, setTerrasses,
      taux, setTaux,
      majorations, setMajorations,
      parametresProjet, setParametresProjet,
      bibliothequePrix, setBibliothequePrix,
      labelsPrix, setLabelsPrix,
      bibliothequePrixNumerique,
      reglesPersonnalisees,
      addRow, removeRow, updateRow,
      defaultAcierHyp
    }}>
      {children}
    </ProjetContext.Provider>
  );
}

export function useProjet() {
  return useContext(ProjetContext);
}
