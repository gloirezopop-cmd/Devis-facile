import React from 'react';

export default function LegendeEtats() {
  return (
    <div className="fixed bottom-0 right-0 m-4 bg-white/90 backdrop-blur border border-devis-border shadow-sm p-3 rounded text-xs flex gap-4 z-[60] pointer-events-none">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-devis-saisie"></div>
        <span className="text-gray-600 font-bold uppercase">Saisie</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-devis-calcule"></div>
        <span className="text-gray-600 font-bold uppercase">Calculé</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-devis-herite"></div>
        <span className="text-gray-600 font-bold uppercase">Hérité</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-devis-averifier"></div>
        <span className="text-gray-600 font-bold uppercase">À vérifier</span>
      </div>
    </div>
  );
}
