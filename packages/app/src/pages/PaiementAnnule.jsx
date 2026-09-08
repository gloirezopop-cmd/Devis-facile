import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icone from '../components/ui/Icone.jsx';
import { tracer } from '../lib/estimationApi.js';

/**
 * Page de retour après un paiement abandonné ou refusé.
 *
 * Elle dit deux choses, et seulement celles-là : rien n'a été prélevé, et rien
 * n'a été supprimé. C'est ce qu'on veut savoir en arrivant ici, et il n'y a
 * aucune raison d'en profiter pour insister.
 */
export default function PaiementAnnule() {
  const [params] = useSearchParams();
  const reference = params.get('transaction_id') || params.get('reference') || params.get('token');

  useEffect(() => {
    tracer('payment_return', { issue: 'annule', reference });
  }, [reference]);

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-2xl border border-brand-primary/10 bg-white p-7 sm:p-9 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.04]">
          <Icone nom="x" size={26} className="text-brand-text/50" />
        </div>

        <h1 className="mt-5 font-sans text-[22px] font-extrabold tracking-tight text-brand-text">
          Paiement interrompu.
        </h1>
        <p className="mx-auto mt-2.5 max-w-md text-[13.5px] leading-relaxed text-brand-text/65">
          Aucun montant n'a été prélevé.
        </p>

        <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-devis-herite/10 px-4 py-1.5 text-[12.5px] font-bold text-devis-herite">
          <Icone nom="check-circle" size={14} className="shrink-0" />
          Votre projet et vos saisies sont intacts
        </p>

        {reference && (
          <p className="mt-6 text-[12px] text-brand-text/40">
            Référence de la transaction : <span className="font-mono">{reference}</span>
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/estimation"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-brand-primary px-5 text-[13.5px] font-bold text-white hover:bg-brand-primary-dark"
          >
            Revenir à mon estimation
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex min-h-[48px] items-center rounded-xl px-5 text-[13.5px] font-bold text-brand-text/60 hover:bg-black/[0.03]"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
