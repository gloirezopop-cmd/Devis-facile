import React, { useEffect, useRef } from 'react';
import { ContenuNavigation } from './Sidebar.jsx';
import Icone from '../ui/Icone.jsx';

/** Tiroir de navigation mobile — ferme au clic extérieur et à la navigation. */
export default function MobileDrawer({ open, onClose }) {
  const panneauRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const surClicExterieur = (e) => {
      if (panneauRef.current && !panneauRef.current.contains(e.target)) onClose();
    };
    const surEchap = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', surClicExterieur);
    document.addEventListener('keydown', surEchap);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('mousedown', surClicExterieur);
      document.removeEventListener('keydown', surEchap);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-200 ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={panneauRef}
        className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-brand-primary shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Fermer le menu"
        >
          <Icone nom="x" size={20} />
        </button>
        <ContenuNavigation onNavigate={onClose} />
      </div>
    </div>
  );
}
