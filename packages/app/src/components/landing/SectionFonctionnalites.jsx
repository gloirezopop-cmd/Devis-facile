import React from 'react';
import SectionLanding, { GrilleLanding } from './SectionLanding.jsx';
import CarteFonctionnalite from './CarteFonctionnalite.jsx';

/**
 * Les capacités du produit.
 *
 * La liste vit ici, en données : ajouter une fonctionnalité ne demande pas de
 * toucher à la mise en page, et la grille ne peut pas se désaccorder d'une
 * carte à l'autre.
 */
const FONCTIONNALITES = [
  {
    icone: 'ruler',
    titre: 'Métré guidé',
    description:
      "Saisie rapide des dimensions, lot par lot. Le moteur s'occupe des déductions et des majorations.",
  },
  {
    icone: 'calculator',
    titre: 'Calculs automatiques',
    description:
      'Ciment, sable, gravier, agglos, fer : la décomposition des matériaux suit les dosages que vous avez réglés.',
  },
  {
    icone: 'file-text',
    titre: 'Note de calcul',
    description:
      'Chaque quantité est accompagnée de sa formule et de son application numérique — de quoi vérifier et justifier.',
  },
  {
    icone: 'clipboard-list',
    titre: 'Deux modèles de devis',
    description:
      "Le devis particulier détaille les fournitures ; le devis entreprise chiffre les ouvrages. Les deux sortent du même résumé.",
  },
  {
    icone: 'printer',
    titre: 'Impression, PDF et Excel',
    description:
      "Un bordereau propre à remettre au client, imprimable avec ses couleurs ou retouchable dans l'éditeur intégré.",
  },
  {
    icone: 'folder',
    titre: 'Vos projets vous suivent',
    description:
      "Enregistrés dans votre compte, vos chantiers se retrouvent depuis n'importe quel appareil connecté.",
  },
];

export default function SectionFonctionnalites() {
  return (
    <SectionLanding
      id="fonctionnalites"
      fond="sombre"
      surtitre="Ce que vous obtenez"
      titre="Un outil complet pour votre activité"
      chapeau="De la première mesure à la remise du prix, chaque étape a été pensée pour vous faire gagner du temps sans rien perdre en précision."
    >
      <GrilleLanding>
        {FONCTIONNALITES.map((f, rang) => (
          <CarteFonctionnalite key={f.titre} rang={rang} {...f} />
        ))}
      </GrilleLanding>
    </SectionLanding>
  );
}
