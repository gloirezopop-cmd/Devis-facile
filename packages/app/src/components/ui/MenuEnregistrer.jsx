import React, { useEffect, useRef, useState } from 'react';
import Icone from './Icone.jsx';

/**
 * « Enregistrer » (met à jour le projet déjà ouvert, ou en crée un premier)
 * et « Enregistrer sous » (toujours une copie distincte) — même logique
 * qu'un logiciel de bureau classique.
 */
export default function MenuEnregistrer({ onEnregistrer, onEnregistrerSous }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ouvert) return;
    const surClicExterieur = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOuvert(false);
    };
    document.addEventListener('mousedown', surClicExterieur);
    return () => document.removeEventListener('mousedown', surClicExterieur);
  }, [ouvert]);

  return (
    <div ref={ref} className="relative">
      <div className="flex overflow-hidden rounded-md border border-brand-primary/15">
        <button
          onClick={onEnregistrer}
          className="flex min-h-[44px] items-center gap-1.5 px-3 text-[13px] font-bold text-brand-text/70 hover:bg-black/[0.03]"
        >
          <Icone nom="check-square" size={15} />
          Enregistrer
        </button>
        <button
          onClick={() => setOuvert((o) => !o)}
          aria-label="Plus d'options d'enregistrement"
          className="grid w-9 place-items-center border-l border-brand-primary/15 text-brand-text/50 hover:bg-black/[0.03]"
        >
          <Icone nom="chevron-right" size={13} className={`transition-transform ${ouvert ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {ouvert && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-52 overflow-hidden rounded-md border border-brand-primary/10 bg-white py-1 shadow-lg">
          <button
            onClick={() => { setOuvert(false); onEnregistrerSous(); }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-bold text-brand-text hover:bg-black/[0.03]"
          >
            <Icone nom="files" size={15} className="text-brand-text/50" />
            Enregistrer sous… (copie)
          </button>
        </div>
      )}
    </div>
  );
}
