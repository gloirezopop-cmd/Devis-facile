import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Icone from '../components/ui/Icone';

const PAYS = [
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+32', flag: '🇧🇪', name: 'Belgique' },
  { code: '+41', flag: '🇨🇭', name: 'Suisse' },
  { code: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: '+225', flag: '🇨🇮', name: "Côte d'Ivoire" },
  { code: '+221', flag: '🇸🇳', name: 'Sénégal' },
  { code: '+237', flag: '🇨🇲', name: 'Cameroun' },
  { code: '+243', flag: '🇨🇩', name: 'RD Congo' },
  { code: '+241', flag: '🇬🇦', name: 'Gabon' },
  { code: '+228', flag: '🇹🇬', name: 'Togo' },
  { code: '+229', flag: '🇧🇯', name: 'Bénin' },
  { code: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
  { code: '+242', flag: '🇨🇬', name: 'Congo' },
  { code: '+223', flag: '🇲🇱', name: 'Mali' },
  { code: '+222', flag: '🇲🇷', name: 'Mauritanie' },
  { code: '+224', flag: '🇬🇳', name: 'Guinée' },
  { code: '+235', flag: '🇹🇩', name: 'Tchad' },
  { code: '+236', flag: '🇨🇫', name: 'Centrafrique' },
  { code: '+257', flag: '🇧🇮', name: 'Burundi' },
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+261', flag: '🇲🇬', name: 'Madagascar' },
  { code: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: '+213', flag: '🇩🇿', name: 'Algérie' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisie' },
  { code: '+230', flag: '🇲🇺', name: 'Île Maurice' },
  { code: '+1', flag: '🇺🇸', name: 'États-Unis' },
  { code: '+44', flag: '🇬🇧', name: 'Royaume-Uni' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+27', flag: '🇿🇦', name: 'Afrique du Sud' },
  { code: '+509', flag: '🇭🇹', name: 'Haïti' },
  { code: '+227', flag: '🇳🇪', name: 'Niger' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function Login() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState('login'); // 'login', 'register', 'reset'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [indicatif, setIndicatif] = useState('+225');
  const [telephone, setTelephone] = useState('');
  
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setView('register');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (view === 'register' && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    if (view === 'reset') {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setSuccessMsg("Un e-mail de réinitialisation a été envoyé si ce compte existe.");
        setView('login');
      }
      setLoading(false);
      return;
    }

    let result;
    if (view === 'register') {
      result = await signUp(email, password, { first_name: prenom, last_name: nom, phone: `${indicatif}${telephone}` });
    } else {
      result = await signIn(email, password);
    }
    const { error } = result;

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('E-mail ou mot de passe incorrect.');
      } else if (error.message.includes('User already registered')) {
        setError('Cet e-mail est déjà utilisé.');
      } else {
        setError(error.message);
      }
    } else {
      if (view === 'register') {
        setSuccessMsg('Inscription réussie ! Vous pouvez maintenant vous connecter.');
        setView('login');
      } else {
        navigate('/dashboard');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row">
      {/* Côté gauche : Formulaire */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white relative">
        <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-brand-primary font-bold hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
            <Icone nom="grid" className="text-brand-accent" size={20} />
          </div>
          DEVIS Facile BTP
        </Link>
        
        <div className="mx-auto w-full max-w-sm mt-12 md:mt-0">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-brand-primary font-sans">
              {view === 'login' && "Bon retour"}
              {view === 'register' && "Créez votre compte"}
              {view === 'reset' && "Mot de passe oublié"}
            </h2>
            <p className="mt-2 text-sm text-brand-text/70 font-serif">
              {view === 'login' && "Connectez-vous pour retrouver vos projets et devis."}
              {view === 'register' && "C'est gratuit pour commencer, sans carte bancaire."}
              {view === 'reset' && "Entrez votre e-mail pour recevoir un lien de réinitialisation."}
            </p>
          </div>

          {(error || successMsg) && (
            <div className={`rounded-xl p-4 mb-6 border ${error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex gap-3">
                <Icone nom={error ? "alert-circle" : "check-circle"} size={20} className={error ? "text-red-500" : "text-green-600"} />
                <div className={`text-sm ${error ? "text-red-800" : "text-green-800"}`}>
                  {error || successMsg}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {view === 'register' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="prenom" className="block text-sm font-bold text-brand-primary mb-1">
                    Prénom
                  </label>
                  <input
                    id="prenom"
                    type="text"
                    required
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="block w-full px-3 py-2.5 border-2 border-brand-primary/10 rounded-xl focus:ring-0 focus:border-brand-primary transition-colors text-brand-text placeholder-brand-text/30"
                    placeholder="Jean"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="nom" className="block text-sm font-bold text-brand-primary mb-1">
                    Nom
                  </label>
                  <input
                    id="nom"
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="block w-full px-3 py-2.5 border-2 border-brand-primary/10 rounded-xl focus:ring-0 focus:border-brand-primary transition-colors text-brand-text placeholder-brand-text/30"
                    placeholder="Dupont"
                  />
                </div>
              </div>
            )}

            {view === 'register' && (
              <div>
                <label htmlFor="telephone" className="block text-sm font-bold text-brand-primary mb-1">
                  Numéro de téléphone
                </label>
                <div className="flex gap-2">
                  <select
                    value={indicatif}
                    onChange={(e) => setIndicatif(e.target.value)}
                    className="w-28 pl-2 pr-6 py-2.5 border-2 border-brand-primary/10 rounded-xl focus:ring-0 focus:border-brand-primary transition-colors text-brand-text bg-white"
                  >
                    {PAYS.map(p => (
                      <option key={p.name} value={p.code}>
                        {p.flag} {p.code}
                      </option>
                    ))}
                  </select>
                  <input
                    id="telephone"
                    type="tel"
                    required
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="block w-full px-3 py-2.5 border-2 border-brand-primary/10 rounded-xl focus:ring-0 focus:border-brand-primary transition-colors text-brand-text placeholder-brand-text/30"
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-brand-primary mb-1">
                Adresse e-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-text/40">
                  <Icone nom="mail" size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border-2 border-brand-primary/10 rounded-xl focus:ring-0 focus:border-brand-primary transition-colors text-brand-text placeholder-brand-text/30"
                  placeholder="pro@exemple.com"
                />
              </div>
            </div>

            {view !== 'reset' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-sm font-bold text-brand-primary">
                    Mot de passe
                  </label>
                  {view === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setView('reset'); setError(null); setSuccessMsg(null); }}
                      className="text-xs font-bold text-brand-interactive hover:underline"
                    >
                      Oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-text/40">
                    <Icone nom="lock" size={18} />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border-2 border-brand-primary/10 rounded-xl focus:ring-0 focus:border-brand-primary transition-colors text-brand-text placeholder-brand-text/30"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {view === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-brand-primary mb-1">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-text/40">
                    <Icone nom="lock" size={18} />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border-2 border-brand-primary/10 rounded-xl focus:ring-0 focus:border-brand-primary transition-colors text-brand-text placeholder-brand-text/30"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-70 transition-all uppercase tracking-wide mt-2"
            >
              {loading ? (
                <Icone nom="loader" className="animate-spin" size={18} />
              ) : (
                view === 'login' ? 'Se connecter' :
                view === 'register' ? "S'inscrire" :
                'Réinitialiser'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            {view === 'login' ? (
              <p className="text-brand-text/70">
                Pas encore de compte ?{' '}
                <button onClick={() => { setView('register'); setError(null); }} className="font-bold text-brand-primary hover:text-brand-accent transition-colors">
                  Créez-en un gratuitement
                </button>
              </p>
            ) : view === 'register' ? (
              <p className="text-brand-text/70">
                Vous avez déjà un compte ?{' '}
                <button onClick={() => { setView('login'); setError(null); }} className="font-bold text-brand-primary hover:text-brand-accent transition-colors">
                  Connectez-vous
                </button>
              </p>
            ) : (
              <button onClick={() => { setView('login'); setError(null); }} className="font-bold text-brand-primary hover:text-brand-accent transition-colors flex items-center justify-center gap-1 mx-auto">
                <Icone nom="arrow-left" size={16} /> Retour à la connexion
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Côté droit : Réassurance (caché sur mobile) */}
      <div className="hidden md:flex flex-1 bg-brand-primary flex-col justify-center items-center text-white px-12 relative overflow-hidden">
        {/* Motif de fond */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
        
        <div className="relative z-10 max-w-md">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm border border-white/10">
            <Icone nom="check-circle" size={32} className="text-brand-accent" />
          </div>
          <h3 className="text-3xl font-bold mb-4">Gagnez du temps sur vos devis.</h3>
          <ul className="space-y-4 font-serif text-white/80">
            <li className="flex items-start gap-3">
              <Icone nom="check" size={20} className="text-brand-accent shrink-0 mt-0.5" />
              <span>Calcul des quantités automatisé (béton, acier, coffrage, etc.)</span>
            </li>
            <li className="flex items-start gap-3">
              <Icone nom="check" size={20} className="text-brand-accent shrink-0 mt-0.5" />
              <span>Génération instantanée de la note de calcul pour vos clients</span>
            </li>
            <li className="flex items-start gap-3">
              <Icone nom="check" size={20} className="text-brand-accent shrink-0 mt-0.5" />
              <span>Interface pensée pour le mobile, directement sur le chantier</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
