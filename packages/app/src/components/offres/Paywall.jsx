import React, { useMemo, useState } from 'react';
import Icone from '../ui/Icone.jsx';
import { formaterNombre } from '../../utils/format.js';
import { LIBELLES_DEVISE } from '../../utils/estimation.js';
import { getRecommendedOffer, libellePeriode, rangDuPlan } from '../../utils/offres.js';
import { tracer } from '../../lib/estimationApi.js';
import { supabase } from '../../lib/supabaseClient.js';
import { messageErreurFonction } from '../../lib/messageErreurFonction.js';
import CarteFormule from './CarteFormule.jsx';
import ProgressionEtude from './ProgressionEtude.jsx';

/**
 * L'écran des formules, présenté après une étude terminée.
 *
 * Il raconte quelque chose avant de demander quelque chose : le chemin
 * parcouru, l'endroit où il s'arrête, puis les trois niveaux d'accès. Les
 * cartes ne sont pas au même niveau — porte d'entrée, formule de travail,
 * abonnement du professionnel — parce que ce sont trois usages différents,
 * pas trois variantes d'un même achat.
 *
 * Aucun prix, aucun libellé et aucune fonctionnalité n'est écrit ici : tout
 * vient de la table des formules. Changer un tarif, une accroche ou ce que
 * débloque une formule ne demande pas de toucher à ce fichier.
 *
 * Pas de compte à rebours, pas de place « bientôt épuisée » : rien n'est
 * réellement limité, l'annoncer serait une invention.
 */
export default function Paywall({ offres, abonnements = [], source = 'ESTIMATEUR', projectId = null }) {
  // `enCours` porte l'id de la formule dont le paiement démarre — le temps
  // d'un aller-retour serveur avant la redirection vers Chariow. `erreur`
  // n'apparaît que si ce départ échoue ; le silence est la normale.
  const [enCours, setEnCours] = useState(null);
  const [erreur, setErreur] = useState(null);

  const {
    recommended_plan: recommande,
    available_plans: disponibles,
    upgrade_options: upgrades,
    current_plan: actuelle,
    droits,
  } = useMemo(
    () => getRecommendedOffer({ plans: offres, abonnements, source, projectId }),
    [offres, abonnements, source, projectId],
  );

  /**
   * Démarre un vrai paiement Chariow : le serveur crée l'intention, appelle
   * Chariow, et renvoie l'adresse de paiement à laquelle rediriger. Rien
   * n'est accordé ici ni par la page de retour — seul le webhook, une fois la
   * signature de Chariow vérifiée, accorde l'accès (CHARIOW_INTEGRATION_SPEC.md).
   */
  const surUnChoix = async (plan) => {
    setErreur(null);
    setEnCours(plan.id);
    tracer('offer_selected', { plan_id: plan.id, price: plan.price, source, project_id: projectId });

    const { data, error } = await supabase.functions.invoke('chariow-checkout', {
      body: { plan: plan.id },
    });

    if (error || data?.error) {
      const message = await messageErreurFonction(error, data);
      setEnCours(null);
      setErreur({
        plan,
        message: message || "Le paiement est momentanément indisponible. Réessayez dans un instant.",
      });
      return;
    }

    if (data?.checkout_url) {
      // Redirection pleine page, pas un onglet : au retour, Chariow ramène
      // sur /paiement/succes, qui ne fait que relire les droits — jamais
      // les accorder elle-même.
      window.location.href = data.checkout_url;
      return;
    }

    if (data?.redirect) {
      window.location.href = data.redirect;
      return;
    }

    setEnCours(null);
    setErreur({ plan, message: 'Réponse de paiement inattendue.' });
  };

  if (!disponibles.length) {
    return <p className="text-sm italic text-brand-text/50">Aucune formule n'est disponible pour le moment.</p>;
  }

  const rangLePlusBas = Math.min(...disponibles.map(rangDuPlan));

  return (
    <section>
      <ProgressionEtude droits={droits} />

      {/* ── L'annonce ── */}
      <div className="mb-8 sm:mb-10 sm:text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-devis-herite/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-devis-herite">
          <Icone nom="check-circle" size={13} /> Terminé
        </span>
        <h2 className="mt-3 font-sans text-[26px] sm:text-[32px] font-extrabold leading-tight tracking-tight text-brand-text">
          Votre étude est prête.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-brand-text/60">
          Vous avez terminé votre estimation. Choisissez maintenant le niveau d'accès dont vous avez besoin.
        </p>
      </div>

      {/* ── Les formules ──
          Une carte par ligne tant que la largeur ne permet pas de les lire
          côte à côte. Trois colonnes seulement à partir de xl : à 1024 px, une
          fois la barre latérale déduite, trois cartes deviendraient illisibles. */}
      <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 xl:max-w-none xl:grid-cols-3 xl:items-stretch xl:gap-7">
        {disponibles.map((plan) => (
          <CarteFormule
            key={plan.id}
            plan={plan}
            plans={disponibles}
            misEnAvant={plan.id === recommande?.id}
            upgrade={upgrades.find((u) => u.plan.id === plan.id)}
            libelleAction={
              enCours === plan.id
                ? 'Redirection vers le paiement…'
                : (!actuelle && rangDuPlan(plan) === rangLePlusBas
                  ? `Choisir ${plan.name}`
                  : `Passer à ${plan.name}`)
            }
            onChoisir={surUnChoix}
            disabled={enCours !== null}
          />
        ))}
      </div>

      <ul className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12.5px] text-brand-text/55">
        <Rassurance>Paiement sécurisé</Rassurance>
        <Rassurance>Accès dès la confirmation du paiement</Rassurance>
        <Rassurance>Votre projet reste enregistré</Rassurance>
        <Rassurance>Aucune donnée saisie n'est supprimée</Rassurance>
      </ul>

      {erreur && (
        <div className="mx-auto mt-7 flex max-w-2xl items-start gap-3 rounded-xl border border-devis-averifier/30 bg-amber-50 p-5">
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
    </section>
  );
}

function Rassurance({ children }) {
  return (
    <li className="flex items-center gap-1.5">
      <Icone nom="check-circle" size={14} className="shrink-0 text-devis-herite" /> {children}
    </li>
  );
}
