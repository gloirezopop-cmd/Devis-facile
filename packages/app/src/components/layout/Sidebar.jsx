import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icone from '../ui/Icone.jsx';
import { NAVIGATION, sectionAdministration } from './navigation.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEstAdmin } from '../../hooks/useEstAdmin.js';
import { useEstFondateur } from '../../hooks/useEstFondateur.js';

/**
 * Navigation principale. Rendue deux fois : fixe sur ordinateur (Sidebar),
 * dans un tiroir sur mobile (MobileDrawer) — ce composant est le contenu
 * partagé par les deux, `onNavigate` ferme le tiroir au clic côté mobile.
 */
export function ContenuNavigation({ onNavigate }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const estAdmin = useEstAdmin();
  // Deux questions distinctes depuis qu'un investisseur est administrateur :
  // la section entière dépend de la première, le lien « Tarifs de référence »
  // de la seconde.
  const estFondateur = useEstFondateur();
  const sections = estAdmin ? [...NAVIGATION, sectionAdministration(estFondateur)] : NAVIGATION;

  const handleAuthAction = async () => {
    if (session) {
      await signOut();
      navigate('/login');
    } else {
      navigate('/login');
    }
    if (onNavigate) onNavigate();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-accent text-brand-primary-dark font-bold text-sm">
            DF
          </span>
          <span className="font-sans text-[15px] font-bold tracking-tight text-white">
            DEVIS FACILE
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.titre} className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
              {section.titre}
            </p>
            <ul className="space-y-0.5">
              {section.liens.map((lien) => (
                <li key={lien.to}>
                  <NavLink
                    to={lien.to}
                    end={lien.exact}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] text-[13.5px] font-medium transition-colors ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
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

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col bg-brand-primary sticky top-0 h-screen">
      <ContenuNavigation />
    </aside>
  );
}
