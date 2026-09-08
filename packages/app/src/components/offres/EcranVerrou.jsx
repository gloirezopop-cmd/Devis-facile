import React, { useState } from 'react';
import Icone from '../ui/Icone.jsx';
import { formaterNombre } from '../../utils/format.js';
import { LIBELLES_DEVISE } from '../../utils/estimation.js';
import {
  DROIT_PAR_SOURCE, MESSAGES_PAR_SOURCE, planQuiDebloque, libellePeriode, calculerDroits,
} from '../../utils/offres.js';
import { tracer } from '../../lib/estimationApi.js';
import { supabase } from '../../lib/supabaseClient.js';
import { messageErreurFonction } from '../../lib/messageErreurFonction.js';
import { useDroits } from '../../hooks/useDroits.js';
import CarteFormule from './CarteFormule.jsx';
import ProgressionEtude from './ProgressionEtude.jsx';

/**
 * L'écran affiché à la place d'une fonctionnalité qui n'est pas comprise dans
 * la formule en cours.
 *
 * Il dit ce qui est verrouillé, ce qu'il faut pour l'ouvrir, et combien cela
 * coûte. Il dit aussi, parce que c'est vrai et que c'est la première inquiétude
 * de quelqu'un qui tombe dessus, que rien de ce qu'il a saisi n'est perdu :
 * le verrou porte sur l'accès à la fonctionnalité, jamais sur les données.
 *
 * Pas de compte à rebours, pas de « plus que 2 places » : rien n'est
 * réellement limité, l'annoncer serait une invention.
 */
export default function EcranVerrou({
  source, titre, description, plans = [], abonnements = [], onFermer = null,
}) {
  // Même flux que Paywall.jsx : le serveur crée l'intention, appelle Chariow,
  // et renvoie l'adresse de paiement à laquelle rediriger. Rien n'est
  // accordé ici — seul le webhook, une fois la signature de Chariow
  // vérifiée, accorde l'accès (CHARIOW_INTEGRATION_SPEC.md).
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const droitRequis = DROIT_PAR_SOURCE[source] || DROIT_PAR_SOURCE.ESTIMATEUR;
  const plan = planQuiDebloque(plans, droitRequis);
  const droits = calculerDroits({ abonnements, plans });

  const choisir = async (p) => {
    setErreur(null);
    setEnCours(true);
    tracer('offer_selected', { plan_id: p?.id, price: p?.price, source });

    const { data, error } = await supabase.functions.invoke('chariow-checkout', {
      body: { plan: p.id },
    });

    if (error || data?.error) {
      const message = await messageErreurFonction(error, data);
      setEnCours(false);
      setErreur({
        plan: p,
        message: message || "Le paiement est momentanément indisponible. Réessayez dans un instant.",
      });
      return;
    }

    if (data?.checkout_url) {
      window.location.href = data.checkout_url;
      return;
    }

    if (data?.redirect) {
      window.location.href = data.redirect;
      return;
    }

    setEnCours(false);
    setErreur({ plan: p, message: 'Réponse de paiement inattendue.' });
  };

  return (
    <section className="mx-auto max-w-2xl py-8 sm:py-10">
      <ProgressionEtude droits={droits} />

      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-accent/10">
          <Icone nom="lock" size={26} className="text-brand-accent" />
        </div>

        <h2 className="mt-5 font-sans text-[22px] sm:text-2xl font-extrabold leading-tight tracking-tight text-brand-text">
          {titre || MESSAGES_PAR_SOURCE[source] || 'Cette fonctionnalité fait partie d\'une formule.'}
        </h2>
        {description && (
          <p className="mx-auto mt-2.5 max-w-lg text-[13.5px] leading-relaxed text-brand-text/65">{description}</p>
        )}

        {/* La promesse qui compte le plus à cet instant précis. */}
        <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-devis-herite/10 px-4 py-1.5 text-[12.5px] font-bold text-devis-herite">
          <Icone nom="check-circle" size={14} className="shrink-0" />
          Vos saisies, vos calculs et vos résultats sont conservés
        </p>
      </div>

      {plan ? (
        <div className="mt-8">
          <CarteFormule
            plan={plan}
            plans={plans}
            misEnAvant
            badge={null}
            libelleAction={enCours ? 'Redirection vers le paiement…' : `M'abonner — ${plan.name}`}
            onChoisir={choisir}
            disabled={enCours}
          />
        </div>
      ) : (
        <p className="mt-6 text-center text-[13px] italic text-brand-text/50">
          Aucune formule ne propose cette fonctionnalité pour le moment.
        </p>
      )}

      {erreur && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-devis-averifier/30 bg-amber-50 p-5 text-left">
          <Icone nom="alert-circle" size={20} className="mt-0.5 shrink-0 text-devis-averifier" />
          <div className="text-[13px] leading-relaxed text-brand-text/75">
            <p className="font-bold text-brand-text">Le paiement n'a pas pu démarrer.</p>
            <p className="mt-1">
              {erreur.message} Votre choix — {erreur.plan.name}, {formaterNombre(erreur.plan.price, true)}{' '}
              {LIBELLES_DEVISE[erreur.plan.currency] || erreur.plan.currency} {libellePeriode(erreur.plan)} —
              n'a pas été débité, et votre projet reste enregistré tel quel.
            </p>
          </div>
        </div>
      )}

      {onFermer && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onFermer}
            className="min-h-[44px] px-4 text-[13px] font-bold text-brand-text/50 hover:text-brand-text"
          >
            Revenir en arrière
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Enveloppe une fonctionnalité protégée.
 *
 * Tant que les droits ne sont pas connus, rien n'est rendu : afficher le
 * verrou puis le retirer ferait clignoter l'écran d'un abonné. Le contenu
 * n'est pas démonté quand le verrou s'affiche à la place — il n'est pas
 * rendu, ce qui est différent : les données vivent dans le contexte du projet
 * et dans le stockage local, jamais dans cet écran.
 *
 * Ce garde-fou est celui de l'interface. Le budget de l'estimation, lui, est
 * protégé par la base : il n'arrive dans le navigateur que si les droits sont
 * acquis. Ici, les chiffres du métré et du devis sont calculés à partir des
 * saisies de l'utilisateur, dans son propre navigateur ; le verrou décide de
 * ce qui s'affiche, il ne prétend pas rendre ces valeurs inatteignables.
 */
export function Protege({ source, titre, description, children }) {
  const { droits, plans, abonnements, chargement } = useDroits();
  const droitRequis = DROIT_PAR_SOURCE[source] || DROIT_PAR_SOURCE.ESTIMATEUR;

  if (chargement) {
    return (
      <div className="flex items-center justify-center py-20 text-[13px] text-brand-text/40">
        Vérification de votre formule…
      </div>
    );
  }

  if (droits[droitRequis]) return children;

  return (
    <EcranVerrou
      source={source}
      titre={titre}
      description={description}
      plans={plans}
      abonnements={abonnements}
    />
  );
}
