import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icone from '../ui/Icone.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { NAVIGATION } from './navigation.js';

const TOUS_LES_LIENS = NAVIGATION.flatMap((section) => section.liens);

/**
 * Barre supérieure : compacte, propre, jamais chargée.
 * Chaque bouton fait réellement quelque chose — la recherche saute vers
 * l'entrée de menu correspondante, les notifications et l'aide répondent
 * honnêtement plutôt que de rester des icônes mortes.
 */
export default function Header({ onOpenMenu, titre }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [recherche, setRecherche] = useState('');

  const lancerRecherche = (e) => {
    e.preventDefault();
    const q = recherche.trim().toLowerCase();
    if (!q) return;
    const trouve = TOUS_LES_LIENS.find((l) => l.label.toLowerCase().includes(q));
    if (trouve) {
      navigate(trouve.to);
      setRecherche('');
    } else {
      toast(`Aucune page ne correspond à « ${recherche} ».`, 'erreur');
    }
  };

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
        <form onSubmit={lancerRecherche} className="relative mr-2 hidden sm:block">
          <Icone nom="search" size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text/35" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher une page…"
            className="h-9 w-48 rounded-md border border-brand-primary/10 bg-white pl-8 pr-3 text-[13px] text-brand-text placeholder:text-brand-text/35 focus:border-brand-interactive focus:outline-none focus:ring-1 focus:ring-brand-interactive"
          />
        </form>

        <button
          onClick={() => toast('Aucune notification pour le moment.')}
          className="grid h-9 w-9 place-items-center rounded-md text-brand-text/60 hover:bg-black/5"
          aria-label="Notifications"
          title="Notifications"
        >
          <Icone nom="bell" size={18} />
        </button>
        <button
          onClick={() => navigate('/aide')}
          className="grid h-9 w-9 place-items-center rounded-md text-brand-text/60 hover:bg-black/5"
          aria-label="Aide"
          title="Centre d'aide"
        >
          <Icone nom="help-circle" size={18} />
        </button>

        <button
          onClick={() => navigate('/profil')}
          className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-brand-primary text-[12px] font-bold text-white"
          aria-label="Mon profil"
          title="Mon profil"
        >
          DF
        </button>
      </div>
    </header>
  );
}
