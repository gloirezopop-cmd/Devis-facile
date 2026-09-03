import React from 'react';
import { Link } from 'react-router-dom';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useDevis } from '../../hooks/useDevis.js';
import { useExport } from '../../hooks/useExport.js';
import { useToast } from '../../context/ToastContext.jsx';
import TableauDevis from '../sections/TableauDevis.jsx';
import { ErrorBoundary } from '../ui/ErrorBoundary.jsx';
import { formaterNombre } from '../../utils/format.js';
import Icone from '../ui/Icone.jsx';

/**
 * Étape 5 — le devis final, prix tout compris (modèle Entreprise : c'est lui
 * qui porte le HT / la TVA / le TTC demandés). Le modèle Particulier reste
 * disponible à l'étape Résultats pour le bordereau de fournitures.
 */
export default function EtapeDevis() {
  const { parametresProjet, setParametresProjet } = useProjet();
  const { devisEntreprise } = useDevis();
  const { exportPDF, exportExcel } = useExport();
  const toast = useToast();

  const infoProjet = {
    maitreOuvrage: parametresProjet?.maitreOuvrage || '',
    localisation: parametresProjet?.localisation || '',
    reference: parametresProjet?.reference || 'DF-2026',
  };
  const numero = parametresProjet?.reference || 'DF-2026';
  const dateJour = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  const champ = (cle) => (
    <input
      value={parametresProjet?.[cle] || ''}
      onChange={(e) => setParametresProjet({ ...parametresProjet, [cle]: e.target.value })}
      placeholder="—"
      className="w-full rounded border-0 bg-transparent px-0 py-0.5 text-[14px] font-bold text-brand-text focus:bg-brand-bg focus:px-1.5 focus:outline-none"
    />
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-brand-primary/10 bg-white p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-text/40">Devis N°</p>
          {champ('reference')}
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-text/40">Client</p>
              {champ('maitreOuvrage')}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-text/40">Localisation</p>
              {champ('localisation')}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-text/40">Entreprise</p>
              {champ('nomEntreprise')}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-text/40">Date</p>
          <p className="font-mono text-[13.5px] text-brand-text/70">{dateJour}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => toast('Le projet est déjà enregistré automatiquement sur cet appareil.')}
          className="flex min-h-[44px] items-center gap-1.5 rounded-md border border-brand-primary/15 px-3 text-[13px] font-bold text-brand-text/70 hover:bg-black/[0.03]"
        >
          <Icone nom="check-square" size={15} />
          Enregistré
        </button>
        <Link
          to="/metre?etape=3"
          className="flex min-h-[44px] items-center gap-1.5 rounded-md border border-brand-primary/15 px-3 text-[13px] font-bold text-brand-text/70 hover:bg-black/[0.03]"
        >
          <Icone nom="edit" size={15} />
          Modifier le métré
        </Link>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (!devisEntreprise?.total) return toast('Aucun ouvrage à exporter pour le moment.', 'erreur');
              exportExcel(devisEntreprise, 'entreprise', infoProjet);
              toast('Fichier Excel généré.');
            }}
            className="flex min-h-[44px] items-center gap-1.5 rounded-md border border-brand-primary/15 px-3 text-[13px] font-bold text-brand-text/70 hover:bg-black/[0.03]"
          >
            <Icone nom="file-text" size={15} />
            Exporter Excel
          </button>
          <button
            onClick={() => {
              if (!devisEntreprise?.total) return toast('Aucun ouvrage à exporter pour le moment.', 'erreur');
              exportPDF(devisEntreprise, 'entreprise', infoProjet);
              toast('Fichier PDF généré.');
            }}
            className="flex min-h-[44px] items-center gap-1.5 rounded-md bg-brand-primary px-4 text-[13px] font-bold text-white hover:bg-brand-primary-dark"
          >
            <Icone nom="file-text" size={15} />
            Exporter PDF
          </button>
        </div>
      </div>

      <ErrorBoundary>
        <TableauDevis devis={devisEntreprise} type="entreprise" />
      </ErrorBoundary>

      {devisEntreprise?.cascade && (
        <div className="mt-4 flex justify-end">
          <table className="w-full max-w-xs text-[13.5px]">
            <tbody>
              <tr>
                <td className="py-1 text-brand-text/55">Total HT</td>
                <td className="py-1 text-right font-mono tabular-nums">{formaterNombre(devisEntreprise.cascade.totalHT, true)}</td>
              </tr>
              <tr>
                <td className="py-1 text-brand-text/55">TVA</td>
                <td className="py-1 text-right font-mono tabular-nums">{formaterNombre(devisEntreprise.cascade.tva, true)}</td>
              </tr>
              <tr className="border-t-2 border-brand-primary/15 text-[15px] font-bold">
                <td className="pt-2">Total TTC</td>
                <td className="pt-2 text-right font-mono tabular-nums text-brand-primary">
                  {formaterNombre(devisEntreprise.cascade.netAPayer, true)} FCFA
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-center text-[12.5px] text-brand-text/40">
        Besoin de formules Excel et de modifications libres ?{' '}
        <Link to="/devis/avance" className="font-bold text-brand-interactive hover:underline">
          Ouvrir l'éditeur avancé
        </Link>
      </p>
    </div>
  );
}
