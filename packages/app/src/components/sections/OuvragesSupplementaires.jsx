import React from 'react';
import { useProjet } from '../../context/ProjetContext.jsx';
import CarteBloc from '../ui/CarteBloc.jsx';
import LigneOuvrage from '../ui/LigneOuvrage.jsx';
import InputSaisie from '../ui/InputSaisie.jsx';

/**
 * Les lots que le métré ne calcule pas.
 *
 * Le nombre de prises, de points d'eau ou de mètres de gaine ne se déduit
 * d'aucune dimension du plan : il dépend du projet et des habitudes de
 * l'entreprise. Inventer une formule reviendrait à afficher un chiffre faux
 * avec l'autorité d'un calcul. On demande donc la quantité, sans la deviner.
 *
 * Ces lignes traversent ensuite le Résumé et le Devis Particulier telles
 * qu'elles ont été saisies.
 */
const LOTS_SUGGERES = [
  'ÉLECTRICITÉ',
  'PLOMBERIE',
  'OUVERTURES',
  'PLAFOND',
  'ASSAINISSEMENT',
  'MENUISERIE',
];

export default function OuvragesSupplementaires() {
  const {
    autresOuvrages, setAutresOuvrages,
    addRow, removeRow, updateRow, niveauActifId,
  } = useProjet();

  const currentAutres = autresOuvrages.filter((x) => x.niveauId === niveauActifId);

  const ligneVide = (lot = '') => ({
    niveauId: niveauActifId,
    lot,
    designation: '',
    unite: 'u',
    quantite: '1',
    pu: '',
  });

  const ajouter = (lot) => addRow(autresOuvrages, setAutresOuvrages, ligneVide(lot), '');

  return (
    <section id="ouvrages-supplementaires" className="scroll-mt-24">
      <h2 className="mb-1 border-b border-devis-border pb-2 font-sans text-2xl font-bold text-devis-calcule">
        Ouvrages Supplémentaires
      </h2>
      <p className="mb-4 text-[13px] text-brand-text/60">
        Électricité, plomberie, plafond, ouvertures… Ces lots n'ont pas de formule automatique :
        c'est vous qui posez la quantité. Ils apparaîtront dans le résumé et dans le devis.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-bold uppercase tracking-wider text-brand-text/45">
          Ajouter un lot
        </span>
        {LOTS_SUGGERES.map((lot) => (
          <button
            key={lot}
            type="button"
            onClick={() => ajouter(lot)}
            className="min-h-[36px] rounded-full border border-brand-primary/25 bg-white px-3.5 text-[12.5px] font-bold text-brand-primary hover:bg-brand-primary/5"
          >
            + {lot}
          </button>
        ))}
      </div>

      {/* La liste des lots deja nommes alimente l'autocompletion : une deuxieme
          ligne d'electricite doit rejoindre la premiere, pas creer un lot
          « Electricite » different a une majuscule pres. */}
      <datalist id="lots-supplementaires">
        {[...new Set([...LOTS_SUGGERES, ...autresOuvrages.map((o) => o.lot).filter(Boolean)])].map((lot) => (
          <option key={lot} value={lot} />
        ))}
      </datalist>

      <CarteBloc
        titre="Lignes libres"
        onAdd={() => ajouter('')}
        addLabel="Ajouter une ligne"
      >
        {currentAutres.length === 0 && (
          <p className="px-1 py-3 text-[13px] text-brand-text/45">
            Aucun lot supplémentaire pour ce niveau. Utilisez les boutons ci-dessus.
          </p>
        )}

        {currentAutres.map((o, index) => (
          <LigneOuvrage
            key={o.id}
            repere={`Ligne ${index + 1}`}
            titre={o.lot || 'Lot à nommer'}
            onRemove={() => removeRow(autresOuvrages, setAutresOuvrages, o.id)}
          >
            <div className="mb-2 grid grid-cols-1 gap-4 md:grid-cols-6">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-devis-saisie">
                  Lot
                </label>
                <input
                  list="lots-supplementaires"
                  value={o.lot || ''}
                  onChange={(e) => updateRow(autresOuvrages, setAutresOuvrages, o.id, 'lot', e.target.value)}
                  placeholder="ÉLECTRICITÉ, PLOMBERIE…"
                  className="h-[44px] min-h-[44px] w-full rounded border border-devis-border bg-white p-2 font-sans text-sm text-devis-calcule focus:outline-none focus:ring-2 focus:ring-devis-saisie"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-devis-saisie">
                  Désignation
                </label>
                <input
                  type="text"
                  // `materiauKey` : l'ancien champ du selecteur de bibliotheque.
                  // Les projets deja enregistres le portent encore.
                  value={o.designation ?? o.materiauKey ?? ''}
                  onChange={(e) => updateRow(autresOuvrages, setAutresOuvrages, o.id, 'designation', e.target.value)}
                  placeholder="F et P des interrupteurs simple"
                  className="h-[44px] min-h-[44px] w-full rounded border border-devis-border bg-white p-2 font-sans text-sm text-devis-calcule focus:outline-none focus:ring-2 focus:ring-devis-saisie"
                />
              </div>
              <InputSaisie
                label="Unité"
                value={o.unite}
                onChange={(v) => updateRow(autresOuvrages, setAutresOuvrages, o.id, 'unite', v)}
                type="text"
                placeholder="u, ml, ff…"
              />
              <InputSaisie
                label="Quantité"
                value={o.quantite}
                onChange={(v) => updateRow(autresOuvrages, setAutresOuvrages, o.id, 'quantite', v)}
                unite=""
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
              <div className="md:col-span-2">
                <InputSaisie
                  label="Prix unitaire (facultatif)"
                  value={o.pu ?? ''}
                  onChange={(v) => updateRow(autresOuvrages, setAutresOuvrages, o.id, 'pu', v)}
                  unite="FCFA"
                />
              </div>
              <p className="self-end pb-2 text-[12px] text-brand-text/50 md:col-span-4">
                Sans prix, la ligne reste au résumé et ressort « prix à saisir » dans le devis.
              </p>
            </div>
          </LigneOuvrage>
        ))}
      </CarteBloc>
    </section>
  );
}
