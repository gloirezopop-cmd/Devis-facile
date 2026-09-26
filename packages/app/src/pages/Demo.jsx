import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icone from '../components/ui/Icone.jsx';
import TableauDevis from '../components/sections/TableauDevis.jsx';

const DEVIS_PARTICULIER = {
  ordreLots: ['fondation', 'elevation', 'plancher'],
  lots: {
    fondation: {
      nom: 'Fondation',
      sousTotal: 1502500,
      lignes: [
        { designation: 'Fouilles en rigoles', unite: 'm3', quantite: 45, pu: 3500, pt: 157500 },
        { designation: 'Béton de propreté dosé à 150kg/m3', unite: 'm3', quantite: 5, pu: 65000, pt: 325000 },
        { designation: 'Semelles isolées dosées à 350kg/m3', unite: 'm3', quantite: 12, pu: 85000, pt: 1020000 }
      ]
    },
    elevation: {
      nom: 'Élévation',
      sousTotal: 2800000,
      lignes: [
        { designation: 'Maçonnerie en agglos de 20', unite: 'm2', quantite: 120, pu: 4500, pt: 540000 },
        { designation: 'Chaînage et linteaux', unite: 'ml', quantite: 80, pu: 8500, pt: 680000 },
        { designation: 'Poteaux en béton armé', unite: 'm3', quantite: 8, pu: 197500, pt: 1580000 }
      ]
    },
    plancher: {
      nom: 'Plancher Haut',
      sousTotal: 1450000,
      lignes: [
        { designation: 'Dalle nervurée 16+4', unite: 'm2', quantite: 95, pu: 12500, pt: 1187500 },
        { designation: 'Poutres en béton armé', unite: 'm3', quantite: 1.5, pu: 175000, pt: 262500 }
      ]
    }
  },
  cascade: { totalMateriaux: 5752500, imprevus: 287625, mainOeuvre: 1725750 },
  total: 7765875
};

const DEVIS_ENTREPRISE = {
  ordreLots: ['fondation', 'elevation', 'plancher'],
  niveaux: {
    fondation: {
      nom: 'Fondation',
      sousTotal: 2500000,
      lignes: [
        { designation: 'Fouilles en rigoles (Fourniture et Pose)', unite: 'm3', quantite: 45, pu: 5500, pt: 247500 },
        { designation: 'Béton de propreté dosé à 150kg/m3', unite: 'm3', quantite: 5, pu: 95000, pt: 475000 },
        { designation: 'Semelles isolées (F et P)', unite: 'm3', quantite: 12, pu: 148125, pt: 1777500 }
      ]
    },
    elevation: {
      nom: 'Élévation',
      sousTotal: 4600000,
      lignes: [
        { designation: 'Maçonnerie en agglos de 20 (F et P)', unite: 'm2', quantite: 120, pu: 8500, pt: 1020000 },
        { designation: 'Chaînage et linteaux (F et P)', unite: 'ml', quantite: 80, pu: 12500, pt: 1000000 },
        { designation: 'Poteaux en béton armé (F et P)', unite: 'm3', quantite: 8, pu: 322500, pt: 2580000 }
      ]
    },
    plancher: {
      nom: 'Plancher Haut',
      sousTotal: 2300000,
      lignes: [
        { designation: 'Dalle nervurée 16+4 (F et P)', unite: 'm2', quantite: 95, pu: 19500, pt: 1852500 },
        { designation: 'Poutres en béton armé (F et P)', unite: 'm3', quantite: 1.5, pu: 298333, pt: 447500 }
      ]
    }
  },
  cascade: { totalHT: 9400000, tva: 1809500, netAPayer: 11209500 },
  total: 11209500
};

export default function Demo() {
  const [vue, setVue] = useState('entreprise');

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      {/* BANDEAU D'ANNONCE MARKETING FIXE */}
      <div className="sticky top-0 z-50 bg-devis-herite px-4 py-3 text-center shadow-md">
        <p className="text-[13.5px] font-bold text-white flex flex-wrap items-center justify-center gap-2">
          <Icone nom="eye" size={16} />
          MODE DÉMONSTRATION : Voici le niveau de détail généré automatiquement.
          <Link to="/inscription" className="ml-2 inline-block rounded-full bg-white px-3 py-1 text-devis-herite hover:bg-black/10 transition-colors">
            Créer mon projet →
          </Link>
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-10">
        
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-interactive/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-interactive mb-3">
            Exemple de devis terminé
          </span>
          <h1 className="font-sans text-3xl font-extrabold text-brand-text md:text-4xl">
            Projet : Villa R+1 (Standing Moyen)
          </h1>
          <p className="mt-3 text-[14px] text-brand-text/60 max-w-2xl mx-auto">
            Explorez les deux modèles de devis générés par Devis Facile BTP. Le calcul des quantités et l'application des prix (fournitures / pose) se fait automatiquement à partir de votre métré.
          </p>
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

        {/* CONTENU DU DEVIS - Utilise exactement le composant officiel pour la cohérence parfaite */}
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
            devis={vue === 'particulier' ? DEVIS_PARTICULIER : DEVIS_ENTREPRISE} 
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
