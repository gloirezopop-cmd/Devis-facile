import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useDevis } from '../../hooks/useDevis.js';
import { useExport } from '../../hooks/useExport.js';
import { useProjets } from '../../hooks/useProjets.js';
import { useToast } from '../../context/ToastContext.jsx';
import TableauDevis from '../sections/TableauDevis.jsx';
import TableurDevis from '../sections/TableurDevis.jsx';
import { ErrorBoundary } from '../ui/ErrorBoundary.jsx';
import { formaterNombre } from '../../utils/format.js';
import Icone from '../ui/Icone.jsx';
import MenuExport from '../ui/MenuExport.jsx';
import MenuEnregistrer from '../ui/MenuEnregistrer.jsx';
import LogoProjet from '../ui/LogoProjet.jsx';

/**
 * Étape 5 — le devis final. Permet de basculer entre le modèle Particulier (bordereau matériaux)
 * et le modèle Entreprise (prix tout compris pour le client).
 */
export default function EtapeDevis() {
  const [vue, setVue] = useState('entreprise');
  const { parametresProjet, setParametresProjet, devisExcelSnapshot, setDevisExcelSnapshot } = useProjet();
  const { devisEntreprise, devisParticulier } = useDevis();
  const { exportPDF, exportExcel } = useExport();
  const { sauvegarder, sauvegarderSous } = useProjets();
  const toast = useToast();

  const dateJour = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  const infoProjet = {
    maitreOuvrage: parametresProjet?.maitreOuvrage || '',
    localisation: parametresProjet?.localisation || '',
    reference: parametresProjet?.reference || 'DF-2026',
    nomEntreprise: parametresProjet?.nomEntreprise || '',
    logo: parametresProjet?.logo || null,
    date: parametresProjet?.date !== undefined ? parametresProjet.date : dateJour,
  };
  const numero = parametresProjet?.reference || 'DF-2026';

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
        <div className="flex items-start gap-4">
          <LogoProjet />
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
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-text/40">Date</p>
          <input
            value={parametresProjet?.date !== undefined ? parametresProjet.date : dateJour}
            onChange={(e) => setParametresProjet({ ...parametresProjet, date: e.target.value })}
            className="w-[150px] text-right bg-transparent border-0 font-mono text-[13.5px] text-brand-text/70 focus:bg-brand-bg focus:outline-none rounded px-1 py-0.5"
          />
        </div>
      </div>

      {devisExcelSnapshot && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-brand-primary/20 bg-brand-primary/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <Icone nom="check-circle" size={18} className="text-brand-primary" />
            <div>
              <p className="text-[13px] font-bold text-brand-text">Version Excel personnalisée active</p>
              <p className="text-[12px] text-brand-text/60">Ce devis affiche les couleurs et modifications manuelles faites dans l'éditeur avancé.</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm("Êtes-vous sûr de vouloir supprimer les modifications manuelles et revenir au devis automatique ?")) {
                setDevisExcelSnapshot(null);
                toast('Le devis automatique a été restauré.');
              }
            }}
            className="text-[12px] font-bold text-red-500 hover:text-red-700 underline"
          >
            Réinitialiser
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-4">
        {/* Toggle Particulier / Entreprise (hidden if snapshot active since snapshot contains both or specific edits) */}
        {!devisExcelSnapshot && (
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
        )}

        <MenuEnregistrer
          onEnregistrer={() => {
            sauvegarder(parametresProjet?.reference);
            toast('Projet enregistré — retrouvez-le dans « Projets ».');
          }}
          onEnregistrerSous={() => {
            const nom = window.prompt('Nom de la copie :', `${parametresProjet?.reference || 'Projet'} (copie)`);
            if (!nom) return;
            sauvegarderSous(nom);
            toast(`Enregistré sous « ${nom} ».`);
          }}
        />
        {/* « Modifier » emmene vers l'editeur Excel */}
        <Link
          to="/devis/avance"
          className="flex min-h-[44px] items-center gap-1.5 rounded-md border border-brand-primary/15 px-3 text-[13px] font-bold text-brand-text/70 hover:bg-black/[0.03]"
        >
          <Icone nom="edit" size={15} />
          {devisExcelSnapshot ? 'Modifier encore dans Excel' : 'Modifier le devis'}
        </Link>
        <div className="ml-auto">
          <MenuExport
            disabled={vue === 'entreprise' ? !devisEntreprise?.total : !devisParticulier?.total}
            onExporterPDF={() => {
              if (devisExcelSnapshot) {
                toast("Veuillez utiliser la fonction d'impression depuis l'éditeur avancé pour imprimer votre version Excel colorée.");
                return;
              }
              const devisActif = vue === 'entreprise' ? devisEntreprise : devisParticulier;
              if (!devisActif?.total) return toast('Aucun ouvrage à exporter pour le moment.', 'erreur');
              exportPDF(devisActif, vue, infoProjet);
              toast('Fichier PDF généré.');
            }}
            onExporterExcel={() => {
              const devisActif = vue === 'entreprise' ? devisEntreprise : devisParticulier;
              if (!devisActif?.total) return toast('Aucun ouvrage à exporter pour le moment.', 'erreur');
              exportExcel(devisActif, vue, infoProjet);
              toast('Fichier Excel généré.');
            }}
          />
        </div>
      </div>

      <ErrorBoundary>
        {devisExcelSnapshot ? (
          <div className="overflow-hidden rounded-lg border border-brand-primary/10 bg-white">
             <TableurDevis initialData={devisExcelSnapshot} readOnly={true} />
          </div>
        ) : (
          <TableauDevis devis={vue === 'entreprise' ? devisEntreprise : devisParticulier} type={vue} />
        )}
      </ErrorBoundary>

      {!devisExcelSnapshot && vue === 'entreprise' && devisEntreprise?.cascade && (
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
    </div>
  );
}
