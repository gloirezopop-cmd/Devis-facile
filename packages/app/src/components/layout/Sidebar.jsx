import React from 'react';
import { NavLink } from 'react-router-dom';
import Icone from '../ui/Icone.jsx';
import { NAVIGATION } from './navigation.js';

/**
 * Navigation principale. Rendue deux fois : fixe sur ordinateur (Sidebar),
 * dans un tiroir sur mobile (MobileDrawer) — ce composant est le contenu
 * partagé par les deux, `onNavigate` ferme le tiroir au clic côté mobile.
 */
export function ContenuNavigation({ onNavigate, planLabel = 'PLAN GRATUIT' }) {
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
        {NAVIGATION.map((section) => (
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
                      `flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[40px] text-[13.5px] font-medium transition-colors ${
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

      {/* Repères d'angle en croix, comme un calage de plan — signature discrète. */}
      <div className="relative mx-3 mb-4 rounded-lg border border-white/15 bg-white/[0.04] p-4">
        <span className="absolute -top-px -left-px h-2 w-2 border-t border-l border-brand-accent/60" />
        <span className="absolute -top-px -right-px h-2 w-2 border-t border-r border-brand-accent/60" />
        <span className="absolute -bottom-px -left-px h-2 w-2 border-b border-l border-brand-accent/60" />
        <span className="absolute -bottom-px -right-px h-2 w-2 border-b border-r border-brand-accent/60" />

        <p className="font-mono text-[10px] font-bold tracking-wider text-brand-accent">{planLabel}</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-white/75">
          1 métré disponible<br />1 devis disponible
        </p>
        <NavLink
          to="/abonnement"
          onClick={onNavigate}
          className="mt-3 inline-flex min-h-[36px] items-center rounded-md bg-brand-accent px-3 text-[12.5px] font-bold text-brand-primary-dark transition-transform hover:scale-[1.02]"
        >
          Passer à PRO
        </NavLink>
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
