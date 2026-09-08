import React, { useMemo } from 'react';
import { useMetre } from '../../hooks/useMetre.js';
import { useProjet } from '../../context/ProjetContext.jsx';
import { genererResumeProjet, genererResumeChantier } from '@devis-facile/moteur';
import { exporterResumePDF, exporterResumeWord } from '../../utils/exportsResume.js';
import { ErrorBoundary } from '../ui/ErrorBoundary.jsx';
import Icone from '../ui/Icone.jsx';
import { useDroits } from '../../hooks/useDroits.js';

export default function EtapeResume() {
  const { metreParNiveau } = useMetre();
  const projet = useProjet();
  const regles = projet.reglesPersonnalisees;

  // Le résumé se consulte dès la formule Calcul ; son export appartient au
  // Devis Complet. On masque donc les boutons plutôt que de les laisser
  // échouer après le clic.
  const { peut } = useDroits();
  const peutExporter = peut('can_export_calculation_note');

  // L'export PDF/Word garde son format par niveau, inchangé par cette demande.
  const summaryData = useMemo(() => genererResumeProjet(metreParNiveau, regles), [metreParNiveau, regles]);

  /**
   * L'écran, lui, suit l'ordre du chantier — Terrassement, Fondation,
   * Élévation, Plancher, Toiture, Finitions — et non plus étage par étage.
   * Chaque poste porte son volume, son dosage réel, ses matériaux de béton
   * (ciment, sable, gravier, eau) et, s'il est armé, son fer regroupé par
   * diamètre plus le fil d'attache.
   */
  const resumeChantier = useMemo(() => genererResumeChantier(metreParNiveau, regles), [metreParNiveau, regles]);

  const handleExportPDF = () => {
    exporterResumePDF(summaryData, projet.parametresProjet);
  };

  const handleExportWord = () => {
    exporterResumeWord(summaryData, projet.parametresProjet);
  };

  const formatNum = (val) => {
    if (val === undefined || val === null) return '-';
    const v = Number(val);
    if (isNaN(v)) return val;
    return v % 1 === 0 ? String(v) : v.toFixed(3).replace(/\.?0+$/, '');
  };

  if (resumeChantier.titres.length === 0) {
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
            Les ouvrages dans l'ordre du chantier, chacun avec son volume et ses matériaux.
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
        <div className="space-y-6">
          {resumeChantier.titres.map((titre) => (
            <section key={titre.id} className="rounded-xl border border-black/5 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-black/5 bg-gray-50/80 px-5 py-4">
                <h3 className="text-[15px] font-bold text-brand-text">{titre.titre}</h3>
              </div>

              <div className="divide-y divide-black/[0.04] px-5">
                {titre.postes.map((poste) => (
                  <div key={poste.id} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="text-[14px] font-bold text-brand-text">{poste.nom}</h4>
                      <span className="font-mono text-[15px] font-bold text-brand-primary">
                        {formatNum(poste.volume)} <span className="text-[11px] font-normal text-brand-text/40">{poste.unite}</span>
                      </span>
                    </div>

                    {(poste.agglos.length > 0 || poste.beton) && (
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-brand-text/75">
                        {poste.agglos.map((a, i) => (
                          <span key={`agglo-${i}`}>
                            • {a.nom} : <b className="font-mono text-brand-secondary">{formatNum(a.quantite)} {a.unite}</b>
                          </span>
                        ))}
                        {poste.beton && Object.values(poste.beton).map((m, i) => (
                          <span key={`beton-${i}`}>
                            • {m.nom} : <b className="font-mono text-brand-secondary">{formatNum(m.quantite)} {m.unite}</b>
                          </span>
                        ))}
                      </div>
                    )}

                    {poste.aciers.length > 0 && (
                      <div className="mt-3 rounded-lg bg-black/[0.02] p-3">
                        <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-brand-text/50">
                          Aciers
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-brand-text/80">
                          {poste.aciers.map((a) => (
                            <span key={a.diametre}>
                              Fer Ø{a.diametre} : <b className="font-mono text-brand-secondary">{formatNum(a.poids)} kg</b>
                              <span className="text-brand-text/40"> ({a.barres12m} barre{a.barres12m > 1 ? 's' : ''} de 12 m)</span>
                            </span>
                          ))}
                        </div>
                        {poste.filAttache > 0 && (
                          <div className="mt-1.5 text-[12.5px] text-brand-text/80">
                            Fil d'attache : <b className="font-mono text-brand-secondary">{formatNum(poste.filAttache)} kg</b>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {titre.autresPostes.length > 0 && (
                <div className="border-t border-black/5 bg-brand-primary/[0.03] px-5 py-3.5">
                  <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-brand-primary">
                    Autres postes
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-brand-text/75">
                    {titre.autresPostes.map((m) => (
                      <span key={m.id_materiau}>
                        • {m.nom} : <b className="font-mono text-brand-secondary">{formatNum(m.quantite)} {m.unite}</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}

          {/* GRAND RÉCAPITULATIF GLOBAL */}
          {Object.values(summaryData.totals.materials).filter(m => m.quantite > 0).length > 0 && (
            <section className="rounded-xl border border-brand-secondary/20 bg-brand-secondary/[0.02] overflow-hidden">
              <div className="border-b border-brand-secondary/20 bg-brand-secondary/[0.05] px-5 py-4 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-brand-secondary flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  RÉCAPITULATIF GLOBAL DES MATÉRIAUX
                </h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.values(summaryData.totals.materials)
                    .filter(m => m.quantite > 0)
                    .map((t, i) => (
                      <div key={`global-${i}`} className="rounded-lg border border-brand-secondary/10 bg-white p-4 shadow-sm relative overflow-hidden group hover:border-brand-secondary/30 transition-colors">
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                          <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 3.5l7.5 15h-15L12 5.5z"/></svg>
                        </div>
                        <div className="text-[12px] font-bold text-brand-text/70 uppercase z-10 relative">{t.nom}</div>
                        <div className="mt-2 flex items-baseline gap-2 z-10 relative">
                          <span className="font-mono text-[20px] font-black text-brand-secondary">{formatNum(t.quantite)}</span>
                          <span className="text-[13px] font-medium text-brand-text/40">{t.unite}</span>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}
