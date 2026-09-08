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
        className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-primary px-5 text-[13px] font-bold text-white shadow-sm hover:bg-brand-primary-dark hover:-translate-y-px transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        <Icone nom="file-text" size={16} />
        Générer le devis
        <Icone nom="chevron-down" size={14} className={`ml-1 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
      </button>

      {ouvert && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-xl border border-brand-primary/10 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-brand-bg px-4 py-2 border-b border-brand-primary/5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-text/50">Formats d'export</span>
          </div>
          <div className="p-1">
            <button
              onClick={() => choisir(onExporterPDF)}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-brand-primary/5 transition-colors group"
            >
              <div className="mt-0.5 bg-red-100 text-red-600 p-1.5 rounded-md group-hover:bg-red-500 group-hover:text-white transition-colors">
                <Icone nom="file-text" size={16} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-brand-primary">Document PDF</div>
                <div className="text-[12px] text-brand-text/60 mt-0.5 leading-snug">Prêt à imprimer et à envoyer au client. (Non modifiable)</div>
              </div>
            </button>
            <button
              onClick={() => choisir(onExporterExcel)}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-brand-primary/5 transition-colors group"
            >
              <div className="mt-0.5 bg-green-100 text-green-700 p-1.5 rounded-md group-hover:bg-green-600 group-hover:text-white transition-colors">
                <Icone nom="grid" size={16} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-brand-primary">Classeur Excel</div>
                <div className="text-[12px] text-brand-text/60 mt-0.5 leading-snug">Idéal pour ajuster les prix ou la mise en page vous-même.</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
