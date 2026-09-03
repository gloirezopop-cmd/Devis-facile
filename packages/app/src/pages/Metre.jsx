import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMetre } from '../hooks/useMetre.js';
import { useDevis } from '../hooks/useDevis.js';
import Stepper from '../components/ui/Stepper.jsx';
import ParametresProjet from '../components/sections/ParametresProjet.jsx';
import EtapeStructure from '../components/metre/EtapeStructure.jsx';
import EtapeMetre from '../components/metre/EtapeMetre.jsx';
import EtapeResultats from '../components/metre/EtapeResultats.jsx';
import EtapeDevis from '../components/metre/EtapeDevis.jsx';
import BandeauTotal from '../components/ui/BandeauTotal.jsx';
import LegendeEtats from '../components/ui/LegendeEtats.jsx';

const ETAPES = [
  { id: 'projet', label: 'Informations du projet' },
  { id: 'structure', label: 'Plans et éléments' },
  { id: 'metre', label: 'Métré' },
  { id: 'resultats', label: 'Résultats' },
  { id: 'devis', label: 'Devis' },
];

/**
 * Le parcours guidé en cinq étapes. L'étape courante vit dans l'URL
 * (?etape=N) : un lien direct depuis la sidebar (« Nouveau devis » →
 * étape 5, « Paramètres » → étape 1) atterrit au bon endroit, et l'état
 * survit à un rafraîchissement de page.
 */
export default function Metre() {
  const [searchParams, setSearchParams] = useSearchParams();
  const etape = Math.min(5, Math.max(1, Number(searchParams.get('etape')) || 1));

  const allerA = (numero) => setSearchParams({ etape: String(numero) }, { replace: false });

  const { avertissementsGlobaux: avertissementsMetre } = useMetre();
  const { devisParticulier, devisEntreprise, avertissementsDevis } = useDevis();
  const totalAvertissements = avertissementsMetre.length + avertissementsDevis.length;

  return (
    <div className="pb-20">
      <Stepper etapes={ETAPES} etapeActive={etape} onChange={allerA} />

      {etape === 1 && <ParametresProjet />}
      {etape === 2 && <EtapeStructure onOuvrir={() => allerA(3)} />}
      {etape === 3 && <EtapeMetre />}
      {etape === 4 && <EtapeResultats />}
      {etape === 5 && <EtapeDevis />}

      <div className="mt-8 flex justify-between border-t border-brand-primary/10 pt-4">
        <button
          onClick={() => allerA(etape - 1)}
          disabled={etape === 1}
          className="min-h-[44px] rounded-md px-4 text-[13.5px] font-bold text-brand-text/60 hover:bg-black/[0.03] disabled:invisible"
        >
          ← Étape précédente
        </button>
        <button
          onClick={() => allerA(etape + 1)}
          disabled={etape === 5}
          className="min-h-[44px] rounded-md bg-brand-primary px-5 text-[13.5px] font-bold text-white hover:bg-brand-primary-dark disabled:invisible"
        >
          Étape suivante →
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
