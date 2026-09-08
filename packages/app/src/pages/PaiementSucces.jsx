import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icone from '../components/ui/Icone.jsx';
import { useDroits } from '../hooks/useDroits.js';
import { statutDuCompte } from '../utils/offres.js';
import { tracer } from '../lib/estimationApi.js';

/**
 * Page de retour après un paiement, côté opérateur : « succès ».
 *
 * ELLE N'ACCORDE RIEN. Arriver sur cette adresse prouve seulement que
 * l'opérateur a renvoyé le navigateur ici — n'importe qui peut la taper dans
 * sa barre d'adresse. C'est le serveur qui enregistre l'abonnement, après
 * avoir vérifié la notification de l'opérateur.
 *
 * Cette page se contente donc de relire les droits réellement accordés et de
 * dire ce qu'elle voit : accès ouvert, ou confirmation encore attendue.
 */
export default function PaiementSucces() {
  const [params] = useSearchParams();
  const { droits, plans, abonnements, chargement, recharger } = useDroits();

  const reference = params.get('transaction_id') || params.get('reference') || params.get('token');
  const statut = statutDuCompte(abonnements, plans);
  const accesOuvert = statut !== 'FREE' && statut !== 'EXPIRED';

  useEffect(() => {
    tracer('payment_return', { issue: 'succes', reference, statut });
  }, [reference, statut]);

  // Le webhook confirme généralement en quelques secondes, parfois après que
  // ce navigateur soit déjà revenu ici. On resonde donc tout seul un moment
  // avant de laisser la main au bouton manuel — jamais l'inverse : cette
  // page ne décide toujours rien, elle ne fait que redemander plus souvent.
  useEffect(() => {
    if (chargement || accesOuvert) return;
    let tentatives = 0;
    const intervalle = setInterval(() => {
      tentatives += 1;
      if (tentatives > 20) {
        clearInterval(intervalle);
        return;
      }
      recharger();
    }, 3000);
    return () => clearInterval(intervalle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargement, accesOuvert]);

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-2xl border border-brand-primary/10 bg-white p-7 sm:p-9 text-center">
        {chargement ? (
          <p className="py-10 text-[13px] text-brand-text/40">Vérification de votre accès…</p>
        ) : accesOuvert ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-devis-herite/10">
              <Icone nom="check-circle" size={28} className="text-devis-herite" />
            </div>
            <h1 className="mt-5 font-sans text-[22px] font-extrabold tracking-tight text-brand-text">
              Votre accès est ouvert.
            </h1>
            <p className="mx-auto mt-2.5 max-w-md text-[13.5px] leading-relaxed text-brand-text/65">
              Le paiement a été confirmé par le serveur. Vos projets et vos saisies sont là où vous les
              avez laissés.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-devis-averifier/10">
              <Icone nom="clock" size={28} className="text-devis-averifier" />
            </div>
            <h1 className="mt-5 font-sans text-[22px] font-extrabold tracking-tight text-brand-text">
              Paiement en cours de vérification.
            </h1>
            <p className="mx-auto mt-2.5 max-w-md text-[13.5px] leading-relaxed text-brand-text/65">
              Votre opérateur nous a renvoyé ici, mais c'est notre serveur qui ouvre l'accès, une fois
              l'encaissement confirmé. Cela prend en général quelques secondes. Rien de ce que vous avez
              saisi n'est perdu pendant ce temps.
            </p>
            <button
              type="button"
              onClick={recharger}
              className="mt-6 min-h-[48px] rounded-xl border-2 border-brand-primary/20 px-5 text-[13.5px] font-bold text-brand-text hover:border-brand-primary hover:bg-brand-primary/[0.04] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/35"
            >
              Vérifier à nouveau
            </button>
          </>
        )}

        {reference && (
          <p className="mt-6 text-[12px] text-brand-text/40">
            Référence de la transaction : <span className="font-mono">{reference}</span>
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-brand-primary px-5 text-[13.5px] font-bold text-white hover:bg-brand-primary-dark"
          >
            Retour au tableau de bord
          </Link>
          <Link
            to="/estimation"
            className="inline-flex min-h-[48px] items-center rounded-xl px-5 text-[13.5px] font-bold text-brand-text/60 hover:bg-black/[0.03]"
          >
            Reprendre mon estimation
          </Link>
        </div>
      </div>

      {/* Volontairement visible : la page ne prétend pas décider du paiement. */}
      <p className="mt-4 text-center text-[12px] leading-relaxed text-brand-text/40">
        L'accès est accordé par le serveur après vérification auprès de l'opérateur de paiement, jamais par
        cette page.{droits.can_view_estimate ? '' : ' Tant que la confirmation n\'est pas arrivée, vos accès restent inchangés.'}
      </p>
    </div>
  );
}
