import React from 'react';
import Icone from '../ui/Icone.jsx';
import { avancementDeLEtude } from '../../utils/offres.js';

/**
 * Le chemin d'une étude, de la saisie au document exporté.
 *
 * Il ne sert pas à décorer : il montre où le travail s'arrête aujourd'hui, et
 * donc à quoi sert la formule proposée juste en dessous. Les étapes cochées le
 * sont parce qu'elles sont réellement franchies — pas pour donner une
 * impression d'avancement.
 *
 * Sur petit écran la file défile horizontalement plutôt que de se replier :
 * un chemin qui passe à la ligne cesse de se lire comme un chemin.
 */
export default function ProgressionEtude({ droits = {} }) {
  const etapes = avancementDeLEtude(droits);
  const franchies = etapes.filter((e) => e.acquise).length;
  const premiereFermee = etapes.find((e) => !e.acquise);

  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-text/40">
          Votre étude avance
        </p>
        <p className="text-[12px] font-bold text-brand-text/45">
          {franchies} étape{franchies > 1 ? 's' : ''} sur {etapes.length}
        </p>
      </div>

      {/* Débordement volontaire jusqu'aux bords sur mobile : la file reste
          lisible d'un seul tenant au lieu d'être compressée. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max items-center gap-1.5">
          {etapes.map((etape, i) => (
            <li key={etape.id} className="flex shrink-0 items-center gap-1.5">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`h-px w-4 sm:w-6 ${etape.acquise ? 'bg-devis-herite/40' : 'bg-brand-text/15'}`}
                />
              )}
              <span
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold whitespace-nowrap',
                  etape.acquise
                    ? 'bg-devis-herite/10 text-devis-herite'
                    : 'bg-black/[0.04] text-brand-text/40',
                ].join(' ')}
              >
                <Icone nom={etape.acquise ? 'check-circle' : 'lock'} size={13} className="shrink-0" />
                {etape.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {premiereFermee && (
        <p className="mt-3 text-[13px] text-brand-text/60">
          Prochaine étape : <span className="font-bold text-brand-text">{premiereFermee.label}</span>.
        </p>
      )}
    </div>
  );
}
