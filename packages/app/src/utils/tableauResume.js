/**
 * Le résumé mis à plat, en une seule table : N° / Nature des travaux / Unités / Qte.
 *
 * C'est la forme du classeur d'origine, celle que le métreur lit et coche sur
 * le chantier : un ouvrage en chiffres romains, puis, numérotés dessous, les
 * matériaux qu'il faut commander pour lui. La présentation en cartes lisait
 * bien à l'écran mais ne s'imprimait pas comme un bordereau, et obligeait à
 * chercher un sac de ciment dans six endroits différents.
 *
 * Ce module ne calcule rien : il range ce que `genererResumeChantier()` a
 * produit. Toute quantité vient du moteur.
 */

// Fonction retirée : plus de chiffres romains

/** Les grands titres du moteur sont numérotés (« 2. Fondation ») ; le bandeau
 *  porte déjà l'ordre par sa position, le chiffre y ferait doublon. */
const sansNumero = (titre) => String(titre).replace(/^\s*\d+\.\s*/, '');

/**
 * @param {object} resume  sortie de genererResumeChantier()
 * @returns {Array} lignes prêtes à afficher : bandeau | ouvrage | materiau
 */
export function construireTableauResume(resume) {
  const lignes = [];
  let indexLot = 1;

  for (const titre of resume?.titres || []) {
    const numeroLot = indexLot * 100;
    lignes.push({ type: 'bandeau', libelle: `LOT ${numeroLot} : ${sansNumero(titre.titre).toUpperCase()}` });

    let numeroOuvrage = numeroLot;

    const ouvrage = (libelle, unite, quantite) => {
      numeroOuvrage += 1;
      lignes.push({ type: 'ouvrage', numero: numeroOuvrage, libelle, unite, quantite });
    };

    if (titre.id === 'toiture') {
      if (titre.autresPostes?.length > 0) {
        ouvrage('Charpente', '', null);
        titre.autresPostes.forEach((mat, i) => {
          lignes.push({ type: 'materiau', numero: i + 1, libelle: mat.nom, unite: mat.unite, quantite: mat.quantite });
        });
      }
      for (const poste of titre.postes) {
        ouvrage(poste.nom, poste.unite, poste.volume);
        (poste.materiaux || []).forEach((mat, i) => {
          lignes.push({
            type: 'materiau', numero: i + 1,
            libelle: mat.nom, unite: mat.unite, quantite: mat.quantite, precision: mat.precision,
          });
        });
      }
    } else {
      for (const poste of titre.postes) {
        ouvrage(poste.nom, poste.unite, poste.volume);
        (poste.materiaux || []).forEach((mat, i) => {
          lignes.push({
            type: 'materiau', numero: i + 1,
            libelle: mat.nom, unite: mat.unite, quantite: mat.quantite, precision: mat.precision,
          });
        });
      }

      // Planches, chevrons, clous : le moteur les additionne pour tout le grand
      // titre, pas poste par poste. Les accrocher au dernier ouvrage laisserait
      // croire qu'ils lui appartiennent — ils forment donc leur propre entrée.
      if (titre.autresPostes?.length > 0) {
        ouvrage('Coffrage et fournitures du lot', '', null);
        titre.autresPostes.forEach((mat, i) => {
          lignes.push({ type: 'materiau', numero: i + 1, libelle: mat.nom, unite: mat.unite, quantite: mat.quantite });
        });
      }
    }
    indexLot++;
  }

  for (const lot of resume?.lotsLibres || []) {
    const numeroLot = indexLot * 100;
    lignes.push({ type: 'bandeau', libelle: `LOT ${numeroLot} : ${lot.titre.toUpperCase()}`, libre: true });
    
    let numeroOuvrage = numeroLot;
    lot.lignes.forEach((ligne, i) => {
      numeroOuvrage += 1;
      lignes.push({
        type: 'materiau',
        numero: numeroOuvrage,
        libelle: ligne.designation,
        unite: ligne.unite,
        quantite: ligne.quantite,
        libre: true,
      });
    });
    indexLot++;
  }

  return lignes;
}
