import React from 'react';
import Icone from '../ui/Icone.jsx';

/** Barre supérieure : compacte, propre, jamais chargée. */
export default function Header({ onOpenMenu, titre }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-brand-primary/10 bg-brand-bg/95 px-4 backdrop-blur">
      <button
        onClick={onOpenMenu}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-brand-text/70 hover:bg-black/5 lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Icone nom="menu" size={20} />
      </button>

      {titre && (
        <span className="hidden text-sm font-bold text-brand-text/80 sm:block lg:hidden">{titre}</span>
      )}

      <div className="ml-auto flex items-center gap-1">
        <div className="relative mr-2 hidden sm:block">
          <Icone nom="search" size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text/35" />
          <input
            type="search"
            placeholder="Rechercher…"
            className="h-9 w-48 rounded-md border border-brand-primary/10 bg-white pl-8 pr-3 text-[13px] text-brand-text placeholder:text-brand-text/35 focus:border-brand-interactive focus:outline-none focus:ring-1 focus:ring-brand-interactive"
          />
        </div>

        <button className="grid h-9 w-9 place-items-center rounded-md text-brand-text/60 hover:bg-black/5" aria-label="Notifications" title="Notifications">
          <Icone nom="bell" size={18} />
        </button>
        <button className="grid h-9 w-9 place-items-center rounded-md text-brand-text/60 hover:bg-black/5" aria-label="Aide" title="Aide">
          <Icone nom="help-circle" size={18} />
        </button>

        <div className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-brand-primary text-[12px] font-bold text-white">
          DF
        </div>
      </div>
    </header>
  );
}
