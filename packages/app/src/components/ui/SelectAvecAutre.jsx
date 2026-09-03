import React from 'react';

/**
 * Menu déroulant avec des valeurs standard du métier, plus une option
 * « Autre » qui révèle un champ libre — pour ne jamais bloquer un cas
 * particulier derrière une liste fermée.
 */
export default function SelectAvecAutre({ label, value, onChange, options, unite, styleClass = '' }) {
  const valeurConnue = options.some((o) => String(o.value) === String(value));
  const mode = value === '' || value === undefined || value === null || valeurConnue ? 'liste' : 'autre';

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">{label}</label>
      <div className="flex gap-2">
        <select
          value={mode === 'liste' ? (value ?? '') : '__autre__'}
          onChange={(e) => {
            if (e.target.value === '__autre__') { onChange(''); return; }
            onChange(e.target.value);
          }}
          className={`border border-devis-saisie rounded p-2 text-devis-saisie flex-1 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-white font-mono text-sm ${styleClass}`}
        >
          <option value="" disabled>—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          <option value="__autre__">Autre…</option>
        </select>
        {mode === 'autre' && (
          <input
            type="number"
            autoFocus
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={unite || ''}
            className="w-24 border border-devis-averifier rounded p-2 text-devis-averifier min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-amber-50 font-mono text-sm text-right"
          />
        )}
      </div>
    </div>
  );
}
