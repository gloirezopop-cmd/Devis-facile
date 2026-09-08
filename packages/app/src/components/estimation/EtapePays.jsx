import React from 'react';
import EtapeSelectUnique from './EtapeSelectUnique.jsx';

export default function EtapePays({ countries, value, onChange, chargement }) {
  return (
    <section>
      <h2 className="font-sans text-xl font-bold text-brand-text mb-1">Dans quel pays allez-vous construire ?</h2>
      <p className="text-[13.5px] text-brand-text/60 mb-6">
        Les tarifs de référence dépendent du pays : ils ne sont pas les mêmes partout.
      </p>
      {chargement ? (
        <p className="text-sm text-brand-text/50">Chargement des pays…</p>
      ) : (
        <EtapeSelectUnique
          label="Pays"
          options={countries}
          value={value}
          onChange={onChange}
          vide="Aucun pays n'est encore configuré."
          placeholder="Choisissez un pays…"
        />
      )}
    </section>
  );
}
