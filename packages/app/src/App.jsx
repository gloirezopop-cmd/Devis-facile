import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjetProvider } from './context/ProjetContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EstimationBudget from './pages/EstimationBudget.jsx';
import Admin from './pages/Admin.jsx';
import AdminTarifs from './pages/AdminTarifs.jsx';
import Metre from './pages/Metre.jsx';
import Parametres from './pages/Parametres.jsx';
import Projets from './pages/Projets.jsx';
import EditeurAvance from './pages/EditeurAvance.jsx';
import Login from './pages/Login.jsx';
import Apprendre from './pages/Apprendre.jsx';
import CoursLecture from './pages/CoursLecture.jsx';
import Landing from './pages/Landing.jsx';
import SujetListe from './pages/SujetListe.jsx';
import SujetSession from './pages/SujetSession.jsx';
import EmptyState from './components/ui/EmptyState.jsx';
import PaiementSucces from './pages/PaiementSucces.jsx';
import PaiementAnnule from './pages/PaiementAnnule.jsx';
import { Protege } from './components/offres/EcranVerrou.jsx';
import { NAVIGATION, ROUTES_ACTIVES } from './components/layout/navigation.js';

// Entrées de menu sans page construite : un EmptyState honnête, jamais une
// page inventée. `NAVIGATION` reste la source unique des libellés/icônes.
const routesEnAttente = NAVIGATION.flatMap((section) => section.liens).filter(
  (lien) => !ROUTES_ACTIVES.has(lien.to),
);

function PrivateRoute({ children }) {
  const { session, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function HomeRoute() {
  const { session, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }
  
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Landing />;
}

export default function App() {
  return (
    <AuthProvider>
      <ProjetProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              {/* La page d'accueil, toujours accessible. Sans elle, un compte
                  connecte ne peut plus jamais la voir : « / » le renvoie
                  aussitot vers son tableau de bord, ce qui est le bon
                  comportement pour lui mais empeche de relire la page. */}
              <Route path="/accueil" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              
              <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/estimation" element={<EstimationBudget />} />
                {/* Ces deux pages ne sont pas gardées par une route : c'est la
                    base qui refuse de répondre à un compte non administrateur
                    (RLS sur `construction_rates`, `est_admin()` dans
                    `statistiques_admin`). Elles s'affichent alors vides, ce qui
                    est le comportement voulu — un utilisateur curieux n'y
                    trouve rien. */}
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/tarifs" element={<AdminTarifs />} />

                {/* Le parcours guidé (Structure -> Métré -> Résultats -> Devis)
                    vit à /metre?etape=N. /devis est un raccourci vers sa
                    dernière étape. /parametres est une page séparée, en dehors
                    du parcours : ce sont des réglages qu'on pose une fois. */}
                <Route path="/metre" element={<Metre />} />
                <Route path="/parametres" element={<Parametres />} />
                <Route path="/projets" element={<Projets />} />

                {/* Adresses de retour de l'opérateur de paiement. Aucune des
                    deux n'accorde quoi que ce soit : c'est le serveur qui
                    enregistre l'abonnement après vérification. */}
                <Route path="/paiement/succes" element={<PaiementSucces />} />
                <Route path="/paiement/annule" element={<PaiementAnnule />} />
                <Route path="/devis" element={<Navigate to="/metre?etape=4" replace />} />
                {/* L'éditeur avancé travaille sur le devis : il relève donc de
                    la même formule que le devis lui-même. */}
                <Route
                  path="/devis/avance"
                  element={(
                    <Protege
                      source="DEVIS"
                      description="L'éditeur avancé permet de retoucher votre devis poste par poste. Il fait partie de la formule Devis Complet."
                    >
                      <EditeurAvance />
                    </Protege>
                  )}
                />
                
                <Route path="/apprendre" element={<Apprendre />} />
                <Route path="/apprendre/cours/:id" element={<CoursLecture />} />
                

                {/* 60 Sujets */}
                <Route path="/sujets" element={<SujetListe />} />
                <Route path="/sujets/:sujetId" element={<SujetSession />} />

                {routesEnAttente.map((lien) => (
                  <Route
                    key={lien.to}
                    path={lien.to}
                    element={<EmptyState icone={lien.icone} titre={lien.label} texte="Bientôt disponible." />}
                  />
                ))}
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ProjetProvider>
    </AuthProvider>
  );
}
