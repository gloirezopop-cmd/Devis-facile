import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Ruban from './Ruban.jsx';
import MobileDrawer from './MobileDrawer.jsx';
import Header from './Header.jsx';
import RepriseProjet from '../projet/RepriseProjet.jsx';

/** Coquille de l'application : Ruban (ordinateur) + tiroir (mobile) + Header + contenu routé. */
export default function Layout() {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <div className="flex min-h-screen bg-brand-bg text-brand-text flex-col">
      {/* Posé ici plutôt que dans une page : la question vaut pour tout
          l'espace connecté, quel que soit l'écran d'arrivée. */}
      <RepriseProjet />

      <MobileDrawer open={menuOuvert} onClose={() => setMenuOuvert(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMenu={() => setMenuOuvert(true)} />
        <Ruban />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="mx-auto max-w-7xl w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
