import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjetProvider } from './context/ProjetContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Metre from './pages/Metre.jsx';
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

              {/* Le parcours guidé en cinq étapes vit à /metre?etape=N.
                  /parametres et /devis sont des raccourcis d'entrée directe
                  vers l'étape correspondante — pas des pages séparées. */}
              <Route path="/metre" element={<Metre />} />
              <Route path="/parametres" element={<Navigate to="/metre?etape=1" replace />} />
              <Route path="/devis" element={<Navigate to="/metre?etape=5" replace />} />
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
