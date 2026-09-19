import React from 'react';
import SectionLanding from './SectionLanding.jsx';
import Icone from '../ui/Icone.jsx';

export default function SectionStatistiques() {
  const stats = [
    {
      valeur: '12 500+',
      label: 'Devis générés',
      icone: 'file-text',
    },
    {
      valeur: '3 200+',
      label: 'Professionnels inscrits',
      icone: 'users',
    },
    {
      valeur: '98%',
      label: 'de clients satisfaits',
      icone: 'check-circle',
    },
  ];

  return (
    <div className="bg-brand-primary py-12 sm:py-16 mt-16 sm:mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center p-6 rounded-2xl bg-white/10 border border-white/20 shadow-lg transform transition duration-500 hover:scale-105">
              <div className="p-3 bg-brand-accent rounded-full mb-4 shadow-md">
                <Icone nom={stat.icone} size={28} className="text-white" />
              </div>
              <div className="text-4xl font-extrabold text-white tracking-tight mb-2">
                {stat.valeur}
              </div>
              <div className="text-[15px] font-medium text-white/80 uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
