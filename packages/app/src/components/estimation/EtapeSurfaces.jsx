import React from 'react';
import Icone from '../ui/Icone.jsx';
import { formaterNombre } from '../../utils/format.js';
import { calculerSurfaceNiveau } from '../../utils/estimation.js';

/**
 * Tous les niveaux portent une surface — la fondation et la toiture comprises.
 * Ce sont de vrais ouvrages : les ignorer sous-estimerait le chantier.
 *
 * Chaque surface est saisie par l'utilisateur, niveau par niveau. Rien n'est
 * déduit d'une parcelle ni d'un pourcentage : on demande ce qu'il connaît de
 * son bâtiment, et le cumul se fait tout seul en dessous.
 */
function LigneSurfaceNiveau({ niveau, onChange }) {
  const mode = niveau.mode || 'surface';

  const appliquer = (champs) => {
    const patch = {
      mode,
      longueur: niveau.longueur,
      largeur: niveau.largeur,
      surfaceSaisie: niveau.surfaceSaisie,
      ...champs,
    };
    const { valeur, erreur } = calculerSurfaceNiveau({
      mode: patch.mode,
      surface: patch.surfaceSaisie,
      longueur: patch.longueur,
      largeur: patch.largeur,
    });
    onChange({ ...patch, surface: valeur, erreur });
  };

  return (
    <div className="rounded-xl border border-brand-primary/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-brand-text">{niveau.label}</h3>
        <div className="inline-flex rounded-lg bg-black/[0.04] p-1 text-[12px]">
          <button
            type="button"
            onClick={() => appliquer({ mode: 'surface' })}
            className={`px-3 py-1.5 rounded font-bold transition-colors ${mode === 'surface' ? 'bg-white text-brand-text shadow-sm' : 'text-brand-text/50'}`}
          >
            Surface
          </button>
          <button
            type="button"
            onClick={() => appliquer({ mode: 'dimensions' })}
            className={`px-3 py-1.5 rounded font-bold transition-colors ${mode === 'dimensions' ? 'bg-white text-brand-text shadow-sm' : 'text-brand-text/50'}`}
          >
            Longueur × largeur
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {mode === 'surface' ? (
          <Champ label="Surface" unite="m²" largeur="w-32">
            <input
              type="number" min="0" step="0.01" inputMode="decimal"
              value={niveau.surfaceSaisie ?? ''}
              onChange={(e) => appliquer({ surfaceSaisie: e.target.value })}
              placeholder="0"
              className="w-full min-h-[44px] rounded-md border border-brand-primary/20 px-3 text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </Champ>
        ) : (
          <>
            <Champ label="Longueur" unite="m" largeur="w-28">
              <input
                type="number" min="0" step="0.01" inputMode="decimal"
                value={niveau.longueur ?? ''}
                onChange={(e) => appliquer({ longueur: e.target.value })}
                className="w-full min-h-[44px] rounded-md border border-brand-primary/20 px-3 text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </Champ>
            <Champ label="Largeur" unite="m" largeur="w-28">
              <input
                type="number" min="0" step="0.01" inputMode="decimal"
                value={niveau.largeur ?? ''}
                onChange={(e) => appliquer({ largeur: e.target.value })}
                className="w-full min-h-[44px] rounded-md border border-brand-primary/20 px-3 text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </Champ>
          </>
        )}
      </div>

      {niveau.erreur ? (
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-red-600">
          <Icone nom="alert-circle" size={13} /> {niveau.erreur}
        </p>
      ) : niveau.surface > 0 ? (
        <p className="mt-2 text-[12.5px] text-brand-text/60">
          Surface retenue : <span className="font-mono font-bold text-brand-text">{formaterNombre(niveau.surface)} m²</span>
        </p>
      ) : null}
    </div>
  );
}

function Champ({ label, unite, largeur, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10.5px] font-bold uppercase tracking-wider text-brand-text/40">{label}</label>
      <div className={`flex items-center gap-2 ${largeur}`}>
        {children}
        <span className="text-[12px] font-bold text-brand-text/40">{unite}</span>
      </div>
    </div>
  );
}

export default function EtapeSurfaces({ niveaux, onChange, onReporter, surfaceTotale }) {
  const premiereSurface = niveaux.find((n) => Number(n.surface) > 0)?.surface;
  const restentAVide = niveaux.some((n) => !(Number(n.surface) > 0));
  const saisis = niveaux.filter((n) => Number(n.surface) > 0).length;

  return (
    <section>
      <h2 className="font-sans text-xl font-bold text-brand-text mb-1">La surface de chaque niveau</h2>
      <p className="text-[13.5px] text-brand-text/60 mb-6">
        Indiquez la surface de votre fondation, de votre rez-de-chaussée, de chaque étage, puis de votre
        toiture ou terrasse. Le cumul se fait tout seul en bas de l'écran.
      </p>

      <div className="space-y-4">
        {niveaux.map((n) => (
          <LigneSurfaceNiveau key={n.id} niveau={n} onChange={(patch) => onChange(n.id, patch)} />
        ))}
      </div>

      {/* Beaucoup de bâtiments ont la même emprise partout. Le report évite de
          retaper le même nombre, sans jamais écraser une surface déjà donnée. */}
      {premiereSurface > 0 && restentAVide && (
        <button
          type="button"
          onClick={() => onReporter(premiereSurface)}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border-2 border-brand-primary/15 px-4 text-[13px] font-bold text-brand-text hover:border-brand-primary/40"
        >
          <Icone nom="files" size={15} />
          Appliquer {formaterNombre(premiereSurface)} m² aux niveaux non renseignés
        </button>
      )}

      <div className="mt-6 rounded-xl bg-brand-primary/5 border border-brand-primary/10 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold uppercase tracking-wide text-brand-primary">Surface totale cumulée</span>
          <span className="font-mono text-xl font-bold text-brand-primary">{formaterNombre(surfaceTotale)} m²</span>
        </div>
        <p className="mt-1.5 text-[12px] text-brand-text/55">
          {saisis} surface{saisis > 1 ? 's' : ''} sur {niveaux.length} renseignée{saisis > 1 ? 's' : ''} :
          {' '}fondation, rez-de-chaussée, étages, toiture ou terrasse.
        </p>
      </div>
    </section>
  );
}
