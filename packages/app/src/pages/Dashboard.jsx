import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMetre } from '../hooks/useMetre.js';
import { useDevis } from '../hooks/useDevis.js';
import StatCard from '../components/ui/StatCard.jsx';
import DashboardCard from '../components/ui/DashboardCard.jsx';
import Icone from '../components/ui/Icone.jsx';
import ModalAvis from '../components/ui/ModalAvis.jsx';
import { Link } from 'react-router-dom';

/**
 * Accueil Post-Connexion (Tableau de bord)
 */
export default function Dashboard() {
  const { user } = useAuth();
  const { metreParNiveau } = useMetre();
  const { devisEntreprise } = useDevis();
  const [modalAvisOuverte, setModalAvisOuverte] = useState(false);

  const userName = user?.user_metadata?.prenom || user?.email?.split('@')[0] || 'Pro';

  const ouvragesChiffres = metreParNiveau.reduce((total, { metre }) => {
    const blocs = Object.values(metre?.blocs || {});
    return total + blocs.reduce((n, b) => n + (b?.lignes?.filter((l) => l?.valeur > 0).length || 0), 0);
  }, 0);

  const devisCreation = devisEntreprise?.total > 0 ? 1 : 0;
  
  const isNewUser = ouvragesChiffres === 0 && devisCreation === 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 mx-auto max-w-6xl">
      {/* Header personnalisé */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-extrabold text-brand-primary">
            Bonjour {userName},
          </h1>
          <p className="mt-1 text-sm text-brand-text/70 font-serif">
            Que souhaitez-vous faire aujourd'hui ?
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalAvisOuverte(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-brand-primary/20 bg-white px-4 py-2.5 text-xs font-bold text-brand-primary shadow-sm hover:bg-brand-primary/5 transition-all"
        >
          <Icone nom="message-square" size={16} />
          Donner votre avis sur le logiciel
        </button>
      </div>

      {/* Onboarding Empty State */}
      {isNewUser && (
        <div className="bg-brand-primary text-white rounded-2xl p-8 relative overflow-hidden shadow-lg border border-brand-primary/20">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Icone nom="grid" size={120} />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-accent/20 text-brand-accent rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-brand-accent/30">
              <Icone nom="star" size={14} /> Bienvenue sur DEVIS Facile BTP
            </div>
            <h2 className="text-2xl font-bold mb-2">Prêt à créer votre premier devis ?</h2>
            <p className="text-white/80 font-serif mb-6 leading-relaxed">
              Le processus est simple : commencez par réaliser un métré (calcul des quantités). 
              Le moteur s'occupe de la décomposition des matériaux automatiquement. Vous pourrez ensuite générer un devis professionnel.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/metre" className="px-6 py-3 bg-brand-accent text-white font-bold rounded-xl shadow-md hover:bg-[#e0893a] hover:-translate-y-0.5 transition-all uppercase tracking-wide text-sm flex items-center gap-2">
                <Icone nom="ruler" size={18} /> Démarrer un nouveau projet
              </Link>
              <Link to="/demo" className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl border border-white/20 hover:bg-white/20 transition-all text-sm flex items-center gap-2">
                <Icone nom="eye" size={18} /> Voir les exemples de devis effectués
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* BANDEAU D'ACCÈS RAPIDE AUX EXEMPLES DE DEVIS */}
      <div className="rounded-2xl border border-brand-interactive/20 bg-brand-interactive/5 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-brand-interactive/10 flex items-center justify-center text-brand-interactive">
            <Icone nom="eye" size={22} />
          </div>
          <div>
            <h3 className="font-bold text-[15px] text-brand-text">
              Découvrez les exemples de devis effectués sur la plateforme
            </h3>
            <p className="text-xs text-brand-text/65">
              Consultez des exemples de chantiers réels avec décomposition complète des matériaux et prix tout compris.
            </p>
          </div>
        </div>

        <Link
          to="/demo"
          className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-brand-interactive px-5 text-xs font-bold text-white shadow hover:bg-brand-interactive/90 transition-all shrink-0"
        >
          <Icone nom="eye" size={16} /> Voir les exemples →
        </Link>
      </div>

      {/* Statistiques (seulement si l'utilisateur a commencé à utiliser l'app) */}
      {!isNewUser && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Métrés réalisés" valeur={ouvragesChiffres} icone="ruler" />
          <StatCard label="Devis créés" valeur={devisCreation} icone="file-text" />
          <StatCard label="QCM terminés" valeur={0} icone="check-square" />
          <StatCard label="Score moyen" valeur="–" icone="bar-chart" />
        </div>
      )}

      {/* Actions Principales */}
      <div>
        <h2 className="mb-4 font-sans text-sm font-bold text-brand-text/50 uppercase tracking-widest">
          Actions rapides
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            to="/estimation"
            icone="calculator"
            titre="Estimer le budget de ma construction"
            texte="Obtenez une première estimation du budget de votre projet en quelques étapes."
            cta="Estimer mon budget"
            accent
          />
          <DashboardCard
            to="/metre"
            icone="ruler"
            titre="Faire un devis"
            texte="Réalisez vos métrés, calculez vos quantités et préparez vos devis."
            cta="Nouveau métré"
          />
          <DashboardCard
            to="/demo"
            icone="eye"
            titre="Exemples de devis"
            texte="Consultez les exemples de devis effectués pour voir le niveau de détail du logiciel."
            cta="Voir les devis"
          />
          <DashboardCard
            to="/apprendre"
            icone="book-open"
            titre="Apprendre le devis"
            texte="Apprenez à maîtriser le métré et le devis grâce à des simulations et des QCM pratiques."
            cta="Commencer une simulation"
          />
        </div>
      </div>

      {/* Modale d'avis utilisateur */}
      <ModalAvis
        isOpen={modalAvisOuverte}
        onClose={() => setModalAvisOuverte(false)}
      />
    </div>
  );
}
