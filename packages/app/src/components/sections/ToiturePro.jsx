import React, { useState, useMemo } from 'react';
import { useProjet } from '../../context/ProjetContext';
import { calculerMetreToitureComplet } from '@devis-facile/moteur';
import AffichageFormule from '../toiture/AffichageFormule';
import ResumeToiture from '../toiture/ResumeToiture';
import CarteBloc from '../ui/CarteBloc';

export default function ToiturePro() {
  const { niveauActifId, toituresPro, setToituresPro, charpentes, setCharpentes, couverturesToles, setCouverturesToles, addRow } = useProjet();
  const [modePro, setModePro] = useState(false);
  const [etape, setEtape] = useState(1);
  
  const toitureConfig = toituresPro.find(t => t.niveauId === niveauActifId) || {
    id: Date.now(),
    niveauId: niveauActifId,
    Lb: 10.30, L: 9.00, hauteur: 1.40, nbVersants: 2, debordToiture: 0.60, debordTole: 0,
    espFermes: 2.50, espPannes: 0.90, lcBois: 5, ldFerme: 50.35, pertesMadriers: 2, depassementPanne: 0.30, pertesPannes: 2, espChevrons: 1.0,
    toleLong: 3.05, toleLarg: 0.80, recouvL: 0.20, recouvT: 0.10, clousParTole: 9, clousParKg: 58,
    piecesPlafond: [], triplexLong: 2.44, triplexLarg: 1.22, pertesTriplexL: 0.44, pertesTriplexT: 0.12, espChevronsPlafond: 1.0
  };

  // Si le projet n'a pas encore de configuration pour ce niveau, on l'initialise
  React.useEffect(() => {
    if (!toituresPro.find(t => t.niveauId === niveauActifId)) {
      setToituresPro([...toituresPro, toitureConfig]);
    }
  }, [niveauActifId]);

  const updateConfig = (field, value) => {
    const val = Number(value) || value; // Parse numbers if possible
    const existant = toituresPro.find(t => t.niveauId === niveauActifId);
    if (existant) {
      setToituresPro(toituresPro.map(t => t.niveauId === niveauActifId ? { ...t, [field]: val } : t));
    } else {
      setToituresPro([...toituresPro, { ...toitureConfig, [field]: val }]);
    }
  };

  const resultats = useMemo(() => {
    try {
      return calculerMetreToitureComplet(toitureConfig);
    } catch (e) {
      console.error("Erreur de calcul toiture", e);
      return { charpente: [], couverture: [], plafond: [] };
    }
  }, [toitureConfig]);

  const handleAjouterAuDevis = () => {
    const existant = toituresPro.find(t => t.niveauId === niveauActifId);
    if (!existant) {
      setToituresPro([...toituresPro, toitureConfig]);
    }
    // Nettoyer les anciennes charpentes manuelles pour éviter les doublons
    if (charpentes.some(c => c.niveauId === niveauActifId) || couverturesToles.some(c => c.niveauId === niveauActifId)) {
      setCharpentes(charpentes.filter(c => c.niveauId !== niveauActifId));
      setCouverturesToles(couverturesToles.filter(c => c.niveauId !== niveauActifId));
    }
    alert("Les calculs de la toiture professionnelle ont été synchronisés avec le devis et la note de calcul !");
  };

  const renderInput = (label, field, type="number", step="0.01") => (
    <div className="flex flex-col">
      <label className="text-sm text-gray-600 font-bold mb-1">{label}</label>
      <input 
        type={type} step={step}
        value={toitureConfig[field] || ''}
        onChange={(e) => updateConfig(field, e.target.value)}
        className="border border-gray-300 rounded p-2 focus:border-devis-calcule focus:ring-1 focus:ring-devis-calcule outline-none text-devis-saisie font-bold"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-blue-50 p-4 rounded border border-blue-100">
        <div>
          <h3 className="font-bold text-blue-900">Module Professionnel de Métré</h3>
          <p className="text-sm text-blue-700">Calculez les quantités exactes avec les formules du cours.</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-bold text-gray-700">Mode Formules Détaillées</label>
          <button 
            onClick={() => setModePro(!modePro)}
            className={`w-12 h-6 rounded-full relative transition-colors ${modePro ? 'bg-devis-calcule' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${modePro ? 'transform translate-x-6' : ''}`}></span>
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {['1. Dimensions', '2. Charpente', '3. Couverture', '4. Plafond', '5. Résumé'].map((label, idx) => (
          <button 
            key={idx}
            onClick={() => setEtape(idx + 1)}
            className={`px-4 py-3 font-bold text-sm whitespace-nowrap transition-colors ${etape === idx + 1 ? 'border-b-2 border-devis-calcule text-devis-calcule' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 bg-white rounded shadow-sm border border-gray-100">
        {etape === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Dimensions Générales du Bâtiment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderInput("Longueur (Lb) [m]", "Lb")}
              {renderInput("Largeur (L) [m]", "L")}
              {renderInput("Hauteur du triangle [m]", "hauteur")}
              {renderInput("Nombre de versants", "nbVersants", "number", "1")}
              {renderInput("Débord Toiture [m]", "debordToiture")}
              {renderInput("Débord Tôle [m]", "debordTole")}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setEtape(2)} className="bg-gray-800 text-white px-4 py-2 rounded">Suivant →</button>
            </div>
          </div>
        )}

        {etape === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Paramètres Charpente</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {renderInput("Espacement Fermes (m)", "espFermes")}
                    {renderInput("LD d'une ferme (m)", "ldFerme")}
                    {renderInput("Espacement Pannes (m)", "espPannes")}
                    {renderInput("Dépassement Panne (m)", "depassementPanne")}
                    {renderInput("Espacement Chevrons (m)", "espChevrons")}
                    {renderInput("Longueur Com. Bois (m)", "lcBois")}
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-amber-50 p-3 rounded">
                    {renderInput("Pertes Madriers (pcs/%)", "pertesMadriers")}
                    {renderInput("Pertes Pannes (pcs/%)", "pertesPannes")}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded border border-gray-200 h-[600px] overflow-y-auto">
                <h3 className="text-lg font-bold text-devis-calcule mb-4">Résultats & Formules</h3>
                {resultats.charpente.map((res, i) => (
                  <AffichageFormule key={i} resultat={res} modePro={modePro} />
                ))}
              </div>
            </div>
          </div>
        )}

        {etape === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Paramètres Couverture</h3>
                <div className="grid grid-cols-2 gap-4">
                  {renderInput("Longueur Tôle (m)", "toleLong")}
                  {renderInput("Largeur Tôle (m)", "toleLarg")}
                  {renderInput("Recouv. Longit. (m)", "recouvL")}
                  {renderInput("Recouv. Transv. (m)", "recouvT")}
                  {renderInput("Clous par tôle", "clousParTole", "number", "1")}
                  {renderInput("Clous par kg", "clousParKg", "number", "1")}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <h3 className="text-lg font-bold text-devis-calcule mb-4">Résultats & Formules</h3>
                {resultats.couverture.map((res, i) => (
                  <AffichageFormule key={i} resultat={res} modePro={modePro} />
                ))}
              </div>
            </div>
          </div>
        )}

        {etape === 4 && (
          <div className="space-y-6">
            <p className="text-gray-600">Le calcul du plafond est désactivé si aucune pièce n'est ajoutée (fonctionnalité à étendre).</p>
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <h3 className="text-lg font-bold text-devis-calcule mb-4">Résultats Plafond</h3>
                {resultats.plafond.map((res, i) => (
                  <AffichageFormule key={i} resultat={res} modePro={modePro} />
                ))}
                {resultats.plafond.length === 0 && <span className="text-gray-500 text-sm">Aucun plafond calculé.</span>}
              </div>
          </div>
        )}

        {etape === 5 && (
          <ResumeToiture resultats={resultats} onAjouterDevis={handleAjouterAuDevis} />
        )}
      </div>
    </div>
  );
}
