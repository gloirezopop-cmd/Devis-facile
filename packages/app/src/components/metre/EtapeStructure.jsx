import React from 'react';
import { useMetre } from '../../hooks/useMetre.js';
import { useNiveauxActions } from '../../hooks/useNiveauxActions.js';
import { ICONES_TYPE, TYPES_FIXES } from '../../config/niveaux.js';
import { formaterNombre } from '../../utils/format.js';
import Icone from '../ui/Icone.jsx';

/**
 * Étape 2 — la structure du chantier : quels niveaux le composent, avant
 * d'entrer dans le détail de chacun. Un immeuble R+4 a un terrassement, une
 * fondation, cinq paires élévation/plancher, une toiture, une finition —
 * c'est ici qu'on pose ces étages, pas pendant la saisie elle-même.
 */
export default function EtapeStructure({ onOuvrir }) {
  const { resumeParNiveau, avertissementsGlobaux } = useMetre();
  const { niveaux, ajouterNiveau, supprimerNiveau, renommerNiveau } = useNiveauxActions();

  const avertissementsPour = (id) => avertissementsGlobaux.filter((a) => a.niveauId === id).length;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-sans text-xl font-bold text-brand-text">Structure du chantier</h2>
          <p className="mt-1 text-[13.5px] text-brand-text/55">
            Un terrassement, une fondation, autant d'étages que le bâtiment en compte, une toiture, une finition.
          </p>
        </div>
        <button
          onClick={ajouterNiveau}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-md border border-dashed border-brand-primary/25 px-4 text-[13.5px] font-bold text-brand-primary hover:bg-brand-primary/5"
        >
          <Icone nom="folder" size={16} />
          Ajouter un étage
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {niveaux.map((niveau) => {
          const resume = resumeParNiveau[niveau.id];
          const warns = avertissementsPour(niveau.id);
          const supprimable = !TYPES_FIXES.includes(niveau.type);

          return (
            <div
              key={niveau.id}
              className="relative rounded-lg border border-brand-primary/10 bg-white p-4 transition-shadow hover:shadow-sm"
            >
              {supprimable && (
                <button
                  onClick={() => supprimerNiveau(niveau.id)}
                  title={`Supprimer ${niveau.nom} et son plancher`}
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-brand-text/30 hover:bg-red-50 hover:text-red-500"
                >
                  <Icone nom="x" size={14} />
                </button>
              )}

              <div className="flex items-center gap-2 pr-6">
                {ICONES_TYPE[niveau.type] && <span className="text-lg leading-none">{ICONES_TYPE[niveau.type]}</span>}
                <input
                  value={niveau.nom}
                  onChange={(e) => renommerNiveau(niveau.id, e.target.value)}
                  className="min-w-0 flex-1 rounded border-0 bg-transparent px-0 text-[14px] font-bold text-brand-text focus:bg-brand-bg focus:px-1.5 focus:outline-none"
                />
              </div>

              <p className="mt-2 font-mono text-[13px] tabular-nums text-brand-text/50">
                {resume ? `${formaterNombre(resume.valeur)} ${resume.unite}${resume.extra ? ` ${resume.extra}` : ''}` : '—'}
              </p>

              <div className="mt-3 flex items-center justify-between">
                {warns > 0 ? (
                  <span className="text-[12px] font-bold text-brand-accent">{warns} à vérifier</span>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => onOuvrir(niveau.id)}
                  className="text-[12.5px] font-bold text-brand-interactive hover:underline"
                >
                  Ouvrir →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
