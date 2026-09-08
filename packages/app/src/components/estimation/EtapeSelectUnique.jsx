import React from 'react';
import SelectSaisie from '../ui/SelectSaisie.jsx';

/**
 * Sélection unique sous forme de menu déroulant — pays, localisation, type de
 * construction, standing, toiture. Un menu déroulant classique, pas une
 * grille de cartes : c'est le composant que l'utilisateur attend pour
 * « choisir une option dans une liste », et il réutilise `SelectSaisie`,
 * déjà la convention du reste de l'application (formulaire de métré, admin).
 */
export default function EtapeSelectUnique({ label, options, value, onChange, vide, placeholder = 'Choisissez…' }) {
  if (!options || options.length === 0) {
    return <p className="text-sm text-brand-text/50 italic py-4">{vide || 'Aucune option disponible.'}</p>;
  }

  return (
    <SelectSaisie
      label={label}
      value={value || ''}
      onChange={onChange}
      options={[{ value: '', label: placeholder }, ...options.map((o) => ({ value: o.id, label: o.name }))]}
    />
  );
}
