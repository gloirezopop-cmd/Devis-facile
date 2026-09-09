import React from 'react';
import Icone from '../ui/Icone.jsx';
import { useRevelationAuDefilement } from '../../hooks/useRevelationAuDefilement.js';
import styles from './CarteFonctionnalite.module.css';

/**
 * Une carte de fonctionnalité, réutilisable partout où l'on présente une
 * capacité du produit.
 *
 * Elle porte sa propre apparition : la grille qui la contient n'a rien à
 * orchestrer, elle se contente de passer un rang pour décaler l'entrée.
 */
export default function CarteFonctionnalite({ icone, titre, description, rang = 0 }) {
  const { reference, visible } = useRevelationAuDefilement();

  return (
    <article
      ref={reference}
      className={`${styles.carte} ${visible ? styles.visible : ''}`}
      style={{ '--retard': `${Math.min(rang, 5) * 70}ms` }}
    >
      <span className={styles.jeton}>
        <Icone nom={icone} size={23} />
      </span>
      <h3 className={styles.titre}>{titre}</h3>
      <p className={styles.description}>{description}</p>
    </article>
  );
}
