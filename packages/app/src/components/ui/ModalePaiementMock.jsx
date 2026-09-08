import React, { useState } from 'react';
import Icone from './Icone.jsx';

export default function ModalePaiementMock({ isOpen, onClose }) {
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePay = (lien) => {
    setProcessing(true);
    
    // Redirection vers le lien de paiement Chariow (statique pour l'instant)
    window.open(lien, '_blank');
    
    // On affiche l'écran de confirmation d'attente
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary-dark/90 backdrop-blur-sm">
      <div className="bg-brand-bg rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-brand-primary p-6 text-white text-center relative border-b border-white/10">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/10 rounded-full p-1"
          >
            <Icone nom="x" size={24} />
          </button>
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Icone nom="unlock" size={32} className="text-brand-accent" />
          </div>
          <h2 className="text-2xl font-bold font-sans">Passez à la vitesse supérieure</h2>
          <p className="text-[15px] text-white/80 mt-2 font-serif max-w-lg mx-auto">
            Débloquez toutes les fonctionnalités de DEVIS Facile BTP pour chiffrer plus vite et plus précisément.
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {success ? (
            <div className="text-center py-12 max-w-md mx-auto">
              <div className="w-20 h-20 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icone nom="loader" size={40} className="text-brand-accent animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-brand-primary mb-3">Paiement en cours...</h3>
              <p className="text-brand-text/70 mb-8 leading-relaxed font-serif">
                Si vous avez effectué le paiement via notre partenaire sécurisé, votre compte sera automatiquement mis à jour d'ici quelques instants.
              </p>
              <button 
                onClick={onClose}
                className="bg-brand-primary text-white font-bold px-8 py-3 rounded-lg hover:bg-brand-primary-dark transition-colors w-full"
              >
                Fermer cette fenêtre
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Option 1: Calcul */}
              <div className="rounded-xl border border-brand-primary/10 bg-white p-5 flex flex-col hover:border-brand-primary/30 hover:shadow-md transition-all">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-brand-primary uppercase tracking-wide">Calcul</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-brand-text">3 500</span>
                    <span className="text-brand-text/50 font-bold text-sm">FCFA/mois</span>
                  </div>
                  <p className="text-xs text-brand-text/60 mt-1 font-serif">Sans engagement</p>
                </div>
                
                <ul className="space-y-3 mb-6 flex-1 text-sm text-brand-text/80">
                  <li className="flex items-start gap-2"><Icone nom="check" size={16} className="text-green-500 shrink-0 mt-0.5" /> Accès au module de métré</li>
                  <li className="flex items-start gap-2"><Icone nom="check" size={16} className="text-green-500 shrink-0 mt-0.5" /> Notes de calcul détaillées</li>
                  <li className="flex items-start gap-2"><Icone nom="check" size={16} className="text-green-500 shrink-0 mt-0.5" /> Sauvegarde locale</li>
                </ul>
                
                <button 
                  onClick={() => handlePay('https://paiement.chariow.com/calcul')}
                  disabled={processing}
                  className="w-full py-3 rounded-lg border-2 border-brand-primary text-brand-primary font-bold hover:bg-brand-primary hover:text-white transition-colors"
                >
                  Choisir l'offre Calcul
                </button>
              </div>

              {/* Option 2: PRO */}
              <div className="rounded-xl border-2 border-brand-accent bg-brand-accent/5 p-5 flex flex-col relative transform md:-translate-y-4 shadow-xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-accent text-white text-[10px] font-bold uppercase tracking-widest py-1 px-4 rounded-full shadow-sm whitespace-nowrap">
                  Le plus populaire
                </div>
                
                <div className="mb-4 pt-2">
                  <h3 className="text-lg font-bold text-brand-primary uppercase tracking-wide">PRO</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-mono text-brand-text">5 500</span>
                    <span className="text-brand-text/50 font-bold text-sm">FCFA/mois</span>
                  </div>
                  <p className="text-xs text-brand-text/60 mt-1 font-serif">Sans engagement</p>
                </div>
                
                <ul className="space-y-3 mb-6 flex-1 text-sm text-brand-text/80 font-medium">
                  <li className="flex items-start gap-2"><Icone nom="check" size={16} className="text-brand-accent shrink-0 mt-0.5" /> <strong>Tout de l'offre Calcul</strong></li>
                  <li className="flex items-start gap-2"><Icone nom="check" size={16} className="text-brand-accent shrink-0 mt-0.5" /> Génération de devis (PDF/Excel)</li>
                  <li className="flex items-start gap-2"><Icone nom="check" size={16} className="text-brand-accent shrink-0 mt-0.5" /> Personnalisation avec logo</li>
                  <li className="flex items-start gap-2"><Icone nom="check" size={16} className="text-brand-accent shrink-0 mt-0.5" /> Synchronisation Cloud</li>
                </ul>
                
                <button 
                  onClick={() => handlePay('https://paiement.chariow.com/pro')}
                  disabled={processing}
                  className="w-full py-3 rounded-lg bg-brand-accent text-white font-bold hover:bg-[#e0893a] shadow-md transition-colors"
                >
                  Choisir l'offre PRO
                </button>
              </div>

              {/* Option 3: Annuel */}
              <div className="rounded-xl border border-brand-primary/10 bg-white p-5 flex flex-col hover:border-brand-primary/30 hover:shadow-md transition-all">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-brand-primary uppercase tracking-wide">PRO Annuel</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-brand-text">50 000</span>
                    <span className="text-brand-text/50 font-bold text-sm">FCFA/an</span>
                  </div>
                  <p className="text-[11px] font-bold text-green-600 mt-1 uppercase tracking-wide bg-green-50 inline-block px-2 py-0.5 rounded">
                    Économisez 16 000 FCFA
                  </p>
                </div>
                
                <ul className="space-y-3 mb-6 flex-1 text-sm text-brand-text/80">
                  <li className="flex items-start gap-2"><Icone nom="check" size={16} className="text-green-500 shrink-0 mt-0.5" /> <strong>Toutes les options PRO</strong></li>
                  <li className="flex items-start gap-2"><Icone nom="check" size={16} className="text-green-500 shrink-0 mt-0.5" /> Facturation une fois par an</li>
                  <li className="flex items-start gap-2"><Icone nom="check" size={16} className="text-green-500 shrink-0 mt-0.5" /> 2 mois offerts</li>
                </ul>
                
                <button 
                  onClick={() => handlePay('https://paiement.chariow.com/annuel')}
                  disabled={processing}
                  className="w-full py-3 rounded-lg border-2 border-brand-primary text-brand-primary font-bold hover:bg-brand-primary hover:text-white transition-colors"
                >
                  S'engager 1 an
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
