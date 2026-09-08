import React from 'react';
import Icone from '../ui/Icone.jsx';
import { formaterNombre } from '../../utils/format.js';
import { LIBELLES_DEVISE } from '../../utils/estimation.js';
import { libellePeriode, equivalentMensuel, economieAnnuelle } from '../../utils/offres.js';

/**
 * Une formule, présentée comme une carte.
 *
 * Rien n'est écrit ici : nom, prix, période, accroche et puces viennent tous
 * de la base. Ce fichier décide de la mise en forme, pas du contenu.
 *
 * L'économie annuelle n'est pas un prix barré fictif : elle se calcule à
 * partir de la formule mensuelle réellement proposée, payée douze mois. Si
 * cette comparaison ne donne rien à économiser, rien ne s'affiche.
 */

/** Le libellé du bandeau de la formule mise en avant. Un seul endroit à changer. */
export const BADGE_MIS_EN_AVANT = 'Le plus populaire';
/** Celui de la formule annuelle, affiché seulement si l'économie est réelle. */
export const BADGE_MEILLEURE_VALEUR = 'Meilleure valeur';

export default function CarteFormule({
  plan,
  plans = [],
  misEnAvant = false,
  // `null` retire le bandeau. Utile là où une seule formule est proposée :
  // la dire « la plus populaire » quand elle est la seule à l'écran
  // n'informerait sur rien.
  badge: badgeImpose,
  upgrade = null,
  libelleAction,
  onChoisir,
  disabled = false,
}) {
  const devise = LIBELLES_DEVISE[plan.currency] || plan.currency;
  const mensuel = equivalentMensuel(plan);
  const economie = economieAnnuelle(plan, plans);
  const badge = badgeImpose !== undefined
    ? badgeImpose
    : (misEnAvant ? BADGE_MIS_EN_AVANT : (economie ? BADGE_MEILLEURE_VALEUR : null));

  return (
    <div
      className={[
        'relative flex h-full flex-col rounded-2xl bg-white p-6 sm:p-7',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        misEnAvant
          ? 'border-2 border-brand-accent shadow-[0_18px_44px_-20px_rgba(0,0,0,0.35)] xl:-translate-y-4'
          : 'border border-brand-primary/12 hover:border-brand-primary/30 hover:shadow-[0_14px_34px_-20px_rgba(0,0,0,0.3)]',
        badge ? 'mt-4 xl:mt-0' : '',
      ].join(' ')}
    >
      {badge && (
        <div
          className={[
            'absolute -top-3 left-6 sm:left-7 rounded-full px-3.5 py-1',
            'text-[10px] font-extrabold uppercase tracking-[0.12em] text-white whitespace-nowrap',
            misEnAvant ? 'bg-brand-accent' : 'bg-brand-primary',
          ].join(' ')}
        >
          {badge}
        </div>
      )}

      {/* ── Identité et prix ── */}
      <div className={badge ? 'pt-2' : ''}>
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-text/45">
          {plan.name}
        </h3>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-mono text-[32px] sm:text-[36px] font-extrabold leading-none tracking-tight text-brand-text">
            {formaterNombre(plan.price, true)}
          </span>
          <span className="text-[13px] font-bold text-brand-text/45">
            {devise} {libellePeriode(plan)}
          </span>
        </div>

        {/* Ce que l'annuel fait réellement gagner, comparé au mensuel proposé. */}
        {economie && (
          <div className="mt-3 space-y-1">
            <p className="text-[12.5px] text-brand-text/45">
              Au lieu de{' '}
              <span className="font-mono line-through">{formaterNombre(economie.surUnAn, true)} {devise}</span>{' '}
              par an en {economie.reference.name} mensuel
            </p>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-devis-herite/10 px-3 py-1 text-[12px] font-bold text-devis-herite">
              <Icone nom="check-circle" size={13} className="shrink-0" />
              Vous économisez {formaterNombre(economie.economie, true)} {devise} par an
            </p>
          </div>
        )}
        {mensuel && !economie && (
          <p className="mt-2 text-[12px] text-brand-text/45">
            soit environ {formaterNombre(mensuel, true)} {devise} par mois, payés une fois par an
          </p>
        )}

        {plan.tagline && (
          <p className="mt-4 text-[13.5px] leading-relaxed text-brand-text/70 xl:min-h-[42px]">
            {plan.tagline}
          </p>
        )}
      </div>

      <div className="my-5 h-px bg-brand-primary/10" />

      {/* ── Ce que la formule contient ── */}
      <ul className="space-y-2.5">
        {(plan.features || []).map((f, i) => {
          // La première puce d'une formule supérieure dit ce dont elle hérite.
          // C'est elle qui rend l'écart entre deux formules lisible d'un coup
          // d'œil : on la distingue au lieu de la noyer dans la liste.
          const heritage = i === 0 && /^tout/i.test(f);
          return (
            <li
              key={f}
              className={`flex items-start gap-2.5 text-[13px] leading-snug ${
                heritage ? 'font-bold text-brand-text' : 'text-brand-text/75'
              }`}
            >
              <Icone
                nom={heritage ? 'arrow-right' : 'check'}
                size={15}
                className={`mt-px shrink-0 ${heritage ? 'text-brand-primary' : 'text-devis-herite'}`}
              />
              <span className="min-w-0">{f}</span>
            </li>
          );
        })}
      </ul>

      {upgrade && (
        <p className="mt-5 rounded-lg bg-brand-interactive/10 px-3.5 py-2.5 text-[12.5px] font-bold leading-snug text-brand-interactive">
          {upgrade.memePeriode
            ? `Vous avez déjà ${upgrade.depuis.name} : ${formaterNombre(upgrade.supplement, true)} ${devise} de plus ${libellePeriode(plan)}`
            : `Vous avez déjà ${upgrade.depuis.name} : cette formule se règle ${libellePeriode(plan)}`}
        </p>
      )}

      {/* ── L'action ── */}
      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={() => onChoisir(plan)}
          disabled={disabled}
          className={[
            'w-full min-h-[52px] rounded-xl px-4 text-[13.5px] font-extrabold',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/35',
            'disabled:cursor-not-allowed disabled:opacity-60',
            misEnAvant
              ? 'bg-brand-accent text-white hover:bg-[#e0893a] active:bg-[#d47f31]'
              : 'border-2 border-brand-primary/20 text-brand-text hover:border-brand-primary hover:bg-brand-primary/[0.04] active:bg-brand-primary/[0.08]',
          ].join(' ')}
        >
          {libelleAction}
        </button>
      </div>
    </div>
  );
}
