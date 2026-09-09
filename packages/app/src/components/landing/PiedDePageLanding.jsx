import React from 'react';
import { Link } from 'react-router-dom';
import Icone from '../ui/Icone.jsx';
import BoutonCTA from './BoutonCTA.jsx';
import styles from './PiedDePageLanding.module.css';

/**
 * Le dernier appel à l'action, puis le pied de page.
 *
 * Les deux vont ensemble : quelqu'un qui a lu toute la page et n'a pas encore
 * cliqué ne doit pas arriver sur une impasse.
 */
export default function PiedDePageLanding() {
  return (
    <>
      <section className={styles.rappel}>
        <h2 className={styles.rappelTitre}>Votre prochain devis peut être prêt ce soir</h2>
        <p className={styles.rappelTexte}>
          Créez votre compte et lancez un premier métré. Vous verrez les quantités se
          calculer au fur et à mesure de votre saisie.
        </p>
        <div className={styles.rappelAction}>
          <BoutonCTA to="/login?mode=register">Créer mon compte</BoutonCTA>
        </div>
      </section>

      <footer className={styles.pied}>
        <div className={styles.pieContenu}>
          <Link to="/" className={styles.marque}>
            <span className={styles.jetonMarque}>
              <Icone nom="grid" size={17} />
            </span>
            Devis Facile BTP
          </Link>

          <ul className={styles.liensPied}>
            <li>
              <a href="#fonctionnalites" className={styles.lienPied}>Fonctionnalités</a>
            </li>
            <li>
              <a href="#etapes" className={styles.lienPied}>Comment ça marche</a>
            </li>
            <li>
              <Link to="/login" className={styles.lienPied}>Se connecter</Link>
            </li>
          </ul>

          <p className={styles.mention}>
            © {new Date().getFullYear()} Devis Facile BTP
          </p>
        </div>
      </footer>
    </>
  );
}
