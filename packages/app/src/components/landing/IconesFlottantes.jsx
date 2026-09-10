import React from 'react';
import Icone from '../ui/Icone.jsx';
import styles from './IconesFlottantes.module.css';

/**
 * Les pastilles qui flottent autour de l'aperçu du produit.
 *
 * Chacune nomme une étape réelle du parcours, dans l'ordre où on la traverse :
 * on mesure, le moteur calcule, le devis sort, on l'imprime. Une icône
 * décorative qui ne renvoie à rien ferait joli et ne dirait rien.
 *
 * `aria-hidden` : ce sont des illustrations. Le lecteur d'écran a déjà le titre
 * et le paragraphe juste à côté, les répéter n'apporterait rien.
 *
 * Chaque pastille porte une teinte différente, comme les séries d'un graphique.
 * Ce n'est pas de la décoration : quatre pastilles de la même couleur se lisent
 * comme une seule répétée, quatre teintes se lisent comme quatre étapes.
 */
const PASTILLES = [
  { position: 'hautGauche', icone: 'ruler', libelle: 'Métré guidé', retard: '0s', teinte: 'var(--lp-ciel)' },
  { position: 'hautDroite', icone: 'calculator', libelle: 'Calculs automatiques', retard: '1.4s', teinte: 'var(--lp-menthe)' },
  { position: 'basGauche', icone: 'file-text', libelle: 'Devis prêt', retard: '0.7s', teinte: 'var(--lp-corail)' },
  { position: 'basDroite', icone: 'printer', libelle: 'PDF et impression', retard: '2.1s', teinte: 'var(--lp-encre)' },
];

export default function IconesFlottantes() {
  return (
    <div className={styles.zone} aria-hidden="true">
      {PASTILLES.map((p) => (
        <span
          key={p.libelle}
          className={`${styles.pastille} ${styles[p.position]}`}
          style={{ '--retard': p.retard, '--teinte': p.teinte }}
        >
          <span className={styles.icone}>
            <Icone nom={p.icone} size={15} />
          </span>
          {p.libelle}
        </span>
      ))}
    </div>
  );
}
