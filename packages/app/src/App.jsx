import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjetProvider } from './context/ProjetContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Metre from './pages/Metre.jsx';
import Parametres from './pages/Parametres.jsx';
import Projets from './pages/Projets.jsx';
import EditeurAvance from './pages/EditeurAvance.jsx';
import EmptyState from './components/ui/EmptyState.jsx';
import { NAVIGATION, ROUTES_ACTIVES } from './components/layout/navigation.js';

// Entrées de menu sans page construite : un EmptyState honnête, jamais une
// page inventée. `NAVIGATION` reste la source unique des libellés/icônes.
const routesEnAttente = NAVIGATION.flatMap((section) => section.liens).filter(
  (lien) => !ROUTES_ACTIVES.has(lien.to),
);

export default function App() {
  return (
    <ProjetProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />

              {/* Le parcours guidé (Structure -> Métré -> Résultats -> Devis)
                  vit à /metre?etape=N. /devis est un raccourci vers sa
                  dernière étape. /parametres est une page séparée, en dehors
                  du parcours : ce sont des réglages qu'on pose une fois. */}
              <Route path="/metre" element={<Metre />} />
              <Route path="/parametres" element={<Parametres />} />
              <Route path="/projets" element={<Projets />} />
              <Route path="/devis" element={<Navigate to="/metre?etape=4" replace />} />
              <Route path="/devis/avance" element={<EditeurAvance />} />

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
  );
}
