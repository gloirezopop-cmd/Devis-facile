import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjet } from '../context/ProjetContext.jsx';
import { useMetre } from '../hooks/useMetre.js';
import { useDevis } from '../hooks/useDevis.js';
import TableurDevis from '../components/sections/TableurDevis.jsx';
import { generateWorkbookData } from '../utils/univerAdapter.js';
import { ErrorBoundary } from '../components/ui/ErrorBoundary.jsx';
import Icone from '../components/ui/Icone.jsx';

/**
 * Éditeur libre — formules Excel, modifications ligne à ligne, export natif.
 * Une capacité distincte du parcours guidé (Métré → Devis) : celui qui sait
 * ce qu'il fait peut ici corriger un chiffre sans repasser par le métré.
 */
export default function EditeurAvance() {
  const navigate = useNavigate();
  const { taux, parametresProjet, bibliothequePrix } = useProjet();
  const { metreParNiveau } = useMetre();
  const { devisParticulier, devisEntreprise } = useDevis();

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sans text-xl font-bold text-brand-text">Éditeur avancé</h1>
          <p className="mt-1 text-[13.5px] text-brand-text/55">
            Modifications libres, formules Excel et exports natifs.
          </p>
        </div>
        <button
          onClick={() => navigate('/metre?etape=5')}
          className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md border border-brand-primary/15 bg-white px-4 text-[13px] font-bold text-brand-text/70 hover:bg-black/[0.03]"
        >
          <Icone nom="arrow-right" size={15} className="rotate-180" />
          Retour au devis
        </button>
      </div>

      <div className="mb-3 flex items-start gap-2 rounded-md border border-devis-averifier/30 bg-amber-50 px-3 py-2 text-[12.5px] text-brand-text/70">
        <Icone nom="help-circle" size={15} className="mt-0.5 shrink-0 text-devis-averifier" />
        <span>
          Les modifications faites ici ne sont pas encore reliées au métré ni sauvegardées
          automatiquement. Exportez (icône de téléchargement dans la barre d'outils) pour
          conserver votre travail avant de quitter cette page.
        </span>
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
