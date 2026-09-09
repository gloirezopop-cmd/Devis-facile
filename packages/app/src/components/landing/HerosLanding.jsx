import React, { useState } from 'react';
import Icone from '../ui/Icone.jsx';
import BoutonCTA from './BoutonCTA.jsx';
import IconesFlottantes from './IconesFlottantes.jsx';
import styles from './HerosLanding.module.css';

/** Ce que l'outil tient vraiment — pas des promesses de marque. */
const PREUVES = [
  'Fonctionne sur téléphone',
  'Quantités et prix détaillés',
  'Export PDF, Excel, impression',
];

/**
 * La première section de la page d'accueil.
 *
 * L'image d'aperçu est déposée dans `public/` : elle n'est pas importée, pour
 * que son remplacement ne demande aucune recompilation. Si le fichier manque,
 * un substitut prend sa place — un cadre vide vaut mieux qu'une icône d'image
 * cassée sur la première chose que voit un visiteur.
 */
export default function HerosLanding({ image = '/apercu-devis-facile.jpg' }) {
  const [imageManquante, setImageManquante] = useState(false);

  return (
    <section className={styles.heros}>
      <div className={styles.trame} aria-hidden="true" />

      <div className={styles.contenu}>
        <div className={styles.texte}>
          <p className={styles.etiquette}>
            <span className={styles.pastilleVivante} aria-hidden="true" />
            Conçu pour le BTP en Afrique
          </p>

          <h1 className={styles.titre}>
            Du métré au devis,{' '}
            <span className={styles.souligne}>sans calculs compliqués.</span>
          </h1>

          <p className={styles.accroche}>
            Saisissez vos dimensions&nbsp;: l'application calcule les quantités, décompose les
            matériaux et prépare un devis professionnel que vous pouvez imprimer ou envoyer
            depuis votre téléphone, sur le chantier comme au bureau.
          </p>

          <div className={styles.actions}>
            <BoutonCTA to="/login?mode=register">Essayer gratuitement</BoutonCTA>
            <BoutonCTA to="/login" variante="secondaire" avecFleche={false}>
              Se connecter
            </BoutonCTA>
          </div>

          <ul className={styles.preuves}>
            {PREUVES.map((preuve) => (
              <li key={preuve} className={styles.preuve}>
                <Icone nom="check-circle" size={16} />
                {preuve}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.apercu}>
          <div className={styles.cadre}>
            {imageManquante ? (
              <div className={styles.substitut}>
                <Icone nom="clipboard-list" size={28} />
                <span>
                  Déposez votre visuel dans <code>packages/app/public/</code> sous le nom{' '}
                  <strong>apercu-devis-facile.jpg</strong>
                </span>
              </div>
            ) : (
              <img
                className={styles.image}
                src={image}
                alt="L'application Devis Facile BTP ouverte sur un devis, posée sur une table de chantier"
                width="1376"
                height="768"
                /* La première image de la page est celle que l'on voit tout de
                   suite : la charger en différé retarderait ce qu'on attend. */
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={() => setImageManquante(true)}
              />
            )}
          </div>
          <IconesFlottantes />
        </div>
      </div>
    </section>
  );
}
