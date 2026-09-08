import React from 'react';
import { formaterNombre } from '../../utils/format.js';

/**
 * Bandeau bas fixe — toujours visible, meme sur mobile.
 * Affiche cote a cote : Total Particulier (materiaux) et Total Entreprise (tout compris + TVA).
 * Le compteur d avertissements ouverts est affiché à gauche.
 */
export default function BandeauTotal({ totalAvertissements }) {
  if (!totalAvertissements || totalAvertissements === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t-2 border-amber-500/20 shadow-xl z-50 flex items-center px-4"
         style={{ minHeight: '48px' }}>
      {/* Compteur d avertissements */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[28px] text-center tabular-nums">
          {totalAvertissements}
        </span>
        <span className="text-xs text-amber-700 font-bold hidden sm:block">à vérifier (voir la note de calcul ou le métré)</span>
      </div>
    </div>
  );
}
