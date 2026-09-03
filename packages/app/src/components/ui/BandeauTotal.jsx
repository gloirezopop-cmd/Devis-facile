import React from 'react';
import { formaterNombre } from '../../utils/format.js';

/**
 * Bandeau bas fixe — toujours visible, meme sur mobile.
 * Affiche cote a cote : Total Particulier (materiaux) et Total Entreprise (tout compris + TVA).
 * Le compteur d avertissements ouverts est affiché à gauche.
 */
export default function BandeauTotal({ totalParticulier, totalEntreprise, totalAvertissements }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-devis-border shadow-xl z-50"
         style={{ minHeight: '64px' }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">

        {/* Compteur d avertissements */}
        {totalAvertissements > 0 && (
          <div className="flex items-center gap-2 mr-2 shrink-0">
            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[28px] text-center tabular-nums">
              {totalAvertissements}
            </span>
            <span className="text-xs text-amber-700 font-bold hidden sm:block">à vérifier</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Total Particulier */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Particulier</span>
          <span className="font-mono font-bold tabular-nums text-lg leading-tight text-devis-herite">
            {totalParticulier ? `${formaterNombre(totalParticulier, true)}\u202FFCFA` : '-'}
          </span>
        </div>

        <div className="w-px h-8 bg-devis-border shrink-0" />

        {/* Total Entreprise */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Entreprise</span>
          <span className="font-mono font-bold tabular-nums text-lg leading-tight text-devis-saisie">
            {totalEntreprise ? `${formaterNombre(totalEntreprise, true)}\u202FFCFA` : '-'}
          </span>
        </div>

      </div>
    </div>
  );
}
