import React, { useState, useEffect } from 'react';
import SectionLanding, { GrilleLanding } from './SectionLanding.jsx';
import Icone from '../ui/Icone.jsx';
import ModalAvis from '../ui/ModalAvis.jsx';
import { obtenirTousLesAvis } from '../../utils/avisStore.js';

export default function SectionAvis() {
  const [listeAvis, setListeAvis] = useState([]);
  const [modalOuverte, setModalOuverte] = useState(false);

  const recharger = () => {
    setListeAvis(obtenirTousLesAvis());
  };

  useEffect(() => {
    recharger();
  }, []);

  return (
    <SectionLanding
      id="avis"
      fond="sombre"
      surtitre="Témoignages & Avis"
      titre="Ce qu me disent nos utilisateurs"
      chapeau="Découvrez pourquoi les professionnels et particuliers font confiance à Devis Facile BTP au quotidien."
    >
      <div className="mb-8 flex justify-center">
        <button
          type="button"
          onClick={() => setModalOuverte(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-accent px-6 py-3 text-sm font-extrabold text-white shadow-lg hover:scale-105 transition-all"
        >
          <Icone nom="message-square" size={18} />
          Donner votre avis sur le logiciel
        </button>
      </div>

      <GrilleLanding>
        {listeAvis.map((temoignage, i) => (
          <div key={temoignage.id || i} className="flex flex-col rounded-2xl bg-white p-8 shadow-sm border border-brand-primary/10 transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center gap-1 mb-4 text-amber-400">
              {[...Array(temoignage.etoiles || 5)].map((_, j) => (
                <Icone key={j} nom="star" size={18} fill="currentColor" className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-[14.5px] leading-relaxed text-brand-text/75 italic flex-grow mb-6">
              "{temoignage.texte}"
            </p>
            <div className="mt-auto border-t border-brand-primary/10 pt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                  {temoignage.nom ? temoignage.nom.charAt(0) : 'U'}
                </div>
                <div>
                  <div className="font-bold text-[14px] text-brand-text">{temoignage.nom}</div>
                  <div className="text-[12.5px] text-brand-text/60">{temoignage.profession}</div>
                </div>
              </div>
              {temoignage.date && (
                <span className="text-[11px] text-brand-text/40">{temoignage.date}</span>
              )}
            </div>
          </div>
        ))}
      </GrilleLanding>

      <ModalAvis
        isOpen={modalOuverte}
        onClose={() => setModalOuverte(false)}
        onAvisAjoute={recharger}
      />
    </SectionLanding>
  );
}
