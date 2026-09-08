import React from 'react';
import EtapeSelectUnique from './EtapeSelectUnique.jsx';

/**
 * Le prix au m² n'est JAMAIS montré à l'utilisateur — ni ici, ni ailleurs dans
 * l'assistant. C'est la donnée de référence de Devis Facile ; l'utilisateur
 * reçoit le budget, pas le barème qui a servi à le calculer. Seule
 * l'administration (/admin/tarifs) affiche les tarifs.
 *
 * Aucun avertissement en cours de parcours non plus : l'absence éventuelle de
 * référence tarifaire est annoncée une seule fois, sur l'écran de résultat.
 */
export default function EtapeStanding({ standings, value, onChange }) {
  return (
    <section>
      <h2 className="font-sans text-xl font-bold text-brand-text mb-1">Quel niveau de standing souhaitez-vous ?</h2>
      <p className="text-[13.5px] text-brand-text/60 mb-6">
        Du plus sobre au plus haut de gamme : le standing décrit la qualité des matériaux et des finitions.
      </p>

      <EtapeSelectUnique
        label="Standing"
        options={standings}
        value={value}
        onChange={onChange}
        placeholder="Choisissez un standing…"
      />
    </section>
  );
}
