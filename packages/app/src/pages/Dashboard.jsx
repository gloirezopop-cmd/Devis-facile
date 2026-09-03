import React from 'react';
import { useMetre } from '../hooks/useMetre.js';
import { useDevis } from '../hooks/useDevis.js';
import StatCard from '../components/ui/StatCard.jsx';
import DashboardCard from '../components/ui/DashboardCard.jsx';

/**
 * Les quatre statistiques sont dérivées de l'état réel — jamais de données
 * de démonstration. Sans comptes ni historique (Phase 3), « métrés réalisés »
 * compte les ouvrages effectivement chiffrés dans le projet en cours, et
 * QCM/score restent à « – » : la fonctionnalité n'existe pas encore.
 */
export default function Dashboard() {
  const { metreParNiveau } = useMetre();
  const { devisEntreprise } = useDevis();

  const ouvragesChiffres = metreParNiveau.reduce((total, { metre }) => {
    const blocs = Object.values(metre?.blocs || {});
    return total + blocs.reduce((n, b) => n + (b?.lignes?.filter((l) => l?.valeur > 0).length || 0), 0);
  }, 0);

  const devisCreation = devisEntreprise?.total > 0 ? 1 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-2xl font-bold text-brand-text">Bonjour 👋</h1>
        <p className="mt-1 text-[14px] text-brand-text/60">
          Bienvenue sur Devis Facile. Gérez vos métrés, vos devis et votre progression en apprentissage.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Métrés réalisés" valeur={ouvragesChiffres} icone="ruler" />
        <StatCard label="Devis créés" valeur={devisCreation} icone="file-text" />
        <StatCard label="QCM terminés" valeur={0} icone="check-square" />
        <StatCard label="Score moyen" valeur="–" icone="bar-chart" />
      </div>

      <div>
        <h2 className="mb-3 font-sans text-[15px] font-bold text-brand-text">Que souhaitez-vous faire ?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardCard
            to="/apprendre"
            icone="book"
            titre="Apprendre le devis"
            texte="Apprenez à maîtriser le métré et le devis grâce à des simulations et des QCM pratiques."
            cta="Commencer une simulation"
          />
          <DashboardCard
            to="/metre"
            icone="ruler"
            titre="Faire un devis"
            texte="Réalisez vos métrés, calculez vos quantités et préparez vos devis."
            cta="Nouveau métré"
            accent
          />
        </div>
      </div>
    </div>
  );
}
