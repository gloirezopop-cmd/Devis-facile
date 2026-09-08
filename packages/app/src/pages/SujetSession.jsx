import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import sujets from '../data/banque_qcm.json';
import Icone from '../components/ui/Icone.jsx';

export default function SujetSession() {
  const { sujetId } = useParams();
  const navigate = useNavigate();
  
  const sujet = sujets.find(s => s.id === sujetId);
  
  // Timer initial: 90 minutes = 5400 secondes
  const INITIAL_TIME = 90 * 60;
  
  const [selectedOptions, setSelectedOptions] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);

  // Reprise de progression
  useEffect(() => {
    if (!sujet) return;
    let state = null;
    try {
      state = JSON.parse(localStorage.getItem(`sujet_state_${sujetId}`) || 'null');
    } catch(e) {
      console.error('Erreur parsing state');
      localStorage.removeItem(`sujet_state_${sujetId}`);
    }
    if (state) {
      if (state.completed) {
        setIsFinished(true);
        setSelectedOptions(state.selectedOptions || {});
        setScore(state.score || 0);
        setTimeLeft(state.timeLeft || 0);
      } else {
        setSelectedOptions(state.selectedOptions || {});
        setTimeLeft(state.timeLeft !== undefined ? state.timeLeft : INITIAL_TIME);
      }
    }
  }, [sujet, sujetId]);

  // Sauvegarde régulière de l'état en cours
  useEffect(() => {
    if (!sujet || isFinished) return;
    localStorage.setItem(`sujet_state_${sujetId}`, JSON.stringify({
      completed: false,
      selectedOptions,
      timeLeft
    }));
  }, [selectedOptions, timeLeft, isFinished, sujet, sujetId]);

  // Chronomètre
  useEffect(() => {
    if (isFinished || !sujet) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(); // Soumission automatique à la fin du temps
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isFinished, sujet]);

  if (!sujet) {
    return (
      <div className="p-8 text-center text-brand-text">
        <h2>Sujet introuvable</h2>
        <button onClick={() => navigate('/sujets')} className="text-brand-interactive underline mt-4">Retour aux sujets</button>
      </div>
    );
  }

  const handleSelectOption = (questionId, optionId) => {
    if (isFinished) return;
    setSelectedOptions(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleSubmit = () => {
    // Calcul du score
    let calculatedScore = 0;
    sujet.questions.forEach(q => {
      if (selectedOptions[q.id] === q.bonneReponse) {
        calculatedScore++;
      }
    });
    
    setScore(calculatedScore);
    setIsFinished(true);
    
    // Sauvegarde finale
    localStorage.setItem(`sujet_state_${sujetId}`, JSON.stringify({
      completed: true,
      score: calculatedScore,
      selectedOptions,
      timeLeft
    }));
  };

  // Formatage du temps
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Header : Bouton retour et Chronomètre */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <button 
          onClick={() => navigate('/sujets')}
          className="text-brand-text/60 hover:text-brand-primary flex items-center gap-1 self-start"
        >
          <Icone nom="arrow-left" size={16} />
          <span className="text-sm font-bold uppercase">Retour aux sujets</span>
        </button>
      </div>

      {/* Titre Sujet */}
      <h1 className="text-2xl font-bold text-brand-primary font-sans uppercase mb-6">
        {sujet.titre}
      </h1>

      {/* Barre d'état (Chrono ou Résultat) */}
      {!isFinished ? (
        <div className="bg-[#0f172a] text-white p-4 rounded-xl flex items-center justify-between mb-8 shadow-md">
          <div className="flex items-center gap-2">
            <Icone nom="clock" size={24} className="text-brand-accent animate-pulse" />
            <span className="font-bold text-sm tracking-widest uppercase">Temps réglementaire :</span>
          </div>
          <div className="font-mono text-xl font-bold text-blue-300">
            {formatTime(timeLeft)}
          </div>
        </div>
      ) : (
        <div className="bg-brand-primary/5 border-2 border-brand-primary/10 rounded-xl p-8 text-center w-full mb-8">
          <div className="w-20 h-20 bg-brand-interactive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icone nom="award" size={40} className="text-brand-interactive" />
          </div>
          <div className="text-sm font-bold text-brand-primary uppercase tracking-wider mb-2">Votre Note</div>
          <div className="text-6xl font-mono font-bold text-brand-interactive">
            {Math.round((score / sujet.questions.length) * 20)} <span className="text-2xl text-brand-text/40">/ 20</span>
          </div>
          <div className="mt-4 text-brand-text font-serif">
            ({score} bonnes réponses sur {sujet.questions.length})
          </div>
          <button 
            onClick={() => {
              // Réinitialiser pour refaire l'épreuve
              setIsFinished(false);
              setSelectedOptions({});
              setTimeLeft(INITIAL_TIME);
              localStorage.removeItem(`sujet_state_${sujetId}`);
            }}
            className="mt-6 text-brand-interactive underline font-bold"
          >
            Refaire ce sujet
          </button>
        </div>
      )}

      {/* Liste de toutes les questions */}
      <div className="space-y-12">
        {sujet.questions.map((question, index) => {
          const answeredOption = selectedOptions[question.id];
          const isCorrect = answeredOption === question.bonneReponse;

          return (
            <div key={question.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-bold text-brand-primary font-sans flex gap-3">
                  <span className="shrink-0">{index + 1}.</span>
                  <span>{question.enonce}</span>
                </h2>
              </div>
              
              <div className="p-6 space-y-3">
                {question.options.map((opt) => {
                  const isSelected = answeredOption === opt.id;
                  const isThisOptionCorrect = opt.id === question.bonneReponse;
                  
                  // Styles pour le mode résultat
                  let resultBaseClass = "";
                  let resultIconClass = "";
                  
                  if (isFinished) {
                    if (isThisOptionCorrect) {
                      resultBaseClass = "border-green-500 bg-green-50 text-green-900";
                      resultIconClass = "border-green-500 bg-green-500 text-white";
                    } else if (isSelected) {
                      resultBaseClass = "border-red-400 bg-red-50 text-red-900";
                      resultIconClass = "border-red-400 bg-red-400 text-white";
                    } else {
                      resultBaseClass = "border-gray-200 opacity-50";
                      resultIconClass = "border-gray-300 text-transparent";
                    }
                  } else {
                    // Styles pour le mode examen (en cours)
                    if (isSelected) {
                      resultBaseClass = "border-brand-interactive bg-brand-interactive/5 text-brand-primary";
                      resultIconClass = "border-brand-interactive bg-brand-interactive text-white";
                    } else {
                      resultBaseClass = "border-gray-200 hover:border-brand-interactive/50 hover:bg-gray-50 cursor-pointer";
                      resultIconClass = "border-gray-300 text-transparent";
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(question.id, opt.id)}
                      disabled={isFinished}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-start ${isFinished ? 'cursor-default' : ''} ${resultBaseClass}`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${resultIconClass}`}>
                        {isFinished && isThisOptionCorrect && <Icone nom="check" size={13} />}
                        {isFinished && isSelected && !isThisOptionCorrect && <Icone nom="x" size={13} />}
                        {!isFinished && isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                      </div>
                      <div className="font-sans text-[15px] md:text-base leading-snug pt-0.5 flex-1">
                        <span className="font-bold mr-2 text-brand-text/50">{opt.id})</span>
                        {opt.texte}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Correction affichée uniquement si terminé */}
              {isFinished && (
                <div className={`p-6 border-t ${
                  isCorrect ? 'bg-green-100 border-green-200' : 'bg-red-50 border-red-100'
                }`}>
                  <div className="flex gap-4 items-start">
                    <Icone
                      nom={isCorrect ? 'check-circle' : 'alert-circle'}
                      size={24}
                      className={`shrink-0 mt-0.5 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}
                    />
                    <div>
                      <h3 className={`font-bold font-sans mb-1 ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                        {isCorrect ? 'Correct !' : `Incorrect. La bonne réponse était : ${question.bonneReponse}`}
                      </h3>
                      <p className="text-brand-text/90 font-serif leading-relaxed mt-2 text-sm">
                        {question.explication}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bouton de soumission en bas */}
      {!isFinished && (
        <div className="mt-12 mb-20 flex justify-center">
          <button
            onClick={handleSubmit}
            className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-10 py-5 rounded-xl font-bold font-sans text-lg md:text-xl transition-all shadow-lg flex items-center gap-3 w-full md:w-auto justify-center"
          >
            SOUMETTRE L'ÉPREUVE ET VOIR LA CORRECTION
            <Icone nom="file-text" size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
