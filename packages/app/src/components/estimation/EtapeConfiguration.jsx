import React, { useState } from 'react';
import Icone from '../ui/Icone.jsx';

const CHOIX_RAPIDES = [0, 1, 2, 3, 4, 5, 6];

/**
 * Configuration du bâtiment — R+0 à R+N. Les boutons rapides couvrent les cas
 * courants ; « Autre » reste ouvert pour un immeuble plus haut, sans plafond
 * codé en dur (§7 : ne pas se limiter à R+0, R+1, R+2).
 */
export default function EtapeConfiguration({ value, onChange }) {
  const estRapide = value !== null && value !== undefined && CHOIX_RAPIDES.includes(value);
  const [modeAutre, setModeAutre] = useState(value !== null && value !== undefined && !estRapide);
  const [saisieAutre, setSaisieAutre] = useState(estRapide ? '' : String(value ?? ''));

  return (
    <section>
      <h2 className="font-sans text-xl font-bold text-brand-text mb-1">Quelle est la configuration de votre bâtiment ?</h2>
      <p className="text-[13.5px] text-brand-text/60 mb-6">
        R+0 = rez-de-chaussée seul. R+1 = rez-de-chaussée + 1 étage. Ainsi de suite.
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
        {CHOIX_RAPIDES.map((n) => {
          const actif = !modeAutre && value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => { setModeAutre(false); onChange(n); }}
              className={`p-4 min-h-[56px] rounded-xl border-2 font-bold text-[15px] flex items-center justify-center gap-2 transition-all ${
                actif ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-brand-primary/10 hover:border-brand-primary/30 text-brand-text'
              }`}
            >
              R+{n}
              {actif && <Icone nom="check-circle" size={16} />}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setModeAutre(true)}
          className={`p-4 min-h-[56px] rounded-xl border-2 font-bold text-[15px] flex items-center justify-center transition-all ${
            modeAutre ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-brand-primary/10 hover:border-brand-primary/30 text-brand-text'
          }`}
        >
          Autre…
        </button>
      </div>

      {modeAutre && (
        <div className="flex items-center gap-3 max-w-xs">
          <span className="font-bold text-brand-text/60">R+</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={saisieAutre}
            onChange={(e) => {
              const brut = e.target.value;
              setSaisieAutre(brut);
              const n = Math.floor(Number(brut));
              if (brut !== '' && Number.isFinite(n) && n >= 0) onChange(n);
            }}
            placeholder="Nombre d'étages"
            className="w-full min-h-[44px] rounded-md border border-brand-primary/20 px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>
      )}
    </section>
  );
}
