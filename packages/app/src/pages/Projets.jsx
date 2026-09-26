import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProjets } from '../hooks/useProjets.js';
import { useToast } from '../context/ToastContext.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Icone from '../components/ui/Icone.jsx';

const formaterDate = (iso) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Projets() {
  const { projets, projetActifId, charger, supprimer } = useProjets();
  const navigate = useNavigate();
  const toast = useToast();

  const ouvrir = (id) => {
    charger(id);
    toast('Projet chargé.');
    navigate('/metre');
  };

  const retirer = (id, nom) => {
    if (!window.confirm(`Supprimer « ${nom} » ? Cette action est irréversible.`)) return;
    supprimer(id);
    toast('Projet supprimé.');
  };

  if (projets.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <DemoCard />
        <EmptyState
          icone="folder"
          titre="Aucun projet enregistré"
          texte="Enregistrez votre travail depuis l'étape Devis pour le retrouver ici."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-4 font-sans text-xl font-bold text-brand-text">Mes projets</h1>
      <DemoCard />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...projets].reverse().map((p) => (
          <div key={p.id} className="relative rounded-lg border border-brand-primary/10 bg-white p-4">
            {p.id === projetActifId && (
              <span className="absolute right-3 top-3 rounded-full bg-brand-interactive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-interactive">
                Actif
              </span>
            )}
            <div className="flex items-center gap-2 pr-14">
              <Icone nom="folder" size={16} className="shrink-0 text-brand-text/40" />
              <h3 className="truncate font-sans text-[14px] font-bold text-brand-text">{p.nom}</h3>
            </div>
            <p className="mt-1.5 text-[12px] text-brand-text/50">
              Modifié le {formaterDate(p.dateModification)}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <button onClick={() => retirer(p.id, p.nom)} className="text-[12.5px] font-bold text-red-500/80 hover:text-red-600">
                Supprimer
              </button>
              <button onClick={() => ouvrir(p.id)} className="text-[12.5px] font-bold text-brand-interactive hover:underline">
                Ouvrir →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoCard() {
  return (
    <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 border border-brand-primary/20 p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-center justify-between shadow-sm">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-6 items-center rounded-full bg-brand-primary px-2 text-[10px] font-extrabold uppercase tracking-widest text-white">
            Démo
          </span>
          <h2 className="font-sans text-[18px] font-bold text-brand-text">Projet : Villa R+1 (Exemple)</h2>
        </div>
        <p className="text-[13px] text-brand-text/70 max-w-xl leading-relaxed">
          Découvrez exactement à quoi ressemble un devis terminé avant même de commencer. Explorez le modèle particulier (fournitures) et le modèle entreprise (prix client).
        </p>
      </div>
      <Link
        to="/demo"
        className="shrink-0 rounded-lg bg-brand-interactive px-6 py-2.5 text-[14px] font-bold text-white shadow-md transition-transform hover:scale-105 hover:bg-brand-interactive/90"
      >
        Voir le devis généré →
      </Link>
    </div>
  );
}
