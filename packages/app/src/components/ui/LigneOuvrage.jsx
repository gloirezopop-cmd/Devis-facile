import React from 'react';
import Icone from './Icone.jsx';

export default function LigneOuvrage({ repere, titre, children, onRemove, avertissement }) {
  return (
    <div className="relative border border-brand-primary/10 rounded-xl p-5 mb-4 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-primary/30 group">
      <div className="flex justify-between items-start mb-5 border-b border-brand-primary/5 pb-3">
        <h3 className="font-sans font-bold text-brand-primary flex items-center gap-3">
          <span className="bg-brand-primary/5 text-brand-primary px-3 py-1.5 rounded-lg border border-brand-primary/10 font-mono text-sm tracking-widest uppercase">
            {repere}
          </span>
          <span className="text-lg">{titre}</span>
        </h3>
        {onRemove && (
          <button 
            onClick={onRemove} 
            className="text-brand-text/30 hover:text-red-500 hover:bg-red-50 rounded-lg h-9 w-9 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
            title="Supprimer cette ligne"
            aria-label="Supprimer cette ligne"
          >
            <Icone nom="x" size={18} />
          </button>
        )}
      </div>

      {avertissement && (
        <div className="mb-5 p-4 bg-amber-50/50 border border-amber-200 rounded-lg text-amber-900 text-sm flex items-start gap-3">
          <Icone nom="alert-circle" size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-amber-700">À vérifier :</strong> {avertissement.message}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
