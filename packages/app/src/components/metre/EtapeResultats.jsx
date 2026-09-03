import React, { useState } from 'react';
import { useDevis } from '../../hooks/useDevis.js';
import TableauDevis from '../sections/TableauDevis.jsx';
import { ErrorBoundary } from '../ui/ErrorBoundary.jsx';

/**
 * Étape 4 — les quantités que le métré des étapes précédentes a produites,
 * lot par lot, dans l'ordre du classeur. C'est le quantitatif ; le passage
 * au devis (prix compris) est l'étape suivante, volontairement séparée :
 * on vérifie d'abord ce qui a été mesuré avant de le voir chiffré.
 */
export default function EtapeResultats() {
  const [vue, setVue] = useState('particulier');
  const { devisParticulier, devisEntreprise } = useDevis();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-sans text-xl font-bold text-brand-text">Résultats du métré</h2>
          <p className="mt-1 text-[13.5px] text-brand-text/55">Quantités calculées, mises à jour en direct.</p>
        </div>
        <div className="inline-flex rounded-lg bg-black/[0.04] p-1">
          {[
            ['particulier', 'Particulier'],
            ['entreprise', 'Entreprise'],
          ].map(([cle, libelle]) => (
            <button
              key={cle}
              onClick={() => setVue(cle)}
              className={`min-h-[40px] rounded px-4 text-[13px] font-bold transition-colors ${
                vue === cle ? 'bg-white text-brand-text shadow-sm' : 'text-brand-text/50 hover:text-brand-text'
              }`}
            >
              {libelle}
            </button>
          ))}
        </div>
      </div>

      <ErrorBoundary>
        <TableauDevis devis={vue === 'entreprise' ? devisEntreprise : devisParticulier} type={vue} />
      </ErrorBoundary>
    </div>
  );
}
