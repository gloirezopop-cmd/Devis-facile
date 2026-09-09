/**
 * L'empreinte du devis au moment où une version Excel en a été tirée.
 *
 * Le classeur de l'éditeur avancé est une photographie : il ne bouge plus
 * quand le métré, les prix ou les règles changent. Sans repère, l'onglet Devis
 * et l'onglet Excel finissent par montrer deux chiffrages différents du même
 * projet — et c'est l'ancien qui gagne, puisque c'est lui qu'on rouvre.
 *
 * On garde donc l'empreinte du devis d'origine à côté du classeur. Si elle ne
 * correspond plus, la photo est périmée et on le dit.
 *
 * Elle ne décrit que la SOURCE, jamais les retouches faites dans la feuille :
 * modifier un prix dans Excel ne doit pas déclarer la feuille périmée.
 */
export function signatureDevis(devisParticulier, devisEntreprise) {
  const nombreDeLignes = (devis, cle) =>
    Object.values(devis?.[cle] || {}).reduce((n, lot) => n + (lot?.lignes?.length || 0), 0);

  return [
    devisParticulier?.total ?? 0,
    devisEntreprise?.total ?? 0,
    nombreDeLignes(devisParticulier, 'lots'),
    nombreDeLignes(devisEntreprise, 'niveaux'),
    (devisParticulier?.ordreLots || []).join(','),
    (devisEntreprise?.ordreLots || []).join(','),
  ].join('|');
}
