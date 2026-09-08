import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Stepper from '../components/ui/Stepper.jsx';
import Icone from '../components/ui/Icone.jsx';
import { useEstimationSession } from '../hooks/useEstimationSession.js';
import { useEstimationData } from '../hooks/useEstimationData.js';
import EtapePays from '../components/estimation/EtapePays.jsx';
import EtapeLocalisation from '../components/estimation/EtapeLocalisation.jsx';
import EtapeTypeConstruction from '../components/estimation/EtapeTypeConstruction.jsx';
import EtapeStanding from '../components/estimation/EtapeStanding.jsx';
import EtapeConfiguration from '../components/estimation/EtapeConfiguration.jsx';
import EtapeSurfaces from '../components/estimation/EtapeSurfaces.jsx';
import EtapeResultat from '../components/estimation/EtapeResultat.jsx';

const ETAPES = [
  { id: 'pays', label: 'Pays' },
  { id: 'localisation', label: 'Localisation' },
  { id: 'projet', label: 'Projet' },
  { id: 'standing', label: 'Standing' },
  { id: 'niveaux', label: 'Niveaux' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'resultat', label: 'Résultat' },
];
const DERNIERE_ETAPE = ETAPES.length;

/**
 * Assistant « Estimer le budget de ma construction ». Même patron que le
 * parcours de métré : l'étape courante vit dans l'URL (`?etape=N`), pour
 * survivre à un rafraîchissement et rester cliquable dans le Stepper — un
 * assistant qui empêcherait de revenir corriger un choix serait une
 * régression, pas une simplification.
 *
 * Aucun tarif n'est chargé ici : le calcul appartient au serveur.
 */
export default function EstimationBudget() {
  const [searchParams, setSearchParams] = useSearchParams();
  const etape = Math.min(DERNIERE_ETAPE, Math.max(1, Number(searchParams.get('etape')) || 1));
  const allerA = (numero) => setSearchParams({ etape: String(numero) }, { replace: false });

  const {
    session, surfaceTotale,
    setCountry, setLocation, setBuildingType, setStanding,
    setNombreEtages, setNiveau, reporterSurTous, setProjectId,
  } = useEstimationSession();

  const { countries, buildingTypes, standings, locations, chargement } =
    useEstimationData(session.country);

  const peutContinuer = {
    1: !!session.country,
    2: !!session.location,
    3: !!session.buildingType,
    4: !!session.standing,
    5: Number.isInteger(session.nombreEtages) && session.nombreEtages >= 0,
    6: session.levels.length > 0 && session.levels.every((n) => n.surface > 0),
    7: true,
  }[etape];

  // L'écran de résultat n'a pas la même forme que les étapes de saisie : il
  // porte soit un récapitulatif chiffré, soit les trois formules côte à côte.
  // Le garder dans la colonne étroite des questions écrasait les cartes.
  const surResultat = etape === DERNIERE_ETAPE;

  return (
    <div className={`pb-20 ${surResultat ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <div className="mb-4 flex items-center gap-2 text-brand-text/50">
        <Icone nom="calculator" size={18} />
        <h1 className="font-sans text-sm font-bold uppercase tracking-wider">Estimer le budget de ma construction</h1>
      </div>

      {/* Les listes de référence vivent en base, jamais dans le code. Si elles
          sont absentes, l'assistant le dit franchement au lieu d'afficher des
          étapes vides qui donneraient l'impression d'un parcours cassé. */}
      {!chargement && countries.length === 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-devis-averifier/30 bg-amber-50 p-5">
          <Icone nom="alert-circle" size={20} className="mt-0.5 shrink-0 text-devis-averifier" />
          <div>
            <p className="font-bold text-brand-text">Les données de référence ne sont pas encore disponibles.</p>
            <p className="mt-1 text-[13px] leading-relaxed text-brand-text/70">
              L'assistant a besoin des pays, localisations, types de construction et standings enregistrés dans
              la base pour fonctionner. Aucune de ces valeurs n'est écrite dans l'application elle-même.
            </p>
            <p className="mt-2 text-[12px] text-brand-text/50">
              Administrateur : exécutez <span className="font-mono">schema_estimation.sql</span> dans l'éditeur SQL
              de Supabase, puis rechargez cette page.
            </p>
          </div>
        </div>
      )}

      <Stepper etapes={ETAPES} etapeActive={etape} onChange={allerA} />

      <div className={surResultat ? '' : 'rounded-xl border border-brand-primary/10 bg-white p-6'}>
        {etape === 1 && <EtapePays countries={countries} value={session.country} onChange={setCountry} chargement={chargement} />}
        {etape === 2 && <EtapeLocalisation locations={locations} value={session.location} onChange={setLocation} />}
        {etape === 3 && <EtapeTypeConstruction buildingTypes={buildingTypes} value={session.buildingType} onChange={setBuildingType} />}
        {etape === 4 && <EtapeStanding standings={standings} value={session.standing} onChange={setStanding} />}
        {etape === 5 && <EtapeConfiguration value={session.nombreEtages} onChange={setNombreEtages} />}
        {etape === 6 && (
          <EtapeSurfaces
            niveaux={session.levels}
            onChange={setNiveau}
            onReporter={reporterSurTous}
            surfaceTotale={surfaceTotale}
          />
        )}
        {etape === 7 && (
          <EtapeResultat
            session={{ ...session, surfaceTotale }}
            setProjectId={setProjectId}
            countries={countries}
            locations={locations}
            buildingTypes={buildingTypes}
            standings={standings}
          />
        )}
      </div>

      {etape < DERNIERE_ETAPE && (
        <div className="mt-6 flex items-center justify-between">
          {etape === 1 ? (
            <Link to="/dashboard" className="flex min-h-[44px] items-center rounded-md px-4 text-[13.5px] font-bold text-brand-text/60 hover:bg-black/[0.03]">
              ← Annuler
            </Link>
          ) : (
            <button
              onClick={() => allerA(etape - 1)}
              className="min-h-[44px] rounded-md px-4 text-[13.5px] font-bold text-brand-text/60 hover:bg-black/[0.03]"
            >
              ← Étape précédente
            </button>
          )}

          <button
            onClick={() => allerA(etape + 1)}
            disabled={!peutContinuer}
            className="min-h-[44px] rounded-md bg-brand-primary px-5 text-[13.5px] font-bold text-white hover:bg-brand-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {etape === DERNIERE_ETAPE - 1 ? 'Voir mon estimation →' : 'Suivant →'}
          </button>
        </div>
      )}

      {etape === DERNIERE_ETAPE && (
        <div className="mt-6">
          <button
            onClick={() => allerA(etape - 1)}
            className="min-h-[44px] rounded-md px-4 text-[13.5px] font-bold text-brand-text/60 hover:bg-black/[0.03]"
          >
            ← Modifier mon projet
          </button>
        </div>
      )}
    </div>
  );
}
