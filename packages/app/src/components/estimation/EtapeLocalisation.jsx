import React from 'react';
import EtapeSelectUnique from './EtapeSelectUnique.jsx';

export default function EtapeLocalisation({ locations, value, onChange }) {
  return (
    <section>
      <h2 className="font-sans text-xl font-bold text-brand-text mb-1">Où allez-vous construire ?</h2>
      <p className="text-[13.5px] text-brand-text/60 mb-6">
        Ville, région ou zone. Si votre localisation n'apparaît pas, choisissez « Autre localisation ».
      </p>
      <EtapeSelectUnique
        label="Localisation"
        options={locations}
        value={value}
        onChange={onChange}
        vide="Aucune localisation enregistrée pour ce pays pour le moment."
        placeholder="Choisissez une localisation…"
      />
    </section>
  );
}
