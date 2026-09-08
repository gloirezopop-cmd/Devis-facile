import React from 'react';
import { useAccordion } from './Accordion.jsx';
import Icone from './Icone.jsx';

export default function CarteBloc({ titre, children, onAdd, addLabel, totalValeur, totalUnite, totalLabel }) {
  const accordion = useAccordion();
  const dansAccordeon = accordion !== null;
  const estValide = dansAccordeon && accordion.doneIds.has(titre);
  const estReplie = dansAccordeon && accordion.openId !== titre;

  const resume = totalValeur !== undefined ? (
    <span className="font-mono text-sm text-brand-text/60 tabular-nums whitespace-nowrap">
      {Number(totalValeur).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {totalUnite}
    </span>
  ) : null;

  if (estReplie) {
    return (
      <button
        type="button"
        onClick={() => accordion.openBloc(titre)}
        className="w-full text-left bg-devis-surface rounded-lg shadow-sm border border-devis-border p-4 mb-4 min-h-[44px] flex items-center justify-between gap-3 hover:border-brand-interactive/40 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          {estValide && <Icone nom="check-circle" size={18} className="text-devis-herite shrink-0" />}
          <span className="font-sans font-bold text-devis-calcule truncate">{titre}</span>
        </span>
        <span className="flex items-center gap-3 shrink-0">
          {resume}
          <span className="text-xs font-bold uppercase text-brand-interactive">Modifier</span>
          <Icone nom="chevron-down" size={16} className="text-brand-text/40" />
        </span>
      </button>
    );
  }

  return (
    <div className="bg-devis-surface rounded-lg shadow-sm border border-devis-border p-4 mb-8">
      <div className="flex justify-between items-center mb-4 border-b border-devis-border pb-2">
        <h3 className="font-sans font-bold text-lg text-devis-calcule">{titre}</h3>
        {estValide && (
          <span className="flex items-center gap-1 text-xs font-bold uppercase text-devis-herite">
            <Icone nom="check-circle" size={14} /> Validé
          </span>
        )}
      </div>

      <div className="mb-4">
        {children}
      </div>

      {totalValeur !== undefined && (
        <div className="flex justify-end items-center mb-4 mt-2 p-3 bg-[#14479B]/5 rounded border border-[#14479B]/10">
          <div className="text-right flex items-center gap-4">
            <span className="text-sm text-brand-primary uppercase font-bold tracking-wider block">{totalLabel}</span>
            <span className="font-mono font-bold text-brand-text text-xl tabular-nums">
              {Number(totalValeur).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {totalUnite}
            </span>
          </div>
        </div>
      )}

      {onAdd && (
        <button
          onClick={onAdd}
          className={`w-full py-3 min-h-[44px] border-2 border-dashed border-devis-saisie text-devis-saisie font-bold uppercase tracking-wider text-sm rounded hover:bg-devis-saisie hover:text-white transition-colors flex items-center justify-center gap-2 ${dansAccordeon ? 'mb-4' : ''}`}
        >
          <span className="text-lg">+</span> {addLabel}
        </button>
      )}

      {dansAccordeon && (
        <button
          type="button"
          onClick={() => accordion.validateBloc(titre)}
          className="w-full min-h-[48px] rounded-md bg-brand-primary text-white font-bold text-sm hover:bg-brand-primary-dark transition-colors"
        >
          OK, valider « {titre} » et continuer →
        </button>
      )}
    </div>
  );
}
