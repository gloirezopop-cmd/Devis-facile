import React from 'react';
import Icone from './Icone.jsx';

/** Une statistique du tableau de bord. `valeur` en '–' si non suivie. */
export default function StatCard({ label, valeur, icone }) {
  return (
    <div className="rounded-xl border border-brand-primary/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-brand-text/55">{label}</p>
        {icone && <Icone nom={icone} size={16} className="text-brand-interactive/70" />}
      </div>
      <p className="mt-2 font-mono text-2xl font-bold text-brand-text tabular-nums">{valeur}</p>
    </div>
  );
}
