import React, { useEffect, useState } from 'react';
import { fetchOffres, fetchMesAbonnements } from '../lib/estimationApi.js';
import Paywall from '../components/offres/Paywall.jsx';

export default function Abonnement() {
  const [offres, setOffres] = useState([]);
  const [abonnements, setAbonnements] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [plans, abos] = await Promise.all([
          fetchOffres(),
          fetchMesAbonnements(),
        ]);
        setOffres(plans);
        setAbonnements(abos);
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  if (chargement) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-brand-text mb-2">Abonnements</h1>
        <p className="text-brand-text/60">
          Choisissez l'offre qui correspond à vos besoins pour profiter de Devis Facile BTP.
        </p>
      </div>
      
      <Paywall offres={offres} abonnements={abonnements} source="ABONNEMENT" />
    </div>
  );
}
