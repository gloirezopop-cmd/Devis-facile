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
  const [semelles, setSemelles] = useLocalStorageState('df_semelles', [{ id: 1, niveauId: 'fondation', repere: 'S1', longueur: '1.2', largeur: '1.2', hauteur: '0.3', nombre: '4', diametrePrin: 10, espacement: 0.15 }]);
  const [longrines, setLongrines] = useLocalStorageState('df_longrines', [{ id: 1, niveauId: 'fondation', repere: 'L1', longueur: '20', largeur: '0.2', hauteur: '0.4', nombre: '1' }]);
  const [colonnes, setColonnes] = useLocalStorageState('df_colonnes', [{ id: 1, niveauId: 'elevation_1', repere: 'C1', sectionA: '20', sectionB: '20', hauteur: '3.2', nombre: '6', diametrePrin: 12, diametreCadre: 8, nbreBarresPrin: 4, espacementCadre: 0.15 }]);

  const [maconneries, setMaconneries] = useLocalStorageState('df_maconneries', [{
    id: 1, niveauId: 'elevation_1', repere: 'M1', longueur: '30', hauteur: '3.2', nombre: '1',
    ouvertures: [{ id: 1, repere: 'P1', type: 'Porte', largeur: '0.9', hauteur: '2.1', nombre: '2' }]
  }]);

  const [soubassements, setSoubassements] = useLocalStorageState('df_soubassements', [{
    id: 1, niveauId: 'fondation', repere: 'MS1', longueur: '40', hauteur: '0.8', nombre: '1', ouvertures: []
  }]);

  const [carrelages, setCarrelages] = useLocalStorageState('df_carrelages', [{
    id: 1, niveauId: 'finition', repere: 'SDB1', longueur: '4.2', largeur: '3.5', nombre: '1', perimetre: ''
  }]);

  const [autresOuvrages, setAutresOuvrages] = useLocalStorageState('df_autresOuvrages', [{
    id: 1, niveauId: 'finition', materiauKey: 'fouilles', unite: 'ff', quantite: '1'
  }]);

  const [taux, setTaux] = useLocalStorageState('df_taux', { ...REGLES_DEFAUT.taux });
  
  const [parametresProjet, setParametresProjet] = useLocalStorageState('df_parametresProjet', {
    cimentType: '42.5',
    acierType: 'FeE500',
    dosageBP: 150,
    dosageBA: 350,
    coffrageTerre: false
  });

  const [bibliothequePrix, setBibliothequePrix] = useLocalStorageState('df_bibliothequePrix', {
    ciment: '5500', sable: '15000', gravier: '25000', acier: '450',
    acier_HA16: '6000', acier_HA14: '5500', acier_HA12: '4200', acier_HA10: '3350',
    acier_HA8: '2250', acier_RL8: '2250', acier_RL6: '1250', fil_ligature: '1200',
    fouilles: '1500', remblai: '1000', agglos: '450', agglos_pleins: '600',
    mortier: '30000', beton: '65000', carrelage: '4500', plinthe: '800',
    planches: '2500', lattes: '1000', fil_attache: '1200', pointes: '15000'
  });

  const [labelsPrix, setLabelsPrix] = useLocalStorageState('df_labelsPrix', {
    ciment: "Ciment CPJ (sac de 50kg)", sable: "Sable (Tonne)", gravier: "Gravier (Tonne)",
    acier: "Acier HA (kg)", acier_HA16: "Fer HA 16 (barre)", acier_HA14: "Fer HA 14 (barre)",
    acier_HA12: "Fer HA 12 (barre)", acier_HA10: "Fer HA 10 (barre)", acier_HA8: "Fer HA 8 (barre)",
    acier_RL8: "Fer RL 8 (barre)", acier_RL6: "Fer RL 6 (barre)", fil_ligature: "Fil de ligature (kg)",
    fouilles: "Fouilles en rigoles (m³)", remblai: "Remblai (m³)", agglos: "Agglos creux (Unité)",
    agglos_pleins: "Agglos pleins (Unité)", mortier: "Mortier (m³)", beton: "Béton Armé (m³)",
    carrelage: "Carrelage 60x60 (m²)", plinthe: "Plinthe (ml)", planches: "Planches de coffrage (Unité)",
    lattes: "Lattes (Unité)", fil_attache: "Fil d'attache (kg)", pointes: "Pointes (kg)"
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
      }
    };
  }, [taux, parametresProjet]);

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
      semelles, setSemelles,
      longrines, setLongrines,
      colonnes, setColonnes,
      maconneries, setMaconneries,
      soubassements, setSoubassements,
      carrelages, setCarrelages,
      autresOuvrages, setAutresOuvrages,
      taux, setTaux,
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
