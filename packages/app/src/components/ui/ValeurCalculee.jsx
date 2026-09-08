import React, { useState } from 'react';
import { formaterNombre } from '../../utils/format.js';

export default function ValeurCalculee({ label, value, unite, trace, overrideValue, onOverrideChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  
  // Si overrideValue existe et n'est pas vide, la valeur affichée est l'override
  const isOverriden = overrideValue !== undefined && overrideValue !== '';
  const displayValue = isOverriden ? overrideValue : value;
  
  // Couleurs : Noir (#0F151B) par défaut, Bleu (#14479B) si forcé
  const colorClass = isOverriden ? 'text-devis-saisie' : 'text-devis-calcule';
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input 
            type="number"
            autoFocus
            value={overrideValue || ''}
            onChange={(e) => onOverrideChange && onOverrideChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={handleKeyDown}
            className="border border-devis-saisie rounded p-2 text-devis-saisie font-mono font-bold text-lg min-h-[44px] w-full focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-blue-50"
          />
        ) : (
          <div 
            onClick={() => { if (onOverrideChange) setIsEditing(true); }}
            className={`font-mono font-bold tabular-nums text-lg p-2 min-h-[44px] border border-transparent rounded cursor-text hover:bg-gray-50 ${colorClass}`}
          >
            {formaterNombre(displayValue)}
          </div>
        )}
        <span className="text-sm font-bold text-gray-400 w-8">{unite}</span>
      </div>
      
      {isOverriden && !isEditing && (
        <div className="text-xs text-gray-500 italic mt-1 flex justify-between">
          <span className="tabular-nums">(Moteur : {formaterNombre(value)})</span>
          <button 
            className="text-red-500 hover:underline font-bold"
            onClick={(e) => { e.stopPropagation(); onOverrideChange(''); }}
          >
            Rétablir
          </button>
        </div>
      )}

      {trace && typeof trace === 'object' && (
        <div className="mt-2">
          <button 
            onClick={() => setShowTrace(!showTrace)}
            className="text-xs font-bold text-devis-saisie hover:underline flex items-center gap-1"
          >
            {showTrace ? 'Masquer le détail' : 'Voir le détail'}
          </button>
          
          {showTrace && (
            <div className="mt-3 p-4 bg-gray-50/80 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono shadow-inner">
              <div className="mb-2 pb-2 border-b border-gray-200/50">
                <span className="font-bold text-gray-500 uppercase text-xs tracking-wider">Formule</span>
                <div className="mt-1 text-devis-calcule">{trace.formule}</div>
              </div>
              <div className="mb-2">
                <span className="font-bold text-gray-500 uppercase text-xs tracking-wider">Valeurs</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {trace.entrees && Object.keys(trace.entrees).length > 0
                    ? Object.entries(trace.entrees).map(([k, v]) => (
                        <span key={k} className="bg-white px-2 py-1 rounded border border-gray-200 text-xs">
                          <span className="text-gray-500">{k}:</span> <strong className="text-devis-saisie">{v}</strong>
                        </span>
                      ))
                    : <span className="text-gray-400 italic">Aucune variable</span>
                  }
                </div>
              </div>
              
              {trace.deductions && trace.deductions.length > 0 && (
                <div className="my-3 p-3 bg-white border border-gray-200 rounded-lg">
                  <span className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-2 block">Déductions appliquées</span>
                  <ul className="space-y-1 mb-3">
                    {trace.deductions.map((d, i) => (
                      <li key={i} className="flex justify-between items-center text-xs">
                        <span>{d.type || 'Ouverture'} <span className="text-gray-400">×{d.nombre}</span></span>
                        <span className="text-amber-600 font-bold">-{d.surface} {trace.unite}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="font-bold text-devis-calcule pt-2 border-t border-gray-100 flex justify-between text-xs">
                    <span>Total à déduire</span>
                    <span>-{trace.totalDeductions} {trace.unite}</span>
                  </div>
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-gray-300 font-bold flex justify-between items-center text-base">
                <span className="text-gray-500 uppercase tracking-widest text-xs">Résultat net</span> 
                {trace.resultat === null ? (
                  <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-sm border border-amber-200">{trace.motif || 'Données insuffisantes'}</span>
                ) : (
                  <div className="text-right">
                    <span className={trace.typeSurface?.includes('Ratio') ? 'text-amber-600' : 'text-devis-calcule'}>
                      {trace.resultat} <span className="text-gray-500 text-sm">{trace.unite}</span>
                    </span>
                    {trace.typeSurface && (
                      <div className="text-amber-600/70 text-[10px] uppercase tracking-wider font-sans mt-0.5">{trace.typeSurface}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
