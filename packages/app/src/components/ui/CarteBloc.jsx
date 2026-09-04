import React from 'react';

export default function CarteBloc({ titre, children, onAdd, addLabel, totalValeur, totalUnite, totalLabel }) {
  return (
    <div className="bg-devis-surface rounded-lg shadow-sm border border-devis-border p-4 mb-8">
      <div className="flex justify-between items-center mb-4 border-b border-devis-border pb-2">
        <h3 className="font-sans font-bold text-lg text-devis-calcule">{titre}</h3>
        {totalValeur !== undefined && (
          <div className="text-right">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block">{totalLabel}</span>
            <span className="font-mono font-bold text-devis-calcule text-xl tabular-nums">
              {Number(totalValeur).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {totalUnite}
            </span>
          </div>
        )}
      </div>

      <div className="mb-4">
        {children}
      </div>

      {onAdd && (
        <button
          onClick={onAdd}
          className="w-full py-3 min-h-[44px] border-2 border-dashed border-devis-saisie text-devis-saisie font-bold uppercase tracking-wider text-sm rounded hover:bg-devis-saisie hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span> {addLabel}
        </button>
      )}
    </div>
  );
}
