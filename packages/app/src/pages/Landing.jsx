import React from 'react';
import EnTeteLanding from '../components/landing/EnTeteLanding.jsx';
import HerosLanding from '../components/landing/HerosLanding.jsx';
import SectionEtapes from '../components/landing/SectionEtapes.jsx';
import SectionFonctionnalites from '../components/landing/SectionFonctionnalites.jsx';
import PiedDePageLanding from '../components/landing/PiedDePageLanding.jsx';
import styles from './Landing.module.css';

/**
 * La page d'accueil publique — le point d'entrée du site.
 *
 * Elle n'assemble que des composants : tout ce qui relève de l'apparence vit
 * dans les fichiers `.module.css` voisins, jamais dans un attribut `style`.
 * Les noms de classes y sont locaux, ce qui permet d'écrire `.titre` ou
 * `.carte` sans craindre de heurter le reste de l'application.
 */
export default function Landing() {
  return (
    <div className={styles.page}>
      <EnTeteLanding />
      <main>
        <HerosLanding />
        <SectionEtapes />
        <SectionFonctionnalites />
      </main>
      <PiedDePageLanding />
    </div>
  );
}
