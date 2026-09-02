import React from 'react';

export default function LigneOuvrage({ repere, titre, children, onRemove, avertissement }) {
  return (
    <div className="relative border border-devis-border rounded p-4 mb-4 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-center mb-4 border-b border-devis-border pb-2">
        <h3 className="font-sans font-bold text-devis-calcule flex items-center gap-2">
          <span className="bg-devis-surface px-2 py-1 rounded border border-devis-border font-mono text-sm">{repere}</span>
          {titre}
        </h3>
        {onRemove && (
          <button 
            onClick={onRemove} 
            className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-sm min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            title="Supprimer cette ligne"
          >
            🗑️
          </button>
        )}
      </div>

      {avertissement && (
        <div className="mb-4 p-3 bg-amber-50 border border-devis-averifier rounded text-devis-averifier text-sm flex items-start gap-2">
          <span className="text-xl">⚠️</span>
          <div>
            <strong>Avertissement :</strong> {avertissement.message}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
