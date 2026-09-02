import React from 'react';
import { formaterNombre } from '../../utils/format.js';

export default function BandeauTotal({ total, label, colorClass }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-devis-border shadow-lg p-4 flex justify-between items-center z-50 min-h-[72px]">
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Général</span>
        <span className={`font-sans font-bold text-xl uppercase ${colorClass}`}>{label}</span>
      </div>
      <div className="flex flex-col text-right">
        <span className={`font-mono font-bold text-2xl tabular-nums ${colorClass}`}>
          {total ? `${formaterNombre(total, true)}\u202FFCFA` : '-\u202FFCFA'}
        </span>
      </div>
    </div>
  );
}
