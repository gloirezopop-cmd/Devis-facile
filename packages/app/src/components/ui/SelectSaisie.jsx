import React from 'react';

export default function SelectSaisie({ label, value, onChange, options, unite }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-devis-saisie font-bold uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="border border-devis-border rounded p-2 text-devis-saisie w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-devis-saisie bg-white font-mono"
        >
          {options.map((opt, i) => (
            <option key={i} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {unite && <span className="text-sm font-bold text-gray-400 w-8">{unite}</span>}
      </div>
    </div>
  );
}
