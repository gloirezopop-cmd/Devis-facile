import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Ruban from './Ruban.jsx';
import MobileDrawer from './MobileDrawer.jsx';
import Header from './Header.jsx';
import RepriseProjet from '../projet/RepriseProjet.jsx';
import ModalAvis from '../ui/ModalAvis.jsx';
import Icone from '../ui/Icone.jsx';

/** Coquille de l'application : Ruban (ordinateur) + tiroir (mobile) + Header + contenu routé. */
export default function Layout() {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [modalAvisOuverte, setModalAvisOuverte] = useState(false);

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

      {/* Bouton d'avis flottant : accessible sur l'ensemble de la plateforme */}
      <button
        type="button"
        onClick={() => setModalAvisOuverte(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex min-h-[44px] items-center gap-2 rounded-full bg-brand-primary px-4 py-2.5 text-[12.5px] font-bold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-primary-dark hover:scale-105 active:scale-95 transition-all border border-white/20"
        title="Donner votre avis sur Devis Facile BTP"
        aria-label="Donner votre avis"
      >
        <Icone nom="message-square" size={17} />
        <span className="hidden sm:inline">Votre avis</span>
      </button>

      <ModalAvis
        isOpen={modalAvisOuverte}
        onClose={() => setModalAvisOuverte(false)}
      />
    </div>
  );
}

