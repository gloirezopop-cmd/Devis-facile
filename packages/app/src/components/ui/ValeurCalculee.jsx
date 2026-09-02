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
            className="text-xs font-bold text-devis-saisie hover:underline"
          >
            {showTrace ? 'Masquer le calcul' : 'Voir le calcul'}
          </button>
          
          {showTrace && (
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 font-mono">
              <div className="mb-1"><span className="font-bold text-gray-500">Formule :</span> {trace.formule}</div>
              <div className="mb-1">
                <span className="font-bold text-gray-500">Entrées :</span> {
                  trace.entrees && Object.keys(trace.entrees).length > 0
                    ? Object.entries(trace.entrees).map(([k, v]) => `${k} = ${v}`).join(' · ')
                    : '-'
                }
              </div>
              
              {trace.deductions && trace.deductions.length > 0 && (
                <div className="my-2 p-2 bg-white border border-gray-200 rounded">
                  <span className="font-bold text-gray-500 mb-1 block">Déductions :</span>
                  <ul className="list-disc pl-4 mb-2">
                    {trace.deductions.map((d, i) => (
                      <li key={i}>{d.type || 'Ouverture'} ({d.nombre}) : {d.largeur} x {d.hauteur} = {d.surface} {trace.unite}</li>
                    ))}
                  </ul>
                  <div className="font-bold text-devis-calcule pt-1 border-t border-gray-100">
                    Total déduit : {trace.totalDeductions} {trace.unite}
                  </div>
                </div>
              )}
              
              <div className="mt-2 pt-2 border-t border-gray-200 font-bold">
                <span className="text-gray-500">Résultat : </span> 
                {trace.resultat === null ? (
                  <span className="text-amber-600">{trace.motif || 'Dimension manquante'}</span>
                ) : (
                  <span className="text-devis-calcule">{trace.resultat} {trace.unite}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
