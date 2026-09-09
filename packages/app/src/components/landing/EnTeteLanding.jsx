import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icone from '../ui/Icone.jsx';
import BoutonCTA from './BoutonCTA.jsx';
import styles from './EnTeteLanding.module.css';

/**
 * L'en-tête de la page d'accueil.
 *
 * Les entrées du menu sont déclarées une seule fois : le panneau du téléphone
 * et la barre du bureau lisent la même liste, si bien qu'un lien ajouté
 * apparaît des deux côtés sans risque d'oubli.
 */
const LIENS = [
  { libelle: 'Fonctionnalités', ancre: '#fonctionnalites' },
  { libelle: 'Comment ça marche', ancre: '#etapes' },
];

export default function EnTeteLanding() {
  const [ouvert, setOuvert] = useState(false);
  const [pose, setPose] = useState(false);

  // Au premier défilement, la barre prend son ombre. `passive` : on ne fait que
  // lire la position, jamais annuler l'événement — sans ce drapeau le
  // navigateur doit attendre notre réponse avant de dérouler la page.
  useEffect(() => {
    const surDefilement = () => setPose(window.scrollY > 8);
    surDefilement();
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
  }, []);

  // Un menu resté ouvert par-dessus la page après un clic sur une ancre est une
  // gêne : on le referme dès qu'on navigue.
  const fermer = () => setOuvert(false);

  return (
    <header className={`${styles.entete} ${pose ? styles.pose : ''}`}>
      <div className={styles.barre}>
        <Link to="/" className={styles.logo} onClick={fermer}>
          <span className={styles.marque}>
            <Icone nom="grid" size={19} />
          </span>
          <span className={styles.nomMarque}>Devis Facile BTP</span>
        </Link>

        <button
          type="button"
          className={`${styles.bascule} ${ouvert ? styles.ouvert : ''}`}
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          aria-controls="menu-principal"
          aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          <span className={styles.trait} />
          <span className={styles.trait} />
          <span className={styles.trait} />
        </button>

        <nav
          id="menu-principal"
          className={`${styles.navigation} ${ouvert ? styles.deploye : ''}`}
        >
          <ul className={styles.liste}>
            {LIENS.map((lien) => (
              <li key={lien.ancre}>
                <a href={lien.ancre} className={styles.lien} onClick={fermer}>
                  {lien.libelle}
                </a>
              </li>
            ))}
            <li>
              <Link to="/login" className={styles.lien} onClick={fermer}>
                Se connecter
              </Link>
            </li>
            <li className={styles.actionEntete}>
              <BoutonCTA to="/login?mode=register" avecFleche={false} onClick={fermer}>
                S'inscrire
              </BoutonCTA>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
