import React from 'react';
import ParametresProjet from '../components/sections/ParametresProjet.jsx';

/**
 * Paramètres du projet — hors du parcours guidé (Structure → Métré →
 * Résultats → Devis) : ce sont des réglages qu'on pose une fois puis qu'on
 * ne revisite qu'occasionnellement, pas une étape qu'on traverse à chaque
 * devis. Atteint depuis la sidebar (Compte → Paramètres).
 */
export default function Parametres() {
  return <ParametresProjet />;
}
