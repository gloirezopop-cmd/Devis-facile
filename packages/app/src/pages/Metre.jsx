import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMetre } from '../hooks/useMetre.js';
import { useDevis } from '../hooks/useDevis.js';
import { useToast } from '../context/ToastContext.jsx';
import Stepper from '../components/ui/Stepper.jsx';
import EtapeStructure from '../components/metre/EtapeStructure.jsx';
import EtapeMetre from '../components/metre/EtapeMetre.jsx';
import EtapeResultats from '../components/metre/EtapeResultats.jsx';
import EtapeDevis from '../components/metre/EtapeDevis.jsx';
import BandeauTotal from '../components/ui/BandeauTotal.jsx';
import LegendeEtats from '../components/ui/LegendeEtats.jsx';

const ETAPES = [
  { id: 'structure', label: 'Plans et éléments' },
  { id: 'metre', label: 'Métré' },
  { id: 'resultats', label: 'Résultats' },
  { id: 'devis', label: 'Devis' },
];
const DERNIERE_ETAPE = ETAPES.length;

/**
 * Le parcours guidé. Les réglages de projet (dosages, prix, taux) ne sont
 * plus une étape ici — un réglage qu'on pose une fois puis revisite rarement
 * n'a pas sa place dans un parcours qu'on traverse à chaque devis ; ils
 * restent à /parametres, dans la sidebar.
 *
 * L'étape courante vit dans l'URL (?etape=N) : un lien direct depuis la
 * sidebar (« Nouveau devis » → étape 4) atterrit au bon endroit, et l'état
 * survit à un rafraîchissement de page.
 */
export default function Metre() {
  const [searchParams, setSearchParams] = useSearchParams();
  const etape = Math.min(DERNIERE_ETAPE, Math.max(1, Number(searchParams.get('etape')) || 1));
  const toast = useToast();

  const allerA = (numero) => setSearchParams({ etape: String(numero) }, { replace: false });

  const { avertissementsGlobaux: avertissementsMetre } = useMetre();
  const { devisParticulier, devisEntreprise, avertissementsDevis } = useDevis();
  const totalAvertissements = avertissementsMetre.length + avertissementsDevis.length;

  // Chaque saisie est deja enregistree en direct (localStorage) — mais on
  // le confirme explicitement au moment ou l'utilisateur choisit d'avancer :
  // une valeur posee, une confirmation visible, puis l'etape suivante.
  const validerEtAvancer = () => {
    toast(`Étape « ${ETAPES[etape - 1].label} » enregistrée.`);
    allerA(etape + 1);
  };

  return (
    <div className="pb-20">
      <Stepper etapes={ETAPES} etapeActive={etape} onChange={allerA} />

      {etape === 1 && <EtapeStructure onOuvrir={() => allerA(2)} />}
      {etape === 2 && <EtapeMetre />}
      {etape === 3 && <EtapeResultats />}
      {etape === 4 && <EtapeDevis />}

      <div className="mt-8 flex justify-between border-t border-brand-primary/10 pt-4">
        <button
          onClick={() => allerA(etape - 1)}
          disabled={etape === 1}
          className="min-h-[44px] rounded-md px-4 text-[13.5px] font-bold text-brand-text/60 hover:bg-black/[0.03] disabled:invisible"
        >
          ← Étape précédente
        </button>
        <button
          onClick={validerEtAvancer}
          disabled={etape === DERNIERE_ETAPE}
          className="min-h-[44px] rounded-md bg-brand-primary px-5 text-[13.5px] font-bold text-white hover:bg-brand-primary-dark disabled:invisible"
        >
          OK, enregistrer et continuer →
        </button>
      </div>

      <LegendeEtats />
      {etape > 1 && (
        <BandeauTotal
          totalParticulier={devisParticulier?.total}
          totalEntreprise={devisEntreprise?.total}
          totalAvertissements={totalAvertissements}
        />
      )}
    </div>
  );
}
