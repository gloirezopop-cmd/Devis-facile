import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { COURS_DATA } from '../data/cours';
import Icone from '../components/ui/Icone';
import { analyserContenuCours } from '../utils/coursFormat';

/**
 * Rendu pédagogique d'un chapitre : titres de sous-section, données et
 * formules mises en évidence (carte mono), légendes de schéma en retrait,
 * notes de correction Devis Facile BTP en évidence — au lieu du texte brut
 * du .docx affiché tel quel.
 */
function ContenuChapitre({ contenu }) {
  const blocs = analyserContenuCours(contenu);

  return (
    <div className="space-y-3">
      {blocs.map((b, i) => {
        if (b.type === 'titre') {
          return (
            <h3 key={i} className="mt-7 mb-1 font-sans text-[15px] font-bold text-brand-primary first:mt-0">
              {b.texte}
            </h3>
          );
        }
        if (b.type === 'lead') {
          return (
            <p key={i} className="mt-3 text-[11.5px] font-bold uppercase tracking-wider text-brand-text/45">
              {b.texte}
            </p>
          );
        }
        if (b.type === 'figure') {
          return (
            <p key={i} className="border-l-2 border-brand-primary/20 pl-3 text-[12.5px] italic text-brand-text/50">
              {b.texte}
            </p>
          );
        }
        if (b.type === 'note') {
          return (
            <div key={i} className="rounded-lg border border-devis-averifier/25 bg-devis-averifier/[0.06] px-4 py-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-devis-averifier">
                Note Devis Facile BTP
              </p>
              <p className="text-[13.5px] leading-relaxed text-brand-text/80">{b.texte}</p>
            </div>
          );
        }
        if (b.type === 'formule') {
          return (
            <div key={i} className="rounded-lg bg-black/[0.025] px-4 py-2.5 font-mono text-[12.5px] leading-relaxed text-brand-text/85">
              {b.lignes.map((ligne, j) => (
                <div key={j}>{ligne}</div>
              ))}
            </div>
          );
        }
        if (b.type === 'liste') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 text-[14px] leading-relaxed text-brand-text/80">
              {b.lignes.map((ligne, j) => (
                <li key={j}>{ligne.replace(/^[a-z]\)\s*/, '').replace(/\s*;$/, '')}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[14px] leading-relaxed text-brand-text/80">
            {b.texte}
          </p>
        );
      })}
    </div>
  );
}

export default function CoursLecture() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const chapitreId = parseInt(id, 10);
  const chapitre = COURS_DATA.find(c => c.id === chapitreId);
  
  if (!chapitre) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Chapitre introuvable</h2>
        <button onClick={() => navigate('/apprendre')} className="text-brand-interactive hover:underline">
          Retour à la liste des cours
        </button>
      </div>
    );
  }

  const prevId = chapitreId > 1 ? chapitreId - 1 : null;
  const nextId = chapitreId < COURS_DATA.length ? chapitreId + 1 : null;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <button 
        onClick={() => navigate('/apprendre')}
        className="mb-8 flex items-center text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
      >
        <Icone nom="arrow-left" size={16} className="mr-2" />
        Retour à l'apprentissage
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 p-6 md:p-8">
          <span className="text-sm font-bold text-brand-primary uppercase tracking-widest mb-2 block">
            Chapitre {chapitre.id} sur {COURS_DATA.length}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
            {chapitre.title}
          </h1>
        </div>
        
        <div className="p-6 md:p-8">
          <ContenuChapitre contenu={chapitre.content} />
        </div>
        
        <div className="bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-between">
          {prevId ? (
            <button 
              onClick={() => navigate(`/apprendre/cours/${prevId}`)}
              className="flex items-center text-gray-600 hover:text-brand-interactive font-medium"
            >
              <Icone nom="chevron-left" size={20} className="mr-1" />
              Chapitre {prevId}
            </button>
          ) : <div></div>}
          
          {nextId ? (
            <button 
              onClick={() => navigate(`/apprendre/cours/${nextId}`)}
              className="flex items-center text-gray-600 hover:text-brand-interactive font-medium"
            >
              Chapitre {nextId}
              <Icone nom="chevron-right" size={20} className="ml-1" />
            </button>
          ) : (
            <button 
              onClick={() => navigate('/apprendre')}
              className="flex items-center text-brand-primary font-bold"
            >
              Terminer
              <Icone nom="check" size={20} className="ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
