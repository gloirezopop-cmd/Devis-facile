import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icone from '../components/ui/Icone.jsx';
import TableauDevis from '../components/sections/TableauDevis.jsx';

const DEVIS_PARTICULIER = {
  ordreLots: ['terrassement', 'fondation', 'elevation', 'dalle', 'finition', 'charpente', 'couverture', 'piedsDroit'],
  lots: {
    terrassement: {
      nom: 'TERRASSEMENT',
      sousTotal: 252183,
      lignes: [
        { designation: 'Installation chantier', unite: 'fft', quantite: 1, pu: 0, pt: 0 },
        { designation: 'Déblais', unite: 'Tonne', quantite: 26.079, pu: 3000, pt: 78237 },
        { designation: 'Remblais', unite: 'Tonne', quantite: 57.982, pu: 3000, pt: 173946 }
      ]
    },
    fondation: {
      nom: 'FONDATION',
      sousTotal: 1340576,
      lignes: [
        { designation: 'Ciment', unite: 'sac', quantite: 68, pu: 5500, pt: 374000 },
        { designation: 'Gravier', unite: 'Tonne', quantite: 20, pu: 13500, pt: 270000 },
        { designation: 'Sable', unite: 'Tonne', quantite: 15, pu: 8500, pt: 127500 },
        { designation: 'Eau', unite: 'Litre', quantite: 2592, pu: 18, pt: 46656 },
        { designation: 'Bois de coffrage', unite: 'm3', quantite: 2.241, pu: 120000, pt: 268920 },
        { designation: 'Clous', unite: 'Kg', quantite: 7, pu: 2700, pt: 18900 },
        { designation: 'Armature HA10', unite: 'Pièce', quantite: 10, pu: 6000, pt: 60000 },
        { designation: 'Armature HA8', unite: 'Pièce', quantite: 3, pu: 4800, pt: 14400 },
        { designation: 'Fil à ligaturer', unite: 'Kg', quantite: 6, pu: 1200, pt: 7200 },
        { designation: 'Moellon', unite: 'Tonne', quantite: 15, pu: 10200, pt: 153000 }
      ]
    },
    elevation: {
      nom: 'ELEVATION',
      sousTotal: 2697882,
      lignes: [
        { designation: 'Blocs de 15', unite: 'Pièce', quantite: 1971, pu: 300, pt: 591300 },
        { designation: 'Ciment', unite: 'sac', quantite: 123, pu: 5500, pt: 676500 },
        { designation: 'Gravier', unite: 'Tonne', quantite: 10, pu: 13500, pt: 135000 },
        { designation: 'Sable', unite: 'Tonne', quantite: 30, pu: 8500, pt: 255000 },
        { designation: 'Eau', unite: 'litre', quantite: 3369, pu: 18, pt: 60642 },
        { designation: 'Bois de coffrage', unite: 'm3', quantite: 3.942, pu: 120000, pt: 473040 },
        { designation: 'Clous', unite: 'kg', quantite: 12, pu: 2700, pt: 32400 },
        { designation: 'Armature HA10', unite: 'Pièce', quantite: 44, pu: 6000, pt: 264000 },
        { designation: 'Armature HA8', unite: 'Pièce', quantite: 37, pu: 4800, pt: 177600 },
        { designation: 'Fil à ligaturer', unite: 'kg', quantite: 27, pu: 1200, pt: 32400 }
      ]
    },
    dalle: {
      nom: 'DALLE',
      sousTotal: 3122604,
      lignes: [
        { designation: 'Ciment', unite: 'sac', quantite: 74, pu: 5500, pt: 407000 },
        { designation: 'Gravier', unite: 'Tonne', quantite: 20, pu: 13500, pt: 270000 },
        { designation: 'Sable', unite: 'Tonne', quantite: 10, pu: 8500, pt: 85000 },
        { designation: 'Eau', unite: 'litre', quantite: 1838, pu: 18, pt: 33084 },
        { designation: 'Bois de coffrage', unite: 'm3', quantite: 7.236, pu: 120000, pt: 868320 },
        { designation: 'Clous', unite: 'kg', quantite: 20, pu: 2700, pt: 54000 },
        { designation: 'Armature HA10', unite: 'Pièce', quantite: 218, pu: 6000, pt: 1308000 },
        { designation: 'Fil à ligaturer', unite: 'kg', quantite: 81, pu: 1200, pt: 97200 }
      ]
    },
    finition: {
      nom: 'FINITION',
      sousTotal: 4009312,
      lignes: [
        { designation: 'Carreaux', unite: 'Carton', quantite: 63, pu: 12000, pt: 756000 },
        { designation: 'Faïence', unite: 'Carton', quantite: 30, pu: 12000, pt: 360000 },
        { designation: 'Ciment gris', unite: 'sac', quantite: 56, pu: 5500, pt: 308000 },
        { designation: 'Ciment colle', unite: 'kg', quantite: 634, pu: 1800, pt: 1141200 },
        { designation: 'Sable', unite: 'Tonne', quantite: 20, pu: 8500, pt: 170000 },
        { designation: 'Eau', unite: 'litre', quantite: 1784, pu: 18, pt: 32112 },
        { designation: 'Latex', unite: 'kg', quantite: 72, pu: 7200, pt: 518400 },
        { designation: 'Peinture classique', unite: 'Litre', quantite: 58, pu: 9000, pt: 522000 },
        { designation: 'Chaux', unite: 'kg', quantite: 96, pu: 2100, pt: 201600 }
      ]
    },
    charpente: {
      nom: 'CHARPENTE',
      sousTotal: 363660,
      lignes: [
        { designation: 'Madrier 5/10', unite: 'm3', quantite: 1.128, pu: 120000, pt: 135360 },
        { designation: 'Panne 5/5', unite: 'm3', quantite: 0.3, pu: 120000, pt: 36000 },
        { designation: 'Clous', unite: 'kg', quantite: 25, pu: 2700, pt: 67500 },
        { designation: 'Peinture à bois', unite: 'litre', quantite: 16, pu: 7800, pt: 124800 }
      ]
    },
    couverture: {
      nom: 'COUVERTURE',
      sousTotal: 410100,
      lignes: [
        { designation: 'Tôles (BG 28)', unite: 'Pièce', quantite: 54, pu: 6600, pt: 356400 },
        { designation: 'Tôles faîtière', unite: 'pièce', quantite: 5, pu: 4800, pt: 24000 },
        { designation: 'Clous', unite: 'kg', quantite: 11, pu: 2700, pt: 29700 }
      ]
    },
    piedsDroit: {
      nom: 'PIEDS DROIT',
      sousTotal: 813900,
      lignes: [
        { designation: 'Chevron 5/5', unite: 'm3', quantite: 1.5, pu: 120000, pt: 180000 },
        { designation: 'Chevron 7/7', unite: 'm3', quantite: 4.9, pu: 120000, pt: 588000 },
        { designation: 'Clous', unite: 'kg', quantite: 17, pu: 2700, pt: 45900 }
      ]
    }
  },
  cascade: { totalMateriaux: 13010217, imprevus: 650511, transport: 650511, mainOeuvre: 3903065, honorairesArchi: 1040817, honorairesInge: 1040817 },
  total: 20295938
};

const DEVIS_ENTREPRISE = {
  ordreLots: ['preliminaire', 'fondation', 'elevation', 'finition', 'toiture'],
  niveaux: {
    preliminaire: {
      nom: 'INSTALLATION CHANTIER ET IMPLANTATION',
      sousTotal: 600000,
      lignes: [
        { designation: 'Installation chantier et Implantation', unite: 'fft', quantite: 1, pu: 600000, pt: 600000 }
      ]
    },
    fondation: {
      nom: 'FONDATION',
      sousTotal: 4796640,
      lignes: [
        { designation: 'Déblaiement', unite: 'm3', quantite: 17.386, pu: 10350, pt: 179845 },
        { designation: 'Remblaiement', unite: 'm3', quantite: 38.655, pu: 4656, pt: 179977 },
        { designation: 'Béton de propreté dosé à 150kg/m3', unite: 'm3', quantite: 1.398, pu: 120000, pt: 167760 },
        { designation: 'Semelles isolées en B.A dosé à 350kg/m3', unite: 'm3', quantite: 0.441, pu: 180000, pt: 79380 },
        { designation: 'Socle des colonnes en B.A dosé à 350kg/m3', unite: 'm3', quantite: 0.148, pu: 180000, pt: 26640 },
        { designation: 'Fondation en moellon', unite: 'm3', quantite: 10.953, pu: 180000, pt: 1971540 },
        { designation: 'Chape d\'égalisation en béton dosé à 250 Kg/m3', unite: 'm3', quantite: 1.217, pu: 150000, pt: 182550 },
        { designation: 'Béton de sous pavement dosé à 250 Kg/m3', unite: 'm3', quantite: 6.899, pu: 150000, pt: 1034850 }
      ]
    },
    elevation: {
      nom: 'ELEVATION',
      sousTotal: 3560340,
      lignes: [
        { designation: 'Colonnes en B.A dosé à 350kg/m3', unite: 'm3', quantite: 0.804, pu: 180000, pt: 144720 },
        { designation: 'Ceinture en B.A dosé à 350kg/m3', unite: 'm3', quantite: 2.504, pu: 180000, pt: 450720 },
        { designation: 'Maçonnerie de blocs creux de 15', unite: 'm2', quantite: 143.32, pu: 7500, pt: 1074900 },
        { designation: 'Dalle en B.A dosé à 350kg/m3', unite: 'm3', quantite: 10.5, pu: 180000, pt: 1890000 }
      ]
    },
    finition: {
      nom: 'FINITION',
      sousTotal: 1074900,
      lignes: [
        { designation: 'Le revêtement de sol et mur', unite: 'm2', quantite: 143.32, pu: 7500, pt: 1074900 }
      ]
    },
    toiture: {
      nom: 'CHARPENTE ET TOITURE',
      sousTotal: 1370130,
      lignes: [
        { designation: 'Charpente', unite: 'm3', quantite: 1.428, pu: 420000, pt: 599760 },
        { designation: 'Toiture', unite: 'm2', quantite: 51.358, pu: 15000, pt: 770370 }
      ]
    }
  },
  cascade: { totalTravaux: 11402010, honorairesArchi: 912161, honorairesInge: 912161 },
  total: 13226332
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
            Projet : Maison de plain-pied (Standard)
          </h1>
          <p className="mt-3 text-[14px] text-brand-text/60 max-w-2xl mx-auto">
            Explorez les deux modèles de devis générés par Devis Facile BTP. Le calcul des quantités et des prix se fait automatiquement à partir de votre plan.
          </p>
          <div className="mt-4 mx-auto max-w-2xl bg-amber-50 border border-amber-200 rounded-lg p-3 text-[13px] text-amber-900 flex items-start text-left gap-3">
            <Icone nom="info" size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <p>
              <strong>Important :</strong> Les prix unitaires affichés ici sont donnés à titre indicatif (Mercuriale du Cameroun). Dans votre espace personnel, <strong>vous pourrez configurer les prix des matériaux propres à votre pays</strong>. Le logiciel générera alors vos devis automatiquement avec vos propres tarifs.
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
