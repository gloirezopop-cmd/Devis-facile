import React from 'react';

/**
 * Legende des quatre etats contractuels.
 * Position : en bas a gauche, dans le flux du pied de page (pas fixed),
 * pour ne pas entrer en conflit avec le BandeauTotal fixe.
 */
export default function LegendeEtats() {
  return (
    <div className="flex justify-center pb-24 pt-4">
      <div className="inline-flex items-center gap-4 bg-white/70 border border-devis-border rounded px-3 py-1.5 text-[10px] text-gray-500">
        {[
          ['bg-devis-saisie',    'Saisie'],
          ['bg-devis-calcule',   'Calculé'],
          ['bg-devis-herite',    'Hérité'],
          ['bg-devis-averifier', 'À vérifier'],
        ].map(([cls, label]) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-full ${cls} shrink-0`} />
            <span className="font-bold uppercase tracking-wide">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
