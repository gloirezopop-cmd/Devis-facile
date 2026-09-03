import React from 'react';
import Icone from './Icone.jsx';

/**
 * Barre de progression horizontale à cinq étapes. Cliquable, pas verrouillée :
 * un métreur revient en arrière ajuster une hypothèse en cours de saisie,
 * un parcours qui l'en empêcherait serait une régression, pas une amélioration.
 */
export default function Stepper({ etapes, etapeActive, onChange }) {
  return (
    <div className="mb-6 overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {etapes.map((etape, i) => {
          const numero = i + 1;
          const active = numero === etapeActive;
          const faite = numero < etapeActive;

          return (
            <li key={etape.id} className="flex items-center">
              <button
                onClick={() => onChange(numero)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 min-h-[40px] text-[13px] font-bold transition-colors ${
                  active
                    ? 'bg-brand-primary text-white'
                    : faite
                      ? 'bg-brand-interactive/10 text-brand-interactive hover:bg-brand-interactive/15'
                      : 'text-brand-text/45 hover:bg-black/5'
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
                    active ? 'bg-white/20' : faite ? 'bg-brand-interactive/15' : 'bg-black/5'
                  }`}
                >
                  {faite ? <Icone nom="check-square" size={12} /> : numero}
                </span>
                <span className="hidden sm:inline">{etape.label}</span>
              </button>
              {numero < etapes.length && (
                <span className="mx-1 h-px w-4 shrink-0 bg-brand-primary/15 sm:w-6" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
