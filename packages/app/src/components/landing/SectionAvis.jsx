import React from 'react';
import SectionLanding, { GrilleLanding } from './SectionLanding.jsx';
import Icone from '../ui/Icone.jsx';

export default function SectionAvis() {
  const avis = [
    {
      nom: 'Jean-Marc D.',
      profession: 'Entrepreneur BTP',
      texte: "Avant, je passais des soirées entières sur Excel pour chiffrer mes chantiers. Aujourd'hui, Devis Facile me fait gagner un temps précieux et mes devis sont impeccables. Mes clients adorent la clarté.",
      etoiles: 5,
    },
    {
      nom: 'Alain K.',
      profession: 'Architecte',
      texte: "La fiabilité du moteur de calcul m'a convaincu. Les sous-totaux par lots et la note de calcul détaillée me permettent de rassurer mes clients sur la transparence des prix. C'est un outil indispensable.",
      etoiles: 5,
    },
    {
      nom: 'Franck M.',
      profession: 'Maître d\'œuvre',
      texte: "Je génère mes devis directement sur le chantier depuis ma tablette. L'export PDF est propre, pro, et l'interface est si intuitive qu'on n'a même pas besoin de formation pour la prendre en main.",
      etoiles: 5,
    },
  ];

  return (
    <SectionLanding
      id="avis"
      fond="sombre"
      surtitre="Témoignages"
      titre="Ce qu'ils en pensent"
      chapeau="Découvrez pourquoi des centaines de professionnels du bâtiment font confiance à Devis Facile au quotidien."
    >
      <GrilleLanding>
        {avis.map((temoignage, i) => (
          <div key={i} className="flex flex-col rounded-2xl bg-white p-8 shadow-sm border border-brand-primary/10 transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center gap-1 mb-4 text-brand-accent">
              {[...Array(temoignage.etoiles)].map((_, j) => (
                <Icone key={j} nom="star" size={18} fill="currentColor" />
              ))}
            </div>
            <p className="text-[14.5px] leading-relaxed text-brand-text/75 italic flex-grow mb-6">
              "{temoignage.texte}"
            </p>
            <div className="mt-auto border-t border-brand-primary/10 pt-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                {temoignage.nom.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-[14px] text-brand-text">{temoignage.nom}</div>
                <div className="text-[12.5px] text-brand-text/60">{temoignage.profession}</div>
              </div>
            </div>
          </div>
        ))}
      </GrilleLanding>
    </SectionLanding>
  );
}
