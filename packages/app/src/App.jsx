import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProjetProvider, useProjet } from './context/ProjetContext.jsx';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EmptyState from './components/ui/EmptyState.jsx';
import { NAVIGATION, ROUTES_ACTIVES } from './components/layout/navigation.js';
import { useMetre } from './hooks/useMetre.js';
import { useDevis } from './hooks/useDevis.js';

import ParametresProjet from './components/sections/ParametresProjet.jsx';
import Terrassement from './components/sections/Terrassement.jsx';
import Fondation from './components/sections/Fondation.jsx';
import Elevation from './components/sections/Elevation.jsx';
import Plancher from './components/sections/Plancher.jsx';
import Toiture from './components/sections/Toiture.jsx';
import Finition from './components/sections/Finition.jsx';
import { useExport } from './hooks/useExport.js';
import OuvragesSupplementaires from './components/sections/OuvragesSupplementaires.jsx';
import TableauDevis from './components/sections/TableauDevis.jsx';
import TableurDevis from './components/sections/TableurDevis.jsx';
import { generateWorkbookData } from './utils/univerAdapter.js';

import BandeauTotal from './components/ui/BandeauTotal.jsx';
import LegendeEtats from './components/ui/LegendeEtats.jsx';
import PanneauAvertissements from './components/ui/PanneauAvertissements.jsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.jsx';
import { formaterNombre } from './utils/format.js';

// ─── Icones par type de niveau ────────────────────────────────────────────────
const ICONES_TYPE = {
  terrassement: '⛏️',
  fondation:    '🧱',
  elevation:    '🏗️',
  plancher:     '🪟',
  toiture:      '🏠',
  finition:     '🎨',
};

// Types fixes : Toiture et Finition ne sont jamais supprimables.
const TYPES_FIXES = ['terrassement', 'fondation', 'toiture', 'finition'];

// ─── Composant principal ──────────────────────────────────────────────────────
function AppContent() {
  const [vueDevis, setVueDevis] = React.useState('particulier');
  const { exportPDF, exportExcel, exportJSON } = useExport();
  const {
    ongletActif, setOngletActif,
    niveaux, setNiveaux,
    niveauActifId, setNiveauActifId,
    defaultAcierHyp,
    taux, parametresProjet, bibliothequePrix
  } = useProjet();

  // `parametresProjet` doit être déstructuré avant ce useMemo — l'inverse est
  // une erreur de zone morte temporelle (ReferenceError) à chaque rendu.
  const infoProjet = React.useMemo(() => ({
    maitreOuvrage: parametresProjet?.maitreOuvrage || '',
    localisation:  parametresProjet?.localisation  || '',
    reference:     parametresProjet?.reference     || 'DF-2026',
  }), [parametresProjet]);

  // La sidebar remplace l'ancien onglet interne : on synchronise ongletActif
  // sur la route active, pour que le reste du composant (inchangé) continue
  // de lire cette même variable sans savoir qu'un routeur existe au-dessus.
  const { pathname } = useLocation();
  React.useEffect(() => {
    const parOnglet = { '/parametres': 'projet', '/metre': 'saisie', '/devis': 'editeur' };
    const cible = parOnglet[pathname];
    if (cible) setOngletActif(cible);
  }, [pathname, setOngletActif]);

  const { metreParNiveau, avertissementsGlobaux: avertissementsMetre, resumeParNiveau } = useMetre();
  const { devisParticulier, devisEntreprise, avertissementsDevis } = useDevis();

  const avertissementsGlobaux = [...avertissementsMetre, ...avertissementsDevis];

  const idx             = niveaux.findIndex(n => n.id === niveauActifId);
  const typeNiveauActif = niveaux[idx]?.type || '';

  const showTerrassement = typeNiveauActif === 'terrassement';
  const showFondation    = typeNiveauActif === 'fondation';
  const showElevation    = typeNiveauActif === 'elevation';
  const showPlancher     = typeNiveauActif === 'plancher';
  const showToiture      = typeNiveauActif === 'toiture';
  const showFinition     = typeNiveauActif === 'finition';

  // ── Ajouter un niveau (paire Elevation + Plancher avant Toiture) ──────────
  const ajouterNiveau = () => {
    const nextNum      = niveaux.filter(n => n.type === 'elevation').length + 1;
    const toitureIndex = niveaux.findIndex(n => n.type === 'toiture');

    const newElevation = {
      id: `elevation_${nextNum}`,
      nom: `Élévation Niv. ${nextNum}`,
      type: 'elevation',
      acierHyp: { ...defaultAcierHyp }
    };
    const newPlancher = {
      id: `plancher_${nextNum}`,
      nom: `Plancher Niv. ${nextNum}`,
      type: 'plancher',
      acierHyp: { ...defaultAcierHyp }
    };

    const newNiveaux = [...niveaux];
    newNiveaux.splice(toitureIndex, 0, newElevation, newPlancher);
    setNiveaux(newNiveaux);
    setNiveauActifId(newElevation.id);
  };

  // ── Supprimer une paire Elevation + Plancher d un etage ajouté ────────────
  const supprimerNiveau = (niveauId) => {
    const niveau = niveaux.find(n => n.id === niveauId);
    if (!niveau || TYPES_FIXES.includes(niveau.type)) return;

    // Supprimer la paire : si c est une elevation, chercher le plancher suivant et vice versa.
    let idsASupprimer = [niveauId];
    const i = niveaux.findIndex(n => n.id === niveauId);
    if (niveau.type === 'elevation') {
      const suivant = niveaux[i + 1];
      if (suivant && suivant.type === 'plancher') idsASupprimer.push(suivant.id);
    } else if (niveau.type === 'plancher') {
      const precedent = niveaux[i - 1];
      if (precedent && precedent.type === 'elevation') idsASupprimer.push(precedent.id);
    }

    const newNiveaux = niveaux.filter(n => !idsASupprimer.includes(n.id));
    setNiveaux(newNiveaux);

    // Repositionner sur le niveau precedent s il faut
    if (idsASupprimer.includes(niveauActifId)) {
      setNiveauActifId(newNiveaux[Math.max(0, i - 1)]?.id || newNiveaux[0]?.id);
    }
  };

  const getAvertissementsCountForNiveau = (id) =>
    avertissementsGlobaux.filter(a => a.niveauId === id).length;

  // ── Renommer un niveau ────────────────────────────────────────────────────
  const renommerNiveau = () => {
    const newNom = window.prompt('Nouveau nom pour cette étape :', niveaux[idx]?.nom);
    if (newNom && newNom.trim()) {
      const newNiveaux = [...niveaux];
      newNiveaux[idx] = { ...newNiveaux[idx], nom: newNom.trim() };
      setNiveaux(newNiveaux);
    }
  };

  return (
    <div className="pb-20">

      <main className="max-w-6xl mx-auto">

        {/* ── Paramètres ── */}
        {ongletActif === 'projet' && <ParametresProjet />}

        {/* ── Métré ── */}
        {ongletActif === 'saisie' && (
          <>
            <PanneauAvertissements
              avertissementsGlobaux={avertissementsGlobaux}
              niveaux={niveaux}
              setNiveauActifId={setNiveauActifId}
            />

            {/* ── Barre de navigation des étapes ── */}
            <nav aria-label="Étapes du chantier" className="mb-6">
              <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                {niveaux.map((niveau, index) => {
                  const isActive = niveauActifId === niveau.id;
                  const currentIdx = niveaux.findIndex(n => n.id === niveauActifId);
                  const isPassed  = currentIdx > index;
                  const warns     = getAvertissementsCountForNiveau(niveau.id);
                  const resume    = resumeParNiveau[niveau.id];
                  const estSupprimable = !TYPES_FIXES.includes(niveau.type) && niveau.type === 'elevation';

                  return (
                    <div key={niveau.id} className="relative shrink-0">
                      <button
                        onClick={() => setNiveauActifId(niveau.id)}
                        className={`
                          relative flex flex-col items-start gap-0.5
                          px-4 py-3 min-h-[56px] rounded-lg font-bold text-sm transition-all
                          ${isActive
                            ? 'bg-devis-saisie text-white shadow-md ring-2 ring-devis-saisie ring-offset-1'
                            : isPassed
                              ? 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                              : 'bg-white text-gray-600 border border-devis-border hover:bg-gray-50'}
                        `}
                        style={{ minWidth: '120px' }}
                      >
                        {/* Ligne 1 : icone + nom */}
                        <span className="flex items-center gap-1.5 whitespace-nowrap leading-tight">
                          {isPassed && <span className="text-xs">✓</span>}
                          <span>{ICONES_TYPE[niveau.type] || ''}</span>
                          <span>{niveau.nom}</span>
                        </span>
                        {/* Ligne 2 : total m3/m2 */}
                        {resume && (
                          <span className={`text-xs tabular-nums font-mono leading-none ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                            {formaterNombre(resume.valeur)} {resume.unite}
                            {resume.extra && ` ${resume.extra}`}
                          </span>
                        )}
                      </button>
                      {/* Badge avertissements */}
                      {warns > 0 && (
                        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full z-10 tabular-nums">
                          {warns > 9 ? '9+' : warns}
                        </span>
                      )}
                      {/* Bouton supprimer (Étage seulement) */}
                      {estSupprimable && !isActive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); supprimerNiveau(niveau.id); }}
                          className="absolute -top-2 -left-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full z-10 hover:bg-red-600 transition-colors"
                          title={`Supprimer ${niveau.nom} et son plancher`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Spacer */}
                <div className="flex-1 min-w-[12px]" />

                {/* Bouton ajouter un étage */}
                <button
                  onClick={ajouterNiveau}
                  className="shrink-0 px-4 py-3 min-h-[56px] rounded-lg font-bold text-sm bg-white border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 whitespace-nowrap transition-colors flex flex-col items-center justify-center gap-1"
                  title="Insérer un Étage (Élévation + Plancher) avant la Toiture"
                  style={{ minWidth: '100px' }}
                >
                  <span className="text-base">➕</span>
                  <span className="text-xs">Étage</span>
                </button>
              </div>

              {/* Fil d Ariane textuel — etape active + renommage */}
              <div className="flex items-baseline gap-3 mt-2 px-1">
                <h2 className="text-xl font-bold font-sans text-devis-calcule leading-tight">
                  {ICONES_TYPE[typeNiveauActif]} {niveaux[idx]?.nom}
                </h2>
                <button
                  onClick={renommerNiveau}
                  className="text-sm text-devis-saisie hover:underline font-normal min-h-[44px] px-1 leading-none"
                >
                  ✏️ Renommer
                </button>
              </div>
            </nav>

            {/* ── Formulaires de saisie ── */}
            {showTerrassement && <Terrassement />}
            {showFondation    && <Fondation />}
            {showElevation    && <Elevation />}
            {showPlancher     && <Plancher />}
            {showToiture      && <Toiture />}
            {showFinition     && <Finition />}

            <OuvragesSupplementaires />

            {/* ── Devis intégré sous le métré ── */}
            <section className="mt-10 pt-6 border-t-2 border-devis-border">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-sans text-xl font-bold text-devis-calcule">
                  Devis quantitatif et estimatif
                  <span className="ml-3 text-sm font-normal text-gray-500">mis à jour en direct</span>
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Switch Particulier / Entreprise */}
                  <div className="bg-gray-100 rounded-lg p-1 inline-flex">
                    {[
                      ['particulier', 'Particulier'],
                      ['entreprise',  'Entreprise'],
                    ].map(([cle, libelle]) => (
                      <button
                        key={cle}
                        onClick={() => setVueDevis(cle)}
                        className={`px-4 py-2 min-h-[44px] text-sm font-bold rounded transition-colors ${
                          vueDevis === cle ? 'bg-white shadow-sm text-devis-calcule' : 'text-gray-500 hover:text-devis-calcule'
                        }`}
                      >
                        {libelle}
                      </button>
                    ))}
                  </div>
                  {/* Boutons export */}
                  <button
                    onClick={() => exportExcel(
                      vueDevis === 'entreprise' ? devisEntreprise : devisParticulier,
                      vueDevis,
                      infoProjet
                    )}
                    className="px-3 py-2 min-h-[44px] text-sm font-bold bg-white border border-devis-border rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-devis-herite"
                    title="Exporter en Excel — une feuille par lot, formules visibles"
                  >
                    📊 Excel
                  </button>
                  <button
                    onClick={() => exportPDF(
                      vueDevis === 'entreprise' ? devisEntreprise : devisParticulier,
                      vueDevis,
                      infoProjet
                    )}
                    className="px-3 py-2 min-h-[44px] text-sm font-bold bg-devis-saisie text-white rounded hover:bg-blue-800 transition-colors flex items-center gap-1.5"
                    title="Exporter en PDF — bordereau BTP avec en-tête et montant en lettres"
                  >
                    📄 PDF
                  </button>
                </div>
              </div>

              <ErrorBoundary>
                <TableauDevis
                  devis={vueDevis === 'entreprise' ? devisEntreprise : devisParticulier}
                  type={vueDevis}
                />
              </ErrorBoundary>
            </section>
          </>
        )}

        {/* ── Éditeur de Devis ── */}
        {(ongletActif === 'editeur' || ongletActif === 'particulier' || ongletActif === 'entreprise') && (
          <section className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-sans text-2xl font-bold text-devis-calcule flex items-center gap-4">
                Éditeur de Devis
                <div className="bg-gray-100 rounded-lg p-1 inline-flex">
                  <button className="px-4 py-1 text-sm font-bold bg-white shadow-sm rounded text-devis-calcule">Mode Édition</button>
                  <button className="px-4 py-1 text-sm font-bold text-gray-500 hover:text-devis-calcule">Mode Aperçu</button>
                </div>
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-6 italic">Modifications libres, formules Excel et exports natifs.</p>
            <div className="bg-white rounded-lg shadow-sm border border-devis-border overflow-hidden">
              <ErrorBoundary>
                <TableurDevis
                  initialData={generateWorkbookData(devisParticulier, devisEntreprise, metreParNiveau, { taux, parametresProjet, bibliothequePrix })}
                />
              </ErrorBoundary>
            </div>
          </section>
        )}

      </main>

      <LegendeEtats />

      {/* ── Bandeau bas fixe — toujours présent sauf sur l onglet Paramètres ── */}
      {ongletActif !== 'projet' && (
        <BandeauTotal
          totalParticulier={devisParticulier?.total}
          totalEntreprise={devisEntreprise?.total}
          totalAvertissements={avertissementsGlobaux.length}
        />
      )}
    </div>
  );
}

// Entrées de menu sans page construite : un EmptyState honnête, jamais une
// page inventée. `NAVIGATION` reste la source unique des libellés/icônes.
const routesEnAttente = NAVIGATION.flatMap((section) => section.liens).filter(
  (lien) => !ROUTES_ACTIVES.has(lien.to),
);

export default function App() {
  return (
    <ProjetProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/metre" element={<AppContent />} />
            <Route path="/devis" element={<AppContent />} />
            <Route path="/parametres" element={<AppContent />} />

            {routesEnAttente.map((lien) => (
              <Route
                key={lien.to}
                path={lien.to}
                element={<EmptyState icone={lien.icone} titre={lien.label} texte="Bientôt disponible." />}
              />
            ))}
          </Route>
        </Routes>
      </BrowserRouter>
    </ProjetProvider>
  );
}
