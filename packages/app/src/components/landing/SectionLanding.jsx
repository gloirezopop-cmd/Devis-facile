import React from 'react';
import styles from './SectionLanding.module.css';

/**
 * L'enveloppe d'une section de la page d'accueil : largeur, respiration,
 * en-tête. Chaque section la réutilise au lieu de refaire sa propre mise en
 * page — c'est ce qui empêche deux blocs voisins de dériver l'un par rapport à
 * l'autre au fil des retouches.
 */
export default function SectionLanding({
  id,
  fond = 'clair',
  surtitre,
  titre,
  chapeau,
  children,
}) {
  return (
    <section id={id} className={`${styles.section} ${styles[fond] || styles.clair}`}>
      <div className={styles.contenu}>
        {(surtitre || titre || chapeau) && (
          <header className={styles.entete}>
            {surtitre && <p className={styles.surtitre}>{surtitre}</p>}
            {titre && <h2 className={styles.titre}>{titre}</h2>}
            {chapeau && <p className={styles.chapeau}>{chapeau}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

/** La grille de cartes, exportée à part : toutes les sections n'en veulent pas. */
export function GrilleLanding({ children }) {
  return <div className={styles.grille}>{children}</div>;
}
