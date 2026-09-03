import React from 'react';
import { useProjet } from '../context/ProjetContext.jsx';
import { useMetre } from '../hooks/useMetre.js';
import { useDevis } from '../hooks/useDevis.js';
import TableurDevis from '../components/sections/TableurDevis.jsx';
import { generateWorkbookData } from '../utils/univerAdapter.js';
import { ErrorBoundary } from '../components/ui/ErrorBoundary.jsx';

/**
 * Éditeur libre — formules Excel, modifications ligne à ligne, export natif.
 * Une capacité distincte du parcours guidé (Métré → Devis) : celui qui sait
 * ce qu'il fait peut ici corriger un chiffre sans repasser par le métré.
 */
export default function EditeurAvance() {
  const { taux, parametresProjet, bibliothequePrix } = useProjet();
  const { metreParNiveau } = useMetre();
  const { devisParticulier, devisEntreprise } = useDevis();

  return (
    <section>
      <div className="mb-4">
        <h1 className="font-sans text-xl font-bold text-brand-text">Éditeur avancé</h1>
        <p className="mt-1 text-[13.5px] text-brand-text/55">
          Modifications libres, formules Excel et exports natifs.
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-brand-primary/10 bg-white">
        <ErrorBoundary>
          <TableurDevis
            initialData={generateWorkbookData(devisParticulier, devisEntreprise, metreParNiveau, {
              taux,
              parametresProjet,
              bibliothequePrix,
            })}
          />
        </ErrorBoundary>
      </div>
    </section>
  );
}
