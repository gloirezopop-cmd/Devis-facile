import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './BoutonCTA.module.css';

/**
 * Le bouton d'appel à l'action, réutilisable partout sur la page d'accueil.
 *
 * Il existe en deux variantes — `principal` (plein, orange) et `secondaire`
 * (sobre, encadré) — pour qu'une page ne puisse pas se retrouver avec deux
 * boutons qui se disputent le regard : la hiérarchie est portée par le
 * composant, pas laissée à chaque appel.
 *
 * L'animation d'appui part du point réellement cliqué. Les ondes sont retirées
 * à la fin de leur course, sinon elles s'empilent dans le DOM à chaque clic.
 */
export default function BoutonCTA({
  to,
  href,
  variante = 'principal',
  avecFleche = true,
  children,
  ...reste
}) {
  const [ondes, setOndes] = useState([]);
  const prochaineId = useRef(0);

  const declencherOnde = useCallback((evenement) => {
    const boite = evenement.currentTarget.getBoundingClientRect();
    const id = prochaineId.current;
    prochaineId.current += 1;

    setOndes((precedentes) => [
      ...precedentes,
      { id, x: evenement.clientX - boite.left, y: evenement.clientY - boite.top },
    ]);

    // 620 ms : la durée exacte de l'animation dans la feuille de style.
    window.setTimeout(() => {
      setOndes((precedentes) => precedentes.filter((o) => o.id !== id));
    }, 620);
  }, []);

  const classes = `${styles.bouton} ${styles[variante] || styles.principal}`;

  const contenu = (
    <>
      {children}
      {avecFleche && (
        <span className={styles.fleche} aria-hidden="true">→</span>
      )}
      {ondes.map((onde) => (
        <span
          key={onde.id}
          className={styles.onde}
          style={{ '--onde-x': `${onde.x}px`, '--onde-y': `${onde.y}px` }}
        />
      ))}
    </>
  );

  // Un lien interne passe par le routeur, un lien externe par une ancre : le
  // premier ne doit pas recharger l'application, le second doit sortir.
  if (to) {
    return (
      <Link to={to} className={classes} onPointerDown={declencherOnde} {...reste}>
        {contenu}
      </Link>
    );
  }

  return (
    <a href={href} className={classes} onPointerDown={declencherOnde} {...reste}>
      {contenu}
    </a>
  );
}
