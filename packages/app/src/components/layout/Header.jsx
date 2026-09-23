import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icone from '../ui/Icone.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { NAVIGATION } from './navigation.js';

const TOUS_LES_LIENS = NAVIGATION.flatMap((section) => section.liens);

/**
 * Barre supérieure : visible sur TOUS les appareils.
 * - Mobile : hamburger + logo + actions essentielles
 * - Tablette/Desktop : complète avec recherche
 * Sur desktop, le Header est caché car le Ruban gère tout.
 */
export default function Header({ onOpenMenu, titre }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [recherche, setRecherche] = useState('');
  const [rechercheOuverte, setRechercheOuverte] = useState(false);

  const lancerRecherche = (e) => {
    e.preventDefault();
    const q = recherche.trim().toLowerCase();
    if (!q) return;
    const trouve = TOUS_LES_LIENS.find((l) => l.label.toLowerCase().includes(q));
    if (trouve) {
      navigate(trouve.to);
      setRecherche('');
      setRechercheOuverte(false);
    } else {
      toast(`Aucune page ne correspond à « ${recherche} ».`, 'erreur');
    }
  };

  return (
    /* Caché sur desktop car le Ruban prend tout en charge */
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-brand-primary/10 bg-brand-bg/95 px-3 backdrop-blur lg:hidden">

      {/* Hamburger — mobile et tablette uniquement */}
      <button
        onClick={onOpenMenu}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-brand-text/70 hover:bg-black/5"
        aria-label="Ouvrir le menu"
      >
        <Icone nom="menu" size={22} />
      </button>

      {/* Logo / Titre de l'app */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-0.5 shadow-sm border border-brand-primary/10 overflow-hidden shrink-0">
          <img src="/logo.png" alt="Logo Devis Facile BTP" className="w-full h-full object-contain" />
        </div>
        <span className="hidden sm:block font-bold text-[14px] text-brand-text tracking-tight">DEVIS FACILE</span>
      </div>

      {/* Zone droite : recherche + actions */}
      <div className="ml-auto flex items-center gap-1">

        {/* Recherche — pleine sur tablette, icône seule sur mobile */}
        {rechercheOuverte ? (
          <form onSubmit={lancerRecherche} className="flex items-center gap-1">
            <input
              autoFocus
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              onBlur={() => { if (!recherche) setRechercheOuverte(false); }}
              placeholder="Rechercher…"
              className="h-9 w-36 sm:w-48 rounded-md border border-brand-primary/15 bg-white pl-3 pr-3 text-[13px] text-brand-text placeholder:text-brand-text/35 focus:border-brand-interactive focus:outline-none focus:ring-1 focus:ring-brand-interactive"
            />
            <button type="button" onClick={() => { setRechercheOuverte(false); setRecherche(''); }}
              className="grid h-9 w-9 place-items-center rounded-md text-brand-text/60 hover:bg-black/5">
              <Icone nom="x" size={16} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setRechercheOuverte(true)}
            className="grid h-9 w-9 place-items-center rounded-md text-brand-text/60 hover:bg-black/5"
            aria-label="Rechercher"
          >
            <Icone nom="search" size={18} />
          </button>
        )}

        <button
          onClick={() => toast('Aucune notification pour le moment.')}
          className="grid h-9 w-9 place-items-center rounded-md text-brand-text/60 hover:bg-black/5"
          aria-label="Notifications"
        >
          <Icone nom="bell" size={18} />
        </button>

        <button
          onClick={() => navigate('/profil')}
          className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-brand-primary text-[11px] font-bold text-white"
          aria-label="Mon profil"
        >
          DF
        </button>
      </div>
    </header>
  );
}
