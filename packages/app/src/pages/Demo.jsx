import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icone from '../components/ui/Icone.jsx';
import TableauDevis from '../components/sections/TableauDevis.jsx';
import {
  obtenirTousLesExemplesDevis,
  supprimerExempleDevisCustom,
} from '../utils/demoDevisStore.js';
import { useEstAdmin } from '../hooks/useEstAdmin.js';

export default function Demo() {
  const [vue, setVue] = useState('entreprise');
  const [exemples, setExemples] = useState([]);
  const [exempleActifId, setExempleActifId] = useState('');
  const estAdmin = useEstAdmin();

  const rafraichir = () => {
    const tous = obtenirTousLesExemplesDevis();
    setExemples(tous);
    if (tous.length > 0 && (!exempleActifId || !tous.some((e) => e.id === exempleActifId))) {
      setExempleActifId(tous[0].id);
    }
  };

  useEffect(() => {
    rafraichir();
  }, []);

  const exempleActif = exemples.find((e) => e.id === exempleActifId) || exemples[0];

  const handleSupprimerCustom = (id) => {
    if (window.confirm('Voulez-vous retirer cet exemple de devis de la liste publique ?')) {
      supprimerExempleDevisCustom(id);
      rafraichir();
    }
  };

  const devisParticulier = exempleActif?.particulier || {};
  const devisEntreprise = exempleActif?.entreprise || {};

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      {/* BANDEAU D'ANNONCE MARKETING FIXE */}
      <div className="sticky top-0 z-50 bg-devis-herite px-4 py-3 text-center shadow-md">
        <p className="text-[13.5px] font-bold text-white flex flex-wrap items-center justify-center gap-2">
          <Icone nom="eye" size={16} />
          MODE DÉMONSTRATION : Devis types et exemples de chantiers réalisés.
          <Link to="/inscription" className="ml-2 inline-block rounded-full bg-white px-3 py-1 text-devis-herite hover:bg-black/10 transition-colors">
            Créer mon projet →
          </Link>
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-10">
        
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-interactive/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-interactive mb-3">
            Exemples de devis réalisés sur Devis Facile BTP
          </span>
          <h1 className="font-sans text-3xl font-extrabold text-brand-text md:text-4xl">
            Projet : {exempleActif?.titre || 'Devis modèle'}
          </h1>
          <p className="mt-3 text-[14px] text-brand-text/60 max-w-2xl mx-auto">
            {exempleActif?.description || 'Explorez les modèles de devis générés par Devis Facile BTP. Le calcul des quantités et des prix se fait automatiquement à partir des plans.'}
          </p>

          {/* SÉLECTEUR D'EXEMPLES DE DEVIS */}
          {exemples.length > 1 && (
            <div className="mt-6 mx-auto max-w-md bg-white p-3.5 rounded-xl border border-brand-primary/15 shadow-sm text-left">
              <label htmlFor="selecteur-devis-demo" className="block text-[11px] font-bold uppercase tracking-wider text-brand-text/50 mb-1.5">
                Sélectionner un exemple de devis à consulter :
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="selecteur-devis-demo"
                  value={exempleActifId}
                  onChange={(e) => setExempleActifId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-brand-primary/20 bg-brand-bg px-3 text-[13.5px] font-bold text-brand-text focus:border-brand-primary focus:outline-none"
                >
                  {exemples.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.titre} {ex.estPredefini ? '(Standard)' : '(Publié)'}
                    </option>
                  ))}
                </select>

                {estAdmin && exempleActif && !exempleActif.estPredefini && (
                  <button
                    type="button"
                    onClick={() => handleSupprimerCustom(exempleActif.id)}
                    title="Supprimer cet exemple"
                    className="h-10 px-3 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold shrink-0 flex items-center gap-1"
                  >
                    <Icone nom="trash-2" size={15} /> Retirer
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 mx-auto max-w-2xl bg-amber-50 border border-amber-200 rounded-lg p-3 text-[13px] text-amber-900 flex items-start text-left gap-3">
            <Icone nom="info" size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <p>
              <strong>Important :</strong> Les prix unitaires affichés ici sont donnés à titre indicatif. Dans votre espace personnel, <strong>vous pourrez configurer les prix des matériaux propres à votre entreprise et pays</strong>. Le logiciel générera alors vos devis automatiquement.
            </p>
          </div>
        </div>

        {/* CONTROLES TABS */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-lg bg-black/[0.04] p-1 flex-wrap justify-center">
            <button
              onClick={() => setVue('particulier')}
              className={`min-h-[44px] rounded px-6 text-[14px] font-bold transition-colors ${
                vue === 'particulier' ? 'bg-white text-brand-text shadow-sm' : 'text-brand-text/50 hover:text-brand-text'
              }`}
            >
              Modèle Particulier (Bordereau Matériaux)
            </button>
            <button
              onClick={() => setVue('entreprise')}
              className={`min-h-[44px] rounded px-6 text-[14px] font-bold transition-colors ${
                vue === 'entreprise' ? 'bg-white text-brand-text shadow-sm' : 'text-brand-text/50 hover:text-brand-text'
              }`}
            >
              Modèle Entreprise (Prix Client)
            </button>
          </div>
        </div>

        {/* CONTENU DU DEVIS */}
        <div className="rounded-xl bg-white p-2 sm:p-4 shadow-sm border border-brand-primary/10">
          <div className="p-4 bg-brand-primary/5 rounded-t-lg mb-4 flex flex-wrap items-center justify-between border-b border-brand-primary/10 gap-3">
             <div>
               <h3 className="font-bold text-brand-primary text-[13px] uppercase tracking-wide">Aperçu du document</h3>
               <p className="text-xs text-brand-text/60">Exportable en 1 clic en PDF ou fichier Excel modifiable.</p>
             </div>
             <div className="flex gap-2">
                <span className="px-3 py-1.5 bg-white border border-brand-primary/20 rounded text-xs font-bold text-brand-primary flex items-center gap-1 opacity-50 cursor-not-allowed">
                  <Icone nom="file-text" size={14} /> PDF
                </span>
                <span className="px-3 py-1.5 bg-white border border-brand-primary/20 rounded text-xs font-bold text-brand-primary flex items-center gap-1 opacity-50 cursor-not-allowed">
                  <Icone nom="table" size={14} /> Excel
                </span>
             </div>
          </div>
          
          <TableauDevis 
            devis={vue === 'particulier' ? devisParticulier : devisEntreprise} 
            type={vue} 
          />
        </div>

        {/* SECTION MARKETING SOCIAL PROOF */}
        <div className="mt-16 mb-16 rounded-2xl bg-brand-primary p-8 text-center text-white md:p-12">
          <h2 className="font-sans text-2xl font-bold md:text-3xl">Gagnez des heures sur chaque projet.</h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-white/80 leading-relaxed">
            Rejoignez les professionnels du BTP qui ont déjà automatisé la création de leurs devis. Ne passez plus vos nuits à calculer des quantités et des prix un par un.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/inscription"
              className="inline-flex min-h-[52px] items-center justify-center rounded-lg bg-brand-accent px-8 text-[15px] font-extrabold text-white shadow-lg transition-transform hover:scale-105"
            >
              Essayer gratuitement sur mon projet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
