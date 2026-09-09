import React from 'react';
import SectionLanding from './SectionLanding.jsx';
import styles from './SectionEtapes.module.css';

/**
 * Les trois étapes du parcours réel de l'application : on saisit, le moteur
 * calcule, le devis sort. Elles décrivent ce que le produit fait aujourd'hui —
 * rien de ce qui est annoncé ici ne reste à construire.
 */
const ETAPES = [
  {
    titre: 'Vous saisissez vos dimensions',
    detail:
      "Longueurs, largeurs, hauteurs, nombre d'éléments. Le métré est guidé lot par lot : fondation, élévation, plancher, toiture, finitions.",
  },
  {
    titre: 'Le moteur calcule et justifie',
    detail:
      "Quantités, dosages, sacs de ciment, tonnes de sable, barres de fer. Chaque chiffre est accompagné de sa formule dans la note de calcul.",
  },
  {
    titre: 'Vous sortez le devis',
    detail:
      "Devis particulier détaillé en matériaux ou devis entreprise à l'ouvrage. À imprimer, à exporter en PDF, ou à retoucher dans l'éditeur Excel.",
  },
];

export default function SectionEtapes() {
  return (
    <SectionLanding
      id="etapes"
      fond="clair"
      surtitre="Comment ça marche"
      titre="Trois étapes, du plan au prix"
      chapeau="Aucune formule à connaître par cœur : vous mesurez, l'application fait le reste et vous montre son raisonnement."
    >
      <ol className={styles.liste}>
        {ETAPES.map((etape) => (
          <li key={etape.titre} className={styles.etape}>
            <h3 className={styles.titreEtape}>{etape.titre}</h3>
            <p className={styles.detail}>{etape.detail}</p>
          </li>
        ))}
      </ol>
    </SectionLanding>
  );
}
