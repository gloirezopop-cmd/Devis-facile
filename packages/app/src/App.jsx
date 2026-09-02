import React from 'react';
import { ProjetProvider, useProjet } from './context/ProjetContext.jsx';
import { useMetre } from './hooks/useMetre.js';
import { useDevis } from './hooks/useDevis.js';

import ParametresProjet from './components/sections/ParametresProjet.jsx';
import Terrassement from './components/sections/Terrassement.jsx';
import Fondation from './components/sections/Fondation.jsx';
import Elevation from './components/sections/Elevation.jsx';
import Plancher from './components/sections/Plancher.jsx';
import Toiture from './components/sections/Toiture.jsx';
import Finition from './components/sections/Finition.jsx';
import { useExport } from './hooks/useExport.js';
import OuvragesSupplementaires from './components/sections/OuvragesSupplementaires.jsx';
import TableauDevis from './components/sections/TableauDevis.jsx';
import TableurDevis from './components/sections/TableurDevis.jsx';
import { generateWorkbookData } from './utils/univerAdapter.js';

import BandeauTotal from './components/ui/BandeauTotal.jsx';
import LegendeEtats from './components/ui/LegendeEtats.jsx';
import PanneauAvertissements from './components/ui/PanneauAvertissements.jsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.jsx';

function AppContent() {
  const { exportPDF, exportExcel } = useExport();
  const {
    ongletActif, setOngletActif,
    niveaux, setNiveaux,
    niveauActifId, setNiveauActifId,
    defaultAcierHyp,
    taux, parametresProjet, bibliothequePrix
  } = useProjet();

  const { metreParNiveau, avertissementsGlobaux: avertissementsMetre } = useMetre();
  const { devisParticulier, devisEntreprise, avertissementsDevis } = useDevis();
  
  const avertissementsGlobaux = [...avertissementsMetre, ...avertissementsDevis];

  const idx = niveaux.findIndex(n => n.id === niveauActifId);
  const typeNiveauActif = niveaux[idx]?.type || '';

  const showTerrassement = typeNiveauActif === 'terrassement';
  const showFondation = typeNiveauActif === 'fondation';
  const showElevation = typeNiveauActif === 'elevation';
  const showPlancher = typeNiveauActif === 'plancher';
  const showToiture = typeNiveauActif === 'toiture';
  const showFinition = typeNiveauActif === 'finition';

  const ajouterNiveau = () => {
    const nextNum = niveaux.filter(n => n.type === 'elevation').length + 1;
    const toitureIndex = niveaux.findIndex(n => n.type === 'toiture');
    
    const newElevation = { 
      id: `elevation_${nextNum}`, 
      nom: `3. Élévation Niv ${nextNum}`, 
      type: 'elevation', 
      acierHyp: { ...defaultAcierHyp }
    };
    const newPlancher = { 
      id: `plancher_${nextNum}`, 
      nom: `4. Plancher Niv ${nextNum}`, 
      type: 'plancher', 
      acierHyp: { ...defaultAcierHyp }
    };
    
    const newNiveaux = [...niveaux];
    newNiveaux.splice(toitureIndex, 0, newElevation, newPlancher);
    setNiveaux(newNiveaux);
    setNiveauActifId(newElevation.id);
  };

  const getAvertissementsCountForNiveau = (id) => {
    return avertissementsGlobaux.filter(a => a.niveauId === id).length;
  };

  return (
    <div className="min-h-screen bg-devis-paper pb-32">
      <header className="bg-devis-saisie text-white shadow-md sticky top-0 z-40">
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-xl font-sans font-bold">Devis Facile BTP</h1>
          <span className="text-xs bg-white/20 px-2 py-1 rounded font-mono">v1.1</span>
        </div>
        <div className="flex px-4 gap-1 overflow-x-auto">
          <button
            onClick={() => setOngletActif('projet')}
            className={`px-4 py-3 min-h-[44px] text-sm font-bold border-b-4 transition-colors whitespace-nowrap ${ongletActif === 'projet' ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'}`}
          >
            🏗️ 1. Paramètres
          </button>
          <button
            onClick={() => setOngletActif('saisie')}
            className={`px-4 py-3 min-h-[44px] text-sm font-bold border-b-4 transition-colors whitespace-nowrap ${ongletActif === 'saisie' ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'}`}
          >
            📏 2. Métré
          </button>
          <button
            onClick={() => setOngletActif('editeur')}
            className={`px-4 py-3 min-h-[44px] text-sm font-bold border-b-4 transition-colors whitespace-nowrap ${ongletActif === 'editeur' || ongletActif === 'particulier' || ongletActif === 'entreprise' ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'}`}
          >
            📊 3. Éditeur de Devis
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {ongletActif === 'projet' && <ParametresProjet />}

        {ongletActif === 'saisie' && (
          <>
            <PanneauAvertissements 
              avertissementsGlobaux={avertissementsGlobaux} 
              niveaux={niveaux} 
              setNiveauActifId={setNiveauActifId} 
            />

            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide border-b border-devis-border">
              {niveaux.map((niveau, index) => {
                const isActive = niveauActifId === niveau.id;
                const passed = niveaux.findIndex(n => n.id === niveauActifId) > index;
                const warns = getAvertissementsCountForNiveau(niveau.id);

                return (
                  <button
                    key={niveau.id}
                    onClick={() => setNiveauActifId(niveau.id)}
                    className={`
                      relative px-4 py-3 min-h-[44px] rounded font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2
                      ${isActive ? 'bg-devis-saisie text-white shadow' : 
                        passed ? 'bg-blue-50 text-blue-800 border border-blue-200' : 
                        'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}
                    `}
                  >
                    {passed && <span>✓</span>}
                    {niveau.nom}
                    {warns > 0 && (
                      <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                        {warns}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="flex-1 min-w-[20px]"></div>
              <button
                onClick={ajouterNiveau}
                className="px-4 py-3 min-h-[44px] rounded font-bold text-sm bg-white border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 whitespace-nowrap transition-colors flex items-center gap-2"
                title="Insérer un Étage (Élévation + Plancher) avant la Toiture"
              >
                ➕ Ajouter un niveau
              </button>
            </div>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-sans text-devis-calcule">
                {niveaux[idx]?.nom}
                <button 
                  onClick={() => {
                    const newNom = window.prompt('Nouveau nom pour ce niveau :', niveaux[idx]?.nom);
                    if (newNom) {
                      const newNiveaux = [...niveaux];
                      newNiveaux[idx].nom = newNom;
                      setNiveaux(newNiveaux);
                    }
                  }}
                  className="ml-3 text-sm text-devis-saisie hover:underline font-normal min-h-[44px] px-2"
                >
                  ✏️ Renommer
                </button>
              </h2>
            </div>

            {showTerrassement && <Terrassement />}
            {showFondation && <Fondation />}
            {showElevation && <Elevation />}
            
            {showPlancher && <Plancher />}
            {showToiture && <Toiture />}

            {showFinition && <Finition />}
            <OuvragesSupplementaires />
          </>
        )}

        {(ongletActif === 'editeur' || ongletActif === 'particulier' || ongletActif === 'entreprise') && (
          <section className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-sans text-2xl font-bold text-devis-calcule flex items-center gap-4">
                Éditeur de Devis
                <div className="bg-gray-100 rounded-lg p-1 inline-flex">
                  <button className="px-4 py-1 text-sm font-bold bg-white shadow-sm rounded text-devis-calcule">Mode Édition</button>
                  <button className="px-4 py-1 text-sm font-bold text-gray-500 hover:text-devis-calcule">Mode Aperçu</button>
                </div>
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-6 italic">Modifications libres, formules Excel et exports natifs.</p>
            <div className="bg-white rounded-lg shadow-sm border border-devis-border overflow-hidden">
               <ErrorBoundary>
                 <TableurDevis 
                   initialData={generateWorkbookData(devisParticulier, devisEntreprise, metreParNiveau, { taux, parametresProjet, bibliothequePrix })} 
                 />
               </ErrorBoundary>
            </div>
          </section>
        )}

      </main>

      <LegendeEtats />

      {ongletActif !== 'projet' && (
        ongletActif === 'saisie' ? (
          <BandeauTotal
            total={devisEntreprise?.total || 0}
            label="Total (Base Entreprise)"
            colorClass="text-devis-saisie"
          />
        ) : ongletActif === 'particulier' ? (
          <BandeauTotal
            total={devisParticulier?.total || 0}
            label="Total Modèle Particulier"
            colorClass="text-devis-calcule"
          />
        ) : (
          <BandeauTotal
            total={devisEntreprise?.total || 0}
            label="Total Modèle Entreprise"
            colorClass="text-devis-saisie"
          />
        )
      )}
    </div>
  );
}

export default function App() {
  return (
    <ProjetProvider>
      <AppContent />
    </ProjetProvider>
  );
}
