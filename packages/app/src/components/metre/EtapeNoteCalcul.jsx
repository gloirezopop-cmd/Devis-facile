import React, { useState } from 'react';
import { useDevis } from '../../hooks/useDevis.js';
import { ErrorBoundary } from '../ui/ErrorBoundary.jsx';
import Icone from '../ui/Icone.jsx';

/**
 * Composant Note de Calcul — Source de Vérité Unique.
 * Affiche l'explication complète de chaque calcul d'ouvrage :
 * - Données saisies (#14479B)
 * - Formules et applications numériques
 * - Résultat brut et arrondi avec justification (#8A5D00)
 * - Décomposition des matériaux réels (sacs de ciment, sable, gravier, agglos)
 */
export default function EtapeNoteCalcul() {
  const { noteDeCalcul } = useDevis();
  const [recherche, setRecherche] = useState('');
  const [ouvragesOuverts, setOuvragesOuverts] = useState({});

  const toggleOuvrage = (id) => {
    setOuvragesOuverts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const ouvrirTous = () => {
    const map = {};
    noteDeCalcul?.lots?.forEach((lot) => {
      lot.ouvrages?.forEach((ov) => {
        map[ov.id_ouvrage] = true;
      });
    });
    setOuvragesOuverts(map);
  };

  const fermerTous = () => setOuvragesOuverts({});

  if (!noteDeCalcul || !noteDeCalcul.lots || noteDeCalcul.lots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-brand-primary/20 bg-white p-8 text-center">
        <Icone nom="file-text" size={36} className="mx-auto mb-3 text-brand-text/30" />
        <h3 className="text-[16px] font-bold text-brand-text">Aucun calcul disponible</h3>
        <p className="mt-1 text-[13.5px] text-brand-text/60">
          Veuillez d'abord saisir les dimensions des ouvrages dans l'étape « Métré ».
        </p>
      </div>
    );
  }

  // Filtrage
  const term = recherche.toLowerCase().trim();
  const lotsFiltres = noteDeCalcul.lots.map((lot) => {
    const ouvrages = lot.ouvrages.filter((ov) => {
      if (!term) return true;
      if (ov.nom.toLowerCase().includes(term)) return true;
      if (ov.id_ouvrage.toLowerCase().includes(term)) return true;
      return ov.lignes?.some((l) => l.repere?.toLowerCase().includes(term));
    });
    return { ...lot, ouvrages };
  }).filter((lot) => lot.ouvrages.length > 0);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* En-tête & Barre d'outils */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-brand-primary/10 bg-white p-4">
          <div>
            <h2 className="font-sans text-xl font-bold text-brand-text">Note de Calcul</h2>
            <p className="mt-0.5 text-[13.5px] text-brand-text/60">
              Moteur explicatif central — Source de vérité unique pour le Devis Entreprise et Particulier.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un ouvrage ou repère..."
              className="min-h-[40px] w-64 rounded-md border border-brand-primary/20 px-3 text-[13.5px] focus:border-brand-primary focus:outline-none"
            />
            <button
              onClick={ouvrirTous}
              className="min-h-[40px] rounded-md border border-brand-primary/15 px-3 text-[12.5px] font-bold text-brand-text/70 hover:bg-black/[0.03]"
            >
              Déplier tout
            </button>
            <button
              onClick={fermerTous}
              className="min-h-[40px] rounded-md border border-brand-primary/15 px-3 text-[12.5px] font-bold text-brand-text/70 hover:bg-black/[0.03]"
            >
              Replier tout
            </button>
          </div>
        </div>

        {/* Liste des Lots */}
        {lotsFiltres.map((lot) => (
          <div key={lot.id_lot} className="rounded-xl border border-brand-primary/10 bg-white shadow-sm overflow-hidden">
            <div className="bg-black/[0.02] px-5 py-3 border-b border-brand-primary/10">
              <h3 className="font-sans text-[15px] font-bold uppercase tracking-wide text-brand-primary">
                {lot.nom}
              </h3>
            </div>

            <div className="divide-y divide-brand-primary/10">
              {lot.ouvrages.map((ov) => {
                const estOuvert = ouvragesOuverts[ov.id_ouvrage] ?? true;

                return (
                  <div key={ov.id_ouvrage} id={`calc_${ov.id_ouvrage}`} className="p-5 transition-colors">
                    {/* Header Ouvrage */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] font-bold px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary">
                            {ov.id_ouvrage}
                          </span>
                          <h4 className="font-sans text-[16px] font-bold text-brand-text">{ov.nom}</h4>
                        </div>
                        <p className="mt-1 text-[13px] text-brand-text/60">
                          {ov.lignes.length} élément(s) mesuré(s)
                        </p>
                      </div>

                      <button
                        onClick={() => toggleOuvrage(ov.id_ouvrage)}
                        className="inline-flex items-center gap-1.5 rounded border border-brand-primary/15 px-3 py-1.5 text-[12.5px] font-bold text-brand-primary hover:bg-brand-primary/5"
                      >
                        <Icone nom={estOuvert ? 'chevron-up' : 'chevron-down'} size={14} />
                        {estOuvert ? 'Masquer le calcul' : 'Voir le calcul'}
                      </button>
                    </div>

                    {/* Contenu Déplié du Calcul */}
                    {estOuvert && (
                      <div className="mt-4 space-y-4 border-t border-dashed border-brand-primary/15 pt-4">
                        {/* Tableau des éléments de saisie */}
                        {ov.lignes.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-[13px]">
                              <thead>
                                <tr className="border-b border-brand-primary/10 text-left text-brand-text/50 uppercase text-[11px] font-bold">
                                  <th className="py-2 pr-3">Repère</th>
                                  <th className="py-2 px-3">Données de saisie</th>
                                  <th className="py-2 px-3">Formule</th>
                                  <th className="py-2 px-3">Application numérique</th>
                                  <th className="py-2 pl-3 text-right">{ov.label_resultat || 'Résultat'} ({ov.unite})</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-brand-primary/5">
                                {ov.lignes.map((l) => (
                                  <tr key={l.id_ligne} className="hover:bg-black/[0.01]">
                                    <td className="py-2.5 pr-3 font-mono font-bold text-brand-primary">
                                      {l.repere}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[12.5px] text-[#14479B]">
                                      {Object.entries(l.donnees)
                                        .map(([k, v]) => `${k}=${v}`)
                                        .join(' | ')}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-brand-text/70">{l.formule}</td>
                                    <td className="py-2.5 px-3 font-mono text-brand-text/80">{l.application}</td>
                                    <td className="py-2.5 pl-3 text-right font-mono font-bold tabular-nums text-[#0F151B]">
                                      {l.valeur_arrondie}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-brand-primary/5 border-t border-brand-primary/10">
                                  <td colSpan="4" className="py-3 px-3 text-right font-bold text-brand-primary uppercase text-[12px]">
                                    {ov.label_resultat || 'Total'}
                                  </td>
                                  <td className="py-3 pl-3 text-right font-mono font-bold text-brand-text text-[14px]">
                                    {ov.total_arrondi}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}

                        {/* Motif d'arrondi */}
                        {ov.motif_arrondi && (
                          <div className="rounded border border-[#8A5D00]/20 bg-[#8A5D00]/5 px-3.5 py-2 text-[12.5px] text-[#8A5D00]">
                            <strong>Règle d'arrondi :</strong> {ov.motif_arrondi}
                          </div>
                        )}

                        {/* Décomposition des matériaux réels */}
                        {ov.decomposition_materiaux.length > 0 && (
                          <div className="rounded-lg bg-black/[0.02] p-4 border border-brand-primary/10">
                            <h5 className="font-sans text-[13px] font-bold uppercase tracking-wider text-brand-text/70 mb-2">
                              Décomposition des matériaux de fournitures
                            </h5>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {ov.decomposition_materiaux.map((mat) => (
                                <div
                                  key={mat.id_materiau}
                                  id={`mat_${mat.id_materiau}`}
                                  className="rounded border border-brand-primary/10 bg-white p-3 shadow-2xs"
                                >
                                  <div className="flex justify-between font-bold text-[13.5px]">
                                    <span className="text-brand-text">{mat.nom}</span>
                                    <span className="font-mono tabular-nums text-[#14634A]">
                                      {mat.valeur_arrondie} {mat.unite}
                                    </span>
                                  </div>
                                  <p className="mt-1 font-mono text-[11.5px] text-brand-text/60 whitespace-pre-wrap">
                                    Calcul : {mat.calcul}
                                  </p>
                                  {mat.motif_arrondi && (
                                    <p className="mt-1 text-[11px] font-semibold text-[#8A5D00]">
                                      • {mat.motif_arrondi}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ErrorBoundary>
  );
}
