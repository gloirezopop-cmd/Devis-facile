import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMetre } from '../../hooks/useMetre.js';
import { useProjet } from '../../context/ProjetContext.jsx';
import { genererResumeChantier } from '@devis-facile/moteur';
import { construireTableauResume } from '../../utils/tableauResume.js';
import { exporterResumePDF, exporterResumeWord } from '../../utils/exportsResume.js';
import { ErrorBoundary } from '../ui/ErrorBoundary.jsx';
import Icone from '../ui/Icone.jsx';
import { useDroits } from '../../hooks/useDroits.js';

/** Le quadrillage complet du classeur : chaque case porte son trait. */
const CELLULE = 'border border-black/20 px-2 py-1.5';

export default function EtapeResume() {
  const { metreParNiveau } = useMetre();
  const projet = useProjet();
  const regles = projet.reglesPersonnalisees;

  // Le résumé se consulte dès la formule Calcul ; son export appartient au
  // Devis Complet. On masque donc les boutons plutôt que de les laisser
  // échouer après le clic.
  const { peut } = useDroits();
  const peutExporter = peut('can_export_calculation_note');

  /**
   * L'écran, lui, suit l'ordre du chantier — Terrassement, Fondation,
   * Élévation, Plancher, Toiture, Finitions — et non plus étage par étage.
   * Chaque poste porte son volume, son dosage réel, ses matériaux de béton
   * (ciment, sable, gravier, eau) et, s'il est armé, son fer regroupé par
   * diamètre plus le fil d'attache.
   */
  const resumeChantier = useMemo(() => genererResumeChantier(metreParNiveau, regles), [metreParNiveau, regles]);

  /** La même matière, mise à plat au format du classeur : un ouvrage, puis ses matériaux. */
  const lignes = useMemo(() => construireTableauResume(resumeChantier), [resumeChantier]);

  /**
   * Le bon de commande, additionné à partir des mêmes lignes que celles
   * affichées sous chaque ouvrage. L'ancien récapitulatif venait d'un second
   * calcul, qui inventait une entrée par repère d'armature — « FER Ø AMORCE
   * PRINCIPALE 1 12 » — et comptait le fer deux fois, en unités puis en barres.
   */
  const recapitulatif = useMemo(
    () => (resumeChantier.recapitulatifGlobal || []).filter((m) => m.quantite > 0),
    [resumeChantier],
  );

  // Les exports partent de la même liste que l'écran : ils ne peuvent donc pas
  // montrer autre chose que ce que l'utilisateur vient de lire.
  const handleExportPDF = () => {
    exporterResumePDF(lignes, projet.parametresProjet, recapitulatif);
  };

  const handleExportWord = () => {
    exporterResumeWord(lignes, projet.parametresProjet, recapitulatif);
  };

  // Virgule décimale et espace des milliers : le classeur d'origine écrit
  // « 2,49 » et « 7 939 », pas « 2.49 ».
  const formatNum = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const v = Number(val);
    if (Number.isNaN(v)) return String(val);
    return v.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
  };

  if (lignes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[15px] font-medium text-brand-text/50">Aucune donnée disponible pour le résumé.</p>
        <p className="mt-1 text-[13px] text-brand-text/40">Saisissez des dimensions dans les étapes précédentes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-sans text-xl font-bold text-brand-text">Résumé du Métré</h2>
          <p className="mt-1 text-[13.5px] text-brand-text/55">
            Les ouvrages dans l'ordre du chantier, chacun suivi des matériaux à commander.
          </p>
        </div>
        {!peutExporter && (
          <p className="flex items-center gap-2 rounded-lg bg-black/[0.03] px-4 py-2.5 text-[12.5px] text-brand-text/60">
            <Icone nom="lock" size={14} className="shrink-0 text-brand-text/40" />
            L'export du résumé est compris dans la formule Devis Complet.
          </p>
        )}
        {peutExporter && (
        <div className="flex gap-2">
          <button
            onClick={handleExportWord}
            className="inline-flex items-center gap-2 rounded bg-white px-4 py-2 text-[13px] font-bold text-brand-text shadow-sm ring-1 ring-black/5 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-[#2b579a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline strokeLinecap="round" strokeLinejoin="round" points="14 2 14 8 20 8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15v-6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 15v-6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 15v-6" />
            </svg>
            Exporter Word
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 rounded bg-brand-primary px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-brand-primary-dark transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline strokeLinecap="round" strokeLinejoin="round" points="14 2 14 8 20 8" />
              <line strokeLinecap="round" strokeLinejoin="round" x1="12" y1="18" x2="12" y2="12" />
              <polyline strokeLinecap="round" strokeLinejoin="round" points="9 15 12 18 15 15" />
            </svg>
            Exporter PDF
          </button>
        </div>
        )}
      </div>

      <ErrorBoundary>
        <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
          <table className="w-full min-w-[620px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#DCE3EC] text-brand-text">
                <th className={`${CELLULE} w-14 text-center font-bold`}>N°</th>
                <th className={`${CELLULE} text-center font-bold`}>Nature des travaux</th>
                <th className={`${CELLULE} w-24 text-center font-bold`}>Unités</th>
                <th className={`${CELLULE} w-28 text-center font-bold`}>Qte</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne, i) => {
                if (ligne.type === 'bandeau') {
                  return (
                    <tr key={`b${i}`} className="bg-[#E4E9EF]">
                      <td colSpan={4} className={`${CELLULE} text-center text-[13.5px] font-bold uppercase tracking-wide`}>
                        {ligne.libelle}
                      </td>
                    </tr>
                  );
                }

                if (ligne.type === 'ouvrage') {
                  return (
                    <tr key={`o${i}`} className="bg-[#F2F4F7]">
                      <td className={`${CELLULE} text-center font-bold`}>{ligne.numero}</td>
                      <td className={`${CELLULE} font-bold`}>{ligne.libelle}</td>
                      <td className={`${CELLULE} text-center font-bold`}>{ligne.unite}</td>
                      <td className={`${CELLULE} text-right font-mono font-bold tabular-nums`}>
                        {formatNum(ligne.quantite)}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={`m${i}`} className="hover:bg-black/[0.02]">
                    <td className={`${CELLULE} text-center text-brand-text/50`}>{ligne.numero}</td>
                    <td className={`${CELLULE} pl-6`}>
                      {ligne.libelle}
                      {ligne.precision && (
                        <span className="ml-2 text-[11.5px] text-brand-text/45">({ligne.precision})</span>
                      )}
                    </td>
                    <td className={`${CELLULE} text-center text-brand-text/70`}>{ligne.unite}</td>
                    <td className={`${CELLULE} text-right font-mono tabular-nums text-[#14479B]`}>
                      {formatNum(ligne.quantite)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Électricité, plomberie, plafond… : aucune dimension du plan ne
            permet de les déduire. Plutôt que d'inventer une formule, on dit
            franchement où l'utilisateur peut les poser lui-même. */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-primary/20 bg-brand-primary/[0.04] px-4 py-3.5">
          <div className="flex items-start gap-3">
            <Icone nom="help-circle" size={17} className="mt-0.5 shrink-0 text-brand-primary" />
            <div>
              <p className="text-[13px] font-bold text-brand-text">
                Électricité, plomberie, plafond, ouvertures&nbsp;?
              </p>
              <p className="text-[12.5px] text-brand-text/60">
                Ces lots n'ont pas de formule automatique : les quantités dépendent de votre projet, pas
                des dimensions. Ajoutez-les vous-même et ils apparaîtront ici, puis dans le devis.
              </p>
            </div>
          </div>
          <Link
            to="/metre?etape=2#ouvrages-supplementaires"
            className="shrink-0 rounded-md border border-brand-primary/25 bg-white px-4 py-2 text-[12.5px] font-bold text-brand-primary hover:bg-brand-primary/5"
          >
            Ajouter un lot
          </Link>
        </div>

        {/* RÉCAPITULATIF GLOBAL — ce qu'il faut commander en tout, tous lots confondus. */}
        {recapitulatif.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-xl border border-brand-secondary/20 bg-brand-secondary/[0.02]">
            <div className="border-b border-brand-secondary/20 bg-brand-secondary/[0.05] px-5 py-4">
              <h3 className="text-[15px] font-bold text-brand-secondary">
                RÉCAPITULATIF GLOBAL DES MATÉRIAUX
              </h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {recapitulatif.map((t, i) => (
                    <div
                      key={`global-${i}`}
                      className="rounded-lg border border-brand-secondary/10 bg-white p-4 shadow-sm"
                    >
                      <div className="text-[12px] font-bold uppercase text-brand-text/70">{t.nom}</div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-mono text-[20px] font-black text-brand-secondary">
                          {formatNum(t.quantite)}
                        </span>
                        <span className="text-[13px] font-medium text-brand-text/40">{t.unite}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}
      </ErrorBoundary>
    </div>
  );
}
