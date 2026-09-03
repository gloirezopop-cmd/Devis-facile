import React, { useMemo } from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { genererResumeFondation } from '@devis-facile/moteur';
import { preparerSaisiePourMoteur } from '../../utils/sanitize.js';

export default function ResumeFondation() {
  const state = useProjet();
  
  const resume = useMemo(() => {
    // Le résumé fondation se calcule sur la globalité du projet (tous niveaux)
    // mais techniquement la fondation est souvent sur un seul niveau.
    // On agrège la saisie globale
    let saisieGlobale = {
      fouilles: state.fouilles,
      fouilleFilante: state.fouilleFilante,
      nivellement: state.nivellement,
      betonProprete: state.betonProprete,
      semelles: state.semelles,
      longrines: state.longrines,
      colonnes: state.colonnes,
      maconneries: state.maconneries,
      soubassements: state.soubassements,
      moellons: state.moellons,
      chapeEgalisations: state.chapeEgalisations,
      sousPavements: state.sousPavements,
      carrelages: state.carrelages,
      autresOuvrages: state.autresOuvrages
    };

    // On s'assure de nettoyer les types comme avant de l'envoyer au moteur
    const sanitized = preparerSaisiePourMoteur({ id: 'all' }, saisieGlobale);
    
    return genererResumeFondation(sanitized, state.reglesPersonnalisees);
  }, [state]);

  if (!resume) return null;

  const { volumes, materiaux, aciers } = resume;

  return (
    <section className="mt-8 pt-8 border-t-2 border-devis-calcule border-dashed">
      <h2 className="font-sans text-2xl font-bold mb-4 text-devis-calcule border-b border-devis-border pb-2">
        Résumé de la Fondation (Source de Vérité)
      </h2>
      <p className="text-sm text-gray-600 mb-6 italic">
        Ce tableau récapitulatif consolide l'ensemble des volumes, matériaux et aciers de la fondation et du terrassement. Il sert de base stricte à la génération des devis.
      </p>

      {/* 1. Volumes par nature d'ouvrage */}
      <div className="bg-white rounded-lg shadow-sm border border-devis-border p-5 mb-6">
        <h3 className="font-sans font-bold text-devis-calcule mb-4 border-b border-devis-border pb-2">1. Volumes par nature d'ouvrage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatBox label="Fouilles ponctuelles (puits)" valeur={volumes.fouillesPuits} unite="m³" />
          <StatBox label="Fouilles en tranchée (filante)" valeur={volumes.fouilleFilante} unite="m³" />
          <StatBox label="Nivellement emprise" valeur={volumes.nivellement} unite="m³" />
          <StatBox label="Déblais totaux" valeur={volumes.deblais} unite="m³" />
          <StatBox label="Remblais (volume déduit)" valeur={volumes.remblais} unite="m³" />
          <StatBox label="Évacuation des terres" valeur={volumes.evacuation} unite="m³" />
          <StatBox label="Béton de propreté" valeur={volumes.betonProprete} unite="m³" />
          <StatBox label="Semelles isolées (Socles)" valeur={volumes.semelles} unite="m³" />
          <StatBox label="Longrines" valeur={volumes.longrines} unite="m³" />
          <StatBox label="Murs de soubassement" valeur={volumes.murSoubassement} unite="m²" />
          <StatBox label="Fondation en Moellon" valeur={volumes.moellon} unite="m³" />
          <StatBox label="Chape d'égalisation" valeur={volumes.chapeEgalisation} unite="m³" />
          <StatBox label="Sous-pavement" valeur={volumes.sousPavement} unite="m³" />
        </div>
      </div>

      {/* 2. Matériaux Totaux */}
      <div className="bg-white rounded-lg shadow-sm border border-devis-border p-5 mb-6">
        <h3 className="font-sans font-bold text-devis-calcule mb-4 border-b border-devis-border pb-2">2. Matériaux Totaux</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Ciment" valeur={materiaux.ciment} unite="sacs (50kg)" />
          <StatBox label="Gravier" valeur={materiaux.gravier} unite="tonnes" />
          <StatBox label="Sable" valeur={materiaux.sable} unite="tonnes" />
          <StatBox label="Eau" valeur={materiaux.eau} unite="L" />
          <StatBox label="Bois de coffrage" valeur={materiaux.planches} unite="planches" />
          <StatBox label="Moellon" valeur={materiaux.moellonsTonne} unite="tonnes" />
        </div>
      </div>

      {/* 3. Aciers par Sous-bloc */}
      <div className="bg-white rounded-lg shadow-sm border border-devis-border p-5 mb-6">
        <h3 className="font-sans font-bold text-devis-calcule mb-4 border-b border-devis-border pb-2">3. Aciers (Armatures)</h3>
        {(!aciers.lignes || aciers.lignes.length === 0) ? (
          <p className="text-gray-500 text-sm italic">Aucune armature calculée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Ouvrage</th>
                  <th className="px-4 py-2">Désignation</th>
                  <th className="px-4 py-2 text-right">Longueur (m)</th>
                  <th className="px-4 py-2 text-right">Poids (kg)</th>
                  <th className="px-4 py-2 text-right">Barres de 12m</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {aciers.lignes.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{a.ouvrage || '-'}</td>
                    <td className="px-4 py-2">{a.designation} (HA {a.diametre})</td>
                    <td className="px-4 py-2 text-right tabular-nums">{(a.longueurDeveloppeeTotale || 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{(a.poids || 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-bold tabular-nums text-devis-calcule">{a.nombreBarres12m}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan="3" className="px-4 py-3 text-right uppercase">Poids total d'acier</td>
                  <td className="px-4 py-3 text-right text-devis-calcule">
                    {aciers.lignes.reduce((sum, a) => sum + (a.poids || 0), 0).toFixed(2)} kg
                  </td>
                  <td className="px-4 py-3 text-right"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

    </section>
  );
}

function StatBox({ label, valeur, unite }) {
  if (valeur === undefined || valeur === 0) return null;
  return (
    <div className="flex flex-col p-3 bg-gray-50 rounded border border-gray-100">
      <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</span>
      <span className="font-bold text-devis-calcule tabular-nums">
        {Number(valeur).toFixed(2).replace(/\.00$/, '')} <span className="text-sm font-normal text-gray-600">{unite}</span>
      </span>
    </div>
  );
}
