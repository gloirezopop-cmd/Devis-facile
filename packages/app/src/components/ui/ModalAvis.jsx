import React, { useState } from 'react';
import Icone from './Icone.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ajouterAvis } from '../../utils/avisStore.js';

/**
 * Modale d'envoi d'avis et retours utilisateurs sur Devis Facile BTP.
 */
export default function ModalAvis({ isOpen, onClose, onAvisAjoute }) {
  const { user } = useAuth();
  const toast = useToast();

  const userEmailName = user?.email ? user.email.split('@')[0] : '';
  const [nom, setNom] = useState(user?.user_metadata?.prenom || userEmailName || '');
  const [profession, setProfession] = useState('');
  const [texte, setTexte] = useState('');
  const [etoiles, setEtoiles] = useState(5);
  const [survolEtoiles, setSurvolEtoiles] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!texte.trim()) {
      toast('Veuillez saisir votre avis ou commentaire.', 'erreur');
      return;
    }

    ajouterAvis({
      nom: nom.trim() || 'Utilisateur Devis Facile',
      profession: profession.trim() || 'Professionnel du BTP',
      texte: texte.trim(),
      etoiles,
    });

    toast('Merci pour votre avis ! Votre retour nous aide à améliorer le logiciel.');
    if (onAvisAjoute) onAvisAjoute();
    setTexte('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titre-modal-avis"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-brand-primary/10">
        <div className="flex items-center justify-between border-b border-black/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <Icone nom="message-square" size={20} />
            </div>
            <div>
              <h2 id="titre-modal-avis" className="font-sans text-[17px] font-extrabold text-brand-text">
                Donner votre avis
              </h2>
              <p className="text-[12px] text-brand-text/60">
                Aidez-nous à améliorer Devis Facile BTP
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-brand-text/50 hover:bg-black/5 hover:text-brand-text transition-colors"
            aria-label="Fermer"
          >
            <Icone nom="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Note sur 5 étoiles */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-text/50 mb-1.5">
              Votre note globale :
            </label>
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((valeur) => (
                <button
                  key={valeur}
                  type="button"
                  onClick={() => setEtoiles(valeur)}
                  onMouseEnter={() => setSurvolEtoiles(valeur)}
                  onMouseLeave={() => setSurvolEtoiles(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Icone
                    nom="star"
                    size={28}
                    className={(survolEtoiles || etoiles) >= valeur ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-brand-text/70">
                {etoiles} / 5
              </span>
            </div>
          </div>

          {/* Nom et Prénom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-nom-avis" className="block text-[11px] font-bold uppercase tracking-wider text-brand-text/50 mb-1">
                Votre nom ou prénom :
              </label>
              <input
                id="input-nom-avis"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Raphaël Z."
                className="w-full h-10 rounded-lg border border-brand-primary/20 bg-brand-bg px-3 text-[13px] font-bold text-brand-text focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="input-profession-avis" className="block text-[11px] font-bold uppercase tracking-wider text-brand-text/50 mb-1">
                Votre profession / rôle :
              </label>
              <input
                id="input-profession-avis"
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="Ex: Entrepreneur, Architecte…"
                className="w-full h-10 rounded-lg border border-brand-primary/20 bg-brand-bg px-3 text-[13px] text-brand-text focus:border-brand-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Avis textuel */}
          <div>
            <label htmlFor="textarea-avis" className="block text-[11px] font-bold uppercase tracking-wider text-brand-text/50 mb-1">
              Votre avis / suggestions d'amélioration :
            </label>
            <textarea
              id="textarea-avis"
              rows={4}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Dites-nous ce que vous appréciez dans l'application ou les fonctionnalités que vous aimeriez voir ajoutées..."
              className="w-full rounded-lg border border-brand-primary/20 bg-brand-bg p-3 text-[13px] text-brand-text placeholder:text-brand-text/40 focus:border-brand-primary focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-black/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-brand-primary/20 px-4 text-[13px] font-bold text-brand-text hover:bg-black/5 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-brand-primary px-5 text-[13px] font-extrabold text-white hover:bg-brand-primary-dark transition-colors flex items-center gap-2"
            >
              <Icone nom="send" size={15} />
              Envoyer mon avis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
