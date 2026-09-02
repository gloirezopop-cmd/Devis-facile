import React, { useState } from 'react';
import { formaterNombre } from '../../utils/format.js';

export default function ValeurCalculee({ label, value, unite, trace, overrideValue, onOverrideChange }) {
  const [isEditing, setIsEditing] = useState(false);
  
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
            title={trace ? trace.join(' | ') : 'Cliquez pour forcer la valeur'}
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
            className="text-red-500 hover:underline"
            onClick={(e) => { e.stopPropagation(); onOverrideChange(''); }}
          >
            Rétablir
          </button>
        </div>
      )}
    </div>
  );
}
