import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';
import { useExport } from '../../hooks/useExport.js';

export default function ParametresProjet() {
  const {
    taux, setTaux,
    majorations, setMajorations,
    parametresProjet, setParametresProjet,
    bibliothequePrix, setBibliothequePrix,
    labelsPrix, setLabelsPrix,
    niveaux,
    fouilles,
    betonProprete,
    semelles,
    longrines,
    colonnes,
    maconneries,
    soubassements,
    carrelages,
    autresOuvrages,
    reglesPersonnalisees
  } = useProjet();
  
  const { exportJSON } = useExport();

  const handleExportJSON = () => {
    const fullState = {
      taux,
      parametresProjet,
      bibliothequePrix,
      labelsPrix,
      niveaux,
      fouilles,
      betonProprete,
      semelles,
      longrines,
      colonnes,
      maconneries,
      soubassements,
      carrelages,
      autresOuvrages,
      reglesPersonnalisees
    };
    exportJSON(fullState);
  };

  return (
    <section className="animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-4 border-b border-devis-border pb-2">
        <h2 className="font-sans text-2xl font-bold text-devis-calcule">Paramètres du Projet</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportJSON}
            className="bg-gray-100 hover:bg-gray-200 text-devis-calcule px-3 py-2 rounded font-bold text-sm min-h-[44px] flex items-center gap-2"
          >
            💾 Sauvegarder Projet (JSON)
          </button>
        </div>
      </div>

      {/* ── Identification du projet (en-tête PDF) ── */}
      <div className="bg-white rounded-lg shadow-sm border border-devis-border p-5 mb-6">
        <h3 className="font-sans font-bold text-devis-calcule mb-4 border-b border-devis-border pb-2">
          Identification du projet
          <span className="ml-3 text-xs font-normal text-gray-400">Apparaît dans l'en-tête du PDF exporté</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ['maitreOuvrage', "Maître d'ouvrage", 'Ex : M. Koné Emmanuel'],
            ['localisation',  'Localisation',      'Ex : Abidjan, Yopougon'],
            ['reference',     'Référence',          'Ex : DF-2026-001'],
          ].map(([key, label, placeholder]) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">{label}</label>
              <input
                type="text"
                value={parametresProjet[key] || ''}
                placeholder={placeholder}
                onChange={(e) => setParametresProjet({ ...parametresProjet, [key]: e.target.value })}
                className="border border-devis-saisie rounded p-2 text-devis-saisie w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-white font-sans text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-devis-border p-5 mb-6">
        <h3 className="font-sans font-bold text-devis-calcule mb-4 flex items-center justify-between border-b border-devis-border pb-2">
          Hypothèses Moteur (État : À vérifier / Saisie)
        </h3>
        <p className="text-sm text-gray-600 mb-4">Ces hypothèses sont utilisées pour calculer les matériaux (dosages, types d'acier).</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Nuance Acier principal</label>
            <select
              value={parametresProjet.acierType}
              onChange={(e) => setParametresProjet({ ...parametresProjet, acierType: e.target.value })}
              className="border border-devis-saisie rounded p-2 text-devis-saisie w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-white font-mono"
            >
              <option value="FeE500">FeE500</option>
              <option value="FeE400">FeE400</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Type de ciment</label>
            <select
              value={parametresProjet.cimentType}
              onChange={(e) => setParametresProjet({ ...parametresProjet, cimentType: e.target.value })}
              className="border border-devis-saisie rounded p-2 text-devis-saisie w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-white font-mono"
            >
              <option value="42.5">CPJ 42.5</option>
              <option value="32.5">CPJ 32.5</option>
            </select>
          </div>
          <InputSaisie
            label="Dosage Béton Propreté"
            value={parametresProjet.dosageBP}
            onChange={(v) => setParametresProjet({ ...parametresProjet, dosageBP: Number(v) })}
            unite="kg/m³"
          />
          <InputSaisie
            label="Dosage Béton Armé"
            value={parametresProjet.dosageBA}
            onChange={(v) => setParametresProjet({ ...parametresProjet, dosageBA: Number(v) })}
            unite="kg/m³"
          />
          <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
            <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Inclure l'eau dans le devis</label>
            <div className="flex items-center h-[44px]">
              <input
                type="checkbox"
                checked={parametresProjet.inclureEau}
                onChange={(e) => setParametresProjet({ ...parametresProjet, inclureEau: e.target.checked })}
                className="w-5 h-5 text-devis-saisie rounded focus:ring-devis-saisie border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Facturer l'eau (option)</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
            <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">Coefficient de vente (Entreprise)</label>
            <div className="flex items-center h-[44px]">
              <input
                type="checkbox"
                checked={parametresProjet.appliquerCoefVente}
                onChange={(e) => setParametresProjet({ ...parametresProjet, appliquerCoefVente: e.target.checked })}
                className="w-5 h-5 text-devis-saisie rounded focus:ring-devis-saisie border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Appliquer marge + frais</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="coffrageTerre"
            checked={parametresProjet.coffrageTerre}
            onChange={(e) => setParametresProjet({ ...parametresProjet, coffrageTerre: e.target.checked })}
            className="w-5 h-5 accent-devis-saisie cursor-pointer min-h-[44px] min-w-[44px]"
          />
          <label htmlFor="coffrageTerre" className="text-sm font-bold text-devis-calcule cursor-pointer">
            Couler les fondations en pleine fouille (sans coffrage latéral)
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-devis-border p-5 mb-6">
        <h3 className="font-sans font-bold text-devis-calcule mb-4 flex items-center justify-between border-b border-devis-border pb-2">
          Majorations (Pertes)
        </h3>
        <p className="text-sm text-gray-600 mb-4">Ces pourcentages sont appliqués pour prendre en compte les pertes lors de l'achat des matériaux.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(majorations).map(([key, value]) => (
            <InputSaisie
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={((value - 1) * 100).toFixed(0)}
              onChange={(v) => {
                const num = Number(v);
                if (!isNaN(num)) {
                  setMajorations({ ...majorations, [key]: 1 + (num / 100) });
                }
              }}
              unite="%"
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-devis-border p-5 mb-6">
        <h3 className="font-sans font-bold text-devis-calcule mb-4 flex items-center justify-between border-b border-devis-border pb-2">
          Taux de Marge & Frais (État : Saisie)
        </h3>
        <p className="text-sm text-gray-600 mb-4">Ces taux calculent le coefficient de majoration utilisé pour le <strong>Devis Entreprise</strong>.</p>

        <div className="grid grid-cols-2 gap-4">
          <InputSaisie
            label="Frais de Chantier (%)"
            value={taux.fraisChantier * 100}
            onChange={(v) => setTaux({ ...taux, fraisChantier: Number(v) / 100 })}
            unite="%"
          />
          <InputSaisie
            label="Frais Généraux (%)"
            value={taux.fraisGeneraux * 100}
            onChange={(v) => setTaux({ ...taux, fraisGeneraux: Number(v) / 100 })}
            unite="%"
          />
          <InputSaisie
            label="Frais d'Opération (%)"
            value={taux.fraisOperation * 100}
            onChange={(v) => setTaux({ ...taux, fraisOperation: Number(v) / 100 })}
            unite="%"
          />
          <InputSaisie
            label="Bénéfice & Aléas (%)"
            value={taux.aleasEtBenefice * 100}
            onChange={(v) => setTaux({ ...taux, aleasEtBenefice: Number(v) / 100 })}
            unite="%"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-devis-border p-5 mb-6">
        <h3 className="font-sans font-bold text-devis-calcule mb-4 border-b border-devis-border pb-2">
          Bibliothèque de Prix (État : Saisie / À vérifier)
        </h3>
        <p className="text-sm text-gray-600 mb-4">Prix nets d'achat (sans marge) qui alimentent le Déboursé Sec.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(bibliothequePrix).map(cle => (
            <div key={cle} className="flex flex-col gap-2 p-3 border border-devis-border rounded bg-gray-50">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Libellé</label>
                  <input
                    type="text"
                    value={labelsPrix[cle] || cle}
                    onChange={(e) => setLabelsPrix({ ...labelsPrix, [cle]: e.target.value })}
                    className="border border-devis-border rounded p-2 text-devis-calcule w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-white font-sans text-sm"
                  />
                </div>
                <div className="w-1/3 min-w-[120px]">
                  <label className="text-xs text-devis-averifier font-bold uppercase tracking-wider mb-1 block">Prix (FCFA)</label>
                  <input
                    type="number"
                    value={bibliothequePrix[cle]}
                    onChange={(e) => setBibliothequePrix({ ...bibliothequePrix, [cle]: e.target.value })}
                    className="border border-devis-averifier rounded p-2 text-devis-averifier w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-amber-50 font-mono text-sm text-right tabular-nums"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            const newKey = 'custom_' + Date.now();
            setLabelsPrix(prev => ({ ...prev, [newKey]: 'Nouvel Élément' }));
            setBibliothequePrix(prev => ({ ...prev, [newKey]: '0' }));
          }}
          className="mt-6 px-4 min-h-[44px] border-2 border-devis-saisie text-devis-saisie font-bold uppercase tracking-wider text-sm rounded hover:bg-devis-saisie hover:text-white transition-colors flex items-center justify-center w-full md:w-auto"
        >
          ➕ Ajouter un élément / prix libre
        </button>
      </div>
    </section>
  );
}
