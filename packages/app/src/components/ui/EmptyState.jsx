import React from 'react';
import Icone from './Icone.jsx';

/**
 * Page honnête pour une entrée de menu sans fonctionnalité derrière.
 * Jamais de chiffres inventés, jamais une page qui fait semblant.
 */
export default function EmptyState({ icone = 'folder', titre, texte }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-dashed border-brand-primary/20 bg-white/60 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-primary/5 text-brand-primary/50">
        <Icone nom={icone} size={26} />
      </div>
      <h2 className="mt-4 font-sans text-lg font-bold text-brand-text">{titre}</h2>
      <p className="mt-2 max-w-sm text-[13.5px] text-brand-text/55">{texte || 'Bientôt disponible.'}</p>
    </div>
  );
}
