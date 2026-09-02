import React from 'react';

export default function PanneauAvertissements({ avertissementsGlobaux, niveaux, setNiveauActifId }) {
  if (!avertissementsGlobaux || avertissementsGlobaux.length === 0) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-devis-averifier p-4 mb-6 shadow-sm rounded-r">
      <h3 className="text-devis-averifier font-bold mb-2 flex items-center gap-2">
        <span className="text-xl">⚠️</span> 
        {avertissementsGlobaux.length} {avertissementsGlobaux.length > 1 ? 'Avertissements ouverts' : 'Avertissement ouvert'}
      </h3>
      <ul className="list-disc list-inside space-y-1">
        {avertissementsGlobaux.map((warn, i) => {
          const niveau = niveaux.find(n => n.id === warn.niveauId);
          return (
            <li key={i} className="text-sm text-amber-900">
              <button 
                onClick={() => setNiveauActifId(warn.niveauId)}
                className="font-bold hover:underline"
              >
                {niveau ? niveau.nom : 'Projet'}
              </button>
              {' — '}
              {warn.message}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
