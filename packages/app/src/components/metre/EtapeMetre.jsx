import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import { useMetre } from '../../hooks/useMetre.js';
import { ICONES_TYPE } from '../../config/niveaux.js';
import { formaterNombre } from '../../utils/format.js';

import PanneauAvertissements from '../ui/PanneauAvertissements.jsx';
import Terrassement from '../sections/Terrassement.jsx';
import Fondation from '../sections/Fondation.jsx';
import Elevation from '../sections/Elevation.jsx';
import Plancher from '../sections/Plancher.jsx';
import Toiture from '../sections/Toiture.jsx';
import Finition from '../sections/Finition.jsx';
import OuvragesSupplementaires from '../sections/OuvragesSupplementaires.jsx';

/**
 * Étape 3 — le métré lui-même. La structure (quels niveaux existent) a été
 * décidée à l'étape précédente : ici on ne fait que basculer entre les
 * niveaux déjà posés et remplir chacun. Le tableau technique quadrillé est
 * `ValeurCalculee`, déjà utilisé par chaque section — il montre la formule
 * appliquée, pas seulement le résultat, et ce comportement n'est pas touché.
 */
export default function EtapeMetre() {
  const { niveaux, niveauActifId, setNiveauActifId } = useProjet();
  const { avertissementsGlobaux, resumeParNiveau } = useMetre();

  const idx = niveaux.findIndex((n) => n.id === niveauActifId);
  const typeNiveauActif = niveaux[idx]?.type || '';

  return (
    <div>
      <PanneauAvertissements
        avertissementsGlobaux={avertissementsGlobaux}
        niveaux={niveaux}
        setNiveauActifId={setNiveauActifId}
      />

      <nav aria-label="Niveaux du chantier" className="mb-6">
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {niveaux.map((niveau, index) => {
            const isActive = niveauActifId === niveau.id;
            const resume = resumeParNiveau[niveau.id];
            const warns = avertissementsGlobaux.filter((a) => a.niveauId === niveau.id).length;

            return (
              <div key={niveau.id} className="relative shrink-0">
                <button
                  onClick={() => setNiveauActifId(niveau.id)}
                  style={{ minWidth: '120px' }}
                  className={`relative flex min-h-[56px] flex-col items-start gap-0.5 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-brand-primary text-white shadow-md'
                      : 'border border-brand-primary/10 bg-white text-brand-text/70 hover:bg-black/[0.02]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 whitespace-nowrap leading-tight">
                    <span>{ICONES_TYPE[niveau.type] || ''}</span>
                    <span>{niveau.nom}</span>
                  </span>
                  {resume && (
                    <span className={`font-mono text-xs leading-none tabular-nums ${isActive ? 'text-white/75' : 'text-brand-text/40'}`}>
                      {formaterNombre(resume.valeur)} {resume.unite}
                      {resume.extra && ` ${resume.extra}`}
                    </span>
                  )}
                </button>
                {warns > 0 && (
                  <span className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-white tabular-nums">
                    {warns > 9 ? '9+' : warns}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <h2 className="mt-3 font-sans text-lg font-bold leading-tight text-brand-text">
          {ICONES_TYPE[typeNiveauActif]} {niveaux[idx]?.nom}
        </h2>
      </nav>

      {typeNiveauActif === 'terrassement' && <Terrassement />}
      {typeNiveauActif === 'fondation' && <Fondation />}
      {typeNiveauActif === 'elevation' && <Elevation />}
      {typeNiveauActif === 'plancher' && <Plancher />}
      {typeNiveauActif === 'toiture' && <Toiture />}
      {typeNiveauActif === 'finition' && <Finition />}

      <OuvragesSupplementaires />
    </div>
  );
}
