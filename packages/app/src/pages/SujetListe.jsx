import React from 'react';
import { useNavigate } from 'react-router-dom';
import sujets from '../data/banque_qcm.json';
import Icone from '../components/ui/Icone.jsx';

export default function SujetListe() {
  const navigate = useNavigate();
  const totalQuestions = sujets.reduce((total, s) => total + s.questions.length, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Icone nom="book" size={28} className="text-brand-accent" />
          <h1 className="text-2xl font-bold text-brand-primary font-sans">Simulateur de Sujets Officiels</h1>
        </div>
        <p className="text-brand-text/80 font-serif">
          Entraînez-vous dans les conditions du concours : {sujets.length} sujets, {totalQuestions} questions au total (Métré et Devis, béton armé, RDM, topographie, VRD).
        </p>
      </div>

      {/* Liste des Sujets */}
      <div className="grid gap-4">
        {sujets.map((sujet, index) => {
          let storedState = null;
          try {
            storedState = JSON.parse(localStorage.getItem(`sujet_state_${sujet.id}`) || 'null');
          } catch (e) {
            console.error('Erreur parsing state pour', sujet.id);
            localStorage.removeItem(`sujet_state_${sujet.id}`);
          }
          let progressLabel = "Pas commencé";
          let isCompleted = false;

          if (storedState) {
            if (storedState.completed) {
              progressLabel = `Terminé : ${storedState.score} / ${sujet.questions.length}`;
              isCompleted = true;
            } else {
              progressLabel = `En cours : Q${storedState.currentQuestionIndex + 1}`;
            }
          }

          return (
            <button
              key={sujet.id}
              onClick={() => navigate(`/sujets/${sujet.id}`)}
              className="text-left w-full bg-white rounded-xl p-5 border border-brand-primary/10 hover:border-brand-primary hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden"
            >
              {/* Badge complété */}
              {isCompleted && (
                <div className="absolute top-0 right-0 bg-green-100 text-green-700 px-3 py-1 rounded-bl-lg text-xs font-bold uppercase">
                  Score : {storedState.score}/{sujet.questions.length}
                </div>
              )}

              {/* Numéro visuel */}
              <div className="shrink-0 flex items-center justify-center w-12 h-12 bg-brand-primary/5 text-brand-primary font-bold rounded-lg font-mono">
                #{index + 1}
              </div>

              {/* Infos Sujet */}
              <div className="flex-1">
                <h3 className="font-bold text-brand-primary text-lg">{sujet.titre}</h3>
                <div className="mt-2 flex items-center gap-4 text-xs font-mono font-medium text-brand-text/50 uppercase">
                  <span className="flex items-center gap-1">
                    <Icone nom="list" size={14} />
                    {sujet.questions.length} QCM
                  </span>
                  <span className={`flex items-center gap-1 ${isCompleted ? 'text-green-600' : ''}`}>
                    <Icone nom={isCompleted ? 'check-circle' : 'arrow-right'} size={14} />
                    {progressLabel}
                  </span>
                </div>
              </div>

              {/* Bouton d'action */}
              <div className="shrink-0">
                <div className="flex items-center gap-2 text-brand-interactive font-bold text-sm bg-brand-interactive/10 px-4 py-2 rounded-full hover:bg-brand-interactive hover:text-white transition-colors">
                  <Icone nom={isCompleted ? 'refresh' : 'play'} size={16} />
                  {isCompleted ? 'Refaire' : 'Démarrer'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
