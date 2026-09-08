import React from 'react';
import EtapeSelectUnique from './EtapeSelectUnique.jsx';

export default function EtapeTypeConstruction({ buildingTypes, value, onChange }) {
  return (
    <section>
      <h2 className="font-sans text-xl font-bold text-brand-text mb-1">Quel type de construction souhaitez-vous réaliser ?</h2>
      <p className="text-[13.5px] text-brand-text/60 mb-6">Le type de construction sert à retrouver le tarif le plus adapté.</p>
      <EtapeSelectUnique
        label="Type de construction"
        options={buildingTypes}
        value={value}
        onChange={onChange}
        placeholder="Choisissez un type de construction…"
      />
    </section>
  );
}
