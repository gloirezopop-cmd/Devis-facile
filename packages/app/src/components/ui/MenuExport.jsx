import React, { useEffect, useRef, useState } from 'react';
import Icone from './Icone.jsx';

/**
 * Un seul bouton « Exporter », qui ouvre le choix du format au clic —
 * plutôt que deux boutons séparés PDF/Excel côte à côte.
 */
export default function MenuExport({ onExporterPDF, onExporterExcel, disabled = false }) {
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

  const choisir = (fn) => {
    setOuvert(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOuvert((o) => !o)}
        disabled={disabled}
        className="flex min-h-[44px] items-center gap-1.5 rounded-md bg-brand-primary px-4 text-[13px] font-bold text-white hover:bg-brand-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icone nom="file-text" size={15} />
        Exporter
        <Icone nom="chevron-right" size={13} className={`transition-transform ${ouvert ? 'rotate-90' : ''}`} />
      </button>

      {ouvert && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-md border border-brand-primary/10 bg-white py-1 shadow-lg">
          <button
            onClick={() => choisir(onExporterPDF)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-bold text-brand-text hover:bg-black/[0.03]"
          >
            <Icone nom="file-text" size={15} className="text-brand-text/50" />
            Format PDF
          </button>
          <button
            onClick={() => choisir(onExporterExcel)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-bold text-brand-text hover:bg-black/[0.03]"
          >
            <Icone nom="file-text" size={15} className="text-brand-text/50" />
            Format Excel
          </button>
        </div>
      )}
    </div>
  );
}
