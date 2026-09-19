import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import Icone from '../ui/Icone.jsx';
import { NAVIGATION, sectionAdministration } from './navigation.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEstAdmin } from '../../hooks/useEstAdmin.js';
import { useEstFondateur } from '../../hooks/useEstFondateur.js';
import { effacerEtatLocal } from '../../utils/brouillon.js';

/**
 * ContenuNavigation : partagé entre le Ruban (desktop) et MobileDrawer (mobile).
 * Exporté ici car Sidebar.jsx a été supprimé lors du passage au Ruban.
 */
export function ContenuNavigation({ onNavigate }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const estAdmin = useEstAdmin();
  const estFondateur = useEstFondateur();
  const sections = estAdmin ? [...NAVIGATION, sectionAdministration(estFondateur)] : NAVIGATION;

  const handleAuthAction = async () => {
    if (session) { await signOut(); navigate('/login'); }
    else navigate('/login');
    if (onNavigate) onNavigate();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-accent text-brand-primary-dark font-bold text-sm">DF</span>
          <span className="font-sans text-[15px] font-bold tracking-tight text-white">DEVIS FACILE</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.titre} className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">{section.titre}</p>
            <ul className="space-y-0.5">
              {section.liens.map((lien) => (
                <li key={lien.to}>
                  <NavLink
                    to={lien.to}
                    end={lien.exact}
                    onClick={(e) => {
                      if (lien.label.toLowerCase().includes('nouveau')) {
                        const ok = window.confirm("Commencer un nouveau projet effacera le travail en cours non sauvegardé. Continuer ?");
                        if (!ok) { e.preventDefault(); return; }
                        effacerEtatLocal();
                        window.location.href = lien.to;
                        return;
                      }
                      if (onNavigate) onNavigate();
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] text-[13.5px] font-medium transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icone nom={lien.icone} size={17} className="shrink-0" />
                    <span className="truncate">{lien.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleAuthAction}
          className="flex w-full items-center justify-center gap-2 min-h-[44px] rounded-md border border-white/15 px-3 text-[13.5px] font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Icone nom={session ? 'log-out' : 'log-in'} size={17} />
          {session ? 'Se déconnecter' : 'Se connecter'}
        </button>
      </div>
    </div>
  );
}

/**
 * Ruban : navigation horizontale style AutoCAD/Revit pour les écrans desktop.
 * Caché sur mobile (le MobileDrawer prend le relais).
 */
export default function Ruban() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const estAdmin = useEstAdmin();
  const estFondateur = useEstFondateur();

  const sections = estAdmin ? [...NAVIGATION, sectionAdministration(estFondateur)] : NAVIGATION;

  const getOngletActif = () => {
    const section = sections.find(s => s.liens.some(l => l.to === location.pathname));
    return section ? section.titre : sections[0].titre;
  };

  const [ongletActif, setOngletActif] = useState(getOngletActif());

  useEffect(() => {
    const section = sections.find(s => s.liens.some(l => l.to === location.pathname));
    if (section) setOngletActif(section.titre);
  }, [location.pathname]);

  const sectionActive = sections.find(s => s.titre === ongletActif) || sections[0];

  const handleAuthAction = async () => {
    if (session) { await signOut(); navigate('/login'); }
    else navigate('/login');
  };

  return (
    /* Visible dès la tablette (md), caché sur mobile */
    <div className="hidden md:flex flex-col border-b border-brand-primary/10 bg-white shadow-sm z-20">
      {/* Barre des onglets — titre + sections + actions */}
      <div className="flex items-center px-2 bg-brand-primary text-white">
        {/* Logo */}
        <div className="flex items-center px-3 py-1.5 mr-2 border-r border-white/20 shrink-0">
          <span className="grid h-6 w-6 place-items-center rounded bg-brand-accent text-brand-primary-dark font-bold text-[11px] mr-2">DF</span>
          <span className="font-sans text-[13px] font-bold tracking-tight text-white uppercase hidden lg:block">Devis Facile</span>
        </div>

        {/* Onglets */}
        <div className="flex overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.titre}
              onClick={() => setOngletActif(section.titre)}
              className={`px-3 lg:px-4 py-1.5 text-[11px] lg:text-[12px] uppercase tracking-wider font-medium transition-colors border-b-2 whitespace-nowrap ${
                ongletActif === section.titre
                  ? 'border-white bg-white/10 text-white'
                  : 'border-transparent text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {section.titre}
            </button>
          ))}
        </div>

        {/* Recherche + Profil */}
        <div className="ml-auto flex items-center gap-1 pl-2 border-l border-white/20">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = e.target.elements.q.value.trim().toLowerCase();
              if (!q) return;
              const tous = sections.flatMap(s => s.liens);
              const trouve = tous.find(l => l.label.toLowerCase().includes(q));
              if (trouve) { navigate(trouve.to); e.target.reset(); }
            }}
            className="relative hidden lg:block mr-1"
          >
            <Icone nom="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              name="q"
              type="search"
              placeholder="Rechercher…"
              className="h-7 w-36 rounded bg-white/10 border border-white/20 pl-7 pr-3 text-[12px] text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20"
            />
          </form>
          <button
            onClick={() => navigate('/profil')}
            className="grid h-7 w-7 place-items-center rounded-full bg-brand-accent text-brand-primary-dark text-[10px] font-bold mx-1"
            aria-label="Mon profil"
          >
            DF
          </button>
        </div>
      </div>

      {/* Panneau de boutons */}
      <div className="flex items-center px-2 lg:px-4 py-1 lg:py-2 gap-1 lg:gap-2 bg-[#f8fafc] min-h-[58px] lg:min-h-[80px] overflow-x-auto">
        {sectionActive.liens.map((lien) => (
          <NavLink
            key={lien.to}
            to={lien.to}
            end={lien.exact}
            onClick={(e) => {
              if (lien.label.toLowerCase().includes('nouveau')) {
                const ok = window.confirm("Commencer un nouveau projet effacera le travail en cours non sauvegardé. Continuer ?");
                if (!ok) { e.preventDefault(); return; }
                effacerEtatLocal();
                window.location.href = lien.to;
              }
            }}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 shrink-0 rounded-md transition-colors border border-transparent
               w-[52px] h-[48px] md:w-[58px] md:h-[52px] lg:w-[78px] lg:h-[64px]
               ${isActive
                  ? 'bg-brand-primary/10 text-brand-primary font-bold border-brand-primary/20'
                  : 'text-brand-text/70 hover:bg-black/5 hover:text-brand-primary hover:border-black/5'
              }`
            }
          >
            <Icone nom={lien.icone} size={20} strokeWidth={1.5} className="md:hidden" />
            <Icone nom={lien.icone} size={24} strokeWidth={1.5} className="hidden md:block" />
            <span className="text-[9px] md:text-[10px] text-center leading-tight px-0.5 font-medium line-clamp-2">{lien.label}</span>
          </NavLink>
        ))}

        <div className="ml-auto flex items-center border-l border-brand-primary/10 pl-2 lg:pl-3">
          <button
            onClick={handleAuthAction}
            className="flex flex-col items-center justify-center gap-1 shrink-0 rounded-md text-brand-text/60 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-100
                       w-[52px] h-[48px] md:w-[58px] md:h-[52px] lg:w-[78px] lg:h-[64px]"
          >
            <Icone nom={session ? 'log-out' : 'log-in'} size={20} strokeWidth={1.5} className="md:hidden" />
            <Icone nom={session ? 'log-out' : 'log-in'} size={24} strokeWidth={1.5} className="hidden md:block" />
            <span className="text-[9px] md:text-[10px] text-center leading-tight font-medium">
              {session ? 'Déco.' : 'Connexion'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
