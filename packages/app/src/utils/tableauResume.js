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

const ROMAINS = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

function romain(n) {
  let reste = n;
  let sortie = '';
  for (const [valeur, symbole] of ROMAINS) {
    while (reste >= valeur) {
      sortie += symbole;
      reste -= valeur;
    }
  }
  return sortie;
}

/** Les grands titres du moteur sont numérotés (« 2. Fondation ») ; le bandeau
 *  porte déjà l'ordre par sa position, le chiffre y ferait doublon. */
const sansNumero = (titre) => String(titre).replace(/^\s*\d+\.\s*/, '');

/**
 * @param {object} resume  sortie de genererResumeChantier()
 * @returns {Array} lignes prêtes à afficher : bandeau | ouvrage | materiau
 */
export function construireTableauResume(resume) {
  const lignes = [];
  let numeroOuvrage = 0;

  const ouvrage = (libelle, unite, quantite) => {
    numeroOuvrage += 1;
    lignes.push({ type: 'ouvrage', numero: romain(numeroOuvrage), libelle, unite, quantite });
  };

  for (const titre of resume?.titres || []) {
    lignes.push({ type: 'bandeau', libelle: `LOT ${sansNumero(titre.titre).toUpperCase()}` });

    for (const poste of titre.postes) {
      ouvrage(poste.nom, poste.unite, poste.volume);
      // `poste.materiaux` est la liste que le moteur construit une fois pour
      // toutes : le Devis Particulier lit exactement la meme.
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

  for (const lot of resume?.lotsLibres || []) {
    lignes.push({ type: 'bandeau', libelle: `LOT ${lot.titre.toUpperCase()}`, libre: true });
    lot.lignes.forEach((ligne, i) => {
      lignes.push({
        type: 'materiau',
        numero: i + 1,
        libelle: ligne.designation,
        unite: ligne.unite,
        quantite: ligne.quantite,
        libre: true,
      });
    });
  }

  return lignes;
}
