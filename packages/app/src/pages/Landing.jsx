import React from 'react';
import { Link } from 'react-router-dom';
import Icone from '../components/ui/Icone.jsx';

export default function Landing() {
  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-accent/20">
      {/* Navbar */}
      <nav className="border-b border-brand-primary/10 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
              <Icone nom="grid" className="text-brand-accent" size={20} />
            </div>
            <span className="font-bold text-xl text-brand-primary tracking-tight">DEVIS Facile BTP</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-brand-primary hover:text-brand-accent transition-colors">
              Se connecter
            </Link>
            <Link to="/login?mode=register" className="text-sm font-bold bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary-dark transition-colors shadow-sm">
              S'inscrire
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <div className="relative overflow-hidden bg-white">
          <div className="absolute inset-y-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative z-10 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-brand-primary tracking-tight mb-6">
              Du métré au devis, <br className="hidden md:block" />
              <span className="text-brand-accent relative">
                sans calculs compliqués.
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-brand-accent/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
                </svg>
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-brand-text/70 max-w-2xl mx-auto mb-10 font-serif leading-relaxed">
              Calcule tes quantités, prépare tes devis professionnels et retrouve tes projets depuis ton téléphone, où que tu sois.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login?mode=register" className="w-full sm:w-auto px-8 py-3.5 bg-brand-accent text-white font-bold rounded-xl shadow-lg shadow-brand-accent/30 hover:bg-[#e0893a] transition-all hover:-translate-y-0.5 text-base uppercase tracking-wide">
                Essayer gratuitement
              </Link>
              <Link to="/login" className="w-full sm:w-auto px-8 py-3.5 bg-white text-brand-primary font-bold rounded-xl border-2 border-brand-primary/10 hover:border-brand-primary/30 transition-all text-base uppercase tracking-wide flex items-center justify-center">
                Accéder à l'application
              </Link>
            </div>
            
            {/* Social Proof / Trust */}
            <div className="mt-12 pt-8 border-t border-brand-primary/5">
              <p className="text-sm font-semibold text-brand-text/40 uppercase tracking-widest mb-4">
                Conçu pour les pros du BTP
              </p>
              <div className="flex justify-center gap-8 text-brand-text/30 grayscale opacity-70">
                {/* Dummy logos for trust layout */}
                <div className="flex items-center gap-2 font-bold"><Icone nom="check-circle" /> Précision garantie</div>
                <div className="flex items-center gap-2 font-bold hidden sm:flex"><Icone nom="check-circle" /> Mobile-first</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-24 bg-brand-bg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-brand-primary mb-4">Un outil complet pour votre activité</h2>
              <p className="text-brand-text/60 font-serif max-w-xl mx-auto">
                Chaque étape de la conception à la remise du prix a été pensée pour gagner du temps tout en gardant une précision millimétrique.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: 'ruler', title: 'Métré', desc: 'Saisie rapide des dimensions. Le moteur s\'occupe des déductions complexes.' },
                { icon: 'bar-chart', title: 'Calculs Automatiques', desc: 'Décomposition instantanée des matériaux selon les règles de l\'art.' },
                { icon: 'file-text', title: 'Notes de Calcul', desc: 'Trace détaillée de chaque formule pour vérifier et justifier vos métrés.' },
                { icon: 'list', title: 'Devis', desc: 'Création de bordereaux professionnels avec gestion des prix et marges.' },
                { icon: 'check-square', title: 'Export Excel/PDF', desc: 'Partagez un rendu pro à vos clients, modifiable sous Excel si besoin.' },
                { icon: 'folder', title: 'Gestion de Projets', desc: 'Tous vos chantiers classés, archivés et accessibles partout.' },
              ].map((f, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-brand-primary/5 hover:border-brand-primary/20 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-brand-primary/5 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-primary group-hover:text-white transition-colors text-brand-primary">
                    <Icone nom={f.icon} size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-brand-primary mb-2">{f.title}</h3>
                  <p className="text-brand-text/70 text-sm font-serif leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer minimal */}
      <footer className="bg-white py-8 border-t border-brand-primary/10 text-center">
        <p className="text-brand-text/40 text-sm">
          &copy; {new Date().getFullYear()} DEVIS Facile BTP. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
