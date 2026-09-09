import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useDevis } from '../../hooks/useDevis.js';
import { useExport } from '../../hooks/useExport.js';
import { useProjets } from '../../hooks/useProjets.js';
import { useToast } from '../../context/ToastContext.jsx';
import TableauDevis from '../sections/TableauDevis.jsx';
import ApercuFeuilleExcel from '../sections/ApercuFeuilleExcel.jsx';
import { lireDevisDuClasseur } from '../../utils/univerLecture.js';
import { signatureDevis } from '../../utils/signatureDevis.js';
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
  const {
    parametresProjet, setParametresProjet,
    devisExcelSnapshot, setDevisExcelSnapshot,
    devisExcelSignature, setDevisExcelSignature,
  } = useProjet();
  const { devisEntreprise, devisParticulier } = useDevis();
  const { exportPDF, exportExcel } = useExport();
  const { sauvegarder, sauvegarderSous } = useProjets();
  const toast = useToast();

  const dateJour = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  // La feuille modifiee dans l'editeur est relue vers la meme forme de devis
  // que celle du moteur. L'ecran, le PDF et le XLSX repartent donc tous du
  // meme objet : ce qu'on voit ici est exactement ce qui s'imprime.
  const devisExcel = useMemo(
    () =>
      devisExcelSnapshot
        ? {
            particulier: lireDevisDuClasseur(devisExcelSnapshot, 'particulier'),
            entreprise: lireDevisDuClasseur(devisExcelSnapshot, 'entreprise'),
          }
        : null,
    [devisExcelSnapshot],
  );

  // Une feuille illisible (renommee, videe) ne doit pas effacer le devis :
  // on retombe alors sur celui que le metre a calcule.
  const devisActif =
    vue === 'entreprise'
      ? devisExcel?.entreprise || devisEntreprise
      : devisExcel?.particulier || devisParticulier;
  const excelActif = Boolean(devisExcel?.[vue === 'entreprise' ? 'entreprise' : 'particulier']);

  // La feuille Excel est une photographie du devis. Si le métré, les prix ou
  // les règles ont bougé depuis, elle montre l'ancien chiffrage — et comme
  // c'est elle qu'on rouvre, l'ancien gagne en silence.
  const signatureActuelle = useMemo(
    () => signatureDevis(devisParticulier, devisEntreprise),
    [devisParticulier, devisEntreprise],
  );
  const excelPerime = Boolean(devisExcelSnapshot) && devisExcelSignature !== signatureActuelle;

  const repartirDuDevisAJour = () => {
    setDevisExcelSnapshot(null);
    setDevisExcelSignature(null);
    toast('Le devis a été régénéré à partir de votre métré.');
  };

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
    <div className="zone-impression">
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
        <div
          className={`sans-impression mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 ${
            excelPerime
              ? 'border-devis-averifier/40 bg-amber-50'
              : 'border-brand-primary/20 bg-brand-primary/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icone
              nom={excelPerime ? 'alert-circle' : 'check-circle'}
              size={18}
              className={excelPerime ? 'text-devis-averifier' : 'text-brand-primary'}
            />
            <div>
              <p className="text-[13px] font-bold text-brand-text">
                {excelPerime ? 'Cette version Excel date d’avant vos derniers calculs' : 'Version Excel personnalisée active'}
              </p>
              <p className="text-[12px] text-brand-text/60">
                {excelPerime
                  ? "Le métré, les prix ou les règles ont changé depuis. Ce qui s'affiche est l'ancien chiffrage — régénérez pour repartir du devis à jour."
                  : excelActif
                    ? "Les quantités et les prix ci-dessous sont ceux de votre feuille Excel. Le PDF et l'impression les reprennent."
                    : "Cette feuille n'a pas pu être relue — le devis calculé par le métré est affiché en attendant."}
              </p>
            </div>
          </div>
          {excelPerime ? (
            <button
              onClick={repartirDuDevisAJour}
              className="shrink-0 rounded-md border border-devis-averifier/40 bg-white px-4 py-2 text-[12.5px] font-bold text-brand-text hover:bg-black/[0.03]"
            >
              Régénérer depuis le métré
            </button>
          ) : (
            <button
              onClick={() => {
                if (window.confirm('Êtes-vous sûr de vouloir supprimer les modifications manuelles et revenir au devis automatique ?')) {
                  repartirDuDevisAJour();
                }
              }}
              className="text-[12px] font-bold text-red-500 underline hover:text-red-700"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      <div className="sans-impression mb-4 flex flex-wrap items-center gap-4">
        {/* Le classeur porte les deux feuilles : le choix reste offert meme
            quand une version Excel est active. */}
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
        <div className="ml-auto flex items-center gap-2">
          {/* L'impression du navigateur est le seul chemin qui conserve les
              couleurs de la feuille : le PDF, lui, refait sa mise en page. */}
          <button
            onClick={() => window.print()}
            className="flex min-h-[44px] items-center gap-1.5 rounded-md border border-brand-primary/15 px-3 text-[13px] font-bold text-brand-text/70 hover:bg-black/[0.03]"
          >
            <Icone nom="file-text" size={15} />
            Imprimer
          </button>
          <MenuExport
            disabled={!devisActif?.total}
            onExporterPDF={() => {
              if (!devisActif?.total) return toast('Aucun ouvrage à exporter pour le moment.', 'erreur');
              exportPDF(devisActif, vue, infoProjet);
              toast('Fichier PDF généré.');
            }}
            onExporterExcel={() => {
              if (!devisActif?.total) return toast('Aucun ouvrage à exporter pour le moment.', 'erreur');
              exportExcel(devisActif, vue, infoProjet);
              toast('Fichier Excel généré.');
            }}
          />
        </div>
      </div>

      <ErrorBoundary>
        {/* Quand une version Excel est active, on rend la feuille elle-même :
            couleurs, fusions, largeurs et gras posés dans l'éditeur survivent
            au retour. Les chiffres, eux, ont déjà été relus dans `devisActif`,
            que le PDF et le XLSX consomment. */}
        {devisExcelSnapshot
          ? <ApercuFeuilleExcel classeur={devisExcelSnapshot} feuille={vue} />
          : <TableauDevis devis={devisActif} type={vue} />}
      </ErrorBoundary>

      {!excelActif && vue === 'entreprise' && devisEntreprise?.cascade && (
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
