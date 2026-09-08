import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icone from '../components/ui/Icone';
import { COURS_DATA } from '../data/cours';

export default function Apprendre() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="bg-brand-primary rounded-xl p-8 text-white shadow-lg overflow-hidden relative">
        <div className="absolute -right-8 -top-8 text-brand-primary opacity-20 transform scale-150">
          <Icone nom="book" size={200} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold font-sans tracking-tight mb-2">Apprenez en pratiquant</h1>
          <p className="text-white/80 max-w-xl text-lg">
            Mémorisez les règles du métré, apprenez le vocabulaire du chantier et mettez en pratique vos connaissances avec le Moteur QCM.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Icone nom="book-open" className="mr-2 text-brand-interactive" />
            Bibliothèque du Cours
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {COURS_DATA.map((chapitre) => (
            <div 
              key={chapitre.id}
              onClick={() => navigate(`/apprendre/cours/${chapitre.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chapitre {chapitre.id}</span>
                <Icone nom="chevron-right" size={16} className="text-gray-300 group-hover:text-brand-interactive transition-colors" />
              </div>
              <h3 className="text-base font-bold text-gray-900 leading-tight flex-grow group-hover:text-brand-interactive transition-colors">
                {chapitre.title}
              </h3>
              <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                {chapitre.content.substring(0, 100)}...
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
