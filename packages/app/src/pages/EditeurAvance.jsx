import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjet } from '../context/ProjetContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDevis } from '../hooks/useDevis.js';
import { useProjets } from '../hooks/useProjets.js';
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
  const tableurRef = React.useRef(null);
  const { taux, parametresProjet, bibliothequePrix, setDevisExcelSnapshot, devisExcelSnapshot } = useProjet();
  const { devisParticulier, devisEntreprise } = useDevis();
  const { sauvegarder } = useProjets();
  const toast = useToast();

  const handleEnregistrer = () => {
    if (tableurRef.current) {
      const snapshot = tableurRef.current.getSnapshot();
      setDevisExcelSnapshot(snapshot);
    }
    // Délai pour laisser le state se propager avant sauvegarde (qui lit le context)
    setTimeout(() => {
      sauvegarder(parametresProjet?.reference);
      toast('Projet enregistré avec succès (incluant les modifications Excel) !');
    }, 100);
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sans text-xl font-bold text-brand-text">Éditeur avancé</h1>
          <p className="mt-1 text-[13.5px] text-brand-text/55">
            Modifications libres, formules Excel et personnalisation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (tableurRef.current) {
                setDevisExcelSnapshot(tableurRef.current.getSnapshot());
              }
              navigate('/metre?etape=5');
            }}
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md border border-brand-primary/15 bg-white px-4 text-[13px] font-bold text-brand-text/70 hover:bg-black/[0.03]"
          >
            <Icone nom="arrow-right" size={15} className="rotate-180" />
            Retour au devis
          </button>
          <button
            onClick={handleEnregistrer}
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md border border-transparent bg-brand-primary px-5 text-[13px] font-bold text-white hover:bg-brand-primary-dark"
          >
            <Icone nom="save" size={15} />
            Enregistrer le Projet
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-start gap-2 rounded-md border border-devis-averifier/30 bg-amber-50 px-3 py-2 text-[12.5px] text-brand-text/70">
        <Icone nom="help-circle" size={15} className="mt-0.5 shrink-0 text-devis-averifier" />
        <span>
          Cliquez sur <strong>Enregistrer le Projet</strong> pour sauvegarder vos modifications Excel dans le Cloud. Vous les retrouverez dans l'onglet "Projets".
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-brand-primary/10 bg-white">
        <ErrorBoundary>
          <TableurDevis
            ref={tableurRef}
            initialData={devisExcelSnapshot || generateWorkbookData(devisParticulier, devisEntreprise, {
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
