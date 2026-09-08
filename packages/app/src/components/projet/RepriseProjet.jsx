import React from 'react';
import Icone from '../ui/Icone.jsx';
import { useBrouillon } from '../../hooks/useBrouillon.js';

/**
 * La question posée à la connexion, quand un travail est resté en plan.
 *
 * Elle ne se pose qu'une fois, et seulement s'il y a réellement quelque chose
 * à reprendre. Les deux réponses sont présentées à égalité : reprendre n'est
 * pas « la bonne » réponse, et recommencer n'est pas un abandon — l'un et
 * l'autre sont des choix légitimes.
 *
 * Le bouton qui efface dit ce qu'il efface, et ce qu'il n'efface pas.
 *
 * Ce composant porte aussi l'enregistrement automatique du brouillon, par le
 * hook qu'il appelle. C'est voulu : monté dans le gabarit, il est présent sur
 * tout l'espace connecté, et il n'affiche rien tant qu'il n'y a rien à
 * demander. Un composant invisible séparé ferait le même travail avec un
 * fichier de plus.
 */
export default function RepriseProjet() {
  const { brouillon, question, occupe, continuer, recommencer, remettreAPlusTard } = useBrouillon();

  if (!question || !brouillon) return null;

  const quand = brouillon.updated_at
    ? new Date(brouillon.updated_at).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titre-reprise"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10">
          <Icone nom="folder" size={24} className="text-brand-primary" />
        </div>

        <h2 id="titre-reprise" className="mt-4 font-sans text-[20px] font-extrabold leading-tight tracking-tight text-brand-text">
          Vous avez un projet en cours.
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-brand-text/65">
          Votre travail a été conservé dans votre profil. Vous pouvez le reprendre là où vous l'aviez
          laissé, ou commencer un nouveau projet.
        </p>

        <div className="mt-5 rounded-xl bg-black/[0.03] p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-brand-text/40">
            Projet enregistré
          </div>
          <div className="mt-1 font-bold text-brand-text">{brouillon.resume || 'Projet en cours'}</div>
          {quand && <div className="mt-0.5 text-[12px] text-brand-text/50">Dernière modification : {quand}</div>}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={continuer}
            disabled={occupe}
            className="min-h-[50px] flex-1 rounded-xl bg-brand-primary px-5 text-[13.5px] font-extrabold text-white transition-colors hover:bg-brand-primary-dark focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/30 disabled:cursor-wait disabled:opacity-70"
          >
            Continuer ce projet
          </button>
          <button
            type="button"
            onClick={recommencer}
            disabled={occupe}
            className="min-h-[50px] flex-1 rounded-xl border-2 border-brand-primary/20 px-5 text-[13.5px] font-extrabold text-brand-text transition-colors hover:border-brand-primary hover:bg-brand-primary/[0.04] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25 disabled:cursor-wait disabled:opacity-70"
          >
            Commencer un nouveau projet
          </button>
        </div>

        {/* Ce qu'un « nouveau projet » emporte, et ce qu'il laisse. Le dire
            avant le clic vaut mieux que de le regretter après. */}
        <p className="mt-4 text-[12px] leading-relaxed text-brand-text/50">
          Commencer un nouveau projet vide les formulaires de saisie en cours. Les projets que vous avez
          enregistrés dans « Projets » ne sont pas touchés.
        </p>

        <button
          type="button"
          onClick={remettreAPlusTard}
          disabled={occupe}
          className="mt-3 min-h-[40px] w-full text-[12.5px] font-bold text-brand-text/45 hover:text-brand-text disabled:opacity-50"
        >
          Décider plus tard
        </button>
      </div>
    </div>
  );
}
