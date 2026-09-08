import { PARAMETRES } from './parametres.js';

export function calculerTerrassement(blocs, saisie, regles = {}, avertissements = []) {
  const Ct = PARAMETRES.coefficients.coefficientTassement || 1.30;
  const densiteTerre = PARAMETRES.coefficients.densiteTerre || 1.50;

  // 1. Déblais
  let totalFouillesPuits = blocs.fouilles?.total || 0;
  let totalFouilleFilante = blocs.fouilleFilante?.total || 0;
  
  let deblaisGeo = totalFouillesPuits + totalFouilleFilante;
  // v7 Fondation!G113 : DEBLAIS = (fouilles + fouille filante) x CT_TASSEMENT,
  // avec CT_TASSEMENT = 1,3 (Parametres!C74). Le classeur applique le meme
  // coefficient aux deblais et aux remblais ; passer les deblais a 1,2 rendait
  // 33,95 m3 la ou la reference en donne 36,78.
  let deblaisFoisonne = deblaisGeo * Ct;
  let deblaisTonnes = deblaisFoisonne * densiteTerre;

  // 2. Remblais
  let volMurSoubassement = 0;
  if (saisie?.soubassement && saisie.soubassement.length > 0) {
    saisie.soubassement.forEach((m, i) => {
      let surface = blocs.soubassement?.lignes[i]?.valeur || 0;
      let epaisseur = m.epaisseur || m.largeur || 0.15;
      volMurSoubassement += surface * epaisseur;
    });
  } else if (blocs.murSoubassement && blocs.murSoubassement.total > 0) {
    volMurSoubassement = blocs.murSoubassement.total;
  }

  /**
   * Vides a remblayer autour des ouvrages, tassement compris.
   *
   * v7 Fondation!G114 : (fouille - semelle - proprete - amorce) x N x CT
   * v7 Fondation!G115 : (fouille filante - longrine - mur de soubassement) x CT
   * v7 Fondation!G116 : nivellement x CT
   *
   * Les deux premiers etaient renvoyes en dur a zero : le recapitulatif
   * affichait « 0 m3 » de vide a remblayer sur tous les projets, sans rien
   * signaler. Le volume des semelles porte deja l'amorce dans la saisie
   * historique du socle arme ; on ajoute le bloc amorces separe quand il existe.
   */
  const volSemellesEtAmorces = (blocs.semelles?.total || 0) + (blocs.amorces?.total || 0);
  const videSemellesBrut = totalFouillesPuits - volSemellesEtAmorces - (blocs.betonProprete?.total || 0);
  const videFilantBrut = totalFouilleFilante - (blocs.longrines?.total || 0) - volMurSoubassement - (blocs.moellon?.total || 0);

  if (videSemellesBrut < 0 || videFilantBrut < 0) {
    avertissements.push({
      type: 'remblai-negatif',
      message: 'Attention : le volume des ouvrages enterrés est supérieur au volume des déblais. Vérifiez les calculs du projet.'
    });
  }

  const videSemelles = Math.max(0, videSemellesBrut) * Ct;
  const videFilant = Math.max(0, videFilantBrut) * Ct;
  const totalNivellement = (blocs.nivellement?.total || 0) * Ct;

  // Le remblai est la somme des vides a combler, pas une soustraction globale :
  // c'est ainsi que le classeur v7 le construit, poste par poste.
  const remblaisTasse = videSemelles + videFilant + totalNivellement;
  const remblaisTonnes = remblaisTasse * densiteTerre;

  // 3. Évacuation : ce qui reste sur les bras une fois les vides combles.
  const evacuationVolume = Math.max(0, deblaisFoisonne - remblaisTasse);
  const evacuationTonnes = evacuationVolume * densiteTerre;

  return {
    deblais: {
      volumeNet: deblaisGeo,
      volumeFoisonne: deblaisFoisonne,
      tonnes: deblaisTonnes
    },
    remblais: {
      volumeTasse: remblaisTasse,
      tonnes: remblaisTonnes
    },
    evacuation: {
      volume: evacuationVolume,
      tonnes: evacuationTonnes
    },
    details: {
      videSemelles,
      videFilant,
      nivellement: totalNivellement,
      fouillesPuits: totalFouillesPuits,
      fouilleFilante: totalFouilleFilante
    }
  };
}
